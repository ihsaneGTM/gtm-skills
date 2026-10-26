// THE HANDWRITTEN FAMILY — notes on paper, pencil strokes, tape, a felt marker.
//
// The second visual language of the landscape intro, next to the kinetic
// lockups of titles.mjs. Same contract (a beat is { id, from, to, layer, draw }),
// same units (fractions of the frame for positions, 1080p pixels for sizes,
// scaled by K = frame.w / 1920), same under-layer trick (the matte puts the
// speaker in FRONT of anything drawn here), and one addition: a beat can expose
// `cues()` — the sound of its own drawing — so the pencil is heard exactly as long
// as the line is being drawn. edl.mjs splices those into sfxCues().
//
// Everything that looks hand-made IS generated as a hand would make it: a line is
// a cubic through two jittered controls (rough.js's idea, re-done here so the
// randomness is SEEDED per shape — a stroke that re-rolled its wobble every frame
// would flicker), a circle overshoots its start by a sixth of a turn and closes
// slightly inside, a rectangle's corners overshoot, pencil pressure breathes along
// the stroke, and text is revealed glyph by glyph with a wipe that follows the pen.
//
//   note({ from, to, x, y, align, lines: [ row(t, hand("If you've", 78)), … ],
//          paper: { grid: "quad", tape: ["tl", "tr"] }, frame })
//   strokes({ from, to, items: [{ t, kind: "arrow", from: [0.60, 0.5], to: [0.42, 0.3], style: "marker" }] })
//   sheet({ from, to, at, exit: "tear", children: [lockup({...}).draw] })
import fs from "node:fs";
import { C, clamp01, easeOutCubic, easeInOutCubic, easeOutQuint, spring, lerp, seg, roundRect, createCanvas, loadImage } from "./scene.mjs";
import { TYPE, fontFor, measureLine, runText } from "./titles.mjs";

// --- tokens -------------------------------------------------------------------
export const INK = {
  graphite: "#26282E",      // the pencil, pressed
  pencil: "#3A3D45",        // the pencil, lighter passes
  red: "#D2452D",           // a red pen — the annotation colour of a reviewer
  blue: "#2E56C4",          // a ballpoint
  yellow: C.yellow,         // the house marker
  paper: "#F6F1E6", paperWhite: "#FBF9F4", paperDark: "#EEE7D7",
  gridBlue: "rgba(70,105,165,.24)", gridGrey: "rgba(45,48,56,.12)",
};
// dB relative to the voice, ON TOP of project.json sfxMasterDb — the same scale
// as edl.mjs. A pencil is a texture, and a texture is far more salient than its
// loudness says (the scroll riffle lesson), so it sits ~5 dB under a `tap`.
export const HAND_LEVELS = {
  pencil: -24, marker: -22, highlight: -23, paperIn: -22, paperOut: -26, tape: -21,
  tap: -21, sheetIn: -18, sheetOut: -19, sticker: -20, scribble: -22, eraser: -23,
  // the other pens (sfx.mjs): a softer graphite, a thin fineliner, a waxy crayon, chalk
  graphite: -25, fineliner: -26, crayon: -23, chalk: -24,
  // the STOP-MOTION paper (stepFps > 0): a sticker landing, each later pose of its settle
  // (−3 dB a pose), a felt-tip chunk of a mark. MEASURED by subtraction on the GTM OS short
  // (sfxMasterDb −15, bed 15 LU under the speaker): −22/−28/−25 put the landings 11 dB under voice +
  // music (a touch hot), the ticks 31 dB under (gone) and the felt 13 dB under (loud for a
  // texture); these land them at about 13 dB under, clicks peaking 6 dB under, and 17
  // (the felt was then low-passed to be SOFT, which cost it 10 dB — hence −19).
  mallet: -24, poseTick: -20, felt: -19,
};

