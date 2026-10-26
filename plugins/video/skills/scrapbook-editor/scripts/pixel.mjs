// THE PIXEL CREW — a little 8-bit critter doing a job, as on the reference: a blocky creature (two
// square eyes, two arm stubs, four legs) at a desk, behind a typewriter, with a magnifier, a pile
// of books, an easel, a microphone. Six fps, crisp pixels, no outline, no shadow.
//
//   crew()    several critters popping in one by one AROUND the speaker's head, each with its job
//             written under it in the soft serif (the hook: "an entire creative studio")
//   mascot()  one critter above a section header, doing that section's job
//
// The critter is ours (it is not a brand's mascot); its colour is project.json `mascotColor`
// (the reference's coral by default). A job is a SCENE below; one unit = one art pixel.
import { createCanvas, setFont, measureText, drawText, motion, clamp01, PJ, WHITE, FRAME, cue } from "./book.mjs";

const PAL = {
  o: PJ.mascotColor || "#D9805A", d: "#B8643F", k: "#1B1515",
  b: "#8C5A3A", B: "#6A4128", w: "#F7F4EC", W: "#FFFFFF",
  g: "#8F8F98", G: "#55555F", l: "#C9C9D2", s: "#1E2942", S: "#2F3546",
  c: "#3BD67C", y: "#F4C84A", r: "#E5484D", u: "#3D6FE2", p: "#8C5BD8", n: "#3FAE5A", m: "#E24FB2", a: "#7FB2F5",
};

// ── the sprites (rows of characters; "." is empty) ──────────────────────────────────────────
// measured on the reference: a body 8 art pixels wide and 6 tall, 2x2 eyes one pixel apart, an
// arm stub each side at eye level, four legs 3 pixels long
const CRITTER = [
  "..oooooooo..",
  "..oooooooo..",
  "..okkookko..",
  "oookkookkooo",
  "..oooooooo..",
  "..oooooooo..",
  "..o.o..o.o..",
  "..o.o..o.o..",
  "..o.o..o.o..",
];
const CRITTER_BLINK = [CRITTER[0], CRITTER[1], "..oooooooo..", "oookkookkooo", ...CRITTER.slice(4)];
const CRITTER_STEP = [...CRITTER.slice(0, 7), "..o.o..o.o..", ".o..o..o..o."];
const HAT = ["...kkkkkk...", "..kkkkkkkk.."];
const DESK = (w) => ["b".repeat(w), "." + "B" + ".".repeat(w - 4) + "B" + ".", "." + "B" + ".".repeat(w - 4) + "B" + ".", "." + "B" + ".".repeat(w - 4) + "B" + "."];
const SHELF = (w) => ["b".repeat(w)];
const MONITOR = ["SSSSSSS", "SsssssS", "SsssssS", "SsssssS", "SsssssS", "SSSSSSS", "...S...", "..SSS.."];
const TYPEWRITER = ["wwwwwwwwww", "wkk.kkk.kw", "wwwwwwwwww"];
const BOOK = ["uu", "uu", "uu"];
const BOOKS = [".yyyy.", "pppppp", "nnnnn.", "uuuuuu", ".dddd.", "nnnnnn", "rrrrr."];
const MAG = [".ggg.", "gaaag", "gaWag", "gaaag", ".ggg."];
const EASEL = ["bbbbbbbb", "bwwwwwwb", "bwwwwwwb", "bwwwwwwb", "bwwwwwwb", "bwwwwwwb", "bbbbbbbb", ".b..b..b", ".b..b..b", ".b..b..b"];
const PALETTE = ["runy", "bbbb"];
const MIC = [".l.", "lgl", "lgl", ".g.", ".g.", "ggg"];
const NOTE = [".mm", ".m.", "mm."];
const NOTE_B = [".uu", ".u.", "uu."];
const LAPTOP = [".SSSSSSS.", ".SsssssS.", ".SsssssS.", ".SSSSSSS.", "lllllllll"];
const PHONE = ["GGGGG", "GsssG", "GsssG", "GsssG", "GsssG", "GsssG", "GGGGG"];
const SPARK = ["..y..", "..y..", "yyyyy", "..y..", "..y.."];
const SPARK_S = [".y.", "yyy", ".y."];
const COINS = ["yyyy", "dyyd", "yyyy", "dyyd", "yyyy"];

// a sprite placed in a scene: [grid, x, y] in units; `over` recolours single cells [x, y, colour]
const put = (g, x, y) => ({ g, x, y });
const cells = (list) => ({ cells: list });

