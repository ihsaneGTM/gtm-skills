// THE SCRAPBOOK KIT — what every figure of the scrapbook language draws with: its face (Archivo,
// cut at three widths), its papers, its ink and marker, its light (two shadows under everything),
// the way things arrive and leave, its sounds, and the camera mirrored for the overlay.
//
// v3 (2026-10-05, after the second review: « les polices, les couleurs, ça ne va pas, c'est pas
// dynamique, aucune ombre derrière, les GIFs placés au hasard », « inspire-toi d'After Effects »,
// « garde l'effet papier, tu peux l'améliorer »): one face instead of three, a palette of four
// (white paper, the accent paper, ink, a red marker), a soft shadow under every figure, entrances
// that travel and land, exits, motion blur, the Motionix pack beside the paper.
//
// Sizes are FRACTIONS OF THE FRAME WIDTH (0.093 = a keyword's face), so one plan renders at any
// output size. Every figure is a beat of the engine: { id, from, to, layer, draw(ctx, t), cues() }.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ENGINE = new URL("../../short-editor/scripts/", import.meta.url).href;
const SC = await import(ENGINE + "scene.mjs");
export const { createCanvas, loadImage, GlobalFonts, Path2D, roundRect, clamp01, lerp, seg,
  easeOutCubic, easeOutBack, easeOutQuint, easeInOutCubic, easeOutExpo, spring } = SC;
export const easeInCubic = t => t * t * t;

// ── deterministic randomness: a figure looks the same on every render ──────────────────────────
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// ── the project ──────────────────────────────────────────────────────────────────────────────
export const PJ = (() => {
  try { return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "project.json"), "utf8")); }
  catch { return {}; }
})();

// the frame every figure draws in, by default: the project's own size (a figure handed no frame
// must never fall back to 1080x1920 on a 720x1280 project)
export const FRAME = { w: PJ.width ?? 1080, h: PJ.height ?? 1920, fps: PJ.fps ?? 30 };

// ── the face ─────────────────────────────────────────────────────────────────────────────────
// ARCHIVO (Omnibus-Type, SIL Open Font License; the face of the GTM by Pipecorn interface): one
// variable file, a width axis (62-125) and a weight axis (100-900). Every word of the style is cut
// from it, at three widths, so the page reads as designed, not assembled:
//   display  the words on paper — Black, a little wide (900 / 112), tight
//   cond     the small print: tags, sticker labels, a polaroid's caption — ExtraBold condensed
//            (800 / 76), in capitals, spaced
//   caption  the captions — ExtraBold at its normal width (800 / 100)
// The v2 faces (Kalam, Fraunces, Poppins: « les polices, ça ne va pas ») are gone; their names
// still resolve (hand, serif, sansBlack → display; sans, sansBold → caption) so an old plan draws.
const FONT_DIRS = [
  path.resolve(process.cwd(), "assets", "fonts"),
  path.join(os.homedir(), "Library", "Fonts"),
  "/Library/Fonts", "/System/Library/Fonts", "/System/Library/Fonts/Supplemental",
];
function register(files, alias) {
  for (const f of files) for (const d of FONT_DIRS) {
    const p = path.join(d, f);
    try { if (fs.existsSync(p) && GlobalFonts.registerFromPath(p, alias)) return alias; } catch {}
  }
  return null;
}
// project.json `faces` (opt-in, /video-long-to-shorts): { "sans": "<file>", "serif": "<file>" } draws the same
// figures in another pair (the YouTube editor's title face and its italic serif); without it, nothing changes
const OWN = PJ.faces ?? {};
export const FONTS = {
  archivo: register(OWN.sans ? [OWN.sans] : ["Archivo[wdth,wght].ttf", "Archivo-VariableFont_wdth,wght.ttf"], OWN.sans ? "SBOwnSans" : "SBArchivo"),
  // FRAUNCES (Undercase Type, OFL), the reference's soft heavy serif: the ONE important word, in
  // colour (« un mot important en couleur, une très belle police », 2026-10-05: the « Claude » of
  // the reference's hook). One variable file: Black, SOFT 100, opsz 72.
  serif: register(OWN.serif ? [OWN.serif] : ["Fraunces[SOFT,WONK,opsz,wght].ttf", "Fraunces-VF.ttf"], OWN.serif ? "SBOwnSerif" : "SBFraunces"),
};
// THE HAND ON THE PAPER (2026-10-05: « une autre police pour tous les textes sur le papier, comme dans
// notre référence: une police un peu écrite à la main »): every word on paper (labels, titles' paper
// lines, sections, tags, a polaroid's caption) is written in a marker hand, one of hands.mjs HANDS,
// picked by project.json `paperFont` (or env SB_HAND, for a board); Gochi Hand by default (the user's pick).
import { HANDS, DEFAULT_HAND } from "./hands.mjs";
export { HANDS };
export const HAND_ID = (process.env.SB_HAND || PJ.paperFont || DEFAULT_HAND).toLowerCase();
const HAND = HANDS[HAND_ID] ?? HANDS[DEFAULT_HAND];
FONTS.hand = register(HAND.files, `SBHand-${HAND_ID}`);
// the hands differ in size on the same em: each is scaled so its x-height is the reference's (0.52
// of the face size: Kalam's own), measured once
let HAND_K = null;
function handScale() {
  if (HAND_K != null) return HAND_K;
  if (!FONTS.hand) return (HAND_K = 1);
  const x = createCanvas(8, 8).getContext("2d");
  x.font = `100px "${FONTS.hand}"`; try { x.fontVariationSettings = HAND.vs ?? "normal"; } catch {}
  const xh = x.measureText("x").actualBoundingBoxAscent || 52;
  return (HAND_K = Math.max(0.7, Math.min(1.5, 52 / xh)));
}
export const handFat = () => HAND.fat ?? 0;
export const FACES = {
  hand:    { track: 0 },                                            // the marker hand on the paper
  serif:   { wght: 900, soft: 100, opsz: 72, track: -0.01 },      // Fraunces: the word in colour
  display: { wght: 900, wdth: 112, track: -0.012 },
  cond:    { wght: 800, wdth: 76, track: 0.045, caps: true },
  caption: { wght: 800, wdth: 100, track: -0.004 },
  bold:    { wght: 700, wdth: 100, track: 0 },
};
const ALIAS = { sansBlack: "display", sansBold: "caption", sans: "caption" };
export const faceOf = kind => FACES[ALIAS[kind] ?? kind] ?? FACES.display;
if ((!FONTS.archivo || !FONTS.serif || !FONTS.hand) && !globalThis.__sbFontsWarned) {
  globalThis.__sbFontsWarned = true;
  console.error(`  ⚠ ${[!FONTS.archivo && "Archivo", !FONTS.serif && "Fraunces", !FONTS.hand && HAND.name].filter(Boolean).join(", ")} missing: run the skill's fonts.mjs from the project; a system face is drawn instead`);
}
export function setFont(ctx, kind, px) {
  const f = faceOf(kind);
  if ((ALIAS[kind] ?? kind) === "hand") {
    if (FONTS.hand) {
      ctx.font = `${Math.max(1, px * handScale()).toFixed(2)}px "${FONTS.hand}"`;
      try { ctx.fontVariationSettings = HAND.vs ?? "normal"; } catch {}
      try { ctx.letterSpacing = `${((HAND.track ?? 0) * px * handScale()).toFixed(2)}px`; } catch {}
    } else {
      ctx.font = `700 ${Math.max(1, px).toFixed(2)}px "Marker Felt", "Chalkboard SE", sans-serif`;
      try { ctx.fontVariationSettings = "normal"; ctx.letterSpacing = "0px"; } catch {}
    }
    return;
  }
  if ((ALIAS[kind] ?? kind) === "serif") {
    if (FONTS.serif) {
      ctx.font = `${Math.max(1, px).toFixed(2)}px "${FONTS.serif}"`;
      try { ctx.fontVariationSettings = OWN.serif ? "normal" : `"opsz" ${f.opsz}, "wght" ${f.wght}, "SOFT" ${f.soft}, "WONK" 0`; } catch {}
    } else { ctx.font = `700 ${Math.max(1, px).toFixed(2)}px Georgia, "Times New Roman", serif`; try { ctx.fontVariationSettings = "normal"; } catch {} }
    try { ctx.letterSpacing = `${(f.track * px).toFixed(2)}px`; } catch {}
    return;
  }
  if (FONTS.archivo) {
    ctx.font = `${Math.max(1, px).toFixed(2)}px "${FONTS.archivo}"`;
    try { ctx.fontVariationSettings = `"wght" ${f.wght}, "wdth" ${f.wdth}`; } catch {}
  } else {
    ctx.font = `${f.wght >= 800 ? 800 : 700} ${Math.max(1, px).toFixed(2)}px "Helvetica Neue", Arial, sans-serif`;
    try { ctx.fontVariationSettings = "normal"; } catch {}
  }
  try { ctx.letterSpacing = `${(f.track * px).toFixed(2)}px`; } catch {}
}
const caseOf = (kind, s) => (faceOf(kind).caps ? s.toUpperCase() : s);
export const EMOJI_FONT = '"Apple Color Emoji"';

