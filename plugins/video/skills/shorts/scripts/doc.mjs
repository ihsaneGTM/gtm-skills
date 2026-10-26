// THE STYLE « DOCUMENT », FOLDED INTO A VERTICAL SHORT: the figures of /video-long-to-shorts. The long video's language
// (voiceover-video/references/look.md: ink and greys, ONE yellow marker, the brand's title face heavy and an italic
// serif, white paper with a fine grid seen in patches, real stock shots in a thin ink frame, GIFs as pinned prints),
// drawn by the vertical engine (short-editor: two layers, the speaker cut out between them) so a short of a video and
// the video itself read as one series.
//
// Every figure is a beat of the engine ({ id, from, to, layer, draw(ctx, t), cues() }); sizes are fractions of the
// frame WIDTH, heights fractions of the frame HEIGHT, times OUTPUT seconds. They keep inside the feed's safe area
// (short-editor/scripts/safezones.mjs).
//
//   lockup({ id, at, until, x, y, align, layer, rows: [row(t, sans("text", 0.11), serif("word", 0.13, { hot: true }))] })
//             the long video's lockup: rows pop on their words (a spring 0.72 → 1, a rise), the title face heavy and the
//             italic serif, the payoff word on the yellow marker; ink, one wide soft shadow. layer "under" = behind
//             the speaker's head (Dynamic text's place), "over" in front.
//   desk({ id, from, to, enter, exit, children, accent }) the white desk over the whole frame (a page of the long video),
//             sliding up in, sliding out; its children drawn on it
//   framed({ id, src, at, until, box, start }) a stock shot in its thin ink frame on the paper, opening from its middle
//             line, the guide lines and crosshairs to the edges, the fine screen grid over it
//   print({ id, src, at, until, x, y, w, rot, caption }) a GIF or a picture as a pinned print: a white border, the
//             yellow pin, a soft shadow, a short caption under it
//   captions({ words, from, to, y, keep }) the words low, three at a time, the one being said on the yellow marker
//   counter({ id, at, until, to, fmt, noun, x, y }) a number counting up on its word, on the marker, its noun rising
//   chapter({ id, at, until, over, title }) the yellow page of a new part (the long video's V page), with its whoosh
//
// Media (stock shots, GIFs) are frame folders made by the scrapbook's media.mjs (assets/media/<name>/f0001.jpg…,
// meta.json); loadDoc() decodes only the frames a figure shows.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage, GlobalFonts, clamp01, easeOutCubic, easeOutQuint, easeInOutCubic, spring, lerp } from "../../short-editor/scripts/scene.mjs";
import { SAFE, FORBIDDEN } from "../../short-editor/scripts/safezones.mjs";
import { cue } from "../../scrapbook-editor/scripts/book.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PJ = (() => { try { return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "project.json"), "utf8")); } catch { return {}; } })();
export const FRAME = { w: PJ.width ?? 1080, h: PJ.height ?? 1920, fps: PJ.fps ?? 30 };

// ── the faces: the brand's title face (Bricolage Grotesque by default, heavy) and its italic serif (Instrument Serif) ─
const FONT_DIRS = [path.resolve(process.cwd(), "assets", "fonts"), path.resolve(HERE, "../../../motion/fonts")];
const reg = (file, alias) => { for (const d of FONT_DIRS) { const p = path.join(d, file); try { if (fs.existsSync(p) && GlobalFonts.registerFromPath(p, alias)) return alias; } catch {} } return null; };
const FACE = {
  title: reg(PJ.faces?.sans || "BricolageGrotesque.ttf", "DocTitle"),
  serif: reg(PJ.faces?.serif || "InstrumentSerif-Italic.ttf", "DocSerif"),
  text: reg(PJ.faces?.text || "Onest.ttf", "DocText"),
  mono: reg("GeistMono.ttf", "DocMono"),
};
export function setFace(ctx, k, px, weight = 800) {
  const f = k === "serif" ? FACE.serif : k === "text" ? FACE.text : k === "mono" ? FACE.mono : FACE.title;
  ctx.font = `${Math.max(1, px).toFixed(2)}px "${f || "Helvetica Neue"}"`;
  try { ctx.fontVariationSettings = k === "serif" || k === "mono" ? "normal" : `"wght" ${weight}, "opsz" ${Math.min(96, Math.max(12, px / 2)).toFixed(0)}`; } catch {}
  try { ctx.letterSpacing = k === "serif" ? "0px" : `${(-0.035 * px).toFixed(2)}px`; } catch {}
}
// the palette: ink and greys, ONE yellow (the brand's accent when it is set, its dark for the ink)
export const INK = PJ.ink || "#1A1A1A";
export const YELLOW = PJ.accent || "#FFD90D";
export const PAPER = "#FFFFFF";
const W = () => FRAME.w, H = () => FRAME.h;
// the print that holds the speaker in the desk layout (cut.mjs lays the take in it), fractions of the frame
export const SPLIT = { x: 0.065, y: 0.585, w: 0.87, h: 0.315, border: 0.016 };

