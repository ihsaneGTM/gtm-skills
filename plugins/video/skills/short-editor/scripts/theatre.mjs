// THE THEATRICAL FIGURES — frame-scale, one per moment, in near silence.
//
// The illustrated pass (illustrate.mjs) was rejected on three counts: too many small
// elements and small decorations, not big or theatrical enough; the pencil sound on
// every stroke; and three variants that were one variant. This module
// holds what the three NEXT proposals share, which is only the scale: an element is
// as big as the frame or bigger than the speaker, there is ONE per moment, and nothing here
// makes a pencil sound. Each figure takes `sound: null` or one designed cue.
//
//   paperShape()  a flat PAPER cut-out — rect, disc, arrow, bar, bubble, figure, glyph,
//                 image — with grain, a drop shadow and a torn edge on request, entering
//                 from a side, from behind the speaker, dropping, rising, popping (Saul Bass's
//                 paper theatre; Paper)
//   veil()        the lights go down on the room and stay on the SPEAKER: a dark field with
//                 the speaker's silhouette cut out, through the camera (Stage)
//   spotlight()   a cone of light from the top of the frame to a pool on the floor
//                 behind the speaker (Stage)
//   floorGrid()   a perspective floor drawing itself towards a vanishing point behind
//                 the speaker's head (a drawer for a cover)
//   standing()    any content drawn on an offscreen canvas, warped onto a vertical
//                 plane standing in perspective behind the speaker, rising from the floor with
//                 a floor shadow (Stage)
//   bigBubbles()  giant marker speech bubbles, a fat wavy line inside, no words (Strokes)
//
// Same contract as the other figures: { id, from, to, layer, draw, cues }, fractions
// for positions, 1080p pixels × K for sizes, the under layer puts a figure behind the speaker.
import { INK, HAND_LEVELS, rng, hash, roughLine, roughCurve, roughEllipse, roughRect, drawStroke, drawShape, plLength, plPartial, paperGrain, camMap } from "./hand.mjs";
import { C, clamp01, easeOutCubic, easeInOutCubic, easeOutQuint, easeOutBack, lerp, seg, createCanvas } from "./scene.mjs";
import { TYPE } from "./titles.mjs";
import { warpQuad } from "./illustrate.mjs";

export const PAPER = { yellow: C.yellow, slate: "#2B2F35", cream: INK.paper, white: INK.paperWhite, red: INK.red, ink: INK.graphite, night: "#0E1014" };
// one designed cue per figure, dB relative to the voice on top of sfxMasterDb
export const TH_LEVELS = { slide: -22, thud: -19, pop: -20, light: -23, air: -20, whoosh: -19, tear: -19, sheet: -18 };
const SOUND = {
  slide: { kind: "paper_in", gain: TH_LEVELS.slide }, sheet: { kind: "sheet_in", gain: TH_LEVELS.sheet },
  thud: { kind: "impact_soft", gain: TH_LEVELS.thud }, pop: { kind: "pop", gain: TH_LEVELS.pop },
  light: { kind: "stamp", gain: TH_LEVELS.light }, air: { kind: "air_in", gain: TH_LEVELS.air },
  whoosh: { kind: "whoosh_in", gain: TH_LEVELS.whoosh }, swoosh: { kind: "swoosh_in", gain: TH_LEVELS.whoosh },
};
const cueOf = (t, name) => name && SOUND[name] ? [{ t: +t.toFixed(3), ...SOUND[name] }] : [];

