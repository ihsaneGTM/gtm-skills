// board.mjs — a PAPER CARD laid over a region of the frame, with a hand-drawn diagram
// written on it element by element: each element lands on a word the speaker says, and
// each carries its own pen sound.
//
// WHY. During the shoot the speaker drove a whiteboard app in a browser window beside
// the webcam, in another language (the diagram labels plus the app's own help bar and
// buttons). The episode is in English, so the whole window is covered by this card and
// the diagram is rewritten in English, in pencil, on the speaker's words, with small
// pencil sounds as each element appears on screen.
// The webcam bubble and the yellow layout around the window stay exactly as shot.
//
//   board({ id, from, to, frame, rect: { x, y, w, h },        // FRAME fractions: the window
//           items: [                                           // CARD fractions below
//             { kind: "ellipse", at, cx, cy, rx, ry, dur },
//             { kind: "text", at, x, y, text, size, bold, italic, align, color, dt },
//             { kind: "text", x, y, parts: [{ text, at }, …] },   // one row written in pieces
//             { kind: "arrow", at, from: [x, y], to: [x, y], dur, bend },
//             { kind: "hatch", at, cx, cy, rx, ry, color, hatchColor, dur },  // marker-hatched ellipse
//             { kind: "check", at, cx, cy, s, color },
//           ] })
//
// The card ends on a HARD cut (`exit: 0`) when the source itself cuts away from the
// window — it never fades over the speaker's own edit. `levelTrim` keeps the pens small:
// the sounds are asked for, but as small sounds.
//
// `wipe` — when the source edit leaves the window through a TRANSITION instead of a cut
// (here the webcam bubble grows into the full frame while the window dissolves, 0.7 s), the
// card stays opaque and is CLIPPED by the growing picture, measured frame by frame:
//   wipe: { rect: [x0, y0, x1, y1], to: [0, 0, 1, 1], k: [[t, k], …], pad: 6 }
// `rect` is the bubble at rest (frame fractions), `to` where it ends, `k` the measured
// interpolation factor per output second (linear between rows). Wherever the bubble
// already is, the speaker's picture shows; wherever it is not yet, the card hides the
// dissolving source-language window. The card is skipped once the bubble covers it entirely.
import { INK, HAND_LEVELS, rng, hash, roughLine, roughEllipse, arrowStrokes, checkStrokes, drawShape, writeText, penSchedule, paperGrain } from "./hand.mjs";
import { TYPE } from "./titles.mjs";
import { clamp01, easeOutCubic, seg } from "./scene.mjs";