// --- seeded randomness ----------------------------------------------------------
export function rng(seed) {
  let s = (Math.imul(seed | 0, 2654435761) + 1013904223) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// --- polylines --------------------------------------------------------------------
export function plLength(pl) {
  let L = 0;
  for (let i = 1; i < pl.length; i++) L += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
  return L;
}
export function plPartial(pl, k) {
  if (k >= 1) return pl;
  if (k <= 0) return [];
  let target = plLength(pl) * k;
  const out = [pl[0]];
  for (let i = 1; i < pl.length; i++) {
    const d = Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
    if (d >= target) {
      const u = d > 0 ? target / d : 0;
      out.push([lerp(pl[i - 1][0], pl[i][0], u), lerp(pl[i - 1][1], pl[i][1], u)]);
      return out;
    }
    target -= d; out.push(pl[i]);
  }
  return out;
}

// --- rough geometry ---------------------------------------------------------------
// A straight stroke as a hand makes it: the ends land a little off, the middle
// bows. `r` is the roughness (1 = a careful hand), the wobble grows a little
// with the length, so a short tick stays crisp and a long arrow breathes.
export function roughLine(p0, p1, R, r = 1, K = 1) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const j = () => R() * 2 - 1;
  const o = r * K * Math.min(2.4, 0.5 + L / (240 * K));
  const a = [p0[0] + j() * o * 0.4, p0[1] + j() * o * 0.4], b = [p1[0] + j() * o * 0.4, p1[1] + j() * o * 0.4];
  const c1 = [p0[0] + dx * 0.28 + nx * j() * o * 1.6, p0[1] + dy * 0.28 + ny * j() * o * 1.6];
  const c2 = [p0[0] + dx * 0.72 + nx * j() * o * 1.6, p0[1] + dy * 0.72 + ny * j() * o * 1.6];
  const n = Math.max(6, Math.ceil(L / (7 * K))), out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    out.push([v * v * v * a[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * b[0],
              v * v * v * a[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * b[1]]);
  }
  return out;
}
// A smooth curve through the points (a quadratic when there are three, a
// Catmull-Rom otherwise), sampled and given a low-frequency wobble along its
// normal — roughening each little sample as a segment would make it jagged.
export function roughCurve(points, R, r = 1, K = 1) {
  const P = points;
  const smooth = [];
  if (P.length === 3) {
    const c = [2 * P[1][0] - (P[0][0] + P[2][0]) / 2, 2 * P[1][1] - (P[0][1] + P[2][1]) / 2];
    for (let i = 0; i <= 48; i++) { const u = i / 48, v = 1 - u; smooth.push([v * v * P[0][0] + 2 * v * u * c[0] + u * u * P[2][0], v * v * P[0][1] + 2 * v * u * c[1] + u * u * P[2][1]]); }
  } else {
    for (let s = 0; s < P.length - 1; s++) {
      const p0 = P[Math.max(0, s - 1)], p1 = P[s], p2 = P[s + 1], p3 = P[Math.min(P.length - 1, s + 2)];
      for (let i = 0; i < 16; i++) {
        const u = i / 16, u2 = u * u, u3 = u2 * u;
        smooth.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
                     0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
      }
    }
    smooth.push(P[P.length - 1]);
  }
  const f1 = 1.1 + R() * 1.4, f2 = 2.6 + R() * 2.2, ph1 = R() * 6.28, ph2 = R() * 6.28, amp = r * K * 1.8;
  const out = [];
  for (let i = 0; i < smooth.length; i++) {
    const u = i / (smooth.length - 1);
    const a = smooth[Math.max(0, i - 1)], b = smooth[Math.min(smooth.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const w = Math.sin(u * 6.283 * f1 + ph1) * 0.6 + Math.sin(u * 6.283 * f2 + ph2) * 0.4;
    out.push([smooth[i][0] + (-dy / L) * amp * w, smooth[i][1] + (dx / L) * amp * w]);
  }
  return out;
}
// An ellipse drawn in one motion: starts top-left like a right hand does,
// overshoots its start by `overshoot` of a turn and closes a little inside.
export function roughEllipse(cx, cy, rx, ry, R, { overshoot = 0.16, r = 1, K = 1, start } = {}) {
  const n = 80, pts = [];
  const a0 = start ?? (-Math.PI * 0.62 + (R() - 0.5) * 0.5);
  const total = Math.PI * 2 * (1 + overshoot);
  const f1 = 1 + R() * 1.5, f2 = 2.5 + R() * 2, p1 = R() * 6.28, p2 = R() * 6.28;
  const amp = r * K * 1.6 + Math.min(rx, ry) * 0.012 * r;
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = a0 + total * u;
    const w = Math.sin(u * 6.283 * f1 + p1) * 0.6 + Math.sin(u * 6.283 * f2 + p2) * 0.4;
    const past = u * (1 + overshoot) - 1;
    const drift = past > 0 ? -past * 0.09 * Math.min(rx, ry) : 0;
    pts.push([cx + Math.cos(a) * (rx + amp * w + drift), cy + Math.sin(a) * (ry + amp * w + drift)]);
  }
  return pts;
}
// A rectangle as four strokes whose corners overshoot a few pixels.
export function roughRect(x, y, w, h, R, r = 1, K = 1) {
  const ov = () => (3 + R() * 7) * K;
  const segs = [[[x, y], [x + w, y]], [[x + w, y], [x + w, y + h]], [[x + w, y + h], [x, y + h]], [[x, y + h], [x, y]]];
  return segs.map(([a, b]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, o = ov();
    return roughLine([a[0] - ux * o * 0.3, a[1] - uy * o * 0.3], [b[0] + ux * o, b[1] + uy * o], R, r, K);
  });
}
// An arrow: the shaft (straight, or bent by `bend` × its length), then the head
// drawn as one motion — in to the tip and out — the way a hand does it.
export function arrowStrokes(from, to, R, { bend = 0, r = 1, K = 1, head = null } = {}) {
  const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const shaft = Math.abs(bend) > 0.001
    ? roughCurve([from, [from[0] + dx * 0.5 + nx * bend * L, from[1] + dy * 0.5 + ny * bend * L], to], R, r, K)
    : roughLine(from, to, R, r, K);
  const n = shaft.length, p = shaft[n - 1], q = shaft[Math.max(0, n - 5)];
  const ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
  const hl = head ?? Math.min(70 * K, Math.max(24 * K, L * 0.16)), spread = 0.48 + R() * 0.12;
  const h1 = [p[0] - Math.cos(ang - spread) * hl, p[1] - Math.sin(ang - spread) * hl];
  const h2 = [p[0] - Math.cos(ang + spread) * hl, p[1] - Math.sin(ang + spread) * hl];
  const headPl = roughLine(h1, p, R, r * 0.7, K).concat(roughLine(p, h2, R, r * 0.7, K).slice(1));
  return [shaft, headPl];
}
export function checkStrokes(cx, cy, s, R, r = 1, K = 1) {
  return [roughLine([cx - s * 0.42, cy + s * 0.02], [cx - s * 0.1, cy + s * 0.36], R, r, K)
    .concat(roughLine([cx - s * 0.1, cy + s * 0.36], [cx + s * 0.5, cy - s * 0.42], R, r, K).slice(1))];
}
export function crossStrokes(cx, cy, s, R, r = 1, K = 1) {
  return [roughLine([cx - s * 0.4, cy - s * 0.4], [cx + s * 0.4, cy + s * 0.4], R, r, K),
          roughLine([cx + s * 0.4, cy - s * 0.4], [cx - s * 0.4, cy + s * 0.4], R, r, K)];
}
// Hatching to cross something out: a fast zigzag over the rectangle.
export function scribbleStrokes(x, y, w, h, R, { r = 1, K = 1, pitch = 26 } = {}) {
  // back and forth ACROSS the lines, descending — a hand crossing text out
  const pts = [];
  const n = Math.max(3, Math.round(h / (pitch * K)));
  for (let i = 0; i <= n; i++) {
    const py = y + (i / n) * h + (R() - 0.5) * 8 * K;
    pts.push([i % 2 ? x + w + (R() - 0.5) * w * 0.12 : x + (R() - 0.5) * w * 0.12, py]);
  }
  return [roughCurve(pts, R, r * 1.6, K)];
}

// --- stroking -----------------------------------------------------------------------
// A pencil's width BREATHES (pressure) and its grain comes from the wobble; a
// marker is flat, opaque, round-capped; a highlighter is a wide translucent marker.
export function drawStroke(ctx, pl, { color = INK.graphite, width = 4, alpha = 1, style = "pencil", K = 1, seed = 1 } = {}) {
  if (!pl || pl.length < 2) return;
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = color;
  ctx.globalAlpha *= alpha * (style === "highlight" ? 0.62 : style === "pencil" ? 0.92 : style === "chalk" ? 0.88 : 0.96);
  if (style === "pencil" || style === "chalk") {
    // pressure: the width breathes by ±25 % on a thin line and only ±7 % on a
    // wide one — chunked width changes on a 16 px stroke read as knots, not grain.
    // Chalk breathes more (±32 %): it crumbles where a pencil glides.
    const R = rng(seed), wide = width * K > 7;
    const v = wide ? 0.07 : style === "chalk" ? 0.32 : 0.25;
    const chunks = Math.max(1, Math.floor(pl.length / (wide ? 14 : 5)));
    for (let c = 0; c < chunks; c++) {
      const i0 = Math.floor(c * (pl.length - 1) / chunks);
      const i1 = Math.min(pl.length - 1, Math.floor((c + 1) * (pl.length - 1) / chunks) + 1);
      ctx.lineWidth = width * K * (1 - v + R() * 2 * v);
      ctx.beginPath(); ctx.moveTo(pl[i0][0], pl[i0][1]);
      for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(pl[i][0], pl[i][1]);
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = width * K;
    ctx.beginPath(); ctx.moveTo(pl[0][0], pl[0][1]);
    for (let i = 1; i < pl.length; i++) ctx.lineTo(pl[i][0], pl[i][1]);
    ctx.stroke();
  }
  ctx.restore();
}
// A shape is a list of strokes drawn one after another; `prog` in [0,1] is how far
// the pen has travelled over their total length — so a longer shape takes longer
// at the same pen speed, unless the caller fixes its duration.
export function drawShape(ctx, shape, prog) {
  if (prog <= 0) return;
  const lens = shape.strokes.map(plLength), total = lens.reduce((a, b) => a + b, 0) || 1;
  let reach = Math.min(1, prog) * total;
  shape.strokes.forEach((pl, i) => {
    if (reach <= 0.001) return;
    const k = Math.min(1, reach / (lens[i] || 1));
    drawStroke(ctx, k >= 1 ? pl : plPartial(pl, k), { ...shape, seed: (shape.seed ?? 1) + i * 7 });
    reach -= lens[i];
  });
}

// --- writing ------------------------------------------------------------------------
const ADV = new Map();
function advances(ctx, font, text) {
  const key = font + "|" + text;
  if (ADV.has(key)) return ADV.get(key);
  ctx.save(); ctx.font = font;
  const a = []; let prev = 0;
  for (let i = 1; i <= text.length; i++) { const w = ctx.measureText(text.slice(0, i)).width; a.push(w - prev); prev = w; }
  ctx.restore();
  ADV.set(key, a);
  return a;
}
const pxOf = font => parseFloat((font.match(/(\d+(?:\.\d+)?)px/) || [0, 40])[1]);
// The pen's schedule for a string: the time (seconds from the row's onset) at
// which glyph i STARTS. A space is half a glyph — the pen lifts and moves.
export function penSchedule(text, dt) {
  const starts = []; let acc = 0;
  for (let i = 0; i < text.length; i++) { starts.push(acc); acc += text[i] === " " ? dt * 0.5 : dt; }
  return { starts, total: acc };
}
// Glyph-by-glyph reveal. `gi(i)` is glyph i's own progress in [0,1]: a wipe from
// its left edge follows the pen, and once complete the clip opens a little to
// the sides so a swash that overhangs its advance is not cut. Each glyph also
// carries a seeded rotation and baseline offset of its own — the irregularity a
// font cannot provide because it repeats its letters exactly.
export function writeText(ctx, text, x, y, font, color, gi, { jitter = 1, K = 1, seed = 1, halo = 0, shadow = 0 } = {}) {
  const adv = advances(ctx, font, text), size = pxOf(font), R = rng(seed);
  ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  let cx = x;
  for (let i = 0; i < text.length; i++) {
    const rot = (R() - 0.5) * 2 * 1.1 * jitter * Math.PI / 180, dy = (R() - 0.5) * 2 * 1.4 * K * jitter;
    const g = gi(i), a = adv[i];
    if (g > 0.001 && text[i] !== " ") {
      ctx.save();
      const left = cx - size * 0.2, top = y - size * 1.12, h = size * 1.6;
      const w = g >= 1 ? a + size * 0.42 : a * g + size * 0.2;
      ctx.beginPath(); ctx.rect(left, top, w, h); ctx.clip();
      const px = cx + a / 2, py = y - size * 0.35;
      ctx.translate(px, py + dy); ctx.rotate(rot); ctx.translate(-px, -py);
      if (halo > 0) { ctx.shadowColor = `rgba(255,255,255,${halo})`; ctx.shadowBlur = 18 * K; }
      else if (shadow > 0) { ctx.shadowColor = `rgba(0,0,0,${shadow})`; ctx.shadowBlur = 22 * K; ctx.shadowOffsetY = 8 * K; }
      ctx.fillText(text[i], cx, y);
      ctx.restore();
    }
    cx += a;
  }
  ctx.restore();
}

// --- paper --------------------------------------------------------------------------
let GRAIN = null;
export function paperGrain() { return grain(); }
function grain() {
  if (GRAIN) return GRAIN;
  const s = 256, c = createCanvas(s, s), x = c.getContext("2d"), R = rng(77), img = x.createImageData(s, s);
  for (let i = 0; i < s * s; i++) { const v = 236 + (R() - 0.5) * 34; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  GRAIN = c;
  return c;
}
// A sheet: cream, grained, ruled. `edge: "torn"` gives the bottom a torn edge.
// Draw it with the ctx already rotated if the sheet is to sit askew, so whatever
// is written on it turns with it.
//
// A sheet at rest is the same picture frame after frame, and painting it costs ~106 ms a
// frame at 1080x1920 (its blurred shadow 48, the grain 50): three quarters of a layer with a
// paper plate. So when it is drawn twice with the same settings, straight (no transform, full
// opacity, normal blending, no clip: `cache: false` says there is one), the second time paints
// it once into a picture kept for the next frames (4 ms a frame). Moving, turning, fading or
// torn, it is painted as before; every frame comes out the same, pixel for pixel (framemd5
// on three projects, 2026-10-08).
const PAPER_CACHE = new Map(), PAPER_SEEN = new Set();
export function drawPaper(ctx, opts) {
  const m = ctx.getTransform();
  const still = m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0
    && ctx.globalAlpha === 1 && (opts.alpha ?? 1) === 1 && ctx.globalCompositeOperation === "source-over";
  if (!still || opts.cache === false) return paintPaper(ctx, opts);
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const key = `${W}x${H}|${JSON.stringify(opts)}`;
  let pic = PAPER_CACHE.get(key);
  if (!pic) {
    if (!PAPER_SEEN.has(key)) { if (PAPER_SEEN.size > 64) PAPER_SEEN.clear(); PAPER_SEEN.add(key); return paintPaper(ctx, opts); }
    pic = createCanvas(W, H);
    paintPaper(pic.getContext("2d"), opts);
    if (PAPER_CACHE.size >= 4) PAPER_CACHE.delete(PAPER_CACHE.keys().next().value);   // 8 MB each
    PAPER_CACHE.set(key, pic);
  }
  ctx.drawImage(pic, 0, 0);
}
function paintPaper(ctx, { x, y, w, h, grid = "quad", tone = INK.paper, gridColor = INK.gridBlue, spacing = 44, K = 1, shadow = 1, edge = "cut", seed = 3, alpha = 1, margin = false, rim = true }) {
  ctx.save(); ctx.globalAlpha *= alpha;
  const path = () => {
    ctx.beginPath();
    if (edge === "torn") {
      const R = rng(seed);
      ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - 10 * K);
      let px = x + w;
      while (px > x) { px -= (12 + R() * 24) * K; ctx.lineTo(Math.max(x, px), y + h - (2 + R() * 16) * K); }
      ctx.closePath();
    } else ctx.rect(x, y, w, h);
  };
  if (shadow > 0) { ctx.save(); ctx.shadowColor = `rgba(0,0,0,${0.34 * shadow})`; ctx.shadowBlur = 44 * K * shadow; ctx.shadowOffsetY = 18 * K * shadow; path(); ctx.fillStyle = tone; ctx.fill(); ctx.restore(); }
  else { path(); ctx.fillStyle = tone; ctx.fill(); }
  ctx.save(); path(); ctx.clip();
  ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha *= 0.7;
  ctx.fillStyle = ctx.createPattern(grain(), "repeat"); ctx.fillRect(x, y, w, h); ctx.restore();
  const sp = spacing * K;
  ctx.strokeStyle = gridColor; ctx.lineWidth = Math.max(1, 1.3 * K);
  if (grid === "quad" || grid === "lines")
    for (let gy = y + sp * 0.5; gy < y + h; gy += sp) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); }
  if (grid === "quad")
    for (let gx = x + sp * 0.5; gx < x + w; gx += sp) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); }
  if (grid === "dots") {
    ctx.fillStyle = gridColor;
    for (let gy = y + sp * 0.5; gy < y + h; gy += sp) for (let gx = x + sp * 0.5; gx < x + w; gx += sp) { ctx.beginPath(); ctx.arc(gx, gy, 1.7 * K, 0, 7); ctx.fill(); }
  }
  if (margin) { ctx.strokeStyle = "rgba(214,84,70,.5)"; ctx.lineWidth = 2 * K; ctx.beginPath(); ctx.moveTo(x + 72 * K, y); ctx.lineTo(x + 72 * K, y + h); ctx.stroke(); }
  ctx.restore();
  if (rim) { path(); ctx.strokeStyle = "rgba(70,58,34,.16)"; ctx.lineWidth = 1.5 * K; ctx.stroke(); }
  ctx.restore();
}
// A strip of masking tape, translucent, with torn ends.
export function drawTape(ctx, cx, cy, { len = 150, wid = 40, rot = 0, K = 1, alpha = 1, seed = 5 } = {}) {
  const R = rng(seed);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.rotate(rot);
  const L = len * K, Wd = wid * K;
  ctx.shadowColor = "rgba(0,0,0,.2)"; ctx.shadowBlur = 8 * K; ctx.shadowOffsetY = 3 * K;
  ctx.fillStyle = "rgba(236,222,176,.74)";
  ctx.beginPath();
  ctx.moveTo(-L / 2, -Wd / 2); ctx.lineTo(L / 2, -Wd / 2); ctx.lineTo(L / 2 - R() * 7 * K, -Wd * 0.1); ctx.lineTo(L / 2 - R() * 3 * K, Wd / 2);
  ctx.lineTo(-L / 2, Wd / 2); ctx.lineTo(-L / 2 + R() * 7 * K, Wd * 0.05); ctx.closePath(); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(-L / 2, -Wd / 2, L, Wd * 0.2);
  ctx.restore();
}
// The PATCH: a soft-edged piece of ruled paper behind a block, with no card edge —
// the wall itself turning into paper where the speaker writes. Cached per geometry.
const PATCHES = new Map();
export function drawGridPatch(ctx, cx, cy, rx, ry, { K = 1, alpha = 1, spacing = 44, color = "rgba(45,48,56,.20)", tint = 0.16, key = "", fill = null } = {}) {
  const w = Math.ceil(rx * 2), h = Math.ceil(ry * 2), id = `${key}|${w}x${h}|${spacing}|${tint}|${fill ?? ""}`;
  let off = PATCHES.get(id);
  if (!off) {
    off = createCanvas(w, h);
    const o = off.getContext("2d");
    // `fill` overrides the cream: a slate patch under chalk is "rgba(43,46,51,.85)"
    o.fillStyle = fill ?? `rgba(246,241,230,${tint})`; o.fillRect(0, 0, w, h);
    const sp = spacing * K;
    o.strokeStyle = color; o.lineWidth = Math.max(1, 1.3 * K);
    for (let gy = (h / 2) % sp; gy < h; gy += sp) { o.beginPath(); o.moveTo(0, gy); o.lineTo(w, gy); o.stroke(); }
    for (let gx = (w / 2) % sp; gx < w; gx += sp) { o.beginPath(); o.moveTo(gx, 0); o.lineTo(gx, h); o.stroke(); }
    // the fade: a radial mask that keeps the centre and lets the edges go
    o.globalCompositeOperation = "destination-in";
    const g = o.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(rx, ry));
    g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.55, "rgba(0,0,0,.9)"); g.addColorStop(1, "rgba(0,0,0,0)");
    o.save(); o.translate(w / 2, h / 2); o.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); o.translate(-w / 2, -h / 2);
    o.fillStyle = g; o.fillRect(-w, -h, w * 3, h * 3); o.restore();
    PATCHES.set(id, off);
  }
  ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(off, cx - rx, cy - ry); ctx.restore();
}

