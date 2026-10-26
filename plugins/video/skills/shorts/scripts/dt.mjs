// DYNAMIC TEXT, WITH THE LONG VIDEO'S PICTURES: the figures of /video-long-to-shorts' second round (2026-10-14, Ihsane: « le style
// principal /video-short-editor est vraiment pas mal, faut juste ajouter parfois des GIFs, parfois des vidéos… nos
// éléments de style… ombres, screen effect »). The words are Dynamic text's (proHeadlines: Impact capitals, the payoff in
// yellow, one Sacramento accent, two-layer shadows, the glitch); the pictures are the long video's, dressed with its
// effects: a soft shadow in two layers, the fine screen grid, grain, a vignette, an entrance blurred by its motion.
//
//   dtHeadlines({ words, hot, script, skip, quiet, place, frame, end })   the speaker's words, screen by screen
//   screen({ id, src, at, until, x, y, w, rot, layer, emerge, caption })  a stock shot as a floating screen
//   print(…) (doc.mjs)                                                       a GIF as a pinned print
//   cutaway({ id, src, at, until, push })                                    a stock shot over the whole frame, its
//                                                                            screen effect, the pack's flash on the cut
//   openingSteps(joins, punches)                                             the camera: Dynamic text's de-zoom, then
//                                                                            the jump cuts wide / close, the punches
import fs from "node:fs";
import path from "node:path";
import { createCanvas, clamp01, easeOutCubic, easeOutQuint, easeInOutCubic, spring, lerp } from "../../short-editor/scripts/scene.mjs";
import { imp, scr, line } from "../../short-editor/scripts/headline.mjs";
import { proHeadlines } from "../../short-editor/scripts/figures.mjs";
import { flash } from "../../short-editor/scripts/titles.mjs";
import { SAFE, FORBIDDEN } from "../../short-editor/scripts/safezones.mjs";
import { cue } from "../../scrapbook-editor/scripts/book.mjs";
import * as SOUND from "../../voiceover-video/scripts/sound.mjs";
import { FRAME, want, frameOf, aspectOf, setFace, INK, YELLOW, paperCanvas } from "./doc.mjs";

const SFX = "sample:sfx-top5/";

// ── the words: Dynamic text, phrase by phrase ──────────────────────────────────────────────────────────────────
// A landscape take reframed to 9:16 has the head at the top of the frame: the words go BELOW it, in front of the
// speaker (the validated tight-shot rule: anchor bottom, y 0.765, the over layer); `place: "top"` puts them above the
// head, behind it (layer under, the matte), for a take with room there. `hot`: the payoff words in yellow; `script`:
// words written in Sacramento on a line of their own, crossing the line above; `quiet`: stretches where a picture holds
// the middle of the frame (the words stay small there); `skip`: stretches a figure says already.
// `front`: stretches where the whole frame is a picture (a cutaway): the words there come in front of it (over layer)
// `paper`: the white pages' spans (whitePage): the words there are ink subtitles at the top of the sheet
export function dtHeadlines({ words, from = 0, to = 1e9, hot = [], script = [], skip = [], quiet = [], front = [], paper = [], place = "low", frame = FRAME, end,
  maxChars = 12, maxWords = 6, glitchFirst = true }) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9'’%$€]/gi, "");
  const H = new Set(hot.map(norm)), SC = new Set(script.map(norm));
  const ws = words.filter(w => w.s >= from && w.s < to && w.w.trim() && !skip.some(([a, b]) => w.s >= a && w.s < b));
  const phrases = [];
  let p = [];
  ws.forEach((w, i) => {
    p.push(w);
    const n = ws[i + 1];
    const ends = (x, k) => x && (/[.?!,;:]$/.test(x.w) || !ws[k + 1] || ws[k + 1].s - x.e > 0.35);
    const tail = [n, ws[i + 2]].findIndex((x, j) => ends(x, i + 1 + j));
    const full = p.length >= maxWords && !(tail >= 0 && p.length < maxWords + 2 && !(n && n.s - w.e > 0.35));
    // a phrase never runs across the edge of a white page: the words on it are ink, the words on the face white
    const edge = n && paper.some(([a, b]) => (w.s < a + 0.3 && n.s >= a + 0.3) || (w.s < b - 0.3 && n.s >= b - 0.3));
    if (!n || edge || n.s - w.e > 0.35 || /[.?!]$/.test(w.w) || full || (/[,;:]$/.test(w.w) && p.length >= 3)) { phrases.push(p); p = []; }
  });
  const clean = s => s.replace(/[,.;:]+$/, "");
  const low = place !== "top";
  // AT THE TOP the room above the head holds two lines (a third sank behind the head, its yellow word unread: round 3,
  // 2026-10-14): a phrase that fills more is cut into screens of two lines
  if (!low) {
    const rowsOf = ph => { let n = 0, len = 99; for (const w of ph) { const k = clean(w.w).length; if (SC.has(norm(w.w))) { n += 1; len = 99; continue; } if (len + 1 + k <= maxChars) len += 1 + k; else { n++; len = k; } } return n; };
    for (let i = 0; i < phrases.length; i++) {
      const ph = phrases[i];
      if (ph.length > 1 && rowsOf(ph) > 2) {
        // the most even cut that leaves two lines on each side (never a word alone when it can be helped)
        let best = null;
        for (let k = 1; k < ph.length; k++) if (rowsOf(ph.slice(0, k)) <= 2 && rowsOf(ph.slice(k)) <= 2 && (!best || Math.min(k, ph.length - k) > Math.min(best, ph.length - best))) best = k;
        if (best == null) { best = ph.length - 1; while (best > 1 && rowsOf(ph.slice(0, best)) > 2) best--; }
        phrases.splice(i, 1, ph.slice(0, best), ph.slice(best));
      }
    }
  }
  const POS = low ? { x: 0.5, y: 0.765, anchor: "bottom", align: "center", maxW: 0.80, layer: "over" }
    : { x: 0.5, y: 0.135, align: "center", maxW: 0.84, gap: 0.03, layer: "under" };
  let glitched = !glitchFirst;
  const extra = [];
  const screens = phrases.map((ph, i) => {
    const small = quiet.some(([a, b]) => ph[0].s < b && ph.at(-1).e > a);
    const lines = [];
    // a script word gets a line of its own; Impact words fill lines of maxChars
    for (const w of ph) {
      const k = norm(w.w), txt = clean(w.w);
      if (SC.has(k)) { lines.push({ script: true, w: [w] }); lines.push({ w: [] }); continue; }
      const l = lines.at(-1);
      if (l && !l.script && (l.w.map(x => clean(x.w)).join(" ").length + 1 + txt.length) <= (small ? maxChars + 6 : maxChars)) l.w.push(w); else lines.push({ w: [w] });
    }
    const L = lines.filter(l => l.w.length);
    if (L.length > 1 && !L.at(-1).script && !L.at(-2).script && L.at(-1).w.length === 1 && L.at(-2).w.map(x => x.w).join(" ").length + L.at(-1).w[0].w.length < maxChars + 4) L.at(-2).w.push(...L.pop().w);
    let glitch = null;
    const out = L.map(l => {
      if (l.script) return line(l.w[0].s, scr(clean(l.w[0].w).toLowerCase(), small ? 120 : low ? 175 : 140, { t: l.w[0].s }), { overlap: 0.30, dx: 0.10, rot: -6 });
      const chars = l.w.map(x => clean(x.w)).join(" ").length;
      // at the top, the room above the head is short: the lines a size smaller (Dynamic text's seated shot: 118-150, the
      // payoff up to ~190)
      const cap = small ? 100 : low ? 230 : 136;
      const size = Math.round(Math.max(small ? 70 : low ? 100 : 92, Math.min(cap, 1080 * 0.80 / (Math.max(3, chars) * 0.50))));
      return line(l.w[0].s, ...l.w.map(w => {
        const isHot = H.has(norm(w.w));
        if (isHot && !glitched) { glitched = true; glitch = { t: w.s, dur: 0.22, words: [clean(w.w).toUpperCase()] }; extra.push({ t: w.s, kind: SFX + "glitch.wav", gain: -17, align: 0.15 }); }
        return imp(clean(w.w).toUpperCase(), isHot && !small ? Math.min(low ? 260 : 160, Math.round(size * 1.12)) : size, { t: w.s, hot: isHot });
      }));
    });
    const inFront = front.some(([a, b]) => ph[0].s < b && ph.at(-1).e > a);
    // on a white page the words step down to discreet subtitles in ink, at the top of the sheet (Dynamic text's plates)
    if (paper.some(([a, b]) => ph[0].s >= a + 0.3 && ph[0].s < b - 0.3)) {
      const sub = [line(ph[0].s, ...ph.map(w => imp(clean(w.w).toUpperCase(), 64, { t: w.s })))];
      return { x: 0.5, y: 0.15, align: "center", maxW: 0.84, layer: "over", id: `dt-${i}`, color: INK, hot: INK, shadow: 0, dim: 0, pop: 1, glowA: 0, lines: sub };
    }
    return { ...POS, ...(inFront ? { layer: "over" } : {}), id: `dt-${i}`, ...(glitch ? { glitch } : {}), lines: out };
  });
  const beats = proHeadlines(screens, { frame, end: end ?? (ws.at(-1)?.e ?? 0) + 0.5 });
  // a phrase ends where a figure takes the words over (a skipped stretch), never past it
  for (const b of beats) {
    const nextSkip = skip.map(([a]) => a).filter(a => a > b.from).sort((x, y) => x - y)[0];
    if (nextSkip != null && b.to > nextSkip) b.to = Math.max(b.from + 0.25, nextSkip - 0.02);
  }
  beats.extraCues = extra;
  return beats;
}