// ── the palette: four colours, nothing else ───────────────────────────────────────────────────
//   paper   a warm white (never grey: v2's « papier trop gris »), a cream, a kraft for tags
//   accent  the highlight paper and the word being said in the captions: project.json `accent`
//           (the brand's colour; a bright one takes black ink, a dark one white ink)
//   ink     near black          marker   a red felt pen: what is crossed out, circled, pointed at
export const INK = "#141414";
export const RED = "#E5322D";
export const WHITE = "#FFFFFF";
export const ACCENT = PJ.accent || "#FFD43B";
// the important word's colour (the « Claude » of the reference, in its brand's coral): project.json
// `wordColor`, else the accent
export const WORD = PJ.wordColor || PJ.accent || "#FFD43B";
export const CORAL = ACCENT;                             // the v2 name of the accent
export const PAPER = { white: "#FBF9F4", cream: "#F3ECDF", kraft: "#D6B98A", news: "#EEE8DC", rule: "rgba(70,84,110,.10)" };
export const paperTone = c => (c === "accent" ? ACCENT : PAPER[c] ?? c ?? PAPER.white);
export function luminance(hex) {
  const m = String(hex).replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!m) return 1;
  const [r, g, b] = m.slice(1).map(h => { const v = parseInt(h, 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const inkOn = paper => (luminance(paperTone(paper)) > 0.33 ? INK : WHITE);

// ── text with emoji: a label may carry one (« stay tuned 👀 ») ───────────────────────────────────
const EMOJI = /(\p{Extended_Pictographic}(?:️|⃣|[\u{1F3FB}-\u{1F3FF}]|‍\p{Extended_Pictographic}️?)*)/u;
export function runsOf(text) {
  return String(text).split(EMOJI).filter(s => s !== "").map(s => ({ s, emoji: EMOJI.test(s) && /^\p{Extended_Pictographic}/u.test(s) }));
}
const emojiFont = (ctx, px) => { ctx.font = `${(px * 0.86).toFixed(2)}px ${EMOJI_FONT}`; try { ctx.fontVariationSettings = "normal"; ctx.letterSpacing = "0px"; } catch {} };
export function measureText(ctx, text, kind, px) {
  let w = 0;
  for (const r of runsOf(text)) {
    if (r.emoji) { emojiFont(ctx, px); w += ctx.measureText(r.s).width + px * 0.08; }
    else { setFont(ctx, kind, px); w += ctx.measureText(caseOf(kind, r.s)).width; }
  }
  return w;
}
// fills left-aligned from x at baseline y; returns the advance
export function drawText(ctx, text, x, y, kind, px, { fill = INK, stroke = 0, strokeColor = null } = {}) {
  let cx = x;
  for (const r of runsOf(text)) {
    if (r.emoji) {
      emojiFont(ctx, px);
      ctx.fillText(r.s, cx + px * 0.04, y);
      cx += ctx.measureText(r.s).width + px * 0.08;
      continue;
    }
    setFont(ctx, kind, px);
    const s = caseOf(kind, r.s);
    if (stroke > 0) { ctx.lineJoin = "round"; ctx.lineWidth = stroke; ctx.strokeStyle = strokeColor ?? fill; ctx.strokeText(s, cx, y); }
    ctx.fillStyle = fill; ctx.fillText(s, cx, y);
    cx += ctx.measureText(s).width;
  }
  return cx - x;
}

// ── textures, cached ─────────────────────────────────────────────────────────────────────────
let SPECKS = null, GRAIN = null;
// the print is not a vector fill: a few specks of paper show through the ink
export function specks() {
  if (SPECKS) return SPECKS;
  const s = 512, c = createCanvas(s, s), x = c.getContext("2d"), R = rng(4242);
  x.fillStyle = "#000";
  for (let i = 0; i < 1100; i++) {
    const cx = R() * s, cy = R() * s, r = 0.3 + R() * R() * 1.6;
    x.globalAlpha = 0.5 + R() * 0.5;
    x.beginPath(); x.ellipse(cx, cy, r * (0.6 + R() * 0.8), r * (0.6 + R() * 0.8), R() * 3, 0, Math.PI * 2); x.fill();
  }
  SPECKS = c;
  return c;
}
export function grain() {
  if (GRAIN) return GRAIN;
  const s = 256, c = createCanvas(s, s), x = c.getContext("2d"), R = rng(77), img = x.createImageData(s, s);
  for (let i = 0; i < s * s; i++) { const v = 228 + (R() - 0.5) * 46; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  GRAIN = c;
  return c;
}
export function polyPath(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
// a polygon along a rectangle whose edges are a little rough (cut by hand) or torn
export function edgePoly(x, y, w, h, R, { jag = 1.5, step = 7, torn = false } = {}) {
  const pts = [];
  const side = (x0, y0, x1, y1, nx, ny) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / step));
    let wander = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      wander = torn ? wander * 0.72 + (R() - 0.5) * jag * 1.1 : 0;
      const d = (R() - 0.5) * jag + wander + (torn && R() < 0.06 ? -jag * 1.6 * R() : 0);
      pts.push([x0 + (x1 - x0) * u + nx * d, y0 + (y1 - y0) * u + ny * d]);
    }
  };
  side(x, y, x + w, y, 0, -1);
  side(x + w, y, x + w, y + h, 1, 0);
  side(x + w, y + h, x, y + h, 0, 1);
  side(x, y + h, x, y, -1, 0);
  return pts;
}

// ── THE PAPER BREATHES (kept from v2: measured frame by frame on the reference) ─────────────────
// A paper figure, once landed, holds ONE pose for 8 frames, the OTHER for 7, the first again for
// 8…: two poses, 4 a second, counted from the frame it appeared. A pose is the whole figure pushed
// by a smooth random field: an edge moves 0.6-1 px (median) at 720 wide.
export const POSE_FPS = 4;
export const poseOf = (t, at) => Math.floor((t - at) * POSE_FPS + 1e-6) & 1;
export function boilCanvas(src, seed, { sigma, corr }) {
  const w = src.width, h = src.height;
  const sd = src.getContext("2d").getImageData(0, 0, w, h).data;
  const pm = new Float32Array(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    const a = sd[i * 4 + 3] / 255;
    pm[i * 4] = sd[i * 4] * a; pm[i * 4 + 1] = sd[i * 4 + 1] * a; pm[i * 4 + 2] = sd[i * 4 + 2] * a; pm[i * 4 + 3] = sd[i * 4 + 3];
  }
  const gw = Math.ceil(w / corr) + 3, gh = Math.ceil(h / corr) + 3, R = rng(seed), amp = sigma * Math.sqrt(3);
  const gx = new Float32Array(gw * gh), gy = new Float32Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) { gx[i] = (R() * 2 - 1) * amp; gy[i] = (R() * 2 - 1) * amp; }
  const out = createCanvas(w, h), oc = out.getContext("2d"), img = oc.createImageData(w, h), od = img.data;
  for (let y = 0; y < h; y++) {
    const fy = y / corr + 1, iy = Math.floor(fy), v0 = fy - iy, v = v0 * v0 * (3 - 2 * v0);
    for (let x = 0; x < w; x++) {
      const fx = x / corr + 1, ix = Math.floor(fx), u0 = fx - ix, u = u0 * u0 * (3 - 2 * u0);
      const k00 = iy * gw + ix, k10 = k00 + 1, k01 = k00 + gw, k11 = k01 + 1;
      const dx = gx[k00] + (gx[k10] - gx[k00]) * u + (gx[k01] - gx[k00]) * v + (gx[k00] - gx[k10] - gx[k01] + gx[k11]) * u * v;
      const dy = gy[k00] + (gy[k10] - gy[k00]) * u + (gy[k01] - gy[k00]) * v + (gy[k00] - gy[k10] - gy[k01] + gy[k11]) * u * v;
      const X = x - dx, Y = y - dy, x0 = Math.floor(X), y0 = Math.floor(Y), ax = X - x0, ay = Y - y0;
      let r = 0, g = 0, b = 0, a = 0;
      const tap = (xx, yy, wt) => {
        if (wt <= 0 || xx < 0 || yy < 0 || xx >= w || yy >= h) return;
        const k = (yy * w + xx) * 4; r += pm[k] * wt; g += pm[k + 1] * wt; b += pm[k + 2] * wt; a += pm[k + 3] * wt;
      };
      tap(x0, y0, (1 - ax) * (1 - ay)); tap(x0 + 1, y0, ax * (1 - ay)); tap(x0, y0 + 1, (1 - ax) * ay); tap(x0 + 1, y0 + 1, ax * ay);
      if (a > 0.5) { const o = (y * w + x) * 4, ia = 255 / a; od[o] = r * ia; od[o + 1] = g * ia; od[o + 2] = b * ia; od[o + 3] = a; }
    }
  }
  oc.putImageData(img, 0, 0);
  return out;
}
// the two poses of a figure, at the frame's scale (sizes in px of a 720-wide frame, scaled)
export function twoPoses(canvas, seed, W) {
  const k = W / 720;
  const o = { sigma: (PJ.boil?.sigma ?? 0.62) * k, corr: (PJ.boil?.corr ?? 24) * k };
  if (PJ.boil?.off) return [canvas, canvas];
  return [boilCanvas(canvas, seed * 2 + 1, o), boilCanvas(canvas, seed * 2 + 2, o)];
}
// a horizontal motion smear: n copies averaged over `len` px (v2's sliding name; kept for old plans)
export function smear(img, len, n = 9) {
  if (Math.abs(len) < 0.6) return img;
  const pad = Math.ceil(Math.abs(len));
  const c = createCanvas(img.width + pad, img.height), x = c.getContext("2d");
  x.globalCompositeOperation = "lighter"; x.globalAlpha = 1 / n;
  for (let i = 0; i < n; i++) x.drawImage(img, (len < 0 ? pad : 0) + (len * i) / (n - 1), 0);
  c.smearOffset = len < 0 ? -pad : 0;
  return c;
}

