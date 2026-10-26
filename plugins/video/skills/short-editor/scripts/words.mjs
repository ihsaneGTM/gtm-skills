#!/usr/bin/env node
// THE WORDS, ON THE VOICE. Whisper's word times are a by-product of its decoding, not a measure:
// it put words of a take up to 0.9 s early, inside a silence, and ended "listed" before its last
// syllable (a review round). Every edit then measured the envelope by hand, word after word. This
// does it once, for every word, the way onset.mjs and the call's onsets.py settled it:
//
//   node words.mjs                      words-fixed.json, and the words in doubt (30 lines at most)
//   node words.mjs env <from> <to>      the envelope between two source seconds, the words on it
//   node words.mjs end <t>              where the phrase going on at t stops
//   node words.mjs say <a> <b> [<a> <b>…]   what is said in each window, transcribed ALONE
//
// From the project folder, after transcribe.sh. Times are SOURCE seconds, the clock of words.json
// (divide by project.json speed when writing them into a plan: `at()`).
//
// words-fixed.json: every word of words.json, { i, w, s, e } as transcribed, plus
//   a     its onset: the transcript's, except for a word it put in a silence (its level 17.5 dB
//         under the speech median): that one goes to the first attack of the voice after it (the
//         10 ms level up 8 dB out of the quietest of the 150 ms before, and 3 dB in one frame,
//         above the speech median − 21.5 dB), its own: before the next word starts, or after it
//         when the next word sits in the silence too (a phrase dated early as a whole). The nearest
//         attack is not taken blindly: two neighbouring words would share one (onset.mjs says it
//         finds AN attack, not the right one); a doubtful word is read with env, heard with say
//   z     its end measured, before a pause (the next word 0.15 s away or more): where the level is
//         back within 10 dB of the take's floor for 140 ms (rough-cut.mjs's rule); e otherwise
//   pause the silence after it, z → the next word's a
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
if (!fs.existsSync("words.json")) { console.error("words.json missing: run transcribe.sh first"); process.exit(1); }
const W = JSON.parse(fs.readFileSync("words.json", "utf8"));
const SRC = P.source;                                        // words.json is the transcript of it

// the envelope: 10 ms RMS in dB of the source, mono 16 kHz, kept in .prep/ for the next call
const SR = 16000, HOP = 160;
function envelope() {
  const st = fs.statSync(SRC), cache = path.join(".prep", "envelope.f32"), meta = `${SRC}|${st.size}|${st.mtimeMs}`;
  try { if (fs.readFileSync(cache + ".txt", "utf8") === meta) { const b = fs.readFileSync(cache); return new Float32Array(b.buffer, b.byteOffset, b.length >> 2); } } catch {}
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", SRC, "-map", "0:a:0", "-ac", "1", "-ar", String(SR), "-f", "s16le", "-"], { maxBuffer: 1 << 30 });
  if (!r.stdout?.length) { console.error("no audio in the source"); process.exit(1); }
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1), n = Math.floor(pcm.length / HOP);
  const db = new Float32Array(n);
  for (let f = 0; f < n; f++) { let s = 0; for (let i = f * HOP; i < (f + 1) * HOP; i++) s += pcm[i] * pcm[i]; db[f] = 20 * Math.log10(Math.sqrt(s / HOP) / 32768 + 1e-9); }
  try { fs.mkdirSync(".prep", { recursive: true }); fs.writeFileSync(cache, Buffer.from(db.buffer)); fs.writeFileSync(cache + ".txt", meta); } catch {}
  return db;
}
const db = envelope(), n = db.length;
const T = f => f / 100, Fr = s => Math.round(s * 100);
const sorted = Float32Array.from(db).sort();
const floor = sorted[Math.floor(n * 0.05)];
const sp = db.filter(x => x > floor + 10).sort();
const speech = sp.length ? sp[Math.floor(sp.length / 2)] : floor + 20;
const QUIET = speech - 17.5, ATTACK = speech - 21.5;
const attacks = [];
for (let f = 3; f < n; f++) {
  let lo = 0; for (let k = Math.max(0, f - 15); k < f; k++) lo = Math.min(lo, db[k]);
  if (db[f] > ATTACK && db[f] - lo > 8 && db[f] > db[f - 1] + 3 && (!attacks.length || f - attacks.at(-1) > 6)) attacks.push(f);
}
const firstAfter = (s, limit) => { for (const f of attacks) if (T(f) >= s && T(f) <= limit) return T(f); return null; };
// where speech stops after t: back within 10 dB of the floor for 140 ms
function endAfter(t, limit = Infinity) {
  for (let f = Math.max(0, Fr(t)), run = 0; f < Math.min(n, Fr(limit) + 14); f++) {
    run = db[f] < floor + 10 ? run + 1 : 0;
    if (run === 14) return T(f - 13);
  }
  return null;
}
const bar = d => "#".repeat(Math.max(0, Math.round((d - floor) / 3)));

