// HOW MUCH OF EACH WORD THE SPEAKER HIDES — the gate for a headline that goes BEHIND them.
//
//   node occlusion.mjs            # from the working directory, after matte.mjs
//   node occlusion.mjs --warn 0.18 --fail 0.30
//
// Big text at the top of the frame that sometimes passes behind the person
// (2026-09-29): a word the head covers is an effect while it still reads, and a
// typo once it does not — an Impact L whose foot is behind the hair reads as an I.
// The eye cannot be trusted on this from one frame (the speaker moves, the camera punches),
// so this measures it: every run of every `layer: "under"` headline is laid out
// exactly as headline.mjs draws it, and for each frame of its window (15 a second)
// the matte — through the SAME camera as the picture — is sampled under its glyph
// pixels. Reported: the worst share of the word the speaker covers, and when.
//
// Two limits, said rather than hidden: the pop-in scale of the first 0.26 s is not
// modelled (the word is measured at rest, which is what the viewer reads), and a
// run's rotation is ignored (a few degrees on a script word).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas, loadImage, camEase } from "./scene.mjs";
import { layoutHeadline } from "./headline.mjs";
import { zoneOfPx } from "./safezones.mjs";
import { fontFor } from "./titles.mjs";

const CWD = process.cwd();
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : Number(argv[i + 1]); };
const WARN = arg("--warn", 0.18), FAIL = arg("--fail", 0.30);
const P = JSON.parse(fs.readFileSync(path.resolve(CWD, "project.json"), "utf8"));
const E = await import(pathToFileURL(path.resolve(CWD, "edl.mjs")).href);
const PLAN = await import(pathToFileURL(path.resolve(CWD, "plan.mjs")).href);
const W = P.width, H = P.height, FPS = P.fps ?? 30, AY = P.anchorY ?? 0.34;
const S = 3;                                     // work at a third of the size
const w = Math.round(W / S), h = Math.round(H / S);
const MATTE = path.resolve(CWD, "matte");
if (!fs.existsSync(MATTE)) { console.error("matte/ missing; run matte.mjs first"); process.exit(1); }
const NM = fs.readdirSync(MATTE).filter(f => /^m\d{5}\.png$/.test(f)).length;

const steps = E.cameraSteps();
function cam(t) {
  let z = steps[0]?.[1] ?? 1, ax = steps[0]?.[3] ?? P.anchorX ?? 0.5;
  for (let i = 1; i < steps.length; i++) {
    const [ts, zs, r, a, e] = steps[i]; if (ts > t) break;
    const k = r > 0 ? camEase(e, Math.min(1, (t - ts) / r)) : 1;
    z = z + (zs - z) * k; if (a != null) ax = ax + (a - ax) * k;
  }
  return { z, ax };
}
const mc = createCanvas(w, h), mx = mc.getContext("2d");
// Every mask the words need is read ONCE: kept as one bit a pixel (is the speaker there), 29 KB a
// frame at 1080x1920. It used to be a 64-frame cache that every word of a long headline emptied
// for the next one, so the same PNGs were decoded again word after word (137 s on a 50 s short).
const cache = new Map();
const frameAt = t => Math.min(NM, Math.max(1, Math.round(t * FPS) + 1));
async function load(i) {
  const img = await loadImage(path.join(MATTE, `m${String(i).padStart(5, "0")}.png`));
  mx.clearRect(0, 0, w, h); mx.drawImage(img, 0, 0, w, h);
  const d = mx.getImageData(0, 0, w, h).data, g = new Uint8Array((w * h + 7) >> 3);
  for (let j = 0; j < w * h; j++) if (d[j * 4] > 127) g[j >> 3] |= 1 << (j & 7);
  cache.set(i, g);
}
async function matteAt(t) {
  const i = frameAt(t);
  if (!cache.has(i)) await load(i);
  return cache.get(i);
}
// The masks the words will be measured on, decoded four at once before the measure: the decode
// runs off the main thread, and one at a time the measure spent two thirds of its time waiting
// for it (2026-10-09)
async function prefetch(heads) {
  const need = new Set();
  for (const b of heads) for (const row of layoutHeadline(gx, b.spec)) for (const p of row.parts)
    for (let t = Math.max(b.from, p.t ?? row.t ?? b.from); t <= b.to; t += 1 / 15) need.add(frameAt(t));
  const ids = [...need].filter(i => !cache.has(i));
  let k = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (k < ids.length) await load(ids[k++]); }));
}

