// THE END IN PAPER of a vertical short (validated by Ihsane on 2026-10-05, the Pipecorn sales-calls
// intro: v3's dark stage and black-glass countdown were refused, "sur ce style de vidéo on est sur
// un fond [papier] d'habitude… c'est un style beaucoup trop différent"; v4's ink page as a generic
// too, it is now generic.mjs). What an end in this language is made of:
//   · the COUNTDOWN on scraps of the plates' paper stuck on the speaker's jacket, one a beat: the
//     label on a strip of white paper, then each number on a square of grid paper taped at its top,
//     a little pile that grows (paperCountdown)
//   · the next video TAPED on a sheet as a print (tapedClip), with a die-cut yellow sticker on it
//     (labelSticker: NEXT EPISODE)
//   · every piece is the plates' paper (the same cream, grain and grid); what lands enters in
//     STOP-MOTION, 8 poses a second, held, never faded, each a little off, and casts a shadow that
//     lifts with it; the type is Impact in ink
//   · the sounds are the paper's: the pack's click on a landing, a tick on each later pose, the tape
// tapedClip and labelSticker are CHILDREN of a cover() sheet (drawn once it has landed); the
// countdown is stuck on the jacket, before the sheet.
import { C, spring, createCanvas } from "./scene.mjs";
import * as H from "./hand.mjs";
import { fontFor } from "./titles.mjs";
import { clamp01, seg, silhouette, paintSprite, roundRect } from "./pro.mjs";

const INK = H.INK;
const CLICK = { kind: "sample:sfx-top5/click.wav", gain: -11, align: 0.005 };

// a thing landing on paper in stop-motion: the engine's sticker settle (a drop from above, one
// overshoot the other way, a jitter that dies), 8 poses a second, held. Its clock starts on its
// own onset (the engine's runs from 0), so a piece placed on a beat lands ON the beat.
const stepOf = (t, t0, fps = 8) => Math.floor((t - t0) * fps + 1e-6);
function pose(t, t0, { fps = 8, settle = 0.62, drop = 0.30, grow = 0.22, spin = 11, seed = 1, S = 300 } = {}) {
  const k = stepOf(t, t0, fps);
  if (k < 0) return null;
  const tc = t0 + k / fps;
  const u = clamp01((tc - t0) / settle), lift = 1 - spring(u, 2.6, 4.0), j = 1 - u;
  const R = H.rng(Math.floor(seed * 100000) + k * 7919);   // the engine's rng takes an integer
  return { u, up: Math.max(0, lift), dx: (R() - 0.5) * 0.05 * S * j, dy: -drop * S * lift + (R() - 0.5) * 0.05 * S * j,
    rot: (spin * lift + (R() - 0.5) * 3.2 * j) * Math.PI / 180, s: 1 + grow * lift };
}
// its sounds, as the engine's stickers make them: the landing on the first pose, a tick on each
// later one (3 dB quieter each), on the poses of its own clock
function landCues(t0, { fps = 8, settle = 0.62, land = CLICK } = {}) {
  const c = [], n = Math.ceil(settle * fps - 1e-6);
  for (let k = 0; k <= n; k++) {
    const at = +(t0 + k / fps).toFixed(3);
    c.push(k === 0 ? { t: at, ...land } : { t: at, kind: `ptick:${k % 4}`, gain: H.HAND_LEVELS.poseTick - 3 * (k - 1) });
  }
  return c;
}
// the shadow of a piece of paper w × h: tight once it lies flat, far and soft while it is lifted
const rectShape = r => (x, w, h) => { roundRect(x, -w / 2, -h / 2, w, h, r); x.fill(); };
function liftShadow(ctx, key, w, h, shape, up, K, rgb = "0,0,0", k = 1) {
  paintSprite(ctx, silhouette(key, w, h, (4 + 14 * up) * K, `rgb(${rgb})`, shape), 0.40 * (1 - 0.65 * up) * k, 0, (3 + 30 * up) * K);
  paintSprite(ctx, silhouette(key, w, h, (24 + 22 * up) * K, `rgb(${rgb})`, shape), 0.28 * (1 - 0.35 * up) * k, 0, (14 + 40 * up) * K);
}
const ink = (ctx, text, x, y, size, { color = INK.graphite, align = "center", ls = 0 } = {}) => {
  ctx.font = fontFor({ k: "impact", size }); ctx.letterSpacing = `${ls}px`;
  ctx.textBaseline = "alphabetic"; ctx.textAlign = align; ctx.fillStyle = color;
  ctx.fillText(text, x, y); ctx.letterSpacing = "0px"; ctx.textAlign = "left";
};

