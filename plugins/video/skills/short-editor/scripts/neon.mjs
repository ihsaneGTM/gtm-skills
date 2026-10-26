// ======================================================================================
// THE NEON LANGUAGE — the figures of the edit brought as a reference on
// 2026-09-07 (youtube.com/watch?v=NqHd-89RycA): very high quality, lots of
// motion, visual effects and play of light.
//
// What that edit actually does, read off the five frames the reviewer sent:
//   · the CAPTIONS are the typography — huge, bold, white, blooming, two sizes in
//     one phrase, words popping in on their own onsets (see subs.mjs, style "hero");
//   · UI objects float at several DEPTHS with real depth-of-field blur, drifting —
//     notification badges, comment cards, a browser window;
//   · a full-frame dark CUTAWAY every so often: a deep blue-to-black ground, the
//     objects floating in it, a title across the top;
//   · a LIGHT SWEEP or a flash carries every hard change;
//   · one enormous glowing WORD sits behind the speaker.
//
// The reference's room is lit with blue neon and the speaker's is a white wall, so the
// light here is COMPOSITED (a glow behind the speaker on the under layer, a streak in
// front) and the speaker's footage is never regraded — that rule stands.
//
// Every figure is a beat: { id, from, to, layer, draw(ctx,t), cues() }.
import { C, clamp01, easeOutCubic, easeInOutCubic, easeOutQuint, spring, lerp, seg, roundRect, createCanvas } from "./scene.mjs";
import { camMap } from "./hand.mjs";
import { TYPE } from "./titles.mjs";

export const NEON = {
  night: "#04060C", deep: "#0B1A3A", blue: "#1E4FE8", cyan: "#3FC8FF", ink: "#0A0C12",
  card: "#FFFFFF", bar: "#D8DEE9", avatar: "#B9C3D2", badge: "#FF3B30", yellow: C.yellow,
};
// dB relative to the voice, on top of project.json sfxMasterDb — same scale as edl.mjs
export const NEON_LEVELS = { sweep: -21, flash: -19, pop: -25, lock: -18, riser: -20, whoosh: -20 };

const cue = (t, kind, gain) => ({ t: +t.toFixed(3), kind, gain });

