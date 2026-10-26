// THE LITTLE THINGS of the scrapbook language:
//   sticker()   a DIE-CUT STICKER slapped on beside the face: an emoji or a small picture with a
//               thick white border cut round it, its soft shadow, a little bounce as it lands, a
//               tag under it in condensed capitals when it says something (v3: the pixel crew of
//               v2 was too small to read; « pas qualitatif »)
//   connect()   two app icons as stickers, slapped on one after the other, and the red marker
//               drawing an arrow from the second to the first ("get emails and phone numbers")
//   waveform()  white bars dancing with the voice at the mouth ("it becomes narrated audio")
//   sparkles(), pointer()  v2's twinkling stars and cartoon glove, kept for old plans (v3 draws a
//               marker burst or arrow instead: paper.mjs label({ burst }), marker.mjs mark())
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createCanvas, loadImage, roundRect, motion, placeImage, placeSprite, clamp01, lerp, easeOutCubic, WHITE, RED, EMOJI_FONT, cue, FRAME,
  hash, poseOf, twoPoses } from "./book.mjs";
import { tag } from "./paper.mjs";
import { SAFE, FORBIDDEN } from "../../short-editor/scripts/safezones.mjs";

import { mark } from "./marker.mjs";

const IMGS = new Map();
export async function loadBits() {
  for (const [p, o] of IMGS) {
    if (!fs.existsSync(p)) { console.error(`  ⚠ missing image: ${path.relative(process.cwd(), p)}`); continue; }
    o.img = await loadImage(p);
  }
}
const img = src => { const p = path.resolve(process.cwd(), src); if (!IMGS.has(p)) IMGS.set(p, { img: null }); return IMGS.get(p); };

