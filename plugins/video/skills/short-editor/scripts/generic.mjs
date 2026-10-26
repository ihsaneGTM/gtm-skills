#!/usr/bin/env node
// THE PIPECORN GENERIC, a bonus of every style (the brief's "Pipecorn generic" question in GTM by
// Pipecorn): ~6 s at the end of a finished short, Pipecorn first, then the values replacing one
// another in one slot, then Pipecorn again; no music, the Motionix pack (generic/sting.mjs says
// what it is and why). It works on the DELIVERED file, whatever style made it, so it runs last:
// after the skill's render and its verify.
//
//   node generic.mjs <video.mp4> [--values phone-coverage,connect-rate,pipeline] [--keep tmp/without-generic.mp4] [--no-tape]
//   node generic.mjs --list                       the values it knows (generic/values.json)
//   GENERIC_VALUES='[{"label":"…","n":"…","glyph":"phone|users|chart|globe|bolt"}]' for values of your own
//
// In place: the video without the generic is kept (--keep, default tmp/without-generic.mp4 in the
// folder you run it from, the project), and a video that has it already is redone from that copy,
// never stacked. What it does, measured:
//   · the picture: the sparkle flies in over the video's last 0.4 s, the yellow floods on its last
//     frame; the video is re-encoded once (the Mac's media engine as build.sh, x264 CRF 15 without
//     it), its colour tags kept
//   · the sound: the video's own sound stops like a tape over those 0.4 s (its speed falling to
//     nothing, the pitch with it: the "relance"), then the generic's sounds alone, set to GEN_LUFS
//     (−24.5 LUFS integrated, the level validated on 2026-10-05 in a −14 LUFS short), a peak under
//     −2 dBFS; the short's own loudness is untouched
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SFX = path.resolve(HERE, "../../../assets/sfx");
const LIB = JSON.parse(fs.readFileSync(path.join(HERE, "generic/values.json"), "utf8"));
const argv = process.argv.slice(2);
const flag = k => argv.includes(k);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const SR = 48000, GEN_LUFS = Number(arg("--lufs", -24.5)), TAG = "pipecorn-generic";

if (flag("--list")) {
  for (const [id, v] of Object.entries(LIB.values)) console.log(`${id.padEnd(18)} ${v.label}${v.n ? ` · ${v.n}` : ""}${LIB.default.includes(id) ? "   (default)" : ""}`);
  process.exit(0);
}
const VIDEO = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && ["--values", "--keep", "--lufs"].includes(argv[i - 1])));
if (!VIDEO || !fs.existsSync(VIDEO)) { console.error("usage: node generic.mjs <video.mp4> [--values a,b,c] [--keep tmp/without-generic.mp4] [--no-tape]"); process.exit(2); }
const KEEP = arg("--keep", "tmp/without-generic.mp4");

// the values, in the order given
let VALUES;
if (process.env.GENERIC_VALUES) VALUES = JSON.parse(process.env.GENERIC_VALUES);
else {
  const ids = (arg("--values", "") || LIB.default.join(",")).split(",").map(s => s.trim()).filter(Boolean);
  const bad = ids.filter(id => !LIB.values[id]);
  if (bad.length) { console.error(`✗ unknown value(s): ${bad.join(", ")} (node generic.mjs --list)`); process.exit(2); }
  VALUES = ids.map(id => LIB.values[id]);
}
if (VALUES.length > 4) { console.error("✗ 4 values at most: the generic stays short"); process.exit(2); }
for (const v of VALUES) if (!v.label) { console.error("✗ a value needs its words (label)"); process.exit(2); }

const probe = f => JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate,duration,color_space,color_primaries,color_transfer:format=duration:format_tags=comment", "-of", "json", f], { encoding: "utf8" }).stdout);
// a video that has the generic already: start again from the copy without it
let SRC = VIDEO;
if ((probe(VIDEO).format?.tags?.comment || "").includes(TAG)) {
  if (!fs.existsSync(KEEP)) { console.error(`✗ ${VIDEO} has the generic already, and its copy without it (${KEEP}) is not here: run from its project, or pass --keep`); process.exit(1); }
  SRC = KEEP;
  console.log(`  (${VIDEO} has the generic already: redone from ${KEEP})`);
}
const info = probe(SRC);
const vs = info.streams.find(s => s.codec_type === "video"), hasAudio = info.streams.some(s => s.codec_type === "audio");
const W = vs.width, H = vs.height, [fn, fd] = vs.r_frame_rate.split("/").map(Number), FPS = fn / (fd || 1);
const DUR = Number(vs.duration || info.format.duration);
if (W > H) console.log("  ⚠ a horizontal video: the generic is laid out for 9:16, it is drawn at this size anyway");