// ── the screen effect: the fine grid of a screen, grain, a vignette (the long video's framed.js and post) ──────────
const GRID = (() => { const c = createCanvas(6, 6), x = c.getContext("2d"); x.fillStyle = "rgba(0,0,0,.13)"; x.fillRect(0, 0, 6, 1); x.fillRect(0, 0, 1, 6); return c; })();
const GRAIN = Array.from({ length: 6 }, (_, k) => {
  const c = createCanvas(192, 192), x = c.getContext("2d"), d = x.createImageData(192, 192);
  let s = 1234 + k * 977;
  for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = (s / 2147483647) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 34; }
  x.putImageData(d, 0, 0); return c;
});
function screenFx(ctx, X, Y, w, h, t, { vignette = 0.42, grade = 0.22 } = {}) {
  ctx.save();
  ctx.beginPath(); ctx.rect(X, Y, w, h); ctx.clip();
  if (grade > 0) { ctx.globalCompositeOperation = "saturation"; ctx.fillStyle = `rgba(128,128,128,${grade})`; ctx.fillRect(X, Y, w, h); }
  ctx.globalCompositeOperation = "overlay"; ctx.fillStyle = ctx.createPattern(GRAIN[Math.floor(t * 30) % GRAIN.length], "repeat"); ctx.fillRect(X, Y, w, h);
  ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = ctx.createPattern(GRID, "repeat"); ctx.fillRect(X, Y, w, h);
  const g = ctx.createRadialGradient(X + w / 2, Y + h * 0.47, Math.min(w, h) * 0.35, X + w / 2, Y + h * 0.47, Math.hypot(w, h) * 0.62);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(10,8,30,${vignette})`);
  ctx.fillStyle = g; ctx.fillRect(X, Y, w, h);
  ctx.restore();
}
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

// ── a stock shot as a floating screen ────────────────────────────────────────────────────────────────────────
// x, y: its centre (fractions); w: its width; it pops in blurred by its motion (a spring 0.82 → 1, a rise, a blur that
// clears in 0.12 s), its shadow lifting while it flies; it leaves lifting and blurring. `emerge`: it slides out from
// behind the speaker ({ fromX, fromY }, on the under layer: the head covers it while it is behind).
export function screen({ id, src, at, until, x = 0.5, y = 0.31, w = 0.80, rot = -2, layer = "over", start = 0, emerge = null, caption = null, frame = FRAME, sound = true, radius = 0.028, safe = !emerge }) {
  want(src, at, until, start);
  const W = frame.w, H = frame.h;
  const pw = (safe ? Math.min(w, 2 * Math.min(x - SAFE.x0, (y > FORBIDDEN[1].y0 - 0.12 ? FORBIDDEN[1].x0 : SAFE.x1) - x) + 0.06) : w) * W;
  const ph = pw * aspectOf(src), rim = 0.010 * W, IN = emerge ? 0.46 : 0.34, OUT = 0.22;
  return {
    id, kind: "print", from: at, to: until + OUT, held: [at, until], said: null, layer,
    draw(ctx, t) {
      const u = clamp01((t - at) / IN), ko = easeInOutCubic(clamp01((t - until) / OUT));
      const k = emerge ? easeOutQuint(u) : spring(u, 3, 5.6), a = clamp01((t - at) / 0.08) * (1 - ko);
      if (a <= 0.003) return;
      const cx = emerge ? lerp(emerge.fromX * W, x * W, k) : x * W, cy = (emerge ? lerp((emerge.fromY ?? y) * H, y * H, k) : y * H + (1 - easeOutCubic(u)) * 0.045 * H) - ko * 0.03 * H;
      const s = (emerge ? lerp(0.86, 1, k) : 0.82 + 0.18 * k) * (1 + 0.04 * ko);
      const blur = (1 - easeOutCubic(clamp01((t - at) / 0.14))) * 10 + ko * 9;
      ctx.save(); ctx.globalAlpha = a;
      if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.translate(cx, cy); ctx.rotate((rot * (emerge ? 1 : 0.6 + 0.4 * k)) * Math.PI / 180); ctx.scale(s, s);
      const X = -pw / 2, Y = -ph / 2, R = radius * W, lift = 1 - easeOutCubic(u);
      // two shadows: a soft far one (bigger while it flies), a tight contact one
      ctx.save(); ctx.shadowColor = "rgba(14,12,30,.45)"; ctx.shadowBlur = (0.05 + 0.04 * lift) * W; ctx.shadowOffsetY = (0.022 + 0.03 * lift) * W;
      rr(ctx, X - rim, Y - rim, pw + 2 * rim, ph + 2 * rim, R + rim); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.restore();
      ctx.save(); ctx.shadowColor = "rgba(14,12,30,.30)"; ctx.shadowBlur = 0.006 * W; ctx.shadowOffsetY = 0.003 * W;
      rr(ctx, X - rim, Y - rim, pw + 2 * rim, ph + 2 * rim, R + rim); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.restore();
      ctx.save(); rr(ctx, X, Y, pw, ph, R); ctx.clip();
      const img = frameOf(src, t, at, start);
      if (img) { const sc = Math.max(pw / img.width, ph / img.height) * (1 + 0.05 * clamp01((t - at) / Math.max(1, until - at))); ctx.drawImage(img, -img.width * sc / 2, -img.height * sc / 2, img.width * sc, img.height * sc); }
      else { ctx.fillStyle = "#222"; ctx.fillRect(X, Y, pw, ph); }
      screenFx(ctx, X, Y, pw, ph, t);
      // a light sweep across the glass as it lands
      const sw = clamp01((t - at - 0.05) / 0.5);
      if (sw > 0 && sw < 1) { const gx = X - pw * 0.4 + sw * pw * 1.8, g = ctx.createLinearGradient(gx - pw * 0.25, 0, gx + pw * 0.25, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,.22)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(X, Y, pw, ph); }
      ctx.restore();
      ctx.restore();
      if (caption && k > 0.9) {
        ctx.save(); ctx.globalAlpha = a * clamp01((t - at - IN) / 0.2);
        setFace(ctx, "mono", 0.022 * W); ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 8;
        ctx.textAlign = "center"; ctx.fillText(caption.toUpperCase(), cx, cy + ph / 2 + rim + 0.022 * H); ctx.restore();
      }
    },
    cues() { return sound ? [cue("swish", at, { lu: 23 }), cue("swish", until, { lu: 27 })] : []; },
  };
}

// ── a stock shot over the whole frame: the screen effect, a slow push, the pack's flash on its cut ─────────────
export function cutaway({ id, src, at, until, start = 0, push = 0.07, frame = FRAME, flashIn = true, flashOut = false }) {
  want(src, at, until, start);
  const W = frame.w, H = frame.h;
  const beats = [{
    id, kind: "cutaway", from: at, to: until, said: null, layer: "over", mutesCaptions: false,
    draw(ctx, t) {
      if (t < at || t > until) return;
      const img = frameOf(src, t, at, start);
      if (!img) return;
      const k = clamp01((t - at) / Math.max(0.5, until - at)), sc = Math.max(W / img.width, H / img.height) * (1.02 + push * easeInOutCubic(k));
      ctx.drawImage(img, (W - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc);
      screenFx(ctx, 0, 0, W, H, t, { vignette: 0.55, grade: 0.18 });
      // the top and bottom in shadow, so the words read on any shot
      const g = ctx.createLinearGradient(0, H * 0.45, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.45)"); ctx.fillStyle = g; ctx.fillRect(0, H * 0.45, W, H * 0.55);
    },
    cues() { return []; },
  }];
  if (flashIn) beats.push(flash({ id: `${id}-flash`, at, frame, sound: SFX + "camera-flash.wav", gain: -7, align: 0.255 }));
  if (flashOut) beats.push(flash({ id: `${id}-flash2`, at: until, frame, sound: SFX + "camera-flash.wav", gain: -9, align: 0.255 }));
  return beats;
}

// ── the camera: Dynamic text's opening de-zoom (1.30 → 1.00 in 0.62 s, a whoosh), then every jump cut alternates the
// frame wide / close (the scrapbook's rule: a cut never jumps on the same frame), and a punch on a payoff word ──────
export function openingSteps(joins = [], punchAt = [], { close = 1.08, punch = 1.13 } = {}) {
  const steps = [[0, 1.30, 0, 0.5], [0, 1.0, 0.62, 0.5, "out"]];
  const ev = [...joins.map(t => ({ t, k: "j" })), ...punchAt.map(t => ({ t, k: "p" }))].sort((a, b) => a.t - b.t);
  let z = 1, near = false;
  for (const e of ev) {
    if (e.t < 0.7) continue;
    if (e.k === "p") { steps.push([e.t, punch, 0.10, 0.5]); z = punch; continue; }
    near = z > 1.04 ? false : !near;
    const nz = near ? close : 1.0;
    if (nz !== z) steps.push([e.t, nz, 0.001, 0.5]);
    z = nz;
  }
  return steps;
}

// ── THE VISUAL HOOK (Ihsane, 2026-10-14: « au début… un hook visuel, avec du texte qui explique le sujet de la vidéo, la
// problématique… quand on scroll, ce texte-là, c'est ce qu'on va lire en premier, il faut que ça nous donne envie »).
// For the first seconds, before the words begin: the subject written, not said, in two places, together or alone:
//   hookTitle   above the head, behind it (Dynamic text's place), Impact, the problem's word in yellow, the glitch
//   hookPanel   a designed card on the chest: a yellow tag (the topic), the problem in Impact ink with the marker under
//               its key word, one line under it; two shadows, it pops in blurred by its motion, it drops away
// Every word on them is the video's subject as the voice will say it, never a promise it does not keep.
// x, y, align, maxW, layer: where the title sits (default: centred above the head, behind it); a shot whose head is at
// the top (a vertical take kept whole) sets it beside the head instead, in front (layer "over")
export function hookTitle({ lines, at = 0, until, frame = FRAME, glitch = null, x = 0.5, y = 0.135, align = "center", maxW = 0.84, layer = "under" }) {
  // lines: [["NOBODY", "REPLIES?"], [{ text: "YOUR LIST", hot: true }]] ; each word pops a beat after the last
  let t = at + 0.05;
  const out = lines.map(ws => line(t, ...ws.map(w => { const o = typeof w === "string" ? { text: w } : w; const r = imp(o.text, o.size ?? 138, { t, hot: !!o.hot }); t += 0.12; return r; })));
  const screens = [{ x, y, align, maxW, gap: 0.03, layer, id: "hook-title", ...(glitch ? { glitch } : {}), lines: out }];
  const beats = proHeadlines(screens, { frame, end: until });
  for (const b of beats) { b.to = Math.min(b.to, until); b.said = [at, until]; }
  return beats;
}
export function hookPanel({ tag, title, sub = null, at = 0, until, x = 0.5, y = 0.635, w = 0.80, rot = -1.5, frame = FRAME }) {
  const W = frame.w, H = frame.h, pw = w * W;
  const c0 = createCanvas(8, 8).getContext("2d");
  // the title: runs of Impact, the hot one on the yellow marker; sized to the card
  const TFont = px => `400 ${px}px "ImpactDisplay", Impact, "Arial Narrow", sans-serif`;
  let tp = 0.13 * W;
  const width = px => { c0.font = TFont(px); return title.reduce((s, r) => s + c0.measureText(r.text).width, 0) + (title.length - 1) * px * 0.22; };
  while (width(tp) > pw * 0.86 && tp > 40) tp *= 0.95;
  const pad = 0.05 * W, tagH = 0.052 * W, subPx = 0.040 * W;
  const ph = pad + tagH + 0.03 * W + tp * 0.95 + (sub ? 0.028 * W + subPx * 1.2 : 0) + pad;
  const IN = 0.42, OUT = 0.24;
  return {
    id: "hook-panel", kind: "hook", from: at, to: until + OUT, held: [at, until], said: [at, until], layer: "over", mutesCaptions: true,
    draw(ctx, t) {
      const u = clamp01((t - at) / IN), ko = easeInOutCubic(clamp01((t - until) / OUT));
      const a = clamp01((t - at) / 0.08) * (1 - ko);
      if (a <= 0.003) return;
      const k = spring(u, 3, 5.6), blur = (1 - easeOutCubic(clamp01((t - at) / 0.16))) * 12 + ko * 10;
      ctx.save(); ctx.globalAlpha = a; if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.translate(x * W, y * H + (1 - easeOutCubic(u)) * 0.06 * H + ko * 0.08 * H); ctx.rotate(rot * Math.PI / 180); ctx.scale(0.86 + 0.14 * k, 0.86 + 0.14 * k);
      const X = -pw / 2, Y = -ph / 2, R = 0.03 * W, lift = 1 - easeOutCubic(u);
      ctx.save(); ctx.shadowColor = "rgba(14,12,30,.42)"; ctx.shadowBlur = (0.05 + 0.04 * lift) * W; ctx.shadowOffsetY = (0.022 + 0.03 * lift) * W; rr(ctx, X, Y, pw, ph, R); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.restore();
      ctx.save(); ctx.shadowColor = "rgba(14,12,30,.25)"; ctx.shadowBlur = 0.006 * W; ctx.shadowOffsetY = 0.003 * W; rr(ctx, X, Y, pw, ph, R); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.restore();
      // the paper's fine grid inside the card (the long video's desk)
      ctx.save(); rr(ctx, X, Y, pw, ph, R); ctx.clip(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(GRID, "repeat"); ctx.fillRect(X, Y, pw, ph); ctx.restore();
      let cy = Y + pad;
      // the tag: a yellow pill, mono capitals
      setFace(ctx, "mono", tagH * 0.5); const tw = ctx.measureText(tag.toUpperCase()).width + tagH * 0.9;
      const tk = easeOutCubic(clamp01((t - at - 0.12) / 0.2));
      rr(ctx, X + pad, cy, tw * tk, tagH, tagH / 2); ctx.fillStyle = YELLOW; ctx.fill();
      if (tk > 0.9) { ctx.fillStyle = INK; ctx.fillText(tag.toUpperCase(), X + pad + tagH * 0.45, cy + tagH * 0.68); }
      cy += tagH + 0.03 * W + tp * 0.80;
      // the title, word by word, the hot one on the marker
      let xx = X + pad;
      title.forEach((r, i) => {
        const tt = at + 0.22 + i * 0.12, kk = clamp01((t - tt) / 0.2);
        c0.font = TFont(tp); const ww = c0.measureText(r.text).width;
        if (kk > 0) {
          if (r.hot) { const mk = easeOutCubic(clamp01((t - tt - 0.15) / 0.22)); ctx.fillStyle = YELLOW; ctx.fillRect(xx - tp * 0.04, cy - tp * 0.42, (ww + tp * 0.08) * mk, tp * 0.48); }
          ctx.save(); ctx.globalAlpha = a * kk; ctx.font = TFont(tp); ctx.fillStyle = INK; ctx.fillText(r.text, xx, cy + (1 - easeOutCubic(kk)) * tp * 0.25); ctx.restore();
        }
        xx += ww + tp * 0.22;
      });
      if (sub) { const sk = clamp01((t - at - 0.22 - title.length * 0.12 - 0.15) / 0.25); cy += 0.028 * W + subPx; setFace(ctx, "text", subPx, 500); ctx.globalAlpha = a * sk; ctx.fillStyle = "#55536A"; ctx.fillText(sub, X + pad, cy); }
      ctx.restore();
    },
    cues() { return [cue("swoosh", at + 0.02, { lu: 21 }), cue("pop", at + 0.22 + title.findIndex(r => r.hot) * 0.12 + 0.15)]; },
  };
}

// ── THE MOOD OPENING (Ihsane, 2026-10-14: « au début, en plus du hook title visuel, quelques petites images qui donnent le
// mood de la vidéo… des trucs en rapport avec le sujet… on se dit : OK, cette vidéo-là, c'est ce thème »). For the hook's
// seconds: a few pictures of the subject (objects as die-cut stickers, the real icons of the tools it names) slide out
// from behind the head to their places around it, one after the other, float a little, and slide back behind it as the
// words begin. Behind the speaker (the matte), under the hook title.
// items: [{ src, x, y, size, rot }] (src: a cut-out PNG, sticker.mjs pick / from; x, y its centre; size: its width)
export function moodOpen({ items, at = 0.15, until, stagger = 0.15, frame = FRAME, from = { x: 0.5, y: 0.40 } }) {
  for (const it of items) want(it.src, at, until + 0.5);
  const W = frame.w, H = frame.h, IN = 0.50, OUT = 0.32;
  const beats = items.map((it, i) => {
    const t0 = at + i * stagger, t1 = until - (items.length - 1 - i) * 0.05;
    return {
      id: `mood-${i}`, kind: "mood", from: t0, to: t1 + OUT, layer: "under",
      draw(ctx, t) {
        const img = frameOf(it.src, t, t0);
        if (!img) return;
        const u = easeOutQuint(clamp01((t - t0) / IN)), o = easeInOutCubic(clamp01((t - t1) / OUT));
        const k = u * (1 - o);
        if (k <= 0.003) return;
        const fl = Math.sin((t - t0) * 2.2 + i) * 0.004 * H;
        const x = lerp(from.x * W, it.x * W, k), y = lerp(from.y * H, it.y * H, k) + fl;
        const w = it.size * W * (0.55 + 0.45 * k), h = w * img.height / img.width;
        const blur = (1 - easeOutCubic(clamp01((t - t0) / 0.18))) * 8 + o * 6;
        ctx.save(); ctx.globalAlpha = clamp01(k * 3);
        if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
        ctx.translate(x, y); ctx.rotate(((it.rot ?? 0) * k) * Math.PI / 180);
        ctx.shadowColor = "rgba(14,12,30,.40)"; ctx.shadowBlur = 0.035 * W; ctx.shadowOffsetY = 0.016 * W;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      },
      cues() { return i % 2 ? [] : [cue("swish", t0 + 0.02, { lu: 26 })]; },
    };
  });
  return beats;
}


// ── THE WHITE PAGE (Ihsane, 2026-10-14: « la transition de nos vidéos longues, quand l'écran jaune apparaît… mais un
// écran blanc… même effet visuel, les textures… poser mon explication, un petit schéma, un petit graphique », 2 or 3 in
// a long short at most). The long video's V page move (voiceover-video fx.js CH.V): the sheet rises from the bottom with
// a torn top edge in 0.45 s, blurred by its motion, a warm light passing; it leaves upwards, its torn bottom edge rising,
// in 0.5 s. Its paper is the long video's white desk (grid in patches, hatch, grain). Its children are the schema.
const ease5 = u => (u < 0.5 ? 16 * u ** 5 : 1 - (-2 * u + 2) ** 5 / 2), easeIO = u => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
function torn(ctx, W, y, seed, top) {
  const R = k => { const x = Math.sin((seed + k) * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const pts = [];
  for (let x = -20, i = 0; x <= W + 20; x += W / 45, i++) pts.push([x, y + Math.sin(i * 0.9 + seed) * W * 0.006 + (R(i) - 0.5) * W * 0.016 + Math.sin(i * 0.23) * W * 0.011]);
  return top ? pts : pts.reverse();
}
// knockout: { text, count: { to, at, dur }, at }: a number across the whole width of the sheet, counting in ink, then
// knocked out of the paper (the picture under the page shows through its letters) from `at`, and the page leaves THROUGH
// it: the letters grow until the picture fills the frame (Ihsane, 2026-10-14: « le 95 % en full screen, toute la largeur,
// un effet de transparence… il sert de transition avec la fin de la page blanche »)
// hole: { x, y, w, h, at, rot }: a window cut in the sheet onto the speaker under it (a print's white border round it),
// opening from its centre at `at`; alive: { pulses: [t…] }: the sheet never still (a slow drift and zoom of the paper,
// its content floating, a pulse on each word of `pulses`, a light passing every 2.4 s)
export function whitePage({ id, at, until, children = [], seed = 4, frame = FRAME, IN = 0.45, OUT = 0.5, knockout = null, hole = null, alive = null, handoff = null }) {
  const W = frame.w, H = frame.h, kids = children.flat();
  // the sheet's paper made now, as the plan loads, not in a frame: its grain reads pixels back (getImageData), and a frame
  // that does is redrawn at every render (short-editor/scripts/fingerprint.mjs); made here, the segment is kept
  paperCanvas(W, H, seed);
  // a motion page that takes the paper over (motionpage.mjs, PAGE({ handoff })): from then on it draws the paper itself,
  // and the sheet only lays its children; the sheet does not drift (its paper.png is the paper at rest)
  if (handoff != null) {
    const end = Math.max(until + OUT, ...kids.map(k => k.to));
    return {
      id, kind: "page", from: at, to: end, said: [at + 0.2, until], held: [at, until], layer: "over", mutesCaptions: true,
      draw(ctx, t) {
        if (t < at || t > end) return;
        if (t >= handoff) { for (const k of kids) if (t >= k.from && t <= k.to) k.draw(ctx, t); return; }
        const up = ease5(clamp01((t - at) / IN)), topY = lerp(H * 1.06, -H * 0.06, up);
        ctx.save();
        const pts = torn(ctx, W, topY, seed, true).concat([[W + 20, H + 200], [-20, H + 200]]);
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
        ctx.save(); ctx.shadowColor = "rgba(14,12,30,.35)"; ctx.shadowBlur = 0.03 * W; ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
        ctx.clip();
        if (t < at + IN) ctx.filter = "blur(2.5px)";
        ctx.drawImage(paperCanvas(W, H, seed), 0, 0);
        ctx.filter = "none";
        ctx.translate(0, t < at + IN ? (1 - up) * H * 0.9 : 0);
        for (const k of kids) if (t >= k.from && t <= k.to) k.draw(ctx, t);
        ctx.restore();
      },
    };
  }
  if (knockout) OUT = 0.62;
  const KO = knockout && (() => {
    const c0 = createCanvas(8, 8).getContext("2d");
    const font = px => `${px.toFixed(1)}px "DocTitle"`;
    const setF = (ctx, px) => { ctx.font = font(px); try { ctx.fontVariationSettings = `"wght" 800, "opsz" 96`; ctx.letterSpacing = `${(-0.05 * px).toFixed(1)}px`; } catch {} };
    let px = 0.5 * W; setF(c0, px);
    const w0 = c0.measureText(knockout.text).width; px *= (0.94 * W) / w0;
    return { setF, px };
  })();
  return {
    id, kind: "page", from: at, to: until + OUT, said: [at + 0.2, until], held: [at, until], layer: "over", mutesCaptions: true,
    draw(ctx, t) {
      if (t < at || t > until + OUT) return;
      const up = ease5(clamp01((t - at) / IN)), out = KO ? 0 : easeIO(clamp01((t - until) / OUT));
      const moving = t < at + IN || (!KO && t > until);
      const topY = lerp(H * 1.06, -H * 0.06, up), botY = lerp(H * 1.06, -H * 0.08, out);
      // the page drawn on a layer of its own when a number is knocked out of it
      let host = ctx, layer = null;
      if ((KO && t >= knockout.at) || (hole && t >= hole.at)) { layer = createCanvas(W, H); host = ctx; ctx = layer.getContext("2d"); }
      ctx.save();
      const pts = t <= until || KO ? torn(ctx, W, topY, seed, true).concat([[W + 20, H + 200], [-20, H + 200]]) : [[-20, -400], [W + 20, -400]].concat(torn(ctx, W, botY, seed + 9, false));
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      // the edge's own shadow on the picture under it
      ctx.save(); ctx.shadowColor = "rgba(14,12,30,.35)"; ctx.shadowBlur = 0.03 * W; ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
      ctx.clip();
      if (moving) ctx.filter = "blur(2.5px)";
      const drift = clamp01((t - at) / Math.max(1, until + OUT - at));
      ctx.save(); ctx.translate(W / 2, H / 2); const pz = 1 + (alive ? 0.08 : 0.03) * drift; ctx.scale(pz, pz);
      if (alive) ctx.translate(Math.sin((t - at) * 0.7) * W * 0.012, Math.cos((t - at) * 0.5) * H * 0.006);
      ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(paperCanvas(W, H, seed), 0, 0); ctx.restore();
      ctx.filter = "none";
      // the children ride with the sheet while it moves
      if (hole && t >= hole.at) {
        // the window onto the speaker: a rounded hole opening from its centre, a white print border round it
        const hk = spring(clamp01((t - hole.at) / 0.5), 3, 5.6), hx = hole.x * W, hy = hole.y * H, hw = hole.w * W * hk, hh = hole.h * H * hk;
        if (hw > 2) {
          ctx.save(); ctx.translate(hx, hy); ctx.rotate((hole.rot ?? -2) * Math.PI / 180);
          const bd = 0.018 * W;
          ctx.save(); ctx.shadowColor = "rgba(14,12,30,.35)"; ctx.shadowBlur = 0.04 * W; ctx.shadowOffsetY = 0.015 * W; rr(ctx, -hw / 2 - bd, -hh / 2 - bd, hw + 2 * bd, hh + 2 * bd, 0.03 * W); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
          const mk = createCanvas(W, H), mx = mk.getContext("2d"); mx.setTransform(ctx.getTransform()); rr(mx, -hw / 2, -hh / 2, hw, hh, 0.022 * W); mx.fillStyle = "#000"; mx.fill();
          ctx.restore();
          ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.drawImage(mk, 0, 0); ctx.restore();
        }
      }
      ctx.save(); ctx.translate(0, t < at + IN ? (1 - up) * H * 0.9 : t > until ? -out * H * 0.9 : 0);
      if (alive) {
        // floating, and a pulse on the words that carry it
        const pu = (alive.pulses || []).reduce((m, p) => Math.max(m, t >= p ? Math.exp(-(t - p) * 7) * Math.sin(Math.min(1, (t - p) / 0.12) * Math.PI / 2) : 0), 0);
        const sc = 1 + 0.035 * pu;
        ctx.translate(W / 2, H * 0.48); ctx.scale(sc, sc); ctx.rotate(Math.sin((t - at) * 0.9) * 0.006); ctx.translate(-W / 2, -H * 0.48 + Math.sin((t - at) * 1.3) * H * 0.006);
      }
      for (const k of kids) if (t >= k.from && t <= k.to) k.draw(ctx, t);
      ctx.restore();
      if (KO && t >= knockout.count.at) {
        // the number: counting in ink across the width, then knocked out of the paper, then growing through the frame
        const { to: N, at: c0, dur = 0.8, fmt = v => `${Math.round(v)}%` } = knockout.count;
        const c = easeOutQuint(clamp01((t - c0) / dur)), txt = c >= 1 ? knockout.text : fmt(N * c);
        const pop = 0.9 + 0.1 * spring(clamp01((t - c0) / 0.4), 3, 5.6);
        const k = easeInOutCubic(clamp01((t - knockout.at) / 0.35));               // ink → knocked out
        // through it: the zoom is anchored inside the stroke of a letter (the 2nd glyph), so the hole fills the frame
        const zu = clamp01((t - until) / OUT), z = t > until ? 1 + 60 * zu * zu * zu : 1;
        KO.setF(ctx, KO.px);
        const g0 = ctx.measureText(knockout.text[0]).width, g1 = ctx.measureText(knockout.text.slice(0, 2)).width, wt = ctx.measureText(knockout.text).width;
        const ax = -wt / 2 + g0 + (g1 - g0) * 0.18, ay = -KO.px * 0.12;
        const cy = H * (knockout.y ?? 0.45);
        ctx.save(); ctx.translate(W / 2 + ax * pop, cy + ay * pop); ctx.scale(pop * z, pop * z); ctx.translate(-ax, -ay);
        KO.setF(ctx, KO.px); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (k < 1) { ctx.globalAlpha = (1 - k) * clamp01((t - c0) / 0.1); ctx.fillStyle = INK; ctx.fillText(txt, 0, 0); }
        const tm = ctx.getTransform();
        ctx.restore();
        if (k > 0) {
          // the letters drawn on a mask of their own, then that mask erases the paper (skia's destination-out with text
          // straight on the page erased only part of the glyphs)
          const mk = createCanvas(W, H), mx = mk.getContext("2d");
          mx.setTransform(tm); KO.setF(mx, KO.px); mx.textAlign = "center"; mx.textBaseline = "middle"; mx.fillStyle = "#000"; mx.fillText(txt, 0, 0);
          ctx.save(); ctx.globalAlpha = k; ctx.globalCompositeOperation = "destination-out"; ctx.drawImage(mk, 0, 0); ctx.restore();
          // the paper's thickness: a thin line round the letters
          ctx.save(); ctx.setTransform(tm); KO.setF(ctx, KO.px); ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.globalCompositeOperation = "source-atop"; ctx.lineWidth = 0.006 * W; ctx.strokeStyle = `rgba(0,0,0,${0.10 * k})`; ctx.strokeText(txt, 0, 0); ctx.restore();
        }
        // when the letters fill the frame, the paper has gone
        if (t > until) { ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = `rgba(0,0,0,${clamp01((t - until - OUT * 0.55) / (OUT * 0.45))})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      }
      // a warm light passing over the sheet as it lands
      const lk = alive ? ((t - at - 0.25) % 2.4) / 1.2 : clamp01((t - at - 0.25) / 1.2);
      if (lk > 0 && lk < 1) { const g = ctx.createRadialGradient(W * (-0.2 + 1.4 * lk), H * 0.3, 0, W * (-0.2 + 1.4 * lk), H * 0.3, W * 0.7); g.addColorStop(0, `rgba(255,214,150,${0.30 * Math.sin(lk * Math.PI)})`); g.addColorStop(1, "rgba(255,214,150,0)"); ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
      if (layer) { host.save(); host.shadowColor = "rgba(14,12,30,.35)"; host.shadowBlur = 0.03 * W; host.drawImage(layer, 0, 0); host.restore(); }
    },
    cues() {
      const ko = KO ? [...[0.1, 0.22, 0.34, 0.46, 0.58].map(d => cue("click", knockout.count.at + d, { lu: 27 })), cue("swoosh", until + 0.05, { lu: 20 })] : [cue("paper", until + 0.05), cue("swish", until + 0.25, { lu: 23 })];
      return [cue("paper", at + 0.05), cue("swoosh", at + 0.22, { lu: 21 }), ...ko, ...kids.flatMap(k => (k.cues ? k.cues() : []))];
    },
  };
}