const cmd = argv[0];
if (cmd === "end") {
  const t = parseFloat(argv[1]), e = endAfter(t);
  if (e == null) { console.error("no pause after that time"); process.exit(1); }
  console.log(`the phrase going on at ${t.toFixed(2)} s stops at ${e.toFixed(2)} s (floor ${floor.toFixed(0)} dB: under ${(floor + 10).toFixed(0)} dB for 140 ms)`);
  process.exit(0);
}
if (cmd === "env") {
  const a = parseFloat(argv[1]), b = parseFloat(argv[2]);
  const FW = fs.existsSync("words-fixed.json") ? JSON.parse(fs.readFileSync("words-fixed.json", "utf8")).words : [];
  console.log(`time    dB  level (floor ${floor.toFixed(0)}, speech ${speech.toFixed(0)})   w: transcript onset · a: measured onset · z: measured end`);
  const rows = [];
  for (let t = a; t < b - 1e-9; t += 0.02) {
    const d = Math.max(db[Fr(t)] ?? -120, db[Fr(t) + 1] ?? -120);
    const tag = [...W.filter(q => q.s >= t && q.s < t + 0.02).map(q => `w:${q.w}`), ...FW.filter(q => q.a >= t && q.a < t + 0.02).map(q => `a:${q.w}`), ...FW.filter(q => q.z >= t && q.z < t + 0.02 && q.z !== q.e).map(q => `z:${q.w}`)].join(" ");
    rows.push(`${t.toFixed(2).padStart(7)}${d.toFixed(0).padStart(4)} ${bar(d).padEnd(18)}${tag.padEnd(16)}`);
  }
  for (let i = 0; i < rows.length; i += 3) console.log(rows.slice(i, i + 3).join(" | "));
  process.exit(0);
}
if (cmd === "say") {
  const spans = argv.slice(1).map(Number);
  if (!spans.length || spans.length % 2 || spans.some(x => !Number.isFinite(x))) { console.error("say <a> <b> [<a> <b>…]: windows in source seconds"); process.exit(2); }
  const py = process.env.WHISPER_PY || path.join(os.homedir(), ".venv", "whisper", "bin", "python");
  const code = `
import sys, json, subprocess, numpy as np
sys.path.insert(0, ${JSON.stringify(HERE)})
from asr import WhisperModel
src, lang, spans = sys.argv[1], (sys.argv[2] or None), json.loads(sys.argv[3])
m = WhisperModel("large-v3", device="cpu", compute_type="int8")
for a, b in spans:
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0, a):.3f}", "-to", f"{b:.3f}", "-i", src, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True)
    pad = np.zeros(4800, np.float32)
    x = np.concatenate([pad, np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768, pad])
    segs, _ = m.transcribe(x, language=lang, word_timestamps=True, beam_size=5, condition_on_previous_text=False)
    ws = [(q.word.strip(), round(a - 0.3 + q.start, 2), round(a - 0.3 + q.end, 2)) for s in segs for q in (s.words or [])]
    print(f"{a:7.2f}-{b:7.2f}: {' '.join(w for w, _, _ in ws) or '(nothing)'}   " + " ".join(f"{w}@{s}-{e}" for w, s, e in ws))
`;
  const pairs = []; for (let k = 0; k < spans.length; k += 2) pairs.push([spans[k], spans[k + 1]]);
  const r = spawnSync(py, ["-c", code, SRC, P.lang || "", JSON.stringify(pairs)], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}
if (cmd) { console.error(`unknown: ${cmd} (env, end, say, or nothing)`); process.exit(2); }

// ── words-fixed.json ───────────────────────────────────────────────────────────────────────────
const levelAt = t => Math.max(...Array.from({ length: 3 }, (_, k) => db[Fr(t) + k] ?? -120));
const out = [];
for (const [i, q] of W.entries()) {
  const next = W[i + 1], prev = out[i - 1];
  let a = q.s, how = "transcript";
  // its own attack: before the next word starts, or later when the transcript put the next word in
  // the silence too (a phrase dated early as a whole: each word takes the next attack, in order);
  // otherwise the attack is the next word's (a quiet voice, not a silence) and the word stays put
  if (levelAt(q.s) < QUIET) {
    const from = Math.max(q.s, prev ? prev.a + 0.06 : 0);
    const h = firstAfter(from, q.s + 1.6);
    if (h != null && (!next || h < next.s - 0.005 || levelAt(next.s) < QUIET)) { a = h; how = "out of a silence"; }
  }
  if (prev && a <= prev.a) a = Math.max(q.s, prev.a + 0.01);       // never before the word said before it
  out.push({ i, w: q.w, s: q.s, e: q.e, a: +a.toFixed(3), how });
}
for (const [i, o] of out.entries()) {
  const next = out[i + 1];
  let z = o.e;
  if (!next || next.s - o.e >= 0.15) { const e = endAfter(Math.max(o.a + 0.05, o.e - 0.15), next ? next.a : Infinity); if (e != null && e > o.a) z = e; }
  o.z = +z.toFixed(3);
  o.pause = next ? +Math.max(0, next.a - o.z).toFixed(3) : null;
}
fs.writeFileSync("words-fixed.json", JSON.stringify({ source: path.basename(SRC), speed: P.speed ?? 1, floor: +floor.toFixed(1), speech: +speech.toFixed(1),
  words: out.map(({ how, ...o }) => o) }, null, 0).replace(/},{/g, "},\n{"));
const moved = out.filter(o => o.a !== o.s), longer = out.filter(o => o.z - o.e > 0.08);
console.log(`words-fixed.json: ${out.length} words · speech ${speech.toFixed(1)} dB, floor ${floor.toFixed(1)} dB · ${moved.length} onset(s) the transcript put in a silence · ${longer.length} phrase end(s) later than it says`);
const lines = [
  ...moved.map(o => `  onset ${String(o.i).padStart(4)} ${o.w.padEnd(14)} ${o.s.toFixed(2)} → ${o.a.toFixed(2)}  (${(o.a - o.s >= 0 ? "+" : "") + (o.a - o.s).toFixed(2)} s, ${o.how})`),
  ...longer.map(o => `  end   ${String(o.i).padStart(4)} ${o.w.padEnd(14)} ${o.e.toFixed(2)} → ${o.z.toFixed(2)}  (a cut or a title leaving at ${o.e.toFixed(2)} would clip it)`),
];
for (const l of lines.slice(0, 28)) console.log(l);
if (lines.length > 28) console.log(`  … ${lines.length - 28} more in words-fixed.json`);
console.log("A plan's times are a (an onset) and z (an end), divided by the speed; words.mjs env <a> <b> shows one, say <a> <b> hears it.");
