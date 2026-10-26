// THE FIGURES OF THE VERTICAL LANGUAGE, with the explainer's light and motion (validated by Ihsane
// on 2026-10-05: the Pipecorn sales-calls intro, v6; SKILL.md "What was decided"). Use these in
// place of headlines(), stickers() and chips().
// Same layout, same timing, same sounds as the engine's (headline.mjs, hand.mjs stickers,
// titles.mjs chips): only how they are DRAWN changes, so occlusion.mjs and verbatim checks still
// read them the same way.
//   proHeadline / proHeadlines — every word with a shadow in two layers (contact + soft) instead
//     of one, a glow of its colour behind the yellow ones, a soft arrival (a short blur on the pop),
//     a real exit (the block lifts, grows 3 % and blurs out in 0.10 s, gone when the next screen's
//     first word lands: never two screens in the same place), and the GLITCH drawn on the one
//     word whose pop carries the pack's glitch
//   proStickers — the paper's stop-motion untouched (8 poses a second, the same settle), with a
//     shadow that behaves: far, soft and light while the sticker is in the air, tight once it lands
//   proChips — the real logo coming out from behind the speaker with motion blur, its two shadows,
//     a glow of its yellow, a gloss and a lit rim, a pop of light as it lands, a swish as it flies
import { C, spring as eSpring, easeOutQuint, easeInOutCubic, easeOutCubic } from "./scene.mjs";
import { headline as engineHeadline, layoutHeadline } from "./headline.mjs";
import { fontFor } from "./titles.mjs";
import * as H from "./hand.mjs";
import { clamp01, seg, lerp, EASE, textShadows, textGlow, silhouette, paintSprite, rrShape, shadow2, glow, gloss, popLight,
  motionBlur, subframes, roundRect, mx, rgba } from "./pro.mjs";

