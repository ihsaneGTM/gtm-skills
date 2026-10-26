// THE SOUNDS of the scrapbook language: real paper, recorded, and the house pack.
//
//   node sounds.mjs             # from the project — init.sh runs it: assets/sfx-paper/, sfx-motionix/ (+ sfx-top5/)
//   node sounds.mjs --calibrate # also sets project.json sfxMasterDb from the source's voice
//
// The synthesised kit of the first version (dings, chimes, sparkles, beeps) was refused in review
// on 2026-10-05 (« tous les effets sonores sont nuls »): the brief is the sounds of the other styles
// (the SFX pack: click, whoosh, glitch, flash, riser; the felt glide of a mark) and a sound of
// PAPER every time a paper arrives. The paper is eight real recordings from Mixkit (the Mixkit
// License: free in videos, commercial included, no attribution; never redistributed on their own,
// so, like the music, they are fetched once per machine into plugins/video/assets/sfx/paper/ and
// never committed). The user chose them on 2026-10-05 from Mixkit's « paper » page.
//
// Each is prepared into the project as 48 kHz 16-bit stereo, its tail faded where the recording
// keeps hissing, its level left alone (a crackle peaks 25 dB over its loudest 93 ms: levelling
// them all to one figure would clip the peaky ones). kit.json keeps what was MEASURED, for the pack
// too: each file's loudest 93 ms frame (`l93`, dBFS), so book.mjs turns « dB against the voice »
// into the cue gain of that very file; where the first crackle is (`align`: the sound lands ON the
// frame the paper appears); how long it rings.
//
// LEVELS. --calibrate measures the voice's momentary median (EBU R128) in the source and writes it
// to project.json `voiceM` (sfxMasterDb 0): book.mjs SOUNDS set each role in « LU under the voice »,
// as heard, and measure.mjs reads them back by subtraction on the effects bus.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHELF = path.resolve(HERE, "../../../assets/sfx/paper");
const PACK = path.resolve(HERE, "../../../assets/sfx/top5");
const MOTIONIX = path.resolve(HERE, "../../../assets/sfx/motionix");
const OUT = path.resolve("assets", "sfx-paper");
const SR = 48000;

// name in the project ← Mixkit file, id; the tail kept (s) where the file hisses on after the sound
export const PAPER_SHELF = [
  ["turn", "mixkit-page-turn-single-1104.wav", 1104, null],          // one page flicked: short, crisp crackles
  ["slice", "mixkit-paper-quick-slice-2384.wav", 2384, null],        // a sheet cut through the air: shorter still
  ["slide", "mixkit-paper-slide-1530.wav", 1530, 0.46],              // a sheet slid on a desk, a low body; hiss after 0.41 s
  ["move", "mixkit-paper-quick-movement-2380.wav", 2380, null],      // a sheet swept: smooth, swishy, 0.6 s
  ["big", "mixkit-big-paper-page-turn-1105.wav", 1105, null],        // a big page turned: crackle that builds, 0.5 s
  ["pages", "mixkit-pages-of-paper-moving-2386.wav", 2386, null],    // pages shuffled, 1.3 s (a long hold)
  ["scribble", "mixkit-writing-scribble-2369.wav", 2369, null],      // a felt marker scribbling, 0.5 s
  ["pencil", "mixkit-writing-pencil-3194.wav", 3194, null],          // a pencil writing, 1.8 s
];

async function fetchShelf() {
  const missing = PAPER_SHELF.filter(([, f]) => !fs.existsSync(path.join(SHELF, f)));
  if (!missing.length) return;
  process.stderr.write(`→ downloading ${missing.length} paper sound(s) from mixkit.co (once per machine)…\n`);
  fs.mkdirSync(SHELF, { recursive: true });
  for (const [, f, id] of missing) {
    const url = `https://assets.mixkit.co/active_storage/sfx/${id}/${id}.wav`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const tmp = path.join(SHELF, `${f}.part`);
      fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
      fs.renameSync(tmp, path.join(SHELF, f));
    } catch (e) {
      console.error(`  ⚠ could not download ${f} (${e.message}): get ${url} into ${SHELF}`);
    }
  }
}

