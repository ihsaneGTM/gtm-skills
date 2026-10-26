#!/usr/bin/env node
// A voice memo, ready to be read:
//
//   node prepare.mjs <memo-dir> [--lang fr]
//
// the recording measured (media.json), every sentence with its time (words.json, one entry a sentence: a
// memo never needs a word's own time, and by sentence it is twice as fast; asr.py on the Mac's GPU, the
// language detected from the voice: never translated), the words grouped into sentences
// (segments.json) and the same as one line a sentence with its time (transcript.txt), the one file
// Claude reads. What is there already is kept, so running it again only finishes what is missing.
// Its progress goes to prepare.json as it goes (the interface reads it): real numbers, never a guess.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { ENGINE, TRANSCRIBE, memoDir, sourceOf, probe, readJSON, writeJSON, mmss, rel, countWords } from "./lib.mjs";

const dir = memoDir(process.argv[2] || ".");
const li = process.argv.indexOf("--lang"), LANG = li > -1 ? process.argv[li + 1] : null;
const STATUS = path.join(dir, "prepare.json");
const WHISPER = process.env.WHISPER_PY || path.join(os.homedir(), ".venv", "whisper", "bin", "python");
// a memo is long and spoken freely: the turbo model, by sentence. On an Apple Silicon Mac's GPU (asr.py)
// a 10-minute memo takes about 23 s (43 s with every word's time; measured 2026-10-09)
const MODEL = "large-v3-turbo";

const st = readJSON(STATUS) || {};
Object.assign(st, { state: "running", startedAt: Date.now(), error: null, steps: { probe: { state: "todo" }, words: { state: "todo" }, ...(st.steps || {}) } });
const save = () => writeJSON(STATUS, st);
const step = (k, v) => { st.steps[k] = { ...st.steps[k], ...v }; save(); };
const fail = (k, e) => { step(k, { state: "error", error: String(e.message || e) }); throw e; };

function run(cmd, args, onLine) {
  return new Promise((ok, ko) => {
    const c = spawn(cmd, args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
    let err = "", rest = "";
    const lines = d => { rest += d; const l = rest.split(/\r?\n/); rest = l.pop(); l.forEach(x => onLine?.(x)); };
    c.stdout.on("data", lines);
    c.stderr.on("data", d => { err = (err + d).slice(-3000); lines(d); });
    c.on("error", ko);
    c.on("close", code => code === 0 ? ok() : ko(new Error(err.trim().split("\n").slice(-3).join(" ") || `${cmd} exited with ${code}`)));
  });
}

async function words(src) {
  const out = path.join(dir, "words.json");
  if (fs.existsSync(out)) return step("words", { state: "done", progress: 1 });
  step("words", { state: "running", progress: 0, model: MODEL });
  // and, on an Apple Silicon Mac, mlx-whisper: the same words on the GPU, about 5× faster (asr.py)
  const gpu = process.platform === "darwin" && process.arch === "arm64";
  if (!fs.existsSync(WHISPER) || (gpu && spawnSync(WHISPER, ["-c", "import mlx_whisper"]).status !== 0)) {
    step("words", { note: "installing speech-to-text, once per Mac" });
    await run("node", [path.join(ENGINE, "bootstrap.mjs")]).catch(e => fail("words", e));
  }
  step("words", { note: "" });
  await run(WHISPER, [TRANSCRIBE, src, out, "--model", MODEL, "--segments", ...(LANG ? ["--lang", LANG] : [])], l => {
    const p = /^progress ([\d.]+) ([\d.]+)/.exec(l), g = /^language (\w+) ([\d.]+)/.exec(l);
    if (g) { st.language = g[1]; step("words", { language: g[1], confidence: +g[2] }); }
    if (p && +p[2] > 0) step("words", { progress: Math.min(1, Math.round((+p[1] / +p[2]) * 100) / 100), at: +p[1] });
  }).catch(e => fail("words", e));
  step("words", { state: "done", progress: 1 });
}

try {
  const src = sourceOf(dir);
  step("probe", { state: "running" });
  let m;
  try { m = probe(src); } catch (e) { fail("probe", e); }
  writeJSON(path.join(dir, "media.json"), { source: path.relative(dir, src), ...m });
  step("probe", { state: "done", duration: m.duration });
  await words(src);
  const w = readJSON(path.join(dir, "words.json"), []);
  // by sentence already (transcribe.py --segments): whisper's blocks cut at their full stops
  const segs = w.map((x, i) => ({ i, start: Math.round(x.s * 100) / 100, end: Math.round(x.e * 100) / 100, text: x.w }));
  writeJSON(path.join(dir, "segments.json"), segs);
  fs.writeFileSync(path.join(dir, "transcript.txt"), segs.map(s => `[${mmss(s.start)}] ${s.text}`).join("\n") + "\n");
  st.state = "done"; st.doneAt = Date.now(); st.words = w.reduce((n, x) => n + countWords(x.w), 0); st.sentences = segs.length; save();
  console.log(`prepared ${rel(dir)}: ${m.duration.toFixed(1)} s, ${st.words} words, ${segs.length} sentences${st.language ? ` (${st.language})` : ""}, in ${Math.round((st.doneAt - st.startedAt) / 1000)} s`);
} catch (e) {
  st.state = "error"; st.error = String(e.message || e); save();
  console.error(`prepare failed: ${st.error}`);
  process.exit(1);
}
