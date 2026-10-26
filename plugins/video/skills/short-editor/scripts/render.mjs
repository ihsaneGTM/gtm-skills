// The compositor. Draws the full-frame RGBA overlay and streams it to ffmpeg.
//
//   node render.mjs                  # raw RGBA on stdout, for build.sh
//   node render.mjs --png 12.5       # one frame to frame_12.5.png, for review
//   node render.mjs --from 8 --to 20 # a slice, for a quick look
//   node render.mjs --frames 0 450   # only those frames of it (build.sh draws in pieces)
//
// Reads three files from the WORKING directory (not from the skill):
//   project.json  — format, duration, paths
//   edl.mjs       — the edit: camera, cues, blur windows, act timings
//   plan.mjs      — the beats
// first of all: with --fingerprint, it records the canvas calls before anything else is loaded
import { FP, fingerprint } from "./fingerprint.mjs";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  CARD, clamp01, easeInOutCubic, easeOutQuint, lerp, seg, createCanvas, loadIconAssets,
} from "./scene.mjs";
import { drawSubs, loadSubs, STYLES } from "./subs.mjs";

const CWD = process.cwd();
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };

const P = JSON.parse(fs.readFileSync(path.resolve(CWD, "project.json"), "utf8"));
const E = await import(pathToFileURL(path.resolve(CWD, "edl.mjs")).href);
const PLAN = await import(pathToFileURL(path.resolve(CWD, "plan.mjs")).href);

const W = P.width ?? 1080, H = P.height ?? 1920, FPS = P.fps ?? 60;
const FROM = parseFloat(arg("--from", "0"));
const TO = parseFloat(arg("--to", String(P.duration)));
const PNG_AT = arg("--png", null);
// A beat can declare `layer: "under"` — it is then drawn BEHIND the speaker,
// which only means anything when a person matte exists (matte.mjs + build.sh).
// build.sh runs render.mjs twice, once per layer, into two FIFOs.
const LAYER = arg("--layer", "over");

await loadIconAssets(new URL("./", import.meta.url));
// The map and the macOS demo are optional modules: imported only when the edit
// uses them, so the engine renders in a folder that does not ship them.
const HAS_MAP = !!(E.MAP && E.MAP.acts && E.MAP.acts.length);
const GT = HAS_MAP ? await import("./gtmos.mjs") : null;
const MC = E.MAC ? await import("./macos.mjs") : null;
if (E.MAC) await MC.loadWallpaper(path.resolve(CWD, P.wallpaper ?? "assets/wallpaper.png"));
// The layer is passed in: a two-layer project runs this file TWICE, and a plan
// whose assets belong to one layer (a clip is 450 MB of decoded frames) must not
// pay for them in the process that never draws them.
if (PLAN.load) await PLAN.load({ layer: LAYER });

const SUBS = fs.existsSync(path.resolve(CWD, "subs.json")) ? loadSubs() : null;
// The caption style's size is tuned at 1080p; a bigger landscape master
// (1440p, 4K) scales it, so the line keeps the same share of the frame.
const SUB_STYLE = { ...STYLES[E.SUB_STYLE ?? "clean"] };
// The STROKE has to scale with the size for the same reason the size does: left
// at its 1080p value it is 9 px around an 88 px glyph on a 1440p master, which
// is a thinner outline than the one the style was tuned for, not the same one.
if (W > H) {
  const k = W / 1920;
  SUB_STYLE.size = Math.round(SUB_STYLE.size * k);
  if (SUB_STYLE.stroke) SUB_STYLE.stroke = +(SUB_STYLE.stroke * k).toFixed(2);
}
// Caption geometry follows the frame: the vertical short keeps its measured
// 540/1500/950; a landscape project sits the line at 90 % of the height unless
// project.json says otherwise (subsY / subsMaxW, in pixels).
const LANDSCAPE = W > H;
const SUB_GEOM = {
  cx: W / 2,
  baseY: P.subsY ?? (LANDSCAPE ? Math.round(H * 0.905) : 1500),
  maxW: P.subsMaxW ?? (LANDSCAPE ? Math.round(W * 0.78) : 950),
};
const ALL_BEATS = PLAN.BEATS ?? [];
const BEATS = ALL_BEATS.filter(b => (b.layer ?? "over") === LAYER);
// A beat that IS the caption for its phrase (a title lockup) mutes the bottom
// line while it is up, so the sentence is never written twice on the frame.
// captions are an OVER-layer thing, and a title on either layer can mute them
const MUTERS = ALL_BEATS.filter(b => b.mutesCaptions);
function captionAlpha(t) {
  let a = 1;
  for (const b of MUTERS) {
    const inK = clamp01((t - (b.from - 0.14)) / 0.14);      // fade the line out just before the title lands
    const outK = clamp01((t - (b.to - 0.10)) / 0.20);       // and back in as it leaves
    a = Math.min(a, 1 - inK + outK);
  }
  return a;
}
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

