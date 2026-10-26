// THE VERTICAL HEADLINE — the speaker's words, big, at the TOP of the frame, instead of a
// subtitle at the bottom (2026-09-29).
//
// The brief from review: instead of timid subtitles, big text at the top of the
// frame that sometimes, when the shot calls for it, passes behind the person in
// the foreground; Impact and Snell Roundhand in combination. The references the
// reviewer sent: one word the width of the frame above
// the speaker's head ("Captions", "this."), and a condensed word with a script word
// written across it ("LOVE Hard").
//
//   headline({ id, from, to, frame, x: 0.5, y: 0.11, align: "center", layer: "under",
//     lines: [
//       line(at(4.40), imp("IF YOU ARE A", 104)),
//       line(at(5.06), imp("FOUNDER,", 262)),
//       line(at(7.52), scr("like me,", 190), { overlap: 0.42, dx: 0.10, rot: -5 }),
//     ] })
//
// What holds by construction:
//  · every word is the SPEAKER'S, at the onset of the word it IS (plan.mjs authors them from
//    words.json; verbatim.mjs is the gate). A run can carry its own `t`, so a line
//    builds word by word the way the speaker says it.
//  · Impact for the words (capitals, tight), a script for ONE accent per screen
//    (Snell Roundhand Black unless project.json `script` names another face),
//    written ACROSS the line above it (`overlap`, `dx`, `rot`) — the script is a
//    gesture over the type, not a second line of text.
//  · `layer: "under"` puts the whole lockup BEHIND the speaker (the person matte is
//    composited over it): where the speaker's head rises into the text it covers it, where it
//    does not nothing changes. occlusion.mjs measures how much of each word the speaker
//    hides, because "behind me" is an effect only while the word still reads.
//  · sizes are PIXELS AT 1080 WIDE (a vertical master); a line wider than `maxW`
//    is shrunk to fit — the long word gets smaller, the frame never overflows.
//  · on paper (a sheet() child) it is the same figure in INK: `color`, no shadow,
//    no dim.
//  · one soft shadow, no outline (the house rule for glyph edges), plus a wide
//    low dim behind the block — the top of these shots is a bright window.
import { SAFE, FORBIDDEN } from "./safezones.mjs";
import { C, FACE, extractedFace, clamp01, easeOutCubic, easeInOutCubic, easeOutQuint, spring, lerp, seg } from "./scene.mjs";
import { fontFor } from "./titles.mjs";

// The script is Sacramento (scene.mjs, fetched by fonts.mjs). Without it, the fallback
// is the first script of this language, Snell Roundhand — its Bold and Black are faces
// 2 and 3 of a macOS collection, pulled out into the project's assets/fonts — and the
// fallback is SAID, because a short rendered in the face the reviewer rejected is not a detail.
if (!FACE.script || !FACE.scriptBlack) {
  console.error("  ⚠ accent font not found (Sacramento); using Snell Roundhand instead. Run `node fonts.mjs` in the project folder to fetch it.");
  if (!FACE.script) FACE.script = extractedFace("SnellRoundhand-Bold.ttf", "SnellRoundhand.ttc", "Bold", "ScriptAccent");
  if (!FACE.scriptBlack) FACE.scriptBlack = extractedFace("SnellRoundhand-Black.ttf", "SnellRoundhand.ttc", "Black", "ScriptAccentBlack");
}

export const imp = (text, size, extra = {}) => ({ text, k: "impact", size, ...extra });
// the script is Snell Roundhand BLACK by default: the Bold's hairlines vanish on a
// bright wall at the sizes a caption can afford (measured on the first preview)
export const scr = (text, size, extra = {}) => ({ text, k: "script", size, black: true, ...extra });
// one face per line: a script run beside Impact runs reads left to right, and was refused; the
// accent gets its own line, stacked above or below (SKILL.md § The vertical language)
const mixedSaid = new Set();
export const line = (t, ...args) => {
  const opts = args.length && !args[args.length - 1].text ? args.pop() : {};
  const faces = new Set(args.map(r => r.k));
  if (faces.has("impact") && faces.has("script")) {
    const said = args.map(r => r.text).join(" ");
    if (!mixedSaid.has(said)) { mixedSaid.add(said); console.error(`  ⚠ headline line mixes Impact and the script side by side (« ${said} »): one face per line, stack the accent above or below`); }
  }
  return { t, runs: args, ...opts };
};