const { sting, loadWordmark, FLY } = await import("./generic/sting.mjs");
(await import("./pro.mjs")).mxDir(path.join(SFX, "motionix"));     // its sounds are read from the shelf
const wordmark = await loadWordmark();
const { createCanvas, loadImage } = await import("@napi-rs/canvas");

// where it starts: on a frame, FLY before the end of the video
const F0 = Math.max(0, Math.floor((DUR - FLY) * FPS + 1e-6)), T0 = F0 / FPS;
fs.mkdirSync(path.dirname(path.resolve(KEEP)), { recursive: true });
// (a piece of the tail, drawn by a process of its own, works in its parent's folder: see below)
const TMP = process.env.GENERIC_TMP || fs.mkdtempSync(path.join(path.dirname(path.resolve(KEEP)), ".generic-"));
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 30 }); if (r.status !== 0) { console.error(r.stderr); process.exit(1); } return r; };

// the video's last frames, under the sparkle (the last one held until the yellow covers it)
if (!process.env.GENERIC_TMP) run("ffmpeg", ["-v", "error", "-ss", T0.toFixed(4), "-i", SRC, "-frames:v", String(Math.ceil(FLY * FPS) + 2), "-q:v", "2", path.join(TMP, "f_%03d.jpg")]);
const frames = [];
for (const f of fs.readdirSync(TMP).filter(f => /^f_\d+\.jpg$/.test(f)).sort()) frames.push(await loadImage(path.join(TMP, f)));
const lastIdx = Math.max(0, Math.round((DUR - T0) * FPS) - 1);
const prelude = (ctx, t) => { const im = frames[Math.min(frames.length - 1, lastIdx, Math.floor(t * FPS + 1e-6))]; if (im) ctx.drawImage(im, 0, 0, W, H); };

const S = sting({ w: W, h: H, fps: FPS, values: VALUES, wordmark, prelude });
const TAIL_END = S.END + 0.3;                                // the logo held a breath at the end
const NF = Math.ceil(TAIL_END * FPS);

