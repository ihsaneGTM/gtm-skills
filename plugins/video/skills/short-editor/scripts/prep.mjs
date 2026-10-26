// What GTM by Pipecorn prepares for an edit before Claude needs it, in the project's .prep/:
// every word (words.json) as soon as the video arrives, while the brief is being answered, then the
// take at a glance (take.mjs: take.md, sheet.jpg), and
// the person matte as the edit starts, for a style that cuts you out of the video as it was
// filmed (Claude needs it about ten minutes in: it reads, listens and writes first).
//
//   node prep.mjs <project dir> <source video> --words
//   node prep.mjs <project dir> <source video> --matte [--speed 1.1]
//
// Nothing here decides anything about the edit. The skill's own commands take what is ready:
// transcribe.py when the source, the model and the language match (the language is detected,
// never forced), matte.mjs when the source, the size, the fps, the speed and the cuts match
// (made at the size and fps init.sh chooses, without cuts). A command run while the same thing
// is still being made here waits for it instead of making it a second time; anything else is
// made by the skill as before. Measured on an M2 Pro (2026-10-08): the words of a 50 s take
// in 25 s, its matte in 50 s.
//
// Each job holds a lock while it works (.prep/words.lock, .prep/matte.lock: its pid and what it
// makes), so the skill knows what it may wait for, and the app what to stop when the video is
// replaced. A video longer than five minutes is a rush, not a short: its matte is not prepared.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { segment, serves, stampOf } from "./matte.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const pos = [], flags = new Set();
let SPEED = 1;
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--speed") SPEED = Number(process.argv[++i]) || 1;
  else if (a.startsWith("--")) flags.add(a);
  else pos.push(a);
}
const [dirArg, srcArg] = pos;
if (!dirArg || !srcArg || !(flags.has("--words") || flags.has("--matte"))) {
  console.error("usage: node prep.mjs <project dir> <source video> --words | --matte [--speed 1.1]"); process.exit(2);
}
const DIR = path.resolve(dirArg), SRC = fs.realpathSync(path.resolve(srcArg)), PREP = path.join(DIR, ".prep");
const WHISPER = process.env.WHISPER_PY || path.join(os.homedir(), ".venv", "whisper", "bin", "python");
const MODEL = "large-v3";       // transcribe.py's default, the one the skills run
const MAX_MATTE = 300;
fs.mkdirSync(PREP, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const locks = [], scratch = new Set();
const lock = (name, what) => { const f = path.join(PREP, name); fs.writeFileSync(f, JSON.stringify({ pid: process.pid, ...what })); locks.push(f); return () => fs.rmSync(f, { force: true }); };
// stopped half way (a new video for the draft, a matte made for another version of it): its
// frames go too, they weigh hundreds of MB
process.on("exit", () => { for (const f of locks) fs.rmSync(f, { force: true }); for (const d of scratch) fs.rmSync(d, { recursive: true, force: true }); });
for (const s of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(s, () => process.exit(1));

// the size and fps init.sh will write in project.json, read the same way (its python, here in JS)
const pyRound = x => { const r = Math.round(x); return Math.abs(x % 1) === 0.5 && r % 2 ? r - 1 : r; };
function format() {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
    "-show_entries", "format=duration", "-of", "json", SRC], { encoding: "utf8" });
  const d = JSON.parse(r.stdout), st = d.streams[0];
  const [num, den = "1"] = st.r_frame_rate.split("/");
  let w = +st.width, h = +st.height;
  if (w > 1080) { h = pyRound(h * 1080 / w / 2) * 2; w = 1080; }
  return { width: w, height: h, fps: pyRound(+num / +den), duration: Math.round(+d.format.duration * 1000) / 1000 };
}

async function words() {
  const st = fs.statSync(SRC);
  try {
    const m = JSON.parse(fs.readFileSync(path.join(PREP, "words.meta.json"), "utf8"));
    if (m.source?.path === SRC && m.source.size === st.size && m.model === MODEL && fs.existsSync(path.join(PREP, "words.json"))) {
      log("words: ready already");
      if (!fs.existsSync(path.join(PREP, "take.md"))) take();
      return;
    }
  } catch {}
  const free = lock("words.lock", { path: SRC, size: st.size, model: MODEL });
  log("words: transcribing…");
  // the engine's bootstrap first, as transcribe.sh does: on a new Mac it installs the speech-to-text
  spawnSync(process.execPath, [path.join(HERE, "bootstrap.mjs")], { stdio: ["ignore", "inherit", "inherit"] });
  const code = await new Promise(ok => {
    const c = spawn(WHISPER, [path.join(HERE, "transcribe.py"), "--source", SRC, "--model", MODEL, "--out", "words.json", "--meta", "words.meta.json"],
      { cwd: PREP, stdio: ["ignore", "inherit", "inherit"] });
    c.on("close", ok); c.on("error", () => ok(1));
  });
  free();
  log(code === 0 ? "words: done" : `words: failed (code ${code}); the skill will transcribe it`);
  if (code === 0) take();
}
// the take at a glance (take.mjs): .prep/take.md and .prep/sheet.jpg, once the words are there
function take() {
  const r = spawnSync(process.execPath, [path.join(HERE, "take.mjs"), DIR, SRC], { encoding: "utf8" });
  log(r.status === 0 ? "take: .prep/take.md and .prep/sheet.jpg" : `take: failed (${(r.stderr || "").trim().split("\n").pop()})`);
}

async function matte() {
  if (process.platform !== "darwin") return log("matte: macOS only");
  const F = format();
  if (F.duration > MAX_MATTE) return log(`matte: not prepared (${Math.round(F.duration)} s: a rush, cut before it is matted)`);
  const P = { source: SRC, ...F, speed: SPEED };
  const want = stampOf(P), out = path.join(PREP, "matte");
  try { if (serves(JSON.parse(fs.readFileSync(path.join(out, ".stamp.json"), "utf8")), want)) return log("matte: ready already"); } catch {}
  fs.rmSync(out, { recursive: true, force: true });
  const free = lock("matte.lock", { stamp: want }), raw = path.join(PREP, ".matte-frames");
  scratch.add(raw);
  try {
    log(`matte: ${F.width}x${F.height} · ${F.fps} fps · speed ${SPEED} · ${F.duration} s…`);
    const n = await segment(P, out, raw, m => log(`matte: ${m.trim()}`));
    log(`matte: done, ${n} masks`);
  } catch (e) {
    log(`matte: failed (${e.message}); the skill will make it`);
  }
  fs.rmSync(raw, { recursive: true, force: true }); scratch.delete(raw);
  free();
}

const t0 = Date.now();
log(`preparing ${[...flags].join(" ")} of ${path.relative(DIR, SRC)}`);
await Promise.all([flags.has("--words") && words(), flags.has("--matte") && matte()]);
log(`prepared in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
