// The shelf's sounds and music, and the loudness measure, for the voiceover video (copied from article-video's
// mix.mjs, so this skill stands on its own). Only the shelf: never a synthesised sound.
//   m:<name>  the Motionix pack       plugins/video/assets/sfx/motionix/<name>.wav
//   p:<name>  paper (Mixkit)          plugins/video/assets/sfx/paper/<name>.wav
//   k:<name>  the Top 5 pack          plugins/video/assets/sfx/top5/<name>.wav  (click, glitch, whoosh, riser)
//   boom · grit · burn                the BOOM Library impact, Adam Pietruszko's riser, a film burn
// The music: a name of the shelf (gimme, complicated, hiphop02, deepurban) or a file of plugins/video/assets/music/.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(HERE, "..", "..", "..", "assets");
const MUSIC = {
  gimme: "mixkit-gimme-that-groove-872.mp3", complicated: "mixkit-complicated-281.mp3",
  hiphop02: "mixkit-hip-hop-02-738.mp3", deepurban: "mixkit-deep-urban-623.mp3",
};
export const musicPath = name => {
  const f = path.join(ASSETS, "music", MUSIC[name] || name);
  if (!fs.existsSync(f)) throw new Error(`music not on the shelf: ${name} (node plugins/video/motion/bootstrap.mjs fetches the Mixkit tracks)`);
  return f;
};
export function sfxPath(name) {
  const fixed = { boom: "sfx/BOOM Library - Transitions - Impact Metallic Thundering Title.aac", grit: "sfx/Adam Pietruszko  - Extreme Impulse - Gritty Cymbal Riser.aac", burn: "sfx/Film Burn Transition 2.wav" };
  if (fixed[name]) return path.join(ASSETS, fixed[name]);
  const [k, n] = name.split(":");
  const dir = { m: "sfx/motionix", p: "sfx/paper", k: "sfx/top5", t: "sfx/top5" }[k];
  if (!dir) throw new Error(`unknown sound library: ${name}`);
  const f = path.join(ASSETS, dir, `${n}.wav`);
  if (!fs.existsSync(f)) throw new Error(`sound not on the shelf: ${name}`);
  return f;
}

// where a sound really starts (its attack), peaks, or ends: measured on its 8 kHz envelope
const cache = new Map();
export function alignOf(file, mode) {
  const key = `${file}|${mode}`;
  if (cache.has(key)) return cache.get(key);
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength >> 1);
  const d = Array.from(pcm, Math.abs), peak = Math.max(1, ...d);
  let v;
  if (mode === "peak") {
    const win = 320; let best = 0, bi = 0, s = 0;
    for (let i = 0; i < Math.min(win, d.length); i++) s += d[i];
    for (let i = win; i < d.length; i++) { s += d[i] - d[i - win]; if (s > best) { best = s; bi = i - win / 2; } }
    v = bi / 8000;
  } else if (mode === "end") {
    v = 0;
    for (let i = d.length - 1; i >= 0; i--) if (d[i] > 0.08 * peak) { v = i / 8000; break; }
  } else v = Math.max(0, d.findIndex(x => x > 0.12 * peak)) / 8000;
  cache.set(key, v);
  return v;
}

// EBU R128: integrated loudness (LUFS) and true peak (dBTP)
// the sound alone (-vn): measured on a video, its picture was decoded for nothing (28.7 → 2.0 s on the 3:48 cut, § 10)
export function loudness(file) {
  const e = spawnSync("ffmpeg", ["-nostdin", "-hide_banner", "-i", file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 }).stderr || "";
  const I = +([...e.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)?.[1]), TP = +([...e.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].at(-1)?.[1]);
  if (!Number.isFinite(I)) throw new Error(`the loudness of ${path.basename(file)} could not be measured`);
  return { I, TP };
}