// ── THE LIGHT ────────────────────────────────────────────────────────────────────────────────
// Everything laid on the picture casts TWO shadows, the light being above and a little to the
// left: a tight contact shade where the paper touches (baked into each figure: its pieces shade
// one another) and a soft wide one that says how far it stands off the picture. That second one is
// what gives a white paper its contrast on a white wall (v2: « aucune ombre derrière, niveau
// contraste ça ne passe pas »). It is the figure's own silhouette, blurred ONCE and cached; while a
// figure flies in (lift 1 → 0) the shadow falls further, wider and fainter, and tightens as it lands.
export const LIGHT = { blur: 0.019, dx: 0.004, dy: 0.012, alpha: 0.36, lift: { far: 2.6, spread: 0.10, fade: 0.5 } };
const SIL = new WeakMap();
export function softShadow(img, blur) {
  let m = SIL.get(img);
  if (!m) { m = new Map(); SIL.set(img, m); }
  const key = blur.toFixed(1);
  if (m.has(key)) return m.get(key);
  const pad = Math.ceil(blur * 2.6) + 2;
  const c = createCanvas(img.width + 2 * pad, img.height + 2 * pad), x = c.getContext("2d");
  x.filter = `blur(${blur.toFixed(1)}px)`;
  x.drawImage(img, pad, pad);
  x.filter = "none";
  x.globalCompositeOperation = "source-in"; x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
  c.pad = pad;
  m.set(key, c);
  return c;
}
// paints the soft shadow of `img` (drawn w × h centred on the current origin), in screen space:
// call it AFTER translating to the figure's centre and BEFORE rotating it
export function castShadow(ctx, img, w, h, { W = FRAME.w, lift = 0, rot = 0, sx = 1, sy = 1, strength = 1 } = {}) {
  const L = LIGHT, blur = L.blur * W * (img.width / Math.max(1, w));
  const sh = softShadow(img, blur), k = w / img.width, pad = sh.pad * k;
  const far = 1 + L.lift.far * lift, spread = 1 + L.lift.spread * lift;
  ctx.save();
  ctx.globalAlpha *= L.alpha * strength * (1 - L.lift.fade * lift);
  ctx.translate(L.dx * W * far, L.dy * W * far);
  if (rot) ctx.rotate(rot);
  ctx.scale(sx * spread, sy * spread);
  ctx.drawImage(sh, -w / 2 - pad, -h / 2 - pad, w + 2 * pad, h + 2 * pad);
  ctx.restore();
}

