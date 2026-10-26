// Kinetic typography for a LANDSCAPE talking head (16:9). The figure that
// carries a YouTube intro: a stacked lockup of two or three lines in mixed
// type — heavy sans, an italic serif accent, one word in the house yellow —
// placed in the empty air beside the speaker's head, each line landing on the
// onset of the word it quotes.
//
//   title({
//     from, to, x: 0.06, y: 0.26, align: "left",
//     lines: [
//       { t: 1.02, runs: [{ text: "Si tu", k: "sans", size: 60 }] },
//       { t: 1.40, runs: [{ text: "viens de lancer", k: "serif", size: 88 }] },
//       { t: 1.95, runs: [{ text: "ton ", k: "sans", size: 96 }, { text: "SAAS", k: "sans", size: 112, hot: true }] },
//     ],
//   })
//
// Rules, from the vertical short and from the reference intro:
//   - a line lands ON its word onset (40 ms early is fine, 120 ms late reads as lag)
//   - the block is the caption for that phrase: render.mjs mutes the bottom
//     captions while a title is up, so the sentence is never written twice
//   - no plate. Separation from a bright wall comes from a soft radial dim
//     drawn behind the block plus a two-layer shadow on the glyphs
//   - x/y are FRACTIONS of the frame so the same plan renders at any size;
//     run sizes are PIXELS AT 1080p — plan.mjs multiplies them by width/1920,
//     and every px constant in here scales the same way (K)
import { C, F, FACE, clamp01, easeOutCubic, easeInOutCubic, easeOutQuint, spring, lerp, seg, roundRect, drawIcon } from "./scene.mjs";

// Type. Satoshi Black (geometric, heavy, round — the register of the
// reference intro) and Spectral Bold Italic (a contemporary serif with real
// presence next to a black sans) are registered from their files in scene.mjs;
// without them, Inter 900 and the system Bodoni italic. Inter + Bodoni Book
// Italic shipped once and came back rejected: the fonts did not look good.
export const TYPE = {
  sans:  (s, w = 900) => FACE.sansBlack ? `400 ${s}px "${FACE.sansBlack}"` : F(w, s, 'Inter, "Helvetica Neue", Arial'),
  serif: (s, light = false) => (light && FACE.serifLightItalic) ? `400 ${s}px "${FACE.serifLightItalic}"`
    : FACE.serifItalic ? `400 ${s}px "${FACE.serifItalic}"` : `italic 400 ${s}px "Bodoni 72", Didot, Georgia, serif`,
  // the handwriting family (hand.mjs) — same fallback shape so a missing file
  // degrades to a system hand rather than to a crash
  hand: s => FACE.hand ? `400 ${s}px "${FACE.hand}"` : `400 ${s}px "Bradley Hand", "Noteworthy", cursive`,
  handBold: s => FACE.handBold ? `400 ${s}px "${FACE.handBold}"` : `700 ${s}px "Bradley Hand", "Noteworthy", cursive`,
  handLight: s => FACE.handLight ? `400 ${s}px "${FACE.handLight}"` : `300 ${s}px "Bradley Hand", "Noteworthy", cursive`,
  marker: s => FACE.marker ? `400 ${s}px "${FACE.marker}"` : `700 ${s}px "Marker Felt", "Impact", sans-serif`,
  // the vertical headline (headline.mjs): Impact for the words, Snell Roundhand for the accent
  impact: s => FACE.impact ? `400 ${s}px "${FACE.impact}"` : `900 ${s}px Impact, "Arial Narrow", sans-serif`,
  script: (s, black = false) => (black && FACE.scriptBlack) ? `400 ${s}px "${FACE.scriptBlack}"`
    : FACE.script ? `400 ${s}px "${FACE.script}"` : `italic 700 ${s}px "Snell Roundhand", "Apple Chancery", cursive`,
};
const YELLOW = C.yellow;