// ======================================================================================
// THE BEATS
// ======================================================================================

const cornerOf = (k, x, y, w, h) => ({
  tl: [x + 26, y + 6], tr: [x + w - 26, y + 6], bl: [x + 26, y + h - 6], br: [x + w - 26, y + h - 6],
  t: [x + w / 2, y + 4], b: [x + w / 2, y + h - 4],
}[k]);
const tapeRot = (k, R) => ({ tl: -0.55, tr: 0.55, bl: 0.55, br: -0.55, t: 0.05, b: -0.05 }[k] + (R() - 0.5) * 0.25);

// A NOTE: a stacked block of handwriting, each row written on its onset, the hot
// word decorated once it is written. On a paper card (`paper`), on a soft patch of
// ruled wall (`patch`), or bare (neither). Exposes `spec` for fit.mjs and `cues()`
// for edl.mjs.
//
//   note({ id, from, to, x: 0.055, y: 0.14, align: "left", frame, layer: "under",
//     lines: [ row(0.02, hand("If you've", 78)), row(1.42, handBold("SaaS", 150, { hot: "circle" })) ],
//     paper: { grid: "quad", tape: ["tl", "tr"], rot: -0.02 } })
//
// A run: { text, k: "hand" | "handBold" | "handLight" | "sans" | "marker", size,
//          color, hot: "highlight" | "circle" | "underline" | "box", count }.
export function note({
  id = "note", from, to, x = 0.055, y = 0.14, align = "left", lines, frame = { w: 1920, h: 1080 },
  layer = "under", leading = 1.0, exit = 0.28, enter = 0.32, mutesCaptions = true,
  ink = INK.graphite, hotColor = null, hotStroke = INK.graphite, highlightColor = INK.yellow, style = "pencil",
  paper = null, patch = null, halo = 0, shadow = 0, jitter = 1, seed = hash(id), sound = true, charDur = null,
  shake = null,          // { at, amp: radians, dur }: the card slams when the word lands
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const R0 = rng(seed);
  const rot = paper ? (paper.rot ?? (R0() - 0.5) * 0.05) : 0;
  const tapeRots = (paper?.tape ?? []).map(k => tapeRot(k, R0));
  // the pen's schedule per row, fixed at construction: a row writes in the time
  // it has before the next one lands (72 % of it), between 22 and 50 ms a glyph
  const rows = lines.map((l, i) => {
    const text = l.runs.map(r => r.text).join("");
    const nextT = lines[i + 1]?.t ?? (to - exit - 0.25);
    const weight = [...text].reduce((n, ch) => n + (ch === " " ? 0.5 : 1), 0) || 1;
    const dt = charDur ?? Math.min(0.05, Math.max(0.022, (nextT - l.t) * 0.72 / weight));
    const sched = penSchedule(text, dt);
    // a counting run is not written, it rolls — so its ring or swipe waits for
    // the number to LAND, otherwise the pen circles a figure still changing
    let decoAt = l.t + sched.total + 0.075 + 0.03;
    for (const r of l.runs) if (r.count) decoAt = Math.max(decoAt, (r.t ?? r.count.t ?? l.t) + (r.count.dur ?? 0.6) + 0.03);
    return { ...l, text, dt, dg: 0.075, starts: sched.starts, writeDur: sched.total + 0.075, decoAt: +decoAt.toFixed(3) };
  });
  const decoDur = { highlight: 0.22, circle: 0.36, underline: 0.26, box: 0.34, check: 0.22 };
  const shapes = new Map();          // decoration geometry, generated once
  const beat = {
    id, from, to, mutesCaptions, layer,
    spec: { x, y, align, lines, frame, leading },
    cues() {
      if (!sound) return [];
      const c = [];
      const pen = style === "marker" ? "marker" : "pencil";
      if (paper) {
        // one cue per EVENT: the card landing, ONE tape rip for however many
        // strips (two rips a card, twelve cards, is a foley reel), the card leaving
        c.push({ t: from, kind: "paper_in", gain: HAND_LEVELS.paperIn });
        if ((paper.tape ?? []).length) c.push({ t: +(from + 0.16).toFixed(3), kind: "tape", gain: HAND_LEVELS.tape });
        c.push({ t: +(to - exit).toFixed(3), kind: "paper_out", gain: HAND_LEVELS.paperOut });
      }
      for (const r of rows) {
        c.push({ t: r.t, kind: `${pen}:${r.writeDur.toFixed(2)}:w`, gain: HAND_LEVELS[pen] });
        let off = 0;
        for (const run of r.runs) {
          if (run.hot) {
            const kind = run.hot === true ? "highlight" : run.hot;
            const hs = run.hotStyle ?? style;
            const pen2 = hs === "marker" ? "marker" : "pencil";
            c.push({ t: r.decoAt, kind: kind === "highlight" ? `marker:${decoDur.highlight}` : `${pen2}:${decoDur[kind]}`, gain: kind === "highlight" ? HAND_LEVELS.highlight : HAND_LEVELS[pen2] });
          }
          off += run.text.length;
        }
      }
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save();
      ctx.textBaseline = "alphabetic";
      const laid = rows.map(l => ({ ...l, ...measureLine(ctx, l, t) }));
      const blockW = Math.max(...laid.map(l => l.width));
      const ax = x * W, ay = y * H;
      let cursor = ay;
      const R = laid.map(l => { const baseline = cursor + l.size * 0.80; cursor += l.size * leading; return { ...l, baseline }; });
      const blockH = cursor - ay;
      const bx = align === "right" ? ax - blockW : align === "center" ? ax - blockW / 2 : ax;
      const avg = laid.reduce((n, l) => n + l.size, 0) / laid.length;
      const inK = easeOutQuint(seg(t, from, from + enter));
      // --- the ground -------------------------------------------------------
      let card = null;
      if (paper) {
        const padX = (paper.padX ?? 0.6) * avg, padT = (paper.padT ?? 0.55) * avg, padB = (paper.padB ?? 0.75) * avg;
        card = { x: bx - padX, y: ay - padT, w: blockW + padX * 2, h: blockH + padT + padB };
        const ccx = card.x + card.w / 2, ccy = card.y + card.h / 2;
        const sc = lerp(1.05, 1, inK), lift = lerp(1, 1.03, 1 - outK);
        let shk = 0, shs = 1;
        if (shake && t >= shake.at) {
          const u = clamp01((t - shake.at) / (shake.dur ?? 0.4));
          shk = (shake.amp ?? 0.02) * Math.sin(u * Math.PI * 5) * (1 - u) * (1 - u);
          shs = 1 + 0.05 * Math.sin(u * Math.PI) * (1 - u);
        }
        ctx.translate(ccx, ccy); ctx.rotate(rot + (1 - inK) * 0.05 + (1 - outK) * -0.03 + shk); ctx.scale(sc * lift * shs, sc * lift * shs); ctx.translate(-ccx, -ccy);
        ctx.globalAlpha = clamp01(inK * 1.6) * outK;
        drawPaper(ctx, { ...card, grid: paper.grid ?? "quad", tone: paper.tone ?? INK.paper, gridColor: paper.gridColor ?? INK.gridBlue,
          spacing: paper.spacing ?? 44, K, shadow: paper.shadow ?? 1, edge: paper.edge ?? "cut", seed, margin: !!paper.margin });
        (paper.tape ?? []).forEach((k, i) => {
          const tk = easeOutCubic(seg(t, from + 0.16 + i * 0.11, from + 0.28 + i * 0.11));
          if (tk <= 0) return;
          const [tx, ty] = cornerOf(k, card.x, card.y, card.w, card.h);
          ctx.save(); ctx.translate(tx, ty); const s = lerp(1.35, 1, tk); ctx.scale(s, s); ctx.translate(-tx, -ty);
          drawTape(ctx, tx, ty, { K, rot: tapeRots[i], alpha: tk, seed: seed + i, len: paper.tapeLen ?? 150, wid: paper.tapeWid ?? 40 });
          ctx.restore();
        });
      } else {
        ctx.globalAlpha = outK;
        if (patch) {
          const firstIn = clamp01((t - rows[0].t + 0.1) / 0.45);
          drawGridPatch(ctx, bx + blockW / 2, ay + blockH * 0.55, blockW * 0.78 + (patch.pad ?? 240) * K, blockH * 0.7 + (patch.pad ?? 240) * 0.75 * K,
            { K, alpha: easeOutCubic(firstIn), spacing: patch.spacing ?? 44, color: patch.color ?? INK.gridGrey, tint: patch.tint ?? 0.16, key: id });
        }
      }
      // --- the writing --------------------------------------------------------
      for (let ri = 0; ri < R.length; ri++) {
        const row = R[ri];
        if (t < row.t) continue;
        const rowX = align === "right" ? bx + blockW - row.width : align === "center" ? bx + (blockW - row.width) / 2 : bx;
        let cx = rowX, ci = 0;
        const rowEnd = row.decoAt;
        for (let pi = 0; pi < row.parts.length; pi++) {
          const r = row.parts[pi];
          const font = fontFor(r);
          const color = r.color ?? (r.hot ? (hotColor ?? ink) : ink);
          const off = ci;
          const gi = r.count
            ? (() => 1)                                  // a counter arrives whole: its digits roll, they are not written
            : (i => clamp01((t - row.t - row.starts[off + i]) / row.dg));
          const hot = r.hot === true ? "highlight" : r.hot;
          const skey = `${ri}:${pi}`;
          if (hot) {
            let sh = shapes.get(skey);
            if (!sh) {
              const Rs = rng(seed + ri * 31 + pi * 7);
              const w = r.width, s = r.size;
              const hs = r.hotStyle ?? style, hc = r.stroke ?? hotStroke, mk = hs === "marker";
              if (hot === "highlight") sh = { strokes: [roughLine([cx - 10 * K, row.baseline - s * 0.30], [cx + w + 12 * K, row.baseline - s * 0.28], Rs, 0.8, K)], style: "highlight", color: r.highlight ?? highlightColor, width: s * 0.72 / K, seed };
              else if (hot === "circle") sh = { strokes: [roughEllipse(cx + w / 2, row.baseline - s * 0.30, w / 2 + s * 0.26, s * 0.62, Rs, { K, r: 1 })], style: hs, color: hc, width: mk ? 9 : 4.6, seed };
              else if (hot === "underline") sh = { strokes: [roughLine([cx - 4 * K, row.baseline + s * 0.14], [cx + w + 6 * K, row.baseline + s * 0.16], Rs, 1, K), roughLine([cx + 6 * K, row.baseline + s * 0.25], [cx + w + 2 * K, row.baseline + s * 0.26], Rs, 1, K)], style: hs, color: hc, width: mk ? 8 : 4.4, seed };
              else if (hot === "box") sh = { strokes: roughRect(cx - s * 0.18, row.baseline - s * 0.86, w + s * 0.36, s * 1.12, Rs, 1, K), style: hs, color: hc, width: mk ? 8 : 4.2, seed };
              else if (hot === "check") { const side = align === "right" ? cx - s * 0.5 : cx + w + s * 0.5; sh = { strokes: checkStrokes(side, row.baseline - s * 0.32, s * 0.72, Rs, 1, K), style: hs, color: hc, width: mk ? 9 : 4.6, seed }; }
              shapes.set(skey, sh);
            }
            const dk = seg(t, rowEnd, rowEnd + decoDur[hot]);
            if (hot === "highlight") drawShape(ctx, { ...sh, K }, dk);   // under the glyphs
          }
          writeText(ctx, r.text, cx, row.baseline, font, color, gi, { jitter, K, seed: seed + ri * 13 + pi, halo, shadow });
          if (hot && hot !== "highlight") drawShape(ctx, { ...shapes.get(skey), K }, seg(t, rowEnd, rowEnd + decoDur[hot]));
          cx += r.width + (r.box || 0); ci += r.text.length;
        }
      }
      ctx.restore();
    },
  };
  return beat;
}

// FREE STROKES: arrows, circles, lines, boxes, ticks, crosses, scribbles — each
// drawn from its own onset over `dur` seconds, from and to points as fractions.
//
//   strokes({ id, from, to, frame, layer: "under", items: [
//     { t, kind: "arrow", from: [0.62, 0.52], to: [0.44, 0.30], bend: 0.12, style: "marker", color: INK.red, width: 9, dur: 0.4 },
//     { t, kind: "circle", center: [0.3, 0.3], rx: 0.08, ry: 0.06 },
//     { t, kind: "underline", from: [..], to: [..], passes: 2 },
//   ]})
// `stepFps` draws them in STOP-MOTION, on the same shared clock as stickers(): the
// line grows in held chunks, one per pose, instead of a continuous stroke. Give a mark
// a longer `dur` than usual in this mode — at 8 poses a second a 0.26 s tick is two
// chunks, which reads as a pop, not as a hand drawing.
export function strokes({ id = "strokes", from, to, items = [], frame = { w: 1920, h: 1080 }, layer = "under", exit = 0.22, mutesCaptions = false, seed = hash(id), sound = true, stepFps = 0 }) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const shapes = new Map();
  const px = p => [p[0] * W, p[1] * H];
  const build = (it, i) => {
    const R = rng(seed + i * 17);
    const style = it.style ?? "pencil", r = it.r ?? 1;
    const width = it.width ?? (style === "marker" ? 9 : style === "highlight" ? 34 : 4.4);
    const color = it.color ?? (style === "highlight" ? INK.yellow : INK.graphite);
    let strokesPl;
    switch (it.kind) {
      case "arrow": strokesPl = arrowStrokes(px(it.from), px(it.to), R, { bend: it.bend ?? 0, r, K, head: it.head ? it.head * K : null }); break;
      case "line": strokesPl = [roughLine(px(it.from), px(it.to), R, r, K)]; break;
      case "curve": strokesPl = [roughCurve(it.points.map(px), R, r, K)]; break;
      case "circle": { const [cx, cy] = px(it.center); strokesPl = [roughEllipse(cx, cy, it.rx * W, it.ry * H, R, { K, r, overshoot: it.overshoot ?? 0.16 })];
        if ((it.passes ?? 1) > 1) strokesPl.push(roughEllipse(cx, cy, it.rx * W * 0.985, it.ry * H * 0.985, R, { K, r, overshoot: 0.08, start: -Math.PI * 0.5 })); break; }
      case "box": { const [bx, by] = px([it.rect[0], it.rect[1]]); strokesPl = roughRect(bx, by, it.rect[2] * W, it.rect[3] * H, R, r, K); break; }
      case "underline": { strokesPl = [roughLine(px(it.from), px(it.to), R, r, K)];
        if ((it.passes ?? 1) > 1) { const a = px(it.from), b = px(it.to); strokesPl.push(roughLine([a[0] + 8 * K, a[1] + 11 * K], [b[0] - 4 * K, b[1] + 12 * K], R, r, K)); } break; }
      case "check": { const [cx, cy] = px(it.center); strokesPl = checkStrokes(cx, cy, (it.size ?? 60) * K, R, r, K); break; }
      case "cross": { const [cx, cy] = px(it.center); strokesPl = crossStrokes(cx, cy, (it.size ?? 60) * K, R, r, K); break; }
      case "scribble": { const [bx, by] = px([it.rect[0], it.rect[1]]); strokesPl = scribbleStrokes(bx, by, it.rect[2] * W, it.rect[3] * H, R, { r, K, pitch: it.pitch ?? 26 }); break; }
      default: throw new Error(`unknown stroke: ${it.kind}`);
    }
    const total = strokesPl.reduce((n, pl) => n + plLength(pl), 0);
    // pen speed: ~1500 px/s at 1080p for a confident hand, unless the plan fixes dur
    const dur = it.dur ?? Math.min(0.9, Math.max(0.18, total / (1500 * K)));
    return { strokes: strokesPl, style, color, width, seed: seed + i, dur };
  };
  return {
    id, from, to, mutesCaptions, layer,
    cues() {
      if (!sound) return [];
      return items.flatMap((it, i) => {
        if (it.sound === false) return [];
        const sh = shapes.get(i) ?? (shapes.set(i, build(it, i)), shapes.get(i));
        if (stepFps > 0) {
          // STOP-MOTION: the picture grows in poses, the SOUND follows the hand. A mark (an
          // arrow, its head included, a tick, a ring) is drawn in one go, so it is ONE felt-tip
          // glide, from the pose where it starts to the pose where it is complete. A chunk per
          // pose made one arrow sound like a burst of little strokes, a rhythm the video does
          // not have (refused, 2026-10-02). Heard from the pose change, half a step before the
          // step, where stepClock rounds.
          const k0 = Math.ceil(it.t * stepFps - 1e-6), k1 = Math.max(k0, Math.ceil((it.t + sh.dur) * stepFps - 1e-6));
          return [{ t: +((k0 - 0.5) / stepFps).toFixed(3), kind: `felt:${((k1 - k0 + 0.8) / stepFps).toFixed(3)}`, gain: HAND_LEVELS.felt }];
        }
        const pen = sh.style === "marker" ? "marker" : sh.style === "highlight" ? "marker" : "pencil";
        return [{ t: it.t, kind: `${pen}:${sh.dur.toFixed(2)}`, gain: HAND_LEVELS[pen] }];
      });
    },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const tc = stepClock(t, stepFps);
      const outK = 1 - easeInOutCubic(seg(tc, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = outK;
      items.forEach((it, i) => {
        if (tc < it.t) return;
        if (it.until != null && t > it.until) return;
        let sh = shapes.get(i); if (!sh) { sh = build(it, i); shapes.set(i, sh); }
        const k = seg(tc, it.t, it.t + sh.dur);
        drawShape(ctx, { ...sh, K }, sh.strokes.length > 1 && sh.style !== "highlight" ? k : k);
      });
      ctx.restore();
    },
  };
}

// THE WALL BECOMES RULED PAPER — a full-frame grid on the under layer, its lines
// drawing in with a stagger (verticals sweep down, horizontals sweep right), plus
// an optional cream veil. Behind the speaker, never on them: the matte keeps the speaker in front.
export function gridWall({ id = "gridwall", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under", spacing = 44, color = INK.gridGrey, tint = 0.10, alpha = 1, enter = 0.7, exit = 0.4, mutesCaptions = false }) {
  const K = frame.w / 1920, W = frame.w, H = frame.h, sp = spacing * K;
  return {
    id, from, to, mutesCaptions, layer,
    cues() { return [{ t: at, kind: "pencil:0.55", gain: HAND_LEVELS.pencil - 4 }]; },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      const k = easeOutCubic(seg(t, at, at + enter));
      if (k <= 0 || outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = alpha * outK;
      if (tint > 0) { ctx.fillStyle = `rgba(246,241,230,${tint * k})`; ctx.fillRect(0, 0, W, H); }
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, 1.4 * K);
      const nv = Math.ceil(W / sp), nh = Math.ceil(H / sp);
      for (let i = 0; i <= nv; i++) {
        const gx = i * sp + sp / 2, lk = clamp01((k * 1.35 - i / nv * 0.35) / 1);
        if (lk <= 0) continue;
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H * lk); ctx.stroke();
      }
      for (let j = 0; j <= nh; j++) {
        const gy = j * sp + sp / 2, lk = clamp01((k * 1.35 - j / nh * 0.35) / 1);
        if (lk <= 0) continue;
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W * lk, gy); ctx.stroke();
      }
      ctx.restore();
    },
  };
}

