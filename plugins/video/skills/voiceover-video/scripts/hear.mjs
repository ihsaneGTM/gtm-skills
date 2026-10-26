// The take heard, on the Mac: every word and its time, with no key and nothing sent (Ihsane, 2026-10-15: « devoir
// ajouter une clé API juste pour faire la retranscription, je trouve ça trop »). Used by take.mjs (and so by the
// shorts' listen.mjs).
//
//   whisper(src, out, { lang, onProgress })  → [{ w, s, e }] as Whisper heard them (large-v3, the Mac's GPU when it has
//       one: the short editors' and the derush's engine, short-editor/scripts/asr.py through derush/scripts/transcribe.py)
//   measure(src, words, dir, { engine })     → the same words, their times measured on the voice (below)
//
//   node hear.mjs <audio or video> [--lang en] [--out heard.json]   what is said in a file, every word timed (the check
//       of a delivered sound: every word whole at the joins), on this Mac, no key
//
// WHERE A WORD STARTS AND STOPS IS MEASURED, NEVER READ. A model's word times are a by-product of its decoding (Whisper
// put words of a take up to 0.9 s early, inside a silence, and ended words before their last syllable; Scribe too, less
// often). A cut placed on them clips a word's end (heard by Ihsane at the joins of a rush). So every word goes through
// the short editor's words.mjs, the rule the edits already use: a word dated inside a silence gets the voice's next
// attack, a word before a pause ends where the level is back near the room's floor for 140 ms (rough-cut.mjs's rule).
// words.json keeps its shape ({ w, s, e }): s is that onset, e that end; nothing downstream changes.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILLS = path.resolve(HERE, "..", "..");
export const ENGINE = path.join(SKILLS, "short-editor", "scripts");
export const WHISPER_PY = process.env.WHISPER_PY || path.join(os.homedir(), ".venv", "whisper", "bin", "python");
export const MODEL = "large-v3";

// the runtime: provisioned by the video engine's bootstrap (once per Mac: faster-whisper, and mlx-whisper on Apple Silicon)
function ready() {
  const ok = () => fs.existsSync(WHISPER_PY) && spawnSync(WHISPER_PY, ["-c", "import faster_whisper"], { encoding: "utf8" }).status === 0;
  if (ok()) return;
  console.log("installing the speech-to-text (Whisper, once per Mac)…");
  const r = spawnSync(process.execPath, [path.join(ENGINE, "bootstrap.mjs")], { stdio: "inherit" });
  if (r.status || !ok()) throw new Error("Whisper could not be installed (short-editor/scripts/bootstrap.mjs): run it by hand and look at what it says");
}

export function whisper(src, out, { lang = null, onProgress = null } = {}) {
  ready();
  const args = [path.join(SKILLS, "derush", "scripts", "transcribe.py"), src, out, "--model", MODEL, ...(lang ? ["--lang", lang] : [])];
  return new Promise((resolve, reject) => {
    const p = spawn(WHISPER_PY, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "", buf = "", language = lang, prob = null;
    p.stdout.on("data", d => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const l = buf.slice(0, i); buf = buf.slice(i + 1);
        let m;
        if ((m = /^progress ([\d.]+) ([\d.]+)/.exec(l))) onProgress?.(+m[1], +m[2]);
        else if ((m = /^language (\S+) ([\d.]+)/.exec(l))) { language = m[1]; prob = +m[2]; }
      }
    });
    p.stderr.on("data", d => { err = (err + d).slice(-2000); });
    p.on("close", code => {
      if (code) return reject(new Error(`Whisper failed: ${err.trim().split("\n").slice(-2).join(" ").slice(0, 300)}`));
      try { resolve({ words: JSON.parse(fs.readFileSync(out, "utf8")), language, prob }); } catch (e) { reject(e); }
    });
  });
}

