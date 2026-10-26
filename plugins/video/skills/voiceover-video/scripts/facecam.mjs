#!/usr/bin/env node
// The facecam mode (Ihsane, 2026-10-14): the user filmed the whole video talking to the camera. Their REAL voice runs
// all along; the video alternates face shots (dressed like the intro: cut out, lockups behind the head, punches, the
// grade, the speed) and motion parts in the style « Document » said by that same real voice. Cut tight: the retakes
// left out, the dead air shortened (the derush's rule: a cut where the voice really stops).
//
//   node facecam.mjs <run-dir> --face "#0-#2" --motion "#3-#9" --face "#10" --motion "#11-#24" [--drop "#5,#7"]
//                    [--speed 1.1] [--gap 0.12] [--pause 0.5] [--parts-only]
//
// The blocks, in the order of the video, each a span of take/sentences.json (take.mjs lists them):
//   --face    a face shot: the first one is the intro, the next ones the cutbacks (cut.mjs, run here)
//   --motion  a motion part (vo/part-<n>/): the sentences' real sound, end to end, the retakes left out (--drop)
// --drop     sentences left out of the motion parts (a false start, a sentence said twice: keep the last good one)
// --speed    the video's speed (default: run.json › cut.intro.speed, else profile.json › voiceover.introSpeed, else 1):
//            the face shots and the motion parts at the same speed, the voice's pitch kept
// --gap      the silence put between two kept pieces (default 0.12 s; with the 0.04 s before and 0.10 s after each
//            piece, about 0.26 s of air between two sentences)
// --pause    a pause inside a sentence longer than this is cut too (default 0.5 s); a filler (« uh », « um ») is cut out
// --parts-only  the motion parts again, the face shots as they are cut (no cut.mjs: their grade and masks stay)
// The words of each part are the take's own (Scribe), moved to their new times: never transcribed again.
// Writes vo/part-<n>/voix/prise.wav (48 kHz stereo), vo/part-<n>/words.json, vo/part-<n>/vo.json ({ real: true }),
// real/ and run.json › cut (through cut.mjs), run.json › facecam (the plan). Then: intro.mjs, prep.mjs, as in the hybrid.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { step } from "../../../motion/progress.mjs";
import { ROOT, profile } from "../../../motion/brand.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const RUN = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const runF = path.join(RUN, "run.json");
const readJSON = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const run = readJSON(runF, {});
const src = path.resolve(ROOT, run.video || "");
if (!run.video || !fs.existsSync(src)) { console.error(`✗ the filmed take is not found: ${run.video || "(run.json has no video)"}`); process.exit(2); }
const sentences = readJSON(path.join(RUN, "take", "sentences.json"));
const words = readJSON(path.join(RUN, "take", "words.json"));
if (!sentences || !words) { console.error("✗ take/sentences.json is missing: take.mjs first"); process.exit(2); }
const r3 = x => Math.round(x * 1000) / 1000;
const FILLER = /^(uh|um|uhm|erm|euh|hum)[,.!?…]*$/i;
const GAP = +opt("gap", 0.12), PAUSE = +opt("pause", 0.5), PRE = 0.04, POST = 0.10;
const SPEED = +(opt("speed") ?? run.cut?.intro?.speed ?? profile().voiceover?.introSpeed ?? 1);