// ascent of the glyphs we actually draw, as a fraction of the font size — what
// decides where the next line can start. Impact is measured once (caps 0.81,
// descenders 0.04). The SCRIPT is a choice — project.json `script` / `scriptBlack`,
// Snell Roundhand Black by default; Sacramento and Lobster were tested on
// 2026-09-29 because the reviewer did not like Snell — so its metrics are measured on the
// face itself, the first time a layout runs.
const ASC = { impact: 0.81 };
const DESC = { impact: 0.04 };
// A script size in a plan is a SNELL size: every layout was tuned on Snell
// Roundhand Black, and another face is drawn at the size that gives it the same
// x-height. At one size Sacramento's lowercase is 32 % smaller than Snell's and
// Lobster's 37 % bigger — without this a comparison compares sizes, not drawings,
// and a plan written for one face overflows or shrinks with the next. Measured at
// 256 px, where the canvas rounds a glyph's bounds to the pixel (above 256 it
// rounds to 1/64 of the size), so the reference is Snell measured the same way:
// 96 px at 256, hence scale exactly 1 for Snell.
const REF_XH = 96 / 256;
let SCRIPT = null;
function scriptMetrics(ctx) {
  if (SCRIPT) return SCRIPT;
  const S = 256;
  ctx.save();
  ctx.font = fontFor({ k: "script", size: S, black: true });
  const up = ch => ctx.measureText(ch).actualBoundingBoxAscent / S;
  const down = ch => ctx.measureText(ch).actualBoundingBoxDescent / S;
  const xs = [..."acemnorsuvwxz"].map(up).sort((a, b) => a - b);
  const xh = xs[xs.length >> 1];
  SCRIPT = { asc: Math.max(...[..."bdfhklt"].map(up)), desc: Math.max(...[..."fgjpqy"].map(down)), xh,
    scale: xh > 0 ? Math.min(1.6, Math.max(0.6, REF_XH / xh)) : 1 };
  ctx.restore();
  return SCRIPT;
}
const ascOf = (k, ctx) => (k === "script" ? scriptMetrics(ctx).asc : ASC[k] ?? 0.8);
const descOf = (k, ctx) => (k === "script" ? scriptMetrics(ctx).desc : DESC[k] ?? 0.1);

