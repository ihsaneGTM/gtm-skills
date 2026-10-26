// The beat vocabulary: reusable graphic figures a project's plan.mjs
// instantiates with its own timings and content. Each factory returns
// { id, from, to, draw(ctx, t) }.
//
// House rule, learned the hard way: NO stacked bullet lists. A list on screen
// is a slide, and review rejected every one of them. Use a figure — logos
// in orbit, counters, silhouettes, a real product screen. If the only honest
// figure is a list, draw nothing and let the subtitles carry it.
//
// Second house rule: these float on the progressive blur, not on a black plate.
// Give thin strokes a dark underlay instead of giving the whole beat a ground.
import {
  CARD, C, F, clamp01, easeOutCubic, easeInOutCubic, easeOutQuint, easeOutBack,
  spring, lerp, seg, roundRect, pill, loadImage, drawPipecornP,
} from "./scene.mjs";
import { drawBrand } from "./brand.mjs";
import { HOUSE_MARK } from "./house.mjs";

const CXC = CARD.x + CARD.w / 2;

// --- shared figures -----------------------------------------------------------

// An S-curve that draws itself from a to b, like the map's edges. Returns the
// head position so a caller can hang a label off it.
export function branch(ctx, ax, ay, bx, by, k, { color = "rgba(255,255,255,.34)", width = 2.6, dash = null } = {}) {
  if (k <= 0) return;
  const mx = (ax + bx) / 2;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
  if (dash) ctx.setLineDash(dash);
  const N = 48, P = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, iu = 1 - u;
    const b0 = iu * iu * iu, b1 = 3 * iu * iu * u, b2 = 3 * iu * u * u, b3 = u * u * u;
    P.push([b0 * ax + b1 * mx + b2 * mx + b3 * bx, b0 * ay + b1 * ay + b2 * by + b3 * by]);
  }
  const upto = Math.max(1, Math.round(N * clamp01(k)));
  const path = () => { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i <= upto; i++) ctx.lineTo(P[i][0], P[i][1]); };
  // dark underlay: the figure sits on a blurred photo, not on a plate
  ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = "rgba(0,0,0,.45)";
  ctx.lineWidth = width + 3.5; path(); ctx.stroke(); ctx.restore();
  path(); ctx.stroke();
  ctx.restore();
  return P[upto];
}

export function checkMark(ctx, x, y, r, k, color = "#0EA968") {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = clamp01(k);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = "#0B0B0B"; ctx.lineWidth = r * 0.30; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const p = easeOutCubic(clamp01(k * 1.4 - 0.25));
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, r * 0.03);
  const m = [-r * 0.10, r * 0.36], e = [r * 0.44, -r * 0.34];
  if (p < 0.45) { const u = p / 0.45; ctx.lineTo(lerp(-r * 0.42, m[0], u), lerp(r * 0.03, m[1], u)); }
  else { const u = (p - 0.45) / 0.55; ctx.lineTo(m[0], m[1]); ctx.lineTo(lerp(m[0], e[0], u), lerp(m[1], e[1], u)); }
  ctx.stroke();
  ctx.restore();
}

export function crossMark(ctx, x, y, r, k, color = "#E5484D") {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = clamp01(k);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = r * 0.28; ctx.lineCap = "round";
  const d = r * 0.40 * easeOutBack(clamp01(k * 1.5 - 0.3));
  ctx.beginPath(); ctx.moveTo(-d, -d); ctx.lineTo(d, d); ctx.moveTo(d, -d); ctx.lineTo(-d, d); ctx.stroke();
  ctx.restore();
}

// A generated portrait clipped into a disc with a dark ring. `squash` lets a
// beat give it a small landing bounce.
export function personaDisc(ctx, img, cx, cy, r, a = 1, ringColor = "rgba(12,13,15,.9)", squash = 1) {
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = clamp01(a);
  if (squash !== 1) { ctx.translate(cx, cy); ctx.scale(1 / squash, squash); ctx.translate(-cx, -cy); }
  ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 32; ctx.shadowOffsetY = 12;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = "#FFD90D"; ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
  const s = r * 2.02;                              // the generated square is a bust
  ctx.drawImage(img, cx - s / 2, cy - s * 0.47, s, s);
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7);
  ctx.strokeStyle = ringColor; ctx.lineWidth = 6; ctx.stroke();
  ctx.restore();
}

