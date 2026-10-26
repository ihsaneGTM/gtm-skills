// Subtitles. On LinkedIn the video autoplays MUTED, so these are not a nicety:
// they are the only thing carrying the first three seconds. Non-negotiable on
// every vertical short.
//
// Style: one line, white, 800 weight, the accent word in yellow, a black
// outline so it survives any background. Karaoke (word-by-word yellow box) is
// available but was rejected in review — it reads as noisy on a talking head.
import fs from "node:fs";
import path from "node:path";
import { F, FACE, clamp01, easeOutQuint, easeInOutCubic, lerp, seg, spring, roundRect } from "./scene.mjs";

// Vertical short: high enough to clear the platform's own UI at the bottom of
// a 1080x1920 frame, low enough to stay off the speaker's chest. A landscape
// project passes its own geometry (render.mjs derives it from project.json).
const VERTICAL = { cx: 540, baseY: 1500, maxW: 950 };

export const STYLES = {
  clean:   { size: 66, weight: 800, fg: "#FFFFFF", dim: "#FFFFFF", stroke: 9, shadow: true, popFrom: 0.94, karaoke: false },
  karaoke: { size: 76, weight: 900, fg: "#FFFFFF", dim: "rgba(255,255,255,.62)", stroke: 12, shadow: true, popFrom: 0.82, karaoke: true },
  // 16:9 YouTube: no outline (a 9 px stroke reads as a meme at 1080p), the
  // separation comes from a two-layer shadow — the reference intro does the same
  yt:      { size: 66, weight: 800, fg: "#FFFFFF", dim: "#FFFFFF", stroke: 0, shadow: "strong", popFrom: 0.96, karaoke: false,
             font: s => FACE.sansBlack ? `400 ${s}px "${FACE.sansBlack}"` : F(800, s) },
  // `yt` when the caption band is BRIGHT. The reference intro put its line over a
  // dark laptop lid, where a shadow alone separates it; on a speaker in a white
  // t-shirt the band measures 154-190 luma and the shadow has nothing to bite on.
  // The stroke is drawn before the shadow is configured, so it stays a clean
  // outline rather than a second dark rim around every glyph.
  "yt-outline": { size: 66, weight: 800, fg: "#FFFFFF", dim: "#FFFFFF", stroke: 9, shadow: "strong", popFrom: 0.96, karaoke: false,
             font: s => FACE.sansBlack ? `400 ${s}px "${FACE.sansBlack}"` : F(800, s) },
  // THE CAPTION AS THE TYPOGRAPHY — the phrase fills the lower half in two or
  // three lines, the accent words twice the size of the others, every word popping in on its own onset,
  // and the whole thing blooming. It is not a subtitle any more, it is the design.
  hero: { size: 66, weight: 900, fg: "#FFFFFF", dim: "#FFFFFF", stroke: 0, shadow: "glow", popFrom: 0.90, karaoke: false,
             hero: { big: 2.0, lead: 0.96, maxW: 0.86 },
             font: s => FACE.sansBlack ? `400 ${s}px "${FACE.sansBlack}"` : F(900, s) },
  // the HANDWRITTEN edit (hand.mjs): the same white line in Kalam Bold, a size up
  // because a hand face has less x-height than Satoshi at the same nominal size
  "yt-hand": { size: 72, weight: 800, fg: "#FFFFFF", dim: "#FFFFFF", stroke: 0, shadow: "strong", popFrom: 0.96, karaoke: false,
             font: s => FACE.handBold ? `400 ${s}px "${FACE.handBold}"` : F(800, s) },
};

export function loadSubs(file = "subs.json") {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"));
}

function active(list, t) {
  let lo = 0, hi = list.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (t < list[m].s) hi = m - 1;
    else if (t > list[m].e) lo = m + 1;
    else return list[m];
  }
  return null;
}