// ── THE COUNTDOWN: scraps of the plates' paper stuck on the jacket, one a beat ─────────────
// The label on a strip of white paper first, then each number on a square of grid paper,
// taped at its top, landing on the one before it: a little pile that grows with the beats.
// `scale` shrinks the whole pile (0.6 under the speaker's chin when the headlines sit below the head);
// the default y keeps the numbers in the feed's safe area (safezones.mjs: above y 0.774)
export function paperCountdown({ id = "countdown", labelAt, digits, end, frame, x = 0.5, y = 0.64, scale = 1, label = "STITCH INCOMING" }) {
  const W = frame.w, Hh = frame.h, K = W / 1080 * scale, KG = W / 1920 * scale;
  const SQ = 330 * K;
  const offs = [[-0.014, 0.004, -7], [0.011, -0.007, 5], [-0.007, 0.009, -4], [0.013, 0.002, 6], [-0.003, -0.005, -2]];
  const items = [
    { kind: "label", t: labelAt, x: x * W, y: (y - 0.175 * scale) * Hh, w: 600 * K, h: 112 * K, rot: -3 },
    ...digits.map((d, i) => ({ kind: "digit", t: d, text: String(digits.length - i), x: (x + offs[i % 5][0]) * W, y: (y + offs[i % 5][1]) * Hh, w: SQ, h: SQ, rot: offs[i % 5][2] })),
  ];
  return {
    id, from: +(labelAt - 0.05).toFixed(3), to: end, layer: "over", mutesCaptions: false,
    // the pack's click 2.5 dB under the others, as v2's countdown: on top of the drop and the riser
    // its second transient was the loudest sample of the mix, and the AAC encode took it to −0.7 dBTP
    cues() { return items.flatMap(it => landCues(it.t, { settle: 0.5, land: { ...CLICK, gain: -13.5 } })); },
    draw(ctx, t) {
      if (t < labelAt - 0.05 || t > end) return;
      items.forEach((it, i) => {
        // a short drop: the numbers are stuck on, and a long one carried them over the label
        const p = pose(t, it.t, { settle: 0.5, S: it.kind === "label" ? 220 * K : SQ, seed: 0.13 + i * 0.071, spin: 9, drop: it.kind === "label" ? 0.30 : 0.10 });
        if (!p) return;
        const r0 = it.rot * Math.PI / 180;
        // its shadow on the jacket, left behind where it will land while it is still in the air
        ctx.save(); ctx.translate(it.x + p.dx * 0.4, it.y + p.dy * 0.25); ctx.rotate(r0 + p.rot * 0.85);
        liftShadow(ctx, `scrap${Math.round(it.w)}x${Math.round(it.h)}`, it.w * p.s, it.h * p.s, rectShape(3 * K), p.up, K);
        ctx.restore();
        ctx.save(); ctx.translate(it.x + p.dx, it.y + p.dy); ctx.rotate(r0 + p.rot); ctx.scale(p.s, p.s);
        if (it.kind === "label") {
          H.drawPaper(ctx, { x: -it.w / 2, y: -it.h / 2, w: it.w, h: it.h, grid: "none", tone: INK.paperWhite, K: KG, shadow: 0, seed: 21 });
          ink(ctx, label, 0, 0.405 * 58 * K, Math.round(58 * K), { ls: 2 * K });
          H.drawTape(ctx, -it.w / 2 + 34 * K, -it.h / 2 + 8 * K, { len: 150, wid: 46, rot: -0.7, K: KG, seed: 31 });
          H.drawTape(ctx, it.w / 2 - 34 * K, -it.h / 2 + 8 * K, { len: 150, wid: 46, rot: 0.6, K: KG, seed: 32 });
        } else {
          H.drawPaper(ctx, { x: -it.w / 2, y: -it.h / 2, w: it.w, h: it.h, grid: "quad", tone: INK.paper, K: KG, shadow: 0, seed: 40 + i });
          ink(ctx, it.text, 0, 0.405 * 250 * K + 6 * K, Math.round(250 * K));
          H.drawTape(ctx, 0, -it.h / 2 + 4 * K, { len: 250, wid: 58, rot: (i % 2 ? 0.05 : -0.06), K: KG, seed: 50 + i });
        }
        ctx.restore();
      });
    },
  };
}