// ── the schema's pieces, drawn on a white page (ink, one yellow, soft shadows; each on its word) ────────────────
const pop = (t, at, d = 0.34) => { const u = clamp01((t - at) / d); return { k: spring(u, 3, 5.6), a: clamp01((t - at) / 0.08) }; };
function person(ctx, cx, cy, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy - r * 0.35, r * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.62, r * 0.72, r * 0.5, 0, Math.PI, 0); ctx.fill(); }
function shadowCard(ctx, X, Y, w, h, R, W) {
  ctx.save(); ctx.shadowColor = "rgba(28,26,46,.22)"; ctx.shadowBlur = 0.04 * W; ctx.shadowOffsetY = 0.016 * W; rr(ctx, X, Y, w, h, R); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle = "rgba(40,38,70,.12)"; ctx.lineWidth = 2; rr(ctx, X, Y, w, h, R); ctx.stroke(); ctx.restore();
}
// a card: an icon (person, company, check), a tag in mono capitals, a title in Impact, a line under it
export function pcard({ id, at, until, x, y, w = 0.38, h = 0.20, icon = "person", tag = null, title, sub = null, hot = false, frame = FRAME }) {
  const W = frame.w, H = frame.h;
  return { id, from: at, to: until, draw(ctx, t) {
    const { k, a } = pop(t, at); if (a <= 0) return;
    const cw = w * W, ch = h * H, X = -cw / 2, Y = -ch / 2;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x * W, y * H + (1 - k) * 0.03 * H); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k);
    shadowCard(ctx, X, Y, cw, ch, 0.03 * W, W);
    const ic = ch * 0.30, icy = Y + ch * 0.27;
    if (icon === "person") { ctx.fillStyle = hot ? YELLOW : "#EDEDF2"; ctx.beginPath(); ctx.arc(0, icy, ic * 0.75, 0, Math.PI * 2); ctx.fill(); person(ctx, 0, icy + ic * 0.06, ic * 0.55, INK); }
    if (icon === "company") { ctx.fillStyle = "#EDEDF2"; rr(ctx, -ic * 0.7, icy - ic * 0.7, ic * 1.4, ic * 1.4, ic * 0.3); ctx.fill(); ctx.fillStyle = INK; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.fillRect(-ic * 0.38 + i * ic * 0.28, icy - ic * 0.38 + j * ic * 0.32, ic * 0.16, ic * 0.2); }
    ctx.textAlign = "center";
    if (tag) { setFace(ctx, "mono", 0.032 * W); ctx.fillStyle = "rgba(26,26,26,.6)"; ctx.fillText(tag.toUpperCase(), 0, Y + ch * 0.58); }
    ctx.font = `400 ${(0.062 * W).toFixed(1)}px "ImpactDisplay", Impact`; ctx.fillStyle = INK; ctx.fillText(title.toUpperCase(), 0, Y + ch * 0.76);
    if (sub) { setFace(ctx, "text", 0.03 * W, 500); ctx.fillStyle = "#55536A"; ctx.fillText(sub, 0, Y + ch * 0.90); }
    ctx.restore(); ctx.textAlign = "left";
  }, cues() { return [cue("pop", at + 0.02)]; } };
}
// an arrow drawing itself, its label in mono over it
export function parrow({ id, at, until, from, to, label = null, frame = FRAME, dur = 0.4 }) {
  const W = frame.w, H = frame.h;
  return { id, from: at, to: until, draw(ctx, t) {
    const k = easeOutCubic(clamp01((t - at) / dur)); if (k <= 0) return;
    const [x0, y0] = [from[0] * W, from[1] * H], [x1, y1] = [lerp(from[0] * W, to[0] * W, k), lerp(from[1] * H, to[1] * H, k)];
    ctx.save(); ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 0.008 * W; ctx.lineCap = "round"; ctx.setLineDash([0.02 * W, 0.016 * W]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
    if (k > 0.9) { const ang = Math.atan2(y1 - y0, x1 - x0), hl = 0.03 * W; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(ang - 0.5) * hl, y1 - Math.sin(ang - 0.5) * hl); ctx.lineTo(x1 - Math.cos(ang + 0.5) * hl, y1 - Math.sin(ang + 0.5) * hl); ctx.closePath(); ctx.fill(); }
    if (label && k > 0.6) { ctx.globalAlpha = clamp01((k - 0.6) / 0.4); setFace(ctx, "mono", 0.026 * W); ctx.textAlign = "center"; const mx = (from[0] + to[0]) / 2 * W, my = (from[1] + to[1]) / 2 * H - 0.02 * W; const lw = ctx.measureText(label.toUpperCase()).width + 0.03 * W; ctx.fillStyle = YELLOW; rr(ctx, mx - lw / 2, my - 0.03 * W, lw, 0.045 * W, 0.0225 * W); ctx.fill(); ctx.fillStyle = INK; ctx.fillText(label.toUpperCase(), mx, my + 0.002 * W); ctx.textAlign = "left"; }
    ctx.restore();
  }, cues() { return [cue("swish", at, { lu: 26 })]; } };
}
// a yellow chip
export function pchip({ id, at, until, x, y, text, frame = FRAME }) {
  const W = frame.w, H = frame.h;
  return { id, from: at, to: until, draw(ctx, t) {
    const { k, a } = pop(t, at); if (a <= 0) return;
    setFace(ctx, "mono", 0.034 * W); const tw = ctx.measureText(text.toUpperCase()).width + 0.06 * W, th = 0.07 * W;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x * W, y * H); ctx.rotate(-0.04); ctx.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k);
    ctx.shadowColor = "rgba(28,26,46,.25)"; ctx.shadowBlur = 0.02 * W; ctx.shadowOffsetY = 0.008 * W; rr(ctx, -tw / 2, -th / 2, tw, th, th / 2); ctx.fillStyle = YELLOW; ctx.fill();
    ctx.shadowColor = "transparent"; ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.fillText(text.toUpperCase(), 0, th * 0.18); ctx.restore(); ctx.textAlign = "left";
  }, cues() { return [cue("pop", at + 0.02)]; } };
}
// a checklist: each row in on its word, its box ticked a beat later
export function pcheck({ id, until, x = 0.5, y = 0.30, w = 0.80, rows, frame = FRAME }) {
  const W = frame.w, H = frame.h, rh = 0.085 * H;
  return { id, from: rows[0].t, to: until, draw(ctx, t) {
    const cw = w * W, X = x * W - cw / 2;
    rows.forEach((r, i) => {
      const { k, a } = pop(t, r.t); if (a <= 0) return;
      const Y = y * H + i * (rh + 0.018 * H);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - k) * 0.02 * H);
      shadowCard(ctx, X, Y, cw, rh, 0.022 * W, W);
      const bx = X + 0.04 * W, bs = rh * 0.46, by = Y + (rh - bs) / 2, tk = easeOutCubic(clamp01((t - r.t - 0.25) / 0.25));
      ctx.strokeStyle = INK; ctx.lineWidth = 4; rr(ctx, bx, by, bs, bs, bs * 0.2); ctx.stroke();
      if (tk > 0) { ctx.fillStyle = YELLOW; rr(ctx, bx, by, bs, bs, bs * 0.2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx + bs * 0.2, by + bs * 0.52); ctx.lineTo(bx + bs * 0.42, by + bs * 0.75 * Math.min(1, tk * 2)); if (tk > 0.5) ctx.lineTo(bx + bs * (0.42 + 0.4 * (tk - 0.5) * 2), by + bs * (0.75 - 0.5 * (tk - 0.5) * 2)); ctx.stroke(); }
      ctx.font = `400 ${(0.062 * W).toFixed(1)}px "ImpactDisplay", Impact`; ctx.fillStyle = INK; ctx.fillText(r.text.toUpperCase(), bx + bs + 0.035 * W, Y + rh * 0.66);
      ctx.restore();
    });
  }, cues() { return rows.flatMap(r => [cue("pop", r.t + 0.02), cue("click", r.t + 0.27, { lu: 28 })]); } };
}
// a big number counting on its word, on the marker, a line under it
export function pbig({ id, at, until, x = 0.5, y = 0.62, to, fmt = v => `${Math.round(v)}%`, text, sub = null, frame = FRAME }) {
  const W = frame.w, H = frame.h;
  return { id, from: at, to: until, draw(ctx, t) {
    const { k, a } = pop(t, at, 0.4); if (a <= 0) return;
    const c = easeOutQuint(clamp01((t - at) / 0.8)), txt = c >= 1 ? text : fmt(to * c), px = 0.26 * W;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x * W, y * H); ctx.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k);
    ctx.font = `400 ${px.toFixed(1)}px "ImpactDisplay", Impact`; const tw = ctx.measureText(text).width;
    const mk = easeOutCubic(clamp01((t - at - 0.5) / 0.3)); ctx.fillStyle = YELLOW; ctx.fillRect(-tw / 2 - px * 0.05, -px * 0.36, (tw + px * 0.1) * mk, px * 0.42);
    ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.fillText(txt, 0, 0);
    if (sub) { setFace(ctx, "text", 0.04 * W, 600); ctx.fillStyle = "#55536A"; ctx.globalAlpha = a * clamp01((t - at - 0.6) / 0.3); ctx.fillText(sub, 0, px * 0.38); }
    ctx.restore(); ctx.textAlign = "left";
  }, cues() { return [0.1, 0.25, 0.4, 0.55].map(d => cue("click", at + d, { lu: 29 })); } };
}