// --- a flat paper fill: colour, grain, and a soft drop shadow --------------------------
function fillPaper(ctx, path, { color, K, shadow = 1, alpha = 1, grainAmt = 0.55 }) {
  ctx.save(); ctx.globalAlpha *= alpha;
  if (shadow > 0) { ctx.save(); ctx.shadowColor = `rgba(0,0,0,${0.36 * shadow})`; ctx.shadowBlur = 46 * K * shadow; ctx.shadowOffsetY = 20 * K * shadow; path(); ctx.fillStyle = color; ctx.fill(); ctx.restore(); }
  else { path(); ctx.fillStyle = color; ctx.fill(); }
  if (grainAmt > 0) { ctx.save(); path(); ctx.clip(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha *= grainAmt; ctx.fillStyle = ctx.createPattern(paperGrain(), "repeat"); ctx.fillRect(-4000, -4000, 12000, 12000); ctx.restore(); }
  ctx.restore();
}
// a rectangle path with an optional torn edge (which side)
function tornRectPath(ctx, x, y, w, h, torn, R, K) {
  ctx.beginPath();
  if (!torn) { ctx.rect(x, y, w, h); return; }
  const j = () => (2 + R() * 16) * K, step = () => (14 + R() * 26) * K;
  if (torn === "bottom") { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - 10 * K); let px = x + w; while (px > x) { px -= step(); ctx.lineTo(Math.max(x, px), y + h - j()); } }
  else if (torn === "top") { ctx.moveTo(x, y + h); ctx.lineTo(x, y + 10 * K); let px = x; while (px < x + w) { px += step(); ctx.lineTo(Math.min(x + w, px), y + j()); } ctx.lineTo(x + w, y + h); }
  else if (torn === "right") { ctx.moveTo(x, y); ctx.lineTo(x + w - 10 * K, y); let py = y; while (py < y + h) { py += step(); ctx.lineTo(x + w - j(), Math.min(y + h, py)); } ctx.lineTo(x, y + h); }
  else { ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + 10 * K, y + h); let py = y + h; while (py > y) { py -= step(); ctx.lineTo(x + j(), Math.max(y, py)); } }
  ctx.closePath();
}

