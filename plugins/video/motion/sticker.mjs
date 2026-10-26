#!/usr/bin/env node
// A sticker of a thing the voice names (a product, a car, a tool, an object), white outline and soft
// shadow, the way the vertical styles show a model the moment it is said.
//
//   node sticker.mjs make <out.png> "<what, precisely: make, model, generation, colour>" [--avoid "…"] [--n 2]
//        → <out>-source-1.png, -source-2.png made with Nano Banana 2 on a flat green: LOOK at them
//   node sticker.mjs pick <out.png> <n>          → the n-th source cut out, outlined: <out.png> (+ a preview to look at)
//   node sticker.mjs from <picture> <out.png> [--mode vision|alpha|green|white]
//        → a picture you already have (the product's own image, a logo): cut out and outlined
//          white: a flat logo or a picture on a white (or near white) ground, which Vision sees no subject in: the white
//          touching the edges goes, the white inside the logo stays
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generate } from "./nb2.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CUTOUT = path.join(HERE, "native", "cutout");

// a white ground made transparent, from the edges in (a flood fill: a white letter inside the logo is kept), into a
// PNG the cut-out tool then takes as it is (--mode alpha)
function whiteGround(src) {
  const pr = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", src], { encoding: "utf8" });
  const [w0, h0] = String(pr.stdout).trim().split(",").map(Number);
  if (!w0 || !h0) throw new Error(`cannot read ${src}`);
  const k = Math.min(1, 2400 / Math.max(w0, h0)), W = Math.max(2, Math.round(w0 * k)), H = Math.max(2, Math.round(h0 * k));
  const raw = spawnSync("ffmpeg", ["-v", "error", "-i", src, "-frames:v", "1", "-vf", `scale=${W}:${H}`, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { maxBuffer: 1 << 28 }).stdout;
  if (!raw || raw.length < W * H * 4) throw new Error(`cannot read ${src}`);
  // near white: every channel light and nearly grey (a scan's or a JPEG's off-white counts), or already transparent
  const white = i => raw[i + 3] < 24 || (Math.min(raw[i], raw[i + 1], raw[i + 2]) >= 226 && Math.max(raw[i], raw[i + 1], raw[i + 2]) - Math.min(raw[i], raw[i + 1], raw[i + 2]) <= 28);
  const bg = new Uint8Array(W * H), stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    if (bg[p] || !white(p * 4)) continue;
    bg[p] = 1;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
  }
  let kept = 0;
  for (let p = 0; p < W * H; p++) if (bg[p]) raw[p * 4 + 3] = 0; else kept++;
  if (kept < W * H * 0.005) throw new Error("the whole picture is white: nothing to keep");
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gtm-sticker-")), "white-ground.png");
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-i", "-", "-frames:v", "1", tmp], { input: raw });
  if (r.status !== 0) throw new Error("cannot write the picture without its ground");
  return tmp;
}

const PROMPT = (what, avoid) => `Use case: product cut-out sticker for a premium short video. Create a photorealistic, clean studio image of ${what}. ` +
  "Plain flat uniform chroma-key green background (#00B140), perfectly even, no gradient, no floor line, no shadow on the background, no environment. " +
  "The whole subject visible, three-quarter view facing slightly left, generous padding around it. Soft neutral daylight, no green reflections on the subject. " +
  `No people, no hands, no text, no price, no added logo, no watermark. Avoid ${avoid ? avoid + ", " : ""}illustration, CGI toy look, dramatic reflections.`;

function cut(src, out, mode) {
  if (!fs.existsSync(CUTOUT)) throw new Error("the cut-out tool is not built yet: run node plugins/video/motion/bootstrap.mjs");
  const r = spawnSync(CUTOUT, [src, out, "--mode", mode, "--preview", "3D2E27"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr.trim() || "cut-out failed");
  return r.stdout.trim();
}

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i < 0 ? d : a[i + 1]; };
const base = f => f.replace(/\.png$/i, "");
try {
  if (a[0] === "make") {
    const n = +opt("--n", 2);
    for (let i = 1; i <= n; i++) {
      const f = `${base(a[1])}-source-${i}.png`;
      await generate(PROMPT(a[2], opt("--avoid", "")), f, { aspect: "3:2", size: "1K" });
      console.log(`→ ${f}`);
    }
    console.log(`Look at the ${n} sources (is it the right model, generation, details?), then: node sticker.mjs pick ${a[1]} <n>`);
  } else if (a[0] === "pick") {
    console.log(cut(`${base(a[1])}-source-${a[2]}.png`, a[1], "green"));
    console.log(`Look at ${base(a[1])}.preview.jpg before it goes in the video.`);
  } else if (a[0] === "from") {
    const mode = opt("--mode", "vision");
    if (mode === "white") {
      const tmp = whiteGround(a[1]);
      try { console.log(cut(tmp, a[2], "alpha")); } finally { fs.rmSync(path.dirname(tmp), { recursive: true, force: true }); }
    } else {
      try { console.log(cut(a[1], a[2], mode)); }
      catch (e) { throw new Error(/no subject/i.test(e.message) && mode === "vision" ? `${e.message}; a flat logo or a picture on a white ground: --mode white` : e.message); }
    }
    console.log(`Look at ${base(a[2])}.preview.jpg before it goes in the video.`);
  } else {
    const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n");
    console.log(src.slice(1, src.findIndex(l => l.startsWith("import "))).map(l => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exit(2);
  }
} catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