export function fontFor(run) {
  if (run.k === "serif") return TYPE.serif(run.size, !!run.light);
  if (run.k === "hand") return TYPE.hand(run.size);
  if (run.k === "handBold") return TYPE.handBold(run.size);
  if (run.k === "handLight") return TYPE.handLight(run.size);
  if (run.k === "marker") return TYPE.marker(run.size);
  if (run.k === "impact") return TYPE.impact(run.size);
  if (run.k === "script") return TYPE.script(run.size, !!run.black);
  return TYPE.sans(run.size, run.weight ?? 900);
}

// A run whose TEXT is computed per frame — a number climbing to the figure the
// plan authored:
//
//   sans("1.00M", 190, { hot: true, count: { to: 1e6, dur: 0.69,
//                                            fmt: v => (v / 1e6).toFixed(2) + "M" } })
//
// It LANDS on `text`, so the resting frame is exactly what was written and the
// fit check — which measures the block at rest — stays valid. Two rules the
// first pass got wrong: the format must keep a CONSTANT number of characters
// (a raw `1 000 000` is nine glyphs and cannot live beside the speaker's head, and a
// format that gains a digit mid-roll makes the number jitter instead of climb),
// and the easing power belongs to the plan, because the tick cues in edl.mjs are
// the same curve read backwards — the clicks have to slow down as the digits do.
// `t0` is the ROW's onset: `row(t, ...runs)` puts the time on the line, not on
// each run, so a counter written as a plain run has no `t` of its own and would
// otherwise start its roll at zero — i.e. arrive already finished.
export function runText(r, t, t0) {
  if (!r.count || t == null) return r.text;
  const c = r.count;
  const u = clamp01((t - (r.t ?? c.t ?? t0 ?? 0)) / (c.dur ?? 0.6));
  if (u >= 1) return r.text;
  const v = (c.from ?? 0) + ((c.to ?? 0) - (c.from ?? 0)) * (1 - Math.pow(1 - u, c.p ?? 1.8));
  return c.fmt ? c.fmt(v) : String(Math.round(v));
}

// The geometry of a block at rest, in frame pixels — what the fit check reads
// to keep every row out of the speaker's silhouette at the block's peak zoom.
export function layoutBlock(ctx, { x = 0.06, y = 0.26, align = "left", lines, frame = { w: 1920, h: 1080 }, leading = 0.98 }) {
  ctx.save(); ctx.textBaseline = "alphabetic";
  const laid = lines.map(l => ({ ...l, ...measureLine(ctx, l) }));
  const blockW = Math.max(...laid.map(l => l.width));
  const ax = x * frame.w, ay = y * frame.h;
  const bx = align === "right" ? ax - blockW : align === "center" ? ax - blockW / 2 : ax;
  let cursorY = ay;
  const rows = laid.map(l => {
    const top = cursorY, h = l.size * leading;
    cursorY += h;
    const rx = align === "right" ? bx + blockW - l.width : align === "center" ? bx + (blockW - l.width) / 2 : bx;
    return { text: l.runs.map(r => r.text).join(""), x0: rx, x1: rx + l.width, y0: top, y1: top + l.size * 0.92, size: l.size };
  });
  ctx.restore();
  return { rows, x0: bx, x1: bx + blockW, y0: ay, y1: cursorY };
}

// Measure a composed line: total advance and the tallest run.
// `t` is optional: with it a counting run measures its CURRENT text, without it
// (layoutBlock, i.e. the fit check) its resting text.
export function measureLine(ctx, line, t) {
  let w = 0, hmax = 0;
  const parts = line.runs.map(r => {
    ctx.font = fontFor(r);
    const text = runText(r, t, line.t);
    const m = ctx.measureText(text);
    const box = r.box ? r.size * 0.36 : 0;             // a boxed word carries side padding
    w += m.width + box;
    hmax = Math.max(hmax, r.size);
    return { ...r, text, width: m.width, box };
  });
  return { parts, width: w, size: hmax };
}