// the plan: the blocks in their order
const blocks = [];
a.forEach((x, i) => { if ((x === "--face" || x === "--motion") && a[i + 1]) blocks.push({ kind: x.slice(2), span: a[i + 1] }); });
const drop = new Set(String(opt("drop", "")).split(/[,\s]+/).filter(Boolean).map(x => +x.replace(/^#/, "")));
const span = s => { const m = /^#(\d+)(?:-#?(\d+))?$/.exec(s); if (!m) throw new Error(`a block is a span of sentences: #n or #first-#last (not ${s})`); return [+m[1], +(m[2] ?? m[1])]; };
try {
  if (!blocks.length || blocks[0].kind !== "face") throw new Error("the video opens on a face shot: the first block is --face (the intro)");
  blocks.forEach(b => { b.range = span(b.span); if (b.range[1] < b.range[0] || !sentences[b.range[1]]) throw new Error(`no such span in take/sentences.json: ${b.span}`); });
  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i].kind === blocks[i - 1].kind) throw new Error(`two ${blocks[i].kind} blocks in a row (${blocks[i - 1].span}, ${blocks[i].span}): join them`);
    if (blocks[i].range[0] <= blocks[i - 1].range[1]) throw new Error(`the blocks overlap or go back in time: ${blocks[i - 1].span} then ${blocks[i].span}`);
  }
  step(RUN, "intro", "running", "Cutting your face shots");

  // ── the face shots: cut.mjs (the intro, then the cutbacks), with the cut rule of the hybrid ───────────────────────
  const faces = blocks.filter(b => b.kind === "face");
  const spanArg = b => (b.range[0] === b.range[1] ? `#${b.range[0]}` : `#${b.range[0]}-#${b.range[1]}`);
  const introArg = faces[0].range[0] === 0 ? `#${faces[0].range[1]}` : spanArg(faces[0]);
  // --parts-only: the face shots are cut already (a change of the motion parts only: no new cut, no new grade)
  if (!a.includes("--parts-only")) {
    const r = spawnSync(process.execPath, [path.join(HERE, "cut.mjs"), RUN, "--intro", introArg, ...faces.slice(1).flatMap(b => ["--cutback", spanArg(b)])], { stdio: "inherit" });
    if (r.status) throw new Error("the face shots could not be cut (cut.mjs)");
  }
  const fresh = readJSON(runF, {});
  fresh.cut.intro.speed = SPEED;

  // ── the motion parts: the sentences' real sound, the retakes left out, the dead air shortened ─────────────────────
  const VO = path.join(RUN, "vo");
  for (const d of fs.existsSync(VO) ? fs.readdirSync(VO).filter(x => /^part-\d+$/.test(x)) : []) fs.rmSync(path.join(VO, d), { recursive: true, force: true });
  const motions = blocks.filter(b => b.kind === "motion");
  const report = [];
  motions.forEach((b, k) => {
    const n = k + 1, D = path.join(VO, `part-${n}`, "voix");
    fs.mkdirSync(D, { recursive: true });
    const kept = sentences.filter(x => x.i >= b.range[0] && x.i <= b.range[1] && !drop.has(x.i));
    if (!kept.length) throw new Error(`part ${n} (${b.span}): every sentence is dropped`);
    // pieces: runs of words with no pause longer than PAUSE inside, within the kept sentences
    const ws = kept.flatMap(x => words.filter(w => w.s >= x.s - 0.001 && w.e <= x.e + 0.001));
    // a filler (« uh », « um ») is cut out with the air around it, as the derush does
    const pieces = [];
    let cut = true;
    for (const w of ws) {
      if (FILLER.test(w.w)) { cut = true; continue; }
      const p = pieces.at(-1);
      if (p && !cut && w.s - p.e <= PAUSE) { p.e = w.e; p.w.push(w); } else pieces.push({ s: w.s, e: w.e, w: [w] });
      cut = false;
    }
    // each piece with a little air around it (never into the next word of the take), then GAP of silence
    const all = words;
    let t = 0;
    const out = [], cuts = [];
    pieces.forEach((p, i) => {
      const prevEnd = all.filter(w => w.e <= p.s + 0.001 && w !== p.w[0]).at(-1)?.e ?? 0, nextStart = all.find(w => w.s >= p.e - 0.001 && w !== p.w.at(-1))?.s ?? p.e + 1;
      const s0 = Math.max(p.s - PRE, (prevEnd + p.s) / 2, 0), s1 = Math.min(p.e + POST, (p.e + nextStart) / 2);
      cuts.push([r3(s0), r3(s1)]);
      for (const w of p.w) out.push({ w: w.w, s: r3((t + (w.s - s0)) / SPEED), e: r3((t + (w.e - s0)) / SPEED) });
      t += (s1 - s0) + (i < pieces.length - 1 ? GAP : 0);
    });
    // the sound: each piece cut from the take (a 6 ms fade at its edges: no click), the silences, then the speed
    const filt = cuts.map(([s0, s1], i) => `[0:a]atrim=${s0}:${s1},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.006,afade=t=out:st=${r3(s1 - s0 - 0.006)}:d=0.006${i < cuts.length - 1 ? `,apad=pad_dur=${GAP}` : ""}[p${i}]`);
    filt.push(`${cuts.map((_, i) => `[p${i}]`).join("")}concat=n=${cuts.length}:v=0:a=1${SPEED !== 1 ? `,atempo=${SPEED}` : ""}[out]`);
    const wav = path.join(D, "prise.wav");
    const x = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-filter_complex", filt.join(";"), "-map", "[out]", "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2", wav], { encoding: "utf8" });
    if (x.status) throw new Error(`part ${n}: the sound could not be cut: ${String(x.stderr).slice(-300)}`);
    fs.writeFileSync(path.join(VO, `part-${n}`, "words.json"), JSON.stringify(out) + "\n");
    fs.writeFileSync(path.join(VO, `part-${n}`, "vo.json"), JSON.stringify({ real: true, mode: "facecam", voice: null, voice_name: "Your voice", language: run.language || "en", speed: SPEED, text: kept.map(x => x.text).join(" "), say: {}, pauses: [], from: { sentences: kept.map(x => x.i), cuts } }, null, 1) + "\n");
    const was = kept.at(-1).e - kept[0].s, now = t / SPEED;
    report.push(`part ${n}: sentences ${b.span}${[...drop].some(d => d >= b.range[0] && d <= b.range[1]) ? ` minus #${[...drop].filter(d => d >= b.range[0] && d <= b.range[1]).join(", #")}` : ""} · ${pieces.length} pieces · ${was.toFixed(1)} s of take → ${now.toFixed(1)} s (×${SPEED})`);
  });
  fresh.facecam = { blocks: blocks.map(b => ({ kind: b.kind, span: b.span })), drop: [...drop], speed: SPEED, gap: GAP, pause: PAUSE };
  fresh.mode = "facecam";
  fs.writeFileSync(runF, JSON.stringify(fresh, null, 2) + "\n");
  report.forEach(l => console.log(l));
  step(RUN, "intro", "done", `${faces.length} face shot${faces.length > 1 ? "s" : ""}, ${motions.length} part${motions.length > 1 ? "s" : ""} in your voice`);
  console.log(`→ next: intro.mjs ${path.relative(process.cwd(), RUN)} --speed ${SPEED} (and --cutback n), then prep.mjs; the parts' voice is yours: never voice.mjs take`);
} catch (e) {
  step(RUN, "intro", "failed", String(e.message).slice(0, 160));
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
}