// ── HOW THINGS ARRIVE AND LEAVE ──────────────────────────────────────────────────────────────
// v3 (not on the reference: the second review asked for « dynamique », « After Effects »): every
// figure TRAVELS a little and LANDS (its shadow tightening as it touches), then breathes; it leaves
// as it came (a paper folds back up, a polaroid is flicked away). 30 fps, durations in seconds.
//   toss     a PAPER landing: from below and to the side, 14 % big, tilted, unfolding as it comes
//            (scale y 0.25 → 1.06 → 1 in 4 frames: the unfold chosen on the boards), settling a
//            hair past its place                                                   0.24 s
//   unfold   the unfold alone, in place (v2's pick, kept)                           0.13 s
//   slap     a STICKER slapped on: 1.55 × and 17° to its size in a damped bounce    0.30 s
//            (`amp` scales the bounce: a wide strip is slapped at 0.3, or it covers the frame)
//   drop     a POLAROID dropped on the table: from above, 22 % big, 8° off          0.30 s
//   swing    a BANNER swinging in from the side, overshooting a little              0.26 s
//   rise     a caption word: up 0.15 of its size, 0.86 → 1                          0.10 s
//   (v2's cut, slideblur, blur, slide, pop, fade still work)
// exits:
//   fold     a paper folding back up (the unfold played backwards) and gone          0.13 s
//   flick    flicked off the side, turning, in a blur                                0.20 s
//   popout   a sticker: a breath bigger, then nothing                                0.16 s
//   swingout the banner leaving the way it is going                                 0.20 s
//   (v2's cut, fade, squash, drop, slide still work)
export const ENTER_DUR = { toss: 0.24, unfold: 0.13, slap: 0.30, drop: 0.30, swing: 0.26, rise: 0.10, slideblur: 0.167, blur: 0.10, slide: 0.10, pop: 0.16, fade: 0.08, cut: 0 };
export const EXIT_DUR = { fold: 0.13, flick: 0.20, popout: 0.16, swingout: 0.20, fade: 0.10, squash: 0.20, drop: 0.12, slide: 0.12, cut: 0 };
const bounce = (k, f = 10, d = 6) => Math.exp(-d * k) * Math.cos(f * k);
export function motion(t, { at, until, enter = "cut", exit = "cut", W = FRAME.w, dir = 1, tilt = 1, amp = 1 }) {
  const m = { a: 1, sx: 1, sy: 1, rot: 0, blur: 0, dx: 0, dy: 0, smear: 0, lift: 0, fold: 0, on: t >= at && t < until, moving: false };
  if (!m.on) { m.a = 0; return m; }
  const u = t - at, v = until - t;
  m.moving = u < (ENTER_DUR[enter] ?? 0) + 0.04 || v < (EXIT_DUR[exit] ?? 0) + 0.04;
  if (enter === "toss") {
    const k = clamp01(u / 0.24), e = easeOutCubic(k), b = easeOutBack(k, 1.7);
    const ku = clamp01(u / 0.13), unfold = ku >= 1 ? 1 : lerp(0.25, 1, easeOutBack(ku, 2.4));
    const s = lerp(1.14, 1, b);
    m.sx = s * lerp(0.94, 1, easeOutCubic(ku)); m.sy = s * unfold;
    m.dx = (1 - e) * W * 0.035 * dir; m.dy = (1 - e) * W * 0.05;
    m.rot = (1 - b) * 0.10 * dir * tilt;
    m.lift = 1 - e; m.fold = 1 - unfold;
    m.a = clamp01(u * 30 * 0.65 + 0.35);
  } else if (enter === "unfold") {
    const k = clamp01(u / 0.13), unfold = k >= 1 ? 1 : lerp(0.25, 1, easeOutBack(k, 2.4));
    m.sy = unfold; m.sx = lerp(0.94, 1, easeOutCubic(k)); m.lift = (1 - easeOutCubic(k)) * 0.5; m.fold = 1 - unfold;
  } else if (enter === "slap") {
    const k = clamp01(u / 0.30);
    const s = k >= 1 ? 1 : 1 + 0.55 * amp * bounce(k);
    m.sx = m.sy = s; m.rot = (k >= 1 ? 0 : 0.30 * amp * bounce(k, 9, 6.5)) * dir * tilt; m.lift = Math.exp(-5 * k) * (k < 1 ? 1 : 0);
  } else if (enter === "drop") {
    const k = clamp01(u / 0.30), e = easeOutCubic(k), b = easeOutBack(k, 1.5);
    m.sx = m.sy = lerp(1.22, 1, b); m.dy = -(1 - e) * W * 0.07; m.rot = (1 - b) * 0.14 * dir * tilt; m.lift = 1 - e;
    m.a = clamp01(u * 30 * 0.5 + 0.5);
  } else if (enter === "swing") {
    const k = clamp01(u / 0.26), b = easeOutBack(k, 1.25);
    m.dx = (1 - b) * W * 0.78 * dir; m.rot = -(1 - b) * 0.05 * dir * tilt; m.lift = (1 - easeOutCubic(k)) * 0.6;
  } else if (enter === "rise") {
    const k = clamp01(u / 0.10), b = easeOutBack(k, 2.0);
    m.sx = m.sy = lerp(0.86, 1, b); m.dy = (1 - easeOutCubic(k)) * W * 0.012; m.a = clamp01(u / 0.05 + 0.3);
  } else if (enter === "slideblur") {
    const D = 0.167, k = clamp01(u / D), off = Math.pow(1 - k, 3) * W * 0.096 * dir;
    const k2 = clamp01((u + 1 / 30) / D), next = Math.pow(1 - k2, 3) * W * 0.096 * dir;
    m.dx = off; m.smear = (off - next) * 0.85;
  } else if (enter === "blur") {
    const k = clamp01(u / 0.10), e = easeOutCubic(k);
    m.blur = (1 - e) * W * 0.012; m.sx = lerp(1.14, 1, e); m.a = lerp(0.35, 1, e);
  } else if (enter === "slide") {
    const k = clamp01(u / 0.10), e = easeOutCubic(k);
    m.dx = (1 - e) * W * 0.55 * dir; m.blur = (1 - e) * W * 0.008;
  } else if (enter === "pop") {
    const k = clamp01(u / 0.16);
    const s = lerp(0.72, 1, easeOutBack(k, 2.2)); m.sx = m.sy = s; m.a = clamp01(u / 0.05);
  } else if (enter === "fade") {
    m.a = clamp01(u / 0.08);
  }
  // the exits
  if (exit === "fold") {
    const k = clamp01(1 - v / 0.13);
    if (k > 0) {
      m.sy *= lerp(1, 0.12, easeInCubic(k)); m.sx *= lerp(1, 0.95, k); m.dy -= k * W * 0.008;
      m.a *= 1 - clamp01((k - 0.55) / 0.45); m.lift = Math.max(m.lift, k * 0.5); m.fold = Math.max(m.fold, k * 0.8);
    }
  } else if (exit === "flick") {
    const k = clamp01(1 - v / 0.20), e = k * k;
    if (k > 0) {
      m.dx += e * W * 0.70 * dir; m.dy += e * W * 0.05; m.rot += e * 0.28 * dir;
      m.sx *= lerp(1, 0.92, k); m.sy *= lerp(1, 0.92, k); m.a *= 1 - clamp01((k - 0.65) / 0.35); m.lift = Math.max(m.lift, k * 0.7);
    }
  } else if (exit === "popout") {
    const k = clamp01(1 - v / 0.16);
    if (k > 0) {
      const s = k < 0.35 ? lerp(1, 1.12, easeOutCubic(k / 0.35)) : lerp(1.12, 0.2, easeInCubic((k - 0.35) / 0.65));
      m.sx *= s; m.sy *= s; m.a *= 1 - clamp01((k - 0.6) / 0.4);
    }
  } else if (exit === "swingout") {
    const k = clamp01(1 - v / 0.20), e = Math.pow(k, 2.2);
    if (k > 0) { m.dx -= e * W * 0.85 * dir; m.rot += e * 0.04 * dir; m.lift = Math.max(m.lift, e * 0.5); }
  } else if (exit === "fade") m.a *= clamp01(v / 0.10);
  else if (exit === "squash") {
    const k = clamp01(1 - v / 0.20);
    if (k > 0) {
      const sq = k < 0.45 ? Math.sin((k / 0.45) * Math.PI) : 0;
      m.sy *= 1 - 0.18 * sq; m.sx *= 1 + 0.04 * sq;
      const o = clamp01((k - 0.45) / 0.55);
      m.a *= 1 - o; m.dy -= o * W * 0.03; m.blur += o * W * 0.010;
    }
  } else if (exit === "drop") {
    const k = clamp01(1 - v / 0.12), e = k * k;
    m.dy += e * W * 0.35; m.dx -= e * W * 0.12; m.a *= 1 - k * 0.3;
  } else if (exit === "slide") {
    const k = clamp01(1 - v / 0.12), e = k * k;
    m.dx += e * W * 0.7 * dir;
  }
  return m;
}

