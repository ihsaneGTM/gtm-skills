#!/usr/bin/env node
// CALIBRATE fit.mjs ON THE REAL SPEAKER, from the matte.
//
//   node silhouette.mjs [--every 30] [--write]
//
// fit.mjs ships with a modelled silhouette (head 0.085 → shoulders 0.21 of the
// width, centred). That model is a guess about a seated speaker, and on the
// reference video it was **64 px pessimistic** at head height — which is not a
// harmless error in either direction: too wide and it refuses a size that fits,
// too narrow and it passes a row that lands on the speaker's shoulder. Either way a check
// that is wrong gets ignored, which is worse than no check.
//
// The matte is the speaker's actual outline, per frame, already retimed and WITHOUT the
// camera — exactly what fit.mjs needs, since it applies the zoom and anchor
// itself. This reads the envelope over the whole edited stretch (the WORST
// half-width at each height, so a gesture is included) and writes it into
// project.json as `silhouette` + `speakerX`.
//
// Run it after matte.mjs and before the first fit.mjs. Re-run it if the matte is
// rebuilt; the numbers are specific to one take.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CWD = process.cwd();
const SCENE = fileURLToPath(new URL("./scene.mjs", import.meta.url));
const { createCanvas, loadImage } = await import(SCENE);

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const EVERY = Number(arg("--every", 30));
const WRITE = argv.includes("--write");
// --all reads EVERY frame and writes matte/edges.json, the per-frame table
// fit.mjs uses to check each row against the envelope of ITS OWN WINDOW. A single
// global envelope is the worst frame of the whole intro applied everywhere, which
// refuses sizes that fit — the speaker's arm is not up during every beat.
const ALL = argv.includes("--all");

const MATTE = path.resolve(CWD, "matte");
if (!fs.existsSync(MATTE)) { console.error("matte/ missing; run matte.mjs first"); process.exit(1); }
const allFiles = fs.readdirSync(MATTE).filter(f => f.endsWith(".png")).sort();
const files = ALL ? allFiles : allFiles.filter((_, i) => i % EVERY === 0);
if (!files.length) { console.error("matte/ empty"); process.exit(1); }

const BANDS = [0.08, 0.12, 0.16, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50,
               0.55, 0.60, 0.65, 0.70, 0.80, 0.90];
const left = BANDS.map(() => 1), right = BANDS.map(() => 0);
const perFrame = [];
let W = 0, H = 0;
for (const f of files) {
  const img = await loadImage(path.join(MATTE, f));
  W = img.width; H = img.height;
  const c = createCanvas(W, H), ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const row = [];
  BANDS.forEach((yf, b) => {
    const y = Math.min(H - 1, Math.round(yf * H));
    const d = ctx.getImageData(0, y, W, 1).data;
    let l = -1, r = -1;
    for (let x = 0; x < W; x++) if (d[x * 4] > 127) { if (l < 0) l = x; r = x; }
    if (l >= 0) { left[b] = Math.min(left[b], l / W); right[b] = Math.max(right[b], r / W); }
    row.push(l < 0 ? 0 : +(l / W).toFixed(4), l < 0 ? 0 : +(r / W).toFixed(4));
  });
  if (ALL) perFrame.push(row);
  if (ALL && perFrame.length % 300 === 0) console.log(`  ${perFrame.length}/${files.length}`);
}
// the speaker's centre is the median of the band midpoints where they actually are
const mids = BANDS.map((_, b) => (left[b] + right[b]) / 2).filter((m, b) => right[b] > 0).sort((a, z) => a - z);
const speakerX = +(mids[mids.length >> 1] ?? 0.5).toFixed(3);
const sil = BANDS.map((yf, b) => right[b] === 0 ? null
  : [yf, +Math.max(speakerX - left[b], right[b] - speakerX).toFixed(3)]).filter(Boolean);

console.log(`${files.length} masks sampled (1 in ${EVERY}) · ${W}×${H} · centre ${speakerX}`);
console.log("  y      real half-width (widest envelope over the whole shot)");
for (const [y, hw] of sil) console.log(`  ${y.toFixed(2)}   ${hw.toFixed(3)}  ${"█".repeat(Math.round(hw * 90))}`);

if (!WRITE) { console.log("\n--write to write it into project.json"); process.exit(0); }
const pj = path.resolve(CWD, "project.json");
const P = JSON.parse(fs.readFileSync(pj, "utf8"));
P.speakerX = speakerX;
P.silhouette = sil;
fs.writeFileSync(pj, JSON.stringify(P, null, 2) + "\n");
console.log("\nproject.json: speakerX + silhouette written (global fallback)");
if (ALL) {
  const out = path.join(MATTE, "edges.json");
  fs.writeFileSync(out, JSON.stringify({ w: W, h: H, fps: P.fps ?? 30, bands: BANDS, frames: perFrame }));
  console.log(`matte/edges.json: ${perFrame.length} frames × ${BANDS.length} heights; fit.mjs will check each row against ITS OWN window`);
}
console.log("re-run fit.mjs");