// ── a run of text, a row ──────────────────────────────────────────────────────────────────────────────────────
export const sans = (text, size, o = {}) => ({ text, k: "sans", size, ...o });
export const serif = (text, size, o = {}) => ({ text, k: "serif", size, ...o });
export const row = (t, ...runs) => { const o = runs.length && !runs.at(-1).text ? runs.pop() : {}; return { t, runs, ...o }; };
const measure = (ctx, r, scale = 1) => { setFace(ctx, r.k, r.size * W() * scale); return ctx.measureText(r.text); };

// the yellow marker behind a word: a flat band on its lower part, drawn from left to right
function marker(ctx, x, y, w, px, k, colour = YELLOW) {
  if (k <= 0) return;
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.96;
  const top = y - px * 0.36, h = px * 0.42;
  ctx.fillRect(x - px * 0.04, top, (w + px * 0.08) * k, h);
  ctx.restore();
}
function shadowed(ctx, fn, { a = 0.22, blur = 0.028, dy = 0.010, glow = false } = {}) {
  ctx.save();
  ctx.shadowColor = glow ? `rgba(255,255,255,${a})` : `rgba(20,18,40,${a})`;
  ctx.shadowBlur = blur * W(); ctx.shadowOffsetY = dy * W();
  fn(); ctx.restore();
}

// ── the lockup ────────────────────────────────────────────────────────────────────────────────────────────────
// rows stacked top to bottom (one face per run, faces may share a row), each popping on its own word; the block
// clamped into the safe area; `hot` runs on the marker (it wipes in 0.12 s after the row lands); `color` for a white
// lockup over a dark picture; `halo` a light glow behind ink words over a busy picture
export function lockup({ id, at, until, x = 0.5, y = 0.16, align = "center", anchor = "top", layer = "under", rows, gap = 0.012,
  color = INK, halo = false, frame = FRAME, exit = 0.22, sound = true, maxW = 0.80 }) {
  const ctx0 = createCanvas(8, 8).getContext("2d");
  // the layout at rest: each row's runs, their widths, the row's height; shrunk to the room the safe area gives
  const lay = rows.map(r => {
    let scale = 1, parts, w;
    const fit = () => { parts = r.runs.map(u => ({ ...u, w: measure(ctx0, u, scale).width, px: u.size * frame.w * scale })); w = parts.reduce((s, p) => s + p.w, 0) + (parts.length - 1) * 0.022 * frame.w * scale; };
    fit();
    const room = Math.min(maxW, (align === "center" ? 2 * Math.min(SAFE.x1 - x, x - SAFE.x0) : align === "right" ? x - SAFE.x0 : SAFE.x1 - x)) * frame.w;
    if (w > room) { scale *= room / w; fit(); }
    const px = Math.max(...parts.map(p => p.px));
    return { ...r, parts, w, px };
  });
  const heights = lay.map(r => r.px * 0.92);
  const total = heights.reduce((s, h) => s + h, 0) + gap * frame.h * (lay.length - 1);
  let top = (anchor === "bottom" ? y * frame.h - total : y * frame.h);
  top = Math.max(top, (SAFE.y0 + 0.004) * frame.h);
  if (top + total > SAFE.y1 * frame.h) top = SAFE.y1 * frame.h - total;
  let cy = top;
  for (const [i, r] of lay.entries()) { r.base = cy + heights[i] * 0.80; cy += heights[i] + gap * frame.h; }
  const X = x * frame.w;
  const end = until;
  return {
    id, from: at - 0.02, to: end + exit, said: [at - 0.02, end], layer, mutesCaptions: true,
    box: { x0: (X - Math.max(...lay.map(r => r.w)) / (align === "center" ? 2 : 1)) / frame.w, y0: top / frame.h, y1: (top + total) / frame.h },
    draw(ctx, t) {
      const out = clamp01((t - end) / exit);
      const fade = 1 - easeOutCubic(out);
      for (const r of lay) {
        const left = align === "center" ? X - r.w / 2 : align === "right" ? X - r.w : X;
        let xx = left;
        // each run pops on its own word (`t` of the run, else the row's): a row builds word by word as it is said
        for (const p of r.parts) {
          const u = t - (p.t ?? r.t), x0 = xx;
          xx += p.w + 0.022 * frame.w * (p.px / (p.size * frame.w));
          if (u < 0) continue;
          const k = clamp01(u / 0.34), sp = 0.72 + 0.28 * spring(k, 3.2, 5.4), rise = (1 - easeOutCubic(clamp01(u / 0.26))) * 0.023 * frame.h;
          const a = clamp01(u / 0.10) * fade;
          if (a <= 0.003) continue;
          ctx.save();
          ctx.globalAlpha = a;
          const ox = x0 + p.w / 2, oy = r.base - r.px * 0.3;
          ctx.translate(ox, oy - out * 0.012 * frame.h + rise); ctx.scale(sp, sp); ctx.translate(-ox, -oy);
          if (p.hot) marker(ctx, x0, r.base, p.w, p.px, easeOutCubic(clamp01((u - 0.12) / 0.20)), p.hotColor);
          shadowed(ctx, () => { setFace(ctx, p.k, p.px); ctx.fillStyle = p.color || color; ctx.fillText(p.count ? counted(p, t, p.t ?? r.t) : p.text, x0, r.base); },
            halo ? { a: 0.85, blur: 0.04, dy: 0, glow: true } : { a: color === INK ? 0.20 : 0.45 });
          ctx.restore();
        }
      }
    },
    cues() {
      if (!sound) return [];
      const c = [cue("swish", at, { lu: 24 })];
      for (const r of lay) for (const p of r.parts) if (p.hot) c.push(cue("pop", (p.t ?? r.t) + 0.12));
      return c;
    },
  };
}