// A FLAT PAPER CUT-OUT.
//
//   paperShape({ id, from, to, at, frame, kind: "disc", cx: 0.5, cy: 0.5, r: 0.45, color: PAPER.cream,
//                enter: { from: "behind", origin: [0.55, 0.5], dur: 0.5 }, exit: "fade", sound: "slide" })
//
// kinds and their geometry (fractions of the frame; sizes vertical = of H):
//   rect    x, y, w, h [, torn: "bottom"|"top"|"left"|"right"]       disc  cx, cy, r (of H), [ry]
//   arrow   a: [x,y] (tail), b: [x,y] (tip), th (thickness, of H)     bar   x, w, base (y of the floor), h (rises)
//   bubble  x, y, w, h, tail: "br"|"bl"                                figure cx, cy (feet), h (of H)
//   glyph   text, cx, cy, size (1080p px), font (TYPE.sans default)   image  img, cx, cy, size (of H), card: color|null
// enter.from: "left" | "right" | "top" | "bottom" | "behind" (from `origin`, scaled up) | "drop" | "pop" | "rise" | "along" (an arrow flying in along its own axis) | "none"
// exit: "slide" (back the way it came) | "fade" | "fall" | "none"
export function paperShape({
  id = "paper", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under", kind = "rect", color = PAPER.cream,
  enter = { from: "left", dur: 0.45 }, exit = "fade", exitDur = 0.36, rot = 0, shadow = 1, grain = 0.55, alpha = 1,
  outline = null,            // { color, width, style: "marker" } — a rough outline instead of a fill (Strokes' bubbles)
  sound = "slide", mutesCaptions = false, seed = hash(id),
  x, y, w, h, torn = null, cx, cy, r, ry, a: pFrom, b: pTo, th = 0.06, base, tail = "br",
  text, size = 600, font = null, textColor = PAPER.ink, img = null, card = null, cardPad = 0.14,
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const R = rng(seed);
  const eDur = enter.dur ?? 0.45, eFrom = enter.from ?? "left";
  // the shape's own box and centre, for the entrance transform
  let box;
  switch (kind) {
    case "rect": case "bubble": box = { x: x * W, y: y * H, w: w * W, h: h * H }; break;
    case "disc": box = { x: cx * W - r * H, y: cy * H - (ry ?? r) * H, w: 2 * r * H, h: 2 * (ry ?? r) * H }; break;
    case "arrow": { const xs = [pFrom[0], pTo[0]].map(v => v * W), ys = [pFrom[1], pTo[1]].map(v => v * H); box = { x: Math.min(...xs) - th * H, y: Math.min(...ys) - th * H, w: Math.abs(xs[1] - xs[0]) + 2 * th * H, h: Math.abs(ys[1] - ys[0]) + 2 * th * H }; break; }
    case "bar": box = { x: x * W, y: (base - h) * H, w: w * W, h: h * H }; break;
    case "figure": box = { x: cx * W - h * H * 0.34, y: cy * H - h * H, w: h * H * 0.68, h: h * H }; break;
    case "glyph": box = { x: cx * W - size * K * 0.4, y: cy * H - size * K * 0.5, w: size * K * 0.8, h: size * K }; break;
    case "image": { const s = size * H * (card ? 1 + 2 * cardPad : 1); box = { x: cx * W - s / 2, y: cy * H - s / 2, w: s, h: s }; break; }
    default: throw new Error(`unknown paperShape: ${kind}`);
  }
  const ccx = box.x + box.w / 2, ccy = box.y + box.h / 2;
  const path = (ctx) => {
    switch (kind) {
      case "rect": tornRectPath(ctx, box.x, box.y, box.w, box.h, torn, rng(seed + 1), K); break;
      case "bar": tornRectPath(ctx, box.x, box.y, box.w, box.h, torn, rng(seed + 1), K); break;
      case "disc": ctx.beginPath(); ctx.ellipse(cx * W, cy * H, r * H, (ry ?? r) * H, 0, 0, Math.PI * 2); break;
      case "arrow": {
        const ax = pFrom[0] * W, ay = pFrom[1] * H, bx = pTo[0] * W, by = pTo[1] * H, T = th * H;
        const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
        const headL = Math.min(L * 0.38, T * 2.6), headW = T * 2.1, hx = bx - ux * headL, hy = by - uy * headL;
        ctx.beginPath();
        ctx.moveTo(ax + nx * T / 2, ay + ny * T / 2); ctx.lineTo(hx + nx * T / 2, hy + ny * T / 2); ctx.lineTo(hx + nx * headW / 2, hy + ny * headW / 2);
        ctx.lineTo(bx, by); ctx.lineTo(hx - nx * headW / 2, hy - ny * headW / 2); ctx.lineTo(hx - nx * T / 2, hy - ny * T / 2); ctx.lineTo(ax - nx * T / 2, ay - ny * T / 2);
        ctx.closePath(); break;
      }
      case "bubble": {
        const rr = Math.min(box.w, box.h) * 0.18, bx0 = box.x, by0 = box.y, bw = box.w, bh = box.h;
        ctx.beginPath(); ctx.moveTo(bx0 + rr, by0); ctx.lineTo(bx0 + bw - rr, by0); ctx.quadraticCurveTo(bx0 + bw, by0, bx0 + bw, by0 + rr);
        ctx.lineTo(bx0 + bw, by0 + bh - rr); ctx.quadraticCurveTo(bx0 + bw, by0 + bh, bx0 + bw - rr, by0 + bh);
        if (tail === "br") { ctx.lineTo(bx0 + bw * 0.80, by0 + bh); ctx.lineTo(bx0 + bw * 0.86, by0 + bh + bh * 0.22); ctx.lineTo(bx0 + bw * 0.66, by0 + bh); }
        ctx.lineTo(bx0 + rr, by0 + bh); ctx.quadraticCurveTo(bx0, by0 + bh, bx0, by0 + bh - rr);
        if (tail === "bl") { ctx.lineTo(bx0, by0 + bh * 0.62); ctx.lineTo(bx0 - bw * 0.06, by0 + bh + bh * 0.22); ctx.lineTo(bx0, by0 + bh * 0.8); }
        ctx.lineTo(bx0, by0 + rr); ctx.quadraticCurveTo(bx0, by0, bx0 + rr, by0); ctx.closePath(); break;
      }
      case "figure": {
        const FH = h * H, px = cx * W, feet = cy * H, headR = FH * 0.14, headCy = feet - FH + headR;
        ctx.beginPath(); ctx.arc(px, headCy, headR, 0, Math.PI * 2);
        ctx.moveTo(px - FH * 0.34, feet); ctx.lineTo(px - FH * 0.34, feet - FH * 0.30);
        ctx.quadraticCurveTo(px - FH * 0.34, feet - FH * 0.66, px, feet - FH * 0.66);
        ctx.quadraticCurveTo(px + FH * 0.34, feet - FH * 0.66, px + FH * 0.34, feet - FH * 0.30); ctx.lineTo(px + FH * 0.34, feet); ctx.closePath(); break;
      }
      case "glyph": case "image": ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); break;
    }
  };
  let outlineShape = null;
  return {
    id, from, to, mutesCaptions, layer, box,
    cues() { return cueOf(at, sound); },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const k = eFrom === "none" ? 1 : (eFrom === "pop" ? easeOutBack(clamp01((t - at) / eDur), 1.3) : easeOutQuint(clamp01((t - at) / eDur)));
      const ex = seg(t, to - exitDur, to);
      if (ex >= 1) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      let dx = 0, dy = 0, sc = 1, a = 1;
      const off = 1.2;
      if (eFrom === "left") dx = -(1 - k) * (box.x + box.w) * off;
      else if (eFrom === "right") dx = (1 - k) * (W - box.x) * off;
      else if (eFrom === "top") dy = -(1 - k) * (box.y + box.h) * off;
      else if (eFrom === "bottom") dy = (1 - k) * (H - box.y) * off;
      else if (eFrom === "behind") { const o = enter.origin ?? [0.55, 0.5]; dx = (o[0] * W - ccx) * (1 - k); dy = (o[1] * H - ccy) * (1 - k); sc = lerp(enter.scale ?? 0.5, 1, k); a = clamp01(k * 3); }
      else if (eFrom === "along" && kind === "arrow") { const vx = (pTo[0] - pFrom[0]) * W, vy = (pTo[1] - pFrom[1]) * H, L = Math.hypot(vx, vy) || 1; const back = (enter.dist ?? 1.4) * L * (1 - k); dx = -vx / L * back; dy = -vy / L * back; }
      else if (eFrom === "drop") { sc = lerp(1.18, 1, k); a = clamp01(k * 2.2); }
      else if (eFrom === "pop") { sc = k; a = clamp01(k * 3); }
      // exits
      if (exit === "fade") a *= 1 - ex;
      else if (exit === "slide") { const e = easeInOutCubic(ex); if (eFrom === "left") dx -= e * (box.x + box.w) * off; else if (eFrom === "right") dx += e * (W - box.x) * off; else if (eFrom === "top") dy -= e * (box.y + box.h) * off; else if (eFrom === "bottom") dy += e * (H - box.y) * off; else a *= 1 - ex; }
      else if (exit === "fall") { const e = ex * ex; dy += e * H * 1.3; ctx.translate(ccx, ccy); ctx.rotate(e * 0.35 * (R() > 0.5 ? 1 : 1)); ctx.translate(-ccx, -ccy); }
      ctx.globalAlpha *= a;
      ctx.translate(dx, dy);
      ctx.translate(ccx, ccy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-ccx, -ccy);
      if (eFrom === "rise" && k < 1) { ctx.beginPath(); ctx.rect(box.x - 40 * K, box.y + box.h * (1 - k), box.w + 80 * K, box.h * k + 60 * K); ctx.clip(); }
      if (outline) {
        if (!outlineShape) {
          const Ro = rng(seed + 7);
          let pls;
          if (kind === "bubble" || kind === "rect") { pls = roughRect(box.x, box.y, box.w, box.h, Ro, 0.9, K); if (kind === "bubble") pls.push(roughLine([box.x + box.w * 0.78, box.y + box.h], [box.x + box.w * 0.86, box.y + box.h * 1.2], Ro, .8, K), roughLine([box.x + box.w * 0.86, box.y + box.h * 1.2], [box.x + box.w * 0.66, box.y + box.h], Ro, .8, K)); }
          else if (kind === "disc") pls = [roughEllipse(cx * W, cy * H, r * H, (ry ?? r) * H, Ro, { K, r: 1.1 })];
          else pls = roughRect(box.x, box.y, box.w, box.h, Ro, 0.9, K);
          outlineShape = { strokes: pls, style: outline.style ?? "marker", color: outline.color ?? INK.graphite, width: outline.width ?? 14, seed };
        }
        if (outline.fill) fillPaper(ctx, () => path(ctx), { color: outline.fill, K, shadow: 0, grainAmt: 0.3, alpha: 0.9 });
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 30 * K; ctx.shadowOffsetY = 12 * K;
        drawShape(ctx, { ...outlineShape, K }, outline.dur ? seg(t, at, at + outline.dur) : 1);
        ctx.restore();
      } else if (kind === "glyph") {
        const f = font ?? TYPE.sans(Math.round(size * K));
        ctx.save(); ctx.font = f; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = `rgba(0,0,0,${0.38 * shadow})`; ctx.shadowBlur = 50 * K * shadow; ctx.shadowOffsetY = 22 * K * shadow;
        ctx.fillStyle = color; ctx.fillText(text, cx * W, cy * H + size * K * 0.04);
        if (grain > 0) { ctx.shadowColor = "transparent"; ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha *= grain * 0.6; ctx.fillStyle = ctx.createPattern(paperGrain(), "repeat");
          // grain only where the glyph is: draw the glyph as a clip via a second pass
          ctx.save(); ctx.beginPath(); ctx.rect(box.x - 200, box.y - 200, box.w + 400, box.h + 400); ctx.clip(); ctx.restore(); }
        ctx.restore();
      } else if (kind === "image") {
        const s = size * H, pad = card ? s * cardPad : 0;
        if (card) fillPaper(ctx, () => { ctx.beginPath(); const rr = s * 0.18; const bx0 = cx * W - s / 2 - pad, by0 = cy * H - s / 2 - pad, bw = s + 2 * pad; ctx.moveTo(bx0 + rr, by0); ctx.arcTo(bx0 + bw, by0, bx0 + bw, by0 + bw, rr); ctx.arcTo(bx0 + bw, by0 + bw, bx0, by0 + bw, rr); ctx.arcTo(bx0, by0 + bw, bx0, by0, rr); ctx.arcTo(bx0, by0, bx0 + bw, by0, rr); ctx.closePath(); }, { color: card, K, shadow, grainAmt: grain });
        const image = typeof img === "function" ? img() : img;
        if (image) { ctx.save(); if (!card) { ctx.shadowColor = `rgba(0,0,0,${0.42 * shadow})`; ctx.shadowBlur = 50 * K; ctx.shadowOffsetY = 20 * K; } ctx.drawImage(image, cx * W - s / 2, cy * H - s / 2, s, s); ctx.restore(); }
      } else {
        fillPaper(ctx, () => path(ctx), { color, K, shadow, grainAmt: grain });
        if (text) { const f = font ?? TYPE.sans(Math.round(size * K)); ctx.save(); ctx.font = f; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = textColor; ctx.fillText(text, ccx, ccy + size * K * 0.04); ctx.restore(); }
      }
      ctx.restore();
    },
  };
}