function drawFrame(t) {
  ctx.clearRect(0, 0, W, H);

  // graphic beats float on the progressive blur — no card, no black plate
  for (const b of BEATS) if (t >= b.from && t <= b.to) b.draw(ctx, t);

  const D = (E.MAC && LAYER === "over") ? MC.macFrame(t, E.MAC) : null;
  if (D) {
    MC.drawDesktop(ctx, t, D, { appName: P.appName ?? "App" });
    if (D.opened && HAS_MAP) {
      ctx.save();
      ctx.translate(0, D.rise);                 // the window rises with the machine
      const k = clamp01(D.openK);
      if (k < 0.999) {
        // opening from the dock icon: the card scales up out of it
        const o = MC.dockOrigin();
        const r = {
          x: lerp(o.x, D.rect.x, k), y: lerp(o.y, D.rect.y, k),
          w: lerp(46, D.rect.w, k), h: lerp(46 * CARD.h / CARD.w, D.rect.h, k),
        };
        ctx.globalAlpha = clamp01(D.openK * 1.6);
        GT.drawMap(ctx, t, E.MAP, E.SKILLS, r, 1, 1);
      } else {
        GT.drawMap(ctx, t, E.MAP, E.SKILLS, D.rect, 1, D.chromeAlpha);
      }
      ctx.restore();
      MC.drawAppChrome(ctx, D, { appName: P.appName ?? "App" });
    }
  } else if (HAS_MAP && LAYER === "over") {
    GT.drawMap(ctx, t, E.MAP, E.SKILLS);
  }

  if (SUBS && LAYER === "over") drawSubs(ctx, t, SUBS, SUB_STYLE, SUB_GEOM, captionAlpha(t));
}

if (PNG_AT !== null) {
  drawFrame(parseFloat(PNG_AT));
  const out = path.resolve(CWD, `frame_${PNG_AT}.png`);
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  console.error(path.basename(out));
} else {
  // @napi-rs/canvas hands back PREMULTIPLIED RGBA. Feeding that to ffmpeg as
  // straight `rgba` darkens every soft edge — it showed up first as a muddy
  // drop shadow under the card. Undo it here, with a reciprocal table so the
  // divide is not per-pixel.
  const INV = new Float32Array(256);
  for (let a = 1; a < 256; a++) INV[a] = 255 / a;
  const px = W * H;
  const buf = Buffer.allocUnsafe(px * 4), b32 = new Uint32Array(buf.buffer, buf.byteOffset, px);
  // --frames a b: only frames a (included) to b (excluded) of this render, at the very same
  // times as a whole one (FROM + i / FPS): build.sh draws a layer in several pieces at once
  const n = Math.round((TO - FROM) * FPS);
  const FR = argv.indexOf("--frames");
  const first = FR < 0 ? 0 : Math.max(0, +argv[FR + 1]), last = FR < 0 ? n : Math.min(n, +argv[FR + 2]);
  const out = process.stdout;
  // --fingerprint: the piece drawn dry (fingerprint.mjs), its fingerprint printed, nothing painted
  if (FP.on) {
    FP.inFrame = true;
    for (let i = first; i < last; i++) drawFrame(FROM + i / FPS);
    FP.inFrame = false;
    out.write(`${fingerprint()}\n`);
    process.exit(0);
  }
  const t0 = Date.now();
  for (let i = first; i < last; i++) {
    drawFrame(FROM + i / FPS);
    // An opaque pixel is the same premultiplied or not, an empty one is 0,0,0,0: the frame is copied
    // whole, then only the partly transparent pixels are divided by their alpha, read 4 bytes at a
    // time (the same bytes as a pixel-by-pixel pass, 6.5 → ~1.5 ms a frame, 2026-10-09)
    buf.set(canvas.data());
    for (let j = 0; j < px; j++) {
      const v = b32[j], a = v >>> 24;
      if (a === 255) continue;
      if (a === 0) { if (v !== 0) b32[j] = 0; continue; }
      const o = j << 2, k = INV[a];
      const r = buf[o] * k, g = buf[o + 1] * k, b = buf[o + 2] * k;
      buf[o] = r > 255 ? 255 : r; buf[o + 1] = g > 255 ? 255 : g; buf[o + 2] = b > 255 ? 255 : b;
    }
    if (!out.write(buf)) await new Promise(r => out.once("drain", r));
    if (FR < 0 && i % 900 === 0) console.error(`  ${i}/${n} t=${(FROM + i / FPS).toFixed(1)}s ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  console.error(`rendered (${LAYER}): ${last - first} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