// ── the jobs ───────────────────────────────────────────────────────────────────────────────
// f = the frame number at 6 fps since the critter appeared
const critterAt = (f, x, y, { hat = false, blinkEvery = 12 } = {}) => {
  const blink = f % blinkEvery === blinkEvery - 1;
  const out = [put(blink ? CRITTER_BLINK : (f % 6 < 3 ? CRITTER : CRITTER_STEP), x, y)];
  if (hat) out.push(put(HAT, x, y - 2));
  return out;
};
export const SCENES = {
  // a screen with code typing itself (video editor, developer, automation)
  computer: f => {
    // lines of code typing themselves, a dash at a time, then the screen clears
    const LINES = [3, 2, 4, 1], code = [];
    let left = f % 14;
    LINES.forEach((len, row) => { for (let k = 0; k < len && left > 0; k++, left--) code.push([14 + k + (row % 2), 1 + row, "c"]); });
    return [...critterAt(f, 1, 0), put(MONITOR, 13, 1), cells(code.map(([x, y, c]) => [x, y + 1, c])), put(DESK(21), 0, 9)];
  },
  // a typewriter on a shelf, keys going (copywriter, writer)
  typewriter: f => [put(BOOK, 0, 6), put(TYPEWRITER, 3, 6), cells(f % 2 ? [[4, 7, "w"], [9, 7, "w"]] : [[6, 7, "w"]]), ...critterAt(f, 13, 0), put(SHELF(25), 0, 9)],
  // a magnifier held up, glinting (spy, research, audit)
  magnifier: f => [...critterAt(f, 0, 0), put(MAG, 12, 0), cells([[11, 4, "g"], [12, 5, "g"]]), cells(f % 4 === 0 ? [[14, 1, "W"], [13, 2, "W"]] : [])],
  // a pile of books on a shelf (researcher, learning)
  books: f => [put(BOOKS, 1, 2), ...critterAt(f, 8, 0), put(SHELF(21), 0, 9)],
  // an easel, a brush, a palette; the blue stroke grows (creative, designer)
  canvas: f => {
    const k = 1 + (f % 6);
    const paint = []; for (let i = 0; i < k; i++) paint.push([1 + i, 2, "u"]);
    return [put(EASEL, 0, 0), cells(paint), cells([[8, 4, "b"], [9, 4, "b"]]), ...critterAt(f, 9, 1, { hat: true }), put(PALETTE, 21, 4)];
  },
  // a microphone, notes floating up (voice, podcast, audio)
  mic: f => {
    const a = f % 6, b = (f + 3) % 6;
    return [put(MIC, 0, 2), ...critterAt(f, 4, 1), put(NOTE, 17, 1 - a), put(NOTE_B, -4, 2 - b)];
  },
  // a screen with a bar chart growing (analysis, data, growth)
  chart: f => {
    const h = [2, 3, 1, 4], bars = [], cols = ["r", "y", "n", "u"];
    const k = 1 + (f % 8) / 2;
    h.forEach((v, i) => { const hh = Math.min(v, Math.ceil(k)); for (let j = 0; j < hh; j++) bars.push([1 + i, 4 - j, cols[i]]); });
    return [put(MONITOR, 0, 1), cells(bars.map(([x, y, c]) => [x, y + 1, c])), ...critterAt(f, 8, 0), put(DESK(21), -1, 9)];
  },
  // at a laptop (any work at a computer)
  laptop: f => [put(LAPTOP, 1, 4), cells(f % 2 ? [[3, 5, "c"], [5, 6, "c"]] : [[4, 5, "c"]]), ...critterAt(f, 11, 0), put(DESK(24), 0, 9)],
  // a phone with a waveform (calls, podcasts)
  phone: f => {
    const wv = []; for (let i = 0; i < 3; i++) { const hgt = 1 + ((f + i * 2) % 3); for (let j = 0; j < hgt; j++) wv.push([1 + i, 3 + (j % 2 ? -1 : 1) * Math.ceil(j / 2), "c"]); }
    return [put(PHONE, 0, 1), cells(wv), ...critterAt(f, 7, 0)];
  },
  // coins (money, price, cost)
  coins: f => [put(COINS, 0, 3), put(COINS, 5, 1), ...critterAt(f, 11, 0), cells(f % 3 === 0 ? [[2, 2, "W"]] : [])],
  // jumping with sparkles (a win, a launch, the full package)
  jump: f => {
    const yb = [0, -1, -2, -1][f % 4];
    return [...critterAt(f, 3, 1 + yb), put(f % 2 ? SPARK : SPARK_S, 15, -2), put(f % 2 ? SPARK_S : SPARK, -3, 2)];
  },
  // just the critter
  plain: f => critterAt(f, 0, 0),
};