// A SCRIM UNDER THE CAPTION BAND — the only way a subtitle survives a bright
// cover. White glyphs on cream paper measure almost the same luma as the page,
// and the yellow accent word disappears entirely over a white app screenshot; the
// caption cannot be recoloured per beat (the accent colour is fixed), so the
// GROUND is darkened instead. Reads as the page falling into shadow, not as a bar.
// Goes on the OVER layer, AFTER the beat it protects (draw order = array order),
// and never mutes the line — that is the whole point.
//   scrim({ id, from, to, top: 0.72, alpha: 0.52 })   // paper
//   scrim({ id, from, to, top: 0.64, alpha: 0.70 })   // a white UI capture
export function scrim({ id = "scrim", from, to, frame = { w: 1920, h: 1080 }, layer = "over", top = 0.72, alpha = 0.52, fade = 0.20, color = "12,12,14" }) {
  const W = frame.w, H = frame.h;
  return {
    id, from, to, layer, mutesCaptions: false,
    cues() { return []; },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const k = Math.min(clamp01((t - from) / fade), clamp01((to - t) / fade));
      if (k <= 0.01) return;
      const y0 = top * H;
      const g = ctx.createLinearGradient(0, y0, 0, H);
      g.addColorStop(0, `rgba(${color},0)`);
      g.addColorStop(0.55, `rgba(${color},${(alpha * 0.55).toFixed(3)})`);
      g.addColorStop(1, `rgba(${color},${alpha})`);
      ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0); ctx.restore();
    },
  };
}