// The soft darkening behind a block: an ellipse of shadow, feathered to
// nothing, that reads as depth rather than as a card.
function dimBehind(ctx, cx, cy, rx, ry, a) {
  if (a <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cx, cy); ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.55, "rgba(0,0,0,.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function glyphs(ctx, text, x, y, fill, k = 1) {
  // ONE wide, soft shadow for separation. The first cut stacked a tight 5 px
  // shadow on top of it "for the edge": on a mid-grey wall that second pass is
  // a dark rim around every glyph, and once x264 has been at it the rim is
  // what reads as "pixelated edges". Edges come from the glyph, not a shadow.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 30 * k; ctx.shadowOffsetY = 12 * k;
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
  ctx.restore();
}

export function title({
  id = "title", from, to, x = 0.06, y = 0.26, align = "left", lines,
  frame = { w: 1920, h: 1080 },
  dim = 0.34, exit = 0.36, leading = 0.98, enter = 0.42, mutesCaptions = true,
  layer = "over", emerge = 0,
}) {
  return {
    id, from, to, mutesCaptions, layer,
    spec: { x, y, align, lines, frame, leading },        // read by fit.mjs
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save();
      ctx.textBaseline = "alphabetic";
      const W = frame.w, H = frame.h, K = W / 1920;   // every px constant below was tuned at 1080p
      const ax = x * W, ay = y * H;

      // lay the block out once per frame (cheap: a handful of measureText)
      const laid = lines.map(l => ({ ...l, ...measureLine(ctx, l, t) }));
      const blockW = Math.max(...laid.map(l => l.width));
      let cursorY = ay;
      const rows = laid.map(l => {
        const baseline = cursorY + l.size * 0.80;          // cap-height sits on the anchor
        cursorY += l.size * leading;
        return { ...l, baseline };
      });
      const blockH = cursorY - ay;
      const bx = align === "right" ? ax - blockW : align === "center" ? ax - blockW / 2 : ax;

      // the block's own entrance drives the dim; lines then land one by one
      const firstIn = spring(clamp01((t - rows[0].t) / enter));
      const drift = (1 - outK) * -18 * K;
      // With `emerge` (a fraction of the frame width) the whole block starts
      // BEHIND the speaker and settles outward — away from the speaker, so a
      // left-aligned block comes from the right and a right-aligned one from the left. Only meaningful with `layer: "under"`
      // and a person matte; without them it is a block sliding over the speaker's face.
      // A travel is slower than a pop (enter × 1.7), and it REPLACES the runs'
      // own slide: two motions on one arrival read as a wobble.
      const emK = emerge ? easeOutQuint(clamp01((t - rows[0].t) / (enter * 1.7))) : 1;
      if (emerge) ctx.translate((1 - emK) * emerge * W * (align === "right" ? -1 : 1), 0);
      // wide and low-contrast on purpose: an ellipse tight on the block reads
      // as a smudge on a flat wall; a broad falloff reads as the room's light
      dimBehind(ctx, bx + blockW / 2, ay + blockH * 0.62 + drift, blockW * 0.95 + 260 * K, blockH * 1.05 + 220 * K,
        dim * clamp01(firstIn * 1.4) * outK);

      for (const row of rows) {
        const k = spring(clamp01((t - row.t) / enter));
        if (k <= 0.005) continue;
        const rowX = align === "right" ? bx + blockW - row.width : align === "center" ? bx + (blockW - row.width) / 2 : bx;
        let cx = rowX;
        for (const r of row.parts) {
          // a run may carry its own onset (one word landing after the rest of its line)
          const rk = r.t != null ? spring(clamp01((t - r.t) / enter)) : k;
          if (rk <= 0.005) { cx += r.width + r.box; continue; }
          const slide = emerge ? 0 : (1 - easeOutQuint(clamp01(rk))) * 44 * K;
          const sc = lerp(0.72, 1, clamp01(rk));                 // a real pop, not a fade
          const rot = r.hot ? (1 - easeOutQuint(clamp01(rk))) * -0.06 : 0;
          ctx.save();
          ctx.globalAlpha = clamp01(rk * 1.6) * outK;
          const pivotX = cx + (r.width + r.box) / 2, pivotY = row.baseline - r.size * 0.36;
          ctx.translate(pivotX, pivotY + slide + drift); ctx.scale(sc, sc); ctx.rotate(rot); ctx.translate(-pivotX, -pivotY);
          ctx.font = fontFor(r);
          const fill = r.color ?? (r.hot ? YELLOW : "#FFFFFF");
          if (r.box) {
            // the highlighter: yellow pill behind dark glyphs
            const pad = r.size * 0.18, h = r.size * 1.16;
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 22 * K; ctx.shadowOffsetY = 8 * K;
            roundRect(ctx, cx, row.baseline - r.size * 0.86, r.width + pad * 2, h, r.size * 0.16);
            ctx.fillStyle = YELLOW; ctx.fill();
            ctx.restore();
            ctx.fillStyle = "#141517"; ctx.fillText(r.text, cx + pad, row.baseline);
          } else {
            glyphs(ctx, r.text, cx, row.baseline, fill, K);
            if (r.underline) {
              const uk = easeOutQuint(clamp01((t - (r.t ?? row.t) - 0.22) / 0.42));
              if (uk > 0) {
                ctx.save();
                ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 10 * K; ctx.shadowOffsetY = 4 * K;
                ctx.fillStyle = YELLOW;
                roundRect(ctx, cx, row.baseline + r.size * 0.12, r.width * uk, Math.max(5, r.size * 0.07), 4 * K); ctx.fill();
                ctx.restore();
              }
            }
          }
          ctx.restore();
          cx += r.width + r.box;
        }
      }
      ctx.restore();
    },
  };
}