const IMGS = {};
export async function loadBeatImage(key, file) {
  try { IMGS[key] = await loadImage(file); } catch { IMGS[key] = null; console.error(`beat image missing: ${file}`); }
  return IMGS[key];
}
export const beatImage = k => IMGS[k] || null;

// --- beat factories -----------------------------------------------------------

// JUGGLE — N platform marks orbiting and then crowding together. The figure for
// "there are too many channels to keep up with". The one beat that survived
// every review round untouched, so change it only with a reason.
//   items: [{ brand, t }]  brand ∈ brand.mjs marks
export function juggle({ id = "juggle", from, to, items, panicFrom, panicTo, size = 118 }) {
  return {
    id, from, to,
    draw(ctx, t) {
      const outK = 1 - easeInOutCubic(seg(t, to - 0.5, to));
      const cy = CARD.y + CARD.h * 0.48;
      const panic = panicFrom != null ? easeInOutCubic(seg(t, panicFrom, panicTo)) : 0;
      const shake = panic * 9 * Math.sin(t * 26) * Math.sin(t * 11.3);
      items.forEach((it, i) => {
        const k = spring(clamp01((t - it.t) / 0.5));
        if (k <= 0.01) return;
        const age = t - it.t;
        const ph = age * (1.05 + i * 0.16) + i * 1.9;
        const rx = lerp(268, 168, panic), ry = lerp(104, 66, panic);
        const x = CXC + Math.cos(ph) * rx + shake * (i % 2 ? 1 : -1);
        const y = cy + Math.sin(ph * 1.32) * ry + Math.sin(ph * 0.7) * 12 + shake * 0.5;
        const entry = 1 - easeOutQuint(clamp01(age / 0.5));
        ctx.save();
        ctx.globalAlpha = clamp01(k) * outK;
        drawBrand(ctx, it.brand, x, y - entry * 220, size * lerp(0.75, 1, clamp01(k)),
          { rot: Math.sin(ph * 0.8) * 0.16 + entry * 0.9 });
        ctx.restore();
      });
    },
  };
}

// COUNTERS — one column per channel, each with a number spinning up. The figure
// for "which one is actually working".
// ⚠ Every number here is a CLAIM. Never populate it with a plausible-looking
//   figure: either the real one, or drop the beat.
//   cols: [{ brand, n, t, dud? }]
export function counters({ id = "counters", from, to, cols, label = "SIGNUPS", kickAt = null, size = 148, gap = 228 }) {
  return {
    id, from, to,
    draw(ctx, t) {
      const outK = 1 - easeInOutCubic(seg(t, to - 0.40, to));
      const cy = CARD.y + 216;
      cols.forEach((c, i) => {
        const pop = spring(clamp01((t - c.t) / 0.5));
        if (pop <= 0.01) return;
        const x = CXC + (i - (cols.length - 1) / 2) * gap;
        const kick = c.dud && kickAt != null ? easeInOutCubic(clamp01((t - kickAt) / 0.45)) : 0;
        const grey = c.dud && kickAt != null ? clamp01((t - kickAt + 0.06) / 0.30) : 0;
        ctx.save();
        ctx.globalAlpha = clamp01(pop) * outK * (1 - kick * 0.85);
        ctx.translate(0, kick * 300);
        if (grey > 0.02) ctx.filter = `grayscale(${grey.toFixed(2)})`;
        drawBrand(ctx, c.brand, x, cy, size * lerp(0.84, 1, clamp01(pop)));
        ctx.filter = "none";
        const run = c.dud ? clamp01((t - c.t - 0.10) / 0.42) : easeOutCubic(clamp01((t - c.t - 0.12) / 0.85));
        const land = clamp01((t - c.t - (c.dud ? 0.52 : 0.97)) / 0.22);
        ctx.font = F(900, 58); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 5;
        const bump = 1 + 0.10 * Math.exp(-Math.pow((t - c.t - (c.dud ? 0.52 : 0.97)) / 0.08, 2));
        ctx.save();
        ctx.translate(x, cy + 112); ctx.scale(bump, bump);
        ctx.fillStyle = c.dud && land > 0.4 ? "#FF9094" : "#FFFFFF";
        ctx.fillText(`+${Math.round(c.n * run)}`, 0, 0);
        ctx.restore();
        ctx.font = F(700, 22);
        ctx.fillStyle = "rgba(255,255,255,.72)";
        ctx.fillText(label, x, cy + 156);
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
        ctx.restore();
      });
    },
  };
}