// A FULL-FRAME SHEET slid over the picture — a transition, or the ground of the
// series ident. `children` are drawers (ctx, t) called once the sheet has landed,
// in frame space. Exits: "up" (pulled away upward), "left", "tear" (a torn edge
// sweeps across and reveals the picture), "fade".
export function sheet({
  id = "sheet", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "over",
  enter = "up", exit = "tear", enterDur = 0.42, exitDur = 0.38, grid = "quad", tone = INK.paper, gridColor = INK.gridBlue,
  spacing = 44, rot = -0.018, children = [], mutesCaptions = true, seed = hash(id), sound = true, covered = false,
  alpha = 1,             // < 1 = TRACING PAPER: the speaker ghosts through the sheet
  inSound = null,        // override the landing sound kind (default sheet_in)
  hole = null,           // a stencil getter: the sheet is CUT OUT in the speaker's shape, the picture shows only through them
  silhouette = null,     // { stencil, color, at?, dur? }: the speaker's shape FILLED flat on the sheet — they become a paper cut-out
  cam = null, anchorY = 0.28,
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const exitAt = to - exitDur;
  const stencilAt = (st, t) => { const s = typeof st === "function" ? st() : st; return s && s.at(t); };
  return {
    id, from, to, mutesCaptions, layer,
    exitAt,
    cues() {
      if (!sound) return [];
      const c = [];
      if (!covered) c.push({ t: at, kind: inSound ?? "sheet_in", gain: HAND_LEVELS.sheetIn });
      c.push({ t: +exitAt.toFixed(3), kind: exit === "tear" ? "tear" : "sheet_out", gain: HAND_LEVELS.sheetOut });
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const inK = covered ? 1 : easeOutQuint(seg(t, at, at + enterDur));
      const ex = seg(t, exitAt, to);
      if (inK <= 0 || ex >= 1) return;
      ctx.save();
      const m = 0.08;                                        // the sheet is bigger than the frame
      const sx = -W * m / 2, sy = -H * m / 2, sw = W * (1 + m), sh = H * (1 + m);
      const cx = W / 2, cy = H / 2;
      let dx = 0, dy = 0, a = rot * (1 - inK) * 2 + rot * 0;
      if (enter === "up") dy = (1 - inK) * H * 1.15;
      else if (enter === "right") dx = (1 - inK) * W * 1.15;
      else if (enter === "drop") { const s = lerp(1.12, 1, inK); ctx.globalAlpha = clamp01(inK * 1.8); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); }
      if (exit === "up") dy -= easeInOutCubic(ex) * H * 1.2;
      else if (exit === "left") dx -= easeInOutCubic(ex) * W * 1.2;
      else if (exit === "fade") ctx.globalAlpha *= 1 - ex;
      ctx.translate(dx, dy);
      ctx.translate(cx, cy); ctx.rotate(rot * (1 - inK) * 3 + (exit === "up" || exit === "left" ? -easeInOutCubic(ex) * 0.06 : 0)); ctx.translate(-cx, -cy);
      if (exit === "tear" && ex > 0) {
        // a torn edge travelling right: what is left of it is gone
        const R = rng(seed + 9), edge = -W * 0.06 + easeInOutCubic(ex) * W * 1.16;
        ctx.beginPath(); ctx.moveTo(W * 1.2, -H); ctx.lineTo(W * 1.2, H * 2);
        let yy = H * 1.1; ctx.lineTo(edge + 60 * K, yy);
        while (yy > -H * 0.1) { yy -= (22 + R() * 30) * K; ctx.lineTo(edge + (R() - 0.3) * 70 * K, yy); }
        ctx.closePath(); ctx.clip();
        // the torn lip: a slightly lighter, thicker edge with its own shadow
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 30 * K; ctx.shadowOffsetX = -14 * K; ctx.restore();
      }
      // torn, the sheet is clipped: painted as before, the kept picture would anti-alias the edge differently
      drawPaper(ctx, { x: sx, y: sy, w: sw, h: sh, grid, tone, gridColor, spacing, K, shadow: 1.3, seed, alpha, ...(exit === "tear" && ex > 0 ? { cache: false } : {}) });
      if (inK > 0.97) for (const ch of children) (typeof ch === "function" ? ch : ch.draw)(ctx, t);
      // the speaker's shape, in FRAME space (the sheet may still be sliding; the speaker is not)
      if ((silhouette || hole) && inK > 0.5) {
        const img = stencilAt(silhouette?.stencil ?? hole, t);
        if (img) {
          const M = camMap(cam, anchorY, W, H, t);
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (silhouette) {
            const k = silhouette.at != null ? easeOutCubic(seg(t, silhouette.at, silhouette.at + (silhouette.dur ?? 0.3))) : 1;
            if (k > 0) {
              const off = createCanvas(W, H), o = off.getContext("2d");
              o.drawImage(img, M.dx, M.dy, W * M.z, H * M.z);
              o.globalCompositeOperation = "source-in"; o.fillStyle = silhouette.color ?? INK.graphite; o.fillRect(0, 0, W, H);
              ctx.globalAlpha = k; ctx.drawImage(off, 0, 0);
            }
          } else {
            ctx.globalCompositeOperation = "destination-out";
            ctx.drawImage(img, M.dx, M.dy, W * M.z, H * M.z);
          }
          ctx.restore();
        }
      }
      ctx.restore();
    },
  };
}