// A single word or short phrase that stamps onto the frame — bigger, centered,
// one beat. For the payoff word, not for every sentence.
export function stamp({ id = "stamp", from, to, at, text, x = 0.5, y = 0.22, size = 132, k = "sans", hot = false,
  frame = { w: 1920, h: 1080 }, exit = 0.30, dim = 0.5, mutesCaptions = true }) {
  return {
    id, from, to, mutesCaptions,
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      const kk = spring(clamp01((t - at) / 0.42), 3.4, 5.6);
      if (kk <= 0.005 || outK <= 0.005) return;
      ctx.save();
      ctx.textBaseline = "middle"; ctx.textAlign = "center";
      ctx.font = k === "serif" ? TYPE.serif(size) : TYPE.sans(size, 900);
      const w = ctx.measureText(text).width;
      const cx = x * frame.w, cy = y * frame.h, K = frame.w / 1920;
      dimBehind(ctx, cx, cy, w * 0.75 + 200 * K, size * 1.1 + 120 * K, dim * clamp01(kk * 1.4) * outK);
      ctx.globalAlpha = clamp01(kk * 1.5) * outK;
      const sc = lerp(1.22, 1, clamp01(kk));
      ctx.translate(cx, cy); ctx.scale(sc, sc);
      glyphs(ctx, text, 0, 0, hot ? YELLOW : "#FFFFFF", K);
      ctx.restore();
    },
  };
}