// ── the speaker's words as lockups, phrase by phrase (Dynamic text's rule, the long video's type) ─────────────
// One lockup per phrase (a pause over 0.35 s, a full stop, or `maxWords`), its lines filled to `maxChars`, each line
// sized to the width it has, each word popping on its own onset. `hot`: the words on the yellow marker (the payoff of a
// phrase, one or two a phrase); `serif`: words written in the italic serif, a size up (one a phrase at most); `skip`:
// stretches [a, b] with no headline (a figure says it). Where the head leaves no room at the top (a landscape take
// reframed: the head fills the top of the frame), the words go BELOW the head, in front of the speaker (anchor
// "bottom", y 0.765, the over layer), Dynamic text's tight-shot rule.
// `quiet`: stretches [a, b] where a picture holds the middle of the frame (a print): the phrases there stay small, two lines
// at most, under it (pass the prints: quiet: BEATS.filter(b => b.id.startsWith("print"))…)
export function headlines({ words, from = 0, to = 1e9, hot = [], serif: italics = [], skip = [], quiet = [], place = "auto", face = null,
  y = null, layer = null, maxChars = 14, maxWords = 7, color = INK, halo = false, frame = FRAME, width = 0.80, over = [] }) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9'’%$€]/gi, "");
  const H = new Set(hot.map(norm)), I = new Set(italics.map(norm));
  const ws = words.filter(w => w.s >= from && w.s < to && w.w.trim() && !skip.some(([a, b]) => w.s >= a && w.s < b));
  const low = place === "low" || (place === "auto" && (face ? face.y - face.h / 2 < 0.24 : true));
  const phrases = [];
  let p = [];
  ws.forEach((w, i) => {
    p.push(w);
    const n = ws[i + 1];
    // never one or two words of a sentence left alone after the cut (« things. » on a screen of its own)
    const ends = (x, k) => x && (/[.?!,;:]$/.test(x.w) || !ws[k + 1] || ws[k + 1].s - x.e > 0.35);
    const tail = [n, ws[i + 2]].findIndex((x, j) => ends(x, i + 1 + j));
    const full = p.length >= maxWords && !(tail >= 0 && p.length < maxWords + 2 && !(n && n.s - w.e > 0.35));
    if (!n || n.s - w.e > 0.35 || /[.?!]$/.test(w.w) || full || (/[,;:]$/.test(w.w) && p.length >= 3)) { phrases.push(p); p = []; }
  });
  const clean = s => s.replace(/[,.;:]+$/, "");
  return phrases.map((ph, i) => {
    // the lines: filled to maxChars, never one word alone at the end when it can join the line above
    const small = quiet.some(([a, b]) => ph[0].s < b && ph.at(-1).e > a);
    const mc = small ? Math.max(maxChars, Math.ceil(ph.map(x => clean(x.w)).join(" ").length / 2) + 1) : maxChars;
    const lines = [];
    for (const w of ph) { const l = lines.at(-1), txt = clean(w.w); if (l && (l.map(x => clean(x.w)).join(" ").length + 1 + txt.length) <= mc) l.push(w); else lines.push([w]); }
    if (lines.length > 1 && lines.at(-1).length === 1 && lines.at(-2).map(x => x.w).join(" ").length + lines.at(-1)[0].w.length < mc + 5) lines.at(-2).push(...lines.pop());
    const rows = lines.map(l => {
      const chars = l.map(x => clean(x.w)).join(" ").length;
      const size = Math.max(0.065, Math.min(small ? 0.085 : 0.15, width / (Math.max(4, chars) * 0.50)));
      return row(l[0].s, ...l.map(w => { const k = norm(w.w); return I.has(k) ? serif(clean(w.w), size * 1.22, { t: w.s }) : sans(clean(w.w), size, { t: w.s, hot: H.has(k) }); }));
    });
    // it leaves on the next phrase, or where a figure takes the words over (a skipped stretch), never later than 1.2 s
    // after its last word
    const nextSkip = skip.map(([a]) => a).filter(a => a > ph.at(-1).s).sort((x, y) => x - y)[0] ?? 1e9;
    const next = Math.min(phrases[i + 1]?.[0].s ?? 1e9, nextSkip + 0.14, ph.at(-1).e + 1.34, to);
    const onPaper = over.some(([a, b]) => ph[0].s >= a - 0.05 && ph[0].s < b);
    const lay = layer ?? (low || onPaper ? "over" : "under");
    return lockup({ id: `hl-${i}`, at: ph[0].s - 0.02, until: phrases[i + 1] ? next - 0.14 : Math.max(ph.at(-1).s + 0.25, next - 0.14), exit: 0.12, rows, frame, color, halo: halo && !onPaper,
      x: 0.5, y: y ?? (low ? 0.765 : 0.15), anchor: low && y == null ? "bottom" : "top", layer: lay, maxW: width, sound: false });
  });
}
// a number counting to what is written, on its row's word (the long video's counters): { count: { to, dur, fmt } }
function counted(p, t, t0) {
  const { to, dur = 0.7, fmt = v => String(Math.round(v)) } = p.count;
  const k = easeOutQuint(clamp01((t - t0) / dur));
  return k >= 1 ? p.text : fmt(to * k);
}
export function counter({ id, at, until, to, fmt, text, noun, nounAt, x = 0.5, y = 0.2, size = 0.30, layer = "under", frame = FRAME }) {
  const rows = [row(at, sans(text, size, { hot: true, count: { to, fmt, dur: 0.75 } }))];
  if (noun) rows.push(row(nounAt ?? at + 0.5, sans(noun, size * 0.30)));
  const b = lockup({ id, at, until, x, y, layer, rows, frame });
  const base = b.cues;
  b.cues = () => [...base(), ...[0.15, 0.3, 0.45, 0.6].map(d => cue("click", at + d, { lu: 30 }))];
  return b;
}