// THE SERIES LOCKUP — "the new" handwritten small, "METHOD" large, a marker swipe
// or a pencil rule under it. Returns { draw, cues, dur }: a drawer for a sheet or a
// standalone beat (`asBeat`), with the pen schedule so the jingle can be laid
// against it.
//
//   lockup({ at, cx: 0.5, cy: 0.5, frame, variant: "pencil" | "marker" | "brand" })
export function lockup({
  at, cx = 0.5, cy = 0.5, frame = { w: 1920, h: 1080 }, variant = "marker", seed = 41,
  small = "the new", big = "METHOD", smallSize = 150, bigSize = 320, ink = INK.graphite, tag = null,
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const smallFont = TYPE.hand(Math.round(smallSize * K));
  const bigFont = variant === "brand" ? TYPE.sans(Math.round(bigSize * K)) : TYPE.handBold(Math.round(bigSize * K));
  const sSched = penSchedule(small, 0.055), bSched = penSchedule(big, 0.075);
  const tSmall = at, tBig = at + sSched.total + 0.18, tRule = tBig + bSched.total + 0.14;
  const ruleDur = 0.26, dur = tRule + ruleDur - at + 0.1;
  let geom = null, rule = null;
  const R = rng(seed);
  const drawer = (ctx, t) => {
    if (t < at) return;
    ctx.save(); ctx.textBaseline = "alphabetic";
    if (!geom) {
      ctx.font = bigFont; const bw = ctx.measureText(big).width;
      ctx.font = smallFont; const swd = ctx.measureText(small).width;
      const X = cx * W, Y = cy * H;
      const bigBase = Y + bigSize * K * 0.30, bigX = X - bw / 2;
      const smallBase = bigBase - bigSize * K * 0.78 - smallSize * K * 0.15, smallX = bigX + 6 * K;
      geom = { bw, swd, bigX, bigBase, smallX, smallBase };
      const y0 = bigBase + bigSize * K * 0.12;
      rule = variant === "pencil"
        ? { strokes: [roughLine([bigX - 6 * K, y0], [bigX + bw + 14 * K, y0 + 3 * K], R, 1, K), roughLine([bigX + 10 * K, y0 + 13 * K], [bigX + bw + 4 * K, y0 + 15 * K], R, 1, K)], style: "pencil", color: ink, width: 5, seed }
        : { strokes: [roughLine([bigX - 18 * K, bigBase - bigSize * K * 0.30], [bigX + bw + 24 * K, bigBase - bigSize * K * 0.27], R, 0.8, K)], style: "highlight", color: INK.yellow, width: bigSize * 0.68, seed };
    }
    const g = geom;
    // the marker swipe goes UNDER the big word, the pencil rule over
    if (variant !== "pencil") drawShape(ctx, { ...rule, K }, seg(t, tRule, tRule + ruleDur));
    ctx.save(); ctx.translate(g.smallX, g.smallBase); ctx.rotate(-0.045); ctx.translate(-g.smallX, -g.smallBase);
    writeText(ctx, small, g.smallX, g.smallBase, smallFont, ink, i => clamp01((t - tSmall - sSched.starts[i]) / 0.08), { K, seed: seed + 1, jitter: 1.2 });
    ctx.restore();
    writeText(ctx, big, g.bigX, g.bigBase, bigFont, ink, i => clamp01((t - tBig - bSched.starts[i]) / 0.09), { K, seed: seed + 2, jitter: variant === "brand" ? 0 : 0.7 });
    if (variant === "pencil") drawShape(ctx, { ...rule, K }, seg(t, tRule, tRule + ruleDur));
    if (tag) {
      const tk = easeOutCubic(seg(t, tRule + ruleDur, tRule + ruleDur + 0.3));
      if (tk > 0) {
        ctx.save(); ctx.globalAlpha *= tk;
        const f = TYPE.hand(Math.round(48 * K)); ctx.font = f; ctx.fillStyle = INK.red; ctx.textAlign = "right";
        ctx.translate(g.bigX + g.bw + 20 * K, g.bigBase + bigSize * K * 0.42); ctx.rotate(-0.06);
        ctx.fillText(tag, 0, 0); ctx.restore();
      }
    }
    ctx.restore();
  };
  return {
    draw: drawer, dur, tSmall, tBig, tRule,
    cues() {
      const pen = variant === "brand" ? "marker" : "pencil";
      return [
        { t: +tSmall.toFixed(3), kind: `pencil:${(sSched.total + 0.08).toFixed(2)}:w`, gain: HAND_LEVELS.pencil },
        { t: +tBig.toFixed(3), kind: `${pen}:${(bSched.total + 0.09).toFixed(2)}:w`, gain: HAND_LEVELS[pen] },
        { t: +tRule.toFixed(3), kind: variant === "pencil" ? `pencil:${ruleDur}` : `marker:${ruleDur}`, gain: variant === "pencil" ? HAND_LEVELS.pencil : HAND_LEVELS.highlight },
      ];
    },
    asBeat({ id = "lockup", from, to, layer = "over", exit = 0.3, mutesCaptions = true } = {}) {
      return { id, from, to, layer, mutesCaptions, cues: () => this.cues(),
        draw(ctx, t) { if (t < from || t > to) return; const outK = 1 - easeInOutCubic(seg(t, to - exit, to)); if (outK <= 0.005) return; ctx.save(); ctx.globalAlpha = outK; drawer(ctx, t); ctx.restore(); } };
    },
  };
}

// STICKERS: the real app icons as die-cut stickers — a white border, a shadow, a
// slap-on entrance (scale 1.3 → 1 with the tilt settling), each on the word that
// names it. Same placement rules as chips(): free x/y, a corner behind the speaker.
//
// STOP-MOTION (`stepFps`, 2026-09-29): elements on the paper move a little as they
// enter, but not smoothly, at a low frame rate. The entrance is sampled on a clock SHARED by everything on
// the page (`stepFps` poses a second: cut-outs moved by hand between two exposures),
// each pose held and none faded; the sticker lands, overshoots once and settles over
// `settle` seconds, every pose a little off, the way a hand never puts it back exactly.
// Poses sit on the NEAREST step, so an entrance is at most half a step off its word.
export const stepClock = (t, fps) => (fps > 0 ? Math.round(t * fps) / fps : t);
// In stop-motion a sticker SOUNDS on its poses: its landing is a `mallet` — pitched,
// the stickers of one gesture climbing an arpeggio (`it.pitch` in Hz, or ARP by
// order: C D G C, which sits in the major AND the minor of C — measured as the key of
// the bed it was made for, and a sus chord clashes with neither mode) — and each later
// pose of its settle a paper tick, 3 dB softer every pose. Poses are shared, so one
// sound per step whatever moves on it, and a landing wins over a tick.
// `land` replaces the mallet with a supplied sound, the same on every sticker:
// { kind: "sample:…", gain, align } (align = where its transient sits in the file).
export const ARP = [523.25, 587.33, 783.99, 1046.5];
export function stickers({ id = "stickers", from, to, items = [], size = 168, frame = { w: 1920, h: 1080 }, layer = "under", exit = 0.28, border = 0.09, mutesCaptions = false, sound = true,
  stepFps = 0, settle = 0.62, seed = hash(id), land = null }) {
  const K = frame.w / 1920, S = size * K, W = frame.w, H = frame.h;
  return {
    id, from, to, mutesCaptions, layer,
    cues() {
      if (!sound) return [];
      if (!(stepFps > 0)) return items.map(it => ({ t: it.t ?? from, kind: "sticker", gain: HAND_LEVELS.sticker }));
      const steps = new Map();
      items.forEach((it, i) => {
        const t0 = it.t ?? from, k0 = Math.ceil(t0 * stepFps - 1e-6), k1 = Math.ceil((t0 + settle) * stepFps - 1e-6);
        for (let k = k0; k <= k1; k++) {
          const at = +((k - 0.5) / stepFps).toFixed(3), cur = steps.get(k);
          if (k === k0) {
            steps.set(k, land ? { t: at, kind: land.kind, gain: land.gain ?? HAND_LEVELS.mallet, align: land.align ?? 0, land: true }
              : { t: at, kind: `mallet:${(it.pitch ?? ARP[i % ARP.length]).toFixed(2)}`, gain: HAND_LEVELS.mallet, land: true });
            continue;
          }
          const g = HAND_LEVELS.poseTick - 3 * (k - k0 - 1);
          if (!cur || (!cur.land && cur.gain < g)) steps.set(k, { t: at, kind: `ptick:${k % 4}`, gain: g });
        }
      });
      return [...steps.values()].map(({ land, ...c }) => c);
    },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const tc = stepClock(t, stepFps);
      const outK = 1 - easeInOutCubic(seg(tc, to - exit, to));
      if (outK <= 0.005) return;
      items.forEach((it, i) => {
        const t0 = it.t ?? from;
        const img = typeof it.img === "function" ? it.img() : it.img;
        const cx0 = it.x * W, cy0 = it.y * H;
        let cx = cx0, cy = cy0, rot, s, alpha;
        if (stepFps > 0) {
          if (tc < t0 - 1e-6) return;
          const u = clamp01((tc - t0) / settle);
          const o = 1 - spring(u, 2.6, 4.0);            // 1 → 0, one overshoot the other way
          const R = rng(seed + i * 131 + Math.round(tc * stepFps)), j = 1 - u;
          cx += (R() - 0.5) * 0.05 * S * j;
          cy += -0.30 * S * o + (R() - 0.5) * 0.05 * S * j;
          rot = ((it.rot ?? 0) + 11 * o + (R() - 0.5) * 3.2 * j) * Math.PI / 180;
          s = S * (1 + 0.22 * o); alpha = outK;
        } else {
          const k = easeOutCubic(clamp01((t - t0) / 0.26));
          if (k <= 0.005) return;
          rot = ((it.rot ?? 0) + (1 - k) * 9) * Math.PI / 180; s = S * lerp(1.32, 1, k); alpha = clamp01(k * 2) * outK;
        }
        const h = s / 2, b = s * border;
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(rot);
        ctx.shadowColor = "rgba(0,0,0,.36)"; ctx.shadowBlur = 34 * K; ctx.shadowOffsetY = 14 * K;
        roundRect(ctx, -h - b, -h - b, s + 2 * b, s + 2 * b, s * 0.2237 + b); ctx.fillStyle = "#FFFFFF"; ctx.fill();
        ctx.shadowColor = "transparent";
        if (img) ctx.drawImage(img, -h, -h, s, s);
        ctx.restore();
      });
    },
  };
}