// CROWD — N silhouettes, optionally struck through. The figure for "you'd need
// a team of ten, and you don't have one".
// Black silhouettes, never the brand mascot repeated: the existing icons, in
// black, crossed out.
export function crowd({ id = "crowd", from, to, n = 10, cols = 5, appearFrom, strikeAt = null, label = null }) {
  return {
    id, from, to,
    draw(ctx, t) {
      const outK = 1 - easeInOutCubic(seg(t, to - 0.42, to));
      const enter = spring(clamp01((t - (appearFrom ?? from)) / 0.55)) * outK;
      if (enter <= 0.01) return;
      const GAPX = 118, GAPY = 132, R = 34;
      const x0 = CXC - ((cols - 1) * GAPX) / 2, y0 = CARD.y + 190;
      const strike = strikeAt != null ? easeOutQuint(clamp01((t - strikeAt) / 0.40)) : 0;
      for (let i = 0; i < n; i++) {
        const k = spring(clamp01((t - ((appearFrom ?? from) + 0.18 + i * 0.055)) / 0.45));
        if (k <= 0.01) continue;
        const x = x0 + (i % cols) * GAPX, y = y0 + Math.floor(i / cols) * GAPY;
        ctx.save();
        ctx.globalAlpha = clamp01(k) * outK * lerp(1, 0.42, strike);
        ctx.translate(x, y); ctx.scale(k, k);
        ctx.shadowColor = "rgba(0,0,0,.30)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
        ctx.fillStyle = "#0A0B0D";
        ctx.beginPath(); ctx.arc(0, -R * 0.62, R * 0.48, 0, 7); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-R * 0.86, R * 0.60);
        ctx.bezierCurveTo(-R * 0.86, -R * 0.16, R * 0.86, -R * 0.16, R * 0.86, R * 0.60);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if (label) {
        const ck = spring(clamp01((t - ((appearFrom ?? from) + 0.32)) / 0.5)) * outK;
        if (ck > 0.02) {
          const shown = Math.min(n, Math.floor(clamp01((t - ((appearFrom ?? from) + 0.2)) / 0.58) * n + 0.999));
          pill(ctx, label.replace("{n}", shown), CXC, CARD.y + 86, ck,
            { bg: "rgba(18,19,22,.93)", fg: "#F4F5F7", font: 40, h: 78 });
        }
      }
      if (strike > 0.01) {
        const ax = x0 - GAPX * 0.62, ay = y0 - GAPY * 0.42;
        const bx = x0 + (cols - 1) * GAPX + GAPX * 0.62, by = y0 + GAPY + GAPY * 0.42;
        ctx.save();
        ctx.globalAlpha = outK; ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 20;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, strike), lerp(ay, by, strike)); ctx.stroke();
        ctx.strokeStyle = "#E5484D"; ctx.lineWidth = 13;
        ctx.shadowColor = "rgba(229,72,77,.6)"; ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, strike), lerp(ay, by, strike)); ctx.stroke();
        ctx.restore();
      }
    },
  };
}

