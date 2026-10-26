// THINGS THAT GO AROUND THE SPEAKER — figures that use the person matte as DEPTH,
// not only as a wall to hide behind (2026-09-29).
//
// The request was to really play with the speaker's matte: make things appear from
// behind them, since they are cut out. chips() and screen() already come OUT from
// behind the speaker; this file adds the figure that goes ROUND them: an orbit whose
// back half is on the under layer (behind the head, so the head hides it) and whose
// front half is on the over layer (in front of the speaker). The same pure function of
// time draws both halves, so an item crosses from one layer to the other without a
// jump — and it crosses at the two ends of the ellipse, where it is beside the
// speaker, never on them.
//
//   const [back, front] = orbit({ id: "juggle", from, to, frame, center: t => [x, y],
//     rx: 0.37, ry: 0.055, tilt: -7, speed: 0.30, size: 150,
//     items: [{ kind: "youtube", t: at(9.32) }, …],
//     panic: { from: at(14.84), to: at(15.64), boost: 2.2, shrink: 0.82 },
//     fling: { at: at(15.64), dur: 0.55 } });
//
// Each item is BORN behind the speaker (`birth`, default the back of the ellipse) on the
// word that names it and orbits out from there: that is the "comes out from
// behind me" of the reference, applied to something that then keeps moving.
import { clamp01, easeInOutCubic, easeOutCubic, lerp, seg } from "./scene.mjs";
import { drawBrand } from "./brand.mjs";

const easeIn = t => t * t * t;

export function orbit({
  id = "orbit", from, to, frame = { w: 1080, h: 1920 }, items = [],
  center = () => [0.5, 0.42],       // fractions of the frame, a function of time (the head moves)
  rx = 0.37, ry = 0.055, tilt = -7,   // the ellipse, and its tilt in degrees
  speed = 0.30,                       // revolutions per second
  size = 150,                         // px at 1080 wide, at the FRONT of the orbit
  depthScale = 0.66,                  // an item at the back is this much smaller
  birth = -Math.PI / 2,               // where items are born: the back of the ellipse
  grow = 0.34,                        // how long an item takes to reach full size
  panic = null,                       // { from, to, boost, shrink }: faster and tighter
  fling = null,                       // { at, dur }: every item thrown out of the frame
  exit = 0.25,
  draw: drawItem = null,              // (ctx, item, x, y, s, rot) — defaults to the brand marks
  // one sound per item as it clears the head: { kind, gain, align, delay }. `delay` is
  // how long after its birth the item comes into view (0.15 s on the GTM OS short,
  // born behind the head); `it.sound: false` keeps one item silent
  sound = null,
}) {
  const W = frame.w, H = frame.h, K = W / 1080;
  const TILT = tilt * Math.PI / 180;
  // the angle travelled since `from`, integrated once (the panic changes the rate)
  const DT = 1 / 240, N = Math.ceil((to - from) / DT) + 2;
  const PHI = new Float64Array(N);
  const rate = t => {
    let w = speed * 2 * Math.PI;
    if (panic) w *= 1 + (panic.boost ?? 2) * easeInOutCubic(seg(t, panic.from, panic.to));
    return w;
  };
  for (let i = 1; i < N; i++) PHI[i] = PHI[i - 1] + rate(from + (i - 0.5) * DT) * DT;
  const phi = t => { const f = clamp01((t - from) / (N * DT)) * (N - 1), j = Math.floor(f), u = f - j; return PHI[j] + (PHI[Math.min(N - 1, j + 1)] - PHI[j]) * u; };

  // where item i is at time t: position, scale, depth (−1 back … +1 front)
  function place(it, i, t) {
    const t0 = it.t ?? from;
    if (t < t0) return null;
    const theta = birth + phi(t) - phi(t0) + (it.phase ?? 0);
    const shrink = panic ? lerp(1, panic.shrink ?? 0.85, easeInOutCubic(seg(t, panic.from, panic.to))) : 1;
    const [cx, cy] = center(t);
    const ex = Math.cos(theta) * rx * shrink * W, ey = Math.sin(theta) * ry * shrink * H;
    let x = cx * W + ex * Math.cos(TILT) - ey * Math.sin(TILT);
    let y = cy * H + ex * Math.sin(TILT) + ey * Math.cos(TILT);
    const depth = Math.sin(theta);                     // y grows downward: lower = nearer = front
    let s = size * K * lerp(depthScale, 1, (depth + 1) / 2) * easeOutCubic(clamp01((t - t0) / grow));
    let rot = Math.sin(theta * 1.3 + i) * 0.10;
    if (fling && t >= fling.at) {
      // thrown outward from the head, then gravity: the orbit lets go of them
      const u = clamp01((t - fling.at) / (fling.dur ?? 0.55));
      const dx = x - cx * W, dy = y - cy * H, L = Math.hypot(dx, dy) || 1;
      const push = easeOutCubic(u) * 0.62 * W;
      x += dx / L * push;
      y += dy / L * push * 0.5 - 0.10 * H * easeOutCubic(u) + easeIn(u) * 0.95 * H;
      rot += u * (i % 2 ? 2.4 : -2.4);
      s *= lerp(1, 1.18, u);
    }
    return { x, y, s, rot, depth };
  }

  const make = side => ({
    id: `${id}-${side}`, from, to, layer: side === "back" ? "under" : "over", mutesCaptions: false,
    // the back half carries the sounds, so the two halves never double them
    cues() {
      if (!sound || side !== "back") return [];
      return items.filter(it => it.sound !== false).map(it => ({ t: +((it.t ?? from) + (sound.delay ?? 0.15)).toFixed(3),
        kind: sound.kind, gain: sound.gain ?? -20, align: sound.align ?? 0 }));
    },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      const placed = items.map((it, i) => ({ it, i, p: place(it, i, t) })).filter(o => o.p && o.p.s > 0.5);
      // back to front, so the nearer item covers the farther one
      placed.sort((a, b) => a.p.depth - b.p.depth);
      for (const { it, i, p } of placed) {
        // after the fling everything is in front: the throw comes AT the camera
        const front = fling && t >= fling.at ? true : p.depth >= 0;
        if ((side === "front") !== front) continue;
        ctx.save();
        ctx.globalAlpha = outK;
        if (drawItem) drawItem(ctx, it, p.x, p.y, p.s, p.rot);
        else drawBrand(ctx, it.kind, p.x, p.y, p.s, { rot: p.rot });
        ctx.restore();
      }
    },
  });
  return [make("back"), make("front")];
}
