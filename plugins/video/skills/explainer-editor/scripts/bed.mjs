#!/usr/bin/env node
// The music bed of an explainer, from the shelf: assets/music.wav, ready for edl.mjs.
//
//   node bed.mjs --track plugins/video/assets/music/<file>.mp3 [--from 0] [--drops 44.5-46.4,…]
//
// From the working directory. The track from `--from` (s, in the track) for the length of the
// video, looped when it is shorter (said), 30 ms in, 1.5 s out at the end. `--drops`: output
// seconds where the music goes silent (50 ms out, 30 ms back in): the ONE breather that lands
// the point, back with the next section (the reference cut its music there). Without --drops,
// project.json `musicDrops` is read. Then project.json bed = music.wav, and bedDb from the
// track's loudness when none is set yet (`--level auto` sets it again).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
let track = arg("--track", null);
if (!track) { console.error("usage: bed.mjs --track plugins/video/assets/music/<file>.mp3 [--from s] [--drops a-b,…]"); process.exit(2); }
if (!fs.existsSync(track)) track = path.resolve(ROOT, track);
if (!fs.existsSync(track)) { console.error(`track not found: ${track}`); process.exit(1); }
const FROM = parseFloat(arg("--from", "0")) || 0;
const parseDrops = s => String(s).split(",").map(x => x.trim()).filter(Boolean).map(x => x.split("-").map(Number)).filter(([a, b]) => b > a);
const DROPS = arg("--drops", null) != null ? parseDrops(arg("--drops")) : (P.musicDrops ?? []);
const SR = 48000, LEN = P.duration + 0.4;

const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", track], { encoding: "utf8" });
const TDUR = parseFloat(probe.stdout) || 0;
const loop = TDUR - FROM < LEN;
const r = spawnSync("ffmpeg", ["-v", "error", ...(loop ? ["-stream_loop", "-1"] : []), "-ss", String(FROM), "-i", track, "-t", String(LEN),
  "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
const N = x.length / 2;
const gainAt = t => {
  let g = Math.min(1, t / 0.03);                                     // in
  g *= Math.min(1, Math.max(0, (LEN - 0.3 - t) / 1.5));               // out at the end
  for (const [a, b] of DROPS) g *= Math.max(Math.min(1, Math.max(0, (a - t) / 0.05)), Math.min(1, Math.max(0, (t - b) / 0.03)));
  return g;
};
const out = Buffer.alloc(44 + N * 4);
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVE", 8);
out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write("data", 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const g = gainAt(i / SR);
  out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[2 * i] * g)) * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[2 * i + 1] * g)) * 32767), 46 + i * 4);
}
fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/music.wav", out);
// its level: measured on the part used (before any drop), set so the bed sits about 16 LU under
// a typical take (-13 for a track at -11.5 LUFS: measured on the reference take), unless a level
// is already set (a measured one is kept: measure.mjs is the verdict); --level auto resets it
const lufs = (() => {
  const m = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", "assets/music.wav", "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" });
  const x = ((m.stderr || "").split("Summary:").pop() || "").match(/^\s*I:\s*(-?[\d.]+)/m);
  return x ? parseFloat(x[1]) : NaN;
})();
// voice − track − master − 19 lands the bed about 16 LU under the voice as heard (the dynamic
// loudnorm lifts it ~3 dB above the arithmetic; measured on the reference take), plus 0.18 dB per
// dB of a quiet take under −20.5 LUFS (its loudness pass lifts the voice more than the bed: −31.8
// LUFS needed +2.0, measured)
if (Number.isFinite(lufs) && (P.bedDb == null || arg("--level", null) === "auto")) {
  const voice = P.voiceLufs ?? -20.5, master = P.sfxMasterDb ?? -15;
  P.bedDb = +(voice - lufs - master - 19 + 0.18 * Math.max(0, -20.5 - voice)).toFixed(1);
}
P.bed = "music.wav"; P.musicTrack = path.basename(track); P.musicFrom = FROM; P.musicDrops = DROPS;
fs.writeFileSync("project.json", JSON.stringify(P, null, 2));
console.log(`assets/music.wav — ${path.basename(track)} from ${FROM}s, ${LEN.toFixed(1)} s${loop ? ` (looped: the track lasts ${TDUR.toFixed(1)} s)` : ""}` +
  `${DROPS.length ? `, silent on ${DROPS.map(([a, b]) => `${a}-${b}`).join(", ")}` : ""}; the track at ${lufs.toFixed(1)} LUFS, bedDb ${P.bedDb} (measure it: measure.mjs bed)`);