// ── the paper: the long video's white desk, a fine grid seen in patches, a light diagonal hatch, grain ────────────
const PAPERS = new Map();
export function paperCanvas(w = FRAME.w, h = FRAME.h, seed = 1, accent = false) {
  const key = `${w}x${h}:${seed}:${accent}`;
  if (PAPERS.has(key)) return PAPERS.get(key);
  const c = createCanvas(w, h), x = c.getContext("2d");
  const R = (k => () => { k = (k * 16807) % 2147483647; return k / 2147483647; })(seed * 7919 + 13);
  const g = x.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.hypot(w, h) * 0.55);
  if (accent) { g.addColorStop(0, "#FFE85C"); g.addColorStop(0.55, YELLOW); g.addColorStop(1, "#E9C400"); }
  else { g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.55, "#FBFBFD"); g.addColorStop(1, "#EEEEF2"); }
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // the grid, in two patches (the long video's mask: two soft ellipses)
  const cell = Math.round(w * 0.052);
  const grid = createCanvas(w, h), gx = grid.getContext("2d");
  gx.strokeStyle = accent ? "rgba(26,26,26,.11)" : "rgba(40,38,70,.085)"; gx.lineWidth = Math.max(1, w / 720);
  for (let i = 0; i <= w; i += cell) { gx.beginPath(); gx.moveTo(i + 0.5, 0); gx.lineTo(i + 0.5, h); gx.stroke(); }
  for (let j = 0; j <= h; j += cell) { gx.beginPath(); gx.moveTo(0, j + 0.5); gx.lineTo(w, j + 0.5); gx.stroke(); }
  gx.globalCompositeOperation = "destination-in";
  const m = createCanvas(w, h), mx = m.getContext("2d");
  for (const [px, py, rx, ry] of [[0.15 + R() * 0.3, 0.12 + R() * 0.3, 0.55, 0.30], [0.55 + R() * 0.3, 0.55 + R() * 0.3, 0.55, 0.32]]) {
    const rg = mx.createRadialGradient(px * w, py * h, 0, px * w, py * h, rx * w);
    rg.addColorStop(0, "rgba(0,0,0,1)"); rg.addColorStop(0.45, "rgba(0,0,0,.6)"); rg.addColorStop(1, "rgba(0,0,0,0)");
    mx.save(); mx.translate(px * w, py * h); mx.scale(1, ry / rx * h / w * 1.8); mx.translate(-px * w, -py * h);
    mx.fillStyle = rg; mx.fillRect(0, 0, w, h * 2); mx.restore();
  }
  gx.drawImage(m, 0, 0);
  x.drawImage(grid, 0, 0);
  // the hatch and the grain
  x.save(); x.globalAlpha = accent ? 0.05 : 0.025; x.strokeStyle = accent ? "#fff" : "#282646"; x.lineWidth = 1.5;
  for (let i = -h; i < w; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + h, h); x.stroke(); }
  x.restore();
  const img = x.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 9; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(img, 0, 0);
  // a few specks of dust
  x.fillStyle = "rgba(40,38,70,.18)";
  for (let i = 0; i < 26; i++) { x.beginPath(); x.arc(R() * w, R() * h, 0.6 + R() * 1.6, 0, Math.PI * 2); x.fill(); }
  PAPERS.set(key, c);
  return c;
}
// the base pictures of cut.mjs: the desk alone (an AI-voice line: the plan covers it), and the desk with the print
// that holds the speaker (the split layout); written as PNG
export function deskPng(file, { print = false } = {}) {
  const c = createCanvas(FRAME.w, FRAME.h), x = c.getContext("2d");
  x.drawImage(paperCanvas(FRAME.w, FRAME.h, 3), 0, 0);
  if (print) {
    const b = SPLIT.border * FRAME.w, X = SPLIT.x * FRAME.w - b, Y = SPLIT.y * FRAME.h - b, PW = SPLIT.w * FRAME.w + 2 * b, PH = SPLIT.h * FRAME.h + 2 * b;
    x.save(); x.shadowColor = "rgba(28,26,46,.30)"; x.shadowBlur = 0.04 * FRAME.w; x.shadowOffsetY = 0.016 * FRAME.w;
    x.fillStyle = "#FFFFFF"; x.fillRect(X, Y, PW, PH); x.restore();
    x.save(); x.shadowColor = "rgba(28,26,46,.14)"; x.shadowBlur = 3; x.shadowOffsetY = 1; x.fillStyle = "#FFFFFF"; x.fillRect(X, Y, PW, PH); x.restore();
    x.fillStyle = "#1a1a1a"; x.fillRect(SPLIT.x * FRAME.w, SPLIT.y * FRAME.h, SPLIT.w * FRAME.w, SPLIT.h * FRAME.h);
  }
  fs.writeFileSync(file, c.toBuffer("image/png"));
}

