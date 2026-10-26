// THE PAPER — every word the scrapbook puts on screen besides the captions lives on paper.
//
// The paper is the REFERENCE'S ruled scraps, as measured frame by frame (2026-10-05, v2): the third
// review (v3.1: « je préférerais les petits papiers de mon exemple de référence en eux-mêmes », « j'aime
// pas le dégradé sur le papier », « j'aime bien les ombres derrière ») took back v3's torn pieces with
// their fibre, crease, tape and shading; the fourth (v3.2: the newsprint « c'est pas le bon papier, je
// l'aime pas du tout ») took the newsprint out. ONE paper, flat, no gradient, and only for the TITLES
// and the very important words (« l'effet papier n'est pas utilisé tout le temps »):
//   ruled — a COLLAGE of small scraps of white notebook paper behind the words: one scrap per
//           letter or two (0.45-1.15 of the face size wide), rounded corners cut by hand, each at
//           its own height and a hair crooked, overlapping, a 2 px soft shadow along every edge;
//           faint rules every 0.082 of the face size; barely any grain. A title's paper line, a
//           section's name and second line, a number's tile, a very important phrase, a sticker's
//           tag, the ask, the sweep.
// Beside it, the reference's TWO FACES (title()): white Archivo words and THE important word in
// Fraunces, in colour — no paper.
// What v3 brought and stays (the user: « j'aime beaucoup la motion, les animations, la police »):
//   · the words on paper in a MARKER HAND, as the reference's (book.mjs HANDS, project.json
//     `paperFont`, 2026-10-05: « une police un peu écrite à la main »), the ink multiplied in;
//   · a soft shadow under every figure (book.mjs castShadow), so a white paper reads on a white wall;
//   · it TRAVELS in and LANDS (book.mjs motion « toss », the unfold chosen on the v2 boards inside
//     it), motion-blurred, BREATHES (two poses, 4 a second), and FOLDS back up to leave;
//   · a multi-line phrase lands line by line, two frames apart;
//   · the red marker draws on it: a strike, an underline, a circle, a burst (marker.mjs).
//
// Figures (each returns engine beats):
//   label()     one paper word or phrase: a keyword, a punch phrase over the face
//   title()     a title in two faces: white words, the important word in colour, a line on paper
//   hookTitle() the opening title (title() in the reference's three lines)
//   header()    a section: its number on a ruled tile, its name on scraps swinging in, its second
//               line on scraps under it, the marker underlining the name
//   tag()       a small ruled scrap in condensed capitals: a sticker's label
//   sweep()     a sheet of ruled paper swept across the frame on a change of scene
import {
  createCanvas, setFont, measureText, drawText, specks, grain, polyPath, rng, hash, handFat,
  motion, placeSprite, clamp01, lerp, easeOutCubic, INK, RED, WHITE, PAPER, ACCENT, WORD, paperTone, inkOn,
  cue, FRAME, poseOf, twoPoses,
} from "./book.mjs";
import { mark } from "./marker.mjs";
import { SAFE, FORBIDDEN } from "../../short-editor/scripts/safezones.mjs";

const CACHE = new Map();

