#!/usr/bin/env node
// NORMALISE A BRAND LOGO INTO THE CHIP SET.
//
//   node logo.mjs --in <file> --name <slug> [--size 512] [--radius 0.2237]
//                 [--bg auto|#RRGGBB] [--inset 0]
//
// `chips()` draws app icons that come out from behind the speaker's shoulders,
// and what matters about them is UNIFORMITY before anything else: the real logos,
// in good quality, all the same size, square, with the same rounded corners.
// Three marks next to each other with three different corner radii read as three
// screenshots, not as a set.
//
// So the set is one shape: a square of the brand's own colour, `size` px a side,
// corners at `radius` of the side (0.2237 — Apple's own figure for an app icon),
// with the mark centred and occupying about 45-60 % of the side. Measured on the
// three that shipped: gmail 60×45 %, linkedin 45×44 %, both centred to ±0.005.
//
// A source that is ALREADY a square on its brand colour (most brand kits ship
// one) needs nothing but the scale and the corner: pass it straight through.
// `--inset` re-composes instead — it crops to the mark's own bounds and re-lays
// it on the ground at that fraction of the side, for a source whose mark is
// off-centre or floating in too much air.
import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "./scene.mjs";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const IN = arg("--in"), NAME = arg("--name");
if (!IN || !NAME) { console.error("usage: logo.mjs --in <file> --name <slug> [--size 512] [--radius 0.2237] [--inset 0]"); process.exit(1); }
const SIZE = Number(arg("--size", 512)), RADIUS = Number(arg("--radius", 0.2237));
const INSET = Number(arg("--inset", 0));
const OUT = path.resolve(fileURLToPath(new URL("../../../assets/logos/", import.meta.url)), `${NAME}.png`);

const img = await loadImage(path.resolve(IN));
const c = createCanvas(SIZE, SIZE), ctx = c.getContext("2d");

// the ground: sampled from the source's own corner, so the chip is the brand's
// colour and not a picked one
const probe = createCanvas(img.width, img.height).getContext("2d");
probe.drawImage(img, 0, 0);
const p = probe.getImageData(Math.round(img.width * 0.02), Math.round(img.height * 0.02), 1, 1).data;
const BG = arg("--bg", "auto") === "auto" ? `rgb(${p[0]},${p[1]},${p[2]})` : arg("--bg");

// the corner, cut once, into the alpha — every chip in the set gets this exact
// arc or they stop reading as a set
const r = RADIUS * SIZE;
ctx.beginPath();
ctx.moveTo(r, 0);
ctx.arcTo(SIZE, 0, SIZE, SIZE, r); ctx.arcTo(SIZE, SIZE, 0, SIZE, r);
ctx.arcTo(0, SIZE, 0, 0, r);       ctx.arcTo(0, 0, SIZE, 0, r);
ctx.closePath();
ctx.save(); ctx.clip();
ctx.fillStyle = BG; ctx.fillRect(0, 0, SIZE, SIZE);

if (INSET > 0) {
  // re-compose: find the mark's own bounds against the ground, then centre it
  const d = probe.getImageData(0, 0, img.width, img.height).data;
  let ax = img.width, ay = img.height, bx = 0, by = 0;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const i = (y * img.width + x) * 4;
    if (d[i + 3] < 128) continue;
    if (Math.abs(d[i] - p[0]) + Math.abs(d[i + 1] - p[1]) + Math.abs(d[i + 2] - p[2]) > 90) {
      if (x < ax) ax = x; if (x > bx) bx = x; if (y < ay) ay = y; if (y > by) by = y;
    }
  }
  const mw = bx - ax + 1, mh = by - ay + 1, k = (SIZE * INSET) / Math.max(mw, mh);
  ctx.drawImage(img, ax, ay, mw, mh, (SIZE - mw * k) / 2, (SIZE - mh * k) / 2, mw * k, mh * k);
  console.log(`mark re-composed: ${mw}×${mh} of the source → ${(100 * INSET).toFixed(0)} % of the side, centred`);
} else {
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
}
ctx.restore();

fs.writeFileSync(OUT, c.toBuffer("image/png"));
console.log(`${OUT} — ${SIZE}×${SIZE}, ground ${BG}, corner ${(RADIUS * SIZE).toFixed(0)} px (${RADIUS} of the side)`);
