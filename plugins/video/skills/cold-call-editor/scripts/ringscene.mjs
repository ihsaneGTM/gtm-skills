// THE CALL BEING PLACED — what is ON the ringing sheet, between the hook and the call.
//
// Asked for in review: after the hook, a transition screen where the phone rings, as if
// we were calling, then bam, the video starts. In the paper language of the house: the two
// ends of the call are stickers (the caller's yellow microphone, the other side's handset),
// they land in STOP-MOTION (8 poses a second: a drop, one overshoot, every pose a little
// off), a dotted felt line runs from one to the other, and while the line rings the dashes
// march towards the handset and the handset shakes on every pose with its vibration marks
// around it. The names are written under them in ink (Impact, graphite).
//
// The sound comes with it: the pack's click on each landing, ONE felt glide for the line;
// the ringback tone itself is a cue of edl.mjs (assets/ringback.wav, sounds.py).
//
//   ringScene({ frame, mic: { x, y, t, size, rot, name }, phone: { … }, line: { t, dur },
//               rings: [[from, to], …], land: { kind, gain, align } })
const ENGINE = new URL("../../short-editor/scripts/", import.meta.url).href;
const { INK, HAND_LEVELS, rng, roughLine, roughCurve, drawStroke, stepClock } = await import(ENGINE + "hand.mjs");
const { clamp01, spring } = await import(ENGINE + "scene.mjs");
const { fontFor } = await import(ENGINE + "titles.mjs");
const { sticker } = await import(new URL("./stickers.mjs", import.meta.url).href);

export function ringScene({
  frame = { w: 1080, h: 1920 }, stepFps = 8, settle = 0.62,
  mic, phone,                 // { x, y, t, size (px at 1080), rot, name }
  line,                       // { t, dur }: the dotted line, grown in poses
  rings = [],                 // [[from, to], …] output seconds: the handset shakes
  land = null,                // { kind, gain, align }: the sound of a landing
  seed = 911,
}) {
  const W = frame.w, H = frame.h, K = W / 1080;
  const items = [mic, phone];
  const pose = (it, i, tc) => {
    const u = clamp01((tc - it.t) / settle);
    const o = 1 - spring(u, 2.6, 4.0);
    const R = rng(seed + i * 131 + Math.round(tc * stepFps)), j = 1 - u, s = it.size * K;
    return {
      x: it.x * W + (R() - 0.5) * 0.05 * s * j,
      y: it.y * H - 0.30 * s * o + (R() - 0.5) * 0.05 * s * j,
      rot: ((it.rot ?? 0) + 11 * o + (R() - 0.5) * 3.2 * j) * Math.PI / 180,
      s: s * (1 + 0.22 * o),
    };
  };
  const ringing = tc => rings.some(([a, b]) => tc >= a - 1e-6 && tc < b);
  // the line: dashes on a shallow arc between the two stickers' inner edges
  const half = it => it.size * K * (0.5 + 0.085) + 26 * K;
  const p0 = [mic.x * W + half(mic), mic.y * H], p1 = [phone.x * W - half(phone), phone.y * H];
  const at = u => [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u - Math.sin(Math.PI * u) * 34 * K];
  const R0 = rng(seed + 7);
  const N = 7, dashes = [];
  for (let i = 0; i < N; i++) dashes.push(roughLine(at((i + 0.12) / N), at((i + 0.62) / N), R0, 0.6, K));
  // the vibration marks: two short arcs on each side of the handset, on its upper half
  const marks = (cx, cy, s, flip, R) => {
    const out = [];
    for (const side of [-1, 1]) for (const k of [0, 1]) {
      const r = s * (0.86 + k * 0.26) + (flip ? 8 : 0) * K;
      const a0 = side < 0 ? -0.95 : -0.55, a1 = side < 0 ? -0.25 : 0.55, pts = [];
      for (const u of [0, 0.5, 1]) { const a = a0 + (a1 - a0) * u; pts.push([cx + side * Math.cos(a) * r, cy + Math.sin(a) * r]); }
      out.push(roughCurve(pts, R, 0.7, K));
    }
    return out;
  };
  // while it rings, the dashes MARCH towards the handset: the same arc, its dashes moved
  // on by a third of a dash every pose and redrawn by hand each time (the stop-motion way)
  const marching = k => {
    const R = rng(seed + 401 + k), out = [], ph = (k % 3) / 3;
    for (let i = -1; i < N; i++) {
      const a = (i + 0.12 + ph) / N, b = (i + 0.62 + ph) / N;
      if (b <= 0.01 || a >= 0.99) continue;
      out.push(roughLine(at(Math.max(0.01, a)), at(Math.min(0.99, b)), R, 0.6, K));
    }
    return out;
  };
  return {
    draw(ctx, t) {
      const tc = stepClock(t, stepFps);
      const kk = Math.round(tc * stepFps);
      // the dotted line, under the stickers: one more dash a pose, then marching while it rings
      if (tc >= line.t) {
        if (ringing(tc)) {
          marching(kk).forEach((pl, i) => drawStroke(ctx, pl, { color: INK.graphite, width: 9, style: "marker", K, seed: seed + i }));
        } else {
          const n = Math.min(N, Math.ceil(clamp01((tc - line.t) / line.dur) * N + 1e-6));
          for (let i = 0; i < n; i++) drawStroke(ctx, dashes[i], { color: INK.graphite, width: 9, style: "marker", K, seed: seed + i });
        }
      }
      items.forEach((it, i) => {
        if (tc < it.t - 1e-6) return;
        const p = pose(it, i, tc);
        let { x, y, rot } = p;
        const k = Math.round(tc * stepFps);
        if (i === 1 && ringing(tc)) {
          // a phone ringing on a table: it jumps a little, side to side, every pose
          const R = rng(seed + 977 + k);
          rot += (k % 2 ? 1 : -1) * (6 + R() * 4) * Math.PI / 180;
          x += (k % 2 ? 1 : -1) * (5 + R() * 5) * K; y += (R() - 0.5) * 6 * K;
          for (const pl of marks(p.x, p.y, it.size * K * 0.62, k % 2, rng(seed + 31 + k)))
            drawStroke(ctx, pl, { color: INK.graphite, width: 8, style: "marker", K, seed: seed + k });
        }
        sticker(ctx, i ? "phone" : "mic", x, y, p.s, { rot, K });
        if (it.name && tc >= it.t + 1 / stepFps - 1e-6) {
          // the name in ink under its sticker, written one pose after it lands
          ctx.save();
          ctx.font = fontFor({ k: "impact", size: Math.round(74 * K) }); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
          ctx.fillStyle = INK.graphite;
          ctx.fillText(it.name, it.x * W, it.y * H + it.size * K * 0.62 + 104 * K);
          ctx.restore();
        }
      });
    },
    cues() {
      const c = [];
      // a landing sounds on the pose where it lands (half a step early, where stepClock rounds)
      for (const it of items) {
        const k0 = Math.ceil(it.t * stepFps - 1e-6);
        if (land) c.push({ t: +((k0 - 0.5) / stepFps).toFixed(3), kind: land.kind, gain: land.gain, align: land.align ?? 0 });
      }
      // one mark, one gesture, one sound: the whole dotted line is one felt glide
      const k0 = Math.ceil(line.t * stepFps - 1e-6), k1 = Math.ceil((line.t + line.dur) * stepFps - 1e-6);
      c.push({ t: +((k0 - 0.5) / stepFps).toFixed(3), kind: `felt:${((k1 - k0 + 0.8) / stepFps).toFixed(3)}`, gain: HAND_LEVELS.felt });
      return c;
    },
  };
}