// ── the picture of the tail ──
// When it moves, a frame of it is ten paintings of the whole frame (its motion blur): ~470 ms. So it
// is drawn in pieces at once, one process a piece (this same script, GENERIC_PIECE), each piece
// stored losslessly (QuickTime RLE, as build.sh's layers), then joined: it is encoded once, with
// the video, below. 206 frames: 96 s in one process (2026-10-09).
const drawTail = async (a, b, file) => {
  const enc = spawn("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", vs.r_frame_rate, "-i", "-",
    "-c:v", "qtrle", "-pix_fmt", "argb", "-video_track_timescale", String(fn * 16), "-f", "mov", file], { stdio: ["pipe", "inherit", "inherit"] });
  const cv = createCanvas(W, H), ctx = cv.getContext("2d");
  for (let k = a; k < b; k++) {
    const t = k / FPS;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = "none"; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    S.draw(ctx, t);
    if (!enc.stdin.write(cv.data())) await new Promise(r => enc.stdin.once("drain", r));
  }
  enc.stdin.end();
  await new Promise(r => enc.on("close", c => { if (c !== 0) { console.error("✗ the tail did not encode"); process.exit(1); } r(); }));
};
if (process.env.GENERIC_PIECE) {
  const [a, b, file] = process.env.GENERIC_PIECE.split(" ");
  await drawTail(+a, +b, file);
  process.exit(0);
}
const tail = path.join(TMP, "tail.mov");
const t0 = Date.now();
const NP = Math.max(1, Math.min(os.availableParallelism() - 2, Math.floor(os.totalmem() / 1.5e9), Math.ceil(NF / 15)));
if (NP === 1) await drawTail(0, NF, tail);
else {
  const pieces = Array.from({ length: NP }, (_, i) => [Math.floor(NF * i / NP), Math.floor(NF * (i + 1) / NP), path.join(TMP, `tail.${i}.mov`)]);
  await Promise.all(pieces.map(([a, b, f]) => new Promise((res, rej) => {
    const c = spawn(process.execPath, process.argv.slice(1), { env: { ...process.env, GENERIC_TMP: TMP, GENERIC_PIECE: `${a} ${b} ${f}` }, stdio: ["ignore", "ignore", "inherit"] });
    c.on("close", code => code === 0 ? res() : rej(new Error(`the tail's frames ${a}-${b} did not draw (code ${code})`)));
  }))).catch(e => { console.error(`✗ ${e.message}`); process.exit(1); });
  // each piece at its exact length: estimated from the file, a frame would be lost at a seam
  fs.writeFileSync(path.join(TMP, "tail.txt"), pieces.map(([a, b, f]) => `file '${path.basename(f)}'\nduration ${(b - a) * (fd || 1) / fn}\n`).join(""));
  run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(TMP, "tail.txt"), "-c", "copy", tail]);
}
console.log(`  picture ${NF} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// ── the sound ──
function decode(file, opts = []) {
  const r = spawnSync("ffmpeg", ["-v", "error", ...opts, "-i", file, "-ar", String(SR), "-ac", "2", "-f", "f32le", "-"], { maxBuffer: 4e9 });
  if (r.status !== 0) throw new Error(r.stderr.toString());
  const b = r.stdout, n = b.length / 8, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = b.readFloatLE(i * 8); R[i] = b.readFloatLE(i * 8 + 4); }
  return { L, R, n };
}
const N = Math.round((T0 + TAIL_END) * SR), L = new Float32Array(N), R = new Float32Array(N);
const iT0 = Math.round(T0 * SR), iDur = Math.round(DUR * SR);
if (hasAudio) {
  const a = decode(SRC);
  for (let i = 0; i < Math.min(iT0, a.n); i++) { L[i] = a.L[i]; R[i] = a.R[i]; }
  // the tape stop: the read head slows linearly to a halt (∫(1 − s/T) ds), the level going with
  // its last 40 %; --no-tape: the sound fades out over those frames instead
  const TP = (iDur - iT0) / SR, lerp = (arr, p) => { const k = Math.floor(p), u = p - k; return (arr[k] ?? 0) * (1 - u) + (arr[k + 1] ?? 0) * u; };
  for (let i = iT0; i < iDur; i++) {
    const s = (i - iT0) / SR, u = s / TP;
    const g = u < 0.6 ? 1 : Math.pow(1 - (u - 0.6) / 0.4, 1.5);
    if (flag("--no-tape")) { L[i] = (a.L[i] ?? 0) * (1 - u); R[i] = (a.R[i] ?? 0) * (1 - u); continue; }
    const p = iT0 + SR * (s - (s * s) / (2 * TP));
    L[i] = lerp(a.L, p) * g; R[i] = lerp(a.R, p) * g;
  }
}
// the generic's sounds, on their own bus, then set to GEN_LUFS
const BL = new Float32Array(N), BR = new Float32Array(N), cache = new Map();
const cues = S.cues();
for (const q of cues) {
  const m = q.kind.match(/^sample:([^:]+)(?::([\d.]+):([\d.]+))?$/); if (!m) continue;
  const file = path.join(SFX, m[1]);
  if (!fs.existsSync(file)) { console.error(`  ⚠ missing sound ${m[1]}`); continue; }
  const key = q.kind;
  if (!cache.has(key)) cache.set(key, decode(file, m[2] ? ["-ss", m[2], "-t", m[3]] : []));
  const s = cache.get(key), g = Math.pow(10, q.gain / 20), off = Math.round((T0 + q.t - (q.align ?? 0)) * SR);
  for (let i = 0; i < s.n; i++) { const j = off + i; if (j < 0 || j >= N) continue; BL[j] += s.L[i] * g; BR[j] += s.R[i] * g; }
}
const raw = (l, r, a = 0, b = l.length) => { const buf = Buffer.alloc((b - a) * 8); for (let i = a; i < b; i++) { buf.writeFloatLE(l[i], (i - a) * 8); buf.writeFloatLE(r[i], (i - a) * 8 + 4); } return buf; };
const lufsOf = buf => {
  const f = path.join(TMP, "m.raw"); fs.writeFileSync(f, buf);
  const r = spawnSync("ffmpeg", ["-hide_banner", "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const num = re => Number(r.stderr.match(re)?.at(-1)?.match(/-?[\d.]+/)?.[0] ?? NaN);
  const I = num(/I:\s+-?[\d.]+ LUFS/g), P = num(/Peak:\s+-?[\d.]+ dBFS/g);
  return { I, P };
};
// measured from the burst on, as on the validated edit (its sounds alone there)
const busFrom = Math.max(0, Math.round((T0 + S.J - 0.02) * SR));
let peak = 0; for (let i = busFrom; i < N; i++) peak = Math.max(peak, Math.abs(BL[i]), Math.abs(BR[i]));
// without its sounds (the Motionix pack and the house whoosh are not shipped with every copy of GTM
// by Pipecorn: their licence), the generic is silent: said, never a gain computed on silence
const silent = peak < 1e-6;
if (silent) console.log("  ⚠ none of the generic's sounds were found (plugins/video/assets/sfx/motionix, sfx/top5): it plays silent after the tape stop");
const before = silent ? { I: NaN } : lufsOf(raw(BL, BR, busFrom));
let gain = silent || !Number.isFinite(before.I) ? 0 : GEN_LUFS - before.I;
const peakDb = 20 * Math.log10(peak || 1e-9);
if (peakDb + gain > -2) gain = -2 - peakDb;
const G = Math.pow(10, gain / 20);
let mixPeak = 0;
for (let i = 0; i < N; i++) { L[i] += BL[i] * G; R[i] += BR[i] * G; mixPeak = Math.max(mixPeak, Math.abs(L[i]), Math.abs(R[i])); }
if (mixPeak >= 1) { const k = 0.98 / mixPeak; for (let i = iT0; i < N; i++) { L[i] *= k; R[i] *= k; } }
const audioRaw = path.join(TMP, "audio.raw");
fs.writeFileSync(audioRaw, raw(L, R));

// ── the whole, once: the video up to T0, the tail, the new sound; the colour tags kept ──
const tags = [];
for (const [k, o] of [["color_space", "-colorspace"], ["color_primaries", "-color_primaries"], ["color_transfer", "-color_trc"]]) if (vs[k] && vs[k] !== "unknown") tags.push(o, vs[k]);
// the encoder of build.sh: the media engine at q 87 (at least x264 medium CRF 14, measured), several
// times faster on a whole short; x264 CRF 15 on a Mac without it, or with ENCODER=x264
const VT = ["-c:v", "h264_videotoolbox", "-q:v", "87", "-g", "250"];
const VENC = process.env.ENCODER !== "x264" && spawnSync("ffmpeg", ["-v", "quiet", "-f", "lavfi", "-i", "color=black:s=256x256:r=30",
  "-frames:v", "2", ...VT, "-f", "null", "-"]).status === 0 ? VT : ["-c:v", "libx264", "-crf", "15", "-preset", "medium"];
const outTmp = path.join(TMP, "out.mp4");
run("ffmpeg", ["-v", "error", "-y", "-i", SRC, "-i", tail, "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", audioRaw,
  "-filter_complex", `[0:v]trim=end_frame=${F0},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[a];[1:v]setpts=PTS-STARTPTS,format=yuv420p,setsar=1[b];[a][b]concat=n=2:v=1:a=0[v]`,
  "-map", "[v]", "-map", "2:a", ...VENC, "-pix_fmt", "yuv420p", ...tags,
  "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-metadata", `comment=${TAG} ${VALUES.map(v => v.label).join(" / ")}`, outTmp]);
if (SRC === VIDEO) fs.copyFileSync(VIDEO, KEEP);
fs.copyFileSync(outTmp, VIDEO);
fs.rmSync(TMP, { recursive: true, force: true });

// ── measured, on the file ──
const meas = (a, b, file = VIDEO) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", ...(a != null ? ["-ss", String(a)] : []), ...(b != null ? ["-to", String(b)] : []), "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const g = re => Number(r.stderr.match(re)?.at(-1)?.match(/-?[\d.]+/)?.[0]);
  return { I: g(/I:\s+-?[\d.]+ LUFS/g), P: g(/Peak:\s+-?[\d.]+ dBFS/g) };
};
const all = meas(), gen = meas(T0 + S.J - 0.02, T0 + TAIL_END), src = meas(null, null, KEEP), d = Number(probe(VIDEO).format.duration);
console.log(`generic   ${VALUES.map(v => `${v.label}${v.n ? ` ${v.n}` : ""}`).join(" → ")} · from ${T0.toFixed(2)} s, ${TAIL_END.toFixed(2)} s long`);
console.log(`file      ${VIDEO} · ${d.toFixed(2)} s (was ${DUR.toFixed(2)} s) · kept without the generic: ${KEEP}`);
console.log(`loudness  whole ${all.I} LUFS, true peak ${all.P} dBTP · the generic ${gen.I} LUFS (target ${GEN_LUFS}), ${silent ? "no sounds of its own" : `its sounds ${gain >= 0 ? "+" : ""}${gain.toFixed(1)} dB`}`);
// the short's own peak is the skill's; the generic must not make it worse
if (all.P > Math.max(-1.0, src.P) + 0.15) console.log(`  ⚠ true peak ${all.P} dBTP, the video without the generic had ${src.P}`);