// ── HEADLINES ──────────────────────────────────────────────────────────────────────────────
// glitch: { t, dur, words: ["LAST", "VIDEO,"] } — an RGB split and torn slices on those words,
// decaying over `dur`, on the frame the pack's glitch transient lands
export function proHeadline(o) {
  const base = engineHeadline(o);
  const { frame = { w: 1080, h: 1920 }, enter = 0.26, color = "#FFFFFF", hot = C.yellow,
    shadow = 1, dim = 0.24, pop = 1.24, glitch = null, glowA = 0.30, blurIn = 0.09, exitDur = 0.10, offset = null } = o;
  const { from, to, spec } = base;
  let laid = null;
  base.draw = (ctx, t) => {
    if (t < from || t > to) return;
    const ex = seg(t, to - exitDur, exitDur);
    const outK = 1 - EASE.inCubic(ex);
    if (outK <= 0.005) return;
    const W = frame.w, K = W / 1080;
    ctx.save();
    ctx.textBaseline = "alphabetic";
    if (!laid) laid = layoutHeadline(ctx, spec);
    const first = laid[0], last = laid[laid.length - 1];
    const x0b = Math.min(...laid.map(r => r.x0)), x1b = Math.max(...laid.map(r => r.x1));
    const cx = (x0b + x1b) / 2, cy = (first.top + last.y1) / 2;
    if (offset) { const d = offset(t); ctx.translate(d.x ?? 0, d.y ?? 0); }
    if (ex > 0) {
      ctx.translate(cx, cy - 12 * K * EASE.outCubic(ex)); const s = 1 + 0.03 * ex; ctx.scale(s, s); ctx.translate(-cx, -cy);
    }
    // the wide soft darkening behind the block, as the engine draws it
    if (dim > 0) {
      const k0 = clamp01((t - (first.t ?? from)) / 0.18);
      const rx = (x1b - x0b) * 0.62 + 170 * K, ry = (last.y1 - first.top) * 0.62 + 150 * K;
      ctx.save();
      ctx.globalAlpha = dim * k0 * outK;
      ctx.translate(cx, cy); ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.55, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (const row of laid) {
      for (const p of row.parts) {
        const t0 = p.t ?? row.t ?? from;
        if (t < t0 - 0.001) continue;
        const u = clamp01((t - t0) / enter);
        const k = p.slam ? easeOutQuint(clamp01((t - t0) / 0.16)) : eSpring(u, 3.3, 5.6);
        const sc = p.slam ? lerp(1.9, 1, k) : lerp(pop, 1, clamp01(k));
        const a = clamp01((t - t0) / (p.slam ? 0.06 : 0.09));
        const rot = ((row.rot ?? 0) + (p.rot ?? 0)) * Math.PI / 180;
        const px = row.x0 + p.x0 + p.width / 2, py = row.baseline - (p.asc ?? p.size * 0.81) * 0.5;
        const font = fontFor(p), X0 = row.x0 + p.x0, Y0 = row.baseline;
        const fill = p.color ?? (p.hot ? hot : color);
        ctx.save();
        ctx.globalAlpha = a * outK;
        ctx.translate(px, py); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-px, -py);
        ctx.font = font;
        const age = t - t0;
        const blur = (age < blurIn ? (1 - age / blurIn) * 6 * K : 0) + (ex > 0 ? 9 * K * ex : 0);
        if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
        if (shadow > 0) {
          textShadows(ctx, p.text, font, X0, Y0, K, { k: shadow, contact: [5, 4, 0.52], soft: [24, 14, 0.5] });
          // the yellow words glow in their colour, brighter the moment they land
          if (p.hot && glowA > 0) textGlow(ctx, p.text, font, X0, Y0, K, fill, glowA + 0.35 * Math.pow(1 - clamp01(age / 0.4), 2), 26);
        }
        const gl = glitch && glitch.words.includes(p.text) && t >= glitch.t && t < glitch.t + glitch.dur ? 1 - (t - glitch.t) / glitch.dur : 0;
        if (gl > 0) drawGlitch(ctx, p.text, X0, Y0, p.size, fill, gl, Math.floor(t * 30) * 7 + p.text.length, K);
        else { ctx.fillStyle = fill; ctx.fillText(p.text, X0, Y0); }
        ctx.restore();
      }
    }
    ctx.restore();
  };
  return base;
}
// an RGB split and torn slices: the word as the pack's glitch sounds
function drawGlitch(ctx, text, x, y, size, fill, g, seed, K) {
  let s = seed >>> 0 || 1; const R = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const d = (6 + 12 * R()) * K * g;
  ctx.save();
  ctx.globalAlpha *= 0.85;
  ctx.fillStyle = "rgba(255,40,80,0.9)"; ctx.fillText(text, x - d, y);
  ctx.fillStyle = "rgba(40,220,255,0.9)"; ctx.fillText(text, x + d, y + d * 0.2);
  ctx.restore();
  // the word itself in torn horizontal slices
  const top = y - size * 0.86, hgt = size * 0.92, n = 5;
  for (let i = 0; i < n; i++) {
    const y0 = top + (i / n) * hgt, y1 = top + ((i + 1) / n) * hgt;
    const dx = (R() - 0.5) * 46 * K * g * (R() < 0.6 ? 1 : 0.2);
    ctx.save(); ctx.beginPath(); ctx.rect(x - 400 * K, y0, 4000 * K, y1 - y0 + 0.5); ctx.clip();
    ctx.fillStyle = fill; ctx.fillText(text, x + dx, y);
    ctx.restore();
  }
}
// One headline per phrase, back to back, as the engine's headlines() — but a screen now ENDS on
// the next screen's first word (its exit runs just before), so two screens never share the place
export function proHeadlines(screens, { frame, end, ...common } = {}) {
  return screens.map((s, i) => {
    const next = screens[i + 1];
    const first = x => x.from ?? Math.min(...x.lines.map(l => l.t));
    const from = first(s);
    const to = s.to ?? (next ? first(next) : end);
    return proHeadline({ ...common, ...s, frame, from: +(from - 0.02).toFixed(3), to: +to.toFixed(3) });
  });
}

