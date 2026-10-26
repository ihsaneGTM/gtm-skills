// A junction frame (the last frame of a filmed part, the first of a cutback) as a plain PNG: only its pixels.
// ffmpeg writes colour chunks in a PNG (cICP, cHRM, gAMA, iCCP, sRGB…). Chrome honours them and drew the frame about 4 %
// darker than the video it continues: the junction jumped (PSNR 31 dB; 43 dB once stripped, waterfall round 10,
// 2026-10-13). Every frame the film shows as « the real frame » goes through stripPng.
//
//   import { stripPng, framePng } from "./png.mjs"
//   framePng(video, out, { last: true })     the first (or last) frame of a video → a stripped PNG
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const KEEP = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
export function stripPng(file) {
  const d = fs.readFileSync(file);
  if (d.readUInt32BE(0) !== 0x89504e47) throw new Error(`not a PNG: ${file}`);
  const out = [d.subarray(0, 8)];
  for (let i = 8; i < d.length;) {
    const n = d.readUInt32BE(i), type = d.toString("latin1", i + 4, i + 8);
    if (KEEP.has(type)) out.push(d.subarray(i, i + 12 + n));
    i += 12 + n;
  }
  fs.writeFileSync(file, Buffer.concat(out));
}
// one frame of a video, written as its own file (never through a hard link), stripped
export function framePng(video, out, { last = false } = {}) {
  fs.rmSync(out, { force: true });
  const r = last ? spawnSync("ffmpeg", ["-v", "error", "-y", "-sseof", "-0.25", "-i", video, "-update", "1", out])
    : spawnSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-frames:v", "1", out]);
  if (r.status || !fs.existsSync(out)) throw new Error(`the ${last ? "last" : "first"} frame of ${video} could not be taken`);
  stripPng(out);
  return out;
}