// Lay the block out at rest, in frame pixels. Exported: occlusion.mjs reads the
// same geometry the renderer draws.
// THE FEED'S SAFE ZONES (safezones.mjs, 2026-10-05): unless `safe: false`, the block stays inside
// the safe area: its top never above SAFE.y0, each line no wider than the room the safe area leaves
// it at its height (narrower below y 0.425, where the feed's buttons are on the right).
// `anchor: "bottom"` sets `y` as the bottom of the block, for the words BELOW the speaker's head
// when there is no room above it (on the over layer).
export function layoutHeadline(ctx, spec) {
  const { frame, x = 0.5, align = "center", lines, maxW = 0.90, gap = 0.06, anchor = "top", safe = true } = spec;
  if (anchor === "bottom") {
    const rows = layoutHeadline(ctx, { ...spec, anchor: "top", y: 0.5 });
    const bottom = Math.max(...rows.map(r => r.y1)), want = Math.min(spec.y ?? SAFE.y1, safe ? SAFE.y1 : 1) * frame.h;
    // laid out again at the top this gives, so the per-line room is read at the final height
    return layoutHeadline(ctx, { ...spec, anchor: "top", y: (rows[0].top + want - bottom) / frame.h });
  }
  const y = safe ? Math.max(spec.y ?? 0.11, SAFE.y0 + 0.004) : (spec.y ?? 0.11);
  const W = frame.w, H = frame.h, K = W / 1080;
  const room = (yy, dx = 0) => {
    // the widest a line may be at a height (frame fraction), by its alignment, from where it hangs
    const R = yy > FORBIDDEN[1].y0 - 0.02 ? FORBIDDEN[1].x0 : SAFE.x1;
    const xx = x + dx;
    return align === "center" ? 2 * Math.min(R - xx, xx - SAFE.x0) : align === "right" ? xx - SAFE.x0 : R - xx;
  };
  const out = [];
  let cursor = y * H;
  let prev = null;
  for (const ln of lines) {
    // measure the runs at their authored size, shrink the line to maxW if needed
    const measure = scale => {
      let w = 0, asc = 0, desc = 0;
      const parts = ln.runs.map((r, i) => {
        const size = Math.round(r.size * K * scale * (r.k === "script" ? scriptMetrics(ctx).scale : 1));
        ctx.font = fontFor({ ...r, size });
        const text = r.k === "impact" ? r.text.toUpperCase() : r.text;
        const m = ctx.measureText(text);
        const sp = i < ln.runs.length - 1 && !r.join ? ctx.measureText(" ").width * (r.k === "impact" ? 0.9 : 1) : 0;
        // a script word is measured on ITS OWN letters: "and that's" has no
        // descender, and reserving Sacramento's (0.53 of the size) under it pushed
        // "A LOT" down into the speaker's hair (29 % hidden, measured)
        const a = r.k === "script" ? m.actualBoundingBoxAscent : size * ascOf(r.k, ctx);
        const d = r.k === "script" ? m.actualBoundingBoxDescent : size * descOf(r.k, ctx);
        const p = { ...r, text, size, width: m.width, sp, x0: w, asc: a };
        w += m.width + sp;
        asc = Math.max(asc, a);
        desc = Math.max(desc, d);
        return p;
      });
      return { parts, width: w, asc, desc };
    };
    let m = measure(1);
    // (its bottom, roughly: a line is about its size tall)
    const limit = Math.max(0.2, safe ? Math.min(maxW, room((cursor + m.asc * 1.2) / H, ln.dx ?? 0)) : maxW) * W;
    if (m.width > limit) m = measure(limit / m.width);
    const size = Math.max(...m.parts.map(p => p.size));
    // an overlapping line (the script accent) climbs back INTO the line above
    const top = prev && ln.overlap ? cursor - prev.descGap - ln.overlap * size : cursor;
    const baseline = top + m.asc;
    const ax = (x + (ln.dx ?? 0)) * W;
    const bx = align === "right" ? ax - m.width : align === "center" ? ax - m.width / 2 : ax;
    const row = { ...ln, ...m, size, top, baseline, x0: bx, x1: bx + m.width, y1: baseline + m.desc,
      descGap: m.desc + gap * size * (ln.runs[0]?.k === "script" ? 0.4 : 1) };
    out.push(row);
    cursor = Math.max(cursor, baseline + row.descGap);
    prev = row;
  }
  return out;
}