// ── the desk over the whole frame: slides up in (0.30 s), slides down out; its children on it ─────────────────────
export function desk({ id, from, to, enter = "up", exit = "down", children = [], accent = false, seed = 2, layer = "over", frame = FRAME, sound = true }) {
  const IN = enter === "cut" ? 0 : 0.30, OUT = exit === "cut" ? 0 : 0.26;
  const kids = children.flat();
  paperCanvas(frame.w, frame.h, seed, accent);   // made as the plan loads, never in a frame (see whitePage in dt.mjs)
  return {
    id, from, to: to + OUT, said: [from, to], layer, mutesCaptions: true,
    draw(ctx, t) {
      const ki = IN ? easeOutQuint(clamp01((t - from) / IN)) : 1, ko = OUT ? easeInOutCubic(clamp01((t - to) / OUT)) : 0;
      const dy = (1 - ki) * frame.h + ko * frame.h;
      ctx.save(); ctx.translate(0, dy);
      if (dy > 1) { ctx.save(); ctx.shadowColor = "rgba(20,18,40,.35)"; ctx.shadowBlur = 40; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, frame.w, frame.h); ctx.restore(); }
      ctx.drawImage(paperCanvas(frame.w, frame.h, seed, accent), 0, 0);
      for (const k of kids) if (t >= k.from && t <= k.to) k.draw(ctx, t);
      ctx.restore();
    },
    cues() { return [...(sound && IN ? [cue("swoosh", from, { lu: 22 })] : []), ...kids.flatMap(k => (k.cues ? k.cues() : []))]; },
  };
}