// ── a white page's content drawn by the long video's engine (docpage.mjs): its frames laid on the sheet, scaled to the
// page's width, its own sounds (the engine's cues: pops, clicks, paper) played at their moments ──────────────────────
// src: assets/media/doc-<page> (meta.json › from: the short's second its frame 1 is); y: where its top lands (fraction)
export function docLayer({ id, src, y = 0.21, w = 1.0, frame = FRAME, gain = -16 }) {
  const meta = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), src, "meta.json"), "utf8"));
  const at = meta.from, until = at + meta.frames / meta.fps;
  want(src, at, until);
  const W = frame.w, H = frame.h, dw = w * W, dh = dw * meta.height / meta.width;
  return {
    id, kind: "doc", from: at, to: until, layer: "over",
    draw(ctx, t) {
      const i = Math.min(meta.frames - 1, Math.floor((t - at) * meta.fps));
      const img = frameOf(src, at + i / meta.fps + 1e-4, at);
      if (img) ctx.drawImage(img, (W - dw) / 2, y * H, dw, dh);
    },
    cues() {
      // the engine's sounds, copied from the shelf into the short's assets (sfx.mjs reads them there)
      const out = [];
      const dir = path.resolve(process.cwd(), "assets", "sfx-doc");
      for (const c of meta.cues || []) {
        let file; try { file = SOUND.sfxPath(c.name); } catch { continue; }
        if (!file || !fs.existsSync(file)) continue;
        fs.mkdirSync(dir, { recursive: true });
        const base = path.basename(file).replace(/[^A-Za-z0-9._-]/g, "_"), dst = path.join(dir, base);
        if (!fs.existsSync(dst)) fs.copyFileSync(file, dst);
        const mode = c.align || "attack";
        out.push({ t: +(at + c.t).toFixed(3), kind: `sample:sfx-doc/${base}`, gain: +((c.gain ?? -15) + gain).toFixed(1), align: SOUND.alignOf(file, mode), role: "doc" });
      }
      return out;
    },
  };
}
