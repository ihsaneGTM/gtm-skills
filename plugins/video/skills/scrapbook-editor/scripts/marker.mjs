// THE MARKER — a red felt pen drawing on the frame as the words are said (v3, 2026-10-05): a word
// crossed out, a line drawn under a name, a circle round a figure, an arrow pointing at a word, a
// burst of strokes beside a keyword. Each stroke is DRAWN ON (its length grows over `dur`, eased),
// never faded in, with the texture of a felt tip: a solid core, a lighter second pass a hair off,
// round tapered ends, a faint shadow; drawn on the picture rather than on paper (an arrow, a burst)
// it has a white halo under it, as a sticker's outline, so it reads on hair or a red jacket.
//
//   strokeOf(kind, geometry)  → the path (points) of a stroke, deterministic per seed
//   drawStroke(ctx, pts, k, { width, color })  → the path drawn up to k (0..1 of its length)
//   mark({ kind, at, dur, … })  → an engine beat (with its scribble sound, cut to the stroke)
import { rng, clamp01, lerp, easeOutCubic, RED, FRAME, cue } from "./book.mjs";

const easeInOut = u => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

// ── the shapes, in px ─────────────────────────────────────────────────────────────────────────
export function strokeOf(kind, g, seed = 1) {
  const R = rng(seed * 7 + 3), pts = [];
  const wob = (a) => (R() - 0.5) * a;
  if (kind === "strike" || kind === "underline") {
    // a line from (x0, y0) to (x1, y1), a little wavy, overshooting both ends; an underline
    // curls up at its end like a signature
    const { x0, y0, x1, y1, w = 6 } = g, n = 22, over = (x1 - x0) * 0.04;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = lerp(x0 - over, x1 + over, u);
      let y = lerp(y0, y1, u) + Math.sin(u * 5.2 + R() * 0.4) * w * 0.16;
      if (kind === "underline" && u > 0.82) y -= Math.pow((u - 0.82) / 0.18, 2) * w * 1.6;
      pts.push([x, y]);
    }
  } else if (kind === "circle") {
    // an ellipse drawn by hand: starts at the top left, goes round once and a bit past, tilted
    const { cx, cy, rx, ry, w = 6 } = g, n = 56, turn = 1.14, a0 = -2.2 + wob(0.3), tilt = wob(0.12);
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = a0 + u * Math.PI * 2 * turn, grow = 1 + (u - 0.5) * 0.10;
      const ex = Math.cos(a) * rx * grow, ey = Math.sin(a) * ry * grow;
      pts.push([cx + ex * Math.cos(tilt) - ey * Math.sin(tilt) + wob(w * 0.12), cy + ex * Math.sin(tilt) + ey * Math.cos(tilt) + wob(w * 0.12)]);
    }
  } else if (kind === "arrow") {
    // a curved shaft from `from` to `to` (bending by `bend` of its length), then its head: two
    // short strokes drawn back from the tip
    const { from: [ax, ay], to: [bx, by], bend = 0.22, head = null } = g, n = 26;
    const mx = (ax + bx) / 2, my = (ay + by) / 2, len = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / len, ny = (bx - ax) / len, cxp = mx + nx * len * bend, cyp = my + ny * len * bend;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * cxp + u * u * bx, y = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * cyp + u * u * by;
      pts.push([x, y]);
    }
    const [px, py] = pts[n - 2], ang = Math.atan2(by - py, bx - px), hl = head ?? Math.max(10, len * 0.2);
    pts.push(null);                                         // lift the pen
    pts.push([bx - Math.cos(ang - 0.5) * hl, by - Math.sin(ang - 0.5) * hl], [bx, by], [bx - Math.cos(ang + 0.5) * hl, by - Math.sin(ang + 0.5) * hl]);
  } else if (kind === "burst") {
    // three short strokes radiating from beside a word (the hand's « ✳ look here »)
    const { cx, cy, r, dir = 1 } = g;
    [-0.75, 0, 0.75].forEach((da, i) => {
      if (i) pts.push(null);
      const a = (dir > 0 ? -0.35 : Math.PI + 0.35) + da * dir, r0 = r * 0.45, r1 = r * (i === 1 ? 1.15 : 0.95);
      pts.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * (r0 + r1) * 0.5 + wob(1), cy + Math.sin(a) * (r0 + r1) * 0.5 + wob(1)], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]);
    });
  }
  return pts;
}