const gc = createCanvas(W, H), gx = gc.getContext("2d");
let bad = 0, warned = 0;
// THE FEED'S SAFE ZONES first (safezones.mjs), for every headline, on either layer: a line in a
// forbidden zone (the feed's account, caption and buttons are drawn there) fails, a line out of
// the safe area warns
let zbad = 0, zwarn = 0;
for (const b of (PLAN.BEATS ?? []).filter(b => b.kind === "headline" && b.spec)) {
  for (const row of layoutHeadline(gx, b.spec)) {
    const z = zoneOfPx({ x0: row.x0, x1: row.x1, y0: row.top, y1: row.y1 }, { w: W, h: H });
    if (z.zone === "safe") continue;
    const words = row.parts.map(p => p.text).join(" ");
    if (z.zone === "forbidden") { zbad++; console.log(`  ✗ ${b.id} « ${words} » in ${z.where.join(" and ")} (${(z.forbidden * 100).toFixed(0)} % of the line)`); }
    else { zwarn++; console.log(`  ⚠ ${b.id} « ${words} » ${(z.outside * 100).toFixed(0)} % out of the safe area (y ${(row.top / H).toFixed(3)}–${(row.y1 / H).toFixed(3)}, x ${(row.x0 / W).toFixed(3)}–${(row.x1 / W).toFixed(3)})`); }
  }
}
console.log(zbad ? `✗ ${zbad} line(s) in a forbidden zone of the feed: move them (anchor: "bottom" under the head, or smaller)\n` :
  zwarn ? `⚠ ${zwarn} line(s) partly out of the safe area: only where the framing forces it\n` : "✓ every headline inside the feed's safe area\n");
const heads = (PLAN.BEATS ?? []).filter(b => b.kind === "headline" && (b.layer ?? "over") === "under");
if (!heads.length) { console.log("no headline on the under layer; nothing passes behind the speaker"); process.exit(zbad ? 1 : 0); }
await prefetch(heads);
for (const b of heads) {
  const rows = layoutHeadline(gx, b.spec);
  const lines = [];
  for (const row of rows) for (const p of row.parts) {
    // the run's own glyph pixels, at rest, at a third of the size
    gx.clearRect(0, 0, W, H);
    gx.textBaseline = "alphabetic"; gx.font = fontFor(p); gx.fillStyle = "#fff";
    gx.fillText(p.text, row.x0 + p.x0, row.baseline);
    const x0 = Math.max(0, Math.floor(row.x0 + p.x0)), x1 = Math.min(W, Math.ceil(row.x0 + p.x0 + p.width));
    const y0 = Math.max(0, Math.floor(row.baseline - p.size)), y1 = Math.min(H, Math.ceil(row.baseline + p.size * 0.35));
    const d = gx.getImageData(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)).data;
    const px = [];
    for (let y = 0; y < y1 - y0; y += S) for (let x = 0; x < x1 - x0; x += S)
      if (d[((y * (x1 - x0)) + x) * 4 + 3] > 128) px.push([x0 + x, y0 + y]);
    const t0 = Math.max(b.from, p.t ?? row.t ?? b.from), t1 = b.to;
    let worst = 0, when = t0;
    for (let t = t0; t <= t1; t += 1 / 15) {
      const g = await matteAt(t), { z, ax } = cam(t);
      let hit = 0;
      for (const [X, Y] of px) {
        // output pixel -> the source pixel the camera put there (zoompan's crop)
        const sx = (ax * (W - W / z) + X / z) / S, sy = (AY * (H - H / z) + Y / z) / S;
        const ix = sx | 0, iy = sy | 0;
        if (ix >= 0 && iy >= 0 && ix < w && iy < h) { const j = iy * w + ix; if (g[j >> 3] >> (j & 7) & 1) hit++; }
      }
      const c = px.length ? hit / px.length : 0;
      if (c > worst) { worst = c; when = t; }
    }
    const tag = worst > FAIL ? "✗" : worst > WARN ? "⚠" : "✓";
    if (worst > FAIL) bad++; else if (worst > WARN) warned++;
    lines.push(`  ${tag} ${p.text.padEnd(14)} ${(worst * 100).toFixed(0).padStart(3)} % hidden at worst (t=${when.toFixed(2)} s)`);
  }
  console.log(`${b.id}  (${b.from.toFixed(2)}–${b.to.toFixed(2)} s)`);
  for (const l of lines) console.log(l);
}
console.log(bad ? `\n✗ ${bad} word(s) too hidden (> ${FAIL * 100} %); raise the block or shift it` :
  warned ? `\n⚠ ${warned} word(s) hidden between ${WARN * 100} and ${FAIL * 100} %; check them on the frame` :
  `\n✓ no word hidden more than ${WARN * 100} %`);
process.exit(bad || zbad ? 1 : 0);