export function headline({
  id = "headline", from, to, frame = { w: 1080, h: 1920 }, x = 0.5, y = 0.11, align = "center",
  lines = [], layer = "under", maxW = 0.90, gap = 0.06, anchor = "top", safe = true,
  enter = 0.26, exit = 0.09,
  color = "#FFFFFF", hot = C.yellow,
  shadow = 1,            // 0 on paper
  dim = 0.24,            // the wide soft darkening behind the block (0 on paper)
  pop = 1.24,            // the size a word arrives at; 1 = it only fades in (a discreet subtitle)
  mutesCaptions = true,
}) {
  const spec = { frame, x, y, align, lines, maxW, gap, anchor, safe };
  let laid = null;
  const beat = {
    id, from, to, layer, mutesCaptions, kind: "headline", spec,
    cues() { return []; },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      const W = frame.w, H = frame.h, K = W / 1080;
      ctx.save();
      ctx.textBaseline = "alphabetic";
      if (!laid) laid = layoutHeadline(ctx, spec);
      // the dim lands with the first run and leaves with the block
      if (dim > 0) {
        const first = laid[0], last = laid[laid.length - 1];
        const k0 = clamp01((t - (first.t ?? from)) / 0.18);
        const x0 = Math.min(...laid.map(r => r.x0)), x1 = Math.max(...laid.map(r => r.x1));
        const cx = (x0 + x1) / 2, cy = (first.top + last.y1) / 2;
        const rx = (x1 - x0) * 0.62 + 170 * K, ry = (last.y1 - first.top) * 0.62 + 150 * K;
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
          // a pop, not a fade: the word arrives a size too big and settles with
          // one overshoot. A `slam` run drops in from much bigger, faster — the
          // payoff word that lands like something heavy.
          const k = p.slam ? easeOutQuint(clamp01((t - t0) / 0.16)) : spring(u, 3.3, 5.6);
          const sc = p.slam ? lerp(1.9, 1, k) : lerp(pop, 1, clamp01(k));
          const a = clamp01((t - t0) / (p.slam ? 0.06 : 0.09));
          const rot = ((row.rot ?? 0) + (p.rot ?? 0)) * Math.PI / 180;
          const px = row.x0 + p.x0 + p.width / 2, py = row.baseline - (p.asc ?? p.size * ascOf(p.k, ctx)) * 0.5;
          ctx.save();
          ctx.globalAlpha = a * outK;
          ctx.translate(px, py); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-px, -py);
          ctx.font = fontFor(p);
          if (shadow > 0) {
            ctx.shadowColor = `rgba(0,0,0,${(0.46 * shadow).toFixed(3)})`;
            ctx.shadowBlur = 30 * K; ctx.shadowOffsetY = 10 * K;
          }
          ctx.fillStyle = p.color ?? (p.hot ? hot : color);
          ctx.fillText(p.text, row.x0 + p.x0, row.baseline);
          ctx.restore();
        }
      }
      ctx.restore();
    },
  };
  MADE.push(beat);
  return beat;
}

// THE GROUND OF THE HEADLINE — a vertical shade over the top of the frame, on the
// UNDER layer, so the room darkens and the SPEAKER does not (the matte puts the speaker
// back on top of it). The shots this was built on have a white ceiling and a bright window
// exactly where the words go: white Impact measured next to nothing against them,
// and a thin script word disappeared outright. It is not a plate — it has no edge,
// it falls off to nothing by `bottom`, and it reads as the top of the room being
// in shadow, the look of the references the reviewer sent.
//   shade({ id, from, to, frame, bottom: 0.46, alpha: 0.52 })
export function shade({ id = "shade", from, to, frame = { w: 1080, h: 1920 }, top = 0, bottom = 0.46, alpha = 0.5,
  fade = 0.25, layer = "under", color = "8,9,12" }) {
  return {
    id, from, to, layer, mutesCaptions: false,
    cues() { return []; },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const k = Math.min(clamp01((t - from) / fade), clamp01((to - t) / fade));
      if (k <= 0.005) return;
      const W = frame.w, H = frame.h, y0 = top * H, y1 = bottom * H;
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      // an ease-out falloff: most of the darkening stays high, where the words are
      for (let i = 0; i <= 8; i++) { const u = i / 8; g.addColorStop(u, `rgba(${color},${(alpha * Math.pow(1 - u, 1.6)).toFixed(3)})`); }
      ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0); ctx.restore();
    },
  };
}
// every headline the plan made, those a figure holds inside it too (a plate's subtitles): what
// sequence.mjs reads the words on screen from
export const MADE = [];

// One headline per phrase, back to back: each screen holds until the next one
// starts (a short crossfade, never a gap in which the top of the frame is empty
// while the speaker is still talking), the last one until `end`.
export function headlines(screens, { frame, end, ...common } = {}) {
  return screens.map((s, i) => {
    const next = screens[i + 1];
    const from = s.from ?? Math.min(...s.lines.map(l => l.t));
    const to = s.to ?? (next ? (next.from ?? Math.min(...next.lines.map(l => l.t))) + 0.06 : end);
    return headline({ ...common, ...s, frame, from: +(from - 0.02).toFixed(3), to: +to.toFixed(3) });
  });
}