function readWav(f) {
  const b = fs.readFileSync(f);
  let pos = 12, ch = 1, bits = 16, data = null;
  while (pos + 8 <= b.length) {
    const id = b.toString("ascii", pos, pos + 4), len = b.readUInt32LE(pos + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(pos + 10); bits = b.readUInt16LE(pos + 22); }
    else if (id === "data") { data = b.subarray(pos + 8, pos + 8 + Math.min(len, b.length - pos - 8)); break; }
    pos += 8 + len + (len & 1);
  }
  if (bits !== 16) throw new Error(`${f}: ${bits}-bit, expected 16`);
  const n = Math.floor(data.length / (2 * ch)), L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = data.readInt16LE(i * ch * 2) / 32768;
    R[i] = ch > 1 ? data.readInt16LE((i * ch + 1) * 2) / 32768 : L[i];
  }
  return { L, R, n };
}
function writeWav(f, L, R) {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 4, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(f, b);
}
const FRAME = Math.round(0.093 * SR);
// the file's loudest MOMENTARY loudness (EBU R128, 400 ms), at unity gain: what measure.mjs reads
function loudestMomentary(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "apad=pad_dur=1,ebur128=metadata=1,ametadata=mode=print:key=lavfi.r128.M", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 });
  let best = -120;
  for (const m of ((r.stdout || "") + (r.stderr || "")).matchAll(/lavfi\.r128\.M=(-?[\d.]+)/g)) best = Math.max(best, +m[1]);
  return +best.toFixed(1);
}
function loudestFrameDb(L, R) {
  let best = -200;
  for (let s = 0; s + FRAME <= L.length; s += 480) {
    let e = 0; for (let i = s; i < s + FRAME; i++) { const m = (L[i] + R[i]) / 2; e += m * m; }
    best = Math.max(best, 10 * Math.log10(e / FRAME + 1e-15));
  }
  return best;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await fetchShelf();
  fs.mkdirSync(OUT, { recursive: true });
  const kit = {};
  for (const [name, file, , tail] of PAPER_SHELF) {
    const src = path.join(SHELF, file);
    if (!fs.existsSync(src)) { console.error(`  ⚠ ${name}: ${file} missing from the shelf`); continue; }
    const tmp = path.join(OUT, `.${name}.raw.wav`);
    const af = ["aresample=48000:filter_size=64:phase_shift=10:cutoff=0.97"];
    if (tail) af.push(`atrim=0:${tail}`, `afade=t=out:st=${(tail - 0.06).toFixed(3)}:d=0.06`);
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-af", af.join(","), "-ac", "2", "-c:a", "pcm_s16le", tmp]);
    if (r.status !== 0) { console.error(`  ⚠ ${name}: ffmpeg failed`); continue; }
    const { L, R } = readWav(tmp); fs.rmSync(tmp);
    // never past −1 dBFS (a resampled crackle can make an inter-sample over 16 bits would clip)
    let pk = 0; for (let i = 0; i < L.length; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    const g = Math.min(1, 0.891 / Math.max(1e-9, pk));
    for (let i = 0; i < L.length; i++) { L[i] *= g; R[i] *= g; }
    // the first crackle: the first 5 ms window within 12 dB of the loudest one
    const hop = 240, env = [];
    for (let s = 0; s + hop <= L.length; s += hop) { let e = 0; for (let i = s; i < s + hop; i++) { const m = (L[i] + R[i]) / 2; e += m * m; } env.push(10 * Math.log10(e / hop + 1e-15)); }
    const top = Math.max(...env), on = env.findIndex(v => v > top - 12) * hop / SR, peak = env.indexOf(top) * hop / SR;
    const end = (env.length - 1 - [...env].reverse().findIndex(v => v > top - 24)) * hop / SR;
    writeWav(path.join(OUT, `${name}.wav`), L, R);
    kit[name] = { file, onset: +on.toFixed(3), peak: +peak.toFixed(3), end: +end.toFixed(3), l93: +loudestFrameDb(L, R).toFixed(1), lm: loudestMomentary(path.join(OUT, `${name}.wav`)) };
  }
  // the house pack, if the engine's init did not copy it (an old project), measured the same way
  const top5 = path.resolve("assets", "sfx-top5");
  if (!fs.existsSync(top5) && fs.existsSync(PACK)) { fs.cpSync(PACK, top5, { recursive: true }); console.log("assets/sfx-top5/: the SFX pack copied"); }
  const pack = {};
  for (const f of fs.existsSync(top5) ? fs.readdirSync(top5).filter(f => f.endsWith(".wav")) : []) {
    const { L, R } = readWav(path.join(top5, f)); pack[f] = { l93: +loudestFrameDb(L, R).toFixed(1), lm: loudestMomentary(path.join(top5, f)) };
  }
  fs.writeFileSync(path.join(OUT, "kit.json"), JSON.stringify({ paper: kit, pack }, null, 2));
  console.log(`assets/sfx-paper/: ${Object.keys(kit).length} paper sounds (+ the pack measured: ${Object.keys(pack).length})`);
  // the Motionix pack (v3: « un nouveau pack SFX qui vient compléter les petits sons »), prepared
  // once on the shelf (plugins/video/assets/sfx/motionix: 48 kHz, trimmed, each at −20 LUFS
  // momentary at its loudest, kit.json with its `align` and `lm`), copied whole into the project
  // as the explainer does: book.mjs SOUNDS picks from it by role
  const mxOut = path.resolve("assets", "sfx-motionix");
  if (fs.existsSync(MOTIONIX)) {
    fs.mkdirSync(mxOut, { recursive: true });
    let n = 0;
    for (const f of fs.readdirSync(MOTIONIX).filter(f => f.endsWith(".wav") || f === "kit.json")) {
      const dst = path.join(mxOut, f);
      if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(path.join(MOTIONIX, f)).size) { fs.copyFileSync(path.join(MOTIONIX, f), dst); n++; }
    }
    console.log(`assets/sfx-motionix/: the Motionix pack (${fs.readdirSync(mxOut).filter(f => f.endsWith(".wav")).length} sounds${n ? `, ${n} copied` : ""})`);
  } else console.error(`  ⚠ the Motionix pack is not on the shelf (${MOTIONIX}): the pops, shutters and whooshes of v3 will be missing`);
  for (const [k, v] of Object.entries(kit)) console.log(`  ${k.padEnd(9)} loudest momentary ${v.lm.toFixed(1)} LUFS · first crackle ${v.onset.toFixed(3)} s · loudest ${v.peak.toFixed(3)} s · rings to ${v.end.toFixed(3)} s`);

  if (process.argv.includes("--calibrate")) {
    // the voice's momentary median (EBU R128, 400 ms, the frames of speech): each role's level is
    // then « LU under the voice », the figure measure.mjs reads back, and sfxMasterDb is 0
    const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
    const src = P.source ?? P.rawSource;          // the take as it plays (tightened: no pauses in it)
    const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", src, "-vn", "-ac", "2", "-af", "ebur128=metadata=1,ametadata=mode=print:key=lavfi.r128.M", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
    const M = [...((r.stdout || "") + (r.stderr || "")).matchAll(/lavfi\.r128\.M=(-?[\d.]+)/g)].map(m => +m[1]).filter(v => v > -50).sort((a, b) => a - b);
    P.voiceM = +M[Math.floor(M.length / 2)].toFixed(1);
    P.sfxMasterDb = 0;
    delete P.voiceRefDb;
    fs.writeFileSync("project.json", JSON.stringify(P, null, 2));
    console.log(`calibrated: the voice's momentary median is ${P.voiceM} LUFS (sfxMasterDb 0: a role's level is LU under the voice)`);
  }
}