// ── a stroke drawn up to k of its length ──────────────────────────────────────────────────────
export function drawStroke(ctx, pts, k, { width = 6, color = RED, shadow = true, halo = false, W = FRAME.w } = {}) {
  if (k <= 0 || !pts.length) return;
  // drawn on the picture (not on paper), a stroke gets a white halo under it, as a sticker's
  // outline: red on hair, on a red jacket, on a teal wall, it still reads
  if (halo) drawStroke(ctx, pts, k, { width: width * 1.9, color: "#FFFFFF", shadow, halo: false, W });
  // the length of each run between pen lifts
  const runs = [[]];
  for (const p of pts) { if (p === null) runs.push([]); else runs[runs.length - 1].push(p); }
  const lens = runs.map(r => r.reduce((a, p, i) => a + (i ? Math.hypot(p[0] - r[i - 1][0], p[1] - r[i - 1][1]) : 0), 0));
  const total = lens.reduce((a, b) => a + b, 0);
  let budget = total * clamp01(k);
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (shadow) { ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = W * 0.005; ctx.shadowOffsetY = W * 0.0018; }
  runs.forEach((r, ri) => {
    if (budget <= 0 || r.length < 2) return;
    const take = Math.min(budget, lens[ri]);
    budget -= lens[ri];
    // the part of the run drawn so far
    const part = [r[0]];
    let acc = 0;
    for (let i = 1; i < r.length; i++) {
      const d = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
      if (acc + d >= take) { const f = (take - acc) / Math.max(1e-6, d); part.push([lerp(r[i - 1][0], r[i][0], f), lerp(r[i - 1][1], r[i][1], f)]); break; }
      part.push(r[i]); acc += d;
    }
    if (part.length < 2) return;
    // the felt tip: the core, tapered at both ends (segments of decreasing width at the tips)
    const n = part.length - 1;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, taper = Math.min(1, u / 0.12, (1 - u) / 0.10 + (take < lens[ri] ? 1 : 0));
      ctx.strokeStyle = color; ctx.globalAlpha = 0.94;
      ctx.lineWidth = width * lerp(0.55, 1, clamp01(taper));
      ctx.beginPath(); ctx.moveTo(part[i][0], part[i][1]); ctx.lineTo(part[i + 1][0], part[i + 1][1]); ctx.stroke();
    }
    // the second, lighter pass: the ink a felt pen leaves uneven
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.globalAlpha = 0.30; ctx.lineWidth = width * 0.45; ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(part[0][0] + width * 0.18, part[0][1] - width * 0.12);
    for (let i = 1; i < part.length; i++) ctx.lineTo(part[i][0] + width * 0.18, part[i][1] - width * 0.12);
    ctx.stroke();
    if (shadow) { ctx.shadowColor = "rgba(0,0,0,.28)"; }
  });
  ctx.restore();
}

// ── a mark on the frame, as a beat ────────────────────────────────────────────────────────────
// geometry in FRACTIONS of the frame (x of the width, y of the height; widths of the width):
//   strike/underline { x0, y0, x1, y1 } · circle { cx, cy, rx, ry } · arrow { from:[x,y], to:[x,y], bend }
//   burst { cx, cy, r, dir }
// width: the felt tip (0.011 of the frame width by default). follow(t) → { dx, dy, a } moves it
// with the paper it is drawn on.
export function mark({ id, kind, at, until, dur = 0.22, frame = FRAME, width = 0.011, color = RED, seed = 1,
  follow = null, sound = "mark", layer = "over", halo = null, ...g }) {
  const ring = halo ?? (kind === "arrow" || kind === "burst");      // on the picture: haloed
  const W = frame.w, H = frame.h, px = v => v * W, py = v => v * H;
  let geo;
  if (kind === "strike" || kind === "underline") geo = { x0: px(g.x0), y0: py(g.y0), x1: px(g.x1), y1: py(g.y1), w: width * W };
  else if (kind === "circle") geo = { cx: px(g.cx), cy: py(g.cy), rx: px(g.rx), ry: px(g.ry ?? g.rx * 0.55), w: width * W };
  else if (kind === "arrow") geo = { from: [px(g.from[0]), py(g.from[1])], to: [px(g.to[0]), py(g.to[1])], bend: g.bend ?? 0.22, head: g.head ? px(g.head) : null };
  else if (kind === "burst") geo = { cx: px(g.cx), cy: py(g.cy), r: px(g.r ?? 0.04), dir: g.dir ?? 1 };
  const pts = strokeOf(kind, geo, seed);
  return [{
    id: id ?? `mark-${kind}-${at}`, from: at, to: until, layer,
    draw(ctx, t) {
      if (t < at || t >= until) return;
      const k = easeInOut(clamp01((t - at) / dur));
      const f = follow ? follow(t) : { dx: 0, dy: 0, a: 1 };
      if (f.a <= 0.003) return;
      ctx.save();
      ctx.globalAlpha *= f.a;
      ctx.translate(f.dx, f.dy);
      if (ring) drawStroke(ctx, pts, k, { width: width * W * 1.9, color: "#FFFFFF", W });
      drawStroke(ctx, pts, k, { width: width * W, color, W, shadow: !ring });
      ctx.restore();
    },
    cues: () => (sound ? [cue(sound, at, { dur: Math.max(0.12, dur) + 0.06 })] : []),
  }];
}