// every word's onset and end measured on the voice: short-editor/scripts/words.mjs, run in <dir> (its project.json
// names the source; the envelope is kept in <dir>/.prep/ for the next time)
export function measure(src, words, dir, { engine = "whisper" } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "project.json"), JSON.stringify({ source: src, speed: 1 }));
  fs.writeFileSync(path.join(dir, "words.json"), JSON.stringify(words));
  const r = spawnSync(process.execPath, [path.join(ENGINE, "words.mjs")], { cwd: dir, encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status) throw new Error(`the words could not be measured on the voice: ${String(r.stderr).trim().slice(-300)}`);
  const fixed = JSON.parse(fs.readFileSync(path.join(dir, "words-fixed.json"), "utf8"));
  const out = fixed.words.map(o => ({ w: o.w, s: o.a, e: Math.max(o.z, o.a + 0.02) }));
  // Whisper's own habits (below); Scribe marks its gaps itself and dates its words on the voice: words.mjs is enough
  const E = path.join(dir, ".prep", "envelope.f32"), snapped = engine === "whisper" ? pauses(out, E, fixed.floor) : 0;
  if (engine === "whisper") { joined(out, E, fixed.floor); rescale(out, words); }
  for (let i = 0; i + 1 < out.length; i++) {               // in order: a word ends before the next one starts
    const a = out[i], b = out[i + 1];
    if (b.s < a.e) { a.e = Math.max(a.s + 0.01, b.s); if (b.s < a.e) b.s = a.e; if (b.e < b.s + 0.01) b.e = b.s + 0.01; }
  }
  return { words: out.map(o => ({ w: o.w, s: +o.s.toFixed(3), e: +o.e.toFixed(3) })), snapped,
    summary: String(r.stdout).split("\n")[0] + (snapped ? ` · ${snapped} pause(s) found on the voice between words the transcript ran together` : "") };
}

// THE PAUSES, ON THE VOICE. Whisper often runs a stretch of words together, each word ending where the next starts, even
// across a breath (a 84 s stretch of a real take without a single gap): the cuts, which take out the pauses, would see
// none. Every pause of the take (the level within 13 dB of the room's floor for 0.2 s: a breath counts, measured
// 2026-10-15 against Scribe's gaps, OPTIMISATION-SKILLS.md) that falls between two words the transcript glued is put
// back: the word before it ends where the voice is really quiet (within 10 dB of the floor, words.mjs's rule: a quiet
// last syllable is never cut; without such a frame, 70 ms into the pause, the derush's fade), the word after it starts
// where it stops. A pause inside a word the transcript stretched over it goes to the nearest join.
export function pauses(words, envFile, floor, { min = 0.2, over = 13, strict = 10 } = {}) {
  let env;
  try { const b = fs.readFileSync(envFile); env = new Float32Array(b.buffer, b.byteOffset, b.length >> 2); } catch { return 0; }
  const Q = floor + over, quiet = [];
  for (let f = 0; f < env.length; f++) {
    if (env[f] >= Q) continue;
    let g = f; while (g < env.length && env[g] < Q) g++;
    if (g - f >= Math.round(min * 100)) quiet.push([f / 100, g / 100]);
    f = g;
  }
  let n = 0;
  for (const [qa, qb] of quiet) {
    const mid = (qa + qb) / 2;
    let j = -1, best = 1.0;
    for (let i = 0; i < words.length - 1; i++) {
      // a word on each side: the one before starts before the quiet, the one after ends past its start (Whisper dates
      // words early: the word after a pause often starts, and sometimes ends, inside it)
      if (words[i].s >= qa - 0.05 || words[i + 1].e <= qa + 0.05) continue;
      const d = Math.abs((words[i].e + words[i + 1].s) / 2 - mid);
      if (d < best) { best = d; j = i; }
    }
    // a pause INSIDE a word: Whisper stretched that word's start back over the gap before it (« find » 66.80-67.70 s
    // for a voice saying it at 67.62 s, after a pause): the join is before that word
    // (its end reaches the end of the pause, within 0.1 s: Whisper's end of a word often sits on the voice's onset of it,
    // « who » 67.98-68.84 s said at 68.84 s after a pause from 68.24 s)
    const k = words.findIndex((w, i) => i > 0 && w.s < qa && w.e >= qb - 0.1 && words[i - 1].s < qa - 0.05);
    if (k > 0) j = k - 1;
    if (j < 0) continue;
    const A = words[j], B = words[j + 1];
    // inside the pause: the first and last frames of real quiet (strict), else its edges with a fade
    let sa = null, sb = null;
    for (let f = Math.round(qa * 100); f < Math.round(qb * 100); f++) if (env[f] < floor + strict) { if (sa == null) sa = f / 100; sb = (f + 1) / 100; }
    const endAt = sa ?? Math.min(qa + 0.07, qb), startAt = sb ?? qb;
    // the word before it said up to the quiet: Whisper dates words early, often 0.2 to 0.3 s, and its end then sits on
    // the voice's last syllable (« decide. » ending at 90.68 s when the voice stops at 91.00 s): the end goes to the quiet,
    // unless the voice already stops before it (140 ms of quiet, words.mjs's rule: a breath, a sound not transcribed)
    const stopsBefore = t0 => { for (let f = Math.round(t0 * 100), run = 0; f < Math.round(qa * 100); f++) { run = env[f] < floor + strict ? run + 1 : 0; if (run >= 14) return true; } return false; };
    if (B.s - A.e >= 0.15 && A.e >= endAt - 0.05 && A.e <= endAt + 0.05 && B.s >= startAt - 0.05) continue;    // the transcript has that pause already
    let moved = false;
    if (A.e > endAt || (A.e < qa - 0.05 && !stopsBefore(A.e))) { A.e = endAt; moved = true; }
    if (B.s < startAt - 0.02) { B.s = startAt - 0.02; B.e = Math.max(B.e, B.s + 0.08); moved = true; }
    const C = words[j + 2]; if (C && C.s < B.e) C.s = Math.min(B.e, C.e - 0.02);
    if (moved) n++;
  }
  return n;
}