// A SCREEN set into the room, for a beat that plays BEHIND the speaker
// (`layer: "under"` + a person matte). What is inside it is REAL: a capture of
// the product, a frame of the speaker's own footage — the skill's rule holds, the graphics
// are our products and not drawings of them.
//
//   screen({ from, to, at, x: 0.055, y: 0.13, w: 0.465, img: () => CAPTURE })
//   screen({ from, to, at, x: 0.055, y: 0.13, w: 0.475, img: t => CLIP.at(t) })
//
// `img` is a GETTER OF TIME, not an image: plan.mjs loads the file (or the frame
// folder, see loadClip) in its `load()` hook, which render.mjs awaits, and the
// beat reads it at draw time — so the same figure holds a still or a recording. The capture is
// drawn INSIDE the canvas, clipped to the rounded rect, rather than punched out
// as a hole for ffmpeg to fill — the frame slides and scales on entry, and a
// hole positioned by ffmpeg would sit still while the frame moved.
export function screen({
  id = "screen", from, to, at = from, x = 0.055, y = 0.13, w = 0.465, ratio = 0.62,
  frame = { w: 1920, h: 1080 }, enter = 0.46, exit = 0.34, chrome = true, img = null,
  mutesCaptions = false, layer = "under", label = null,
  // Things like a screenshot coming out from behind the speaker (2026-09-29):
  // `emergeFrom` is the x (fraction of the frame) the window's left edge STARTS at —
  // inside the speaker's silhouette — and it slides out to `x` while it lands, so with
  // `layer: "under"` it comes out from behind the speaker instead of popping in beside them.
  // `exitMode: "slide"` sends it back the way it came (a fade reads as a cut-away).
  emergeFrom = null, exitMode = "fade",
}) {
  const K = frame.w / 1920;
  const W = w * frame.w, H = W * ratio;
  const X0 = x * frame.w, Y = y * frame.h;
  const bar = chrome ? 44 * K : 0, pad = 10 * K;
  return {
    id, from, to, mutesCaptions, layer,
    draw(ctx, t) {
      if (t < from || t > to) return;
      const k = easeOutQuint(clamp01((t - at) / enter));
      const eK = easeInOutCubic(seg(t, to - exit, to));
      const outK = exitMode === "slide" ? 1 : 1 - eK;
      if (k <= 0.005 || outK <= 0.005) return;
      // the travel: from behind the speaker out to x on the way in, back behind them on the way out
      const X = emergeFrom == null ? X0
        : lerp(emergeFrom * frame.w, X0, k) + (exitMode === "slide" ? eK * (emergeFrom * frame.w - X0) : 0);
      ctx.save();
      ctx.globalAlpha = (emergeFrom == null ? clamp01(k * 1.4) : clamp01(k * 3)) * outK;
      const cx = X + W / 2, cy = Y + bar + H / 2, sc = lerp(emergeFrom == null ? 0.93 : 0.97, 1, k);
      ctx.translate(cx, cy + (emergeFrom == null ? (1 - k) * 30 * K : 0)); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 60 * K; ctx.shadowOffsetY = 26 * K;
      roundRect(ctx, X - pad, Y, W + pad * 2, H + bar + pad, 22 * K);
      ctx.fillStyle = "#12131A"; ctx.fill();
      ctx.shadowColor = "transparent";
      roundRect(ctx, X - pad, Y, W + pad * 2, H + bar + pad, 22 * K);
      ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.lineWidth = 2 * K; ctx.stroke();
      if (chrome) {
        ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c, i) => {
          ctx.beginPath(); ctx.arc(X + (16 + i * 22) * K, Y + bar / 2, 6.5 * K, 0, Math.PI * 2);
          ctx.fillStyle = c; ctx.fill();
        });
        if (label) {
          ctx.font = F(600, 20 * K); ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(255,255,255,.55)";
          ctx.fillText(label, X + W / 2, Y + bar / 2);
        }
      }
      // the getter receives the TIME, so it can be a clip: img: t => CLIP.at(t)
      const image = typeof img === "function" ? img(t) : img;
      if (image) {
        ctx.save();
        roundRect(ctx, X, Y + bar, W, H, 12 * K); ctx.clip();
        // cover: fill the rect without distorting the capture
        const s = Math.max(W / image.width, H / image.height);
        const iw = image.width * s, ih = image.height * s;
        ctx.drawImage(image, X + (W - iw) / 2, Y + bar + (H - ih) / 2, iw, ih);
        ctx.restore();
      } else {
        ctx.fillStyle = "#1A1C24"; roundRect(ctx, X, Y + bar, W, H, 12 * K); ctx.fill();
      }
      ctx.restore();
    },
  };
}