// LOCKUP — the product name landing, with an underline and a subline that types
// itself in. The figure for naming the thing.
// `mark` is what sits above the title: "pipecorn" (the vector P on a yellow
// disc), an image key loaded with loadBeatImage(), or null for none. It
// defaults to the edition's HOUSE_MARK (house.mjs).
export function lockup({ id = "lockup", from, to, title, sub = null, at, subAt = null, mark = HOUSE_MARK }) {
  return {
    id, from, to,
    draw(ctx, t) {
      const outK = 1 - easeInOutCubic(seg(t, to - 0.5, to));
      const cy = CARD.y + CARD.h * 0.42;
      const k = spring(clamp01((t - at) / 0.7)) * outK;
      if (k <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = clamp01(k);
      const mk = spring(clamp01((t - at) / 0.6));
      if (mark) {
        ctx.save(); ctx.translate(CXC, cy - 58); ctx.scale(mk, mk);
        if (mark === "pipecorn") {
          ctx.beginPath(); ctx.arc(0, 0, 54, 0, 7); ctx.fillStyle = "#FFD90D"; ctx.fill();
          drawPipecornP(ctx, 0, 0, 68, "#0B0B0B");
        } else if (beatImage(mark)) {
          ctx.beginPath(); ctx.arc(0, 0, 54, 0, 7); ctx.clip();
          ctx.drawImage(beatImage(mark), -54, -54, 108, 108);
        }
        ctx.restore();
      }
      const wk = easeOutQuint(clamp01((t - at - 0.45) / 0.5));
      ctx.globalAlpha = clamp01(k) * wk;
      ctx.font = F(900, 78); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 6;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(title, CXC, cy + 42 + (1 - wk) * 16);
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      const uk = easeOutQuint(clamp01((t - at - 0.75) / 0.55));
      if (uk > 0) {
        const w = 260 * uk;
        ctx.fillStyle = "#FFD90D";
        roundRect(ctx, CXC - w / 2, cy + 90, w, 7, 4); ctx.fill();
      }
      if (sub && subAt != null) {
        const tk = clamp01((t - subAt) / 1.5);
        if (tk > 0) {
          ctx.globalAlpha = clamp01(k);
          ctx.font = F(600, 34);
          ctx.fillStyle = "rgba(255,255,255,.95)";
          ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
          ctx.fillText(sub.slice(0, Math.floor(tk * sub.length)) + (tk < 1 && Math.floor(t * 3) % 2 ? "▌" : ""), CXC, cy + 148);
        }
      }
      ctx.restore();
    },
  };
}

// HATS — one generated character, one hat per role, wiped in from the top. The
// figure for "one person wearing several roles".
// The three images MUST be edits of ONE base (see gen-artwork.mjs): three
// independent generations drift and read as three different people, which is
// exactly the note that killed the first attempt.
export function hats({ id = "hats", from, to, roles, r = 152 }) {
  return {
    id, from, to,
    draw(ctx, t) {
      const outK = 1 - easeInOutCubic(seg(t, to - 0.42, to));
      const cy = CARD.y + 214;
      const enter = spring(clamp01((t - from) / 0.6)) * outK;
      if (enter <= 0.01) return;
      let idx = 0;
      for (let i = 0; i < roles.length; i++) if (t >= roles[i].t) idx = i;
      const wipe = easeOutCubic(clamp01((t - roles[idx].t) / 0.24));
      const sq = idx > 0 ? 1 - 0.055 * Math.exp(-Math.pow((t - roles[idx].t - 0.22) / 0.10, 2)) : 1;
      const under = idx > 0 ? roles[idx - 1].key : roles[0].key;
      personaDisc(ctx, beatImage(under), CXC, cy, r, enter, "rgba(12,13,15,.9)", sq);
      if (idx > 0 || wipe >= 1) {
        ctx.save();
        const top = cy - r * 1.15, h = (r * 2.3) * (idx > 0 ? wipe : 1);
        ctx.beginPath(); ctx.rect(CXC - r - 12, top, r * 2 + 24, h); ctx.clip();
        personaDisc(ctx, beatImage(roles[idx].key), CXC, cy, r, enter, "rgba(12,13,15,.9)", sq);
        ctx.restore();
      }
      const ro = roles[idx];
      pill(ctx, ro.label, CXC, cy + r + 58, spring(clamp01((t - ro.t) / 0.4)) * enter,
        ro.hot ? { bg: "#FFD90D", fg: "#141517", font: 44, h: 84 }
               : { bg: "rgba(18,19,22,.93)", fg: "#F4F5F7", font: 40, h: 78 });
    },
  };
}