// ── MOTION BLUR ──────────────────────────────────────────────────────────────────────────────
// While a figure moves, the frame is the average of 6 instants over half a frame (a 180° shutter,
// as a camera would see it): each instant is painted on a scratch canvas with « lighter » at 1/6,
// then the sum is laid on the frame. Its soft shadow is painted once, under it (already soft).
// Still figures are painted once. project.json `motionBlur: false` turns it off.
const SCRATCH = new Map();
function scratch(W, H) {
  const key = `${W}x${H}`;
  if (!SCRATCH.has(key)) SCRATCH.set(key, createCanvas(W, H));
  return SCRATCH.get(key);
}
// body(ctx, m) draws the figure for a motion m (ONE drawImage: the samples add up), shade(ctx, m)
// its shadow; mAt(t) gives the motion at t
export function drawMoving(ctx, t, mAt, body, { shade = null, W = FRAME.w, H = FRAME.h, fps = FRAME.fps, samples = 6 } = {}) {
  const m = mAt(t);
  if (!m.on || m.a <= 0.003) return;
  if (shade) shade(ctx, m);
  if (!m.moving || PJ.motionBlur === false) { body(ctx, m); return; }
  const c = scratch(W, H), x = c.getContext("2d");
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
  x.clearRect(0, 0, W, H);
  for (let i = 0; i < samples; i++) {
    const mi = mAt(t - (i / samples) * (0.5 / fps));
    if (!mi.on || mi.a <= 0.003) continue;
    x.save();
    x.globalCompositeOperation = "lighter"; x.globalAlpha = 1 / samples;
    body(x, mi);
    x.restore();
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

// a sprite (a label, a card, a sticker) centred on cx,cy with a motion applied, its soft shadow
// under it, motion-blurred while it moves (no shade across it while it opens: the paper stays flat,
// « j'aime pas le dégradé sur le papier », 2026-10-05)
export function placeSprite(ctx, t, { img, w, h, cx, cy, rot = 0, mAt, shadow = 1, W = FRAME.w, H = FRAME.h, fps = FRAME.fps, alpha = 1 }) {
  const picOf = m => (typeof img === "function" ? img(m) : img);
  drawMoving(ctx, t, mAt, (x, m) => {
    const pic = picOf(m);
    if (!pic) return;
    x.save();
    x.globalAlpha *= m.a * alpha;
    x.translate(cx + m.dx, cy + m.dy);
    x.rotate(rot + m.rot);
    x.scale(m.sx, m.sy);
    if (m.blur > 0.4) x.filter = `blur(${m.blur.toFixed(1)}px)`;
    if (m.smear && Math.abs(m.smear) >= 0.6) {
      const s = smear(pic, m.smear * (pic.width / w)), k = w / pic.width;
      x.drawImage(s, -w / 2 + (s.smearOffset ?? 0) * k, -h / 2, s.width * k, h);
    } else x.drawImage(pic, -w / 2, -h / 2, w, h);
    x.restore();
  }, {
    W, H, fps,
    shade: shadow ? (x, m) => {
      const pic = picOf(m);
      if (!pic) return;
      x.save();
      x.globalAlpha *= m.a * alpha;
      x.translate(cx + m.dx, cy + m.dy);
      castShadow(x, pic, w, h, { W, lift: m.lift, rot: rot + m.rot, sx: m.sx, sy: m.sy, strength: shadow });
      x.restore();
    } : null,
  });
}
// v2's call, kept for the old figures: an image with a motion, no shadow, no blur
export function placeImage(ctx, img, cx, cy, w, h, m, { rot = 0, alpha = 1 } = {}) {
  if (!m.on || m.a <= 0.003) return;
  ctx.save();
  ctx.globalAlpha *= m.a * alpha;
  ctx.translate(cx + m.dx, cy + m.dy);
  if (rot || m.rot) ctx.rotate(rot + (m.rot ?? 0));
  ctx.scale(m.sx, m.sy);
  if (m.blur > 0.4) ctx.filter = `blur(${m.blur.toFixed(1)}px)`;
  if (m.smear && Math.abs(m.smear) >= 0.6) {
    const s = smear(img, m.smear * (img.width / w));
    const k = w / img.width;
    ctx.drawImage(s, -w / 2 + (s.smearOffset ?? 0) * k, -h / 2, s.width * k, h);
  } else ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// ── THE CAMERA, mirrored ─────────────────────────────────────────────────────────────────────
// The picture is zoomed by the engine (zexpr.mjs: steps [t, zoom, ramp, anchorX?, ease?] of the
// plan); the overlay is drawn on the frame. So that a figure set on the face stays on the face when
// the camera punches in, camera(STEPS).map(t, x, y) gives where a point of the picture (fractions)
// is on screen at t: zoompan shows the window starting at (zoom−1)·anchor, 1/zoom wide.
export function camera(steps = [], P = PJ) {
  const E = { linear: u => u, out: u => 1 - Math.pow(1 - u, 3), inout: u => u * u * (3 - 2 * u) };
  const ease = (n, u) => (E[n ?? "linear"] ?? E.linear)(u);
  const AY = P.anchorY ?? 0.34, AX0 = P.anchorX ?? 0.5;
  const z = t => {
    if (!steps.length) return 1;
    let v = steps[0][1];
    for (let i = 1; i < steps.length; i++) {
      const [ti, zi, ri, , es] = steps[i];
      v += (zi - steps[i - 1][1]) * ease(es, clamp01((t - +ti.toFixed(2)) / Math.max(0.001, ri)));
    }
    return v;
  };
  const ax = t => {
    let v = AX0, cur = AX0;
    for (const [ti, , ri, a, es] of steps) {
      if (a == null || a === cur) continue;
      v += (a - cur) * ease(es, clamp01((t - +ti.toFixed(2)) / Math.max(0.001, ri)));
      cur = a;
    }
    return v;
  };
  return {
    z, ax,
    map(t, x, y) { const k = z(t), a = ax(t); return { x: k * (x - (k - 1) * a), y: k * (y - (k - 1) * AY) }; },
    scale: t => z(t),
  };
}

// THE CAMERA OF v3 (the second review: « c'est pas dynamique »; the reference never moves): the
// opening frame starts tight (1.14) and settles in 0.6 s; every JUMP CUT alternates the frame
// between wide (1.0) and close (`close`, 1.08), on the cut, so a join reads as a beat, not a slip;
// a SECTION punches in (`section`, 1.10 in 0.22 s) and the next cut takes it back wide; from
// `scene` (a change of scene: the teaser of a next episode) the frame is wide and pushes in
// slowly (`push`) to the end. Returns the plan's STEPS ([t, zoom, ramp, anchorX?, ease?]).
export function punches({ joins = [], sections = [], scene = null, end = PJ.duration ?? 60, open = true, close = 1.08, section = 1.10, push = 1.07, P = PJ } = {}) {
  const AX = P.anchorX ?? 0.5;
  const steps = open ? [[0, 1.14, 0, AX], [0, 1.0, 0.6, undefined, "out"]] : [[0, 1.0, 0, AX]];
  const events = [...joins.filter(j => scene == null || j < scene - 0.2).map(t => ({ t, k: "join" })), ...sections.map(t => ({ t, k: "punch" }))]
    .sort((a, b) => a.t - b.t);
  let z = 1.0, near = false;
  for (const e of events) {
    if (e.k === "punch") { steps.push([e.t, section, 0.22, undefined, "out"]); z = section; continue; }
    near = z > 1.04 ? false : !near;
    const nz = near ? close : 1.0;
    if (nz !== z) steps.push([e.t, nz, 0.001]);
    z = nz;
  }
  if (scene != null) {
    if (z !== 1.0) steps.push([scene, 1.0, 0.001]);
    if (push && push !== 1) steps.push([scene + 0.01, push, Math.max(0.5, end - scene - 0.1), undefined, "inout"]);
  }
  return steps;
}

// ── THE SOUNDS ───────────────────────────────────────────────────────────────────────────────
// Three shelves, one role per kind of event (edl.mjs drops a repeat of a role within 80 ms):
//   real paper (sounds.mjs: eight Mixkit recordings in assets/sfx-paper/)
//     paper    a paper LANDING: a keyword, a punch phrase, a tag, the ask — « Paper slide », the
//              user's pick on the boards (2026-10-05), at the volume they kept (19 LU under)
//     section  a section's banner, under its swoosh            name   a tag under a banner
//     mark     the red marker: a word crossed out, a line drawn under, a circle, an arrow (a felt
//              scribble, cut to the stroke)                     type   a pencil (a typed line)
//   the Motionix pack (plugins/video/assets/sfx/motionix: « Sound Effects By Motionix », given with
//   the second review to complete the little sounds; sounds.mjs copies what is used)
//     pop      a sticker slapped on (the four premium pops in turn)
//     shutter  a polaroid landing (a photo: a soft camera shutter)
//     swish    something flicked away or flying past (light, fast whooshes in turn)
//     swoosh   a section's banner swinging in (a cinematic fast whoosh)
//     thump    the camera punching in on a section or a payoff (a soft low click)
//     rise     tension into the payoff (a smooth riser, its crest ON the payoff)
//     money    money said or won (optional)
//   the house pack of the other styles (assets/sfx-top5/)
//     click 25.3 · whoosh 18.6 · glitch 21.9 · flash 18.5 · riser 19.9 (style 01's levels)
//
// `lu`: how many LU UNDER THE VOICE the sound plays, as heard: its loudest momentary loudness (EBU
// R128, 400 ms) against the voice's momentary median. sounds.mjs --calibrate writes the voice's
// figure (project.json `voiceM`, sfxMasterDb 0), the kits each file's own (`lm`), so the cue gain
// is voiceM − lu − lm; measure.mjs reads them back as heard. project.json `sounds` picks another
// paper file for a role (`{ "paper": "slice" }`), `cueGains` moves a role by dB (+2: 2 dB louder).
const readKit = rel => { try { return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "assets", rel), "utf8")); } catch { return null; } };
const KIT = readKit("sfx-paper/kit.json") ?? { paper: {}, pack: {} };
const MX = readKit("sfx-motionix/kit.json") ?? {};
// where the sound HITS inside each file (s): the first crackle a frame after the paper lands
export const PAPER_ALIGN = { turn: 0.11, slice: 0.075, slide: 0.33, move: 0.39, big: 0.29, pages: 0.16, scribble: 0.045, pencil: 0.01 };
const PACK_ALIGN = { "click.wav": 0.005, "whoosh.wav": 0.94, "glitch.wav": 0.15, "camera-flash.wav": 0.255, "riser.wav": 1.765 };
// SB_SOUNDS='{"paper":"slice"}' (env) overrides project.json `sounds` for one render (the variants)
const CHOSEN = { ...(PJ.sounds ?? {}), ...(process.env.SB_SOUNDS ? JSON.parse(process.env.SB_SOUNDS) : {}) };
export const SOUNDS = {
  paper:   { paper: CHOSEN.paper ?? "slide", lu: 19 },       // chosen on the boards (2026-10-05): « Paper slide »
  section: { paper: CHOSEN.section ?? "big", lu: 22 },
  name:    { paper: CHOSEN.name ?? "slice", lu: 23 },
  mark:    { paper: CHOSEN.mark ?? "scribble", lu: 23 },
  type:    { paper: CHOSEN.type ?? "pencil", lu: 25 },
  pop:     { mx: ["premium-pop-1", "premium-pop-2", "premium-pop-3", "premium-pop-4"], lu: 20 },
  shutter: { mx: ["smooth-camera-shutter"], lu: 20 },
  swish:   { mx: ["smooth-fast-whoosh", "high-fast-whoosh", "cinematic-fast-normal-whoosh"], lu: 23 },
  swoosh:  { mx: ["cinematic-fast-whoosh"], lu: 19 },
  thump:   { mx: ["thump-click"], lu: 22 },
  rise:    { mx: ["smooth-riser"], lu: 20 },
  money:   { mx: ["cinematic-money-2"], lu: 21 },
  click:   { pack: "click.wav", lu: 25.3 },
  whoosh:  { pack: "whoosh.wav", lu: 18.6 },
  glitch:  { pack: "glitch.wav", lu: 21.9 },
  flash:   { pack: "camera-flash.wav", lu: 18.5 },
  riser:   { pack: "riser.wav", lu: 19.9 },
};
// the Motionix files a render needs (sounds.mjs copies them into assets/sfx-motionix/)
export const MX_USED = [...new Set(Object.values(SOUNDS).flatMap(s => s.mx ?? []))];
// { dur } on a cue cuts a long recording (the pencil, the scribble) to the gesture: sfx.mjs plays
// the file whole, so a cut copy is written next to it once (assets/sfx-paper/<name>-<ms>.wav)
// (its own loudness is measured too: a pencil cut to half a second plays 5 dB under the whole file)
const CUT_CACHE = new Set();
function momentaryMax(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "apad=pad_dur=1,ebur128=metadata=1,ametadata=mode=print:key=lavfi.r128.M", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 });
  let best = -120;
  for (const m of ((r.stdout || "") + (r.stderr || "")).matchAll(/lavfi\.r128\.M=(-?[\d.]+)/g)) best = Math.max(best, +m[1]);
  return +best.toFixed(1);
}
function cutCopy(name, dur) {
  const ms = Math.round(dur * 1000), rel = `sfx-paper/${name}-${ms}.wav`, out = path.resolve(process.cwd(), "assets", rel);
  const meta = out.replace(/\.wav$/, ".json");
  if (!CUT_CACHE.has(out) && (!fs.existsSync(out) || !fs.existsSync(meta))) {
    const src = path.resolve(process.cwd(), "assets", "sfx-paper", `${name}.wav`);
    const end = dur + (PAPER_ALIGN[name] ?? 0), fade = Math.min(0.06, dur / 3);
    const cp = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-af",
      `atrim=0:${end.toFixed(3)},afade=t=out:st=${Math.max(0, end - fade).toFixed(3)}:d=${fade.toFixed(3)}`, "-c:a", "pcm_s16le", out]);
    if (cp.status !== 0) return null;
    fs.writeFileSync(meta, JSON.stringify({ lm: momentaryMax(out) }));
  }
  CUT_CACHE.add(out);
  return { rel, lm: JSON.parse(fs.readFileSync(meta, "utf8")).lm };
}
export function cue(name, t, extra = {}) {
  const s = SOUNDS[name];
  if (!s) throw new Error(`unknown scrapbook sound: ${name}`);
  const { dur, lu, pick, ...rest } = extra;
  let meta, file, align;
  if (s.mx) {
    // several files take turns, chosen by the moment (the same figure always gets the same one)
    const f = pick ?? s.mx[hash(`${name}@${Math.round(t * 1000)}`) % s.mx.length];
    meta = MX[f];
    if (!meta) throw new Error(`the Motionix sounds are not in the project (${f}): run the skill's sounds.mjs`);
    file = `sfx-motionix/${meta.file}`; align = meta.align ?? 0;
  } else {
    meta = s.paper ? KIT.paper?.[s.paper] : KIT.pack?.[s.pack];
    file = s.paper ? `sfx-paper/${s.paper}.wav` : `sfx-top5/${s.pack}`;
    align = s.paper ? (PAPER_ALIGN[s.paper] ?? 0) : (PACK_ALIGN[s.pack] ?? 0);
    if (dur && s.paper) { const c = cutCopy(s.paper, dur); if (c) { file = c.rel; meta = { ...meta, lm: c.lm }; } }
  }
  const under = (lu ?? s.lu) - ((PJ.cueGains ?? {})[name] ?? 0);
  if (PJ.voiceM == null || meta?.lm == null) throw new Error("the sounds are not calibrated: run the skill's sounds.mjs --calibrate in the project");
  return { t: +(+t).toFixed(3), kind: `sample:${file}`, gain: +(PJ.voiceM - under - meta.lm - (PJ.sfxMasterDb ?? 0)).toFixed(1),
    align, role: name, ...rest };
}