// THE LIGHTS GO DOWN ON THE ROOM AND STAY ON THE SPEAKER — a dark field over the frame with
// the speaker's silhouette cut out (through the camera), fading in and out. Over layer.
export function veil({ id = "veil", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "over", stencil = null, cam = null, anchorY = 0.28,
  color = PAPER.night, alpha = 0.86, fadeIn = 0.35, fadeOut = 0.45, feather = 0, sound = "air", mutesCaptions = false, hole = true }) {
  const W = frame.w, H = frame.h, K = frame.w / 1920;
  return {
    id, from, to, mutesCaptions, layer,
    cues() { return cueOf(at, sound); },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const k = easeInOutCubic(seg(t, at, at + fadeIn)) * (1 - easeInOutCubic(seg(t, to - fadeOut, to)));
      if (k <= 0.005) return;
      ctx.save(); ctx.globalAlpha = alpha * k; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
      if (hole) {
        const st = typeof stencil === "function" ? stencil() : stencil;
        const img = st && st.at(t);
        if (img) {
          const M = camMap(cam, anchorY, W, H, t);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = "destination-out";
          // a few offsets soften the cut edge into a halo of light around the speaker
          const n = feather > 0 ? 6 : 1;
          for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = feather * K * (i ? 1 : 0); ctx.globalAlpha = i ? 0.35 : 1; ctx.drawImage(img, M.dx + Math.cos(a) * rr, M.dy + Math.sin(a) * rr, W * M.z, H * M.z); }
        }
      }
      ctx.restore();
    },
  };
}