// ── rendering, cached per scene, frame and unit ───────────────────────────────────────────────
const CACHE = new Map();
function bounds(parts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of parts) {
    if (p.cells) { for (const [x, y] of p.cells) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); } continue; }
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x + Math.max(...p.g.map(r => r.length))); y1 = Math.max(y1, p.y + p.g.length);
  }
  return { x0, y0, x1, y1 };
}
// the bounding box of a scene over all its frames, so a scene never jumps while it animates
const BOX = new Map();
export function sceneBox(name) {
  if (BOX.has(name)) return BOX.get(name);
  const fn = SCENES[name] ?? SCENES.plain;
  let b = null;
  for (let f = 0; f < 24; f++) {
    const q = bounds(fn(f));
    b = b ? { x0: Math.min(b.x0, q.x0), y0: Math.min(b.y0, q.y0), x1: Math.max(b.x1, q.x1), y1: Math.max(b.y1, q.y1) } : q;
  }
  BOX.set(name, b);
  return b;
}
export function sceneFrame(name, f, unit) {
  const u = Math.max(1, Math.round(unit));
  const key = `${name}|${f % 24}|${u}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const fn = SCENES[name] ?? SCENES.plain, parts = fn(f % 24), b = sceneBox(name);
  const c = createCanvas((b.x1 - b.x0) * u, (b.y1 - b.y0) * u), x = c.getContext("2d");
  const px = (cx, cy, col) => { const fill = PAL[col]; if (!fill) return; x.fillStyle = fill; x.fillRect((cx - b.x0) * u, (cy - b.y0) * u, u, u); };
  for (const p of parts) {
    if (p.cells) { for (const [cx, cy, col] of p.cells) px(cx, cy, col); continue; }
    p.g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== ".") px(p.x + i, p.y + j, row[i]); });
  }
  const out = { canvas: c, w: c.width, h: c.height };
  CACHE.set(key, out);
  return out;
}

// ── on screen ───────────────────────────────────────────────────────────────────────────────
// unit: one art pixel as a fraction of the frame width (0.0088 for the crew, 0.0105 for a mascot:
// the reference's critter body is 0.07-0.09 of the frame wide)
function sprite({ id, scene, at, until, x, y, unit, frame, label = null, labelSize = 0.037, layer = "over", flip = false }) {
  const W = frame.w, H = frame.h, u = unit * W;
  const m0 = createCanvas(8, 8).getContext("2d");
  const LO = { weight: 700, soft: 100, opsz: 24 };
  const lw = label ? measureText(m0, label, "serif", labelSize * W, LO) : 0;
  return {
    id, from: at, to: until, layer,
    draw(ctx, t) {
      const m = motion(t, { at, until, W });
      if (!m.on) return;
      const f = Math.floor((t - at) * 6);
      const S = sceneFrame(scene, f, u);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha *= m.a;
      const cx = x * W, cy = y * H;
      if (flip) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
      ctx.drawImage(S.canvas, Math.round(cx - S.w / 2), Math.round(cy - S.h / 2));
      ctx.restore();
      if (label) {
        ctx.save();
        ctx.globalAlpha *= m.a;
        ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = W * 0.008; ctx.shadowOffsetY = W * 0.002;
        // a two-word job goes on two lines, as on the reference ("competitor / spy")
        const words = label.split(" ");
        const lines = words.length > 1 && lw > S.w * 1.15 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [label];
        lines.forEach((ln, i) => {
          const w = measureText(ctx, ln, "serif", labelSize * W, LO);
          drawText(ctx, ln, cx - w / 2, cy + S.h / 2 + labelSize * W * (1.05 + i * 0.95), "serif", labelSize * W, { fill: WHITE, opts: LO });
        });
        ctx.restore();
      }
    },
  };
}
// THE CREW: [{ scene, label, x, y, t }] — each one pops in on its word, all leave together
// Each critter that pops in makes the pack's click (what appears: the house rule; style 01 kept it on
// every sticker landing).
export function crew({ id = "crew", items, until, frame = FRAME, unit = 0.0088, labelSize = 0.039, layer = "over", sound = "click" }) {
  return items.map((it, i) => {
    const b = sprite({ id: `${id}-${i}`, scene: it.scene, at: it.t, until, x: it.x, y: it.y, unit: it.unit ?? unit, frame, label: it.label ?? null, labelSize, layer, flip: !!it.flip });
    if (sound) b.cues = () => [cue(sound, it.t)];
    return b;
  });
}
// THE MASCOT of a section, above its header
export function mascot({ id = "mascot", scene = "computer", at, until, x = 0.5, y = 0.16, frame = FRAME, unit = 0.0105, layer = "over", flip = false }) {
  return [sprite({ id, scene, at, until, x, y, unit, frame, layer, flip })];
}
export const SCENE_NAMES = Object.keys(SCENES);