// A PRINTED SCREENSHOT taped up behind the speaker: white paper, the capture (or a clip,
// `img: t => CLIP.at(t)`) fitted inside with a small margin, two strips of tape,
// slightly askew. `annotate` adds a red-pen circle inside the picture at a time.
export function screenTaped({
  id = "shot", from, to, at = from, x = 0.055, y = 0.12, w = 0.475, ratio = 0.60, frame = { w: 1920, h: 1080 }, layer = "under",
  img = null, rot = -0.022, tape = ["tl", "tr"], enter = 0.36, exit = 0.30, mutesCaptions = false, annotate = null, seed = hash(id), sound = true, margin = 14,
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const PW = w * W, PH = PW * ratio, PX = x * W, PY = y * H, M = margin * K;
  const R0 = rng(seed);
  const tapeRots = tape.map(k => tapeRot(k, R0));
  let ring = null;
  return {
    id, from, to, mutesCaptions, layer,
    cues() {
      if (!sound) return [];
      const c = [{ t: at, kind: "paper_in", gain: HAND_LEVELS.paperIn }];
      if (tape.length) c.push({ t: +(at + 0.18).toFixed(3), kind: "tape", gain: HAND_LEVELS.tape });
      if (annotate) c.push({ t: annotate.t, kind: `marker:${(annotate.dur ?? 0.36).toFixed(2)}`, gain: HAND_LEVELS.marker });
      c.push({ t: +(to - exit).toFixed(3), kind: "paper_out", gain: HAND_LEVELS.paperOut });
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const k = easeOutQuint(clamp01((t - at) / enter)), outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (k <= 0.005 || outK <= 0.005) return;
      ctx.save();
      const ccx = PX + PW / 2 + M, ccy = PY + PH / 2 + M;
      ctx.translate(ccx, ccy + (1 - k) * 40 * K); ctx.rotate(rot + (1 - k) * 0.06); ctx.scale(lerp(1.06, 1, k), lerp(1.06, 1, k)); ctx.translate(-ccx, -ccy);
      ctx.globalAlpha = clamp01(k * 1.5) * outK;
      drawPaper(ctx, { x: PX, y: PY, w: PW + 2 * M, h: PH + 2 * M, grid: "none", tone: INK.paperWhite, K, shadow: 1.1, seed });
      const image = typeof img === "function" ? img(t) : img;
      if (image) {
        ctx.save(); ctx.beginPath(); ctx.rect(PX + M, PY + M, PW, PH); ctx.clip();
        const s = Math.max(PW / image.width, PH / image.height), iw = image.width * s, ih = image.height * s;
        ctx.drawImage(image, PX + M + (PW - iw) / 2, PY + M + (PH - ih) / 2, iw, ih);
        ctx.restore();
      } else { ctx.fillStyle = "#E8E4DA"; ctx.fillRect(PX + M, PY + M, PW, PH); }
      if (annotate && t >= annotate.t) {
        if (!ring) { const Rr = rng(seed + 3); const [ax, ay, aw, ah] = annotate.rect; ring = { strokes: [roughEllipse(PX + M + ax * PW, PY + M + ay * PH, aw * PW / 2 + 10 * K, ah * PH / 2 + 8 * K, Rr, { K, r: 1.1, overshoot: 0.2 })], style: "marker", color: annotate.color ?? INK.red, width: annotate.width ?? 7, seed }; }
        drawShape(ctx, { ...ring, K }, seg(t, annotate.t, annotate.t + (annotate.dur ?? 0.36)));
      }
      tape.forEach((kk, i) => {
        const tk = easeOutCubic(seg(t, at + 0.18 + i * 0.1, at + 0.30 + i * 0.1));
        if (tk <= 0) return;
        const [tx, ty] = cornerOf(kk, PX, PY, PW + 2 * M, PH + 2 * M);
        ctx.save(); ctx.translate(tx, ty); const sc = lerp(1.35, 1, tk); ctx.scale(sc, sc); ctx.translate(-tx, -ty);
        drawTape(ctx, tx, ty, { K, rot: tapeRots[i], alpha: tk, seed: seed + i });
        ctx.restore();
      });
      ctx.restore();
    },
  };
}

// ONE GIANT HAND-DRAWN GLYPH — the zero of the payoff as a marker would draw it: an
// ellipse in one motion, a second pass slightly inside, four fifths of the frame
// high, behind the speaker. The handwritten answer to hero().
export function bigZero({ id = "zero", from, to, at = from, cx = 0.27, cy = 0.50, rx = 0.19, ry = 0.40, frame = { w: 1920, h: 1080 }, layer = "under", style = "marker", color = INK.yellow, width = 30, passes = 2, dur = 0.55, exit = 0.34, mutesCaptions = false, seed = hash(id), sound = true }) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  let sh = null;
  return {
    id, from, to, mutesCaptions, layer,
    cues() { return sound ? [{ t: at, kind: `${style === "marker" ? "marker" : "pencil"}:${dur.toFixed(2)}`, gain: HAND_LEVELS[style === "marker" ? "marker" : "pencil"] + 2 }] : []; },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005 || t < at) return;
      if (!sh) {
        const R = rng(seed);
        const s = [roughEllipse(cx * W, cy * H, rx * W, ry * H, R, { K, r: 1.4, overshoot: 0.14 })];
        if (passes > 1) s.push(roughEllipse(cx * W, cy * H, rx * W * 0.965, ry * H * 0.97, R, { K, r: 1.4, overshoot: 0.06, start: -Math.PI * 0.55 }));
        sh = { strokes: s, style, color, width, seed };
      }
      ctx.save(); ctx.globalAlpha = outK;
      if (style === "marker") { ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 40 * K; ctx.shadowOffsetY = 16 * K; }
      drawShape(ctx, { ...sh, K }, seg(t, at, at + dur));
      ctx.restore();
    },
  };
}