// A GAP WITH NO PAUSE IN IT. Whisper also leaves gaps where the voice goes on (« decision. » ending at 100.12 s, « For »
// at 100.38 s, the voice loud all along): the word before it is said up to the next one.
export function joined(words, envFile, floor, { over = 13 } = {}) {
  let env;
  try { const b = fs.readFileSync(envFile); env = new Float32Array(b.buffer, b.byteOffset, b.length >> 2); } catch { return; }
  for (let i = 0; i + 1 < words.length; i++) {
    const A = words[i], B = words[i + 1];
    if (B.s - A.e < 0.15) continue;
    let quiet = 0, best = 0;
    for (let f = Math.round(A.e * 100); f < Math.round(B.s * 100); f++) { quiet = env[f] < floor + over ? quiet + 1 : 0; best = Math.max(best, quiet); }
    if (best < 8) A.e = B.s;
  }
}

// THE WORDS INSIDE A PHRASE. Whisper dates words early all along (on a real take, 0.24 s in the median against Scribe,
// 0.29 s after a pause against the voice's attack): with each phrase's first word's end and its last word's end now
// measured on the voice, the words between are laid again on that span, in the proportions Whisper heard them (measured
// 2026-10-15: onsets -240 → -130 ms, ends -160 → -48 ms against Scribe). A phrase: no gap of 0.15 s or more inside.
export function rescale(out, raw) {
  for (let i = 0; i < out.length;) {
    let j = i;
    while (j + 1 < out.length && out[j + 1].s - out[j].e < 0.15) j++;
    const r0 = raw[i].e, r1 = raw[j].e, m0 = out[i].e, m1 = out[j].e;
    if (j > i && r1 - r0 > 0.05 && m1 > m0) {
      const k = (m1 - m0) / (r1 - r0), at = x => m0 + (x - r0) * k;
      for (let q = i + 1; q <= j; q++) {
        out[q].s = Math.max(out[q - 1].s + 0.01, at(raw[q].s));
        if (q < j) out[q].e = Math.max(out[q].s + 0.02, at(raw[q].e));
      }
    }
    i = j + 1;
  }
}

// ── the command line ────────────────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf("--" + k); return i < 0 ? null : a[i + 1]; };
  const f = a[0] && !a[0].startsWith("--") ? path.resolve(a[0]) : null;
  if (!f || !fs.existsSync(f)) { console.error("node hear.mjs <audio or video> [--lang en] [--out heard.json]"); process.exit(2); }
  const out = path.resolve(opt("out") || path.join(os.tmpdir(), `heard-${process.pid}.json`));
  whisper(f, out, { lang: opt("lang") }).then(r => {
    console.log(r.words.map(w => w.w).join(" "));
    console.log("\n" + r.words.map(w => `${w.w}@${w.s.toFixed(2)}-${w.e.toFixed(2)}`).join(" "));
    if (!opt("out")) fs.rmSync(out, { force: true }); else console.log(`→ ${out}`);
  }).catch(e => { console.error(`✗ ${e.message}`); process.exit(1); });
}
