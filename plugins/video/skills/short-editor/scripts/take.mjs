#!/usr/bin/env node
// THE TAKE AT A GLANCE, made before Claude needs it (prep.mjs runs it once the words are ready):
//   .prep/take.md    60 lines at most: the file, the language, the voice's level, the shots and the
//                    source's own cuts, the words by phrase with the pauses between them
//   .prep/sheet.jpg  a frame every 2 s, its time written on it
// What every edit rebuilt by hand in its first minutes (ffprobe, a scene detection, the transcript
// read word by word, a contact sheet assembled with ffmpeg).
//
//   node take.mjs <project dir> <source video>        (the words: <dir>/.prep/words.json or words.json)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [dirArg, srcArg] = process.argv.slice(2);
if (!dirArg || !srcArg) { console.error("usage: node take.mjs <project dir> <source video>"); process.exit(2); }
const DIR = path.resolve(dirArg), SRC = path.resolve(srcArg), PREP = path.join(DIR, ".prep");
fs.mkdirSync(PREP, { recursive: true });
const run = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28 });

// the file
const pr = JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,color_transfer,sample_rate,channels:format=duration", "-of", "json", SRC]).stdout || "{}");
const v = (pr.streams || []).find(s => s.codec_type === "video") || {}, au = (pr.streams || []).find(s => s.codec_type === "audio");
const DUR = +(pr.format?.duration || 0), [fn, fd = 1] = String(v.r_frame_rate || "0/1").split("/").map(Number), FPS = fn / fd;
const hdr = /arib-std-b67|smpte2084/.test(v.color_transfer || "") ? ` · HDR (${v.color_transfer === "arib-std-b67" ? "HLG" : "PQ"})` : "";
// the voice's loudness, and the room's floor
const loud = (() => {
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", SRC, "-map", "0:a:0?", "-af", "ebur128", "-f", "null", "-"]);
  const m = (((r.stderr || "") + (r.stdout || "")).split("Summary:").pop() || "").match(/^\s*I:\s*(-?[\d.]+)/m);
  return m ? +m[1] : null;
})();
// the source's own cuts: a scene change on a small copy of the picture
const cuts = (() => {
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", SRC, "-an", "-vf", "scale=160:-2,select='gt(scene,0.30)',showinfo", "-f", "null", "-"]);
  return [...((r.stderr || "").matchAll(/pts_time:([\d.]+)/g))].map(m => +(+m[1]).toFixed(2));
})();
// the words, by phrase: a new phrase after a pause of 0.35 s or more, or a full stop
const wf = [path.join(PREP, "words.json"), path.join(DIR, "words.json")].find(f => fs.existsSync(f));
const W = wf ? JSON.parse(fs.readFileSync(wf, "utf8")) : [];
let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(PREP, "words.meta.json"), "utf8")); } catch {}
const phrases = [];
for (const [i, q] of W.entries()) {
  const prev = W[i - 1], gap = prev ? q.s - prev.e : 0;
  if (!phrases.length || gap >= 0.35 || /[.!?]$/.test(prev?.w || "")) phrases.push({ from: q.s, to: q.e, words: [], pause: gap });
  const p = phrases.at(-1); p.words.push(q.w); p.to = q.e;
}
// 60 lines at most: the shortest pauses join their phrases first
while (phrases.length > 44) {
  let k = 1; for (let j = 2; j < phrases.length; j++) if (phrases[j].pause < phrases[k].pause) k = j;
  const a = phrases[k - 1], b = phrases[k]; a.words.push(...b.words); a.to = b.to; phrases.splice(k, 1);
}
const L = [];
L.push(`# The take: ${path.basename(SRC)}`, "");
L.push(`- ${v.width}x${v.height} · ${FPS.toFixed(2).replace(/\.00$/, "")} fps · ${v.codec_name}${hdr} · ${DUR.toFixed(2)} s${au ? ` · sound ${au.codec_name} ${au.sample_rate} Hz ${au.channels} ch` : " · NO SOUND"}`);
L.push(`- language heard: ${meta.language ?? "?"}${meta.prob ? ` (${Math.round(meta.prob * 100)} %)` : ""} · ${W.length} words · the voice at ${loud ?? "?"} LUFS integrated`);
L.push(`- the source's own cuts (a scene change): ${cuts.length ? cuts.join(", ") + " s" : "none: one shot"}`);
L.push(`- the frames: .prep/sheet.jpg (one every 2 s, its time on it)`, "");
L.push("## The words, by phrase (source seconds · the pause before)", "");
for (const p of phrases) L.push(`${p.from.toFixed(2).padStart(7)}-${p.to.toFixed(2).padEnd(7)} ${p.pause >= 0.35 ? `(${p.pause.toFixed(2)})` : "      "}  ${p.words.join(" ")}`);
if (!W.length) L.push("(no words yet: transcribe.sh)");
L.push("", "Times from the transcript: words.mjs measures them on the voice (onsets out of silences, the real ends).");
fs.writeFileSync(path.join(PREP, "take.md"), L.join("\n") + "\n");

// the sheet: a frame every 2 s, 180 px wide, 8 a row, the time on each
const tmp = fs.mkdtempSync(path.join(PREP, ".sheet-"));
try {
  run("ffmpeg", ["-v", "error", "-y", "-i", SRC, "-vf", `fps=1/2,scale=180:-2`, "-q:v", "4", path.join(tmp, "f_%03d.jpg")]);
  const files = fs.readdirSync(tmp).filter(f => f.endsWith(".jpg")).sort();
  if (files.length) {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");
    const first = await loadImage(path.join(tmp, files[0])), tw = first.width, th = first.height, cols = Math.min(8, files.length);
    const c = createCanvas(cols * tw, Math.ceil(files.length / cols) * th), x = c.getContext("2d");
    x.fillStyle = "#111"; x.fillRect(0, 0, c.width, c.height);
    for (const [k, f] of files.entries()) {
      const X = (k % cols) * tw, Y = Math.floor(k / cols) * th;
      x.drawImage(await loadImage(path.join(tmp, f)), X, Y, tw, th);
      x.fillStyle = "rgba(0,0,0,.65)"; x.fillRect(X, Y, 64, 22);
      x.font = "bold 16px Helvetica"; x.fillStyle = "#FFD90D"; x.fillText(`${k * 2} s`, X + 6, Y + 16);
    }
    fs.writeFileSync(path.join(PREP, "sheet.jpg"), await c.encode("jpeg", 82));
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`${path.join(PREP, "take.md")} (${L.length} lines) · ${path.join(PREP, "sheet.jpg")}`);