// THE SAME SCREEN, BUT IT GROWS UNTIL IT IS THE FRAME — one continuous geometry,
// no hand-off. The first cut of this move used screen() for the arrival and a
// second beat for the growth: the window faded out over 0.34 s while a slightly
// different rect (no chrome, image not inset under the title bar) grew in its
// place, and the join read as an odd interruption (2026-09-07, at 0:18).
// So ONE draw function owns the whole move — the bezel, the title bar, the corner
// radius and the shadow all interpolate to nothing as the picture fills the frame.
// Two beats are returned only because the LAYER has to change: behind the speaker
// while it sits in the room, in front of them once it is bigger than they are.
export function screenGrow({
  id = "screengrow", from, to, at = from, x = 0.055, y = 0.13, w = 0.465, ratio = 0.62,
  frame = { w: 1920, h: 1080 }, enter = 0.46, exit = 0.34, chrome = true, img = null, label = null,
  growAt, growDur = 0.46, mutesCaptions = false,
  exitMode = "fade",     // "slide": it leaves the way it came, to the left — a fade
                         // on a full-frame screen was rejected (2026-09-07)
}) {
  const K = frame.w / 1920, FW = frame.w, FH = frame.h;
  const W0 = w * FW, H0 = W0 * ratio, X0 = x * FW, Y0 = y * FH;
  const bar0 = chrome ? 44 * K : 0, pad0 = 10 * K;
  const gAt = growAt ?? to;
  function draw(ctx, t) {
    if (t < from || t > to) return;
    const k = easeOutQuint(clamp01((t - at) / enter));                 // the arrival
    const g = easeInOutCubic(clamp01((t - gAt) / growDur));            // the growth
    const eK = easeInOutCubic(seg(t, to - exit, to));         // 0 → 1 over the exit
    const outK = exitMode === "slide" ? 1 : 1 - eK;
    if (k <= 0.005 || outK <= 0.005) return;
    // everything the window is made of, interpolated to nothing
    const bar = bar0 * (1 - g), pad = pad0 * (1 - g);
    const X = lerp(X0, 0, g), Y = lerp(Y0, 0, g);
    const Wc = lerp(W0, FW, g), Hc = lerp(H0, FH, g);
    const r = 22 * K * (1 - g), ri = 12 * K * (1 - g);
    ctx.save();
    ctx.globalAlpha = clamp01(k * 1.4) * outK;
    // the exit as a MOVE: the whole thing travels off to the left, picture included
    if (exitMode === "slide" && eK > 0) ctx.translate(-easeInOutCubic(eK) * (FW + Wc * 0.1), 0);
    if (g < 0.999) {
      const cx = X + Wc / 2, cy = Y + bar + Hc / 2, sc = lerp(0.93, 1, k);
      ctx.translate(cx, cy + (1 - k) * 30 * K); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      ctx.shadowColor = `rgba(0,0,0,${(0.5 * (1 - g)).toFixed(3)})`; ctx.shadowBlur = 60 * K * (1 - g); ctx.shadowOffsetY = 26 * K * (1 - g);
      roundRect(ctx, X - pad, Y, Wc + pad * 2, Hc + bar + pad, r);
      ctx.fillStyle = "#12131A"; ctx.fill();
      ctx.shadowColor = "transparent";
      if (r > 0.5) { roundRect(ctx, X - pad, Y, Wc + pad * 2, Hc + bar + pad, r); ctx.strokeStyle = `rgba(255,255,255,${(0.15 * (1 - g)).toFixed(3)})`; ctx.lineWidth = 2 * K; ctx.stroke(); }
      if (chrome && g < 0.45) {
        const ca = 1 - g / 0.45;
        ctx.save(); ctx.globalAlpha *= ca;
        ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c, i) => {
          ctx.beginPath(); ctx.arc(X + (16 + i * 22) * K, Y + bar / 2, 6.5 * K, 0, Math.PI * 2);
          ctx.fillStyle = c; ctx.fill();
        });
        if (label) {
          ctx.font = F(600, 20 * K); ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillText(label, X + Wc / 2, Y + bar / 2);
        }
        ctx.restore();
      }
    }
    const image = typeof img === "function" ? img(t) : img;
    if (image) {
      ctx.save();
      if (ri > 0.5) { roundRect(ctx, X, Y + bar, Wc, Hc, ri); ctx.clip(); }
      else { ctx.beginPath(); ctx.rect(X, Y + bar, Wc, Hc); ctx.clip(); }
      const s = Math.max(Wc / image.width, Hc / image.height);
      const iw = image.width * s, ih = image.height * s;
      ctx.drawImage(image, X + (Wc - iw) / 2, Y + bar + (Hc - ih) / 2, iw, ih);
      ctx.restore();
    }
    ctx.restore();
  }
  // behind the speaker until the growth starts, in front after — the geometry is
  // the same function on both sides of the switch, so nothing jumps
  return [
    { id: id + "-u", from, to: +gAt.toFixed(3), layer: "under", mutesCaptions: false, cues: () => [], draw },
    { id: id + "-o", from: +gAt.toFixed(3), to, layer: "over", mutesCaptions, cues: () => [], draw },
  ];
}