// ─────────────────────────────────────────────────────────────────────────────────
// A DARK CUTAWAY over the whole frame. `hole` (a stencil getter) cuts the speaker's
// silhouette out of it, so the picture only exists through them.
// ─────────────────────────────────────────────────────────────────────────────────
export function panel({
  id = "panel", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "over",
  enter = "flash", enterDur = 0.34, exit = "sweep", exitDur = 0.46,
  top = NEON.deep, bottom = NEON.night, vignette = true, children = [],
  hole = null, cam = null, anchorY = 0.28, mutesCaptions = false, sound = true,
}) {
  const W = frame.w, H = frame.h, K = W / 1920;
  const landAt = +(at + enterDur).toFixed(3), outAt = +(to - exitDur).toFixed(3);
  const kids = children.map(ch => (typeof ch === "function" ? { draw: ch, cues: () => [] } : ch));
  let off = null;
  return {
    id, from, to, layer, mutesCaptions, landAt, outAt,
    cues() {
      if (!sound) return [];
      const c = [];
      if (enter === "flash") c.push(cue(at, "flash_in", NEON_LEVELS.flash));
      else c.push(cue(at, "whoosh_in", NEON_LEVELS.whoosh));
      if (exit === "sweep") c.push(cue(outAt, "swoosh_in", NEON_LEVELS.sweep));
      for (const k of kids) if (typeof k.cues === "function") c.push(...k.cues());
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const inK = easeOutQuint(clamp01((t - at) / enterDur));
      if (inK <= 0.002) return;
      // the exit: a light-edged wipe travelling right, or a plain fade
      const outK = clamp01((t - outAt) / exitDur);
      if (outK >= 1) return;
      if (!off) off = createCanvas(W, H);
      const o = off.getContext("2d");
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.clearRect(0, 0, W, H);
      // the ground
      const g = o.createLinearGradient(0, 0, W * 0.35, H);
      g.addColorStop(0, top); g.addColorStop(1, bottom);
      o.fillStyle = g; o.fillRect(0, 0, W, H);
      // a cold key light in the upper left, the way the reference is lit
      const rg = o.createRadialGradient(W * 0.24, H * 0.16, 0, W * 0.24, H * 0.16, W * 0.62);
      rg.addColorStop(0, "rgba(70,150,255,.34)"); rg.addColorStop(1, "rgba(70,150,255,0)");
      o.fillStyle = rg; o.fillRect(0, 0, W, H);
      if (vignette) {
        const vg = o.createRadialGradient(W / 2, H / 2, H * 0.30, W / 2, H / 2, H * 0.86);
        vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.55)");
        o.fillStyle = vg; o.fillRect(0, 0, W, H);
      }
      for (const k of kids) k.draw(o, t);
      // the speaker's silhouette punched out of it
      if (hole) {
        const st = typeof hole === "function" ? hole() : hole;
        const img = st && st.at(t);
        if (img) {
          const M = camMap(cam, anchorY, W, H, t);
          o.globalCompositeOperation = "destination-out";
          o.drawImage(img, M.dx, M.dy, W * M.z, H * M.z);
          o.globalCompositeOperation = "source-over";
        }
      }
      ctx.save();
      // the entrance: a flash of white, then the panel
      ctx.globalAlpha = inK;
      if (exit === "sweep" && outK > 0) {
        // the panel is cut away by a vertical edge travelling right, a hot line on it
        const e = easeInOutCubic(outK) * (W + W * 0.18) - W * 0.09;
        ctx.beginPath(); ctx.rect(e, 0, W - e, H); ctx.clip();
        ctx.drawImage(off, 0, 0);
        ctx.restore(); ctx.save();
        const lg = ctx.createLinearGradient(e - W * 0.06, 0, e + W * 0.02, 0);
        lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.7, "rgba(210,235,255,.75)"); lg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = inK * (1 - outK * 0.2);
        ctx.fillStyle = lg; ctx.fillRect(e - W * 0.06, 0, W * 0.08, H);
      } else {
        ctx.globalAlpha = inK * (1 - easeInOutCubic(outK));
        ctx.drawImage(off, 0, 0);
      }
      if (enter === "flash" && inK < 1) { ctx.globalAlpha = (1 - inK) * 0.85; ctx.fillStyle = "#EAF4FF"; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// OBJECTS FLOATING AT DEPTH — the signature of that edit. `depth` 0 = at the
// speaker's distance (sharp), 1 = far in front/behind (big blur, big scale). Each one drifts.
// kinds: "card" (a lead row), "dot" (a notification badge), "window" (a capture),
// "tile" (a rounded plate with a logo), "paper" (the pencil pass's cream card).
// ─────────────────────────────────────────────────────────────────────────────────
export function floaters({
  id = "float", from, to, frame = { w: 1920, h: 1080 }, layer = "under", items = [],
  exit = 0.34, sound = true, glow = true,
}) {
  const W = frame.w, H = frame.h, K = W / 1920;
  return {
    id, from, to, layer, mutesCaptions: false,
    cues() { return sound ? items.filter(i => i.sound !== false).map(i => cue(i.t, i.cue ?? "uipop", i.gain ?? NEON_LEVELS.pop)) : []; },
    draw(ctx, t) {
      if (t < from || t > to) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      for (const it of items) {
        const t0 = it.t ?? from, dur = it.enter ?? 0.46;
        const k = spring(clamp01((t - t0) / dur), 3.1, 5.6);
        if (k <= 0.004) continue;
        const life = t - t0;
        const d = it.depth ?? 0;
        const blur = (it.blur ?? d * 26) * K;
        const s = (it.size ?? 0.16) * (1 + d * 0.55) * lerp(0.82, 1, Math.min(1, k));
        const dx = (it.drift?.[0] ?? 0) * life * 0.01, dy = (it.drift?.[1] ?? -0.012) * life;
        const cx = (it.x + dx) * W, cy = (it.y + dy + (1 - Math.min(1, k)) * 0.03) * H;
        ctx.save();
        ctx.globalAlpha = outK * clamp01(k * 1.4) * (it.alpha ?? 1) * (1 - d * 0.18);
        if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
        ctx.translate(cx, cy); ctx.rotate((it.rot ?? 0) * Math.PI / 180);
        drawObject(ctx, it, s * H, K, t, glow);
        ctx.restore();
      }
    },
  };
}

function drawObject(ctx, it, S, K, t, glow) {
  const kind = it.kind ?? "card";
  if (glow && kind !== "paper") { ctx.shadowColor = it.glowColor ?? "rgba(120,190,255,.55)"; ctx.shadowBlur = 60 * K; }
  else if (kind === "paper") { ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 34 * K; ctx.shadowOffsetY = 14 * K; }
  if (kind === "dot") {
    const r = S * 0.5;
    ctx.fillStyle = it.color ?? NEON.card;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = NEON.badge;
    ctx.beginPath(); ctx.arc(r * 0.72, -r * 0.72, r * 0.42, 0, 7); ctx.fill();
    if (it.n != null) { ctx.fillStyle = "#fff"; ctx.font = TYPE.sans(Math.round(r * 0.5)); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(it.n), r * 0.72, -r * 0.70); }
    return;
  }
  if (kind === "window" && it.img) {
    const img = typeof it.img === "function" ? it.img(t) : it.img;
    if (!img) return;
    const w = S * 1.72, h = w * (img.height / img.width);
    ctx.fillStyle = "#0E1218";
    roundRect(ctx, -w / 2, -h / 2 - 22 * K, w, h + 22 * K, 18 * K); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.save(); roundRect(ctx, -w / 2, -h / 2, w, h, 14 * K); ctx.clip();
    ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
    return;
  }
  if (kind === "tile" && it.img) {
    const img = typeof it.img === "function" ? it.img(t) : it.img;
    if (!img) return;
    ctx.drawImage(img, -S / 2, -S / 2, S, S);
    return;
  }
  // a lead row: an avatar, a name bar, a company bar — the shape of a real list
  const w = S * (it.ratio ?? 2.9), h = S;
  const paper = kind === "paper";
  ctx.fillStyle = paper ? "#F6F1E6" : (it.color ?? NEON.card);
  roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.26); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = paper ? "rgba(45,48,56,.28)" : NEON.avatar;
  ctx.beginPath(); ctx.arc(-w / 2 + h * 0.60, 0, h * 0.30, 0, 7); ctx.fill();
  ctx.fillStyle = paper ? "rgba(45,48,56,.22)" : NEON.bar;
  roundRect(ctx, -w / 2 + h * 1.05, -h * 0.26, w * 0.42, h * 0.20, h * 0.10); ctx.fill();
  roundRect(ctx, -w / 2 + h * 1.05, h * 0.06, w * 0.28, h * 0.17, h * 0.085); ctx.fill();
  if (it.check) {
    ctx.strokeStyle = paper ? NEON.yellow : "#2ED573"; ctx.lineWidth = h * 0.11; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(w / 2 - h * 0.78, 0); ctx.lineTo(w / 2 - h * 0.56, h * 0.20); ctx.lineTo(w / 2 - h * 0.24, -h * 0.24); ctx.stroke();
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// THE FLAT LINE, THEN THE CASCADE. Not a straight line at the end but a
// cascading rise (2026-09-07). A dead-flat glowing line is drawn
// across the frame — nothing is happening — and then it climbs as a STAIRCASE:
// each step a jump and a run, each with its own tick and a hot head, so the rise
// reads as compounding rather than as one lucky kick.
// ─────────────────────────────────────────────────────────────────────────────────
export function cascade({
  id = "cascade", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "over",
  x0 = 0.06, xa = 0.58, x1 = 0.94, y = 0.60, flatDur = 1.30,
  riseAt = null, steps = 4, rise = 0.34, stepDur = 0.13,
  color = "#FFE24A", flatColor = null, width = 14, glow = true, exit = 0.2, sound = true, mutesCaptions = false,
}) {
  const W = frame.w, H = frame.h, K = W / 1920;
  const rAt = riseAt ?? +(at + flatDur + 0.1).toFixed(3);
  const dx = (x1 - xa) / steps, dy = rise / steps;
  return {
    id, from, to, layer, mutesCaptions, riseAt: rAt, endAt: +(rAt + steps * stepDur).toFixed(3),
    cues() {
      if (!sound) return [];
      const c = [cue(at, "air_in", NEON_LEVELS.riser - 2)];
      for (let i = 0; i < steps; i++) c.push(cue(rAt + i * stepDur, i === steps - 1 ? "impact_soft" : "tick2", i === steps - 1 ? -19 : -26));
      return c;
    },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (outK <= 0.005) return;
      const w = width * K;
      ctx.save();
      ctx.globalAlpha = outK;
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = w;
      ctx.strokeStyle = color;
      if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 34 * K; }
      // the flat stretch, drawn left to right
      const fk = clamp01((t - at) / flatDur);
      const fx = lerp(x0, xa, easeInOutCubic(fk)) * W;
      if (flatColor) { ctx.save(); ctx.strokeStyle = flatColor; if (glow) ctx.shadowColor = flatColor; }
      ctx.beginPath(); ctx.moveTo(x0 * W, y * H); ctx.lineTo(fx, y * H); ctx.stroke();
      if (flatColor) ctx.restore();
      let hx = fx, hy = y * H;
      // the staircase
      for (let i = 0; i < steps; i++) {
        const k = clamp01((t - (rAt + i * stepDur)) / stepDur);
        if (k <= 0) break;
        const yTop = (y - dy * (i + 1)) * H, yBase = (y - dy * i) * H;
        const xL = (xa + dx * i) * W, xR = (xa + dx * (i + 1)) * W;
        // each step: the jump first, then the run
        const kj = clamp01(k / 0.45), kr = clamp01((k - 0.45) / 0.55);
        ctx.beginPath(); ctx.moveTo(xL, yBase); ctx.lineTo(xL, lerp(yBase, yTop, easeOutCubic(kj))); ctx.stroke();
        hx = xL; hy = lerp(yBase, yTop, easeOutCubic(kj));
        if (kr > 0) {
          ctx.beginPath(); ctx.moveTo(xL, yTop); ctx.lineTo(lerp(xL, xR, easeOutCubic(kr)), yTop); ctx.stroke();
          hx = lerp(xL, xR, easeOutCubic(kr)); hy = yTop;
        }
      }
      // the hot head, wherever the line currently ends
      if (glow) {
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 64 * K);
        g.addColorStop(0, "rgba(255,252,220,.95)"); g.addColorStop(0.3, "rgba(255,226,74,.5)"); g.addColorStop(1, "rgba(255,226,74,0)");
        ctx.shadowColor = "transparent";
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 64 * K, 0, 7); ctx.fill();
      }
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// A COLD LIGHT BEHIND THE SPEAKER — the room they do not have, composited. Under
// layer: it never touches the speaker's face.
// ─────────────────────────────────────────────────────────────────────────────────
export function glowLight({
  id = "glow", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under",
  x = 0.5, y = 0.42, r = 0.62, color = "90,160,255", alpha = 0.5, enter = 0.6, exit = 0.5, pulse = 0.06,
}) {
  const W = frame.w, H = frame.h;
  return {
    id, from, to, layer, mutesCaptions: false, cues: () => [],
    draw(ctx, t) {
      if (t < from || t > to) return;
      const k = easeOutCubic(clamp01((t - at) / enter)) * (1 - easeInOutCubic(seg(t, to - exit, to)));
      if (k <= 0.005) return;
      const a = alpha * k * (1 + Math.sin((t - at) * 2.1) * pulse);
      const R = r * W;
      const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, R);
      g.addColorStop(0, `rgba(${color},${(a).toFixed(3)})`);
      g.addColorStop(0.55, `rgba(${color},${(a * 0.34).toFixed(3)})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// THE ROOM GOES DARK BEHIND THE SPEAKER. The reference is shot in a dark room lit with
// blue neon; this room is a white wall, and a coloured glow on a bright wall reads
// as a tint, not as light. So the ROOM is darkened — on the UNDER layer, which the
// matte puts behind the speaker: the wall and the desk go moody and their face is never
// touched (the footage is still not regraded, which is the standing rule).
// ─────────────────────────────────────────────────────────────────────────────────
export function roomDark({
  id = "room", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under",
  alpha = 0.52, color = "4,8,18", edge = 0.34, cx = 0.52, cy = 0.40, enter = 0.55, exit = 0.45,
}) {
  const W = frame.w, H = frame.h;
  return {
    id, from, to, layer, mutesCaptions: false, cues: () => [],
    draw(ctx, t) {
      if (t < from || t > to) return;
      const k = easeOutCubic(clamp01((t - at) / enter)) * (1 - easeInOutCubic(seg(t, to - exit, to)));
      if (k <= 0.005) return;
      ctx.save();
      ctx.fillStyle = `rgba(${color},${(alpha * k).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      // a vignette on top, so the corners fall away further than the middle
      const g = ctx.createRadialGradient(cx * W, cy * H, H * 0.22, cx * W, cy * H, H * 0.95);
      g.addColorStop(0, `rgba(${color},0)`);
      g.addColorStop(1, `rgba(${color},${(edge * k).toFixed(3)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// A LIGHT STREAK crossing the frame — what carries a hard change in that edit.
// ─────────────────────────────────────────────────────────────────────────────────
export function sweep({
  id = "sweep", at, frame = { w: 1920, h: 1080 }, layer = "over", dur = 0.52,
  angle = -0.30, width = 0.20, color = "220,240,255", peak = 0.55, sound = true,
}) {
  const W = frame.w, H = frame.h;
  return {
    id, from: +(at - 0.02).toFixed(3), to: +(at + dur + 0.02).toFixed(3), layer, mutesCaptions: false,
    cues() { return sound ? [cue(at, "swoosh_in", NEON_LEVELS.sweep)] : []; },
    draw(ctx, t) {
      const k = clamp01((t - at) / dur);
      if (k <= 0 || k >= 1) return;
      const a = Math.sin(k * Math.PI) * peak;
      const cx = lerp(-0.35, 1.35, easeInOutCubic(k)) * W;
      ctx.save();
      ctx.translate(cx, H / 2); ctx.rotate(angle); ctx.translate(-cx, -H / 2);
      const g = ctx.createLinearGradient(cx - width * W / 2, 0, cx + width * W / 2, 0);
      g.addColorStop(0, `rgba(${color},0)`);
      g.addColorStop(0.5, `rgba(${color},${a.toFixed(3)})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g; ctx.fillRect(cx - width * W / 2, -H, width * W, H * 3);
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// ONE ENORMOUS GLOWING WORD behind the speaker — the reference's "Game Changer" plate.
// ─────────────────────────────────────────────────────────────────────────────────
export function bigWord({
  id = "bigword", from, to, at = from, frame = { w: 1920, h: 1080 }, layer = "under",
  text = "", size = 300, x = 0.5, y = 0.46, lines = null, enter = 0.5, exit = 0.4,
  color = "#FFFFFF", glow = 1, mutesCaptions = false, sound = true, rise = 0.05,
  face = "sans",        // "sans" (the validated title face) | "hand" (the pencil pass's)
}) {
  const W = frame.w, H = frame.h, K = W / 1920;
  const rows = lines ?? [text];
  return {
    id, from, to, layer, mutesCaptions,
    cues() { return sound ? [cue(at, "riser", NEON_LEVELS.riser)] : []; },
    draw(ctx, t) {
      if (t < from || t > to || t < at) return;
      const k = easeOutQuint(clamp01((t - at) / enter));
      const outK = 1 - easeInOutCubic(seg(t, to - exit, to));
      if (k <= 0.004 || outK <= 0.005) return;
      const f = (face === "hand" ? TYPE.handBold : TYPE.sans)(Math.round(size * K));
      ctx.save();
      ctx.font = f; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.globalAlpha = outK * k;
      const lh = size * K * 0.92;
      rows.forEach((row, i) => {
        const py = (y * H) + (i - (rows.length - 1) / 2) * lh + (1 - k) * rise * H;
        for (const [b, a] of [[110 * K * glow, 0.55], [46 * K * glow, 0.65], [0, 1]]) {
          ctx.shadowColor = b ? `rgba(255,255,255,${a})` : "transparent";
          ctx.shadowBlur = b;
          ctx.fillStyle = color;
          ctx.fillText(row, x * W, py);
        }
      });
      ctx.restore();
    },
  };
}

export const cuesOf = beats => beats.flatMap(b => (typeof b.cues === "function" ? b.cues() : []));