// ── the die-cut: a thick white border cut round a picture, as a sticker sheet would ─────────
// art: a canvas (transparent round it). border: px. The white is grown from the art's own outline
// (drawn 28 times round a circle), a hairline of shade marks its edge, a faint sheen crosses it.
const DIECUT = new Map();
export function dieCut(art, border, key = null) {
  if (key && DIECUT.has(key)) return DIECUT.get(key);
  const pad = Math.ceil(border * 1.4) + 4;
  const c = createCanvas(art.width + 2 * pad, art.height + 2 * pad), x = c.getContext("2d");
  const sil = createCanvas(art.width, art.height), xs = sil.getContext("2d");
  xs.drawImage(art, 0, 0); xs.globalCompositeOperation = "source-in"; xs.fillStyle = "#fff"; xs.fillRect(0, 0, art.width, art.height);
  for (const r of [border, border * 0.66, border * 0.33]) for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    x.drawImage(sil, pad + Math.cos(a) * r, pad + Math.sin(a) * r);
  }
  x.drawImage(sil, pad, pad);
  // the edge of the white: a hairline of shade, so it reads on a white wall too
  const edge = createCanvas(c.width, c.height), xe = edge.getContext("2d");
  xe.drawImage(c, 0, 0); xe.globalCompositeOperation = "source-in"; xe.fillStyle = "rgba(0,0,0,.20)"; xe.fillRect(0, 0, c.width, c.height);
  const out = createCanvas(c.width, c.height), xo = out.getContext("2d");
  xo.drawImage(edge, 0, Math.max(1, border * 0.06));
  xo.drawImage(c, 0, 0);
  xo.drawImage(art, pad, pad);
  // the sheen of a vinyl sticker: a soft diagonal band of light
  xo.save(); xo.globalCompositeOperation = "source-atop";
  const g = xo.createLinearGradient(0, 0, out.width, out.height);
  g.addColorStop(0.25, "rgba(255,255,255,0)"); g.addColorStop(0.42, "rgba(255,255,255,.16)"); g.addColorStop(0.55, "rgba(255,255,255,0)");
  xo.fillStyle = g; xo.fillRect(0, 0, out.width, out.height);
  xo.restore();
  if (key) DIECUT.set(key, out);
  return out;
}
// an emoji drawn so its picture (not its em box) is about `s` wide
function emojiArt(emoji, s) {
  const f = s * 1.14, c = createCanvas(Math.ceil(f * 1.3), Math.ceil(f * 1.3)), x = c.getContext("2d");
  x.font = `${f.toFixed(1)}px ${EMOJI_FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(emoji, c.width / 2, c.height / 2 + f * 0.04);
  return c;
}
function imageArt(im, s, bg = null) {
  const c = createCanvas(Math.ceil(s), Math.ceil(s)), x = c.getContext("2d");
  if (bg) {
    roundRect(x, 0, 0, s, s, s * 0.225); x.fillStyle = bg; x.fill();
    x.strokeStyle = "rgba(0,0,0,.10)"; x.lineWidth = Math.max(1, s * 0.012); x.stroke();
    x.save(); roundRect(x, 0, 0, s, s, s * 0.225); x.clip();
    const k = 0.62, iw = s * k, ih = s * k * im.height / im.width; x.drawImage(im, (s - iw) / 2, (s - ih) / 2, iw, ih); x.restore();
  } else {
    const k = Math.min(s / im.width, s / im.height), iw = im.width * k, ih = im.height * k;
    x.drawImage(im, (s - iw) / 2, (s - ih) / 2, iw, ih);
  }
  return c;
}

// ── connect: [icon A] ⤺ [icon B] ─────────────────────────────────────────────────────────────
// a: { src } an app icon (its own square artwork) or { src, bg } a logo on a tile of colour bg.
// Icons 0.22 of the width, 0.06 apart, centred on (x, y); each SLAPPED on (A, then B), then the red
// marker draws an arrow from B's top over to A's top.
export function connect({ id = "connect", a, b, at, bAt = null, arcAt = null, until, x = 0.5, y = 0.47, size = 0.22,
  gap = 0.06, frame = FRAME, layer = "over", sound = "pop" }) {
  const W = frame.w, H = frame.h, fps = frame.fps ?? 30, s = size * W, g = gap * W;
  const A = img(a.src), B = img(b.src);
  const ax = x * W - (s + g) / 2, bx = x * W + (s + g) / 2, cy = y * H;
  const tB = bAt ?? at + 0.2, tArc = arcAt ?? tB + 0.18;
  const border = s * 0.075;
  const spriteOf = (o, spec, k) => (o.img ? dieCut(imageArt(o.img, s, spec.bg ?? null), border, `${id}-${k}`) : null);
  const poses = {};
  const posesOf = (o, spec, k) => { if (!poses[k] && o.img) { const d = spriteOf(o, spec, k); poses[k] = twoPoses(d, hash(`${id}${k}`), W); } return poses[k]; };
  const icon = (ctx, t, o, spec, k, cx, t0, rot, dir) => {
    const ps = posesOf(o, spec, k); if (!ps) return;
    const pic = ps[poseOf(t, t0)], sc = s / (pic.width - 2 * (Math.ceil(border * 1.4) + 4));
    placeSprite(ctx, t, { img: pic, w: pic.width * sc, h: pic.height * sc, cx, cy, rot, W, H, fps,
      mAt: tt => motion(tt, { at: t0, until: until - (k === "a" ? 0.05 : 0), enter: "slap", exit: "popout", W, dir }) });
  };
  const beats = [{
    id, from: at, to: until, layer,
    draw(ctx, t) {
      if (t >= at && t < until) icon(ctx, t, A, a, "a", ax, at, -0.07, -1);
      if (t >= tB && t < until) icon(ctx, t, B, b, "b", bx, tB, 0.06, 1);
    },
    cues: () => (sound ? [cue(sound, at + 0.02), cue(sound, tB + 0.02)] : []),
  }];
  // the arrow, from above B over to above A
  beats.push(...mark({ id: `${id}-arc`, kind: "arrow", at: tArc, until: until - 0.12, dur: 0.30, frame, seed: hash(id),
    from: [(bx - s * 0.02) / W, (cy - s * 0.70) / H], to: [(ax + s * 0.06) / W, (cy - s * 0.66) / H], bend: 0.42, head: 0.036, width: 0.012 }));
  return beats;
}

// ── sparkles: ✦ ✦ ✦ ───────────────────────────────────────────────────────────────────────────
function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 - Math.PI / 2, b = a + Math.PI / 4;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.quadraticCurveTo(cx, cy, cx + Math.cos(a + Math.PI / 2) * r, cy + Math.sin(a + Math.PI / 2) * r);
  }
  ctx.closePath();
}
export function sparkles({ id = "sparkles", x, y, at, until, size = 0.024, frame = FRAME, layer = "over", color = WHITE }) {
  const W = frame.w, H = frame.h;
  const pts = [[0, 0, 1], [0.034, 0.016, 0.72], [0.006, 0.032, 0.62]];   // the reference's cluster
  return [{
    id, from: at, to: until, layer,
    draw(ctx, t) {
      if (t < at || t >= until) return;
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = W * 0.0035; ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = W * 0.004;
      pts.forEach(([dx, dy, k], i) => {
        const tw = 0.78 + 0.22 * Math.sin((t - at) * 2 * Math.PI * 1.7 + i * 2.1);
        star(ctx, (x + dx) * W, y * H + dy * W, size * W * k * tw);
        ctx.stroke();
      });
      ctx.restore();
    },
  }];
}

// ── waveform: the voice as white bars at the mouth ───────────────────────────────────────────
// levels(t) → 0..1, the voice's measured level at t (voiceLevels() below reads it from the source)
export function waveform({ id = "waveform", x = 0.5, y = 0.52, w = 0.42, h = 0.075, at, until, levels, bars = 26,
  frame = FRAME, layer = "over" }) {
  const W = frame.w, H = frame.h;
  const shape = Array.from({ length: bars }, (_, i) => { const u = i / (bars - 1); return 0.25 + 0.75 * Math.pow(Math.sin(Math.PI * u), 0.7); });
  return [{
    id, from: at, to: until, layer,
    draw(ctx, t) {
      if (t < at || t >= until) return;
      const bw = (w * W) / (bars * 1.9), x0 = x * W - (w * W) / 2;
      ctx.save();
      ctx.fillStyle = WHITE; ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = W * 0.006;
      for (let i = 0; i < bars; i++) {
        const lv = levels(t - i * 0.012);
        const jit = 0.55 + 0.45 * Math.abs(Math.sin(t * 13.7 + i * 1.91));
        const hh = Math.max(W * 0.006, h * H * shape[i] * Math.min(1, lv * jit * 1.25));
        roundRect(ctx, x0 + i * bw * 1.9, y * H - hh / 2, bw, hh, bw / 2); ctx.fill();
      }
      ctx.restore();
    },
  }];
}
// the voice's level, on the OUTPUT timeline (through the cuts and the speed), 100 values a second
export function voiceLevels(P, { engine }) {
  const cache = path.resolve(process.cwd(), "assets", "levels.json");
  if (fs.existsSync(cache)) {
    const L = JSON.parse(fs.readFileSync(cache, "utf8"));
    if (L.duration === P.duration && JSON.stringify(L.cuts ?? []) === JSON.stringify(P.cuts ?? [])) return mk(L.v);
  }
  // the engine's own graph (cuts, then the speed), so a level lands on the frame it is heard on
  const graph = spawnSync("node", [path.join(engine, "cuts.mjs"), "--audio", (P.speed ?? 1) !== 1 ? `atempo=${P.speed}` : ""], { encoding: "utf8" }).stdout;
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", P.source, "-filter_complex", `${graph};[aout]aresample=8000,aformat=channel_layouts=mono:sample_fmts=flt[lv]`,
    "-map", "[lv]", "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  const buf = r.stdout ?? Buffer.alloc(0), n = Math.floor(buf.length / 4), hop = 80, v = [];
  if (!n) { console.error("  ⚠ voiceLevels: could not read the voice; the waveform stays flat"); return () => 0; }
  for (let i = 0; i + hop <= n; i += hop) {
    let s = 0; for (let j = 0; j < hop; j++) { const a = buf.readFloatLE((i + j) * 4); s += a * a; }
    v.push(10 * Math.log10(s / hop + 1e-12));
  }
  const sorted = [...v].sort((a, b) => a - b), floor = sorted[Math.floor(sorted.length * 0.10)] ?? -60, top = sorted[Math.floor(sorted.length * 0.98)] ?? -10;
  const norm = v.map(d => +clamp01((d - floor - 6) / Math.max(6, top - floor - 6)).toFixed(3));
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  fs.writeFileSync(cache, JSON.stringify({ duration: P.duration, cuts: P.cuts ?? [], v: norm }));
  return mk(norm);
  function mk(arr) { return t => { const i = Math.round(t * 100); return i < 0 || i >= arr.length ? 0 : arr[i]; }; }
}

// ── the glove: a white cartoon hand pointing up, a red cuff, tapping ──────────────────────────
function glove(ctx, cx, cy, s, rot) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s / 100, s / 100);
  ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = 3.2; ctx.strokeStyle = "#2A2A2E";
  // the cuff
  ctx.fillStyle = "#D7262B";
  roundRect(ctx, -26, 58, 52, 22, 6); ctx.fill(); ctx.stroke();
  // the palm and the curled fingers
  ctx.fillStyle = "#F7F7F7";
  ctx.beginPath();
  ctx.moveTo(-24, 60); ctx.bezierCurveTo(-34, 40, -36, 18, -24, 6);
  ctx.bezierCurveTo(-18, 0, -10, 4, -8, 10); ctx.lineTo(-8, -52);
  ctx.bezierCurveTo(-8, -66, 10, -66, 10, -52); ctx.lineTo(10, 0);
  ctx.bezierCurveTo(16, -6, 26, -4, 27, 4); ctx.bezierCurveTo(34, 2, 40, 8, 38, 16);
  ctx.bezierCurveTo(44, 18, 46, 28, 40, 34); ctx.bezierCurveTo(38, 48, 32, 56, 24, 60); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // knuckle lines and the glove's stitches
  ctx.lineWidth = 2.4; ctx.strokeStyle = "rgba(40,40,46,.75)";
  ctx.beginPath(); ctx.moveTo(10, 4); ctx.bezierCurveTo(14, 10, 14, 16, 10, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(26, 8); ctx.bezierCurveTo(30, 14, 30, 20, 26, 26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2, 30); ctx.lineTo(-2, 46); ctx.moveTo(6, 32); ctx.lineTo(6, 46); ctx.stroke();
  // a little shading on the finger
  ctx.fillStyle = "rgba(0,0,0,.08)"; roundRect(ctx, 2, -56, 6, 50, 3); ctx.fill();
  ctx.restore();
}
export function pointer({ id = "pointer", x, y, at, until, size = 0.12, rot = -10, frame = FRAME, layer = "over" }) {
  const W = frame.w, H = frame.h;
  return [{
    id, from: at, to: until, layer,
    draw(ctx, t) {
      if (t < at || t >= until) return;
      const tap = Math.abs(Math.sin((t - at) * Math.PI * 3.2)) * W * 0.012;
      glove(ctx, x * W, y * H + tap, size * W, rot * Math.PI / 180);
    },
  }];
}

// ── a sticker: an emoji (or a small transparent image), die-cut, slapped on ─────────────────
// x, y: its centre; size: the art's width (fraction of the frame width); text: a tag under it.
// It lands with a bounce (book.mjs « slap »), breathes like the paper, leaves with a « popout ».
export function sticker({ id = null, emoji = null, src = null, text = null, x, y, at, until, size = 0.15, frame = FRAME, layer = "over",
  rot = -8, enter = "slap", exit = "popout", dir = null, sound = "pop", tagTone = "white", tagSize = 0.05 }) {
  const W = frame.w, H = frame.h, fps = frame.fps ?? 30, o = src ? img(src) : null, s = size * W;
  const key = id ?? `sticker-${emoji ?? src}-${at}`, d = dir ?? (rot < 0 ? -1 : 1);
  // inside the feed's safe area, its tag too (safezones.mjs, 2026-10-05: the recipe's x 0.13 / 0.87
  // put them on the edges and under the feed's buttons)
  {
    const hw = size * 0.62, hh = s * 0.62 / H, tagH = text ? (s * 0.62 + tagSize * W * 1.4) / H : hh;
    const R = y + tagH > FORBIDDEN[1].y0 ? FORBIDDEN[1].x0 : SAFE.x1;
    x = Math.min(R - hw, Math.max(SAFE.x0 + hw, x));
    y = Math.min(SAFE.y1 - tagH, Math.max(SAFE.y0 + hh, y));
  }
  let poses = null, pad = 0;
  const posesOf = () => {
    if (poses) return poses;
    const art = emoji ? emojiArt(emoji, s) : o?.img ? imageArt(o.img, s) : null;
    if (!art) return null;
    const border = s * 0.09, dc = dieCut(art, border, key);
    pad = Math.ceil(border * 1.4) + 4;
    poses = twoPoses(dc, hash(key), W);
    return poses;
  };
  const beats = [{
    id: key, from: at, to: until, layer,
    draw(ctx, t) {
      const ps = posesOf(); if (!ps) return;
      const pic = ps[poseOf(t, at)];
      placeSprite(ctx, t, { img: pic, w: pic.width, h: pic.height, cx: x * W, cy: y * H, rot: rot * Math.PI / 180, W, H, fps,
        mAt: tt => motion(tt, { at, until, enter, exit, W, dir: d }) });
    },
    cues: () => (sound ? [cue(sound, at + 0.02)] : []),
  }];
  if (text) beats.push(...tag({ id: `${key}-tag`, text, at: at + 0.07, until: until - 0.03, x, y: y + (s * 0.62 + tagSize * W * 0.7) / H, size: tagSize,
    tone: tagTone, rot: -rot * 0.35, frame, layer, dir: -d }));
  return beats;
}