// ── media: frame folders (media.mjs) ──────────────────────────────────────────────────────────────────────────
const MEDIA = new Map();
export const want = (src, a, b, start = 0) => { const m = MEDIA.get(src) ?? { wins: [] }; m.wins.push([a, b, start]); MEDIA.set(src, m); };
// the stretch of the short this process draws (render.mjs --from / --frames a b, --png t, build.sh's pieces): only the
// frames inside it are decoded (a white page's 300 frames of 1200×1080 are 1.5 GB decoded, and every piece loads)
function drawnSpan() {
  const v = process.argv, at = k => { const i = v.indexOf(k); return i < 0 ? null : v[i + 1]; };
  const fps = PJ.fps ?? 30, from = +(at("--from") ?? 0);
  if (at("--png") != null) return [+at("--png") - 0.05, +at("--png") + 0.05];
  const i = v.indexOf("--frames");
  if (i >= 0) return [from + +v[i + 1] / fps - 0.05, from + +v[i + 2] / fps + 0.05];
  return [from, at("--to") != null ? +at("--to") : 1e9];
}
export async function loadDoc() {
  const [S0, S1] = drawnSpan();
  for (const [src, m] of MEDIA) {
    const p = path.resolve(process.cwd(), src);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      const meta = JSON.parse(fs.readFileSync(path.join(p, "meta.json"), "utf8"));
      const files = fs.readdirSync(p).filter(f => /^f\d+\.(jpe?g|png)$/.test(f)).sort();
      Object.assign(m, { kind: "clip", fps: meta.fps, w: meta.width, h: meta.height, frames: new Array(files.length).fill(null) });
      const need = new Set();
      for (const [a, b, s] of m.wins) for (let t = Math.max(a, S0); t <= Math.min(b + 0.05, S1); t += 1 / FRAME.fps) need.add(Math.floor((t - a + s) * meta.fps) % files.length);
      for (const i of need) m.frames[i] = await loadImage(path.join(p, files[i]));
    } else if (fs.existsSync(p)) { const img = await loadImage(p); Object.assign(m, { kind: "still", img, w: img.width, h: img.height }); }
    else console.error(`  ⚠ media not found: ${src}`);
  }
}
export const frameOf = (src, t, at, start = 0) => {
  const m = MEDIA.get(src);
  if (!m) return null;
  if (m.kind === "still") return m.img;
  if (!m.frames?.length) return null;
  const i = Math.floor((t - at + start) * m.fps) % m.frames.length;
  return m.frames[i] ?? m.frames.find(Boolean) ?? null;
};
export const aspectOf = src => {
  const p = path.resolve(process.cwd(), src);
  try { if (fs.statSync(p).isDirectory()) { const m = JSON.parse(fs.readFileSync(path.join(p, "meta.json"), "utf8")); return m.height / m.width; } } catch {}
  return 9 / 16;
};

// ── a stock shot in its frame on the paper (framed.js of the long video) ─────────────────────────────────────
// box: { x, y, w } fractions (centre x, top y, width); the height from the shot's aspect (or box.h)
const SCREEN = (() => { const c = createCanvas(8, 8), x = c.getContext("2d"); x.fillStyle = "rgba(0,0,0,.10)"; x.fillRect(0, 0, 8, 1); x.fillRect(0, 0, 1, 8); return c; })();
// `floor`: where the guide lines stop (a fraction of the height; the desk layout: above the print)
export function framed({ id, src, at, until, box = { x: 0.5, y: 0.20, w: 0.84 }, start = 0, caption = null, frame = FRAME, sound = true, floor = PJ.shortsLayout === "split" ? SPLIT.y - 0.02 : 1 }) {
  want(src, at, until, start);
  const w = box.w * frame.w, X = box.x * frame.w - w / 2, Y = box.y * frame.h;
  const hh = box.h ? box.h * frame.h : w * aspectOf(src);
  const OPEN = 0.36, CLOSE = 0.22;
  return {
    id, from: at, to: until + CLOSE, layer: "over",
    draw(ctx, t) {
      const ko = easeOutQuint(clamp01((t - at) / OPEN)), kc = easeInOutCubic(clamp01((t - until) / CLOSE));
      const open = ko * (1 - kc);
      // the guide lines across the paper, the crosshairs at the corners
      ctx.save(); ctx.globalAlpha = clamp01((t - at) / 0.18) * (1 - kc);
      ctx.strokeStyle = "rgba(26,26,26,.35)"; ctx.lineWidth = Math.max(1, frame.w / 900);
      for (const yy of [Y, Y + hh]) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(frame.w, yy); ctx.stroke(); }
      for (const xx of [X, X + w]) { ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, floor * frame.h); ctx.stroke(); }
      ctx.strokeStyle = "rgba(26,26,26,.85)"; ctx.lineWidth = Math.max(1.5, frame.w / 600);
      const cs = 0.018 * frame.w;
      for (const [cx, cy] of [[X, Y], [X + w, Y], [X, Y + hh], [X + w, Y + hh]]) { ctx.beginPath(); ctx.moveTo(cx - cs, cy); ctx.lineTo(cx + cs, cy); ctx.moveTo(cx, cy - cs); ctx.lineTo(cx, cy + cs); ctx.stroke(); }
      ctx.restore();
      if (open <= 0.002) return;
      // the screen opens from its middle line
      const mid = Y + hh / 2, oh = hh * open;
      ctx.save(); ctx.beginPath(); ctx.rect(X, mid - oh / 2, w, oh); ctx.clip();
      const img = frameOf(src, t, at, start);
      if (img) { const s = Math.max(w / img.width, hh / img.height), iw = img.width * s, ih = img.height * s; ctx.drawImage(img, X + (w - iw) / 2, Y + (hh - ih) / 2, iw, ih); }
      else { ctx.fillStyle = "#222"; ctx.fillRect(X, Y, w, hh); }
      // one grade for every shot (a little less colour, the paper's warmth), then the fine screen grid
      ctx.globalCompositeOperation = "saturation"; ctx.fillStyle = "rgba(128,128,128,.28)"; ctx.fillRect(X, Y, w, hh);
      ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = ctx.createPattern(SCREEN, "repeat"); ctx.fillRect(X, Y, w, hh);
      ctx.restore();
      ctx.save(); ctx.strokeStyle = "rgba(26,26,26,.9)"; ctx.lineWidth = Math.max(1.5, frame.w / 640); ctx.strokeRect(X, mid - oh / 2, w, oh); ctx.restore();
      if (caption && open > 0.9) {
        ctx.save(); setFace(ctx, "mono", 0.024 * frame.w); ctx.fillStyle = "rgba(26,26,26,.7)"; ctx.globalAlpha = clamp01((t - at - OPEN) / 0.2) * (1 - kc);
        ctx.fillText(caption.toUpperCase(), X, Y + hh + 0.022 * frame.h); ctx.restore();
      }
    },
    cues() { return sound ? [cue("swish", at, { lu: 25 })] : []; },
  };
}