// A SPOTLIGHT: a cone from a point above the frame to a pool of light on the floor
// behind the speaker. Under layer. `on` ramps in 0.12 s with a flicker; `off` cuts.
export function spotlight({ id = "spot", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under", top = [0.5, -0.1], floor = [0.5, 0.92], rx = 0.16, ry = 0.05,
  spread = 0.5, alpha = 0.55, color = "255,242,190", off = null, sound = "light", mutesCaptions = false, seed = hash(id) }) {
  const W = frame.w, H = frame.h;
  const R = rng(seed);
  return {
    id, from, to, mutesCaptions, layer,
    cues() { return cueOf(at, sound); },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      if (off != null && t >= off) return;
      const u = clamp01((t - at) / 0.12);
      const flick = t - at < 0.5 ? 0.85 + 0.15 * Math.sin((t - at) * 80 + R() * 0.2) : 1;
      const k = u * flick * (1 - easeInOutCubic(seg(t, to - 0.3, to)));
      if (k <= 0.005) return;
      const tx = top[0] * W, ty = top[1] * H, fx = floor[0] * W, fy = floor[1] * H, hw = spread * rx * H * 2;
      ctx.save(); ctx.globalAlpha = k;
      // the cone
      const g = ctx.createLinearGradient(tx, ty, fx, fy);
      g.addColorStop(0, `rgba(${color},${alpha * 0.9})`); g.addColorStop(0.7, `rgba(${color},${alpha * 0.55})`); g.addColorStop(1, `rgba(${color},${alpha * 0.25})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(tx - hw * 0.12, ty); ctx.lineTo(tx + hw * 0.12, ty); ctx.lineTo(fx + rx * H, fy); ctx.lineTo(fx - rx * H, fy); ctx.closePath(); ctx.fill();
      // the pool
      const gp = ctx.createRadialGradient(fx, fy, 0, fx, fy, rx * H);
      gp.addColorStop(0, `rgba(${color},${alpha * 1.6})`); gp.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = gp; ctx.save(); ctx.translate(fx, fy); ctx.scale(1, ry / rx); ctx.beginPath(); ctx.arc(0, 0, rx * H, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.restore();
    },
  };
}

// A PERSPECTIVE FLOOR drawing itself: lines from the bottom edge to a vanishing point,
// then the horizontals, spaced as a floor recedes. A drawer for a cover (or a beat).
export function floorGrid({ id = "floor", from = 0, to = 1e9, at = from, frame = { w: 1920, h: 1080 }, layer = "under", vx = 0.5, vy = 0.22, horizon = 0.30,
  color = "rgba(38,40,46,.55)", width = 4, n = 14, rows = 9, dur = 0.9, style = "marker", sound = null, mutesCaptions = false, seed = hash(id), exit = 0.3 }) {
  const W = frame.w, H = frame.h, K = frame.w / 1920;
  const R = rng(seed);
  const VX = vx * W, VY = vy * H, HY = horizon * H;
  const lines = [];
  for (let i = -3; i <= n + 3; i++) { const bx = (i / n) * W * 1.6 - W * 0.3; lines.push(roughLine([bx, H * 1.02], [VX + (bx - VX) * ((HY - VY) / (H * 1.02 - VY)), HY], R, .5, K)); }
  const rowsPl = [];
  for (let j = 1; j <= rows; j++) { const u = j / rows, y = HY + (H * 1.02 - HY) * (u * u * 0.85 + u * 0.15); rowsPl.push(roughLine([-W * 0.1, y], [W * 1.1, y], R, .4, K)); }
  const beat = {
    id, from, to, mutesCaptions, layer,
    cues() { return cueOf(at, sound); },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      const k = easeOutCubic(seg(t, at, at + dur));
      if (k <= 0 || outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = outK;
      ctx.beginPath(); ctx.rect(0, HY - 2, W, H - HY + 4); ctx.clip();
      lines.forEach((pl, i) => { const lk = clamp01((k * 1.6 - (i / lines.length) * 0.6)); if (lk > 0) drawStroke(ctx, lk >= 1 ? pl : plPartial(pl, lk), { color, width, style, K, seed: seed + i }); });
      rowsPl.forEach((pl, j) => { const lk = clamp01((k * 1.8 - 0.8 - (j / rowsPl.length) * 0.8) / 0.2); if (lk > 0) drawStroke(ctx, pl, { color, width: width * 0.8, style, K, seed: seed + 50 + j, alpha: lk }); });
      ctx.restore();
    },
  };
  return beat;
}

// CONTENT STANDING IN PERSPECTIVE behind the speaker: `content(c, w, h, t)` draws into an offscreen
// canvas (w × h px), which is warped onto `quad` (fractions: tl, tr, br, bl — a vertical
// plane receding one way). It RISES from the floor over `rise` seconds (the plane grows
// up from its bottom edge) with a soft shadow pooling at its feet.
export function standing({ id = "standing", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under", quad, content, cw = 1000, ch = 1000,
  rise = 0.55, exit = 0.34, exitMode = "sink", shadow = 1, sound = "thud", mutesCaptions = false }) {
  const W = frame.w, H = frame.h, K = frame.w / 1920;
  const off = createCanvas(cw, ch);
  const Q = quad.map(([qx, qy]) => [qx * W, qy * H]);
  return {
    id, from, to, mutesCaptions, layer,
    cues() { return cueOf(at + rise * 0.85, sound); },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const k = easeOutQuint(clamp01((t - at) / rise));
      const ex = seg(t, to - exit, to);
      if (ex >= 1) return;
      const o = off.getContext("2d"); o.clearRect(0, 0, cw, ch); content(o, cw, ch, t);
      // the plane grows up from the floor: the top corners rise from the bottom ones
      const kk = exitMode === "sink" ? k * (1 - easeInOutCubic(ex)) : k;
      const [tl, tr, br, bl] = Q;
      const TL = [lerp(bl[0], tl[0], kk), lerp(bl[1], tl[1], kk)], TR = [lerp(br[0], tr[0], kk), lerp(br[1], tr[1], kk)];
      ctx.save();
      if (exitMode === "fade") ctx.globalAlpha = 1 - ex;
      if (shadow > 0 && kk > 0.02) {
        const sx = (bl[0] + br[0]) / 2, sy = (bl[1] + br[1]) / 2, srx = Math.abs(br[0] - bl[0]) * 0.62, sry = Math.abs(br[0] - bl[0]) * 0.08;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, srx); g.addColorStop(0, `rgba(0,0,0,${0.42 * shadow * kk})`); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save(); ctx.translate(sx, sy); ctx.scale(1, sry / srx); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, srx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      if (kk > 0.01) warpQuad(ctx, off, 0, ch * (1 - kk), cw, ch * kk, [TL, TR, br, bl], 120);
      ctx.restore();
    },
  };
}

// GIANT SPEECH BUBBLES in marker: rounded rough outlines the height of a quarter of the
// frame, a fat wavy line inside for the words, a tail — one per onset, stacked. No text.
export function bigBubbles({ id = "bubbles", from, to, frame = { w: 1920, h: 1080 }, layer = "over", items = [], color = INK.graphite, width = 14, fill = "rgba(255,252,244,.55)",
  exit = 0.3, sound = "pop", mutesCaptions = false, seed = hash(id), typing = null }) {
  const W = frame.w, H = frame.h, K = frame.w / 1920;
  const R = rng(seed);
  const B = items.map((it, i) => {
    const bx = it.x * W, by = it.y * H, bw = it.w * W, bh = it.h * H;
    const outline = roughRect(bx, by, bw, bh, R, 1.0, K);
    const tailPl = it.tail === "left"
      ? [roughLine([bx + bw * 0.14, by + bh], [bx + bw * 0.06, by + bh * 1.22], R, .8, K), roughLine([bx + bw * 0.06, by + bh * 1.22], [bx + bw * 0.26, by + bh], R, .8, K)]
      : [roughLine([bx + bw * 0.80, by + bh], [bx + bw * 0.88, by + bh * 1.22], R, .8, K), roughLine([bx + bw * 0.88, by + bh * 1.22], [bx + bw * 0.66, by + bh], R, .8, K)];
    const line = roughCurve([[bx + bw * 0.08, by + bh * 0.5], [bx + bw * 0.3, by + bh * 0.42], [bx + bw * 0.55, by + bh * 0.56], [bx + bw * (0.08 + (it.len ?? 0.7)), by + bh * 0.5]], R, 2.2, K);
    return { ...it, bx, by, bw, bh, outline, tailPl, line };
  });
  return {
    id, from, to, mutesCaptions, layer,
    cues() { return sound ? B.map(b => cueOf(b.t, sound)[0]) : []; },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = outK;
      for (const b of B) {
        if (t < b.t) continue;
        const k = easeOutBack(clamp01((t - b.t) / 0.3), 1.2);
        ctx.save(); const ccx = b.bx + b.bw / 2, ccy = b.by + b.bh / 2; ctx.translate(ccx, ccy); ctx.scale(lerp(0.75, 1, k), lerp(0.75, 1, k)); ctx.translate(-ccx, -ccy); ctx.globalAlpha *= clamp01(k * 2);
        if (fill) { ctx.save(); ctx.fillStyle = fill; ctx.fillRect(b.bx, b.by, b.bw, b.bh); ctx.restore(); }
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.22)"; ctx.shadowBlur = 30 * K; ctx.shadowOffsetY = 12 * K;
        drawShape(ctx, { strokes: [...b.outline, ...b.tailPl], style: "marker", color, width, seed }, seg(t, b.t, b.t + 0.36));
        ctx.restore();
        if (b.typing) {
          for (let d = 0; d < 3; d++) { const ph = (t - b.t) * 5 - d * 0.9; const bounce = Math.max(0, Math.sin(ph)) * 18 * K; ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= 0.55 + 0.45 * Math.max(0, Math.sin(ph)); ctx.beginPath(); ctx.arc(b.bx + b.bw * (0.32 + d * 0.18), ccy - bounce, b.bh * 0.09, 0, 7); ctx.fill(); ctx.restore(); }
        } else drawShape(ctx, { strokes: [b.line], style: "marker", color, width: width * 0.8, seed: seed + 3 }, seg(t, b.t + 0.2, b.t + 0.6));
        ctx.restore();
      }
      ctx.restore();
    },
  };
}

export const cuesOf = beats => beats.flatMap(b => (typeof b.cues === "function" ? b.cues() : []));