// ── the scraps of one row, in px of the face size (measured on « try these! », 94 px tall 't') ──
// The row's ink spans [x0, x1] × [top, bottom] (bottom: the baseline or the descenders).
function scrapsOfRow(R, { x0, x1, top, base, bottom, px }) {
  const out = [];
  // measured on « try these! »: the paper starts 0.36 of the face before the first letter and ends
  // 0.48 after the last; a scrap's top is 0-0.23 above the tallest letter, its foot 0.24-0.34
  // under the baseline (under the descenders when there are some); one scrap in four hangs lower
  const left = x0 - px * (0.30 + 0.12 * R()), right = x1 + px * (0.34 + 0.14 * R());
  let cx = left, i = 0;
  while (cx < right - px * 0.05) {
    // a scrap a letter or two wide; now and then a narrow one (« try these! »: 1.02 1.10 0.49 0.98 0.81 0.96)
    let w = R() < 0.18 ? px * (0.45 + 0.15 * R()) : px * (0.78 + 0.34 * R());
    if (right - (cx + w) < px * 0.42) w = right - cx;            // never a sliver at the end
    const ov = i ? px * (0.05 + 0.10 * R()) : 0;
    const t = top - px * (0.03 + 0.20 * R());
    const foot = Math.max(bottom + px * 0.07, base + px * 0.28) + px * 0.08 * R() + (R() < 0.25 ? px * (0.12 + 0.14 * R()) : 0);
    out.push({ x: cx - ov, y: t, w: w + ov, h: foot - t, rot: (R() - 0.5) * 0.021, r: px * (0.022 + 0.022 * R()),
      tone: 0.992 + 0.012 * R(), ph: R(), seed: (R() * 1e9) | 0 });
    cx += w; i++;
  }
  return out;
}
// a rounded rectangle whose edges are a little rough: cut by hand, not by a plotter
function scrapOutline(w, h, r, R, jag) {
  const pts = [], step = Math.max(2.5, jag * 7);
  const edge = (xa, ya, xb, yb, nx, ny) => {
    const n = Math.max(2, Math.round(Math.hypot(xb - xa, yb - ya) / step));
    for (let i = 0; i < n; i++) { const u = i / n, d = (R() - 0.5) * jag; pts.push([xa + (xb - xa) * u + nx * d, ya + (yb - ya) * u + ny * d]); }
  };
  const arc = (cx, cy, a0) => { for (let i = 0; i <= 3; i++) { const a = a0 + (Math.PI / 2) * (i / 3); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(r, r, Math.PI); edge(r, 0, w - r, 0, 0, -1);
  arc(w - r, r, -Math.PI / 2); edge(w, r, w, h - r, 1, 0);
  arc(w - r, h - r, 0); edge(w - r, h, r, h, 0, 1);
  arc(r, h - r, Math.PI / 2); edge(0, h - r, 0, r, -1, 0);
  return pts;
}
// the colour of a scrap: the reference's white (251,249,249: 246,243,245 seen through its ink) or
// a paper of the plan's (`tone`: "accent", a hex), a hair lighter or darker scrap to scrap
function scrapColour(tone, k) {
  if (!tone || tone === "white") { const v = Math.round(251 * k); return `rgb(${Math.min(255, v)},${Math.min(255, v - 2)},${Math.min(255, v - 2)})`; }
  const m = paperTone(tone).replace("#", "");
  const c = [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(m.slice(i, i + 2), 16) * k))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
// one scrap of notebook paper, drawn in place: its shadow on what lies under it, the paper (FLAT:
// no shading across it), the rules, a hairline at its edge
function drawScrap(x, s, px, W, tone = "white") {
  const R = rng(s.seed);
  x.save();
  x.translate(s.x + s.w / 2, s.y + s.h / 2); x.rotate(s.rot); x.translate(-s.w / 2, -s.h / 2);
  const pts = scrapOutline(s.w, s.h, s.r, R, Math.max(0.6, W * 0.0009));
  // the shadow: a soft dark line along every edge (2 px at 720, a hair lower than the paper)
  x.save();
  x.shadowColor = "rgba(0,0,0,.42)"; x.shadowBlur = W * 0.0062; x.shadowOffsetY = W * 0.0011;
  polyPath(x, pts);
  x.fillStyle = scrapColour(tone, s.tone); x.fill();
  x.restore();
  x.save(); polyPath(x, pts); x.clip();
  // the fibre of the sheet, barely there
  x.globalCompositeOperation = "multiply"; x.globalAlpha = 0.035;
  x.fillStyle = x.createPattern(grain(), "repeat"); x.fillRect(0, 0, s.w, s.h);
  x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
  // the rules: 0.082 of the face size apart, 5 % under the paper, soft
  const sp = px * 0.082, lw = Math.max(1, W * 0.0021);
  x.strokeStyle = PAPER.rule; x.lineWidth = lw;
  for (let gy = sp * (0.4 + 0.6 * s.ph); gy < s.h - lw; gy += sp) { x.beginPath(); x.moveTo(0, gy); x.lineTo(s.w, gy); x.stroke(); }
  polyPath(x, pts); x.strokeStyle = "rgba(0,0,0,.07)"; x.lineWidth = Math.max(1, W * 0.0016); x.stroke();
  x.restore();
  x.restore();
}
// ── one label, rendered once (two poses) ──────────────────────────────────────────────────────
// lines: strings, one row each. size: the face, as a fraction of the frame width.
// paper: ruled (the collage of scraps, default; "strip", "hand" and v2's "torn" say the same: the
// newsprint was taken out, « c'est pas le bon papier ») · tile (one scrap round a number, as tall as
// `minH`) · tag (one scrap round condensed capitals)
// tone: the scraps' paper, "white" (the reference) or "accent" / a hex (a plan's choice)
export function renderLabel({ lines, paper = "ruled", face = null, size = 0.093, W = 1080, color = null, tone = null,
  seed = 1, lead = 0.96, align = "center", padX = null, minH = 0, distress = 0.3 }) {
  if (paper === "strip" || paper === "hand" || paper === "torn") paper = "ruled";
  // every word on paper is written in the marker hand (book.mjs HANDS: project.json `paperFont`)
  face = face ?? "hand";
  tone = tone ?? "white";
  const ink = color ?? inkOn(tone === "white" ? PAPER.white : tone);
  const key = JSON.stringify([lines, paper, face, size, W, ink, tone, seed, lead, align, padX, minH, distress]);
  if (CACHE.has(key)) return CACHE.get(key);
  const px = size * W, R = rng(seed * 7919 + 13);
  const m = createCanvas(8, 8).getContext("2d");
  const rows = lines.map(s => {
    const w = measureText(m, s, face, px);
    setFont(m, face, px);
    const mt = m.measureText(face === "cond" ? s.toUpperCase() : s.replace(/\p{Extended_Pictographic}/gu, ""));
    return { s, w, asc: mt.actualBoundingBoxAscent || px * 0.7, desc: mt.actualBoundingBoxDescent || px * 0.2 };
  });
  const bw = Math.max(...rows.map(r => r.w)), margin = px * 0.6;
  const step = px * lead;
  const cw = Math.ceil(bw + px * 1.1 + 2 * margin);
  const ch = Math.ceil(Math.max(px * 1.25, minH) + step * (rows.length - 1) + 2 * margin);
  // the rows' baselines: the first so its tallest letter sits a little under the top margin
  const out = { w: cw, h: ch, px, rows: [], paper, tone, ink, face };
  const scraps = [];
  rows.forEach((r, i) => {
    const base = margin + px * 0.2 + Math.max(...rows.map(q => q.asc)) + i * step + Math.max(0, minH - px * 1.25) / 2;
    const x0 = align === "left" ? margin + px * 0.55 : (cw - r.w) / 2;
    out.rows.push({ x0, x1: x0 + r.w, top: base - r.asc, bottom: base + r.desc, base, text: r.s });
    if (paper === "ruled") scraps.push(...scrapsOfRow(R, { x0, x1: x0 + r.w, top: base - Math.max(r.asc, px * 0.62), base, bottom: base + r.desc, px }));
    else if (paper === "tile" || paper === "tag") {
      // one scrap, as tall as the block it stands beside (« 2 » spans « Competitor / ads-extractor »)
      const h = Math.max(Math.max(r.asc, px * 0.7) + px * 0.52, minH), cy = base - Math.max(r.asc, px * 0.7) / 2;
      const pad = px * (padX ?? (paper === "tag" ? 0.34 : 0.42));
      scraps.push({ x: x0 - pad, y: cy - h / 2, w: r.w + 2 * pad, h, rot: (R() - 0.5) * 0.04, r: px * 0.04, tone: 1, ph: R(), seed: (R() * 1e9) | 0 });
    }
  });
  // the paper, in an order that crosses the scraps over each other (left, right, middle…)
  const order = scraps.map(s => [s, R()]).sort((a, b) => a[1] - b[1]).map(([s]) => s);
  const sheet = createCanvas(cw, ch), xp = sheet.getContext("2d");
  for (const s of order) drawScrap(xp, s, px, W, tone);
  // the ink on its own layer, so the print's wear touches the letters only
  const inkL = createCanvas(cw, ch), xi = inkL.getContext("2d");
  // a thin hand is thickened to the reference's marker (`fat`)
  const fat = face === "hand" ? handFat() * px : 0;
  out.rows.forEach(r => drawText(xi, r.text, r.x0, r.base, face, px, { fill: ink, stroke: fat, strokeColor: ink }));
  if (distress > 0) {
    xi.save();
    xi.globalCompositeOperation = "destination-out"; xi.globalAlpha = distress;
    const off = (seed * 37) % 512;
    xi.translate(-off, -off * 0.6);
    xi.fillStyle = xi.createPattern(specks(), "repeat"); xi.fillRect(off, off * 0.6, cw, ch);
    xi.restore();
  }
  const full = createCanvas(cw, ch), xf = full.getContext("2d");
  xf.drawImage(sheet, 0, 0);
  // the ink sits IN the paper: multiplied, so the grain shows through the black a little
  xf.globalCompositeOperation = "multiply"; xf.drawImage(inkL, 0, 0); xf.globalCompositeOperation = "source-over";
  xf.globalAlpha = 0.85; xf.drawImage(inkL, 0, 0); xf.globalAlpha = 1;
  out.canvas = full;
  out.poses = twoPoses(full, seed, W);
  out.wordBox = (row, word) => {
    const r = out.rows[row]; if (!r) return null;
    const i = r.text.indexOf(word); if (i < 0) return null;
    const a = measureText(m, r.text.slice(0, i), face, px), b = measureText(m, word, face, px);
    const asc = Math.min(r.base - r.top, px * 0.72);             // the row's capitals (r.top: its tallest letter)
    return { x0: r.x0 + a, x1: r.x0 + a + b, y: r.base - asc * 0.42, top: r.base - asc, base: r.base };
  };
  CACHE.set(key, out);
  return out;
}

// a point of a sprite (sx, sy in its px) on the frame, for a sprite centred on (cx, cy) turned by rot
const onFrame = (L, cx, cy, rot, sx, sy) => {
  const dx = sx - L.w / 2, dy = sy - L.h / 2, c = Math.cos(rot), s = Math.sin(rot);
  return [cx + dx * c - dy * s, cy + dx * s + dy * c];
};

// ── a paper label on screen ─────────────────────────────────────────────────────────────────
// x, y: its centre (fractions of the frame); rot in degrees. A multi-line phrase lands line by
// line (`stagger` s apart), each line its own row of scraps, the rows overlapping a little, a hair
// offset and crooked the other way; tones: one per line ("white", the reference's; "accent" or a hex
// when a plan asks for it). (`tape` was v3.0's and is ignored: the reference has none.)
// A punch phrase over the face mutes the captions (it IS the caption); a keyword above the head
// does not. The marker: strike { word, row, at, dur }, underline { row, word?, at, dur },
// circle { row, word, at, dur }, burst { row, at, side } — each drawn on as it is said.
export function label({ id, text, lines = null, at, until, x = 0.5, y = 0.155, size = 0.093, paper = "ruled", tone = "white", tones = null,
  face = null, rot = -1.5, enter = null, exit = "fold", dir = null, stagger = 0.067, lead = 1.0, offsets = null,
  frame = FRAME, sound = "paper", mutesCaptions = false, layer = "over", strike = null, underline = null, circle = null, burst = null,
  color = null, seed = null, tape = false }) {
  const W = frame.w, H = frame.h, fps = frame.fps ?? 30;
  const rows = lines ?? [text], n = rows.length, base = seed ?? hash(id ?? rows.join("|"));
  const ent = enter ?? (globalThis.SB_ENTER === "unfold" || globalThis.SB_ENTER === "cut" ? globalThis.SB_ENTER : "toss");
  const d0 = dir ?? (base % 2 ? 1 : -1);
  const px = size * W;
  const parts = rows.map((s, i) => {
    const L = renderLabel({ lines: [s], paper, face, size, W, color, tone: tones?.[i] ?? tone, seed: base + i * 101 });
    const cx = x * W + (offsets?.[i] ?? (n > 1 ? (i % 2 ? 1 : -1) * 0.016 : 0)) * W;
    const cy = y * H + (i - (n - 1) / 2) * px * lead * 1.06;
    const r = (rot * (i % 2 ? -0.7 : 1)) * Math.PI / 180;
    const pAt = at + i * stagger, pUntil = until - (n - 1 - i) * 0.033;
    const pDir = d0 * (i % 2 ? -1 : 1);
    const mAt = t => motion(t, { at: pAt, until: pUntil, enter: ent, exit, W, dir: pDir });
    return { L, cx, cy, r, pAt, pUntil, mAt };
  });
  const beats = [{
    id: id ?? `label-${rows.join("-")}-${at}`, from: at, to: until, layer, mutesCaptions,
    draw(ctx, t) {
      for (const p of parts) {
        if (t < p.pAt || t >= p.pUntil) continue;
        placeSprite(ctx, t, { img: p.L.poses[poseOf(t, p.pAt)], w: p.L.w, h: p.L.h, cx: p.cx, cy: p.cy, rot: p.r, mAt: p.mAt, W, H, fps });
      }
    },
    cues: () => (sound ? [cue(sound, at + 0.08)] : []),
  }];
  // the marker on a word of a line: it moves (and goes) with its line
  const follow = p => t => { const m = p.mAt(t); return { dx: m.dx, dy: m.dy, a: m.on ? m.a : 0 }; };
  const box = (spec) => {
    const p = parts[spec.row ?? 0], b = spec.word ? p.L.wordBox(0, spec.word) : { x0: p.L.rows[0].x0, x1: p.L.rows[0].x1, y: p.L.rows[0].base - p.L.px * 0.30, top: p.L.rows[0].top, base: p.L.rows[0].base };
    return { p, b };
  };
  const mk = (kind, spec, geo) => mark({ id: `${id ?? rows[0]}-${kind}`, kind, at: spec.at, until: Math.min(until, parts[spec.row ?? 0].pUntil - 0.10),
    dur: spec.dur ?? 0.22, frame, seed: base + 7, follow: follow(parts[spec.row ?? 0]), sound: spec.sound === undefined ? "mark" : spec.sound,
    width: spec.width ?? 0.0105, ...geo });
  if (strike) {
    const { p, b } = box(strike);
    const [ax, ay] = onFrame(p.L, p.cx, p.cy, p.r, b.x0 - p.L.px * 0.06, b.y + p.L.px * 0.04);
    const [bx, by] = onFrame(p.L, p.cx, p.cy, p.r, b.x1 + p.L.px * 0.06, b.y - p.L.px * 0.03);
    beats.push(...mk("strike", strike, { x0: ax / W, y0: ay / H, x1: bx / W, y1: by / H, width: strike.width ?? 0.013 }));
  }
  if (underline) {
    const { p, b } = box(underline);
    const uy = Math.max(b.base + p.L.px * 0.16, (p.L.rows[0].bottom ?? b.base) + p.L.px * 0.10);
    const [ax, ay] = onFrame(p.L, p.cx, p.cy, p.r, b.x0, uy + p.L.px * 0.03);
    const [bx, by] = onFrame(p.L, p.cx, p.cy, p.r, b.x1, uy);
    beats.push(...mk("underline", underline, { x0: ax / W, y0: ay / H, x1: bx / W, y1: by / H }));
  }
  if (circle) {
    const { p, b } = box(circle);
    const [cx, cy] = onFrame(p.L, p.cx, p.cy, p.r, (b.x0 + b.x1) / 2, (b.top + b.base) / 2);
    beats.push(...mk("circle", circle, { cx: cx / W, cy: cy / H, rx: ((b.x1 - b.x0) / 2 + p.L.px * 0.35) / W, ry: (p.L.px * 0.62) / W }));
  }
  if (burst) {
    const { p, b } = box(burst), right = (burst.side ?? "right") === "right";
    const [cx, cy] = onFrame(p.L, p.cx, p.cy, p.r, right ? b.x1 + p.L.px * 0.62 : b.x0 - p.L.px * 0.62, b.top + p.L.px * 0.05);
    beats.push(...mk("burst", { ...burst, sound: burst.sound ?? null }, { cx: cx / W, cy: cy / H, r: (p.L.px * 0.55) / W, dir: right ? 1 : -1 }));
  }
  return beats;
}

// ── a small tag: a word in the marker hand on one ruled scrap, for a sticker's label ───────────
export function tag({ id, text, at, until, x, y, size = 0.05, tone = "white", rot = -3, enter = "toss", exit = "fold", frame = FRAME,
  sound = null, layer = "over", dir = 1 }) {
  return label({ id: id ?? `tag-${text}-${at}`, text, at, until, x, y, size, paper: "tag", tone, face: "hand", rot, enter, exit, frame, sound, layer, dir });
}

// ── a TITLE IN TWO FACES ───────────────────────────────────────────────────────────────────
// The reference's hook, and its art direction (2026-10-05: « une combinaison de deux polices: un
// mot important en couleur, une très belle police »; « l'effet papier, on le met que pour les titres
// et les mots très importants »): rows of RUNS, each run one of
//   sans   white Archivo ExtraBold over the picture, held off it by its shadows (« into your »)
//   serif  THE important word: Fraunces Black (soft), in colour (book.mjs WORD), bigger (« Claude »)
//   paper  words on the reference's ruled scraps (« creative studio »)
// The runs of a row share a baseline and are centred as one line; `y`: each row's centre (fractions
// of the height; the reference's hook: 0.148, 0.207, 0.278). Everything lands with v3's motion —
// the white words rise in, the coloured word is slapped on, the paper tosses in and unfolds — one run
// after the other (`stagger`); the white and coloured words leave as the reference's do (squashed,
// then up and out in a blur), the paper folds away. `pulseAt`: the coloured word beats when said
// (1 → 1.045 → 1 in 0.2 s).
// Sound: a paper on the first paper run, a pop on the coloured word.
function textSprite(text, kind, px, color, W) {
  const m = createCanvas(8, 8).getContext("2d");
  setFont(m, kind, px);
  const mt = m.measureText(text);
  const asc = mt.actualBoundingBoxAscent || px * 0.75, desc = mt.actualBoundingBoxDescent || px * 0.22;
  const pad = Math.ceil(px * 0.35), w = Math.ceil(measureText(m, text, kind, px) + 2 * pad), h = Math.ceil(asc + desc + 2 * pad);
  const c = createCanvas(w, h), x = c.getContext("2d");
  // its tight shadow, baked: the white words read on a white wall, the colour on anything
  x.shadowColor = "rgba(0,0,0,.42)"; x.shadowBlur = W * 0.008; x.shadowOffsetY = W * 0.003;
  drawText(x, text, pad, pad + asc, kind, px, { fill: color });
  c.base = pad + asc; c.inkW = w - 2 * pad;
  return c;
}
export function title({ id = "title", rows, at, until, frame = FRAME, x = 0.5, y = null, gap = 0.024, stagger = 0.07,
  pulseAt = null, sound = true, layer = "over", mutesCaptions = false }) {
  const W = frame.w, H = frame.h, fps = frame.fps ?? 30, beats = [];
  // its first row below the feed's tabs (safezones.mjs, 2026-10-05: the safe area starts at y 0.128)
  let ys = y ?? rows.map((_, i) => [0.158, 0.217, 0.288][i] ?? 0.288 + (i - 2) * 0.07);
  if (ys[0] < 0.158) ys = ys.map(v => v + (0.158 - ys[0]));
  let k = 0, firstPaper = true;
  rows.forEach((row, ri) => {
    // the runs of the row, measured, then laid out centred
    const build = (sc = 1) => row.runs.map(r => {
      const size = (r.size ?? (r.kind === "serif" ? 0.1355 : r.kind === "paper" ? 0.089 : 0.066)) * sc, px = size * W;
      if (r.kind === "paper") {
        const L = renderLabel({ lines: [r.text], paper: "ruled", size, W, tone: r.tone ?? "white", seed: hash(`${id}-${ri}-${r.text}`) });
        const ink = L.rows[0].x1 - L.rows[0].x0;
        return { ...r, px, L, w: ink + px * 0.8, ink };
      }
      const c = textSprite(r.text, r.kind === "serif" ? "serif" : "caption", px, r.color ?? (r.kind === "serif" ? WORD : WHITE), W);
      return { ...r, px, c, w: c.inkW };
    });
    let runs = build();
    const width = rs => rs.reduce((a, r) => a + r.w, 0) + gap * W * (rs.length - 1);
    // no wider than the feed's safe area leaves it at its height (safezones.mjs, 2026-10-05: a row
    // 0.86 of the width once ran off both edges), centred where it was asked
    {
      const R = ys[ri] + 0.03 > FORBIDDEN[1].y0 ? FORBIDDEN[1].x0 : SAFE.x1;
      const room = 2 * Math.min(R - x, x - SAFE.x0) * W, w0 = width(runs);
      if (w0 > room) runs = build(room / w0 * 0.98);
    }
    const total = width(runs);
    const big = Math.max(...runs.map(r => r.px));
    // one baseline for the row: the biggest run's capitals centred on the row's y
    const base = ys[ri] * H + big * 0.36;
    let cx = x * W - total / 2;
    runs.forEach((r, i) => {
      const mid = cx + r.w / 2; cx += r.w + gap * W;
      const rAt = at + (k++) * stagger, rUntil = until - (rows.length - 1 - ri) * 0.03;
      const dir = (ri + i) % 2 ? 1 : -1;
      const enter = r.kind === "paper" ? "toss" : r.kind === "serif" ? "slap" : "rise";
      const exit = r.kind === "paper" ? "fold" : "squash";
      const mAt = t => motion(t, { at: rAt, until: rUntil, enter, exit, W, dir, amp: 0.45 });
      const isWord = r.kind === "serif";
      let img, w, h, cy;
      if (r.kind === "paper") { w = r.L.w; h = r.L.h; cy = base - (r.L.rows[0].base - r.L.h / 2); }
      else { img = r.c; w = r.c.width; h = r.c.height; cy = base - (r.c.base - h / 2); }
      const rot = (r.rot ?? (r.kind === "paper" ? -0.8 : 0)) * Math.PI / 180;
      beats.push({
        id: `${id}-${ri}-${i}`, from: rAt, to: rUntil, layer, mutesCaptions: mutesCaptions && k === 1,
        draw(ctx, t) {
          const pk = isWord && pulseAt != null ? clamp01((t - pulseAt) / 0.2) : 1;
          const pulse = pk > 0 && pk < 1 ? 1 + 0.045 * Math.sin(pk * Math.PI) : 1;
          const pic = r.kind === "paper" ? r.L.poses[poseOf(t, rAt)] : img;
          placeSprite(ctx, t, { img: pic, w: w * pulse, h: h * pulse, cx: mid, cy, rot, mAt, W, H, fps, shadow: r.kind === "paper" ? 1 : 0.85 });
        },
        cues: () => (!sound ? [] : r.kind === "paper" && firstPaperOf(r) ? [cue("paper", rAt + 0.08)] : isWord ? [cue("pop", rAt + 0.02)] : []),
      });
    });
  });
  // one paper sound for the title's paper (the first run on paper)
  function firstPaperOf(r) { if (firstPaper && r.kind === "paper") { firstPaper = false; return true; } return false; }
  return beats;
}

// ── the opening title ────────────────────────────────────────────────────────────────────────
// The reference's hook in its three lines (measured: centres at 0.148 / 0.207 / 0.278 of the
// height): a line in white, THE PROMISE's important word in colour in Fraunces with white words
// beside it, a line on paper (« how to turn / Claude into your / creative studio »), landing one run
// after the other from the first frame, leaving on the hook's last word. rows: title() rows, or
// v2's { typed, accent: [{ text, face, size, color }], paperLine }.
export function hookTitle({ id = "hook-title", at = 0, until, frame = FRAME, x = 0.5, rows = null, y = null,
  typed = null, accent = null, paperLine = null, stagger = 0.07, pulseAt = null, sound = true, layer = "over", mutesCaptions = false }) {
  if (!rows) {
    rows = [];
    if (typed) rows.push({ runs: [{ text: typed.text, kind: "sans", size: typed.size ?? 0.075 }] });
    if (accent?.length) rows.push({ runs: accent.map(p => ({ text: p.text, kind: p.face === "serif" ? "serif" : "sans", size: p.size, color: p.color })) });
    if (paperLine) rows.push({ runs: [{ text: paperLine.text, kind: "paper", size: paperLine.size ?? 0.089 }] });
  } else if (rows.some(r => !r.runs)) {
    // v3's rows ({ text, promise }): the promise in colour, the others on paper
    rows = rows.map(r => r.runs ? r : { runs: [{ text: r.text, kind: r.promise ? "serif" : "paper", size: r.size }] });
  }
  return title({ id, rows, at, until, frame, x, y, stagger, pulseAt, sound, layer, mutesCaptions });
}

// ── a section header ───────────────────────────────────────────────────────────────────────
// The same paper as everything else (2026-10-05: the torn newsprint « c'est pas le bon papier, je
// l'aime pas du tout »): the NAME on the ruled scraps, its second line on smaller scraps under it, a
// number on a ruled tile at its left, as tall as the block. v3's motion: the name SWINGS IN from
// the side (motion-blurred, a little past its place and back), the second line lands on its word,
// the tile is slapped on first, the red marker underlines the name (a sticker on its corner is the
// plan's: header() returns the block's box; v2's pixel mascot is gone, `mascot` is ignored). The
// captions are off while its words are said. It leaves the way it came (the name swings on, the
// rest folds). Sound: a swoosh with the big page under it as the name arrives, the slice of the
// second line, the scribble of the underline, a pop for the tile.
export function header({ id, n = null, name, sub = null, at, nameAt = at, subAt = null, until, saidUntil = null, frame = FRAME,
  x = 0.5, y = 0.168, nameSize = 0.098, subSize = 0.058, numberSize = 0.12, inline = false, underline = true,
  dir = 1, sound = true, layer = "over" }) {
  const W = frame.w, H = frame.h, fps = frame.fps ?? 30, beats = [];
  const seed = hash(id ?? `${n}-${name}`);
  const nameL = renderLabel({ lines: [inline && n != null ? `${n}. ${name}` : name], paper: "ruled", size: nameSize, W, seed: seed + 1 });
  const subL = sub ? renderLabel({ lines: [sub], paper: "ruled", size: subSize, W, seed: seed + 2 }) : null;
  const tile = !inline && n != null ? renderLabel({ lines: [String(n)], paper: "tile", size: numberSize, W, seed: seed + 3,
    minH: nameL.px * 1.05 + (sub ? subSize * W * 1.25 : 0) }) : null;
  // the block: [tile] [name / second line], centred on x
  const nameW = nameL.rows[0].x1 - nameL.rows[0].x0 + nameL.px * 0.8;
  const tileW = tile ? tile.rows[0].x1 - tile.rows[0].x0 + tile.px * 0.9 : 0;
  const gap = tile ? -W * 0.012 : 0;
  const total = tileW + gap + nameW;
  const left = x * W - total / 2;
  const nameCx = left + tileW + gap + nameW / 2, nameCy = y * H;
  // the second line a little under the name: room for the marker's underline between them
  const subCx = nameCx + nameW * 0.12, subCy = nameCy + nameL.px * 0.86 + (subL ? subL.px * 0.55 : 0);
  const tileCx = left + tileW / 2, tileCy = subL ? (nameCy - nameL.px * 0.52 + subCy + subL.px * 0.62) / 2 : nameCy;
  const nameRot = -0.012 * dir, sAt = subAt ?? nameAt + 0.32;
  beats.push({ id: `${id}-mute`, from: at, to: Math.min(until, saidUntil ?? until), layer, mutesCaptions: true, draw() {} });
  const nameM = t => motion(t, { at: nameAt, until, enter: "swing", exit: "swingout", W, dir });
  const ulAt = nameAt + 0.30, ulDur = 0.24;
  const r0 = nameL.rows[0];
  if (tile) beats.push({
    id: `${id}-n`, from: at, to: until - 0.04, layer,
    draw(ctx, t) { placeSprite(ctx, t, { img: tile.poses[poseOf(t, at)], w: tile.w, h: tile.h, cx: tileCx, cy: tileCy, rot: -0.04, W, H, fps,
      mAt: tt => motion(tt, { at, until: until - 0.04, enter: "slap", exit: "fold", W, dir: -dir }) }); },
    cues: () => (sound ? [cue("pop", at + 0.02)] : []),
  });
  beats.push({
    id: `${id}-name`, from: nameAt, to: until, layer,
    draw(ctx, t) { placeSprite(ctx, t, { img: nameL.poses[poseOf(t, nameAt)], w: nameL.w, h: nameL.h, cx: nameCx, cy: nameCy, rot: nameRot, mAt: nameM, W, H, fps }); },
    cues: () => (sound ? [cue("swoosh", nameAt + 0.10), cue("section", nameAt + 0.14)] : []),
  });
  if (underline) {
    // under the descenders (« Pipecorn »: the p's tail is never crossed)
    const uy = Math.max(r0.base + nameL.px * 0.16, r0.bottom + nameL.px * 0.10);
    const [ax, ay] = onFrame(nameL, nameCx, nameCy, nameRot, r0.x0 - nameL.px * 0.05, uy + nameL.px * 0.03);
    const [bx, by] = onFrame(nameL, nameCx, nameCy, nameRot, r0.x1 + nameL.px * 0.05, uy);
    beats.push(...mark({ id: `${id}-ul`, kind: "underline", at: ulAt, until: until - 0.2, dur: ulDur, frame, seed: seed + 9,
      x0: ax / W, y0: ay / H, x1: bx / W, y1: by / H, width: 0.012, sound: sound ? "mark" : null,
      follow: t => { const m = nameM(t); return { dx: m.dx, dy: m.dy, a: m.on ? m.a : 0 }; } }));
  }
  if (subL) beats.push({
    id: `${id}-sub`, from: sAt, to: until - 0.03, layer,
    draw(ctx, t) { placeSprite(ctx, t, { img: subL.poses[poseOf(t, sAt)], w: subL.w, h: subL.h, cx: subCx, cy: subCy, rot: 0.035 * dir, W, H, fps,
      mAt: tt => motion(tt, { at: sAt, until: until - 0.03, enter: "toss", exit: "fold", W, dir: -dir }) }); },
    cues: () => (sound ? [cue("name", sAt + 0.06)] : []),
  });
  return { beats, box: { left: left / W, right: (left + total) / W, top: (nameCy - nameL.px * 0.75) / H, bottom: (subCy + (subL ? subL.px : 0)) / H, nameCx: nameCx / W } };
}

// ── a paper sweep: the change of scene ───────────────────────────────────────────────────────
// A big sheet of the same ruled notebook paper swept across the whole frame (from the right to the
// left, a little crooked), covering it entirely on the frame of the cut, gone 0.2 s later: the
// edit's one transition, for a change of SCENE (the teaser of the next episode), never for a jump
// cut. Sound: the swoosh, the big page under it.
export function sweep({ id = "sweep", at, dur = 0.44, frame = FRAME, dir = 1, sound = true, layer = "over" }) {
  const W = frame.w, H = frame.h, fps = frame.fps ?? 30;
  const sw = W * 1.35, sh = H * 1.25, R = rng(hash(id));
  // the sheet, once: one big scrap, cut by hand, flat, ruled (its rules a notebook's: 0.034 W apart)
  const c = createCanvas(Math.ceil(sw), Math.ceil(sh)), x = c.getContext("2d");
  drawScrap(x, { x: W * 0.04, y: H * 0.02, w: sw - W * 0.08, h: sh - H * 0.04, rot: 0, r: W * 0.02, tone: 1, ph: R(), seed: (R() * 1e9) | 0 }, W * 0.42, W);
  const t0 = at - dur / 2, t1 = at + dur / 2;
  // its centre, from beyond the right edge to beyond the left one; on the frame of the cut it covers
  const posAt = t => { const u = clamp01((t - t0) / dur), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; return lerp(W * 1.5, -W * 0.5, e) * dir + (dir < 0 ? W : 0); };
  const mAt = t => ({ on: t >= t0 && t < t1, a: 1, sx: 1, sy: 1, rot: 0, dx: posAt(t) - W / 2, dy: 0, blur: 0, smear: 0, lift: 0.3, fold: 0, moving: true });
  return [{
    id, from: t0, to: t1, layer, mutesCaptions: true,          // nothing is written on a page going past
    draw(ctx, t) { placeSprite(ctx, t, { img: c, w: sw, h: sh, cx: W / 2, cy: H / 2, rot: -0.06 * dir, mAt, W, H, fps, shadow: 1.2 }); },
    cues: () => (sound ? [cue("swoosh", at), cue("section", at - 0.02)] : []),
  }];
}