// ── a GIF or a picture as a pinned print (fx.js gifPrint of the long video) ──────────────────────────────────
let TURN = 0;
// safe: false lets a print behind the speaker run past the safe area (it is half hidden by them anyway)
export function print({ id, src, at, until, x = 0.47, y = 0.42, w = 0.66, rot = null, caption = null, start = 0, layer = "over", frame = FRAME, sound = true, safe = true }) {
  want(src, at, until, start);
  const r = rot ?? (TURN++ % 2 ? 3 : -3);
  const pw = (safe ? Math.min(w, 2 * Math.min(x - SAFE.x0, (y > FORBIDDEN[1].y0 - 0.1 ? FORBIDDEN[1].x0 : SAFE.x1) - x)) : w) * frame.w;
  const ph = pw * aspectOf(src), bd = pw * 0.045, chin = caption ? pw * 0.12 : bd;
  const IN = 0.30, OUT = 0.20;
  return {
    id, kind: "print", from: at, to: until + OUT, held: [at, until], layer,
    draw(ctx, t) {
      const ki = clamp01((t - at) / IN), ko = easeInOutCubic(clamp01((t - until) / OUT));
      const s = (0.86 + 0.14 * spring(ki, 3, 5.5)) * (1 - 0.08 * ko), a = clamp01((t - at) / 0.08) * (1 - ko);
      if (a <= 0.003) return;
      const cx = x * frame.w + ko * 0.6 * frame.w * (r < 0 ? -1 : 1), cy = y * frame.h + (1 - easeOutCubic(ki)) * 0.05 * frame.h;
      const blur = (1 - easeOutCubic(clamp01((t - at) / 0.14))) * 10 + ko * 8;
      ctx.save(); ctx.globalAlpha = a; if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`; ctx.translate(cx, cy); ctx.rotate((r * (1 - 0.4 * easeOutCubic(ki)) * Math.PI) / 180); ctx.scale(s, s);
      const X = -pw / 2 - bd, Y = -ph / 2 - bd, TW = pw + 2 * bd, TH = ph + bd + chin;
      ctx.save(); ctx.shadowColor = "rgba(28,26,46,.32)"; ctx.shadowBlur = 0.035 * frame.w * (1.6 - 0.6 * ki); ctx.shadowOffsetY = 0.014 * frame.w * (1.8 - 0.8 * ki);
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(X, Y, TW, TH); ctx.restore();
      const img = frameOf(src, t, at, start);
      ctx.save(); ctx.beginPath(); ctx.rect(-pw / 2, -ph / 2, pw, ph); ctx.clip();
      if (img) { const sc = Math.max(pw / img.width, ph / img.height); ctx.drawImage(img, -img.width * sc / 2, -img.height * sc / 2, img.width * sc, img.height * sc); }
      ctx.restore();
      if (caption) { setFace(ctx, "title", chin * 0.42, 700); ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.fillText(caption, 0, ph / 2 + chin * 0.66); ctx.textAlign = "left"; }
      // the yellow pin
      const pr = 0.024 * frame.w, py = Y + bd * 0.6;
      ctx.save(); ctx.shadowColor = "rgba(28,26,46,.38)"; ctx.shadowBlur = pr * 0.6; ctx.shadowOffsetY = pr * 0.35;
      const g = ctx.createRadialGradient(-pr * 0.3, py - pr * 0.35, pr * 0.1, 0, py, pr);
      g.addColorStop(0, "#FFF6B8"); g.addColorStop(0.35, YELLOW); g.addColorStop(1, "#B89A00");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, py, pr, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.restore();
    },
    cues() { return sound ? [cue("shutter", at + 0.05), cue("swish", until, { lu: 26 })] : []; },
  };
}

// ── the captions: the words low, three at a time, the one being said on the marker ───────────────────────────
// words: [{ w, s, e }] output seconds; groups break on a pause (> 0.28 s), a full stop, or three words
export function captions({ words, from = 0, to = 1e9, y = 0.725, size = 0.058, frame = FRAME, layer = "over", mutedBy = [] }) {
  const ws = words.filter(w => w.s >= from && w.s < to && w.w.trim());
  const groups = [];
  let g = [];
  ws.forEach((w, i) => {
    g.push(w);
    const next = ws[i + 1];
    if (g.length >= 3 || !next || next.s - w.e > 0.28 || /[.?!,:;]$/.test(w.w)) { groups.push(g); g = []; }
  });
  const ctx0 = createCanvas(8, 8).getContext("2d");
  const clean = s => s.replace(/[.,!?;:]+$/, "");
  const said = b => b.said ?? [b.from, b.to];
  return {
    id: "captions", from, to, layer,
    draw(ctx, t) {
      if (mutedBy.some(b => t >= said(b)[0] && t <= said(b)[1])) return;
      const gi = groups.findIndex((gr, i) => t >= gr[0].s - 0.04 && t < (groups[i + 1]?.[0].s ?? gr.at(-1).e + 0.6) - 0.04);
      if (gi < 0) return;
      const gr = groups[gi];
      let px = size * frame.w;
      setFace(ctx0, "title", px, 700);
      const sp = px * 0.28, widths = gr.map(w => ctx0.measureText(clean(w.w)).width);
      const pad = px * 0.55, room = 2 * Math.min(0.5 - SAFE.x0, FORBIDDEN[1].x0 - 0.5) * frame.w;
      let total = widths.reduce((s, w) => s + w, 0) + sp * (gr.length - 1);
      const k = Math.min(1, (room - 2 * pad) / total);
      const base = y * frame.h, land = easeOutCubic(clamp01((t - gr[0].s + 0.04) / 0.12));
      ctx.save();
      ctx.translate(frame.w / 2, base); ctx.scale(k * (0.94 + 0.06 * land), k * (0.94 + 0.06 * land)); ctx.translate(-frame.w / 2, -base);
      ctx.globalAlpha = land;
      // the pill (theme.css .cap-line of the long video)
      const bw = total + 2 * pad, bh = px * 1.55, bx = frame.w / 2 - bw / 2, by = base - px * 1.08;
      ctx.save(); ctx.shadowColor = "rgba(28,26,46,.32)"; ctx.shadowBlur = px * 0.6; ctx.shadowOffsetY = px * 0.22;
      ctx.fillStyle = "rgba(255,255,255,.96)"; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, px * 0.42); ctx.fill(); ctx.restore();
      let xx = frame.w / 2 - total / 2;
      gr.forEach((w, i) => {
        const on = t >= w.s - 0.02 && t < (gr[i + 1]?.s ?? w.e + 0.3);
        if (on) marker(ctx, xx, base, widths[i], px, easeOutCubic(clamp01((t - w.s + 0.02) / 0.08)));
        setFace(ctx, "title", px, 700);
        ctx.fillStyle = on || t > w.e ? INK : "#8E8A9E";
        ctx.fillText(clean(w.w), xx, base);
        xx += widths[i] + sp;
      });
      ctx.restore();
    },
    cues() { return []; },
  };
}

// ── the yellow page of a new part: the long video's V page, full frame, its light whoosh ─────────────────────
export function chapter({ id, at, until, over = null, title, frame = FRAME }) {
  const kids = [lockup({ id: `${id}-t`, at: at + 0.16, until, y: 0.40, layer: "over", sound: false, color: INK,
    rows: [...(over ? [row(at + 0.16, sans(over, 0.055, { color: "rgba(26,26,26,.6)" }))] : []), row(at + 0.24, sans(title, 0.13))] })];
  const d = desk({ id, from: at, to: until, accent: true, children: kids, frame, sound: false });
  const base = d.cues;
  d.cues = () => [cue("whoosh", at + 0.12, { lu: 21 }), ...base()];
  return d;
}

// a figure that draws nothing and only mutes the captions (a lockup that says the words already)
export const mute = (from, to) => ({ id: "mute", from, to, layer: "over", mutesCaptions: true, draw() {} });