export function drawSubs(ctx, t, subs, style = STYLES.clean, geom = VERTICAL, alphaMul = 1) {
  const c = active(subs, t);
  if (!c) return;
  if (style && style.hero) return drawHero(ctx, t, c, style, geom, alphaMul);
  const IN = 0.13, OUT = 0.10;
  const a = Math.min(easeOutQuint(clamp01((t - c.s) / IN)), 1 - easeInOutCubic(seg(t, c.e - OUT, c.e))) * clamp01(alphaMul);
  if (a <= 0.01) return;
  const { cx = 540, baseY = 1500, maxW = 950 } = geom || {};

  const S = style;
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.font = S.font ? S.font(S.size) : F(S.weight, S.size);

  const gap = S.size * 0.26;
  const parts = c.words.map(w => ({ ...w, width: ctx.measureText(w.w).width }));
  const total = parts.reduce((n, p) => n + p.width, 0) + gap * (parts.length - 1);
  const scale = total > maxW ? maxW / total : 1;      // a long chunk shrinks rather than running off frame
  const pop = S.karaoke ? spring(clamp01((t - c.s) / 0.26), 3.4, 6.0) : easeOutQuint(clamp01((t - c.s) / IN));

  ctx.translate(cx, baseY);
  ctx.scale(scale * lerp(S.popFrom, 1, pop), scale * lerp(S.popFrom, 1, pop));
  ctx.globalAlpha = a;

  let x = -total / 2;
  for (const p of parts) {
    const spoken = t >= p.s - 0.02;
    const isNow = spoken && t <= p.e + 0.08;
    let fg = S.fg, box = null;
    if (S.karaoke) {
      if (isNow) { box = "#FFD90D"; fg = "#141517"; }
      else if (p.hot) fg = "#FFD90D";
      else if (!spoken) fg = S.dim;
    } else if (p.hot) fg = "#FFD90D";

    if (box) {
      const pad = S.size * 0.16, h = S.size * 1.30;
      ctx.save();
      ctx.globalAlpha = a * easeOutQuint(clamp01((t - p.s + 0.02) / 0.10));
      roundRect(ctx, x - pad, -h / 2, p.width + pad * 2, h, S.size * 0.20);
      ctx.fillStyle = box; ctx.fill();
      ctx.restore();
    }
    ctx.lineJoin = "round"; ctx.miterLimit = 2; ctx.textAlign = "left";
    if (S.stroke > 0 && !box) {
      ctx.lineWidth = S.stroke; ctx.strokeStyle = "#0B0B0B";
      ctx.strokeText(p.w, x, 0);
    }
    if (S.shadow === "strong") {
      // one wide soft shadow, scaled with the size: legible on a white t-shirt
      // or a bright wall without any outline. (A second, tight pass used to sit
      // on top "for the edge" — it drew a dark rim that compression turned
      // into rough-looking glyph edges.)
      const k = S.size / 66;
      ctx.shadowColor = "rgba(0,0,0,.62)"; ctx.shadowBlur = 24 * k; ctx.shadowOffsetY = 8 * k;
    } else if (S.shadow) { ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4; }
    ctx.fillStyle = fg;
    ctx.fillText(p.w, x, 0);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
    x += p.width + gap;
  }
  ctx.restore();
}

// ======================================================================================
// THE HERO CAPTION — the phrase laid out as a block of two or three lines in the
// lower half, accent words nearly twice the size, each word popping in on the
// onset of the word it IS, the letters blooming. Layout is computed on the WHOLE
// chunk so nothing reflows as the words arrive.
// ======================================================================================
function drawHero(ctx, t, c, S, geom, alphaMul) {
  const { cx = 540, baseY = 1500, maxW = 950 } = geom || {};
  const H = S.hero, big = H.big ?? 1.9, lead = H.lead ?? 0.94;
  const wide = (H.maxW ?? 0.88) * (cx * 2);
  const OUT = 0.12;
  const a = clamp01(alphaMul) * (1 - easeInOutCubic(seg(t, c.e - OUT, c.e)));
  if (a <= 0.01) return;

  // measure every word at its own size
  const words = c.words.map(w => {
    const size = S.size * (w.hot ? big : 1);
    ctx.font = S.font ? S.font(size) : F(S.weight, size);
    return { ...w, size, width: ctx.measureText(w.w).width };
  });
  // greedy wrap
  const lines = [];
  let cur = [], curW = 0;
  for (const w of words) {
    const gap = w.size * 0.24;
    const add = (cur.length ? gap : 0) + w.width;
    if (cur.length && curW + add > wide) { lines.push({ words: cur, width: curW }); cur = []; curW = 0; }
    curW += (cur.length ? gap : 0) + w.width;
    cur.push(w);
  }
  if (cur.length) lines.push({ words: cur, width: curW });

  // heights, then draw from the bottom up
  const heights = lines.map(l => Math.max(...l.words.map(w => w.size)) * lead);
  const total = heights.reduce((n, h) => n + h, 0);
  let y = baseY - total + heights[0] / 2;
  ctx.save();
  ctx.textBaseline = "middle";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    let x = cx - l.width / 2;
    for (const w of l.words) {
      const k = spring(clamp01((t - (w.s - 0.06)) / 0.34), 3.2, 5.4);
      if (k > 0.004) {
        const f = S.font ? S.font(w.size) : F(S.weight, w.size);
        ctx.font = f;
        const sc = lerp(S.popFrom ?? 0.9, 1, Math.min(1, k));
        ctx.save();
        ctx.globalAlpha = a * clamp01(k * 1.6);
        ctx.translate(x + w.width / 2, y);
        ctx.scale(sc, sc);
        // the bloom: two wide white passes, a dark one for separation, then the letter
        for (const [blur, col, off] of [[w.size * 0.95, "rgba(255,255,255,.50)", 0], [w.size * 0.34, "rgba(255,255,255,.65)", 0], [w.size * 0.26, "rgba(0,0,0,.45)", w.size * 0.09], [0, "transparent", 0]]) {
          ctx.shadowColor = col; ctx.shadowBlur = blur; ctx.shadowOffsetY = off;
          ctx.fillStyle = w.hot ? (S.fg ?? "#fff") : (S.fg ?? "#fff");
          ctx.fillText(w.w, -w.width / 2, 0);
        }
        ctx.restore();
      }
      x += w.width + w.size * 0.24;
    }
    y += (heights[i] + (heights[i + 1] ?? 0)) / 2;
  }
  ctx.restore();
}