// ── THE CLIP TAPED ON THE PAPER: the next episode, as a print stuck on the sheet ──────────
// frames: one picture per output frame from clipFrom (the video inside plays at its own rate;
// only the print moves in stop-motion); two strips of tape pressed on after it lands
export function tapedClip({ at, frame, x = 0.5, y = 0.56, w = 740, rot = -2.5, frames = () => [], clipFrom, fps = 30, tapes = [0.24, 0.36] }) {
  const W = frame.w, Hh = frame.h, K = W / 1080, KG = W / 1920;
  const PW = w * K, B = 22 * K, r0 = rot * Math.PI / 180;
  const cx = x * W, cy = y * Hh;
  return {
    cues() {
      return [...landCues(at), ...tapes.map(d => ({ t: +(at + d).toFixed(3), kind: "tape", gain: H.HAND_LEVELS.tape }))];
    },
    draw(ctx, t) {
      const p = pose(t, at, { S: PW * 0.5, seed: 0.77, spin: 7, grow: 0.16 });
      if (!p) return;
      ctx.save(); ctx.translate(cx + p.dx * 0.4, cy + p.dy * 0.25); ctx.rotate(r0 + p.rot * 0.85);
      liftShadow(ctx, `print${Math.round(PW)}`, PW * p.s, PW * p.s, rectShape(2 * K), p.up, K, "54,40,20");
      ctx.restore();
      ctx.save(); ctx.translate(cx + p.dx, cy + p.dy); ctx.rotate(r0 + p.rot); ctx.scale(p.s, p.s);
      H.drawPaper(ctx, { x: -PW / 2, y: -PW / 2, w: PW, h: PW, grid: "none", tone: INK.paperWhite, K: KG, shadow: 0, seed: 61 });
      const fr = frames(), img = fr[Math.max(0, Math.min(fr.length - 1, Math.round((t - clipFrom) * fps)))];
      const iw = PW - 2 * B;
      if (img) ctx.drawImage(img, -iw / 2, -iw / 2, iw, iw);
      else { ctx.fillStyle = "#E8E4DA"; ctx.fillRect(-iw / 2, -iw / 2, iw, iw); }
      // the print's own edge on the picture, a hair of shade
      ctx.strokeStyle = "rgba(40,30,15,0.18)"; ctx.lineWidth = 1.5 * K; ctx.strokeRect(-iw / 2, -iw / 2, iw, iw);
      // the tape, pressed on after the print has landed, each in two poses
      tapes.forEach((d, i) => {
        const st = stepOf(t, at + d); if (st < 0) return;
        const k = st === 0 ? 1.25 : 1;
        const [tx, ty, tr] = i === 0 ? [-PW / 2 + 40 * K, -PW / 2 + 14 * K, -0.72] : [PW / 2 - 40 * K, -PW / 2 + 14 * K, 0.68];
        ctx.save(); ctx.translate(tx, ty); ctx.scale(k, k);
        H.drawTape(ctx, 0, 0, { len: 220, wid: 62, rot: tr, K: KG, seed: 70 + i });
        ctx.restore();
      });
      ctx.restore();
    },
  };
}

// ── A LABEL STICKER: a die-cut yellow sticker, white edge, in ink ──────────────────────────
export function labelSticker({ at, frame, text, x, y, rot = -7, size = 50 }) {
  const W = frame.w, Hh = frame.h, K = W / 1080;
  const m0 = createCanvas(4, 4).getContext("2d"); m0.font = fontFor({ k: "impact", size: Math.round(size * K) }); m0.letterSpacing = `${2 * K}px`;
  const tw = m0.measureText(text).width, bw = tw + 58 * K, bh = size * K * 1.55, edge = 9 * K, r = 16 * K;
  return {
    cues() { return landCues(at, { settle: 0.5 }); },
    draw(ctx, t) {
      const p = pose(t, at, { settle: 0.5, S: bw * 0.6, seed: 0.31, spin: 10 });
      if (!p) return;
      const r0 = rot * Math.PI / 180;
      ctx.save(); ctx.translate(x * W + p.dx * 0.4, y * Hh + p.dy * 0.25); ctx.rotate(r0 + p.rot * 0.85);
      liftShadow(ctx, `label${Math.round(bw)}`, (bw + 2 * edge) * p.s, (bh + 2 * edge) * p.s, rectShape(r + edge), p.up, K, "54,40,20");
      ctx.restore();
      ctx.save(); ctx.translate(x * W + p.dx, y * Hh + p.dy); ctx.rotate(r0 + p.rot); ctx.scale(p.s, p.s);
      roundRect(ctx, -bw / 2 - edge, -bh / 2 - edge, bw + 2 * edge, bh + 2 * edge, r + edge); ctx.fillStyle = "#FFFFFF"; ctx.fill();
      roundRect(ctx, -bw / 2, -bh / 2, bw, bh, r); ctx.fillStyle = C.yellow; ctx.fill();
      ink(ctx, text, 0, 0.405 * size * K, Math.round(size * K), { color: "#141414", ls: 2 * K });
      ctx.restore();
    },
  };
}
