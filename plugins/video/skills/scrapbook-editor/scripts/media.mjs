// A PICTURE READY FOR A CARD: a GIF, a video, a screen recording or a still, into assets/media/.
//
//   node media.mjs <file|https-url> --name travolta [--width 0.56] [--fps 15]
//                  [--from 2.0 --to 5.5] [--audio] [--alpha] [--crop W:H:X:Y]
//
// A moving picture becomes a folder of frames (assets/media/<name>/f0001.jpg…, meta.json) that
// cards.mjs plays, looped if the card outlasts it; a still becomes assets/media/<name>.png.
//   --width  the width it will be SHOWN at, as a fraction of the frame (frames are never stored
//            bigger than that: a 4 s recording at full size is gigabytes once decoded)
//   --fps    15 by default (a GIF rarely has more; a recording reads fine at 15)
//   --from/--to  the stretch of a recording to keep (seconds of the file)
//   --audio  keep the clip's own sound: assets/media/<name>.wav, to lay under the voice (the
//            reference keeps a demo video's own whooshes and ticks, low)
//   --alpha  a transparent sticker (WebP/GIF with alpha): PNG frames that keep it
//   --crop   an ffmpeg crop applied first (a screen recording's useful part)
// Prints the card's aspect, so the plan can size it.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const flag = k => argv.includes(k);
const input = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["--audio", "--alpha"].includes(argv[i - 1])));
const name = arg("--name");
if (!input || !name || !/^[a-z0-9][a-z0-9._-]*$/i.test(name)) {
  console.error('usage: node media.mjs <file|url> --name <name> [--width 0.56] [--fps 15] [--from s --to s] [--audio] [--alpha] [--crop W:H:X:Y]');
  process.exit(2);
}
const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const OUTW = Math.round(parseFloat(arg("--width", "0.56")) * (P.width ?? 1080) / 2) * 2;
const FPS = parseFloat(arg("--fps", "15"));
const DIR = path.resolve("assets", "media");
fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync("tmp", { recursive: true });

let file = input;
if (/^https?:\/\//i.test(input)) {
  const r = await fetch(input);
  if (!r.ok) { console.error(`download failed: HTTP ${r.status}`); process.exit(1); }
  const ext = (path.extname(new URL(input).pathname) || ".bin").slice(0, 6);
  file = path.resolve("tmp", `${name}${ext}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
if (!fs.existsSync(file)) { console.error(`not found: ${file}`); process.exit(1); }

const probe = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,nb_frames,avg_frame_rate", "-show_entries", "format=duration", "-of", "json", file], { encoding: "utf8" }).stdout || "{}");
const v = (probe.streams || []).find(s => s.codec_type === "video");
if (!v) { console.error("no picture in this file"); process.exit(1); }
const dur = parseFloat(probe.format?.duration || "0");
const frames = parseInt(v.nb_frames || "0", 10);
const still = /\.(png|jpe?g|webp|heic|bmp|tiff?)$/i.test(file) && (frames <= 1) && !(dur > 0.2);
const crop = arg("--crop") ? `crop=${arg("--crop")},` : "";
const scale = `scale='min(${OUTW},iw)':-2:flags=lanczos`;

if (still) {
  const out = path.join(DIR, `${name}.png`);
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", `${crop}${scale}`, "-frames:v", "1", out], { stdio: "inherit" });
  if (r.status !== 0) process.exit(1);
  const s = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "json", out], { encoding: "utf8" }).stdout).streams[0];
  console.log(`assets/media/${name}.png — ${s.width}x${s.height} (aspect h/w ${(s.height / s.width).toFixed(3)})`);
  process.exit(0);
}

const out = path.join(DIR, name);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const alpha = flag("--alpha");
const seek = arg("--from") ? ["-ss", arg("--from")] : [];
const to = arg("--to") ? ["-t", String(parseFloat(arg("--to")) - parseFloat(arg("--from", "0")))] : [];
const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...seek, ...to, "-i", file, "-vf", `${crop}fps=${FPS},${scale}${alpha ? ",format=rgba" : ""}`,
  ...(alpha ? [] : ["-q:v", "3"]), path.join(out, alpha ? "f%04d.png" : "f%04d.jpg")], { stdio: "inherit" });
if (r.status !== 0) process.exit(1);
const list = fs.readdirSync(out).filter(f => /^f\d+\./.test(f)).sort();
const s = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "json", path.join(out, list[0])], { encoding: "utf8" }).stdout).streams[0];
fs.writeFileSync(path.join(out, "meta.json"), JSON.stringify({ fps: FPS, width: s.width, height: s.height, frames: list.length, loop: true, alpha, source: path.basename(file) }, null, 1));
let audio = "";
if (flag("--audio")) {
  const a = spawnSync("ffmpeg", ["-v", "error", "-y", ...seek, ...to, "-i", file, "-map", "0:a:0", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", path.join(DIR, `${name}.wav`)], { stdio: "inherit" });
  audio = a.status === 0 ? ` · its sound: assets/media/${name}.wav (cue "sample:media/${name}.wav")` : " · (no sound in the file)";
}
console.log(`assets/media/${name}/ — ${list.length} frames at ${FPS} fps (${(list.length / FPS).toFixed(2)} s, looped on a longer card) · ${s.width}x${s.height} (aspect h/w ${(s.height / s.width).toFixed(3)})${audio}`);