// --- the speaker's own outline, from a small stencil of the matte ------------------
// traceMask(img) → polylines (in the stencil's pixel space) following the alpha
// boundary: Moore-neighbour tracing, then a Douglas-Peucker simplification. The run
// along the frame's bottom edge is dropped — it is the crop, not the speaker.
export function traceMask(img, { threshold = 100, eps = 1.4 } = {}) {
  const w = img.width, h = img.height, c = createCanvas(w, h), x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, w, h).data;
  const on = (px, py) => px >= 0 && py >= 0 && px < w && py < h && d[(py * w + px) * 4 + 3] > threshold;
  let start = null;
  outer: for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) if (on(px, py)) { start = [px, py]; break outer; }
  if (!start) return [];
  const N8 = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
  const pts = [start]; let cur = start, back = 0;   // start looking from the west
  for (let guard = 0; guard < w * h; guard++) {
    let found = null;
    for (let i = 0; i < 8; i++) { const k = (back + i) % 8, nx = cur[0] + N8[k][0], ny = cur[1] + N8[k][1]; if (on(nx, ny)) { found = [nx, ny]; back = (k + 6) % 8; break; } }
    if (!found) break;
    if (found[0] === start[0] && found[1] === start[1] && pts.length > 8) break;
    pts.push(found); cur = found;
  }
  // split where the contour runs along the frame's bottom edge
  const runs = []; let run = [];
  for (const p of pts) { if (p[1] >= h - 2) { if (run.length > 6) runs.push(run); run = []; } else run.push(p); }
  if (run.length > 6) runs.push(run);
  const rdp = (pl) => {
    if (pl.length < 3) return pl;
    let idx = 0, dmax = 0; const a = pl[0], b = pl[pl.length - 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
    for (let i = 1; i < pl.length - 1; i++) { const p = pl[i]; const dd = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / L; if (dd > dmax) { dmax = dd; idx = i; } }
    if (dmax > eps) return rdp(pl.slice(0, idx + 1)).slice(0, -1).concat(rdp(pl.slice(idx)));
    return [a, b];
  };
  return runs.map(rdp);
}

// THE SKETCH OF THE SPEAKER: a pencil tracing their outline (from a stencil frame, scaled to
// the frame), drawn over `dur`; and optionally a white die-cut RIM around them for the
// beat (`rim: px`), drawn from the stencil frames on the under layer so their own
// picture covers the inside and only the border shows. `stencil` is a loadClip()
// over assets/mask-small (RGBA, alpha = the matte).
// `cam` is the camera (t → { z, ax }) of speaker.mjs, with `anchorY`: the stencil
// is the matte BEFORE the camera, the overlay is drawn AFTER it, so a tracing
// made under a 1.2 zoom lands 20 % too small and to one side without it. (The
// first Studio render's white rim floated to the speaker's right for exactly that reason.)
export function camMap(cam, anchorY, W, H, t) {
  if (!cam) return { z: 1, dx: 0, dy: 0 };
  const { z, ax } = cam(t);
  return { z, dx: -ax * (W - W / z) * z, dy: -(anchorY ?? 0.28) * (H - H / z) * z };
}
export function sketch({ id = "sketch", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "over", stencil = null, frameAt = at, dur = 0.8, style = "pencil", color = INK.graphite, width = 4.4, exit = 0.3, mutesCaptions = false, seed = hash(id), sound = true, offset = 0, fadeAt = null, fadeTo = 0.35, cam = null, anchorY = 0.28 }) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  let sh = null;
  return {
    id, from, to, mutesCaptions, layer,
    cues() { return sound ? [{ t: at, kind: `pencil:${dur.toFixed(2)}`, gain: HAND_LEVELS.pencil + 1 }] : []; },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      if (!sh) {
        // the stencil is a clip, or a GETTER of one (a plan loads it in load(),
        // after the beat was built)
        const st = typeof stencil === "function" ? stencil() : stencil;
        const img = st && st.at(frameAt);
        if (!img) return;
        const sx = W / img.width, sy = H / img.height, R = rng(seed);
        const M = camMap(cam, anchorY, W, H, frameAt);
        const runs = traceMask(img, { eps: 1.2 }).map(pl => pl.map(([px, py]) => [px * sx * M.z + M.dx, py * sy * M.z + M.dy]));
        // an offset pushes the line just outside the speaker, so a later frame's movement does not cross it
        const strokesPl = runs.map(pl => {
          const cx = pl.reduce((n, p) => n + p[0], 0) / pl.length, cy = pl.reduce((n, p) => n + p[1], 0) / pl.length;
          const moved = pl.map(([px, py]) => { const dx = px - cx, dy = py - cy, L = Math.hypot(dx, dy) || 1; return [px + dx / L * offset * K, py + dy / L * offset * K]; });
          return roughCurve(moved, R, 1.2, K);
        });
        sh = { strokes: strokesPl, style, color, width, seed };
      }
      const fade = fadeAt != null ? lerp(1, fadeTo, easeInOutCubic(seg(t, fadeAt, fadeAt + 0.35))) : 1;
      ctx.save(); ctx.globalAlpha = outK * fade;
      drawShape(ctx, { ...sh, K }, seg(t, at, at + dur));
      ctx.restore();
    },
  };
}
export function rim({ id = "rim", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under", stencil = null, px = 14, color = "#FFFFFF", enter = 0.25, exit = 0.3, mutesCaptions = false, cam = null, anchorY = 0.28 }) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  return {
    id, from, to, mutesCaptions, layer,
    cues() { return []; },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const st = typeof stencil === "function" ? stencil() : stencil;
      const img = st && st.at(t);
      if (!img) return;
      const k = easeOutCubic(seg(t, at, at + enter)), outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (k <= 0 || outK <= 0.005) return;
      // union of the stencil pushed in 12 directions = the silhouette grown by px
      const off = createCanvas(W, H), o = off.getContext("2d");
      const r = px * K * k;
      const M = camMap(cam, anchorY, W, H, t);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; o.drawImage(img, M.dx + Math.cos(a) * r, M.dy + Math.sin(a) * r, W * M.z, H * M.z); }
      o.globalCompositeOperation = "source-in"; o.fillStyle = color; o.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = outK; ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 30 * K; ctx.shadowOffsetY = 12 * K;
      ctx.drawImage(off, 0, 0); ctx.restore();
    },
  };
}

// Helpers for a plan: runs in the hand faces, the same shape as titles.mjs's.
export const hand = (text, size, extra = {}) => ({ text, k: "hand", size, ...extra });
export const handBold = (text, size, extra = {}) => ({ text, k: "handBold", size, ...extra });
export const handLight = (text, size, extra = {}) => ({ text, k: "handLight", size, ...extra });
// Collect the sound of every hand beat in a plan — edl.mjs splices this in.
export const cuesOf = beats => beats.flatMap(b => (typeof b.cues === "function" ? b.cues() : []));
