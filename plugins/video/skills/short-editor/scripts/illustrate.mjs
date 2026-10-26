// THE ILLUSTRATED INTRO — scenes drawn by hand AROUND the speaker, OVER them, BEHIND them.
//
// The third visual language of the landscape intro, after the kinetic lockups
// (titles.mjs) and the notes on paper (hand.mjs). The first handwritten pass was
// rejected as "text on the right, text on the left": twelve cards in a row. What the
// reviewer kept from it was the one moment the frame BECAME a drawing — a sheet
// over the picture with the speaker's own outline traced on it — and asked for that,
// many times, as the ground of an intro that is illustrated rather than captioned.
//
// So the unit here is a SCENE, not a caption:
//   cover()       a sheet over the whole frame, the speaker's silhouette sketched off
//                 the matte, drawings on it, then torn away — opaque (the speaker
//                 disappears) or tracing paper (the speaker ghosts through)
//   doodle()      one hand-drawn pictogram (a rocket, a laptop, a target…) drawn
//                 stroke by stroke where it is wanted, behind the speaker or on a sheet
//   chart()       the rising arrow: axes, a curve that climbs with a glowing pen
//                 head, hatching under it, the figure counting up on its tip —
//                 flat, or warped onto a receding wall behind the speaker
//   funnel()      the acquisition funnel itself: the cone, the status rules, the
//                 channels arrowed into its mouth, the contacts descending and a
//                 few leaving by the spout — bare, ruled, or repeated small
//   screenPush()  the real app capture taped up behind the speaker, then pushed forward
//                 until it IS the frame
//   bigGlyph()    one enormous handwritten character behind the speaker
//   chatWall()    the DM thread nobody answers (a cover's content)
//   toolWindows() app windows cascading open behind the speaker, then filling with people — and, with `bin`, all of them dropping into a drawn bin
//   targetShot()  a target drawn, an arrow flying in from off-frame, the hit
//   crowd()       people pictograms, some of them ringed
//   numbered()    ①②③ as a hand draws them
//
// Same contract as hand.mjs (a beat is { id, from, to, layer, draw, cues }), same
// units (fractions for positions, 1080p px for sizes × K), same under-layer trick.
// The SOUND is varied on purpose: every drawing names its pen (pencil, graphite,
// fineliner, crayon, chalk, marker — each a different resonance in sfx.mjs), and
// the scenes carry their own foley (a rocket, a message sent, a clock, an arrow
// landing) — twelve identical pencil scratches was the other rejection.
import { INK, HAND_LEVELS, rng, hash, roughLine, roughCurve, roughEllipse, roughRect, arrowStrokes, checkStrokes, drawStroke, drawShape, plLength, plPartial, writeText, penSchedule, drawPaper, drawTape, drawGridPatch, sheet, sketch, rim } from "./hand.mjs";
import { C, clamp01, easeOutCubic, easeInOutCubic, easeOutQuint, easeOutBack, lerp, seg, createCanvas } from "./scene.mjs";
import { TYPE } from "./titles.mjs";

// dB relative to the voice, on top of project.json sfxMasterDb — hand.mjs's scale
export const ILL_LEVELS = {
  thock: -15, stamp: -18, rocket: -19, bubble: -21, seen: -24, pageflip: -22, clock: -27, uipop: -22, spark: -21,
  whoosh: -19, swoosh: -20, pop: -20, tick: -26, rattle: -22, hit: -14,
};
const penCue = (t, pen, dur, writing = false, extra = 0) => ({ t: +t.toFixed(3), kind: `${pen}:${dur.toFixed(2)}${writing ? ":w" : ""}`, gain: (HAND_LEVELS[pen] ?? HAND_LEVELS.pencil) + extra });
const penFor = (style, pen) => pen ?? (style === "marker" || style === "highlight" ? "marker" : style === "chalk" ? "chalk" : "pencil");

// ======================================================================================
// THE PICTOGRAMS — geometry in a local box (bw × bh units), as parts drawn in order.
// A part: { pl, style?, color?, width?, fill? }. `R` is the seeded rng of the beat, so
// a doodle's wobble is fixed once and never flickers.
// ======================================================================================
const closed = pls => pls.reduce((acc, pl) => acc.concat(acc.length ? pl.slice(1) : pl), []);
export const DOODLE = {
  rocket(R) {
    const body = closed([roughCurve([[30, 4], [13, 36], [12, 70]], R, .7), roughLine([12, 70], [48, 70], R, .7), roughCurve([[48, 70], [47, 36], [30, 4]], R, .7)]);
    return { bw: 60, bh: 100, parts: [
      { pl: body },
      { pl: roughEllipse(30, 34, 8, 8.5, R, { r: .7 }) },
      { pl: closed([roughLine([12, 48], [0, 78], R, .7), roughLine([0, 78], [12, 70], R, .7)]) },
      { pl: closed([roughLine([48, 48], [60, 78], R, .7), roughLine([60, 78], [48, 70], R, .7)]) },
      { pl: roughCurve([[18, 73], [23, 90], [30, 77], [37, 94], [42, 73]], R, .9), style: "marker", color: INK.yellow, width: 6 },
    ] };
  },
  laptop(R) {
    return { bw: 100, bh: 72, parts: [
      ...roughRect(10, 4, 80, 50, R, .7).map(pl => ({ pl })),
      { pl: closed([roughLine([2, 60], [98, 60], R, .7), roughLine([98, 60], [100, 68], R, .7), roughLine([100, 68], [0, 68], R, .7), roughLine([0, 68], [2, 60], R, .7)]) },
      { pl: roughLine([22, 18], [62, 18], R, .6), width: .6, alpha: .7 }, { pl: roughLine([22, 28], [78, 28], R, .6), width: .6, alpha: .7 }, { pl: roughLine([22, 38], [52, 38], R, .6), width: .6, alpha: .7 },
    ] };
  },
  coffee(R) {
    return { bw: 70, bh: 80, parts: [
      { pl: roughEllipse(32, 30, 20, 5, R, { r: .6 }) },
      { pl: closed([roughLine([12, 32], [18, 74], R, .7), roughCurve([[18, 74], [32, 79], [46, 74]], R, .7), roughLine([46, 74], [52, 32], R, .7)]) },
      { pl: roughCurve([[52, 40], [68, 48], [52, 62]], R, .8) },
      { pl: roughCurve([[24, 24], [29, 14], [24, 3]], R, 1.2), width: .7, alpha: .8 }, { pl: roughCurve([[38, 24], [43, 14], [38, 3]], R, 1.2), width: .7, alpha: .8 },
    ] };
  },
  megaphone(R) {
    return { bw: 100, bh: 70, parts: [
      { pl: closed([roughLine([8, 26], [66, 6], R, .7), roughLine([66, 6], [66, 64], R, .7), roughLine([66, 64], [8, 44], R, .7), roughLine([8, 44], [8, 26], R, .7)]) },
      { pl: roughEllipse(66, 35, 6, 29, R, { r: .6 }) },
      { pl: closed([roughLine([26, 44], [30, 62], R, .7), roughLine([30, 62], [46, 62], R, .7), roughLine([46, 62], [42, 42], R, .7)]) },
      { pl: roughCurve([[78, 22], [85, 35], [78, 48]], R, .8), width: .8 }, { pl: roughCurve([[86, 14], [96, 35], [86, 56]], R, .8), width: .8 },
    ] };
  },
  person(R) {
    return { bw: 60, bh: 100, parts: [
      { pl: roughEllipse(30, 22, 14, 15, R, { r: .7 }) },
      { pl: closed([roughCurve([[4, 88], [7, 60], [30, 50], [53, 60], [56, 88]], R, .7), roughLine([56, 88], [4, 88], R, .7)]) },
    ] };
  },
  trophy(R) {
    return { bw: 80, bh: 100, parts: [
      { pl: roughLine([14, 8], [66, 8], R, .7) },
      { pl: closed([roughCurve([[16, 8], [21, 50], [40, 62]], R, .7), roughCurve([[40, 62], [59, 50], [64, 8]], R, .7)]) },
      { pl: roughCurve([[14, 14], [1, 27], [20, 40]], R, .8) }, { pl: roughCurve([[66, 14], [79, 27], [60, 40]], R, .8) },
      { pl: roughLine([40, 62], [40, 78], R, .7) },
      { pl: closed([roughLine([22, 78], [58, 78], R, .7), roughLine([58, 78], [64, 88], R, .7), roughLine([64, 88], [16, 88], R, .7), roughLine([16, 88], [22, 78], R, .7)]) },
    ] };
  },
  bubble(R) {
    return { bw: 100, bh: 72, parts: [
      ...roughRect(4, 4, 92, 50, R, .7).map(pl => ({ pl })),
      { pl: closed([roughLine([22, 54], [12, 70], R, .7), roughLine([12, 70], [38, 54], R, .7)]) },
      { pl: roughEllipse(36, 29, 3.5, 3.5, R, { r: .4 }), fill: true }, { pl: roughEllipse(50, 29, 3.5, 3.5, R, { r: .4 }), fill: true }, { pl: roughEllipse(64, 29, 3.5, 3.5, R, { r: .4 }), fill: true },
    ] };
  },
  webpage(R) {
    return { bw: 100, bh: 80, parts: [
      ...roughRect(2, 2, 96, 76, R, .7).map(pl => ({ pl })),
      { pl: roughLine([2, 16], [98, 16], R, .6) },
      { pl: roughEllipse(10, 9, 2.6, 2.6, R, { r: .4 }), fill: true }, { pl: roughEllipse(18, 9, 2.6, 2.6, R, { r: .4 }), fill: true }, { pl: roughEllipse(26, 9, 2.6, 2.6, R, { r: .4 }), fill: true },
      { pl: roughLine([14, 32], [64, 32], R, .6), width: .7 }, { pl: roughLine([14, 44], [86, 44], R, .6), width: .7 }, { pl: roughLine([14, 56], [70, 56], R, .6), width: .7 },
      { pl: roughLine([16, 68], [40, 68], R, .5), style: "marker", color: INK.yellow, width: 9 },
    ] };
  },
  target(R) {
    return { bw: 100, bh: 100, parts: [
      { pl: roughEllipse(50, 50, 46, 46, R, { r: .8 }) }, { pl: roughEllipse(50, 50, 31, 31, R, { r: .8 }) }, { pl: roughEllipse(50, 50, 16, 16, R, { r: .8 }) },
      { pl: roughEllipse(50, 50, 5, 5, R, { r: .4 }), fill: true, style: "marker", color: INK.red },
    ] };
  },
  window(R) {
    return { bw: 100, bh: 70, parts: [
      ...roughRect(2, 2, 96, 66, R, .7).map(pl => ({ pl })),
      { pl: roughLine([2, 14], [98, 14], R, .6) },
      { pl: roughEllipse(9, 8, 2.4, 2.4, R, { r: .4 }), fill: true }, { pl: roughEllipse(16, 8, 2.4, 2.4, R, { r: .4 }), fill: true }, { pl: roughEllipse(23, 8, 2.4, 2.4, R, { r: .4 }), fill: true },
    ] };
  },
  // a waste bin. Part 0 is the body as an OPEN polyline (left side → bottom → right
  // side) so a caller can close and fill it to swallow what falls in; `rimY` is the
  // mouth. The lid is its own doodle in the same box, so it can fall on its own.
  bin(R) {
    return { bw: 70, bh: 100, rimY: 24, parts: [
      { pl: closed([roughLine([6, 24], [11, 96], R, .7), roughLine([11, 96], [59, 96], R, .7), roughLine([59, 96], [64, 24], R, .7)]) },
      { pl: roughEllipse(35, 24, 29.5, 5.5, R, { r: .7 }) },
      { pl: roughLine([25, 34], [27.5, 89], R, .6), width: .8 },
      { pl: roughLine([45, 34], [42.5, 89], R, .6), width: .8 },
    ] };
  },
  lid(R) {
    return { bw: 70, bh: 100, parts: [
      { pl: closed([roughLine([1, 16], [69, 16], R, .7), roughLine([69, 16], [68, 23], R, .7), roughLine([68, 23], [2, 23], R, .7), roughLine([2, 23], [1, 16], R, .7)]) },
      { pl: closed([roughLine([29, 16], [29, 10], R, .6), roughLine([29, 10], [41, 10], R, .6), roughLine([41, 10], [41, 16], R, .6)]) },
    ] };
  },
  clock(R) {
    const ticks = [];
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, r0 = k % 3 ? 41 : 37; ticks.push({ pl: roughLine([50 + Math.cos(a) * r0, 50 + Math.sin(a) * r0], [50 + Math.cos(a) * 45, 50 + Math.sin(a) * 45], R, .4), width: k % 3 ? .7 : 1 }); }
    return { bw: 100, bh: 100, parts: [{ pl: roughEllipse(50, 50, 47, 47, R, { r: .8 }) }, ...ticks] };
  },
  lightbulb(R) {
    const rays = [];
    for (const a of [-2.6, -2.05, -1.57, -1.1, -0.55]) rays.push({ pl: roughLine([40 + Math.cos(a) * 34, 36 + Math.sin(a) * 36], [40 + Math.cos(a) * 46, 36 + Math.sin(a) * 48], R, .6), width: .9, style: "marker", color: INK.yellow });
    return { bw: 80, bh: 100, parts: [
      { pl: roughEllipse(40, 36, 26, 28, R, { r: .8 }) },
      { pl: roughLine([30, 61], [32, 74], R, .6) }, { pl: roughLine([50, 61], [48, 74], R, .6) },
      ...roughRect(30, 74, 20, 10, R, .6).map(pl => ({ pl })), { pl: roughLine([33, 88], [47, 88], R, .6) },
      { pl: roughCurve([[33, 58], [40, 42], [47, 58]], R, .9), width: .8 },
      ...rays,
    ] };
  },
  envelope(R) {
    return { bw: 100, bh: 66, parts: [...roughRect(2, 2, 96, 62, R, .7).map(pl => ({ pl })), { pl: closed([roughLine([2, 2], [50, 40], R, .7), roughLine([50, 40], [98, 2], R, .7)]) }] };
  },
  magnifier(R) {
    return { bw: 100, bh: 100, parts: [{ pl: roughEllipse(40, 40, 30, 30, R, { r: .8 }) }, { pl: roughEllipse(40, 40, 24, 24, R, { r: .6 }), width: .6, alpha: .6 }, { pl: roughLine([62, 62], [92, 92], R, .7), width: 2.2 }] };
  },
  check(R) { return { bw: 100, bh: 100, parts: checkStrokes(50, 50, 90, R, 1).map(pl => ({ pl })) }; },
  heart(R) {
    return { bw: 100, bh: 90, parts: [{ pl: closed([roughCurve([[50, 84], [6, 46], [14, 14], [36, 10], [50, 30]], R, .8), roughCurve([[50, 30], [64, 10], [86, 14], [94, 46], [50, 84]], R, .8)]) }] };
  },
  flag(R) {
    return { bw: 70, bh: 100, parts: [{ pl: roughLine([10, 4], [10, 98], R, .6), width: 1.2 }, { pl: closed([roughLine([10, 6], [64, 14], R, .7), roughCurve([[64, 14], [56, 34], [64, 54]], R, .8), roughLine([64, 54], [10, 46], R, .7)]) }] };
  },
};