// ── STICKERS on the paper ──────────────────────────────────────────────────────────────────
// the engine's stickers (the same poses, the same rattle of sounds) with a shadow that lifts
export function proStickers(o) {
  const base = H.stickers(o);
  const { from, to, items = [], size = 168, frame = { w: 1920, h: 1080 }, exit = 0.28, border = 0.09, stepFps = 0, settle = 0.62, seed = H.hash(o.id ?? "stickers") } = o;
  const K = frame.w / 1920, S = size * K, W = frame.w, Hh = frame.h, KS = frame.w / 1080;
  base.draw = (ctx, t) => {
    if (t < from || t > to) return;
    const tc = H.stepClock(t, stepFps);
    const outK = 1 - easeInOutCubic(seg(tc, to - exit, exit));
    if (outK <= 0.005) return;
    items.forEach((it, i) => {
      const t0 = it.t ?? from;
      const img = typeof it.img === "function" ? it.img() : it.img;
      if (tc < t0 - 1e-6) return;
      const u = clamp01((tc - t0) / settle);
      const lift = 1 - eSpring(u, 2.6, 4.0);             // 1 in the air → 0 landed, one overshoot the other way
      const R = H.rng(seed + i * 131 + Math.round(tc * stepFps)), j = 1 - u;
      const cx = it.x * W + (R() - 0.5) * 0.05 * S * j;
      const cy = it.y * Hh - 0.30 * S * lift + (R() - 0.5) * 0.05 * S * j;
      const rot = ((it.rot ?? 0) + 11 * lift + (R() - 0.5) * 3.2 * j) * Math.PI / 180;
      const s = S * (1 + 0.22 * lift), h = s / 2, b = s * border;
      const bw = s + 2 * b, rr = s * 0.2237 + b;
      const up = Math.max(0, lift);                       // how high it is above the paper
      ctx.save(); ctx.globalAlpha = outK;
      // the shadow on the PAPER, not on the sticker: it stays where the sticker will land
      // (lagging the lift), warm like a shadow on cream paper
      ctx.save();
      ctx.translate(it.x * W + (cx - it.x * W) * 0.4, it.y * Hh + (cy - it.y * Hh) * 0.25); ctx.rotate(rot * 0.85);
      const key = `stk${Math.round(bw)}`;
      const shape = rrShape(rr);
      paintSprite(ctx, silhouette(key, bw, bw, (4 + 14 * up) * KS, "rgb(54,40,20)", shape), 0.42 * (1 - 0.65 * up), 0, (3 + 30 * up) * KS);
      paintSprite(ctx, silhouette(key, bw, bw, (24 + 22 * up) * KS, "rgb(54,40,20)", shape), 0.30 * (1 - 0.35 * up), 0, (14 + 40 * up) * KS);
      ctx.restore();
      ctx.translate(cx, cy); ctx.rotate(rot);
      roundRect(ctx, -h - b, -h - b, bw, bw, rr); ctx.fillStyle = "#FFFFFF"; ctx.fill();
      if (img) ctx.drawImage(img, -h, -h, s, s);
      ctx.restore();
    });
  };
  return base;
}

// ── CHIPS: the real logo, out from behind the speaker ──────────────────────────────────────
export function proChips({ id = "chips", from, to, items = [], size = 150, frame = { w: 1920, h: 1080 },
  enter = 0.46, exit = 0.30, layer = "under", sound = true, fps = 30 }) {
  const K = frame.w / 1920, S = size * K, KS = frame.w / 1080;
  let CUES = null;
  const pose = (it, t) => {
    const t0 = it.t ?? from, k = easeOutQuint(clamp01((t - t0) / enter));
    return { k, cx: lerp(it.fromX ?? 0.5, it.x, k) * frame.w, cy: (it.y + (1 - k) * 0.022) * frame.h,
      rot: ((it.rot ?? 0) * (1.7 - 0.7 * k)) * Math.PI / 180, s: S * lerp(0.84, 1, k) };
  };
  const paint = (ctx, t, it, outK) => {
    const { k, cx, cy, rot, s } = pose(it, t);
    if (k <= 0.005) return;
    const img = typeof it.img === "function" ? it.img() : it.img;
    const r = s * 0.2237, shape = rrShape(r), t0 = it.t ?? from;
    ctx.save();
    ctx.globalAlpha = clamp01(k * 1.5) * outK;
    ctx.translate(cx, cy); ctx.rotate(rot);
    shadow2(ctx, KS, `chip${Math.round(s)}`, s, s, shape, "mid", 1);
    glow(ctx, KS, `chip${Math.round(s)}`, s, s, shape, "rgba(255,217,13,1)", 34, 0.30 + 0.35 * Math.pow(1 - clamp01((t - t0 - 0.12) / 0.5), 2));
    popLight(ctx, KS, t, t0 + 0.14, s * 0.95, { a: 0.5, dur: 0.42 });
    if (img) ctx.drawImage(img, -s / 2, -s / 2, s, s);
    gloss(ctx, KS, s, s, () => roundRect(ctx, -s / 2, -s / 2, s, s, r), { a: 0.18, rim: [0.7, 0.12], width: 2 });
    ctx.restore();
  };
  return {
    id, from, to, layer, mutesCaptions: false,
    cues() { return (CUES ??= sound ? items.map(it => mx("swish", (it.t ?? from) + 0.02)) : []); },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, exit));
      if (outK <= 0.005) return;
      for (const it of items) {
        // the slide out from behind the head is fast at first (outQuint): blurred like a shutter
        const a = pose(it, t - 0.25 / fps), b = pose(it, t + 0.25 / fps);
        const n = subframes(Math.hypot(b.cx - a.cx, b.cy - a.cy) + Math.abs(b.s - a.s));
        if (n > 1) {
          const m = Math.max(a.s, b.s) * 1.25 + 120 * KS;
          motionBlur(ctx, t, fps, n, (c, ti) => paint(c, ti, it, outK),
            { x: Math.min(a.cx, b.cx) - m, y: Math.min(a.cy, b.cy) - m, w: Math.abs(b.cx - a.cx) + 2 * m, h: Math.abs(b.cy - a.cy) + 2 * m });
        } else paint(ctx, t, it, outK);
      }
    },
  };
}