// ICON CHIPS THAT COME OUT FROM BEHIND THE SPEAKER — `layer: "under"` + the person
// matte, so each one slides out of the speaker's silhouette instead of appearing on
// top of it. The same treatment as the screen, which is what the review asked for:
// logos coming out from behind the speaker, like the video behind them.
//
//   chips({ from, to, x: 0.665, y: 0.20, frame, items: [
//     { kind: "linkedin", text: "LinkedIn", t: at(36.48) },
//     { kind: "mail",     text: "Email",    t: at(37.16) },
//     { kind: "phone",    text: "Phone",    t: at(38.56) },
//   ]})
//
// One chip per thing the speaker NAMES, landing on the word — three names, three chips,
// not a grid of everything the product does. `fromX` is where they start, i.e.
// where the speaker is: read it off the frame rather than assuming 0.50, because
// the camera's anchor moves them.
export function chips({
  id = "chips", from, to, items = [], size = 150, frame = { w: 1920, h: 1080 },
  enter = 0.46, exit = 0.30, mutesCaptions = false, layer = "under",
  glow = null,          // a halo instead of the drop shadow — for a dark room (neon.mjs)
}) {
  const K = frame.w / 1920, S = size * K;
  return {
    id, from, to, mutesCaptions, layer,
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      for (const it of items) {
        const t0 = it.t ?? from;
        const k = easeOutQuint(clamp01((t - t0) / enter));
        if (k <= 0.005) continue;
        const img = typeof it.img === "function" ? it.img() : it.img;
        const cx = lerp(it.fromX ?? 0.50, it.x, k) * frame.w;
        const cy = (it.y + (1 - k) * 0.022) * frame.h;
        const rot = ((it.rot ?? 0) * (1.7 - 0.7 * k)) * Math.PI / 180;
        const s = S * lerp(0.84, 1, k), h = s / 2;
        ctx.save();
        ctx.globalAlpha = clamp01(k * 1.5) * outK;
        ctx.translate(cx, cy); ctx.rotate(rot);
        ctx.shadowColor = glow ?? "rgba(0,0,0,.42)"; ctx.shadowBlur = (glow ? 70 : 40) * K; ctx.shadowOffsetY = glow ? 0 : 16 * K;
        if (img) ctx.drawImage(img, -h, -h, s, s);
        else { ctx.shadowColor = "transparent"; drawIcon(ctx, it.kind, 0, 0, s); }
        ctx.restore();
      }
    },
  };
}