const rrect = (ctx, x, y, w, h, r) => {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export function board({
  id = "board", from, to, frame = { w: 1920, h: 1080 }, layer = "over", rect = { x: 0.04, y: 0.12, w: 0.65, h: 0.75 },
  radius = 14, tone = INK.paper, gridColor = INK.gridGrey, spacing = 44, shadow = 0.6, items = [],
  enter = 0, exit = 0, pen = "pencil", levelTrim = -4, sound = true, mutesCaptions = false, seed = hash(id), wipe = null,
}) {
  const W = frame.w, H = frame.h, K = W / 1920;
  const X = rect.x * W, Y = rect.y * H, CW = rect.w * W, CH = rect.h * H;
  const P = ([u, v]) => [X + u * CW, Y + v * CH];
  // every item's geometry is built ONCE, so its wobble never flickers
  const EL = items.map((it, i) => {
    const R = rng(seed + i * 31), color = it.color ?? INK.graphite;
    if (it.kind === "ellipse" || it.kind === "hatch") {
      const [cx, cy] = P([it.cx, it.cy]), rx = it.rx * CW, ry = it.ry * CH;
      const outline = { strokes: [roughEllipse(cx, cy, rx, ry, R, { K, r: it.r ?? 1 })], style: it.style ?? (it.kind === "hatch" ? "marker" : pen), color, width: it.width ?? (it.kind === "hatch" ? 7 : 4.4), seed: seed + i, K };
      let hatch = null;
      if (it.kind === "hatch") {
        const gap = (it.gap ?? 15) * K, lines = [];
        for (let d = -(rx + ry); d <= rx + ry; d += gap) lines.push(roughLine([cx + d - ry, cy - ry], [cx + d + ry, cy + ry], R, 0.5, K));
        hatch = { strokes: lines, style: "marker", color: it.hatchColor ?? color, width: it.hatchWidth ?? 6, seed: seed + i + 5, K };
      }
      return { ...it, outline, hatch, cx, cy, rx, ry, dur: it.dur ?? 0.5 };
    }
    if (it.kind === "arrow") return { ...it, shape: { strokes: arrowStrokes(P(it.from), P(it.to), R, { K, bend: it.bend ?? 0 }), style: it.style ?? "fineliner", color, width: it.width ?? 4.2, seed: seed + i, K }, dur: it.dur ?? 0.3 };
    if (it.kind === "check") { const [cx, cy] = P([it.cx, it.cy]); return { ...it, shape: { strokes: checkStrokes(cx, cy, (it.s ?? 0.05) * CH, R, 1, K), style: "marker", color: it.color ?? "#2E9E5B", width: it.width ?? 8, seed: seed + i, K }, dur: it.dur ?? 0.22 }; }
    if (it.kind === "text") {
      const parts = (it.parts ?? [{ text: it.text, at: it.at }]).map(p => { const dt = p.dt ?? it.dt ?? 0.045, sc = penSchedule(p.text, dt); return { ...p, dt, starts: sc.starts, writeDur: +(sc.total + 0.075).toFixed(3) }; });
      const size = (it.size ?? 28) * K;
      return { ...it, parts, size, font: it.bold ? TYPE.handBold(size) : TYPE.hand(size), at: Math.min(...parts.map(p => p.at)), color };
    }
    return it;
  });
  const penOf = e => e.pen ?? (e.kind === "arrow" ? "fineliner" : pen);
  return {
    id, from, to, layer, mutesCaptions,
    cues() {
      if (!sound) return [];
      const c = [];
      for (const e of EL) {
        if (e.kind === "text") for (const p of e.parts) c.push({ t: +p.at.toFixed(3), kind: `${penOf(e)}:${p.writeDur.toFixed(2)}:w`, gain: (HAND_LEVELS[penOf(e)] ?? HAND_LEVELS.pencil) + levelTrim });
        else if (e.kind === "hatch" || e.kind === "check") c.push({ t: +e.at.toFixed(3), kind: `marker:${e.dur.toFixed(2)}`, gain: HAND_LEVELS.marker + levelTrim });
        else if (e.kind === "ellipse" || e.kind === "arrow") c.push({ t: +e.at.toFixed(3), kind: `${penOf(e)}:${e.dur.toFixed(2)}`, gain: (HAND_LEVELS[penOf(e)] ?? HAND_LEVELS.pencil) + levelTrim });
      }
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const inK = enter > 0 ? easeOutCubic(seg(t, from, from + enter)) : 1, outK = exit > 0 ? 1 - seg(t, to - exit, to) : 1;
      if (inK <= 0 || outK <= 0) return;
      // the source transition: the bubble's rectangle at t, from the measured factor table
      let hole = null;
      if (wipe && t >= wipe.k[0][0]) {
        const T = wipe.k; let k = T[T.length - 1][1];
        for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const [ta, ka] = T[i - 1], [tb, kb] = T[i]; k = ka + (kb - ka) * clamp01((t - ta) / (tb - ta)); break; }
        const A = wipe.rect, B = wipe.to ?? [0, 0, 1, 1], pad = (wipe.pad ?? 6) * K;
        hole = [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k, A[3] + (B[3] - A[3]) * k].map((v, j) => (j % 2 ? v * H : v * W));
        hole = [hole[0] - pad, hole[1] - pad, hole[2] + pad, hole[3] + pad];
        if (hole[0] <= X && hole[1] <= Y && hole[2] >= X + CW && hole[3] >= Y + CH) return;   // covered: nothing left to draw
      }
      ctx.save(); ctx.globalAlpha *= inK * outK;
      if (hole) { ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(hole[0], hole[1], hole[2] - hole[0], hole[3] - hole[1]); ctx.clip("evenodd"); }
      const r = radius * K;
      // the card: cream, grained, quad-ruled, a soft shadow on the yellow around it
      if (shadow > 0) { ctx.save(); ctx.shadowColor = `rgba(0,0,0,${(0.30 * shadow).toFixed(3)})`; ctx.shadowBlur = 40 * K * shadow; ctx.shadowOffsetY = 14 * K * shadow; rrect(ctx, X, Y, CW, CH, r); ctx.fillStyle = tone; ctx.fill(); ctx.restore(); }
      else { rrect(ctx, X, Y, CW, CH, r); ctx.fillStyle = tone; ctx.fill(); }
      ctx.save(); rrect(ctx, X, Y, CW, CH, r); ctx.clip();
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha *= 0.7; ctx.fillStyle = ctx.createPattern(paperGrain(), "repeat"); ctx.fillRect(X, Y, CW, CH); ctx.restore();
      const sp = spacing * K; ctx.strokeStyle = gridColor; ctx.lineWidth = Math.max(1, 1.2 * K);
      for (let gy = Y + sp * 0.5; gy < Y + CH; gy += sp) { ctx.beginPath(); ctx.moveTo(X, gy); ctx.lineTo(X + CW, gy); ctx.stroke(); }
      for (let gx = X + sp * 0.5; gx < X + CW; gx += sp) { ctx.beginPath(); ctx.moveTo(gx, Y); ctx.lineTo(gx, Y + CH); ctx.stroke(); }
      // the drawing, element by element, each on its own onset
      for (const e of EL) {
        if (t < e.at) continue;
        if (e.kind === "hatch") {
          ctx.save(); ctx.beginPath(); ctx.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2); ctx.clip();
          drawShape(ctx, e.hatch, seg(t, e.at, e.at + e.dur)); ctx.restore();
          drawShape(ctx, e.outline, seg(t, e.at + e.dur * 0.5, e.at + e.dur * 0.5 + 0.45));
        } else if (e.kind === "ellipse") drawShape(ctx, e.outline, seg(t, e.at, e.at + e.dur));
        else if (e.kind === "arrow" || e.kind === "check") drawShape(ctx, e.shape, seg(t, e.at, e.at + e.dur));
        else if (e.kind === "text") {
          ctx.save(); ctx.font = e.font;
          const widths = e.parts.map(p => ctx.measureText(p.text).width), total = widths.reduce((a, b) => a + b, 0);
          const [ax, ay] = P([e.x, e.y]);
          let x = e.align === "center" ? ax - total / 2 : e.align === "right" ? ax - total : ax;
          if (e.italic) { const sk = e.italic === true ? 0.2 : e.italic; ctx.translate(0, ay); ctx.transform(1, 0, -sk, 1, 0, 0); ctx.translate(0, -ay); }
          e.parts.forEach((p, j) => {
            if (t >= p.at) writeText(ctx, p.text, x, ay, e.font, p.color ?? e.color, gi => clamp01((t - p.at - p.starts[gi]) / 0.075), { jitter: e.jitter ?? 1, K, seed: seed + j * 13 });
            x += widths[j];
          });
          ctx.restore();
        }
      }
      ctx.restore();
      rrect(ctx, X, Y, CW, CH, r); ctx.strokeStyle = "rgba(70,58,34,.16)"; ctx.lineWidth = 1.5 * K; ctx.stroke();
      ctx.restore();
    },
  };
}