// The pictogram in frame space, as a shape with per-part style — scaled so that
// its box is `size` of the frame's HEIGHT high, centred on (cx, cy), rotated `rot`.
function placeDoodle(geom, { cx, cy, size, frame, rot = 0, style, color, width }) {
  const W = frame.w, H = frame.h, K = W / 1920;
  const s = size * H / geom.bh, ox = cx * W - geom.bw * s / 2, oy = cy * H - geom.bh * s / 2;
  const ccx = cx * W, ccy = cy * H, cr = Math.cos(rot), sr = Math.sin(rot);
  const map = ([x, y]) => { const px = ox + x * s - ccx, py = oy + y * s - ccy; return [ccx + px * cr - py * sr, ccy + px * sr + py * cr]; };
  // a pencil part's `width` is a FACTOR of the doodle's line weight (a steam
  // line is thinner than the cup); a marker part's `width` is its own, in 1080p px
  const parts = geom.parts.map(p => {
    const marker = p.style === "marker" || p.style === "highlight";
    return { ...p, pl: p.pl.map(map), style: p.style ?? style, color: p.color ?? color, width: marker ? (p.width ?? 6) : (p.width ?? 1) * width };
  });
  return { parts, total: parts.reduce((n, p) => n + plLength(p.pl), 0), s, K };
}
// Draw a placed doodle up to `prog` of its total pen travel.
function drawParts(ctx, placed, prog, K, seed, alphaMul = 1) {
  if (prog <= 0) return;
  let reach = Math.min(1, prog) * placed.total;
  placed.parts.forEach((p, i) => {
    if (reach <= 0.001) return;
    const L = plLength(p.pl) || 1, k = Math.min(1, reach / L);
    const pl = k >= 1 ? p.pl : plPartial(p.pl, k);
    if (p.fill && k >= 1) { ctx.save(); ctx.globalAlpha *= (p.alpha ?? 1) * alphaMul; ctx.fillStyle = p.color; ctx.beginPath(); pl.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else drawStroke(ctx, pl, { color: p.color, width: p.width, style: p.style, K, seed: seed + i * 11, alpha: (p.alpha ?? 1) * alphaMul });
    reach -= L;
  });
}

// ONE PICTOGRAM, drawn where it is wanted.
//
//   doodle({ id, from, to, at, kind: "rocket", cx: 0.30, cy: 0.40, size: 0.28, frame,
//            pen: "graphite", launch: { at, dur: 0.7, dx: 0.12, dy: -0.32 } })
//
// `launch` moves the finished drawing along (dx, dy) with a dashed trail — the
// rocket taking off. `patch` puts a soft piece of ruled paper behind it (the wall
// turning into paper where the pencil goes), for legibility on the grey wall.
export function doodle({
  id = "doodle", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under", kind = null, geom = null,
  cx = 0.5, cy = 0.5, size = 0.25, style = "pencil", pen = null, color = INK.graphite, width = 4.2, dur = null, exit = 0.28,
  rot = 0, seed = hash(id), sound = true, launch = null, patch = null, mutesCaptions = false, wobble = 0, alpha = 1,
  move = null,           // { at, dur, dx, dy }: the finished drawing slides (a magnifier sweeping), no trail, no fade
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const R = rng(seed);
  const g = geom ?? DOODLE[kind]?.(R);
  if (!g) throw new Error(`unknown doodle: ${kind}`);
  const placed = placeDoodle(g, { cx, cy, size, frame, rot, style, color, width });
  const drawDur = dur ?? Math.min(1.1, Math.max(0.28, placed.total / (1400 * K)));
  const thePen = penFor(style, pen);
  let trail = null;
  return {
    id, from, to, mutesCaptions, layer, at, dur: drawDur, endAt: +(at + drawDur).toFixed(3),
    cues() {
      if (!sound) return [];
      const c = [penCue(at, thePen, drawDur)];
      if (launch) c.push({ t: +launch.at.toFixed(3), kind: "rocket", gain: ILL_LEVELS.rocket });
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = outK * alpha;
      let lk = 0;
      if (launch && t >= launch.at) {
        const u = clamp01((t - launch.at) / (launch.dur ?? 0.7));
        lk = u * u;                                  // accelerating away
        const dx = (launch.dx ?? 0) * W * lk, dy = (launch.dy ?? -0.3) * H * lk;
        if (launch.trail !== false) {
          if (!trail) trail = roughLine([cx * W, cy * H + g.bh * placed.s * 0.42], [cx * W + (launch.dx ?? 0) * W, cy * H + g.bh * placed.s * 0.42 + (launch.dy ?? -0.3) * H], R, 1.4, K);
          const part = plPartial(trail, Math.min(1, lk * 1.05));
          ctx.save(); ctx.setLineDash([14 * K, 12 * K]); ctx.globalAlpha *= 0.75 * (1 - u * 0.4);
          drawStroke(ctx, part, { color: INK.graphite, width: 3.2, style: "marker", K, seed });
          ctx.restore();
        }
        ctx.globalAlpha *= u > 0.8 ? (1 - u) / 0.2 : 1;
        ctx.translate(dx, dy);
        ctx.translate(cx * W, cy * H); ctx.rotate((launch.spin ?? 0) * lk); ctx.translate(-cx * W, -cy * H);
      }
      if (move && t >= move.at) { const u = easeInOutCubic(clamp01((t - move.at) / (move.dur ?? 0.6))); ctx.translate((move.dx ?? 0) * W * u, (move.dy ?? 0) * H * u); }
      if (wobble > 0) { const w = Math.sin(t * 9.7) * wobble; ctx.translate(cx * W, cy * H); ctx.rotate(w); ctx.translate(-cx * W, -cy * H); }
      if (patch) {
        const pk = easeOutCubic(clamp01((t - at + 0.05) / 0.4));
        drawGridPatch(ctx, cx * W, cy * H, g.bw * placed.s * 0.5 + (patch.pad ?? 200) * K, g.bh * placed.s * 0.5 + (patch.pad ?? 200) * 0.75 * K,
          { K, alpha: pk, spacing: patch.spacing ?? 44, color: patch.color ?? INK.gridGrey, tint: patch.tint ?? 0.16, key: id, fill: patch.fill ?? null });
      }
      drawParts(ctx, placed, seg(t, at, at + drawDur), K, seed);
      ctx.restore();
    },
  };
}

// ======================================================================================
// THE COVER — a sheet over the frame, the speaker's outline sketched on it, drawings
// on it, then torn away; a die-cut white rim around them as the picture comes back.
//
//   const c1 = cover({ id: "c-saas", from, to, at, frame, stencil: () => STENCIL,
//                      enter: "drop", exit: "tear", alpha: 1, children: [rocket] });
//   BEATS.push(...c1.beats);   STENCIL_WINDOWS.push(...c1.windows);
//
// `alpha` < 1 is TRACING PAPER — the speaker stays faintly visible through it, and the
// sketch reads as a tracing of what is under it. `children` are beats (drawn and
// heard through the cover) or plain drawers (ctx, t). The stencil is a getter of
// the mask clip (loadClip over assets/mask-small with `windows`, see `windows`).
// ======================================================================================
export function cover({
  id = "cover", from, to, at = from, frame = { w: 1920, h: 1080 }, stencil = null,
  enter = "drop", exit = "tear", enterDur = 0.34, exitDur = 0.40, alpha = 1, grid = "quad", tone = INK.paper, gridColor = INK.gridBlue, spacing = 44, rot = -0.012,
  sketchAt = null, sketchFrameAt = null, sketchDur = 0.7, sketchWidth = 4.6, sketchColor = INK.graphite, sketchPen = "pencil", sketchFade = null, sketchOffset = 6, doSketch = true,
  children = [], rimPx = 16, rimDur = 1.3, doRim = true, sound = true, inSound = null, mutesCaptions = true, seed = hash(id),
  cam = null, anchorY = 0.28,     // speaker.mjs's camera: the sketch and the rim follow the zoom
  sketchSound = true,             // false: the outline is traced in silence (the reviewer found the pencil scratch horrible)
}) {
  const landAt = +(at + (enter === "none" ? 0 : enterDur)).toFixed(3);
  const skAt = sketchAt ?? +(landAt + 0.02).toFixed(3);
  const skFrame = sketchFrameAt ?? +(landAt + 0.06).toFixed(3);
  const tearAt = +(to - exitDur).toFixed(3);
  const SK = doSketch ? sketch({ id: id + "-sk", from, to, at: skAt, frame, layer: "over", stencil, frameAt: skFrame, dur: sketchDur, color: sketchColor, width: sketchWidth,
    offset: sketchOffset, sound: false, fadeAt: sketchFade?.at ?? null, fadeTo: sketchFade?.to ?? 0.35, cam, anchorY }) : null;
  const kids = children.map(ch => (typeof ch === "function" ? { draw: ch, cues: () => [] } : ch));
  const SH = sheet({ id, from, to, at, frame, layer: "over", enter: enter === "none" ? "up" : enter, exit, enterDur, exitDur, grid, tone, gridColor, spacing, rot,
    children: [...(SK ? [SK] : []), ...kids], mutesCaptions, seed, sound, covered: enter === "none", alpha, inSound });
  const beats = [SH];
  if (doRim && stencil) beats.push(rim({ id: id + "-rim", from: tearAt, to: +(tearAt + rimDur).toFixed(3), at: tearAt, frame, stencil, px: rimPx, cam, anchorY }));
  // the sounds of what is drawn ON the sheet — the children are not in BEATS
  beats.push({ id: id + "-cues", from, to, layer: "over", mutesCaptions: false, draw() {},
    cues() {
      if (!sound) return [];
      const c = [];
      if (SK && sketchSound) c.push(penCue(skAt, sketchPen, sketchDur, false, 1));
      for (const k of kids) if (typeof k.cues === "function") c.push(...k.cues());
      return c;
    } });
  return {
    beats, landAt, tearAt, sketch: SK, sheet: SH,
    // the stencil frames this cover needs: one for the sketch, the rim's live window
    windows: [[skFrame - 0.1, skFrame + 0.1], ...(doRim ? [[tearAt - 0.05, tearAt + rimDur + 0.1]] : [])],
  };
}

// ======================================================================================
// THE CHART — from 0 to 1M, as a hand draws it and an editor lights it.
// ======================================================================================
// Map a rectangle of `src` onto a quad [tl, tr, br, bl] (frame px) in vertical
// strips — a receding wall behind the speaker. Each strip is an affine parallelogram; at
// 40 strips the seams are invisible and the perspective reads.
export function warpQuad(ctx, src, sx, sy, sw, sh, quad, strips = 160) {
  const [tl, tr, br, bl] = quad;
  for (let i = 0; i < strips; i++) {
    const u0 = i / strips, u1 = (i + 1) / strips;
    const T0 = [lerp(tl[0], tr[0], u0), lerp(tl[1], tr[1], u0)], T1 = [lerp(tl[0], tr[0], u1), lerp(tl[1], tr[1], u1)];
    const B0 = [lerp(bl[0], br[0], u0), lerp(bl[1], br[1], u0)];
    const x0 = sx + sw * u0, w = sw / strips + 1.0;
    const ax = (T1[0] - T0[0]) / (sw / strips), ay = (T1[1] - T0[1]) / (sw / strips);
    const bx = (B0[0] - T0[0]) / sh, by = (B0[1] - T0[1]) / sh;
    ctx.save();
    ctx.setTransform(ax, ay, bx, by, T0[0], T0[1]);
    ctx.drawImage(src, x0, sy, w, sh, 0, 0, w, sh);
    ctx.restore();
  }
}

// chart({ id, from, to, at, frame, x: 0.06, y: 0.14, w: 0.40, h: 0.62,
//         lineAt, lineDur: 1.0, count: { to: 1e6, fmt }, xLabel: "1 year",
//         quad: [[...], ...] | null })
// Axes in pencil, the curve in marker (yellow) with a glowing head, hatching
// under it in pencil, the figure riding the tip and landing ringed in red.
export function chart({
  id = "chart", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under",
  x = 0.06, y = 0.14, w = 0.42, h = 0.62, axesDur = 0.38, lineAt = null, lineDur = 1.0,
  count = { from: 0, to: 1e6, fmt: v => (v / 1e6).toFixed(2) + "M", land: "1M" }, xLabel = "1 year", originLabel = "0",
  lineColor = INK.yellow, lineWidth = 16, axesColor = INK.graphite, hatch = true, glow = true, ringColor = INK.red,
  quad = null, exit = 0.34, seed = hash(id), sound = true, mutesCaptions = false, labelSize = 96, smallSize = 58, pen = "pencil",
  xLabelTime = null,     // when the x label is written (default: right after the head lands) — "1 year" on the spoken "one year"
  pens = true,           // false: no pen sounds at all — a whoosh as the line climbs, the spark as it lands
  face = "hand",         // "sans": the numbers in the title face, for the neon room where a hand face reads as a foreign object
  labelColor = null,     // the figure on the tip — defaults to the axes' colour, which is too dim on dark
  labelGlow = null,      // the halo behind the figure — white on paper, the line's own colour on dark
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const R = rng(seed);
  const lAt = lineAt ?? +(at + axesDur + 0.05).toFixed(3);
  const X0 = x * W, Y0 = (y + h) * H, X1 = (x + w) * W, Y1 = y * H;        // origin bottom-left
  // geometry, once
  const axes = { strokes: [roughLine([X0, Y1 - 10 * K], [X0, Y0 + 6 * K], R, 1, K), roughLine([X0 - 8 * K, Y0], [X1 + 10 * K, Y0], R, 1, K)], style: "pencil", color: axesColor, width: 4.4, seed };
  const pts = [];
  for (let i = 0; i <= 90; i++) { const u = i / 90, f = Math.pow(u, 2.3) * 0.86 + u * 0.14; pts.push([X0 + 40 * K + (X1 - X0 - 60 * K) * u, Y0 - 30 * K - (Y0 - Y1 - 60 * K) * f]); }
  const curve = roughCurve(pts, R, 0.9, K);
  const curveLen = plLength(curve);
  const end = curve[curve.length - 1], q = curve[curve.length - 6];
  const ang = Math.atan2(end[1] - q[1], end[0] - q[0]), hl = 46 * K;
  const head = [roughLine([end[0] - Math.cos(ang - 0.5) * hl, end[1] - Math.sin(ang - 0.5) * hl], end, R, .7, K), roughLine(end, [end[0] - Math.cos(ang + 0.5) * hl, end[1] - Math.sin(ang + 0.5) * hl], R, .7, K)];
  const labelFont = (face === "sans" ? TYPE.sans : TYPE.handBold)(Math.round(labelSize * K)), smallFont = (face === "sans" ? TYPE.sans : TYPE.hand)(Math.round(smallSize * K));
  const xSched = penSchedule(xLabel ?? "", 0.05);
  const tHead = +(lAt + lineDur).toFixed(3), tRing = +(tHead + 0.16).toFixed(3), tXLabel = +(xLabelTime ?? (tHead + 0.30)).toFixed(3);
  let ring = null;
  const off = quad ? createCanvas(W, H) : null;
  const drawFlat = (c, t) => {
    // --- axes
    drawShape(c, { ...axes, K }, seg(t, at, at + axesDur));
    if (t >= at + axesDur * 0.6) { c.save(); c.font = smallFont; c.fillStyle = axesColor; c.globalAlpha *= clamp01((t - at - axesDur * 0.6) / 0.2); c.textAlign = "right"; c.fillText(originLabel, X0 - 18 * K, Y0 + 20 * K); c.restore(); }
    if (t < lAt) return;
    // --- the curve, at a hand's pace: slow start, fast rise
    const u = easeInOutCubic(seg(t, lAt, lAt + lineDur));
    const part = u >= 1 ? curve : plPartial(curve, u);
    const tip = part[part.length - 1];
    if (hatch && part.length > 2) {
      // hatching under the drawn part, clipped to the tip
      c.save(); c.beginPath(); c.moveTo(X0, Y0); for (const p of part) c.lineTo(p[0], p[1]); c.lineTo(tip[0], Y0); c.closePath(); c.clip();
      c.globalAlpha *= 0.28; c.strokeStyle = axesColor; c.lineWidth = 2.2 * K; c.lineCap = "round";
      const sp = 26 * K;
      for (let hx = X0 - H; hx < tip[0] + 10; hx += sp) { c.beginPath(); c.moveTo(hx, Y0); c.lineTo(hx + (Y0 - Y1), Y1 - 20 * K); c.stroke(); }
      c.restore();
    }
    // a soft shadow under the marker line, then the line
    c.save(); c.shadowColor = "rgba(0,0,0,.22)"; c.shadowBlur = 24 * K; c.shadowOffsetY = 10 * K;
    drawStroke(c, part, { color: lineColor, width: lineWidth, style: "marker", K, seed });
    c.restore();
    if (glow && u < 1) {
      // the pen head: a hot core and a wide halo, and a bright tail on the last stretch
      const tail = plPartial(part, 1).slice(Math.max(0, part.length - 9));
      drawStroke(c, tail, { color: "#FFF6C2", width: lineWidth * 0.55, style: "marker", K, seed, alpha: 0.85 });
      const g = c.createRadialGradient(tip[0], tip[1], 0, tip[0], tip[1], 70 * K);
      g.addColorStop(0, "rgba(255,250,215,.95)"); g.addColorStop(0.25, "rgba(255,230,110,.55)"); g.addColorStop(1, "rgba(255,230,110,0)");
      c.save(); c.fillStyle = g; c.beginPath(); c.arc(tip[0], tip[1], 70 * K, 0, 7); c.fill(); c.restore();
    }
    if (u >= 1) drawShape(c, { strokes: head, style: "marker", color: lineColor, width: lineWidth * 0.85, seed }, seg(t, tHead, tHead + 0.14));
    // --- the figure on the tip
    if (count) {
      const kc = clamp01((t - lAt) / lineDur);
      const v = count.from + (count.to - count.from) * (1 - Math.pow(1 - kc, count.p ?? 1.8));
      const text = kc >= 1 ? (count.land ?? count.fmt(count.to)) : count.fmt(v);
      c.save(); c.font = labelFont; c.fillStyle = labelColor ?? axesColor; c.textAlign = "left"; c.textBaseline = "alphabetic";
      const tw = c.measureText(text).width;
      // the figure rides ABOVE-RIGHT of the tip, switches to above-left past
      // `labelSide` of the width, and never leaves the frame at the top
      const leftSide = tip[0] > (count.labelSide ?? 0.62) * W;
      const lx = leftSide ? tip[0] - tw - 30 * K : tip[0] + 28 * K;
      const ly = Math.max(labelSize * K * 0.95, tip[1] - 26 * K);
      c.shadowColor = labelGlow ?? "rgba(255,255,255,.7)"; c.shadowBlur = (labelGlow ? 40 : 16) * K;
      c.fillText(text, lx, ly);
      c.restore();
      if (kc >= 1 && t >= tRing) {
        if (!ring) ring = { strokes: [roughEllipse(lx + tw / 2, ly - labelSize * K * 0.32, tw / 2 + labelSize * K * 0.3, labelSize * K * 0.62, R, { K, r: 1.1, overshoot: 0.18 })], style: "marker", color: ringColor, width: 8, seed };
        drawShape(c, { ...ring, K }, seg(t, tRing, tRing + 0.34));
      }
    }
    if (xLabel && t >= tXLabel) {
      // under the axis, at `xLabelAt` of its length (the end may be behind the speaker)
      c.save(); c.font = smallFont; const tw = c.measureText(xLabel).width; c.restore();
      writeText(c, xLabel, X0 + (X1 - X0) * (count?.xLabelAt ?? 0.55) - tw / 2, Y0 + smallSize * K * 1.05, smallFont, axesColor, i => clamp01((t - tXLabel - xSched.starts[i]) / 0.07), { K, seed: seed + 3 });
    }
  };
  return {
    id, from, to, mutesCaptions, layer, tHead, tRing, lineAt: lAt,
    cues() {
      if (!sound) return [];
      if (!pens) return [{ t: lAt, kind: "whoosh_in", gain: ILL_LEVELS.whoosh }, { t: tHead, kind: "spark", gain: ILL_LEVELS.spark }];
      const c = [penCue(at, pen, axesDur), { t: lAt, kind: `marker:${lineDur.toFixed(2)}`, gain: HAND_LEVELS.marker + 1 },
        { t: tHead, kind: "spark", gain: ILL_LEVELS.spark }];
      if (count) c.push({ t: tRing, kind: "marker:0.34", gain: HAND_LEVELS.marker });
      if (xLabel) c.push(penCue(tXLabel, pen, xSched.total + 0.07, true));
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = outK;
      if (quad) {
        const o = off.getContext("2d"); o.clearRect(0, 0, W, H); drawFlat(o, t);
        const m = 90 * K;
        warpQuad(ctx, off, X0 - m, Y1 - m, X1 - X0 + 2 * m, Y0 - Y1 + 2 * m, quad);
      } else drawFlat(ctx, t);
      ctx.restore();
    },
  };
}


// ======================================================================================
// THE FUNNEL — the object this channel is actually about: contacts coming in by
// their channels, descending band by band through the statuses, a few leaving by
// the spout.
//
//   funnel({ id, from, to, at, frame, cx: 0.5, cy: 0.52, w: 0.30, h: 0.48,
//            outlineAt: 30.64,
//            bands: { at: 31.20, n: 4 },
//            inputs: [{ t, text: "CHANNEL", side: -1 }],
//            drop:   { at: 32.40, dur: 1.4, n: 7, out: 2 } })
//
// ONE shape read three ways, which is why it is a primitive and not three: bare
// it is "a system", ruled it is "the statuses", a small instance repeated is
// "from the simplest to the most complete". Nothing here writes a status NAME — the
// speaker does not say one in this intro, and a status invented to fill a band is an invented
// claim, which is the trap `verbatim.mjs` exists for. Words appear only through
// `inputs[].text`, and those are checked like any other on-screen word.
// ======================================================================================
export function funnel({
  id = "funnel", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "over",
  cx = 0.5, cy = 0.52, w = 0.30, h = 0.48, taper = 0.30, neck = 0.24,
  outlineAt = null, outlineDur = 0.58, color = INK.graphite, width = 5.4, pen = "pencil",
  bands = null,                 // { at, n, dur, color, width } — the rules, drawn top to bottom
  inputs = [],                  // [{ t, text, side: -1 | 0 | 1, x, y, into, bend }] — an arrow into the mouth
  inputSize = 46, inputColor = INK.graphite, inputPen = "fineliner", inputDur = 0.34,
  inputWidth = 5.0,             // the arrow's line: the weight of the shell, no thinner
  inputHead = 54,               // the head, in 1080p px — left to the auto calculation it fell to
                                //   L×0.16 on a short arrow, i.e. a head nobody can see
  inputGap = 34,                // the arrow STOPS above the mouth instead of touching it:
                                //   resting on it, the head and the cone's corner merged
  dotKind = "person",           // what goes through the funnel: a CONTACT, drawn — not a dot.
                                //   The reviewer rejected leads drawn as coins and asked for
                                //   something more real (2026-09-11). "dot" stays for what is
                                //   not a person (an order, a euro, a signal).
  drop = null,                  // { at, dur, n, out, stagger, from } — dots falling in, `out` of them leaving
                                //   `from`: [[x, y], …] fractional origins cycled through, so the
                                //   contacts fall FROM the things that produced them and not from nowhere
  dotColor = INK.yellow, dotR = 13, dotSize = 0.075, restColor = null,   // dotSize: the figure's height, as a fraction of the frame
  exit = 0.30, seed = hash(id), sound = true, mutesCaptions = false,
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const R = rng(seed);
  const oAt = outlineAt ?? at;
  const CX = cx * W, TOP = (cy - h / 2) * H, BOT = (cy + h / 2) * H;
  const BODY = TOP + (BOT - TOP) * (1 - neck);        // where the cone ends and the neck begins
  const TW = w * W, BW = TW * taper;
  const L0 = CX - TW / 2, R0 = CX + TW / 2, L1 = CX - BW / 2, R1 = CX + BW / 2;
  // the mouth first, then the two slopes, then the neck — the order a hand draws it
  const shell = { strokes: [
    roughLine([L0, TOP], [R0, TOP], R, 1, K),
    roughLine([L0, TOP], [L1, BODY], R, 1, K),
    roughLine([R0, TOP], [R1, BODY], R, 1, K),
    roughLine([L1, BODY], [L1, BOT], R, 0.8, K),
    roughLine([R1, BODY], [R1, BOT], R, 0.8, K),
  ], style: "pencil", color, width, seed };

  const N = bands?.n ?? 0, bDur = bands?.dur ?? 0.18;
  const halfAt = y => TW / 2 + (BW / 2 - TW / 2) * clamp01((y - TOP) / (BODY - TOP));
  const bandY = i => TOP + (BODY - TOP) * ((i + 1) / (N + 1));
  const bandShapes = [];
  for (let i = 0; i < N; i++) {
    const y = bandY(i), hw = halfAt(y) - 12 * K;
    bandShapes.push({ strokes: [roughLine([CX - hw, y], [CX + hw, y], R, 0.9, K)],
      style: "pencil", color: bands.color ?? INK.pencil, width: bands.width ?? 3.4, seed: seed + 31 + i });
  }

  const inFont = TYPE.hand(Math.round(inputSize * K));
  const IN = inputs.map((it, i) => {
    const side = it.side ?? (i % 2 ? 1 : -1);       // 0 is legal: straight into the middle of the mouth
    const ty = (it.y ?? (cy - h / 2 - 0.14 - i * 0.055)) * H;
    const tail = [(it.x ?? (side < 0 ? 0.10 : 0.90)) * W, ty];
    const tip = [CX + side * TW * (it.into ?? 0.34), TOP - (it.gap ?? inputGap) * K];
    return { ...it, side, tail, tip,
      shape: { strokes: arrowStrokes(tail, tip, R, { bend: it.bend ?? (side < 0 ? 0.08 : side > 0 ? -0.08 : 0), r: 0.55, K, head: (it.head ?? inputHead) * K }),
        style: "pencil", color: inputColor, width: inputWidth, seed: seed + 61 + i },
      sched: penSchedule(it.text ?? "", 0.045) };
  });

  const D = [];
  if (drop) {
    const nOut = drop.out ?? 0, stg = drop.stagger ?? 0.10, dur = drop.dur ?? 1.2;
    for (let i = 0; i < (drop.n ?? 0); i++) {
      const t0 = +(drop.at + i * stg).toFixed(3);
      const leaves = i < nOut;
      // a dot that leaves rides the axis out of the spout; a dot that stays
      // settles ON a band — that is what "where each contact stands" looks like
      const restBand = N ? bandY((i - nOut) % N) : BODY;
      const org = drop.from?.length ? drop.from[i % drop.from.length] : null;
      // arrivals AND resting spots are SPREAD deterministically: six contacts
      // drawn at random in a narrow band piled up at the spout and on the
      // levels — which read as a single blot, not as people
      const spread = (k, n) => n <= 1 ? 0 : (k / (n - 1) - 0.5);
      const kOut = leaves ? i : i - nOut, nRest = Math.max(1, (drop.n ?? 0) - nOut);
      D.push({ t0, leaves, dur: leaves ? dur : dur * 0.52,
        x0: org ? org[0] * W + (R() - 0.5) * 34 * K : CX + spread(i, drop.n ?? 1) * TW * 0.78,
        y0: org ? org[1] * H : TOP - (90 + R() * 70) * K,
        x1: leaves ? CX + spread(kOut, Math.max(1, nOut)) * BW * 1.15
                   : CX + spread(kOut, nRest) * TW * 0.58 + (R() - 0.5) * 26 * K,
        y1: leaves ? BOT + (120 + kOut * 46) * K : restBand - 11 * K });
    }
  }

  // the contact pictogram, placed once at the centre of the frame: its parts
  // carry absolute coordinates, so it is translated at draw time instead of
  // re-placing 8 figures every frame
  const PERSON = dotKind === "person"
    ? placeDoodle(DOODLE.person(rng(seed + 404)), { cx: 0.5, cy: 0.5, size: dotSize, frame, rot: 0, style: "pencil", color: INK.graphite, width: 2.6 })
    : null;

  const tEnd = Math.max(oAt + outlineDur, bands ? bands.at + N * bDur : 0,
    ...IN.map(x => x.t + inputDur), ...D.map(d => d.t0 + d.dur));

  return {
    id, from, to, mutesCaptions, layer, endAt: +tEnd.toFixed(3),
    cues() {
      if (!sound) return [];
      const c = [penCue(oAt, pen, outlineDur)];
      for (let i = 0; i < N; i++) c.push(penCue(bands.at + i * bDur, pen, bDur, false, -2));
      for (const it of IN) {
        c.push(penCue(it.t, pen, inputDur, false, -1));
        if (it.text) c.push(penCue(it.t + inputDur, inputPen, it.sched.total + 0.07, true, -1));
      }
      // tick0..3 and not "tick": sfx.mjs synthesises the numbered family, and
      // four variants rather than one — "the same sound every time" has already
      // been rejected. A bare `tick` threw an unknown-effect error at mixing.
      D.forEach((d, i) => { if (d.leaves) c.push({ t: +(d.t0 + d.dur).toFixed(3), kind: `tick${i % 4}`, gain: ILL_LEVELS.tick }); });
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to || t < oAt) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = outK;
      drawShape(ctx, { ...shell, K }, seg(t, oAt, oAt + outlineDur));
      for (let i = 0; i < N; i++) drawShape(ctx, { ...bandShapes[i], K }, seg(t, bands.at + i * bDur, bands.at + i * bDur + bDur));
      for (const it of IN) {
        if (t < it.t) continue;
        drawShape(ctx, { ...it.shape, K }, seg(t, it.t, it.t + inputDur));
        if (!it.text) continue;
        const wAt = it.t + inputDur;
        ctx.save(); ctx.font = inFont;
        const tw = ctx.measureText(it.text).width; ctx.restore();
        const px = it.side < 0 ? it.tail[0] - tw * 0.10 : it.tail[0] - tw * 0.90;
        writeText(ctx, it.text, px, it.tail[1] - inputSize * K * 0.75, inFont, inputColor,
          i2 => clamp01((t - wAt - it.sched.starts[i2]) / 0.07), { K, seed: seed + 77 });
      }
      for (const d of D) {
        if (t < d.t0) continue;
        const u = easeInOutCubic(clamp01((t - d.t0) / d.dur));
        const x = lerp(d.x0, d.x1, u), y = lerp(d.y0, d.y1, u);
        const fade = d.leaves ? 1 - clamp01((t - d.t0 - d.dur) / 0.35) : 1;
        if (fade <= 0.01) continue;
        ctx.save(); ctx.globalAlpha *= fade;
        if (PERSON) {
          // a contact: the pictogram filled in yellow, then traced over in pencil
          ctx.translate(x - W / 2, y - H / 2);
          ctx.save(); ctx.globalAlpha *= 0.92; ctx.fillStyle = d.leaves || !restColor ? dotColor : restColor;
          for (const pt of PERSON.parts) { ctx.beginPath(); pt.pl.forEach(([px, py], j) => j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.fill(); }
          ctx.restore();
          drawParts(ctx, PERSON, 1, K, seed + 404);
        } else {
          ctx.fillStyle = d.leaves || !restColor ? dotColor : restColor;
          ctx.beginPath(); ctx.arc(x, y, dotR * K, 0, 7); ctx.fill();
          ctx.strokeStyle = INK.graphite; ctx.lineWidth = 2.2 * K; ctx.globalAlpha *= 0.5; ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    },
  };
}

// ======================================================================================
// THE SCREEN PUSHED FORWARD — the real capture, taped up behind the speaker, then brought
// to the front until it fills the frame. Two beats: under until `growAt`, then over.
// ======================================================================================
export function screenPush({
  id = "push", from, to, at = from, frame = { w: 1920, h: 1080 }, small = { x: 0.055, y: 0.12, w: 0.46, ratio: 0.60, rot: -0.024 },
  growAt, growDur = 0.55, exit = "left", exitDur = 0.42, img = null, margin = 14, sound = true, seed = hash(id), tape = ["tl", "tr"], mutesCaptions = false, annotate = null,
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h, M = margin * K;
  const R0 = rng(seed);
  const tapeRots = tape.map(k => ({ tl: -0.55, tr: 0.55 }[k] ?? 0) + (R0() - 0.5) * 0.25);
  const sm = { x: small.x * W, y: small.y * H, w: small.w * W, h: small.w * W * small.ratio, rot: small.rot ?? -0.024 };
  // full: the picture fills the frame (its own margin outside)
  const fullH = W * small.ratio, fullY = (H - fullH) / 2;
  const big = { x: -M, y: Math.min(0, fullY) - M, w: W + 2 * M, h: Math.max(H, fullH) + 2 * M, rot: 0 };
  let ring = null;
  const rectAt = t => {
    const k = easeInOutCubic(seg(t, growAt, growAt + growDur));
    return { x: lerp(sm.x, big.x, k), y: lerp(sm.y, big.y, k), w: lerp(sm.w + 2 * M, big.w, k), h: lerp(sm.h + 2 * M, big.h, k), rot: lerp(sm.rot, 0, k), k };
  };
  const draw = (ctx, t, phase) => {
    if (t < from || t > to || t < at) return;
    const inK = easeOutQuint(clamp01((t - at) / 0.36));
    const ex = seg(t, to - exitDur, to);
    if (inK <= 0.005 || ex >= 1) return;
    const r = rectAt(t);
    if (phase === "under" && r.k > 0) return;          // handed over to the over layer
    if (phase === "over" && r.k <= 0) return;
    ctx.save();
    let dx = 0, dy = 0;
    if (exit === "left") dx = -easeInOutCubic(ex) * W * 1.15;
    else if (exit === "up") dy = -easeInOutCubic(ex) * H * 1.15;
    else if (exit === "down") dy = easeInOutCubic(ex) * H * 1.15;
    else if (exit === "fade") ctx.globalAlpha *= 1 - ex;
    ctx.translate(dx, dy);
    const ccx = r.x + r.w / 2, ccy = r.y + r.h / 2;
    ctx.translate(ccx, ccy + (1 - inK) * 40 * K); ctx.rotate(r.rot + (1 - inK) * 0.06 + (exit === "left" ? -easeInOutCubic(ex) * 0.05 : 0)); ctx.scale(lerp(1.06, 1, inK), lerp(1.06, 1, inK)); ctx.translate(-ccx, -ccy);
    ctx.globalAlpha *= clamp01(inK * 1.5);
    drawPaper(ctx, { x: r.x, y: r.y, w: r.w, h: r.h, grid: "none", tone: INK.paperWhite, K, shadow: 1.1 + r.k * 0.6, seed });
    const image = typeof img === "function" ? img(t) : img;
    const px = r.x + M, py = r.y + M, pw = r.w - 2 * M, ph = r.h - 2 * M;
    if (image) {
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
      const s = Math.max(pw / image.width, ph / image.height), iw = image.width * s, ih = image.height * s;
      ctx.drawImage(image, px + (pw - iw) / 2, py + (ph - ih) / 2, iw, ih);
      ctx.restore();
    } else { ctx.fillStyle = "#E8E4DA"; ctx.fillRect(px, py, pw, ph); }
    if (annotate && t >= annotate.t) {
      if (!ring) { const Rr = rng(seed + 3); const [ax, ay, aw, ah] = annotate.rect; ring = { rel: [ax, ay, aw, ah], Rr }; }
      const [ax, ay, aw, ah] = ring.rel; const Rr = rng(seed + 3);
      const sh = { strokes: [roughEllipse(px + ax * pw, py + ay * ph, aw * pw / 2 + 10 * K, ah * ph / 2 + 8 * K, Rr, { K, r: 1.1, overshoot: 0.2 })], style: "marker", color: annotate.color ?? INK.red, width: annotate.width ?? 7, seed };
      drawShape(ctx, { ...sh, K }, seg(t, annotate.t, annotate.t + (annotate.dur ?? 0.36)));
    }
    if (r.k < 0.999) tape.forEach((kk, i) => {
      const tk = easeOutCubic(seg(t, at + 0.18 + i * 0.1, at + 0.30 + i * 0.1)) * (1 - r.k);
      if (tk <= 0) return;
      const [tx, ty] = { tl: [r.x + 26, r.y + 6], tr: [r.x + r.w - 26, r.y + 6] }[kk] ?? [r.x + r.w / 2, r.y + 4];
      ctx.save(); ctx.translate(tx, ty); const sc = lerp(1.35, 1, tk); ctx.scale(sc, sc); ctx.translate(-tx, -ty);
      drawTape(ctx, tx, ty, { K, rot: tapeRots[i], alpha: tk, seed: seed + i });
      ctx.restore();
    });
    ctx.restore();
  };
  const cues = () => {
    if (!sound) return [];
    const c = [{ t: at, kind: "paper_in", gain: HAND_LEVELS.paperIn }];
    if (tape.length) c.push({ t: +(at + 0.18).toFixed(3), kind: "tape", gain: HAND_LEVELS.tape });
    c.push({ t: +growAt.toFixed(3), kind: "whoosh_in", gain: ILL_LEVELS.whoosh });
    if (annotate && annotate.sound !== false) c.push({ t: annotate.t, kind: `marker:${(annotate.dur ?? 0.36).toFixed(2)}`, gain: HAND_LEVELS.marker });
    c.push({ t: +(to - exitDur).toFixed(3), kind: "sheet_out", gain: HAND_LEVELS.sheetOut });
    return c;
  };
  return [
    { id: id + "-under", from, to: growAt + 0.05, layer: "under", mutesCaptions: false, cues, draw: (ctx, t) => draw(ctx, t, "under") },
    { id: id + "-over", from: growAt, to, layer: "over", mutesCaptions, cues: () => [], draw: (ctx, t) => draw(ctx, t, "over") },
  ];
}

// ======================================================================================
// ONE ENORMOUS GLYPH behind the speaker — a "?" as a hand writes it: revealed top to bottom
// (a pen draws a question mark downward), a soft shadow, an optional ring after.
// ======================================================================================
export function bigGlyph({
  id = "glyph", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under", text = "?", cx = 0.25, cy = 0.5, size = 900,
  font = null, color = INK.graphite, dur = 0.5, wipe = "down", rot = -0.05, exit = 0.32, sound = true, pen = "marker", seed = hash(id),
  ring = null, shadow = 0.28, mutesCaptions = false, alpha = 0.94,
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const f = font ?? TYPE.handBold(Math.round(size * K));
  let ringShape = null;
  return {
    id, from, to, mutesCaptions, layer, endAt: +(at + dur).toFixed(3),
    cues() {
      if (!sound) return [];
      const c = [penCue(at, pen, dur, false, 2)];
      if (ring) c.push({ t: +ring.at.toFixed(3), kind: `${ring.pen ?? "marker"}:0.40`, gain: HAND_LEVELS[ring.pen ?? "marker"] });
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      const k = easeInOutCubic(seg(t, at, at + dur));
      ctx.save(); ctx.globalAlpha = outK * alpha;
      ctx.font = f; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const m = ctx.measureText(text);
      const gw = m.width * 1.3, gh = size * K * 1.25, gx = cx * W, gy = cy * H;
      ctx.translate(gx, gy); ctx.rotate(rot); ctx.translate(-gx, -gy);
      ctx.beginPath();
      if (wipe === "down") ctx.rect(gx - gw / 2, gy - gh / 2, gw, gh * k);
      else if (wipe === "up") ctx.rect(gx - gw / 2, gy + gh / 2 - gh * k, gw, gh * k);
      else ctx.rect(gx - gw / 2, gy - gh / 2, gw * k, gh);
      ctx.clip();
      if (shadow > 0) { ctx.shadowColor = `rgba(0,0,0,${shadow})`; ctx.shadowBlur = 40 * K; ctx.shadowOffsetY = 16 * K; }
      ctx.fillStyle = color; ctx.fillText(text, gx, gy + size * K * 0.04);
      ctx.restore();
      if (ring && t >= ring.at) {
        if (!ringShape) { const R = rng(seed + 5); ringShape = { strokes: [roughEllipse(cx * W, cy * H, (ring.rx ?? 0.16) * W, (ring.ry ?? 0.42) * H, R, { K, r: 1.3, overshoot: 0.12 })], style: ring.pen === "pencil" ? "pencil" : "marker", color: ring.color ?? INK.yellow, width: ring.width ?? 22, seed }; }
        ctx.save(); ctx.globalAlpha = outK; drawShape(ctx, { ...ringShape, K }, seg(t, ring.at, ring.at + 0.40)); ctx.restore();
      }
    },
  };
}

// ======================================================================================
// THE DM THREAD NOBODY ANSWERS — a cover's content. Messages go out on the right, one
// after another, each gets its two ticks; on the left a typing indicator appears and
// gives up; a clock in the corner turns fast. No words on screen but "Seen".
// ======================================================================================
export function chatWall({
  id = "chat", at, frame = { w: 1920, h: 1080 }, bubbles = [], typingAt = null, typingDur = 1.1, clock = null, color = INK.graphite, seenColor = INK.blue,
  seed = hash(id), seenLabel = "Seen", sound = true, right = 0.94, left = 0.06, top = 0.14, bubbleH = 0.115, gap = 0.035,
  paperFill = "rgba(255,252,244,.9)", style = "pencil", pen = "fineliner",
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const R = rng(seed);
  const smallFont = TYPE.hand(Math.round(34 * K));
  // geometry once: bubble i at row i
  const B = bubbles.map((b, i) => {
    const w = (b.w ?? 0.30) * W, h = bubbleH * H, x = right * W - w, y = top * H + i * (bubbleH + gap) * H;
    const rect = roughRect(x, y, w, h, R, .8, K);
    const tail = [roughLine([x + w - 6 * K, y + h - 4 * K], [x + w + 22 * K, y + h + 16 * K], R, .8, K), roughLine([x + w + 22 * K, y + h + 16 * K], [x + w - 34 * K, y + h], R, .8, K)];
    const lines = []; const nl = b.lines ?? 2;
    for (let l = 0; l < nl; l++) { const ly = y + h * (0.32 + l * 0.30), lw = w * (l === nl - 1 ? 0.35 + R() * 0.3 : 0.72 + R() * 0.12); lines.push(roughCurve([[x + 26 * K, ly], [x + 26 * K + lw * 0.5, ly + (R() - 0.5) * 6 * K], [x + 26 * K + lw, ly]], R, 1.3, K)); }
    const ticks = checkStrokes(x + w - 44 * K, y + h - 22 * K, 26 * K, R, .8, K).concat(checkStrokes(x + w - 28 * K, y + h - 22 * K, 26 * K, R, .8, K));
    return { ...b, x, y, w, h, rect, tail, lines, ticks, seenAt: b.seenAt ?? +(b.t + 0.9).toFixed(3) };
  });
  const typing = typingAt != null ? (() => { const w = 0.16 * W, h = bubbleH * H * 0.8, x = left * W, y = top * H + (B.length ? (B[B.length - 1].y + B[B.length - 1].h - top * H + gap * H) : 0);
    return { x, y, w, h, rect: roughRect(x, y, w, h, R, .8, K), tail: [roughLine([x + 6 * K, y + h - 4 * K], [x - 20 * K, y + h + 16 * K], R, .8, K), roughLine([x - 20 * K, y + h + 16 * K], [x + 34 * K, y + h], R, .8, K)] }; })() : null;
  const clk = clock ? (() => { const g = DOODLE.clock(R); return { g, placed: placeDoodle(g, { cx: clock.cx, cy: clock.cy, size: clock.size ?? 0.22, frame, style, color, width: 4 }) }; })() : null;
  return {
    id, at,
    cues() {
      if (!sound) return [];
      const c = [];
      for (const b of B) { c.push({ t: +b.t.toFixed(3), kind: "bubble", gain: ILL_LEVELS.bubble }); c.push(penCue(b.t + 0.05, pen, 0.36)); c.push({ t: b.seenAt, kind: "seen", gain: ILL_LEVELS.seen }); }
      if (typing) c.push({ t: +typingAt.toFixed(3), kind: "uipop", gain: ILL_LEVELS.uipop - 3 });
      if (clk) { c.push(penCue(clock.at ?? at, style === "chalk" ? "chalk" : "pencil", 0.5)); for (let tt = (clock.at ?? at) + 0.55; tt < (clock.until ?? at + 4); tt += 0.32) c.push({ t: +tt.toFixed(3), kind: "clock", gain: ILL_LEVELS.clock }); }
      return c;
    },
    draw(ctx, t) {
      if (t < at) return;
      ctx.save();
      for (const b of B) {
        if (t < b.t) continue;
        const k = easeOutBack(clamp01((t - b.t) / 0.28), 1.2);
        ctx.save();
        const ccx = b.x + b.w / 2, ccy = b.y + b.h / 2;
        ctx.translate(ccx, ccy); ctx.scale(lerp(0.7, 1, k), lerp(0.7, 1, k)); ctx.translate(-ccx, -ccy);
        ctx.globalAlpha *= clamp01(k * 2);
        // paper fill so the bubble reads on the grid, then the ink
        ctx.save(); ctx.fillStyle = paperFill; ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.fill(); ctx.restore();
        for (const pl of b.rect) drawStroke(ctx, pl, { color, width: 4, style, K, seed });
        for (const pl of b.tail) drawStroke(ctx, pl, { color, width: 4, style, K, seed });
        const wk = seg(t, b.t + 0.05, b.t + 0.41);
        b.lines.forEach((pl, li) => { const lk = clamp01(wk * b.lines.length - li); if (lk > 0) drawStroke(ctx, lk >= 1 ? pl : plPartial(pl, lk), { color, width: 3, style, K, seed: seed + li, alpha: .55 }); });
        if (t >= b.seenAt) {
          const sk = seg(t, b.seenAt, b.seenAt + 0.22);
          drawShape(ctx, { strokes: b.ticks, style: "marker", color: seenColor, width: 3.6, seed }, sk);
          if (sk >= 1) { ctx.save(); ctx.font = smallFont; ctx.fillStyle = seenColor; ctx.textAlign = "right"; ctx.globalAlpha *= clamp01((t - b.seenAt - 0.22) / 0.2); ctx.fillText(seenLabel, b.x + b.w - 6 * K, b.y + b.h + 40 * K); ctx.restore(); }
        }
        ctx.restore();
      }
      if (typing && t >= typingAt && t <= typingAt + typingDur + 0.25) {
        const k = easeOutBack(clamp01((t - typingAt) / 0.26), 1.2), out = 1 - clamp01((t - typingAt - typingDur) / 0.25);
        ctx.save(); ctx.globalAlpha *= clamp01(k * 2) * out;
        const ccx = typing.x + typing.w / 2, ccy = typing.y + typing.h / 2;
        ctx.translate(ccx, ccy); ctx.scale(lerp(0.7, 1, k), lerp(0.7, 1, k)); ctx.translate(-ccx, -ccy);
        ctx.save(); ctx.fillStyle = paperFill; ctx.fillRect(typing.x, typing.y, typing.w, typing.h); ctx.restore();
        for (const pl of typing.rect) drawStroke(ctx, pl, { color, width: 4, style, K, seed });
        for (const pl of typing.tail) drawStroke(ctx, pl, { color, width: 4, style, K, seed });
        for (let d = 0; d < 3; d++) { const ph = (t - typingAt) * 5 - d * 0.9; const bounce = Math.max(0, Math.sin(ph)) * 10 * K; ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= 0.6 + 0.4 * Math.max(0, Math.sin(ph)); ctx.beginPath(); ctx.arc(typing.x + typing.w * (0.3 + d * 0.2), typing.y + typing.h * 0.55 - bounce, 7 * K, 0, 7); ctx.fill(); ctx.restore(); }
        ctx.restore();
      }
      if (clk && t >= (clock.at ?? at)) {
        const t0 = clock.at ?? at;
        drawParts(ctx, clk.placed, seg(t, t0, t0 + 0.5), K, seed + 9);
        if (t >= t0 + 0.45) {
          const cx = clock.cx * W, cy = clock.cy * H, r = (clock.size ?? 0.22) * H * 0.5;
          const am = (t - t0 - 0.45) * (2 * Math.PI / (clock.minutePeriod ?? 1.1)) - Math.PI / 2, ah = am / 12 - Math.PI / 2 + Math.PI / 2 * 0.4;
          ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = color;
          ctx.lineWidth = 5 * K; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ah) * r * 0.5, cy + Math.sin(ah) * r * 0.5); ctx.stroke();
          ctx.lineWidth = 3.5 * K; ctx.strokeStyle = INK.red; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(am) * r * 0.78, cy + Math.sin(am) * r * 0.78); ctx.stroke();
          ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, 6 * K, 0, 7); ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
    },
  };
}

// ======================================================================================
// TOOL WINDOWS cascading open behind the speaker, then filling with people (the volume).
// ======================================================================================
export function toolWindows({
  id = "tools", from, to, frame = { w: 1920, h: 1080 }, layer = "under", items = [], volumeAt = null, volumeDur = 1.2, color = INK.graphite,
  exit = 0.3, sound = true, seed = hash(id), mutesCaptions = false, rowsPerWindow = 3, perRow = 4,
  bin = null,   // { cx, cy, size, sweepAt, sweepDur?, flightDur?, drawAt?, drawDur?, lidAt?, fill? } — the people all end up in a drawn bin
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const R = rng(seed);
  const WIN = items.map((it, i) => {
    const g = DOODLE.window(rng(seed + i * 3));
    const placed = placeDoodle(g, { cx: it.cx, cy: it.cy, size: it.size ?? 0.22, frame, rot: it.rot ?? 0, style: "pencil", color, width: 4 });
    const bw = g.bw * placed.s, bh = g.bh * placed.s, x0 = it.cx * W - bw / 2, y0 = it.cy * H - bh / 2;
    // the people inside, row by row
    const people = [];
    for (let r = 0; r < rowsPerWindow; r++) for (let c = 0; c < perRow; c++) {
      const pg = DOODLE.person(rng(seed + i * 97 + r * 13 + c));
      const psz = bh * 0.2 / 100 * 100;      // 20 % of the window height
      const cx = (x0 + bw * (0.16 + c * 0.23)) / W, cy = (y0 + bh * (0.36 + r * 0.22)) / H;
      people.push({ ...placeDoodle(pg, { cx, cy, size: psz / H, frame, style: "pencil", color, width: 2.6 }), cx: cx * W, cy: cy * H,
        jx: R() * 2 - 1, jt: R() * 0.06 - 0.03, spin: (R() * 2 - 1) * 0.9 });
    }
    return { ...it, g, placed, bw, bh, x0, y0, people };
  });
  // THE BIN — drawn below the windows before the sweep; on `sweepAt` every person
  // leaves its window along an arc and drops in (the bin's filled body swallows it),
  // an emptied window fades, then the lid falls from above and the bin takes the hit.
  // The brief: the leads appear, then they all go into a bin (2026-09-08).
  const BIN = bin ? (() => {
    const g = DOODLE.bin(rng(seed + 501)), gl = DOODLE.lid(rng(seed + 503));
    const opt = { cx: bin.cx, cy: bin.cy, size: bin.size ?? 0.26, frame, rot: bin.rot ?? 0, style: "pencil", color, width: 4 };
    const body = placeDoodle(g, opt), lid = placeDoodle(gl, opt);
    const s = body.s, x0 = bin.cx * W - g.bw * s / 2, y0 = bin.cy * H - g.bh * s / 2;
    const sweepAt = bin.sweepAt, sweepDur = bin.sweepDur ?? 0.85, flightDur = bin.flightDur ?? 0.36;
    const drawAt = bin.drawAt ?? +(sweepAt - 0.50).toFixed(3), drawDur = bin.drawDur ?? 0.42;
    const lidAt = bin.lidAt ?? +(sweepAt + sweepDur + flightDur + 0.12).toFixed(3);
    // the departures: one stream per window, row by row, the windows slightly offset
    WIN.forEach((w, i) => { const n = w.people.length; w.people.forEach((p, j) => { p.dep = sweepAt + i * 0.05 + (j / n) * sweepDur * 0.92 + p.jt; }); w.lastDep = Math.max(...w.people.map(p => p.dep)); });
    return { g, gl, body, lid, s, x0, y0, cxPx: bin.cx * W, mouth: [bin.cx * W, y0 + g.rimY * s], bottom: y0 + 0.96 * g.bh * s,
      sweepAt, sweepDur, flightDur, drawAt, drawDur, lidAt, fill: bin.fill ?? "rgba(236,231,220,0.97)" };
  })() : null;
  const flight = (p, u) => {   // a quadratic arc from the seat to a point just inside the mouth
    const [mx, my] = BIN.mouth, x1 = mx + p.jx * BIN.g.bw * BIN.s * 0.30, y1 = my + 0.075 * H;
    const cx = (p.cx + x1) / 2, cy = Math.min(p.cy, my) - 0.16 * H, v = 1 - u;
    return [v * v * p.cx + 2 * v * u * cx + u * u * x1, v * v * p.cy + 2 * v * u * cy + u * u * y1];
  };
  const fillPl = (ctx, pl, style) => { ctx.save(); ctx.fillStyle = style; ctx.beginPath(); pl.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.restore(); };
  return {
    id, from, to, mutesCaptions, layer,
    cues() {
      if (!sound) return [];
      const c = [];
      WIN.forEach(w => { c.push({ t: +w.t.toFixed(3), kind: "uipop", gain: ILL_LEVELS.uipop }); c.push(penCue(w.t + 0.04, "fineliner", 0.32)); });
      if (volumeAt != null) { c.push({ t: +volumeAt.toFixed(3), kind: "rattle", gain: ILL_LEVELS.rattle }); c.push({ t: +(volumeAt + 0.45).toFixed(3), kind: "rattle", gain: ILL_LEVELS.rattle - 2 }); c.push(penCue(volumeAt, "fineliner", volumeDur, true, 2)); }
      if (BIN) {
        c.push(penCue(BIN.drawAt, "pencil", BIN.drawDur));
        c.push({ t: +BIN.sweepAt.toFixed(3), kind: "whoosh_out", gain: ILL_LEVELS.whoosh - 4 });       // the pour: one breath, not a swarm of ticks
        c.push({ t: +(BIN.sweepAt + 0.30).toFixed(3), kind: "rattle", gain: ILL_LEVELS.rattle - 3 });
        c.push({ t: +BIN.lidAt.toFixed(3), kind: "thock", gain: ILL_LEVELS.thock - 6 });                // the lid
      }
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = outK;
      const flying = [];
      WIN.forEach((w, i) => {
        if (t < w.t) return;
        const k = easeOutBack(clamp01((t - w.t) / 0.3), 1.4);
        // an emptied window fades once its last person has left
        const gone = BIN ? easeInOutCubic(seg(t, w.lastDep + 0.06, w.lastDep + 0.42)) : 0;
        if (gone >= 0.995) return;
        ctx.save();
        const ccx = w.x0 + w.bw / 2, ccy = w.y0 + w.bh / 2;
        ctx.translate(ccx, ccy); ctx.scale(lerp(0.78, 1, k), lerp(0.78, 1, k)); ctx.translate(-ccx, -ccy);
        ctx.globalAlpha *= clamp01(k * 2) * (1 - gone);
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 30 * K; ctx.shadowOffsetY = 12 * K; ctx.fillStyle = "rgba(252,250,244,.94)"; ctx.fillRect(w.x0, w.y0, w.bw, w.bh); ctx.restore();
        drawParts(ctx, w.placed, seg(t, w.t + 0.04, w.t + 0.36), K, seed + i);
        if (volumeAt != null && t >= volumeAt) {
          // people arrive fast, row by row, window after window
          const per = volumeDur / (WIN.length * w.people.length);
          w.people.forEach((p, j) => {
            const pt = volumeAt + (i * w.people.length + j) * per;
            if (t < pt) return;
            if (BIN && t >= p.dep) { flying.push({ p, j, u: clamp01((t - p.dep) / BIN.flightDur) }); return; }
            drawParts(ctx, p, seg(t, pt, pt + 0.18), K, seed + j, 0.9);
          });
        }
        ctx.restore();
      });
      if (BIN) {
        // the people in the air — drawn BEFORE the bin, so its body swallows them
        for (const { p, j, u } of flying) {
          if (u >= 1) continue;
          const e = u * u * (3 - 2 * u), [x, y] = flight(p, e), sc = lerp(1, 0.62, e);
          ctx.save(); ctx.translate(x, y); ctx.rotate(p.spin * e); ctx.scale(sc, sc); ctx.translate(-p.cx, -p.cy);
          drawParts(ctx, p, 1, K, seed + j, 0.9);
          ctx.restore();
        }
        const prog = seg(t, BIN.drawAt, BIN.drawAt + BIN.drawDur);
        if (prog > 0) {
          const k1 = clamp01((t - BIN.lidAt) / 0.13), k2 = clamp01((t - BIN.lidAt - 0.13) / 0.24);
          const squash = 1 - 0.06 * Math.sin(Math.PI * k2) * (1 - k2);     // the bin taking the hit
          ctx.save();
          if (t >= BIN.lidAt) { ctx.translate(BIN.cxPx, BIN.bottom); ctx.scale(1 / Math.sqrt(squash), squash); ctx.translate(-BIN.cxPx, -BIN.bottom); }
          if (prog > 0.22) fillPl(ctx, BIN.body.parts[0].pl, BIN.fill);
          drawParts(ctx, BIN.body, prog, K, seed + 501);
          if (t >= BIN.lidAt) {
            const dy = -(1 - k1 * k1) * 0.20 * H - Math.sin(Math.PI * k2) * (1 - k2) * 0.02 * H;   // the fall, then one small bounce
            ctx.save(); ctx.translate(0, dy);
            fillPl(ctx, BIN.lid.parts[0].pl, BIN.fill);
            drawParts(ctx, BIN.lid, 1, K, seed + 503);
            ctx.restore();
            // two impact ticks beside the lid, gone in a quarter second
            if (k1 >= 1 && k2 < 0.7) {
              const a = 1 - k2 / 0.7, lx = BIN.x0 - 10 * K, rx = BIN.x0 + BIN.g.bw * BIN.s + 10 * K, ly = BIN.y0 + 0.19 * BIN.g.bh * BIN.s;
              drawStroke(ctx, [[lx, ly - 22 * K], [lx - 26 * K, ly - 44 * K]], { color, width: 3, style: "pencil", K, seed: seed + 9, alpha: a });
              drawStroke(ctx, [[rx, ly - 22 * K], [rx + 26 * K, ly - 44 * K]], { color, width: 3, style: "pencil", K, seed: seed + 10, alpha: a });
            }
          }
          ctx.restore();
        }
      }
      ctx.restore();
    },
  };
}

// ======================================================================================
// THE TARGET — drawn, then an arrow flies in from off-frame and lands in the centre.
// ======================================================================================
export function targetShot({
  id = "target", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under", cx = 0.28, cy = 0.46, size = 0.5, arrowAt, arrowDur = 0.36,
  fromSide = "right", color = INK.graphite, arrowColor = INK.red, exit = 0.3, sound = true, seed = hash(id), mutesCaptions = false, patch = null, drawDur = 0.55,
  pens = true,           // false: only the arrow's flight and its landing are heard
  width = 4.4, arrowWidth = 7, style = "pencil",   // a frame-high target wants a fat marker ring
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const R = rng(seed);
  const g = DOODLE.target(R);
  const placed = placeDoodle(g, { cx, cy, size, frame, style, color, width });
  const tx = cx * W, ty = cy * H;
  // the arrow: shaft + head + fletching, in local px, pointing to +x
  const L = size * H * 0.95;
  const arrow = [roughLine([-L, 0], [-14 * K, 0], R, .6, K), roughLine([-14 * K, 0], [-60 * K, -24 * K], R, .5, K), roughLine([-14 * K, 0], [-60 * K, 24 * K], R, .5, K),
    roughLine([-L, 0], [-L - 40 * K, -22 * K], R, .5, K), roughLine([-L + 30 * K, 0], [-L - 10 * K, -22 * K], R, .5, K), roughLine([-L, 0], [-L - 40 * K, 22 * K], R, .5, K), roughLine([-L + 30 * K, 0], [-L - 10 * K, 22 * K], R, .5, K)];
  // the impact: six short rays in marker
  const rays = []; for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.9 + i * (Math.PI * 1.1 / 6) + (R() - 0.5) * 0.2; rays.push(roughLine([tx + Math.cos(a) * 34 * K, ty + Math.sin(a) * 34 * K], [tx + Math.cos(a) * (80 + R() * 30) * K, ty + Math.sin(a) * (80 + R() * 30) * K], R, .6, K)); }
  const start = fromSide === "right" ? [W * 1.15, ty - H * 0.35] : [-W * 0.15, ty - H * 0.35];
  return {
    id, from, to, mutesCaptions, layer, hitAt: +(arrowAt + arrowDur).toFixed(3),
    cues() {
      if (!sound) return [];
      const c = [{ t: +(arrowAt - 0.02).toFixed(3), kind: "swoosh_in", gain: ILL_LEVELS.swoosh }, { t: +(arrowAt + arrowDur).toFixed(3), kind: "thock", gain: ILL_LEVELS.thock }];
      if (pens) c.unshift(penCue(at, "graphite", drawDur)), c.push({ t: +(arrowAt + arrowDur + 0.02).toFixed(3), kind: "marker:0.22", gain: HAND_LEVELS.marker - 2 });
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = outK;
      if (patch) drawGridPatch(ctx, tx, ty, size * H * 0.5 + (patch.pad ?? 200) * K, size * H * 0.5 + (patch.pad ?? 200) * 0.8 * K, { K, alpha: easeOutCubic(clamp01((t - at + 0.05) / 0.4)), color: patch.color ?? INK.gridGrey, tint: patch.tint ?? 0.16, key: id, fill: patch.fill ?? null });
      drawParts(ctx, placed, seg(t, at, at + drawDur), K, seed);
      if (t >= arrowAt) {
        const u = clamp01((t - arrowAt) / arrowDur), k = 1 - Math.pow(1 - u, 2.2);     // decelerating into the board
        const px = lerp(start[0], tx, k), py = lerp(start[1], ty, k) - Math.sin(u * Math.PI) * H * 0.06;
        const ang = Math.atan2(ty - start[1], tx - start[0]) * (1 - 0.35 * k) + (fromSide === "right" ? 0 : 0);
        // motion ghosts while flying
        const ghosts = u < 1 ? 3 : 0;
        for (let gI = ghosts; gI >= 0; gI--) {
          const gu = clamp01(u - gI * 0.045), gk = 1 - Math.pow(1 - gu, 2.2);
          const gx = lerp(start[0], tx, gk), gy = lerp(start[1], ty, gk) - Math.sin(gu * Math.PI) * H * 0.06;
          ctx.save(); ctx.globalAlpha *= gI ? 0.16 : 1; ctx.translate(gI ? gx : px, gI ? gy : py); ctx.rotate(Math.atan2(ty - start[1], tx - start[0]) * (1 - 0.35 * gk));
          if (u >= 1) { const sh = Math.sin((t - arrowAt - arrowDur) * 42) * Math.exp(-(t - arrowAt - arrowDur) * 7) * 0.12; ctx.rotate(sh); }
          ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 20 * K; ctx.shadowOffsetY = 10 * K;
          for (const pl of arrow) drawStroke(ctx, pl, { color: arrowColor, width: arrowWidth, style: "marker", K, seed });
          ctx.restore();
        }
        if (u >= 1) drawShape(ctx, { strokes: rays, style: "marker", color: INK.yellow, width: 8, seed }, seg(t, arrowAt + arrowDur, arrowAt + arrowDur + 0.22));
      }
      ctx.restore();
    },
  };
}

// ======================================================================================
// PEOPLE — pictograms landing one by one, some ringed together afterwards.
// ======================================================================================
export function crowd({
  id = "crowd", from, to, frame = { w: 1920, h: 1080 }, layer = "under", items = [], size = 0.16, color = INK.graphite, pen = "fineliner", width = 3.4,
  ring = null, exit = 0.3, sound = true, seed = hash(id), mutesCaptions = false, patch = null, drawDur = 0.26,
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const P = items.map((it, i) => ({ ...it, placed: placeDoodle(DOODLE.person(rng(seed + i * 7)), { cx: it.cx, cy: it.cy, size: it.size ?? size, frame, rot: it.rot ?? 0, style: "pencil", color, width }) }));
  let ringShape = null;
  return {
    id, from, to, mutesCaptions, layer,
    cues() {
      if (!sound) return [];
      const c = P.map((p, i) => penCue(p.t, pen, drawDur, false, i % 2 ? -1 : 0));
      if (ring) c.push({ t: +ring.at.toFixed(3), kind: "marker:0.42", gain: HAND_LEVELS.marker });
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = outK;
      if (patch && P.length) { const xs = P.map(p => p.cx * W), ys = P.map(p => p.cy * H); const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
        drawGridPatch(ctx, mx, my, (Math.max(...xs) - Math.min(...xs)) / 2 + (patch.pad ?? 220) * K, (Math.max(...ys) - Math.min(...ys)) / 2 + (patch.pad ?? 220) * K, { K, alpha: easeOutCubic(clamp01((t - P[0].t + 0.05) / 0.4)), color: patch.color ?? INK.gridGrey, tint: patch.tint ?? 0.16, key: id, fill: patch.fill ?? null }); }
      P.forEach((p, i) => { if (t >= p.t) drawParts(ctx, p.placed, seg(t, p.t, p.t + drawDur), K, seed + i); });
      if (ring && t >= ring.at) {
        if (!ringShape) { const R = rng(seed + 99); ringShape = { strokes: [roughEllipse(ring.cx * W, ring.cy * H, ring.rx * W, ring.ry * H, R, { K, r: 1.2, overshoot: 0.16 })], style: "marker", color: ring.color ?? INK.yellow, width: ring.width ?? 12, seed }; }
        drawShape(ctx, { ...ringShape, K }, seg(t, ring.at, ring.at + 0.42));
      }
      ctx.restore();
    },
  };
}

// ======================================================================================
// ①②③ — three ringed digits as a hand draws them, on their own onsets.
// ======================================================================================
export function numbered({
  id = "num", from, to, frame = { w: 1920, h: 1080 }, layer = "under", items = [], size = 150, color = INK.graphite, ringColor = INK.graphite, exit = 0.3, sound = true, seed = hash(id), mutesCaptions = false, pen = "pencil", patch = null,
}) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const font = TYPE.handBold(Math.round(size * K));
  const R = rng(seed);
  const N = items.map((it, i) => ({ ...it, ring: { strokes: [roughEllipse(it.cx * W, it.cy * H, size * K * 0.62, size * K * 0.66, R, { K, r: 1, overshoot: 0.14 })], style: "pencil", color: ringColor, width: 5, seed: seed + i }, text: String(it.n ?? i + 1) }));
  return {
    id, from, to, mutesCaptions, layer,
    cues() { return sound ? N.flatMap(n => [penCue(n.t, pen, 0.34, false, 0), penCue(n.t + 0.34, pen, 0.16, true, -2)]) : []; },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = outK;
      if (patch && N.length) { const xs = N.map(n => n.cx * W); drawGridPatch(ctx, (Math.min(...xs) + Math.max(...xs)) / 2, N[0].cy * H, (Math.max(...xs) - Math.min(...xs)) / 2 + (patch.pad ?? 220) * K, size * K + (patch.pad ?? 220) * 0.6 * K, { K, alpha: easeOutCubic(clamp01((t - N[0].t + 0.05) / 0.4)), color: patch.color ?? INK.gridGrey, tint: patch.tint ?? 0.16, key: id, fill: patch.fill ?? null }); }
      N.forEach((n, i) => {
        if (t < n.t) return;
        drawShape(ctx, { ...n.ring, K }, seg(t, n.t, n.t + 0.34));
        const gk = seg(t, n.t + 0.34, n.t + 0.50);
        if (gk > 0) { ctx.save(); ctx.font = font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color; ctx.globalAlpha *= gk; ctx.fillText(n.text, n.cx * W, n.cy * H + size * K * 0.06); ctx.restore(); }
      });
      ctx.restore();
    },
  };
}

// A handwritten LABEL — one word or phrase written glyph by glyph anywhere, as a
// drawer for a cover or a standalone beat. Kept for the few words that are graphic
// elements (a chart's "1 year"), not captions.
export function label({ id = "label", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "over", text, x, y, size = 64, font = null, color = INK.graphite, align = "left", rot = 0, dt = 0.045, pen = "pencil", sound = true, exit = 0.25, mutesCaptions = false, seed = hash(id) }) {
  const K = frame.w / 1920, W = frame.w, H = frame.h;
  const f = font ?? TYPE.hand(Math.round(size * K));
  const sched = penSchedule(text, dt);
  return {
    id, from, to, mutesCaptions, layer, dur: sched.total + 0.07,
    cues() { return sound ? [penCue(at, pen, sched.total + 0.07, true)] : []; },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      ctx.save(); ctx.globalAlpha = outK; ctx.font = f;
      const w = ctx.measureText(text).width;
      const px = align === "right" ? x * W - w : align === "center" ? x * W - w / 2 : x * W, py = y * H;
      ctx.translate(px, py); ctx.rotate(rot); ctx.translate(-px, -py);
      writeText(ctx, text, px, py, f, color, i => clamp01((t - at - sched.starts[i]) / 0.07), { K, seed });
      ctx.restore();
    },
  };
}

export const cuesOf = beats => beats.flatMap(b => (typeof b.cues === "function" ? b.cues() : []));