// ONE VERY LARGE GLYPH that rises from behind the speaker and takes the frame. The
// answer to a beat that would otherwise be a fourth left-then-right text block
// with a fourth zoom, which the review called one too many: put something very
// big behind the speaker that takes up a lot of room, such as a big number 0.
//
//   hero({ from, to, at, text: "0", x: 0.055, y: 0.045, size: 1088, frame })
//
// `size` is the FONT size at 1080p; the cap height comes out at about 0.78 of it,
// so 1088 × (2560/1920) = 1450 px of type and a 1131 px numeral, four fifths of
// the frame height. `x`/`y` are the LEFT EDGE and the CAP TOP, not a centre —
// with a glyph this big a centre is impossible to reason about against the
// speaker's silhouette. It carries NO words: adding them back rebuilds the block
// the review just rejected, and the captions already say the sentence, so `mutesCaptions` is off.
export function hero({
  id = "hero", from, to, at = from, text = "0", x = 0.055, y = 0.045, size = 1088,
  color = YELLOW, k: kind = "sans", frame = { w: 1920, h: 1080 },
  enter = 0.62, exit = 0.34, rise = 0.09, mutesCaptions = false, layer = "under",
}) {
  const K = frame.w / 1920, S = Math.round(size * K);
  return {
    id, from, to, mutesCaptions, layer,
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      const k = easeOutQuint(clamp01((t - at) / enter));
      if (k <= 0.005 || outK <= 0.005) return;
      ctx.save();
      ctx.textBaseline = "alphabetic";
      ctx.font = kind === "serif" ? TYPE.serif(S) : TYPE.sans(S);
      const m = ctx.measureText(text);
      const cap = m.actualBoundingBoxAscent;
      const bx = x * frame.w, baseline = y * frame.h + cap;
      ctx.globalAlpha = clamp01(k * 1.3) * outK;
      const sc = lerp(0.90, 1, k), dy = (1 - k) * rise * frame.h;
      const px = bx + m.width / 2, py = baseline - cap / 2;
      ctx.translate(px, py + dy); ctx.scale(sc, sc); ctx.translate(-px, -py);
      glyphs(ctx, text, bx, baseline, color, K * 2.4);   // a shape this big wants a bigger shadow
      ctx.restore();
    },
  };
}

// A CAMERA FLASH on a cut (2026-09-29) — use the camera flash for the shot
// change, from the SFX pack's tutorial the reviewer sent: "use the flash sound
// effect for quick cuts". Measured frame by frame on that reference (24 fps, mean
// luma): 22 → 83 → 208 → 209 → 88 → 31. So the frame blows out in about two
// frames, holds, the CUT happens UNDER the white (the second white frame already
// shows the new shot), and it falls back in about two more; the peak is ~0.8
// white, not 1.0, so the picture stays faintly there. Drawn on the over layer:
// it covers the titles too, as a real flash would. `at` = the cut. `sound` is the
// flash's own cue (a supplied sample, its transient at `align` s into the file).
export function flash({ id = "flash", at, frame = { w: 1080, h: 1920 }, up = 0.075, hold = 0.045, down = 0.095,
  peak = 0.82, color = "255,255,255", sound = null, gain = -6, align = 0 }) {
  const top0 = at - hold / 2, top1 = at + hold / 2;
  const from = +(top0 - up).toFixed(3), to = +(top1 + down).toFixed(3);
  return {
    id, from, to, layer: "over", mutesCaptions: false,
    cues() { return sound ? [{ t: at, kind: sound, gain, align }] : []; },
    draw(ctx, t) {
      if (t < from || t > to) return;
      // up: late and steep (the blow-out), down: fast then trailing (the eye adapting)
      const k = t < top0 ? Math.pow(clamp01((t - from) / up), 1.6)
        : t <= top1 ? 1 : 1 - easeOutCubic(clamp01((t - top1) / down));
      if (k <= 0.004) return;
      ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = `rgba(${color},${(peak * k).toFixed(3)})`;
      ctx.fillRect(0, 0, frame.w, frame.h); ctx.restore();
    },
  };
}
