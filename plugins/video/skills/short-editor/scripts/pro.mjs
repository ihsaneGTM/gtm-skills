// THE POLISH OF THE EXPLAINER (style 4), brought to the vertical language (style 1): validated by
// Ihsane on 2026-10-05 (the Pipecorn sales-calls intro, v6): what made the explainer read as an After Effects edit, as small tools any
// figure of this plan can use.
//   · light and shade: a shadow in two layers under everything (a tight contact shade and a wide
//     soft one, falling down: the light is above), a glow in the element's own colour, a gloss on
//     the upper half and a rim lit from above, a pop of light behind what lands
//   · motion blur computed like a camera shutter: the average of up to 16 sub-frames over half a
//     frame (180°), never a gaussian smear
//   · the Motionix pack's light sounds, one per thing that appears, never on top of a big one
// The blurred silhouettes are computed once per shape and size and reused on every frame and
// sub-frame (a canvas shadow recomputed sixteen times a frame would cost the render).
// Used by figures.mjs, paperend.mjs and the Pipecorn generic (generic.mjs). The Motionix sounds
// (mx) are read from the project's assets/sfx-motionix/, copied there by init.sh.
import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "./scene.mjs";

// ── easing: the curves of an After Effects edit (the explainer's) ─────────────────────────
export const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);
export const seg = (t, a, d) => clamp01((t - a) / Math.max(1e-4, d));
export const lerp = (a, b, k) => a + (b - a) * k;
export const EASE = {
  linear: u => u,
  outCubic: u => 1 - Math.pow(1 - u, 3), inCubic: u => u * u * u,
  inOutCubic: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  outQuint: u => 1 - Math.pow(1 - u, 5),
  inOutQuint: u => (u < 0.5 ? 16 * u ** 5 : 1 - Math.pow(-2 * u + 2, 5) / 2),
  inExpo: u => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)),
  outExpo: u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  inOutExpo: u => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2),
  outBack: u => 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2),
  // a spring that overshoots by ~12 % at 40 % of its time, settled at the end
  spring: u => (u >= 1 ? 1 : 1 - Math.exp(-6.2 * u) * Math.cos(7.6 * u)),
};
export const ease = (n, u) => (EASE[n] ?? EASE.outCubic)(clamp01(u));
export const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
export function rng(seed) { let s = (Math.floor(seed * 4294967296) ^ 0x9E3779B9) >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
}
// a colour at an opacity (#RRGGBB or rgb()/rgba())
export function rgba(c, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) { const v = parseInt(m[1], 16); return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`; }
  const r = /^rgba?\(([^)]+)\)$/.exec(c);
  if (r) { const p = r[1].split(",").map(s => s.trim()); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; }
  return `rgba(255,255,255,${a})`;
}

// ── sprites: a blurred silhouette, once per shape, size, blur and colour ─────────────────
const SPRITES = new Map();
export function silhouette(key, w, h, blur, color, draw) {
  // drawn at the size its key names (whole pixels, a tenth of a pixel of blur), never at the size
  // of the frame that asked first: otherwise a frame's shadow depended on the frames drawn before
  // it in the same process, and a piece drawn apart (build.sh's segments, the generic's pieces)
  // came out different from one pass (2026-10-09)
  w = Math.round(w); h = Math.round(h); blur = Math.round(blur * 10) / 10;
  const id = `${key}|${w}|${h}|${blur.toFixed(1)}|${color}`;
  let s = SPRITES.get(id);
  if (!s) {
    const pad = Math.ceil(blur * 2.6) + 2;
    const c = createCanvas(Math.max(1, Math.ceil(w) + 2 * pad), Math.max(1, Math.ceil(h) + 2 * pad)), x = c.getContext("2d");
    x.save(); x.translate(pad + w / 2, pad + h / 2);
    if (blur > 0.4) x.filter = `blur(${blur.toFixed(1)}px)`;
    x.fillStyle = "#fff"; draw(x, w, h);
    x.restore();
    x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    s = { c, pad, w, h }; SPRITES.set(id, s);
    if (SPRITES.size > 900) SPRITES.delete(SPRITES.keys().next().value);
  }
  return s;
}
export function paintSprite(ctx, s, a = 1, ox = 0, oy = 0) {
  if (a <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= Math.min(1, a);
  ctx.drawImage(s.c, ox - s.w / 2 - s.pad, oy - s.h / 2 - s.pad);
  ctx.restore();
}
export const rrShape = r => (x, w, h) => { roundRect(x, -w / 2, -h / 2, w, h, r); x.fill(); };
export const discShape = (x, w) => { x.beginPath(); x.arc(0, 0, w / 2, 0, 7); x.fill(); };
// the shadow of a shape w × h around (0, 0), [blur, drop, opacity] of the contact shade then
// the soft one: "low" a small thing, "mid" a pill, a logo, a tile, "high" a card or a disc
export const ELEV = { low: [[4, 3, 0.5], [18, 10, 0.45]], mid: [[6, 5, 0.55], [30, 18, 0.55]], high: [[8, 7, 0.6], [48, 30, 0.62]] };
export function shadow2(ctx, K, key, w, h, draw, level = "mid", k = 1, rgb = "0,0,0") {
  for (const [b, oy, a] of ELEV[level] ?? ELEV.mid) paintSprite(ctx, silhouette(key, w, h, b * K, `rgb(${rgb})`, draw), a * k, 0, oy * K);
}
export function glow(ctx, K, key, w, h, draw, color, blur = 26, a = 0.4) {
  if (a > 0.003) paintSprite(ctx, silhouette(key, w, h, blur * K, color, draw), a);
}
// a gloss on the upper half and a rim lit from above, inside a path already built by `shape`
export function gloss(ctx, K, w, h, shape, { a = 0.16, rim = [0.75, 0.18], width = 2 } = {}) {
  ctx.save(); shape(); ctx.clip();
  const g = ctx.createLinearGradient(0, -h / 2, 0, -h / 2 + h * 0.58);
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h * 0.6);
  ctx.restore();
  if (rim) {
    const r = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    r.addColorStop(0, `rgba(255,255,255,${rim[0]})`); r.addColorStop(1, `rgba(255,255,255,${rim[1]})`);
    ctx.save(); shape(); ctx.strokeStyle = r; ctx.lineWidth = width * K; ctx.stroke(); ctx.restore();
  }
}
// a pop of light behind what lands: a soft disc of white turning to `color`, gone in `dur`
export function popLight(ctx, K, t, t0, r, { color = "#FFD90D", a = 0.55, dur = 0.42 } = {}) {
  const u = (t - t0) / dur;
  if (u < 0 || u > 1) return;
  const k = a * Math.pow(1 - u, 2), R = r * (0.75 + 0.35 * EASE.outCubic(u));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, `rgba(255,255,255,${k})`); g.addColorStop(0.35, rgba(color, k * 0.55)); g.addColorStop(1, rgba(color, 0));
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.restore();
}
// a shockwave ring growing out of what slammed in
export function shockwave(ctx, K, t, t0, r0, r1, { color = "#FFFFFF", a = 0.55, dur = 0.45, width = 9 } = {}) {
  const u = (t - t0) / dur;
  if (u < 0 || u > 1) return;
  const e = EASE.outCubic(u);
  ctx.save();
  ctx.strokeStyle = rgba(color, a * (1 - u)); ctx.lineWidth = Math.max(0.6, width * (1 - e) * K);
  ctx.shadowColor = rgba(color, 0.5 * (1 - u)); ctx.shadowBlur = 18 * K;
  ctx.beginPath(); ctx.arc(0, 0, lerp(r0, r1, e), 0, 7); ctx.stroke();
  ctx.restore();
}

// ── text: its silhouette as a sprite, for the shadows under a word ────────────────────────
// keyed by text, font and blur; drawn at the word's own scale and rotation by the caller
const TEXTS = new Map();
export function textSprite(text, font, blur, color = "#000", ls = 0) {
  const id = `${text}|${font}|${blur.toFixed(1)}|${color}|${ls}`;
  let s = TEXTS.get(id);
  if (!s) {
    const m0 = createCanvas(4, 4).getContext("2d"); m0.font = font; m0.letterSpacing = `${ls}px`;
    const m = m0.measureText(text);
    const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
    const left = m.actualBoundingBoxLeft, right = m.actualBoundingBoxRight;
    const pad = Math.ceil(blur * 2.6) + 4;
    const w = Math.ceil(left + right) + 2 * pad, h = Math.ceil(asc + desc) + 2 * pad;
    const c = createCanvas(Math.max(1, w), Math.max(1, h)), x = c.getContext("2d");
    if (blur > 0.4) x.filter = `blur(${blur.toFixed(1)}px)`;
    x.font = font; x.letterSpacing = `${ls}px`; x.textBaseline = "alphabetic"; x.fillStyle = color;
    x.fillText(text, pad + left, pad + asc);
    s = { c, ox: pad + left, oy: pad + asc };       // where the text's origin (left, baseline) sits in the sprite
    TEXTS.set(id, s);
    if (TEXTS.size > 1600) TEXTS.delete(TEXTS.keys().next().value);
  }
  return s;
}
// the two shadows of a word whose origin (left, baseline) is (x, y): contact then soft
export function textShadows(ctx, text, font, x, y, K, { k = 1, contact = [5, 4, 0.5], soft = [22, 13, 0.46], color = "#000", ls = 0 } = {}) {
  for (const [b, oy, a] of [contact, soft]) {
    if (!(a * k > 0.003)) continue;
    const s = textSprite(text, font, b * K, color, ls);
    ctx.save(); ctx.globalAlpha *= Math.min(1, a * k); ctx.drawImage(s.c, x - s.ox, y - s.oy + oy * K); ctx.restore();
  }
}
// a glow of the word's colour behind it
export function textGlow(ctx, text, font, x, y, K, color, a = 0.3, blur = 24, ls = 0) {
  if (a <= 0.003) return;
  const s = textSprite(text, font, blur * K, color, ls);
  ctx.save(); ctx.globalAlpha *= Math.min(1, a); ctx.drawImage(s.c, x - s.ox, y - s.oy); ctx.restore();
}

// ── motion blur: the average of n sub-frames over half a frame (a 180° shutter) ───────────
// `draw(c, t)` paints the moving thing at time t on a cleared canvas; the sub-frames are
// painted one by one and summed ('lighter', 1/n each), then composited. `rect` limits the work
// to a region of the frame (x, y, w, h in px).
const POOL = new Map();
const canvasOf = (k, w, h) => { const id = `${k}|${w}|${h}`; let c = POOL.get(id); if (!c) { c = createCanvas(w, h); POOL.set(id, c); } return c; };
export function motionBlur(ctx, t, fps, n, draw, rect = null, { shutter = 0.5, key = "mb" } = {}) {
  n = Math.max(1, Math.min(16, Math.round(n)));
  if (n <= 1) { draw(ctx, t); return; }
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const R = rect ? { x: Math.max(0, Math.floor(rect.x)), y: Math.max(0, Math.floor(rect.y)) } : { x: 0, y: 0 };
  R.w = rect ? Math.min(W - R.x, Math.ceil(rect.w + rect.x - R.x)) : W;
  R.h = rect ? Math.min(H - R.y, Math.ceil(rect.h + rect.y - R.y)) : H;
  if (R.w <= 0 || R.h <= 0) return;
  const acc = canvasOf(key + "acc", R.w, R.h), tmp = canvasOf(key + "tmp", R.w, R.h);
  const a = acc.getContext("2d"), b = tmp.getContext("2d");
  a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = "source-over"; a.globalAlpha = 1; a.clearRect(0, 0, R.w, R.h);
  for (let i = 0; i < n; i++) {
    const ti = t + ((i + 0.5) / n - 0.5) * (shutter / fps);
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = "source-over"; b.globalAlpha = 1; b.filter = "none";
    b.clearRect(0, 0, R.w, R.h);
    b.translate(-R.x, -R.y);
    draw(b, ti);
    a.globalCompositeOperation = "lighter"; a.globalAlpha = 1 / n;
    a.drawImage(tmp, 0, 0);
  }
  a.globalCompositeOperation = "source-over"; a.globalAlpha = 1;
  ctx.drawImage(acc, R.x, R.y);
}
// how many sub-frames a displacement of `px` pixels over half a frame needs (one per 3 px)
export const subframes = px => Math.max(1, Math.min(16, Math.round(Math.abs(px) / 3)));

// ── the Motionix pack: a role per kind of appearance, its files in turn ───────────────────
// (the explainer's stage.mjs MX, measured as heard on this very take at sfxMasterDb −5.2: a sound
// lands about 1.5 − gain LU under the programme median)
export const MX = {
  pop: { files: ["normal-pop-1", "normal-pop-2", "normal-pop-3", "normal-pop-4", "normal-pop-5"], gain: -14.5 },
  popPremium: { files: ["premium-pop-2", "premium-pop-1", "premium-pop-3", "premium-pop-4"], gain: -14.5 },
  popSmall: { files: ["smooth-pop", "sweet-ui-open"], gain: -15.5 },
  swish: { files: ["epic-fast-whoosh", "cinematic-fast-normal-whoosh", "high-fast-whoosh", "smooth-fast-whoosh"], gain: -15 },
  swishBig: { files: ["deep-short-whoosh", "cinematic-fast-whoosh"], gain: -13.5 },
  tick: { files: ["ui-digital-click-4", "ui-key", "high-click"], gain: -20 },
  digit: { files: ["ui-digital-click-4", "ui-digital-click-3", "ui-digital-click-4", "ui-digital-click-3", "ui-digital-click-1"], gain: -15 },
  select: { files: ["ui-select", "ui-select-2", "ui-glitch-click"], gain: -15 },
  thump: { files: ["thump-click"], gain: -15.5 },
  stretch: { files: ["ui-stretch", "ui-digital-click"], gain: -16.5 },
  ping: { files: ["ui-digital-click-1"], gain: -15.5 },
  flicker: { files: ["ui-glitch-flicker"], gain: -17.5 },
  gear: { files: ["speed-gear", "middle-gear"], gain: -15 },
  riser: { files: ["smooth-riser"], gain: -16 },
  typing: { files: ["ui-typing"], gain: -16 },
};
let KIT = null;
const kit = () => (KIT ??= JSON.parse(fs.readFileSync(new URL("../../../assets/sfx/motionix/kit.json", import.meta.url), "utf8")));
const TURN = {};
// a cue of the pack: `len` cuts a long file (a gear, a typing) to that many seconds
// Without the pack's files in the project (a copy of GTM by Pipecorn that does not ship them: their
// licence), a light sound falls back on the engine's own synthesised ones, said once.
let WARNED = false, MXDIR = null;
// where the pack's files are looked for: the project's assets/sfx-motionix/ (what sfx.mjs reads), or
// another folder for a script that reads them itself (generic.mjs: the shelf)
export const mxDir = d => { MXDIR = d; };
export function mx(role, t, { gain, len, file } = {}) {
  const m = MX[role]; if (!m) throw new Error(`Motionix: no role ${role}`);
  const K = kit(), files = m.files.filter(f => K[f]);
  const f = K[file ?? files[(TURN[role] = (TURN[role] ?? -1) + 1) % files.length]];
  if (!fs.existsSync(path.resolve(MXDIR ?? path.resolve(process.cwd(), "assets/sfx-motionix"), f.file))) {
    if (!WARNED) { WARNED = true; console.error("  ⚠ the Motionix pack is not in assets/sfx-motionix: the light sounds fall back on the engine's own"); }
    return /^swish/.test(role) ? { t: +t.toFixed(3), kind: "swoosh_in", gain: -25, role, fallback: true } : { t: +t.toFixed(3), kind: "uipop", gain: -20, role, fallback: true };
  }
  return { t: +t.toFixed(3), kind: `sample:sfx-motionix/${f.file}${len ? `:0:${Math.min(len, f.dur).toFixed(3)}` : ""}`,
    gain: +((gain ?? m.gain) - 20 - f.lm).toFixed(2), align: f.align, role };
}
export const isLight = c => !!(c.role && MX[c.role]);
// the light sounds never crowd: one within 0.15 s of a big one (a whoosh, the flash, the glitch,
// a riser's end) is dropped, the big one carries it; one closer than 70 ms to another light one
// too (the explainer's rule)
export function thin(cues) {
  const out = [], sorted = cues.slice().sort((a, b) => a.t - b.t);
  const big = sorted.filter(c => !isLight(c) && /whoosh|flash|glitch|riser/.test(c.kind) && !/whoosh_out|swoosh/.test(c.kind))
    .map(c => (/riser/.test(c.kind) ? c.t : c.t));
  for (const c of sorted) {
    if (isLight(c) && !c.keep) {
      if (big.some(t => Math.abs(t - c.t) < 0.15)) continue;
      if (out.some(o => isLight(o) && Math.abs(o.t - c.t) < 0.07)) continue;
    }
    out.push(c);
  }
  return out;
}
