// THE EXPLAINER LANGUAGE, animated: a black stage above the speaker's frame, where what they
// explain is drawn AS THEY SAY IT, with the motion of an After Effects edit:
//   · a CAMERA over a canvas of SCENES: a scene change is a whip pan (the old scene leaves with
//     the camera, the new one arrives with it), a rise, a push through, a pull back, or a cut;
//     inside a scene the camera never stops: a slow drift up and a slow push in; the grid of
//     dots behind moves at a quarter of the camera's speed (parallax)
//   · MOTION BLUR on everything that moves, computed like a camera shutter: each frame is the
//     average of up to 16 sub-frames over half a frame (180°), never a gaussian smear
//   · entrances with expo curves and springs: elements FLY in from a side, RISE, DROP, POP with an
//     overshoot, ZOOM out of the camera, FLIP, WIPE, are DRAWN on, or TYPED word by word; exits
//     the same way; once in, everything floats a few pixels
//   · light and shade: everything that stands on the stage casts a soft shadow on the ground (a
//     tight contact shade and a wide soft one), what is lit glows in its colour, surfaces have a
//     gloss and a rim lit from above, a flash of light behind what pops in, a sheen across the
//     bars and the cards, a light streak across a whip pan, a white flash on the cut to full screen
//   · a GROUND that is not black: charcoal lit from the middle, a vignette, the grid of dots, a
//     light on each scene that travels with the camera, a red glow drifting in a corner, dust
//     floating at three depths, the speaker's frame casting its shadow with a lit rim
//   · the SOUND of the motion: the house pack (assets/sfx-top5, the two base skills') on the big
//     moves: the whoosh on a scene change, the glitch on one hit, the riser into a payoff, the
//     camera flash on the cut to full screen; the Motionix pack (assets/sfx-motionix) on the small
//     ones, light, one per thing that appears: a pop, a swish, a tick, a select, a shutter on a
//     frame of the take, the typing of a prompt, the data of a scan
//
//   const S = await stage({ project: P, full: FULL });        // in plan.mjs
//   S.title(on(0), ["This Is How To Write", "*Killer* Text Hooks"]);
//   S.scene(on(12), "whip");
//   const L = S.list(on(12), ["Substance", "Design", "Formats"]);  L.reveal(0, on(15));
//   export const BEATS = S.beats;  export async function load() { await S.load(); }
//
// Sizes are px at 1080 wide (× K for another width); x and y are fractions of the frame, the
// CENTRE of what is placed, in the current scene; every time is an OUTPUT second.
import { SAFE, FORBIDDEN } from "../../short-editor/scripts/safezones.mjs";
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { geometry, snap, windowAt, isFull as fullAt } from "./geometry.mjs";

const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../short-editor/scripts");
const { createCanvas, loadImage, GlobalFonts } = await import(pathToFileURL(path.join(ENGINE, "scene.mjs")).href);
const { srcToOut, outToSrc, cutsOf } = await import(pathToFileURL(path.join(ENGINE, "cuts.mjs")).href);

// ── the faces ───────────────────────────────────────────────────────────────────────────────
// Inter ExtraBold for every word (measured: the reference's title and captions are Inter at
// -0.01 em), Bold / SemiBold / Medium for small print, Instrument Serif Italic for the accent.
const DIRS = [path.resolve(process.cwd(), "assets", "fonts"), path.join(os.homedir(), "Library", "Fonts"), "/Library/Fonts"];
const reg = (name, alias) => {
  for (const d of DIRS) for (const e of ["ttf", "otf", "woff2"]) {
    const p = path.join(d, `${name}.${e}`);
    try { if (fs.existsSync(p) && GlobalFonts.registerFromPath(p, alias)) return alias; } catch {}
  }
  return null;
};
export const FONT = {
  xb: reg("Inter-ExtraBold", "ExInterXB") ?? "Helvetica Neue",
  b: reg("Inter-Bold", "ExInterB") ?? "Helvetica Neue",
  sb: reg("Inter-SemiBold", "ExInterSB") ?? "Helvetica Neue",
  m: reg("Inter-Medium", "ExInterM") ?? "Helvetica Neue",
  serif: reg("InstrumentSerif-Italic", "ExSerifI") ?? "Times New Roman",
};
for (const [k, v] of Object.entries(FONT)) if (/Helvetica|Times/.test(v)) console.error(`  ⚠ explainer: the ${k} face is missing, ${v} instead (run the skill's fonts.mjs)`);

// ── the palette, sampled on the reference (the ground lifted from its #050505: on black, no
// shadow shows; reviewed 2026-10-05) ──────────────────────────────────────────────────────────
export const X = {
  ground: "#0D0D0E", groundLit: "#272729", dot: "rgba(255,255,255,0.075)",
  ink: "#FFFFFF", soft: "rgba(255,255,255,0.62)", line: "rgba(255,255,255,0.58)",
  red: "#C00102", hot: "#FF2E2E", redBox: ["#8A0000", "#A60204", "#8A0000"],
  green: "#3BD12E", greenFill: "#41C626", greenLabel: "#44A402", yellow: "#FFD60A",
  barL: "#2B2B2B", barR: "#4D4C4B", pill: "#070707",
};
// ── the THEME: the dark stage of the reference, or its LIGHT version (project.json stage.theme
// "light", stage({ theme }), EXPLAINER_THEME=light to compare): the same elements, every colour
// that is not a brand's read from here
export const THEMES = {
  dark: {
    name: "dark", ink: "#FFFFFF", neutralRGB: "255,255,255", shadeRGB: "0,0,0", shade: 1, textShade: 0.6, glowN: 1, glowC: 1,
    ground: "#0D0D0E", groundLit: "#272729", groundMid: "rgba(27,27,29,0.55)", groundEdge: "rgba(13,13,14,0)", vignette: "rgba(0,0,0,0.55)",
    dot: "rgba(255,255,255,0.075)", dustRGB: "255,255,255", dustK: 1,
    spot: [[0, "rgba(255,255,255,0.075)"], [0.5, "rgba(255,255,255,0.03)"], [1, "rgba(255,255,255,0)"]],
    ember: [[0, "rgba(214,24,24,0.15)"], [0.45, "rgba(170,8,8,0.06)"], [1, "rgba(140,0,0,0)"]],
    glass: ["#2E2E31", "#101012", "#08080A"], redGlass: ["#5A0000", "#2A0303", "#140202"], metal: ["#2B2B2B", "#3A3A3A", "#4D4C4B"], redMetal: ["#7A0000", "#2B0606", "#141414"],
    card: "#0B0B0B", tile: "#131313", prompt: ["#232327", "#18181B"], rimTop: "rgba(255,255,255,0.82)", rimBot: "rgba(255,255,255,0.3)", gloss: 0.15, sheen: 0.16,
    frameRim: ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.06)"], veilRGB: "0,0,0", streakRGB: "255,255,255", spark: "#FFFFFF", yellow: "#FFD60A",
    caption: { color: "#FFFFFF", shadow: "rgba(0,0,0,0.7)" }, button: { fill: "#FFFFFF", ink: "#0B0B0B" },
  },
  light: {
    name: "light", ink: "#121216", neutralRGB: "22,22,28", shadeRGB: "28,28,44", shade: 0.42, textShade: 0.16, glowN: 0, glowC: 0.6,
    ground: "#E6E6E9", groundLit: "#FDFDFE", groundMid: "rgba(246,246,248,0.6)", groundEdge: "rgba(230,230,233,0)", vignette: "rgba(28,28,44,0.13)",
    dot: "rgba(20,20,30,0.085)", dustRGB: "40,40,55", dustK: 0.32,
    spot: [[0, "rgba(255,255,255,0.6)"], [0.5, "rgba(255,255,255,0.24)"], [1, "rgba(255,255,255,0)"]],
    ember: [[0, "rgba(235,40,40,0.08)"], [0.45, "rgba(235,40,40,0.03)"], [1, "rgba(235,40,40,0)"]],
    glass: ["#FFFFFF", "#F8F8FA", "#EDEDF0"], redGlass: ["#F04438", "#D92D20", "#B42318"], metal: ["#FFFFFF", "#F5F5F7", "#E8E8EB"], redMetal: ["#E5322D", "#F2C9C7", "#F6F6F8"],
    card: "#FFFFFF", tile: "#FFFFFF", prompt: ["#FFFFFF", "#F3F3F6"], rimTop: "rgba(255,255,255,0.95)", rimBot: "rgba(22,22,28,0.16)", gloss: 0.5, sheen: 0.5,
    frameRim: ["rgba(22,22,28,0.16)", "rgba(22,22,28,0.05)"], veilRGB: "246,246,248", streakRGB: "40,40,52", spark: "#121216", yellow: "#D99A00",
    caption: { color: "#121216", shadow: "rgba(255,255,255,0.9)" }, button: { fill: "#121216", ink: "#FFFFFF" },
  },
};
let T = THEMES.dark;
// a line, a ring, a stroke: white on the dark stage, ink on the light one
const neutral = a => `rgba(${T.neutralRGB},${a})`;
// a shadow, as strong as the ground lets it be
const shadeC = a => `rgba(${T.shadeRGB},${(a * T.shade).toFixed(3)})`;
// a colour by name: white is the neutral (ink on the light stage), yellow darkens on light
const col = c => (c == null ? null : c === "white" ? T.ink : c === "yellow" ? T.yellow : c === "green" ? X.green : c === "red" ? X.hot : c);
const isNeutral = c => /^#fff(fff)?$/i.test(c) || /^rgba?\(\s*255\s*,\s*255\s*,\s*255/.test(c) || c === T.ink;

// ── easing: the curves of an After Effects edit ─────────────────────────────────────────────
const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);
const seg = (t, a, d) => clamp01((t - a) / Math.max(1e-4, d));
const lerp = (a, b, k) => a + (b - a) * k;
export const EASE = {
  linear: u => u,
  inQuad: u => u * u, outQuad: u => 1 - (1 - u) * (1 - u),
  inCubic: u => u * u * u, outCubic: u => 1 - Math.pow(1 - u, 3),
  inOutCubic: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  outQuint: u => 1 - Math.pow(1 - u, 5),
  inOutQuint: u => (u < 0.5 ? 16 * u ** 5 : 1 - Math.pow(-2 * u + 2, 5) / 2),
  inExpo: u => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)),
  outExpo: u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  inOutExpo: u => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2),
  outBack: u => 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2),
  // a spring that overshoots by ~12 % at 40 % of its time, settled at the end
  spring: u => (u >= 1 ? 1 : 1 - Math.exp(-6.2 * u) * Math.cos(7.6 * u)),
};
const ease = (n, u) => (EASE[n] ?? EASE.outCubic)(clamp01(u));
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

// The words on the OUTPUT clock: words.json is on the clock of the raw take; the project's
// `cuts` and `speed` move it (the engine's cuts.mjs, the same mapping build.sh uses).
export function words(P, file = "words.json") {
  const raw = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"));
  const cuts = cutsOf(P);
  return raw.map((w, i) => ({ i, w: w.w, s: +srcToOut(w.s, P).toFixed(3), e: +srcToOut(w.e, P).toFixed(3), cut: cuts.some(([a, b]) => w.s >= a && w.s < b) }));
}

// ── text with runs: *serif accent*, {g:green}, {r:red}, {y:yellow}, {d:dim}, {w:white} ─────
export function runs(spec) {
  if (Array.isArray(spec)) return spec;
  const out = [];
  const re = /\*([^*]+)\*|\{([grdwky]):([^}]*)\}|([^*{]+)/g;
  let m;
  while ((m = re.exec(String(spec)))) {
    if (m[1] != null) out.push({ t: m[1], serif: true });
    else if (m[2] != null) out.push({ t: m[3], c: { g: X.green, r: X.hot, y: T.yellow, d: neutral(0.45), w: T.ink, k: "#0A0A0A" }[m[2]] });
    else out.push({ t: m[4] });
  }
  return out;
}
const fontOf = (r, size) => (r.serif ? `${size * 1.12}px ${FONT.serif}` : `${size}px ${r.face ?? FONT.xb}`);
function measureRuns(ctx, rs, size, track = -0.01) {
  let w = 0;
  for (const r of rs) { ctx.font = fontOf(r, size); ctx.letterSpacing = r.serif ? "0px" : `${track * size}px`; r._w = ctx.measureText(r.t).width; w += r._w; }
  return w;
}
function drawRuns(ctx, rs, x, y, size, { color = T.ink, track = -0.01, align = "center" } = {}) {
  const w = measureRuns(ctx, rs, size, track);
  let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  for (const r of rs) {
    ctx.font = fontOf(r, size); ctx.letterSpacing = r.serif ? "0px" : `${track * size}px`;
    ctx.fillStyle = r.c ?? color; ctx.fillText(r.t, cx, y); cx += r._w;
  }
  ctx.letterSpacing = "0px";
  return w;
}
// the words of a line of runs, each with its x (from the line's left) and width: what a
// word-by-word reveal draws one after the other
function wordsOf(ctx, rs, size, track = -0.01) {
  const out = [];
  let x = 0;
  for (const r of rs) for (const p of r.t.split(/(\s+)/)) {
    if (!p) continue;
    ctx.font = fontOf(r, size); ctx.letterSpacing = r.serif ? "0px" : `${track * size}px`;
    const w = ctx.measureText(p).width;
    if (/\S/.test(p)) out.push({ ...r, t: p, x, w });
    x += w;
  }
  ctx.letterSpacing = "0px";
  return { words: out, width: x };
}
function wrapRuns(ctx, spec, size, maxW, track = -0.01) {
  const ws = [];
  for (const r of runs(spec)) for (const p of r.t.split(/(\s+)/)) if (p) ws.push({ ...r, t: p });
  const lines = [[]];
  for (const w of ws) {
    const cur = lines.at(-1), test = [...cur, w];
    if (cur.length && /\S/.test(w.t) && measureRuns(ctx, test, size, track) > maxW) lines.push(/\s/.test(w.t) ? [] : [w]);
    else if (!(cur.length === 0 && /^\s+$/.test(w.t))) cur.push(w);
  }
  return lines.map(l => { while (l.length && /^\s+$/.test(l.at(-1).t)) l.pop(); return l; }).filter(l => l.length);
}
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
}
// a word-by-word reveal: each word rises 0.5 em out of a blur, `stagger` s apart
function revealWords(ctx, lines, size, lead, t, t0, { stagger = 0.055, color = T.ink, lineColors = null, align = "center", x0 = 0, y0 = 0, track = -0.01 } = {}) {
  let k = 0;
  lines.forEach((rs, li) => {
    const { words: ws, width } = wordsOf(ctx, rs, size, track);
    const left = align === "center" ? x0 - width / 2 : x0;
    for (const w of ws) {
      const u = seg(t, t0 + k * stagger, 0.34), e = ease("outExpo", u);
      k++;
      if (u <= 0) continue;
      ctx.save();
      ctx.globalAlpha *= ease("outCubic", Math.min(1, u * 1.6));
      if (u < 1) ctx.filter = `blur(${((1 - e) * size * 0.22).toFixed(1)}px)`;
      ctx.font = fontOf(w, size); ctx.letterSpacing = w.serif ? "0px" : `${track * size}px`;
      ctx.fillStyle = w.c ?? lineColors?.[li] ?? color; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
      ctx.fillText(w.t, left + w.x, y0 + li * lead + (1 - e) * size * 0.5);
      ctx.restore();
    }
  });
  ctx.letterSpacing = "0px";
}

// ── glyphs: the pictograms drawn in strokes on a 24 grid (check, cross, search, trophy…) ─────
const GLYPH = {
  check: c => { c.moveTo(5, 12.5); c.lineTo(10, 17.5); c.lineTo(19.5, 7); },
  cross: c => { c.moveTo(6.5, 6.5); c.lineTo(17.5, 17.5); c.moveTo(17.5, 6.5); c.lineTo(6.5, 17.5); },
  search: c => { c.arc(10.5, 10.5, 6, 0, 7); c.moveTo(15, 15); c.lineTo(20, 20); },
  trophy: c => { c.moveTo(7.5, 4.5); c.lineTo(16.5, 4.5); c.lineTo(16.5, 9.5); c.arc(12, 9.5, 4.5, 0, Math.PI); c.closePath(); c.moveTo(16.5, 6); c.lineTo(19.5, 6); c.arc(18, 8, 2, -Math.PI / 2, Math.PI / 2); c.moveTo(7.5, 6); c.lineTo(4.5, 6); c.arc(6, 8, 2, -Math.PI / 2, Math.PI / 2, true); c.moveTo(12, 14); c.lineTo(12, 17.5); c.moveTo(8.5, 19.5); c.lineTo(15.5, 19.5); },
  calendar: c => { c.rect(4, 5.5, 16, 14.5); c.moveTo(4, 10); c.lineTo(20, 10); c.moveTo(8.5, 3.5); c.lineTo(8.5, 7); c.moveTo(15.5, 3.5); c.lineTo(15.5, 7); c.moveTo(8, 14); c.lineTo(9, 14); c.moveTo(11.5, 14); c.lineTo(12.5, 14); c.moveTo(15, 14); c.lineTo(16, 14); },
  users: c => { c.arc(9, 8.5, 3.2, 0, 7); c.moveTo(3.5, 19.5); c.arc(9, 19.5, 5.5, Math.PI, 0); c.moveTo(17.8, 8.6); c.arc(16, 8.6, 1.8, 0, 7); c.moveTo(16.5, 13.5); c.quadraticCurveTo(20.5, 14, 20.5, 19); },
  play: c => { c.moveTo(8, 5.5); c.lineTo(18.5, 12); c.lineTo(8, 18.5); c.closePath(); },
  star: c => { for (let i = 0; i < 10; i++) { const r = i % 2 ? 3.8 : 8.6, a = -Math.PI / 2 + i * Math.PI / 5; i ? c.lineTo(12 + r * Math.cos(a), 12.6 + r * Math.sin(a)) : c.moveTo(12 + r * Math.cos(a), 12.6 + r * Math.sin(a)); } c.closePath(); },
  question: c => { c.moveTo(8.8, 8.8); c.bezierCurveTo(8.8, 4.3, 15.5, 4.3, 15.5, 8.6); c.bezierCurveTo(15.5, 11.5, 12, 11.6, 12, 14.5); c.moveTo(12, 18.5); c.lineTo(12, 18.6); },
  bolt: c => { c.moveTo(13.5, 3); c.lineTo(5.5, 13.5); c.lineTo(11.5, 13.5); c.lineTo(10.5, 21); c.lineTo(18.5, 10.5); c.lineTo(12.5, 10.5); c.closePath(); },
  chart: c => { c.moveTo(4, 20); c.lineTo(20, 20); c.moveTo(7, 17); c.lineTo(7, 12); c.moveTo(12, 17); c.lineTo(12, 7); c.moveTo(17, 17); c.lineTo(17, 10); },
  phone: c => { c.moveTo(19, 15.8); c.lineTo(19, 18.4); c.bezierCurveTo(19, 19.4, 18, 20.1, 17, 20); c.bezierCurveTo(9.6, 19.3, 4.7, 14.4, 4, 7); c.bezierCurveTo(3.9, 6, 4.6, 5, 5.6, 5); c.lineTo(8.2, 5); c.lineTo(9.6, 8.6); c.lineTo(8, 10.2); c.bezierCurveTo(9, 12.4, 11.6, 15, 13.8, 16); c.lineTo(15.4, 14.4); c.closePath(); },
  mail: c => { c.rect(3.5, 5.5, 17, 13); c.moveTo(3.5, 6.5); c.lineTo(12, 13); c.lineTo(20.5, 6.5); },
  clock: c => { c.arc(12, 12, 8, 0, 7); c.moveTo(12, 7.5); c.lineTo(12, 12); c.lineTo(15, 14); },
  eye: c => { c.moveTo(2.5, 12); c.quadraticCurveTo(12, 3, 21.5, 12); c.quadraticCurveTo(12, 21, 2.5, 12); c.moveTo(15, 12); c.arc(12, 12, 3, 0, 7); },
  thumbUp: c => { c.moveTo(7, 10.5); c.lineTo(7, 20); c.moveTo(7, 10.5); c.lineTo(11, 4.5); c.bezierCurveTo(13, 4.5, 13.5, 6, 13, 8.5); c.lineTo(12.5, 10.5); c.lineTo(18.5, 10.5); c.bezierCurveTo(20, 10.5, 20.5, 12, 20, 13); c.lineTo(18, 19); c.bezierCurveTo(17.6, 19.7, 17, 20, 16, 20); c.lineTo(7, 20); c.moveTo(3.5, 10.5); c.lineTo(3.5, 20); },
  warning: c => { c.moveTo(12, 3.5); c.lineTo(21, 19.5); c.lineTo(3, 19.5); c.closePath(); c.moveTo(12, 9.5); c.lineTo(12, 14); c.moveTo(12, 16.8); c.lineTo(12, 16.9); },
  plus: c => { c.moveTo(12, 5); c.lineTo(12, 19); c.moveTo(5, 12); c.lineTo(19, 12); },
  arrow: c => { c.moveTo(4, 12); c.lineTo(19, 12); c.moveTo(13.5, 6.5); c.lineTo(19, 12); c.lineTo(13.5, 17.5); },
  rocket: c => { c.moveTo(12, 3); c.bezierCurveTo(16.5, 6, 17, 11, 15.5, 15.5); c.lineTo(8.5, 15.5); c.bezierCurveTo(7, 11, 7.5, 6, 12, 3); c.closePath(); c.moveTo(12, 9.3); c.arc(12, 8.5, 1.4, 0, 7); c.moveTo(8.5, 13); c.lineTo(5.5, 16); c.lineTo(8.5, 16.5); c.moveTo(15.5, 13); c.lineTo(18.5, 16); c.lineTo(15.5, 16.5); c.moveTo(10, 18.5); c.lineTo(12, 21); c.lineTo(14, 18.5); },
  database: c => { c.ellipse(12, 6, 7, 2.6, 0, 0, 7); c.moveTo(5, 6); c.lineTo(5, 18); c.ellipse(12, 18, 7, 2.6, 0, Math.PI, 0, true); c.lineTo(19, 6); c.moveTo(5, 12); c.ellipse(12, 12, 7, 2.6, 0, Math.PI, 0, true); },
  target: c => { c.arc(12, 12, 8.5, 0, 7); c.moveTo(17, 12); c.arc(12, 12, 5, 0, 7); c.moveTo(13.6, 12); c.arc(12, 12, 1.6, 0, 7); },
  heart: c => { c.moveTo(12, 20); c.bezierCurveTo(4.5, 15, 2.5, 11, 2.5, 8.2); c.bezierCurveTo(2.5, 5.4, 4.7, 3.5, 7.3, 3.5); c.bezierCurveTo(9.3, 3.5, 11, 4.7, 12, 6.4); c.bezierCurveTo(13, 4.7, 14.7, 3.5, 16.7, 3.5); c.bezierCurveTo(19.3, 3.5, 21.5, 5.4, 21.5, 8.2); c.bezierCurveTo(21.5, 11, 19.5, 15, 12, 20); c.closePath(); },
  comment: c => { c.moveTo(12, 3.5); c.bezierCurveTo(6.8, 3.5, 3, 7, 3, 11.2); c.bezierCurveTo(3, 13.4, 4, 15.3, 5.7, 16.7); c.lineTo(5, 20.5); c.lineTo(9.2, 18.6); c.bezierCurveTo(10.1, 18.8, 11, 18.9, 12, 18.9); c.bezierCurveTo(17.2, 18.9, 21, 15.4, 21, 11.2); c.bezierCurveTo(21, 7, 17.2, 3.5, 12, 3.5); c.closePath(); },
  share: c => { c.moveTo(20.5, 11); c.lineTo(13, 4.5); c.lineTo(13, 8.3); c.bezierCurveTo(7, 8.8, 4, 13, 3.5, 19); c.bezierCurveTo(6, 15.5, 9, 14, 13, 14); c.lineTo(13, 17.5); c.closePath(); },
  bookmark: c => { c.moveTo(6, 3.5); c.lineTo(18, 3.5); c.lineTo(18, 20.5); c.lineTo(12, 16); c.lineTo(6, 20.5); c.closePath(); },
  bell: c => { c.moveTo(6, 16.5); c.lineTo(6, 11); c.bezierCurveTo(6, 7.5, 8.5, 5, 12, 5); c.bezierCurveTo(15.5, 5, 18, 7.5, 18, 11); c.lineTo(18, 16.5); c.lineTo(19.5, 18); c.lineTo(4.5, 18); c.closePath(); c.moveTo(10, 20.5); c.lineTo(14, 20.5); c.moveTo(12, 3); c.lineTo(12, 5); },
  money: c => { c.moveTo(15.5, 7.5); c.bezierCurveTo(14.5, 5.5, 9, 5.3, 9, 8.4); c.bezierCurveTo(9, 11.6, 15.5, 10.6, 15.5, 14.2); c.bezierCurveTo(15.5, 17.5, 9.8, 17.6, 8.5, 15.4); c.moveTo(12, 3.8); c.lineTo(12, 20.2); },
};
export const GLYPHS = Object.keys(GLYPH);
function drawGlyph(ctx, kind, size, { color = T.ink, width = 2.1, fill = false } = {}) {
  const f = GLYPH[kind]; if (!f) return;
  ctx.save(); ctx.scale(size / 24, size / 24); ctx.translate(-12, -12);
  ctx.beginPath(); f(ctx);
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = width; ctx.strokeStyle = color;
  if (fill) { ctx.fillStyle = color; ctx.fill(); } else ctx.stroke();
  ctx.restore();
}

// ── light and shade: what makes a flat drawing look shot ────────────────────────────────────
// Everything that stands on the stage casts a soft shadow on the ground, falling down (the light
// is above): a tight contact shade and a wide soft one. What is lit glows in its colour. The
// blurred silhouettes are computed once per shape and size, then reused on every frame and
// sub-frame (a canvas shadow recomputed sixteen times a frame would cost the render).
const SPRITES = new Map();
function silhouette(key, w, h, blur, color, draw) {
  const id = `${key}|${w.toFixed(0)}|${h.toFixed(0)}|${blur.toFixed(1)}|${color}`;
  let s = SPRITES.get(id);
  if (!s) {
    const pad = Math.ceil(blur * 2.6) + 2;
    const c = createCanvas(Math.max(1, Math.ceil(w) + 2 * pad), Math.max(1, Math.ceil(h) + 2 * pad)), x = c.getContext("2d");
    x.save(); x.translate(pad + w / 2, pad + h / 2);
    if (blur > 0.4) x.filter = `blur(${blur.toFixed(1)}px)`;
    x.fillStyle = "#fff"; draw(x, w, h);
    x.restore();
    x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    s = { c, pad, w, h }; SPRITES.set(id, s);
    if (SPRITES.size > 800) SPRITES.delete(SPRITES.keys().next().value);
  }
  return s;
}
const rrShape = r => (x, w, h) => { roundRect(x, -w / 2, -h / 2, w, h, r); x.fill(); };
const discShape = (x, w) => { x.beginPath(); x.arc(0, 0, w / 2, 0, 7); x.fill(); };
function paintSprite(ctx, s, a = 1, ox = 0, oy = 0) {
  if (a <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= Math.min(1, a);
  ctx.drawImage(s.c, ox - s.w / 2 - s.pad, oy - s.h / 2 - s.pad);
  ctx.restore();
}
// the shadow of a shape w × h around (0, 0): "low" for a small thing, "mid" for a pill or a bar,
// "high" for a card or a phone: [blur, drop, opacity] of the contact shade, then the soft one
const ELEV = { low: [[4, 3, 0.5], [18, 10, 0.45]], mid: [[6, 5, 0.55], [30, 18, 0.55]], high: [[8, 7, 0.6], [48, 30, 0.62]] };
function shadow(ctx, K, key, w, h, draw, level = "mid", k = 1) {
  for (const [b, oy, a] of ELEV[level] ?? ELEV.mid) paintSprite(ctx, silhouette(key, w, h, b * K, `rgb(${T.shadeRGB})`, draw), a * k * T.shade, 0, oy * K);
}
function glow(ctx, K, key, w, h, draw, color, blur = 26, a = 0.4) {
  const k = a * (isNeutral(color) ? T.glowN : T.glowC);
  if (k > 0.003) paintSprite(ctx, silhouette(key, w, h, blur * K, color, draw), k);
}
// a flash of light behind what pops in, gone in 0.42 s
const popLight = (n, t) => (["pop", "zoom", "flip"].includes(n.enter) ? 0.55 * Math.pow(1 - clamp01((t - n.t0) / 0.42), 2) : 0);
// the shade under words standing on the ground
const textShade = (ctx, K, a = 0.6) => { ctx.shadowColor = `rgba(${T.shadeRGB},${(a * T.textShade / 0.6).toFixed(3)})`; ctx.shadowBlur = 16 * K; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 6 * K; };
const noShade = ctx => { ctx.shadowColor = "rgba(0,0,0,0)"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; };
// a line drawn on the ground, twice: its shade, then itself with a glow of its own colour
function glowStroke(ctx, K, path, color, glowA = 0.45, blur = 10) {
  ctx.save();
  ctx.shadowColor = shadeC(0.55); ctx.shadowBlur = 8 * K; ctx.shadowOffsetY = 4 * K;
  path(); ctx.stroke();
  const ga = glowA * (isNeutral(color) ? T.glowN : T.glowC);
  if (ga > 0.003) { ctx.shadowOffsetY = 0; ctx.shadowBlur = blur * K; ctx.shadowColor = glowColor(color, ga); path(); ctx.stroke(); }
  ctx.restore();
}
// a colour at an opacity, for a glow (#RRGGBB, rgb(), rgba() or a name of the palette)
function glowColor(c, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) { const v = parseInt(m[1], 16); return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`; }
  const r = /^rgba?\(([^)]+)\)$/.exec(c);
  if (r) { const p = r[1].split(",").map(s => s.trim()); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; }
  return `rgba(255,255,255,${a})`;
}

// ── THE PREVIEW of the next video: where its clip sits ────────────────────────────────────────
// (px at 1080x1920: `rect`, where the camera puts the clip; `src`, the part of the source shown, the
// middle by default: frame it on what happens with preview(…, { src }), as the worked example does)
// (2026-10-05, the feed's safe zones, short-editor/scripts/safezones.mjs: every frame and its
// caption between x 0.16 and 0.84 and above y 0.774, clear of the feed's buttons and caption; they
// were 0.10-0.90 wide, the phone and the captions down to 0.89)
export const PREVIEW_LAYOUTS = {
  card: { rect: { x: 180, y: 430, w: 720, h: 720 }, src: { x: 0, y: 0.21875, w: 1, h: 0.5625 } },
  phone: { rect: { x: 296, y: 328, w: 488, h: 1050 }, src: { x: 0.04, y: 0, w: 0.826, h: 1 } },
  upnext: { rect: { x: 180, y: 360, w: 720, h: 896 }, src: { x: 0, y: 0.15, w: 1, h: 0.7 } },
  film: { rect: { x: 265, y: 470, w: 550, h: 685 }, src: { x: 0, y: 0.15, w: 1, h: 0.7 } },
};
// A window of FULL for an end that is not the talk but the NEXT VIDEO, shown in a frame of its own:
// `style` card · phone · upnext · film (EXPLAINER_PREVIEW=<style> to compare), `title` (two lines,
// runs: the card's and the phone's), `name` (the next video's), `src` (the part of the clip shown)
export function preview(a, b, style = "card", o = {}) {
  const want = process.env.EXPLAINER_PREVIEW || style, st = PREVIEW_LAYOUTS[want] ? want : "card", Lp = PREVIEW_LAYOUTS[st];
  return [a, b, { preview: st, rect: Lp.rect, src: o.src ?? Lp.src, title: o.title, name: o.name }];
}

// ── a NODE: one thing on the stage, its life and its moves ──────────────────────────────────
// enter: rise · drop · left · right (fly in from that side) · up (from far below) · pop (a
// spring) · zoom (out of the camera) · flip · blur · flicker · wipe · draw (a line) · words ·
// type · fade · none. exit: blur · sink · up · left · right · pop · zoom · fade · cut.
const ENTER_DUR = { rise: 0.6, drop: 0.6, left: 0.62, right: 0.62, pop: 0.52, zoom: 0.5, flip: 0.5, blur: 0.32, flicker: 0.42, wipe: 0.5, draw: 0.42, words: 0.5, type: 0.8, fade: 0.3, up: 0.7, none: 0 };
const EXIT_DUR = { blur: 0.24, sink: 0.32, up: 0.32, left: 0.38, right: 0.38, pop: 0.26, zoom: 0.3, fade: 0.24, cut: 0 };
let NID = 0;
class Node {
  constructor(S, kind, at, o = {}) {
    this.S = S; this.kind = kind; this.id = o.id ?? `${kind}-${++NID}`; this.o = o;
    this.t0 = at; this.t1 = o.until ?? Infinity;
    this.scene = o.screen ? null : S.cur;
    this.enter = o.enter ?? "rise"; this.enterDur = o.enterDur ?? ENTER_DUR[this.enter] ?? 0.5;
    this.exitKind = o.exit ?? "blur"; this.exitDur = o.exitDur ?? EXIT_DUR[this.exitKind] ?? 0.25;
    const g = S.g;
    this.x = (o.x ?? 0.5) * g.W; this.y = (o.y ?? 0.4) * g.H;
    this.w = (o.w ?? 300) * g.K; this.h = (o.h ?? 120) * g.K;
    // at rest inside the feed's safe area (short-editor/scripts/safezones.mjs, 2026-10-05): a figure
    // placed by hand on the right edge went under the feed's buttons (x 0.84 from y 0.425); moved in
    // when it fits, never resized; `safe: false` for a figure meant to run off the frame
    if (o.safe !== false && !o.screen && o.x != null) {
      const R = (this.y + this.h / 2) / g.H > FORBIDDEN[1].y0 ? FORBIDDEN[1].x0 : SAFE.x1;
      const lo = SAFE.x0 * g.W + this.w / 2, hi = R * g.W - this.w / 2;
      if (lo <= hi) this.x = Math.min(hi, Math.max(lo, this.x));
    }
    this.keys = [];
    this.float = o.float ?? true;
    this.phase = o.phase ?? hash(this.id) * Math.PI * 2;
    this.local = false;
    this.mb = o.mb ?? true;
    this.z = o.z ?? 0;
    this.sfx = [];
  }
  move(t, p, d = 0.6, e = "inOutExpo") { const g = this.S.g; const q = { ...p }; if (q.x != null) q.x *= g.W; if (q.y != null) q.y *= g.H; this.keys.push({ t, d, e, p: q }); return this; }
  dim(t, v = 0.7, d = 0.3) { this.keys.push({ t, d, e: "outCubic", p: { dim: v } }); return this; }
  lit(t, d = 0.3) { return this.dim(t, 0, d); }
  blurTo(t, v, d = 0.35) { this.keys.push({ t, d, e: "outCubic", p: { blur: v } }); return this; }
  set(t, p, d = 0.3, e = "outCubic") { this.keys.push({ t, d, e, p }); return this; }
  out(t, kind, d) { this.t1 = Math.min(this.t1, t); if (kind) this.exitKind = kind; this.exitDur = d ?? EXIT_DUR[this.exitKind] ?? this.exitDur; return this; }
  sound(t, name, gain, opt) { const c = this.S.snd(name, t, gain, opt); if (c) this.sfx.push(c); return this; }
  // where it is, how big, how visible at t (before the scene and the camera)
  state(t) {
    const g = this.S.g, K = g.K;
    const st = { x: this.x, y: this.y, s: 1, sx: 1, sy: 1, rot: 0, dim: this.o.dim ?? 0, blur: this.o.blur ?? 0, hi: 0, ...(this.o.state ?? {}) };
    for (const k of this.keys) {
      if (t < k.t) continue;
      const u = ease(k.e, seg(t, k.t, k.d));
      for (const [p, v] of Object.entries(k.p)) st[p] = typeof v === "number" ? lerp(st[p] ?? 0, v, u) : (u >= 1 ? v : st[p]);
    }
    let a = 1, blur = st.blur, s = st.s, sx = st.sx, dx = 0, dy = 0, rot = st.rot;
    if (t < this.t0 + this.enterDur) {
      const u = seg(t, this.t0, this.enterDur);
      const e = ease("outExpo", u), D = this.o.dist ?? 1;
      switch (this.enter) {
        case "rise": dy += (1 - e) * 130 * K * D; a *= ease("outCubic", Math.min(1, u * 1.7)); s *= lerp(0.88, 1, e); break;
        case "drop": dy -= (1 - e) * 130 * K * D; a *= ease("outCubic", Math.min(1, u * 1.7)); s *= lerp(0.88, 1, e); break;
        case "up": dy += (1 - e) * 620 * K * D; a *= Math.min(1, u * 3); break;
        case "left": dx -= (1 - e) * 760 * K * D; a *= Math.min(1, u * 3); break;
        case "right": dx += (1 - e) * 760 * K * D; a *= Math.min(1, u * 3); break;
        case "pop": s *= Math.max(0, EASE.spring(u)); a *= Math.min(1, u * 5); rot += (1 - e) * -0.16; break;
        case "zoom": s *= lerp(1.75, 1, e); a *= ease("outCubic", u); blur += (1 - e) * 12 * K; break;
        case "flip": sx *= Math.max(0.02, EASE.outBack(u)); a *= Math.min(1, u * 4); break;
        case "blur": a *= ease("outCubic", u); blur += 16 * K * (1 - ease("outCubic", u)); s *= lerp(0.94, 1, ease("outCubic", u)); break;
        case "flicker": { const f = [0, 0.85, 0.32, 0.9, 1], p = u * (f.length - 1), i = Math.min(f.length - 2, Math.floor(p)); a *= lerp(f[i], f[i + 1], p - i); blur += 10 * K * (1 - e); break; }
        case "fade": a *= ease("outCubic", u); break;
        case "wipe": st.reveal = ease("outExpo", u); break;
        case "draw": st.draw = ease("inOutCubic", u); break;
        default: break;
      }
    } else { if (this.enter === "wipe") st.reveal = 1; if (this.enter === "draw") st.draw = 1; }
    if (t > this.t1) {
      const u = seg(t, this.t1, this.exitDur), e = ease("inExpo", u);
      switch (this.exitKind) {
        case "blur": a *= 1 - ease("inCubic", u); blur += 16 * K * u; s *= lerp(1, 1.04, u); break;
        case "sink": dy += e * 140 * K; a *= 1 - u; break;
        case "up": dy -= e * 140 * K; a *= 1 - u; break;
        case "left": dx -= e * 900 * K; a *= 1 - clamp01((u - 0.7) / 0.3); break;
        case "right": dx += e * 900 * K; a *= 1 - clamp01((u - 0.7) / 0.3); break;
        case "pop": s *= u < 0.3 ? lerp(1, 1.08, u / 0.3) : lerp(1.08, 0, ease("inCubic", (u - 0.3) / 0.7)); a *= 1 - clamp01((u - 0.6) / 0.4); break;
        case "zoom": s *= lerp(1, 1.8, e); a *= 1 - u; break;
        case "cut": a = 0; break;
        default: a *= 1 - u; break;
      }
    }
    // once in, everything floats: a few pixels and a fraction of a degree, never still
    if (this.float && t > this.t0 + this.enterDur * 0.6) {
      const w = (t - this.t0) * 2 * Math.PI / (3.6 + 1.6 * hash(this.id + "p"));
      dy += Math.sin(w + this.phase) * 3.2 * K;
      dx += Math.cos(w * 0.7 + this.phase) * 1.4 * K;
      rot += Math.sin(w * 0.8 + this.phase) * 0.004;
    }
    a *= 1 - clamp01(st.dim);
    return { ...st, x: st.x + dx, y: st.y + dy, s, sx, rot, a, blur };
  }
  alive(t) { return t >= this.t0 && t <= this.t1 + this.exitDur; }
}

// ── the painters: one per kind, drawn around (0, 0) in the node's own size ─────────────────
const P8 = {
  text(ctx, n, st, t) {
    const g = n.S.g, size = (n.o.size ?? 44) * g.K, lh = size * (n.o.lead ?? 1.12);
    const lines = n._lines ??= wrapRuns(ctx, n.o.text, size, n.w);
    const y0 = -((lines.length - 1) * lh) / 2 + size * 0.36;
    textShade(ctx, g.K);
    if (n.enter === "words") revealWords(ctx, lines, size, lh, t, n.t0, { color: col(n.o.color) ?? T.ink, align: n.o.align ?? "center", x0: n.o.align === "left" ? -n.w / 2 : 0, y0, stagger: n.o.stagger ?? 0.06 });
    else if (n.enter === "type" && t < n.t0 + n.enterDur) {
      const all = lines.map(l => l.map(r => r.t).join("")).join("\n"), k = Math.round(all.length * seg(t, n.t0, n.enterDur));
      let left = k;
      lines.forEach((l, i) => { const txt = l.map(r => r.t).join(""), shown = txt.slice(0, Math.max(0, left)); left -= txt.length + 1; drawRuns(ctx, [{ ...l[0], t: shown }], n.o.align === "left" ? -n.w / 2 : 0, y0 + i * lh, size, { color: col(n.o.color) ?? T.ink, align: n.o.align ?? "center" }); });
    } else lines.forEach((l, i) => drawRuns(ctx, l, n.o.align === "left" ? -n.w / 2 : 0, y0 + i * lh, size, { color: col(n.o.color) ?? T.ink, align: n.o.align ?? "center" }));
    noShade(ctx);
  },
  pill(ctx, n, st, t) {
    const g = n.S.g, K = g.K, w = n.w, h = n.h, r = (n.o.r ?? 18) * K, key = `rr${r.toFixed(1)}`, shape = rrShape(r);
    const fill = n.o.fill === "green" ? X.greenFill : n.o.fill === "red" ? X.red : n.o.fill;
    const hi = clamp01(st.hi), pulse = n.o.pulse ? Math.max(0, Math.sin((t - n.t0) * 3)) : 0;
    // its shadow on the ground, its glow (faint white; red on a red pill, green on a green one,
    // green when it lights up; brighter as it pops in)
    shadow(ctx, K, key, w, h, shape, "mid");
    const red = n.o.tone === "red" || fill === X.red, green = fill === X.greenFill;
    if (n.o.glow !== false) glow(ctx, K, key, w, h, shape, red ? "#FF2020" : green ? "#46E02A" : "#FFFFFF", 28, (red || green ? 0.42 : 0.18) + 0.22 * pulse + popLight(n, t));
    if (hi > 0.001) glow(ctx, K, key, w, h, shape, n.o.hiFill === "red" ? "#FF2020" : "#46E02A", 32, 0.5 * hi);
    roundRect(ctx, -w / 2, -h / 2, w, h, r);
    const gr = ctx.createLinearGradient(-w / 2, h / 2, w / 2, -h / 2);
    if (fill) { gr.addColorStop(0, fill); gr.addColorStop(1, fill); }
    else if (n.o.tone === "red") { gr.addColorStop(0, T.redGlass[0]); gr.addColorStop(0.55, T.redGlass[1]); gr.addColorStop(1, T.redGlass[2]); }
    else { gr.addColorStop(0, T.glass[0]); gr.addColorStop(0.35, T.glass[1]); gr.addColorStop(1, T.glass[2]); }
    ctx.fillStyle = gr; ctx.fill();
    if (hi > 0.001) { ctx.save(); ctx.globalAlpha *= hi; roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fillStyle = n.o.hiFill === "red" ? X.red : X.greenFill; ctx.fill(); ctx.restore(); }
    // the gloss on its upper half, as on glass, and the rim brighter on top
    ctx.save(); roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.clip();
    const gl = ctx.createLinearGradient(0, -h / 2, 0, h * 0.08); gl.addColorStop(0, `rgba(255,255,255,${T.gloss})`); gl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gl; ctx.fillRect(-w / 2, -h / 2, w, h * 0.58);
    ctx.restore();
    roundRect(ctx, -w / 2 + 0.75, -h / 2 + 0.75, w - 1.5, h - 1.5, r);
    const rim = ctx.createLinearGradient(0, -h / 2, 0, h / 2); rim.addColorStop(0, n.o.rim ?? T.rimTop); rim.addColorStop(1, n.o.rim ?? T.rimBot);
    ctx.strokeStyle = rim; ctx.lineWidth = 1.6 * K; ctx.stroke();
    const size = (n.o.size ?? 30) * g.K;
    const spec = n.o.serif ? `*${n.o.text}*` : n.o.text;
    const pad = (n.o.glyph ? 74 : 36) * g.K;
    const lines = n._lines ??= wrapRuns(ctx, spec, size, w - pad);
    const lh = size * 1.08, y0 = -((lines.length - 1) * lh) / 2 + size * 0.36;
    const ink = (fill === X.greenFill || (st.hi > 0.5 && n.o.hiFill !== "red")) && !n.o.ink ? "#0B2A06" : n.o.tone === "red" || fill === X.red || (st.hi > 0.5 && n.o.hiFill === "red") ? "#FFFFFF" : T.ink;
    const tx = n.o.glyph ? 22 * g.K : 0;
    if (n.o.glyph) { ctx.save(); ctx.translate(-w / 2 + 40 * g.K, 0); drawGlyph(ctx, n.o.glyph, 34 * g.K, { color: col(n.o.glyphColor) ?? ink, width: 2.4 }); ctx.restore(); }
    lines.forEach((l, i) => drawRuns(ctx, l, tx, y0 + i * lh, size, { color: ink, track: -0.012 }));
  },
  // a BAR of the numbered list: the red edge, the brushed metal with its moving sheen, the
  // number, the label (out of a blur when revealed: st.reveal 0 → 1)
  bar(ctx, n, st, t) {
    const g = n.S.g, K = g.K, w = n.w, h = n.h, r = 9 * K, edge = 14 * K, key = `rr${r.toFixed(1)}`, shape = rrShape(r);
    const focus = clamp01(st.hi);
    // its shadow; lit, a red glow round it; the red edge always bleeds a little red light
    shadow(ctx, K, key, w, h, shape, "mid", 1 - 0.25 * focus);
    if (focus > 0.01) glow(ctx, K, key, w, h, shape, "#FF2A2A", 34, 0.34 * focus);
    if (n.o.edge !== false) { const ew = edge + 10 * K; ctx.save(); ctx.translate(-w / 2 + ew / 2 - 2 * K, 0); glow(ctx, K, `edge${r.toFixed(1)}`, ew, h, rrShape(3 * K), "#FF1A1A", 14, 0.42 + 0.38 * focus); ctx.restore(); }
    roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.save(); ctx.clip();
    const gr = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    if (n.o.tone === "red") { gr.addColorStop(0, T.redMetal[0]); gr.addColorStop(0.5, T.redMetal[1]); gr.addColorStop(1, T.redMetal[2]); }
    else { gr.addColorStop(0, T.metal[0]); gr.addColorStop(0.55, T.metal[1]); gr.addColorStop(1, T.metal[2]); }
    ctx.fillStyle = gr; ctx.fillRect(-w / 2, -h / 2, w, h);
    // the sheen: a band of light crossing the bar on its entrance, then every 3 s
    const ph = ((t - n.t0 - 0.15) % 3 + 3) % 3, sx = lerp(-w * 0.9, w * 0.9, clamp01(ph / 0.7));
    if (ph < 0.7) {
      const sh = ctx.createLinearGradient(sx - w * 0.18, -h / 2, sx + w * 0.18, h / 2);
      sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(0.5, `rgba(255,255,255,${T.sheen})`); sh.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sh; ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    const tp = ctx.createLinearGradient(0, -h / 2, 0, -h / 2 + 5 * g.K);
    tp.addColorStop(0, "rgba(255,255,255,0.28)"); tp.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = tp; ctx.fillRect(-w / 2, -h / 2, w, 5 * g.K);
    // and its lower edge in shade: the metal is a block, not a sheet
    const bt = ctx.createLinearGradient(0, h / 2 - 0.32 * h, 0, h / 2);
    bt.addColorStop(0, "rgba(0,0,0,0)"); bt.addColorStop(1, shadeC(T.name === "light" ? 0.18 : 0.3));
    ctx.fillStyle = bt; ctx.fillRect(-w / 2, h / 2 - 0.32 * h, w, 0.32 * h);
    if (n.o.edge !== false) { const er = ctx.createLinearGradient(0, -h / 2, 0, h / 2); er.addColorStop(0, "#D40A0A"); er.addColorStop(1, "#A80000"); ctx.fillStyle = er; ctx.fillRect(-w / 2, -h / 2, edge + 10 * g.K * focus, h); }
    ctx.restore();
    const size = (n.o.size ?? 60) * g.K * (h / (143 * g.K));
    const nx = -w / 2 + edge + 0.06 * w;
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.font = `${size}px ${FONT.xb}`; ctx.letterSpacing = `${-0.01 * size}px`;
    ctx.fillStyle = T.ink; ctx.fillText(n.o.num, nx, size * 0.36);
    const lx = nx + ctx.measureText("00").width + 0.07 * w;
    let ls = size * 0.92; ctx.font = `${ls}px ${FONT.xb}`; ctx.letterSpacing = `${-0.01 * ls}px`;
    const room = w / 2 - lx - (n.o.glyph ? 0.16 : 0.05) * w, lw = ctx.measureText(n.o.label ?? "").width;
    if (lw > room) { ls *= Math.max(0.6, room / lw); ctx.font = `${ls}px ${FONT.xb}`; ctx.letterSpacing = `${-0.01 * ls}px`; }
    const rv = clamp01(st.reveal ?? 1);
    ctx.save();
    if (rv < 0.999) { ctx.filter = `blur(${((1 - rv) * 13 * g.K).toFixed(1)}px)`; ctx.globalAlpha *= lerp(0.72, 1, rv); }
    ctx.fillStyle = col(n.o.labelColor) ?? T.ink;
    ctx.fillText(n.o.label ?? "", lx, ls * 0.36);
    ctx.restore();
    if (n.o.glyph && rv > 0.5) {
      // the verdict of the line (a check, a cross…) pops at the end of the bar once it is said
      const k = EASE.spring(clamp01((rv - 0.5) * 2)), gs = 46 * g.K * (h / (143 * g.K));
      const gc = col(n.o.glyphColor) ?? T.ink;
      ctx.save(); ctx.translate(w / 2 - 54 * g.K * (h / (143 * g.K)), 0); ctx.scale(k, k);
      ctx.shadowColor = glowColor(gc, 0.75); ctx.shadowBlur = 14 * K;
      drawGlyph(ctx, n.o.glyph, gs, { color: gc, width: 2.8 }); ctx.restore();
    }
    ctx.letterSpacing = "0px";
  },
  card(ctx, n, st, t) {
    const g = n.S.g, K = g.K, w = n.w, h = n.h, r = (n.o.r ?? 6) * K, img = n.S.img(n.o.img), key = `rr${r.toFixed(1)}`, shape = rrShape(r);
    const hi = clamp01(st.hi);
    // its shadow (a big card stands higher), a faint glow of its own light, brighter when lit
    shadow(ctx, K, key, w, h, shape, n.o.elev ?? (Math.max(w, h) > 260 * K ? "high" : "mid"));
    glow(ctx, K, key, w, h, shape, n.o.glowColor ?? "#FFFFFF", 30, 0.12 + 0.34 * hi + popLight(n, t));
    roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fillStyle = n.o.docs ? "#F4F4F2" : T.card; ctx.fill();
    roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.save(); ctx.clip();
    if (img) {
      const k = n.o.contain ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height);
      const kb = 1 + 0.04 * clamp01((t - n.t0) / 6);      // a slow push inside the picture
      const iw = img.width * k * kb, ih = img.height * k * kb, ay = n.o.align ?? (n.o.contain ? 0.5 : 0.25);
      ctx.drawImage(img, -iw / 2, -h / 2 + (h - ih) * ay, iw, ih);
      const gray = clamp01(st.gray ?? (n.o.gray ? 1 : 0));
      if (gray > 0.001) { ctx.globalCompositeOperation = "saturation"; ctx.globalAlpha *= gray; ctx.fillStyle = "#808080"; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; }
    } else if (n.o.docs) {
      // a page of text: a title line, then lines of varying length, some blue (links)
      let y = -h / 2 + 0.1 * h, seed = n.o.seed ?? 1;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      ctx.fillStyle = "#333"; ctx.fillRect(-w / 2 + 0.1 * w, y, 0.55 * w, 0.03 * h); y += 0.08 * h;
      while (y < h / 2 - 0.1 * h) { const blue = rnd() < 0.18; ctx.fillStyle = blue ? "#5B7BD5" : "#9A9A9A"; ctx.fillRect(-w / 2 + 0.1 * w, y, (0.4 + 0.45 * rnd()) * w, 0.016 * h); y += 0.038 * h; }
    } else if (n.o.fill) { ctx.fillStyle = n.o.fill === "tile" ? T.tile : n.o.fill; ctx.fillRect(-w / 2, -h / 2, w, h); }
    if (n.o.player) {
      // a video player: a soft gradient, a round play button, a progress bar that runs
      const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, "rgba(255,255,255,0.07)"); gr.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = gr; ctx.fillRect(-w / 2, -h / 2, w, h);
      const R = Math.min(w, h) * 0.16;
      ctx.save(); ctx.shadowColor = "rgba(255,255,255,0.35)"; ctx.shadowBlur = 24 * g.K; ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2 * g.K; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
      ctx.save(); ctx.translate(R * 0.08, 0); drawGlyph(ctx, "play", R * 1.1, { color: "#fff", fill: true }); ctx.restore();
      const by = h / 2 - 0.08 * h, bx = -w / 2 + 0.1 * w, bw = 0.8 * w, pr = clamp01((t - n.t0) / 6);
      ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(bx, by, bw, 4 * g.K);
      ctx.fillStyle = X.hot; ctx.fillRect(bx, by, bw * (0.15 + 0.6 * pr), 4 * g.K);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(bx + bw * (0.15 + 0.6 * pr), by + 2 * g.K, 7 * g.K, 0, 7); ctx.fill();
    } else if (n.o.glyph && !img) { const gc = col(n.o.glyphColor) ?? neutral(0.85); ctx.save(); ctx.shadowColor = glowColor(gc, 0.55 + 0.3 * hi); ctx.shadowBlur = 16 * K; drawGlyph(ctx, n.o.glyph, Math.min(w, h) * 0.42, { color: gc }); ctx.restore(); }
    // the sheen: a band of light crossing it as it lands
    const sw = seg(t, n.t0 + 0.12, 0.75);
    if (sw > 0 && sw < 1 && (img || n.o.docs || n.o.fill)) {
      const sx = lerp(-w * 1.1, w * 1.1, ease("inOutCubic", sw)), sh = ctx.createLinearGradient(sx - w * 0.32, -h / 2, sx + w * 0.32, h / 2);
      sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(0.5, `rgba(255,255,255,${n.o.docs ? 0.35 : 0.2})`); sh.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sh; ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    const shade = clamp01(st.shade ?? n.o.shade ?? 0);
    if (shade > 0.001) { ctx.globalAlpha = shade; ctx.fillStyle = "#000"; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.globalAlpha = 1; }
    if (st.tint > 0.001) { ctx.globalAlpha = st.tint * 0.42; ctx.fillStyle = n.o.tintColor ?? "#7CFF6B"; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.globalAlpha = 1; }
    ctx.restore();
    if (n.o.rim !== false) {
      roundRect(ctx, -w / 2 + 0.75, -h / 2 + 0.75, w - 1.5, h - 1.5, r);
      const rim = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      rim.addColorStop(0, n.o.rim ?? (T.name === "light" ? T.rimTop : `rgba(255,255,255,${0.75 + 0.25 * hi})`)); rim.addColorStop(1, n.o.rim ?? (T.name === "light" ? neutral(0.16 + 0.4 * hi) : `rgba(255,255,255,${0.3 + 0.5 * hi})`));
      ctx.strokeStyle = rim; ctx.lineWidth = (1.5 + 1.5 * hi) * K; ctx.stroke();
    }
    ctx.save(); textShade(ctx, K, 0.55);
    if (n.o.label) { ctx.font = `${(n.o.labelSize ?? 22) * g.K}px ${FONT.b}`; ctx.fillStyle = T.ink; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(n.o.label, 0, -h / 2 - 12 * g.K); ctx.textAlign = "left"; }
    if (n.o.caption) { const size = (n.o.captionSize ?? 24) * g.K; drawRuns(ctx, runs(n.o.caption), 0, h / 2 + size * 1.4, size); }
    ctx.restore();
    for (const m of n.o.marks ?? []) {
      const k = clamp01((t - m.t) / 0.25); if (k <= 0) continue;
      const [fx, fy, fw, fh] = m.rect, x = -w / 2 + fx * w, y = -h / 2 + fy * h, mw = fw * w * (m.wipe === false ? 1 : ease("outExpo", k)), mh = fh * h;
      ctx.save(); ctx.globalAlpha *= Math.min(1, k * 2);
      if (m.fill) { ctx.fillStyle = m.fill === "green" ? X.greenLabel : m.fill; ctx.fillRect(x, y, mw, mh); }
      if (m.text && k > 0.5) { ctx.fillStyle = T.ink; drawRuns(ctx, runs(m.text), x + fw * w / 2, y + mh / 2 + (m.size ?? 30) * g.K * 0.36, (m.size ?? 30) * g.K); }
      if (m.dash !== false) { ctx.setLineDash([9 * g.K, 6 * g.K]); ctx.lineDashOffset = -t * 40 * g.K; ctx.strokeStyle = X.red; ctx.lineWidth = 3.5 * g.K; ctx.strokeRect(x, y, fw * w, mh); ctx.setLineDash([]); }
      ctx.restore();
    }
  },
  phone(ctx, n, st, t) {
    const g = n.S.g, K = g.K, w = n.w, h = n.h, r = 0.16 * w, key = `rr${r.toFixed(1)}`, shape = rrShape(r), hi = clamp01(st.hi);
    // it stands high: a deep shadow, the light of its screen round it
    shadow(ctx, K, key, w, h, shape, "high", 1.1);
    glow(ctx, K, key, w, h, shape, "#FFFFFF", 40, 0.15 + 0.2 * hi + popLight(n, t));
    roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fillStyle = "#050506"; ctx.fill();
    // the metal frame, lit from the top left
    roundRect(ctx, -w / 2, -h / 2, w, h, r);
    const fr = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    fr.addColorStop(0, "rgba(255,255,255,0.88)"); fr.addColorStop(0.45, "rgba(255,255,255,0.32)"); fr.addColorStop(1, "rgba(255,255,255,0.6)");
    ctx.strokeStyle = fr; ctx.lineWidth = 2.4 * K; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 3 * g.K;
    for (const [x, y0, y1] of [[w / 2 + 2 * g.K, -h * 0.30, -h * 0.20], [-w / 2 - 2 * g.K, -h * 0.34, -h * 0.29], [-w / 2 - 2 * g.K, -h * 0.25, -h * 0.17]]) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
    const m = 0.045 * w, sx = -w / 2 + m, sy = -h / 2 + m, sw = w - 2 * m, sh = h - 2 * m;
    ctx.save(); roundRect(ctx, sx, sy, sw, sh, r * 0.82); ctx.clip();
    ctx.fillStyle = "#000"; ctx.fillRect(sx, sy, sw, sh);
    const screens = n.o.screens ?? [n.o.screen ?? {}];
    // the screens slide up one after the other (the new one pushes the old one out)
    const cur = Math.floor(st.screen ?? 0), mix = (st.screen ?? 0) - cur;
    for (const [i, off] of [[cur, -mix], [cur + 1, 1 - mix]]) {
      const sc = screens[i]; if (!sc || off <= -1 || off >= 1) continue;
      ctx.save(); ctx.translate(0, off * sh);
      if (mix > 0.02 && mix < 0.98) ctx.filter = `blur(${(Math.sin(mix * Math.PI) * 6 * g.K).toFixed(1)}px)`;
      screen(ctx, n, sc, sx, sy, sw, sh, t); ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = "#000"; roundRect(ctx, -0.17 * w, sy + 0.012 * h, 0.34 * w, 0.034 * h, 0.017 * h); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.22)"; roundRect(ctx, -0.07 * w, sy + 0.026 * h, 0.1 * w, 0.006 * h, 0.003 * h); ctx.fill();
    ctx.beginPath(); ctx.arc(0.075 * w, sy + 0.029 * h, 0.009 * w, 0, 7); ctx.fill();
  },
  icon(ctx, n, st, t) {
    const g = n.S.g, K = g.K, w = n.w, h = n.h, img = n.S.img(n.o.img), hi = clamp01(st.hi);
    // a ring that shakes (a phone ringing): `ring: [from, to]`
    const ring = n.o.ring && t >= n.o.ring[0] && t <= n.o.ring[1] ? Math.sin((t - n.o.ring[0]) * 46) * 0.09 : 0;
    if (img) {
      const k = Math.min(w / img.width, h / img.height), iw = img.width * k, ih = img.height * k;
      const draw = x => x.drawImage(img, -iw / 2, -ih / 2, iw, ih), key = `img:${n.o.img}`;
      // its shadow stays on the ground while it rings; its glow, brighter when lit and as it pops in
      shadow(ctx, K, key, iw, ih, draw, "mid");
      ctx.save(); ctx.rotate(ring);
      if (n.o.glow !== false) glow(ctx, K, key, iw, ih, draw, n.o.glowColor ?? "#FFFFFF", 34, 0.24 + 0.34 * hi + popLight(n, t));
      draw(ctx);
      ctx.restore();
    }
    if (n.o.label) { const size = (n.o.size ?? 30) * g.K; ctx.save(); textShade(ctx, K); drawRuns(ctx, runs(n.o.label), 0, h / 2 + size * 1.25, size, { track: -0.01 }); ctx.restore(); }
  },
  // a GLYPH: a pictogram, bare (tile: false) or on a tile (dark glass, or "green", "red")
  glyph(ctx, n, st, t) {
    const g = n.S.g, K = g.K, w = n.w, gcol = col(n.o.color) ?? T.ink;
    const tile = n.o.tile ?? true, pl = popLight(n, t);
    if (tile !== false) {
      const tileFill = tile === "green" ? X.greenFill : tile === "red" ? X.red : null;
      const shape = n.o.round ? discShape : rrShape(w * 0.24), key = n.o.round ? "disc" : `rr${(w * 0.24).toFixed(1)}`;
      const path = (inset = 0) => { if (n.o.round) { ctx.beginPath(); ctx.arc(0, 0, w / 2 - inset, 0, 7); } else roundRect(ctx, -w / 2 + inset, -w / 2 + inset, w - 2 * inset, w - 2 * inset, w * 0.24); };
      shadow(ctx, K, key, w, w, shape, "mid");
      glow(ctx, K, key, w, w, shape, tileFill ? (tile === "green" ? "#46E02A" : "#FF2020") : "#FFFFFF", 30, (tileFill ? 0.5 : 0.18) + pl);
      path();
      if (tileFill) ctx.fillStyle = tileFill;
      else { const gr = ctx.createLinearGradient(-w / 2, w / 2, w / 2, -w / 2); gr.addColorStop(0, T.glass[0]); gr.addColorStop(0.4, T.glass[1]); gr.addColorStop(1, T.glass[2]); ctx.fillStyle = gr; }
      ctx.fill();
      // the gloss on its upper half, the rim lit from above
      ctx.save(); path(); ctx.clip();
      const gl = ctx.createLinearGradient(0, -w / 2, 0, w * 0.05); gl.addColorStop(0, `rgba(255,255,255,${tileFill ? 0.26 : T.gloss})`); gl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gl; ctx.fillRect(-w / 2, -w / 2, w, w * 0.56); ctx.restore();
      path(0.8);
      const rim = ctx.createLinearGradient(0, -w / 2, 0, w / 2); rim.addColorStop(0, tileFill ? "rgba(255,255,255,0.55)" : T.rimTop); rim.addColorStop(1, tileFill ? "rgba(255,255,255,0.1)" : T.rimBot);
      ctx.strokeStyle = rim; ctx.lineWidth = 1.6 * K; ctx.stroke();
      const gc = tileFill && !n.o.color ? "#FFFFFF" : gcol;
      ctx.save(); ctx.shadowColor = glowColor(gc, tileFill ? 0.35 : 0.6); ctx.shadowBlur = 12 * K;
      drawGlyph(ctx, n.o.kind, w * 0.56, { color: gc, width: n.o.width ?? 2.2 }); ctx.restore();
    } else {
      // a bare pictogram: its shade on the ground, then itself, glowing in its colour
      ctx.save(); ctx.shadowColor = shadeC(0.6); ctx.shadowBlur = 10 * K; ctx.shadowOffsetY = 6 * K;
      drawGlyph(ctx, n.o.kind, w, { color: gcol, width: n.o.width ?? 2.2 });
      ctx.shadowOffsetY = 0; ctx.shadowColor = glowColor(gcol, Math.min(1, 0.7 + pl)); ctx.shadowBlur = 18 * K;
      drawGlyph(ctx, n.o.kind, w, { color: gcol, width: n.o.width ?? 2.2 }); ctx.restore();
    }
    if (n.o.label) { const size = (n.o.size ?? 26) * g.K; ctx.save(); textShade(ctx, K); drawRuns(ctx, runs(n.o.label), 0, w / 2 + size * 1.35, size, { track: -0.01 }); ctx.restore(); }
  },
  wires(ctx, n, st) {
    const g = n.S.g, K = g.K, k = clamp01(st.draw ?? 1), cc = col(n.o.color) ?? neutral(0.75);
    ctx.strokeStyle = cc; ctx.lineWidth = (n.o.width ?? 2.2) * K; ctx.lineCap = "square";
    // each path drawn up to k of its length; the tips are where the sparks ride
    const tips = [];
    const path = () => {
      ctx.beginPath(); tips.length = 0;
      for (const p of n.o.paths) {
        let len = 0; for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
        let left = len * k, tip = p[0];
        ctx.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length && left > 0; i++) {
          const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]), f = d > 0 ? Math.min(1, left / d) : 1;
          tip = [lerp(p[i - 1][0], p[i][0], f), lerp(p[i - 1][1], p[i][1], f)];
          ctx.lineTo(tip[0], tip[1]); left -= d;
        }
        tips.push(tip);
      }
    };
    glowStroke(ctx, K, path, cc, 0.4);
    // a spark rides each tip while it draws
    if (k > 0 && k < 1) for (const tip of tips) { ctx.save(); if (T.glowN) { ctx.shadowColor = "#fff"; ctx.shadowBlur = 16 * K; } ctx.fillStyle = T.spark; ctx.beginPath(); ctx.arc(tip[0], tip[1], 3.6 * K, 0, 7); ctx.fill(); ctx.restore(); }
  },
  arrow(ctx, n, st) {
    const g = n.S.g, K = g.K, k = clamp01(st.draw ?? 1), [ax, ay] = n.o.a, [bx, by] = n.o.b;
    const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    const cx = mx - dy / L * (n.o.bend ?? 0.28) * L, cy = my + dx / L * (n.o.bend ?? 0.28) * L;
    const P = u => [(1 - u) ** 2 * ax + 2 * (1 - u) * u * cx + u * u * bx, (1 - u) ** 2 * ay + 2 * (1 - u) * u * cy + u * u * by];
    const cc = col(n.o.color) ?? neutral(0.85);
    ctx.strokeStyle = cc; ctx.fillStyle = cc; ctx.lineWidth = (n.o.width ?? 5) * K; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const hs = (n.o.head ?? 26) * K * EASE.outBack(clamp01((k - 0.85) / 0.15));
    const path = () => {
      ctx.beginPath(); const p0 = P(0); ctx.moveTo(p0[0], p0[1]);
      for (let u = 0.04; u <= k + 1e-6; u += 0.04) { const p = P(Math.min(u, k)); ctx.lineTo(p[0], p[1]); }
      if (k > 0.85) {
        // the head, as a closed shape stroked with the line (rounded like it)
        const e = P(1), b = P(0.94), an = Math.atan2(e[1] - b[1], e[0] - b[0]);
        ctx.moveTo(e[0] + Math.cos(an) * hs * 0.2, e[1] + Math.sin(an) * hs * 0.2);
        ctx.lineTo(e[0] - Math.cos(an - 0.5) * hs, e[1] - Math.sin(an - 0.5) * hs);
        ctx.lineTo(e[0] - Math.cos(an + 0.5) * hs, e[1] - Math.sin(an + 0.5) * hs);
        ctx.closePath();
      }
    };
    glowStroke(ctx, K, path, cc, 0.42);
    if (k > 0.85) {
      const e = P(1), b = P(0.94), an = Math.atan2(e[1] - b[1], e[0] - b[0]);
      ctx.beginPath();
      ctx.moveTo(e[0] + Math.cos(an) * hs * 0.2, e[1] + Math.sin(an) * hs * 0.2);
      ctx.lineTo(e[0] - Math.cos(an - 0.5) * hs, e[1] - Math.sin(an - 0.5) * hs);
      ctx.lineTo(e[0] - Math.cos(an + 0.5) * hs, e[1] - Math.sin(an + 0.5) * hs);
      ctx.closePath(); ctx.fill();
    }
  },
  ping(ctx, n, st, t) {
    const g = n.S.g, u = clamp01((t - n.t0) / (n.o.dur ?? 0.7));
    const w = n.w, h = n.h, out = lerp(0.02, 0.18, ease("outExpo", u)) * w;
    if (n.o.ring) {
      // rings that grow out of the node and fade (two, 0.18 s apart)
      if (T.glowN) { ctx.shadowColor = "rgba(255,255,255,0.6)"; ctx.shadowBlur = 12 * g.K; }
      for (const d of [0, 0.18]) { const v = clamp01((t - n.t0 - d) / 0.6); if (v <= 0 || v >= 1) continue; ctx.strokeStyle = neutral(0.75 * (1 - v)); ctx.lineWidth = 3 * g.K * (1 - v) + 1; ctx.beginPath(); ctx.arc(0, 0, Math.max(w, h) * lerp(0.55, 1.05, ease("outExpo", v)), 0, 7); ctx.stroke(); }
      return;
    }
    ctx.strokeStyle = neutral(0.9 * (1 - u)); ctx.lineWidth = 4 * g.K; ctx.lineCap = "round";
    if (T.glowN) { ctx.shadowColor = "rgba(255,255,255,0.6)"; ctx.shadowBlur = 12 * g.K; }
    for (const side of [-1, 1]) {
      ctx.beginPath();
      const cx = side * (w / 2 + out), r = h * 0.42;
      ctx.arc(cx - side * r * 0.75, -h * 0.28, r, side < 0 ? Math.PI * 0.78 : -Math.PI * 0.22, side < 0 ? Math.PI * 1.22 : Math.PI * 0.22);
      ctx.stroke();
    }
  },
  prompt(ctx, n, st, t) {
    const g = n.S.g, K = g.K, w = n.w, h = n.h, r = 22 * K, key = `rr${r.toFixed(1)}`, shape = rrShape(r);
    shadow(ctx, K, key, w, h, shape, "high");
    glow(ctx, K, key, w, h, shape, "#FFFFFF", 30, 0.1);
    roundRect(ctx, -w / 2, -h / 2, w, h, r);
    const bg = ctx.createLinearGradient(0, -h / 2, 0, h / 2); bg.addColorStop(0, T.prompt[0]); bg.addColorStop(1, T.prompt[1]);
    ctx.fillStyle = bg; ctx.fill();
    roundRect(ctx, -w / 2 + 0.75, -h / 2 + 0.75, w - 1.5, h - 1.5, r);
    const rim = ctx.createLinearGradient(0, -h / 2, 0, h / 2); rim.addColorStop(0, T.name === "light" ? T.rimTop : neutral(0.32)); rim.addColorStop(1, T.name === "light" ? T.rimBot : neutral(0.08));
    ctx.strokeStyle = rim; ctx.lineWidth = 1.5 * K; ctx.stroke();
    const pad = 26 * g.K; let y = -h / 2 + pad;
    const at = n.o.attachments ?? [];
    at.forEach((f, i) => { const im = n.S.img(f), s = 46 * g.K; ctx.save(); roundRect(ctx, -w / 2 + pad + i * (s + 8 * g.K), y, s * 0.78, s, 5 * g.K); ctx.clip(); if (im) { const k = Math.max(s * 0.78 / im.width, s / im.height); ctx.drawImage(im, -w / 2 + pad + i * (s + 8 * g.K), y, im.width * k, im.height * k); } else { ctx.fillStyle = "#444"; ctx.fill(); } ctx.restore(); });
    if (at.length) y += 64 * g.K;
    const size = (n.o.size ?? 30) * g.K, text = String(n.o.text ?? ""), shown = text.slice(0, Math.round(text.length * clamp01(st.type ?? 1)));
    ctx.font = `${size}px ${FONT.m}`; ctx.fillStyle = neutral(0.9); ctx.textBaseline = "top";
    const lines = wrapRuns(ctx, [{ t: shown, face: FONT.m }], size, w - 2 * pad, 0);
    lines.forEach((l, i) => { ctx.font = `${size}px ${FONT.m}`; ctx.fillText(l.map(x => x.t).join(""), -w / 2 + pad, y + i * size * 1.3); });
    if (Math.floor(t * 2.2) % 2 === 0) { const last = lines.at(-1) ?? [{ t: "" }]; ctx.font = `${size}px ${FONT.m}`; const lw = ctx.measureText(last.map(x => x.t).join("")).width; ctx.fillRect(-w / 2 + pad + lw + 3 * g.K, y + Math.max(0, lines.length - 1) * size * 1.3, 2.5 * g.K, size * 1.1); }
    ctx.textBaseline = "alphabetic";
    const by = h / 2 - pad - 12 * g.K;
    if (n.o.glyph) { ctx.save(); ctx.translate(-w / 2 + pad + 14 * g.K, by); drawGlyph(ctx, n.o.glyph, 28 * g.K, { color: neutral(0.7) }); ctx.restore(); }
    else { ctx.strokeStyle = neutral(0.6); ctx.lineWidth = 2.5 * g.K; ctx.beginPath(); ctx.moveTo(-w / 2 + pad, by); ctx.lineTo(-w / 2 + pad + 20 * g.K, by); ctx.moveTo(-w / 2 + pad + 10 * g.K, by - 10 * g.K); ctx.lineTo(-w / 2 + pad + 10 * g.K, by + 10 * g.K); ctx.stroke(); }
    const pressed = st.type >= 1 ? 1 + 0.12 * Math.sin(clamp01((t - (n.o.typeTo ?? 0)) / 0.25) * Math.PI) : 1;
    ctx.save(); ctx.translate(w / 2 - pad - 22 * g.K, by); ctx.scale(pressed, pressed);
    ctx.save(); ctx.shadowColor = glowColor(n.o.accent ?? "#D97757", 0.6 + 0.3 * (pressed - 1) / 0.12); ctx.shadowBlur = 16 * K;
    roundRect(ctx, -22 * g.K, -22 * g.K, 44 * g.K, 44 * g.K, 10 * g.K); ctx.fillStyle = n.o.accent ?? "#D97757"; ctx.fill(); ctx.restore();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3 * g.K; ctx.beginPath(); ctx.moveTo(0, 10 * g.K); ctx.lineTo(0, -10 * g.K); ctx.moveTo(-9 * g.K, -2 * g.K); ctx.lineTo(0, -11 * g.K); ctx.lineTo(9 * g.K, -2 * g.K); ctx.stroke();
    ctx.restore();
  },
  file(ctx, n, st, t) {
    const g = n.S.g, w = n.w, h = n.h, img = n.S.img(n.o.img);
    const K = g.K, pose = Math.floor(t * 8) % 3, rot = [-1.6, 1.1, -0.4][pose] * Math.PI / 180, sc = [1, 1.012, 0.994][pose];
    const k0 = img ? Math.min(w / img.width, h / img.height) : 1, iw = img ? img.width * k0 : w, ih = img ? img.height * k0 : h;
    const draw = img ? (x => x.drawImage(img, -iw / 2, -ih / 2, iw, ih)) : rrShape(14 * K), key = img ? `img:${n.o.img}` : `rr${(14 * K).toFixed(1)}`;
    shadow(ctx, K, key, iw, ih, draw, "mid");
    if (!img) glow(ctx, K, key, iw, ih, draw, n.o.fill ?? "#D9704F", 26, 0.35 + popLight(n, t));
    ctx.save(); ctx.rotate(rot); ctx.scale(sc, sc);
    if (img) draw(ctx);
    else { roundRect(ctx, -w / 2, -h / 2, w, h, 14 * K); ctx.fillStyle = n.o.fill ?? "#D9704F"; ctx.fill(); if (n.o.glyph) drawGlyph(ctx, n.o.glyph, w * 0.5, { color: "#fff", width: 2 }); }
    ctx.restore();
    if (n.o.name) { ctx.save(); textShade(ctx, K); ctx.font = `${(n.o.size ?? 26) * g.K}px ${FONT.b}`; ctx.fillStyle = T.ink; ctx.textAlign = "center"; ctx.fillText(n.o.name, 0, h / 2 + 40 * g.K); ctx.restore(); }
  },
  callout(ctx, n, st) {
    const g = n.S.g, k = clamp01(st.draw ?? 1), [ax, ay] = n.o.a, [bx, by] = n.o.b;
    ctx.strokeStyle = neutral(0.85); ctx.lineWidth = 2 * g.K;
    glowStroke(ctx, g.K, () => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, k), lerp(ay, by, k)); }, neutral(0.85), 0.35);
    if (k > 0.95) {
      const size = (n.o.size ?? 22) * g.K; ctx.font = `${size}px ${FONT.b}`;
      const tw = ctx.measureText(n.o.text).width, pw = tw + 26 * g.K, ph = size * 1.7, lx = bx + (bx >= ax ? 0 : -pw);
      ctx.save(); ctx.shadowColor = shadeC(0.6); ctx.shadowBlur = 18 * g.K; ctx.shadowOffsetY = 8 * g.K;
      roundRect(ctx, lx, by - ph / 2, pw, ph, 5 * g.K); ctx.fillStyle = T.glass[1]; ctx.fill(); ctx.restore();
      roundRect(ctx, lx, by - ph / 2, pw, ph, 5 * g.K); ctx.strokeStyle = neutral(0.7); ctx.lineWidth = 1.5 * g.K; ctx.stroke();
      ctx.fillStyle = T.ink; ctx.fillText(n.o.text, lx + 13 * g.K, by + size * 0.36);
    }
  },
  sign(ctx, n, st) {
    const g = n.S.g, size = (n.o.size ?? 50) * g.K;
    const cc = col(n.o.color) ?? T.ink;
    ctx.font = `${size}px ${FONT.xb}`; ctx.fillStyle = cc; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    textShade(ctx, g.K, 0.65); ctx.fillText(n.o.text, 0, size * 0.02);
    ctx.shadowOffsetY = 0; ctx.shadowColor = glowColor(cc, n.o.glow ? 0.85 : 0.35); ctx.shadowBlur = (n.o.glow ? 30 : 16) * g.K;
    ctx.fillText(n.o.text, 0, size * 0.02); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  },
  wave(ctx, n, st, t) {
    const g = n.S.g, w = n.w, h = n.h;
    ctx.shadowColor = glowColor(X.hot, 0.6); ctx.shadowBlur = 14 * g.K;
    roundRect(ctx, -w / 2, -h / 2, w, h, 8 * g.K); ctx.strokeStyle = X.red; ctx.lineWidth = 3 * g.K; ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const x = -w * 0.42 + (i / 60) * w * 0.84, a = Math.sin(i * 1.7 + t * 9) * Math.sin(i * 0.33) * h * 0.32; ctx.moveTo(x, -Math.abs(a)); ctx.lineTo(x, Math.abs(a)); }
    ctx.stroke();
  },
  // a COUNTER: a number climbing to its value (outExpo)
  count(ctx, n, st, t) {
    const g = n.S.g, size = (n.o.size ?? 120) * g.K, u = seg(t, n.t0, n.o.dur ?? 1.1), v = lerp(n.o.from ?? 0, n.o.to, ease("outExpo", u));
    const fmt = x => (n.o.format ? n.o.format(x) : Math.round(x).toLocaleString("en-US"));
    const cc = col(n.o.color) ?? T.ink, txt = [{ t: `${n.o.prefix ?? ""}${fmt(v)}${n.o.suffix ?? ""}`, c: cc }];
    // its shade, then itself in a glow of its colour (stronger while it climbs)
    textShade(ctx, g.K, 0.65); drawRuns(ctx, txt, 0, size * 0.36, size, { track: -0.02 });
    ctx.shadowOffsetY = 0; ctx.shadowColor = glowColor(cc, 0.3 + 0.35 * (1 - u)); ctx.shadowBlur = 26 * g.K;
    drawRuns(ctx, txt, 0, size * 0.36, size, { track: -0.02 });
    textShade(ctx, g.K, 0.6);
    if (n.o.label) drawRuns(ctx, runs(n.o.label), 0, size * 0.36 + (n.o.labelSize ?? 34) * g.K * 1.6, (n.o.labelSize ?? 34) * g.K);
  },
  // a MARK on something: a box swept behind it, a frame, an underline, a ring, a strike; drawn
  // with its shade and a glow of its colour
  mark(ctx, n, st, t) {
    const g = n.S.g, K = g.K, k = clamp01(st.draw ?? 1), w = n.w, h = n.h, cc = col(n.o.color) ?? X.hot;
    ctx.strokeStyle = cc; ctx.fillStyle = cc; ctx.lineCap = "round"; ctx.lineWidth = (n.o.width ?? 5) * K;
    switch (n.o.kind) {
      case "box": {
        ctx.save(); ctx.shadowColor = glowColor(cc, 0.5); ctx.shadowBlur = 22 * K;
        ctx.globalAlpha *= n.o.alpha ?? 0.9; roundRect(ctx, -w / 2, -h / 2, Math.max(1, w * k), h, 6 * K); ctx.fill(); ctx.restore(); break;
      }
      case "frame": { const per = 2 * (w + h); ctx.setLineDash([per * k + 0.01, per + 1]); glowStroke(ctx, K, () => roundRect(ctx, -w / 2, -h / 2, w, h, 10 * K), cc, 0.55, 12); ctx.setLineDash([]); break; }
      case "underline": glowStroke(ctx, K, () => { ctx.beginPath(); ctx.moveTo(-w / 2, h / 2); ctx.lineTo(-w / 2 + w * k, h / 2); }, cc, 0.55, 12); break;
      case "strike": glowStroke(ctx, K, () => { ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 + w * k, 0); }, cc, 0.55, 12); break;
      case "circle": default: {
        const steps = 64, end = 1.08 * k;
        glowStroke(ctx, K, () => {
          ctx.beginPath();
          for (let i = 0; i <= steps * end; i++) { const a = -Math.PI * 0.6 + (i / steps) * Math.PI * 2, wob = 1 + 0.03 * Math.sin(i * 0.9); const x = Math.cos(a) * (w / 2 + 18 * K) * wob, y = Math.sin(a) * (h / 2 + 18 * K) * wob; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        }, cc, 0.55, 12);
      }
    }
  },
  // the LIGHT STREAK across a whip pan: a hot white line, its glow, a flare at its head
  streak(ctx, n, st, t) {
    const g = n.S.g, u = seg(t, n.t0, n.enterDur), dir = n.o.dir ?? -1, W = g.W;
    const hx = dir < 0 ? lerp(W * 1.2, -W * 0.2, ease("inOutCubic", u)) : lerp(-W * 0.2, W * 1.2, ease("inOutCubic", u));
    const len = W * 0.55, a = Math.sin(u * Math.PI);
    ctx.save(); if (T.name === "dark") ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha *= a * (T.name === "dark" ? 1 : 0.4);
    const gr = ctx.createLinearGradient(hx, 0, hx - dir * len, 0);
    gr.addColorStop(0, `rgba(${T.streakRGB},0.95)`); gr.addColorStop(1, `rgba(${T.streakRGB},0)`);
    ctx.shadowColor = `rgb(${T.streakRGB})`; ctx.shadowBlur = 24 * g.K; ctx.fillStyle = gr;
    ctx.fillRect(Math.min(hx, hx - dir * len), -3 * g.K, len, 6 * g.K);
    const fl = ctx.createRadialGradient(hx, 0, 0, hx, 0, 60 * g.K); fl.addColorStop(0, `rgba(${T.streakRGB},0.9)`); fl.addColorStop(1, `rgba(${T.streakRGB},0)`);
    ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(hx, 0, 60 * g.K, 0, 7); ctx.fill();
    ctx.restore();
  },
};
// what is on a phone's screen: a dark band with a hook (text), a picture, a grid of icons, a call
function screen(ctx, n, sc, sx, sy, sw, sh, t) {
  const g = n.S.g;
  if (sc.bg) { ctx.fillStyle = sc.bg; ctx.fillRect(sx, sy, sw, sh); }
  const img = n.S.img(sc.img);
  if (img) {
    const k = Math.max(sw / img.width, sh / img.height) * (1 + 0.03 * clamp01((t - n.t0) / 5));
    ctx.save(); if (sc.dim) ctx.globalAlpha *= 1 - sc.dim;
    ctx.drawImage(img, sx + (sw - img.width * k) / 2, sy + (sh - img.height * k) * (sc.align ?? 0.4), img.width * k, img.height * k);
    ctx.restore();
  }
  if (sc.grid) {
    const cols = 3, tw = sw * 0.24, th = tw * 0.62, gx = sw * 0.07, top = sy + sh * (sc.gridY ?? 0.42);
    sc.grid.forEach((it, i) => {
      const c = i % cols, r = Math.floor(i / cols), x = sx + sw / 2 + (c - 1) * (tw + gx) - tw / 2, y = top + r * (th + gx * 0.8);
      ctx.save(); ctx.shadowColor = "rgba(255,255,255,0.25)"; ctx.shadowBlur = 16 * g.K; roundRect(ctx, x, y, tw, th, 6 * g.K); ctx.fillStyle = "#0E0E0E"; ctx.fill(); ctx.restore();
      roundRect(ctx, x, y, tw, th, 6 * g.K); ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.2 * g.K; ctx.stroke();
      const im = n.S.img(it.img ?? it);
      if (im) { const k = Math.min(tw * 0.5 / im.width, th * 0.6 / im.height); ctx.drawImage(im, x + tw / 2 - im.width * k / 2, y + th * 0.56 - im.height * k / 2, im.width * k, im.height * k); }
      else if (it.glyph) { ctx.save(); ctx.translate(x + tw / 2, y + th * 0.58); drawGlyph(ctx, it.glyph, th * 0.5, { color: col(it.color) ?? "#FFFFFF" }); ctx.restore(); }
      if (it.label) { ctx.font = `${12 * g.K}px ${FONT.b}`; ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.textAlign = "center"; ctx.fillText(it.label, x + tw / 2, y + th * 0.2); ctx.textAlign = "left"; }
    });
  }
  if (sc.text) {
    const size = (sc.size ?? 34) * g.K, lines = wrapRuns(ctx, sc.text, size, sw * 0.86);
    const lh = size * 1.18, by = sy + sh * (sc.textY ?? 0.2);
    if (sc.band !== false) { ctx.fillStyle = "rgba(20,20,20,0.85)"; ctx.fillRect(sx, by - lh * 0.95, sw, lh * (lines.length + 0.9)); }
    lines.forEach((l, i) => drawRuns(ctx, l, sx + sw / 2, by + i * lh, size, { color: "#FFFFFF" }));
  }
  if (sc.call) {
    // an incoming call: a pulsing ring round the caller, the name, the two buttons
    const cx = sx + sw / 2, cy = sy + sh * 0.34, R = sw * 0.17, p = (t * 1.3) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p)})`; ctx.lineWidth = 3 * g.K; ctx.beginPath(); ctx.arc(cx, cy, R * (1 + p * 0.8), 0, 7); ctx.stroke();
    ctx.fillStyle = "#2A2A2A"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(cx, cy); drawGlyph(ctx, "users", R * 1.1, { color: "rgba(255,255,255,0.8)" }); ctx.restore();
    drawRuns(ctx, runs(sc.call), cx, cy + R + 64 * g.K, (sc.size ?? 36) * g.K);
    if (sc.sub) drawRuns(ctx, runs(sc.sub), cx, cy + R + 108 * g.K, 24 * g.K, { color: "rgba(255,255,255,0.6)" });
    for (const [bx, col] of [[cx - sw * 0.25, "#E5484D"], [cx + sw * 0.25, "#30D158"]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, sy + sh * 0.8, sw * 0.09, 0, 7); ctx.fill(); ctx.save(); ctx.translate(bx, sy + sh * 0.8); drawGlyph(ctx, "phone", sw * 0.09, { color: "#fff", fill: true }); ctx.restore(); }
  }
}

// ── the stage ───────────────────────────────────────────────────────────────────────────────
export async function stage({ project: P, full = [], layer, captions = true, words: W = null, fix = {}, flashOnFull = true, breath, theme } = {}) {
  T = THEMES[String(process.env.EXPLAINER_THEME || theme || P.stage?.theme || "dark")] ?? THEMES.dark;
  const g = geometry(P), fps = P.fps ?? 30, K = g.K;
  const FULL = snap(full, fps);
  const hasMatte = fs.existsSync(path.resolve(process.cwd(), "matte")) && fs.readdirSync(path.resolve(process.cwd(), "matte")).some(f => f.endsWith(".png"));
  const L = layer ?? (hasMatte ? "under" : "over");
  const images = new Map();
  // (the margins leave room for the scenes' slow drift up and push in: 32 px, 3 %)
  const area = { top: Math.round(g.title.y1 + g.title.lead + 0.6 * g.title.size + 62 * K), bottom: Math.round(g.caption.split.y - 0.8 * g.caption.split.size - 36 * K) };
  const C = { x: g.W / 2, y: (area.top + area.bottom) / 2 };
  const G = P.cueGains ?? {};
  // THE SOUNDS. The big moves keep the house pack (the base skills' sounds, each with its level and
  // where its transient sits in the file); project.json cueGains overrides a level by name. On
  // sfxMasterDb = voice LUFS + 15.3 (init.sh), measured as heard on the reference take: whoosh
  // 9-10 LU under the programme median, flash 9-11, riser 10, glitch 11, click 14-15, the
  // swooshes 9-14 (the base skills: whoosh 9, flash 9, riser 10, glitch 13, click 12-16)
  const SND = {
    whoosh: { kind: "sample:sfx-top5/whoosh.wav", gain: -9.5, align: 0.94 },
    click: { kind: "sample:sfx-top5/click.wav", gain: -9, align: 0.005 },
    glitch: { kind: "sample:sfx-top5/glitch.wav", gain: -15, align: 0.15 },
    riser: { kind: "sample:sfx-top5/riser.wav", gain: -14, align: 1.765 },
    flash: { kind: "sample:sfx-top5/camera-flash.wav", gain: -7, align: 0.255 },
    swoosh: { kind: "swoosh_in", gain: -20, align: 0.17 },
    swooshOut: { kind: "swoosh_out", gain: -22, align: 0.03 },
    whooshOut: { kind: "whoosh_out", gain: -18, align: 0.05 },
  };
  // The small ones come from the Motionix pack (assets/sfx-motionix, kit.json: every file at the
  // same short-term loudness, -20 LUFS momentary, and where its transient sits): one per thing
  // that appears, light, a role each, its files taken in turn so a run never repeats one. The
  // gains put them 15-20 LU under the programme (as heard: 1.5 - gain). Without the pack, each
  // role falls back on the house sound in brackets.
  const MX = {
    pop: { files: ["normal-pop-1", "normal-pop-2", "normal-pop-3", "normal-pop-4", "normal-pop-5"], gain: -14.5, or: "click" },
    popSoft: { files: ["slow-pop", "media-pop"], gain: -14.5, or: "click" },
    popSmall: { files: ["smooth-pop", "sweet-ui-open"], gain: -15.5, or: "click" },
    swish: { files: ["epic-fast-whoosh", "cinematic-fast-normal-whoosh", "high-fast-whoosh", "smooth-fast-whoosh"], gain: -15, or: "swoosh" },
    swishBig: { files: ["deep-short-whoosh", "cinematic-fast-whoosh"], gain: -13.5, or: "swoosh" },
    tick: { files: ["ui-digital-click-4", "ui-key", "high-click"], gain: -20, or: null },
    select: { files: ["ui-select", "ui-select-2", "ui-glitch-click"], gain: -15, or: "click" },
    confirm: { files: ["ui-enter"], gain: -14.5, or: "click" },
    deny: { files: ["ui-backspace"], gain: -15, or: "click" },
    thump: { files: ["thump-click"], gain: -15.5, or: null },
    stretch: { files: ["ui-stretch", "ui-digital-click"], gain: -16.5, or: "swooshOut" },
    ping: { files: ["ui-digital-click-1"], gain: -15.5, or: null },
    flicker: { files: ["ui-glitch-flicker"], gain: -17.5, or: null },
    shutter: { files: ["smooth-camera-shutter", "camera-shutter", "hard-camera-shutter"], gain: -18, or: "click" },
    typing: { files: ["ui-typing"], gain: -16, or: null },
    data: { files: ["data-collect"], gain: -15.5, or: "click" },
    gear: { files: ["speed-gear", "middle-gear"], gain: -15, or: "click" },
    money: { files: ["cinematic-money-2"], gain: -14, or: "click" },
    button: { files: ["ui-button"], gain: -16.5, or: null },
    projector: { files: ["fast-gear"], gain: -21, or: null },
  };
  const KIT = (() => {
    const shelf = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../assets/sfx/motionix");
    const here = path.resolve(process.cwd(), "assets", "sfx-motionix");
    // a project scaffolded before the pack was on the shelf gets it now (once)
    if (!fs.existsSync(path.join(here, "kit.json")) && fs.existsSync(path.join(shelf, "kit.json"))) {
      try { fs.mkdirSync(here, { recursive: true }); for (const f of fs.readdirSync(shelf)) if (/\.(wav|json)$/.test(f)) fs.copyFileSync(path.join(shelf, f), path.join(here, f)); } catch {}
    }
    try { return JSON.parse(fs.readFileSync(path.join(here, "kit.json"), "utf8")); } catch { return null; }
  })();
  if (!KIT) console.error("  ⚠ explainer: the Motionix pack is not in assets/sfx-motionix: the small sounds fall back on the house pack");
  const turn = {};
  const S = {
    g, P, FULL, layer: L, nodes: [], beats: [], fps, area, C,
    mid: C.y / g.H, span: (area.bottom - area.top) / g.H,
    isFull: t => fullAt(t, FULL, fps),
    img: f => (f ? images.get(f) ?? null : null),
    // a sound by name at t: a role of the Motionix pack (its next file), a house sound, or a
    // kind of the engine; `len` cuts a long file (the typing) to that many seconds
    snd(name, t, gain, { len } = {}) {
      const m = MX[name];
      if (m && KIT) {
        const files = m.files.filter(f => KIT[f]);
        if (files.length) {
          const f = KIT[files[(turn[name] = (turn[name] ?? -1) + 1) % files.length]];
          return { t: +t.toFixed(3), kind: `sample:sfx-motionix/${f.file}${len ? `:0:${Math.min(len, f.dur).toFixed(3)}` : ""}`, gain: (gain ?? G[name] ?? m.gain) - 20 - f.lm, align: f.align, role: name };
        }
      }
      if (m) return m.or ? S.snd(m.or, t) : null;
      const s = SND[name] ?? (/^sample:|^[a-z_]+$/.test(name) ? { kind: name, gain: -14, align: 0 } : null);
      if (!s) return null;
      return { t: +t.toFixed(3), kind: s.kind, gain: gain ?? G[name] ?? s.gain, align: s.align, role: name };
    },
    extra: [],                  // sounds that belong to no node (scene changes, cuts, risers)
    async load(opt = {}) {
      if ((opt.layer ?? "over") === "over") await S.loadBreath();
      const want = new Set();
      for (const n of S.nodes) {
        if (n.o.img) want.add(n.o.img);
        for (const f of n.o.attachments ?? []) want.add(f);
        for (const sc of n.o.screens ?? (n.o.screen ? [n.o.screen] : [])) { if (sc.img) want.add(sc.img); for (const it of sc.grid ?? []) if (it.img ?? (typeof it === "string" ? it : null)) want.add(it.img ?? it); }
      }
      for (const f of want) {
        if (images.has(f)) continue;
        const p = path.resolve(process.cwd(), f);
        if (!fs.existsSync(p)) { console.error(`  ⚠ explainer: picture not found, drawn empty: ${f}`); continue; }
        try { images.set(f, await loadImage(p)); } catch (e) { console.error(`  ⚠ explainer: ${f}: ${e.message}`); }
      }
    },
  };

  // ── SCENES and the CAMERA ────────────────────────────────────────────────────────────────
  // A scene is a group of figures with an origin on a canvas bigger than the frame; the camera
  // travels from one origin to the next (whip, rise, drop), or the scenes cross on the spot
  // (push, pull, cut). Inside a scene, its content drifts up (6.5 px/s, 32 px at most) and grows
  // slowly (0.6 %/s, 3 % at most): never still, never into the title.
  const scenes = [{ t0: 0, ox: 0, oy: 0, kin: "cut", din: 0 }];
  S.cur = 0;
  const camKeys = [];
  S.cam = t => {
    let x = 0, y = 0;
    for (const k of camKeys) { if (t < k.t) break; const u = ease("inOutQuint", seg(t, k.t, k.d)); x = lerp(k.x0, k.x1, u); y = lerp(k.y0, k.y1, u); }
    return { x, y };
  };
  const shakes = [];
  const sceneState = (i, t) => {
    if (i == null) return { ox: 0, oy: 0, z: 1, a: 1, dx: 0, dy: 0, cam: false };
    const sc = scenes[i], next = scenes[i + 1];
    const live = t - sc.t0;
    let z = 1 + Math.min(0.03, Math.max(0, live) * 0.006), a = 1, dy = -Math.min(32 * K, Math.max(0, live) * 6.5 * K), dx = 0;
    for (const sh of shakes) { const u = (t - sh.t) / 0.32; if (u < 0 || u > 1) continue; const d = Math.pow(1 - u, 2) * sh.amp * K; dx += Math.sin(t * 97) * d; dy += Math.cos(t * 83) * d * 0.7; }
    if (sc.kin === "push") { const u = seg(t, sc.t0 + 0.14, 0.46); z *= lerp(0.7, 1, ease("outExpo", u)); a *= ease("outCubic", u); }
    if (sc.kin === "pull") { const u = seg(t, sc.t0 + 0.14, 0.46); z *= lerp(1.5, 1, ease("outExpo", u)); a *= ease("outCubic", u); }
    if (sc.kin === "cut" && t < sc.t0) a = 0;
    if (next) {
      if (next.kin === "push") { const u = seg(t, next.t0, 0.32); z *= lerp(1, 2.3, ease("inExpo", u)); a *= 1 - u * u; }
      else if (next.kin === "pull") { const u = seg(t, next.t0, 0.32); z *= lerp(1, 0.55, ease("inExpo", u)); a *= 1 - u * u; }
      else if (next.kin === "cut" && t >= next.t0) a = 0;
      else if (t > next.t0 + next.din + 0.05) a = 0;
    }
    return { ox: sc.ox, oy: sc.oy, z, a, dx, dy, cam: true };
  };
  // a jolt of the camera at t (an impact: the VS, a stamp), `amp` px at its start
  S.shake = (t, amp = 14) => { shakes.push({ t, amp }); };
  // the screen transform of a node at t (its state through its scene and the camera)
  const xf = (n, t) => {
    const st = n.state(t), sc = sceneState(n.scene, t);
    let x = st.x, y = st.y;
    if (sc.cam) { const c = S.cam(t); const vx = st.x + sc.ox - c.x + sc.dx, vy = st.y + sc.oy - c.y + sc.dy; x = C.x + sc.z * (vx - C.x); y = C.y + sc.z * (vy - C.y); }
    return { x, y, s: sc.z * st.s, sx: st.sx, sy: st.sy, rot: st.rot, a: st.a * sc.a, blur: st.blur, st };
  };
  // A NEW SCENE: the camera moves (whip: to the right, the old scene leaving left; right; rise:
  // down, the old scene leaving up; drop), or the scenes cross on the spot (push, pull, cut);
  // the pack's whoosh carries it, a light streak crosses a whip
  S.scene = (at, kind = "whip", o = {}) => {
    const prev = scenes[S.cur], d = o.dur ?? (kind === "rise" || kind === "drop" ? 0.5 : 0.46);
    const off = { whip: [1.25 * g.W, 0], left: [1.25 * g.W, 0], right: [-1.25 * g.W, 0], rise: [0, 0.95 * g.H], drop: [0, -0.95 * g.H] }[kind] ?? [0, 0];
    const sc = { t0: at, ox: prev.ox + off[0], oy: prev.oy + off[1], kin: kind === "left" ? "whip" : kind, din: ["whip", "left", "right", "rise", "drop"].includes(kind) ? d : 0 };
    scenes.push(sc); S.cur = scenes.length - 1;
    if (sc.din) camKeys.push({ t: at, d, x0: prev.ox, y0: prev.oy, x1: sc.ox, y1: sc.oy });
    for (const n of S.nodes) if (n.scene === S.cur - 1 && n.t1 > at + d + 0.06) { n.t1 = at + d + 0.06; n.exitKind = "cut"; n.exitDur = 0; }
    if (o.sfx !== null) S.extra.push(S.snd("whoosh", at + (sc.din ? d * 0.5 : 0.08)));
    if (o.streak !== false && ["whip", "left", "right"].includes(kind)) {
      const sn = new Node(S, "streak", at, { screen: true, enter: "none", until: at + d + 0.02, exit: "cut", x: 0, y: C.y / g.H, float: false, mb: false });
      sn.enterDur = d + 0.02; sn.o.dir = kind === "right" ? 1 : -1; sn.z = 9; S.nodes.push(sn);
    }
    return S.cur;
  };

  // ── drawing, with motion blur ───────────────────────────────────────────────────────────
  // Each node is painted at up to 16 sub-frame times over half a frame (a 180° shutter) and the
  // paintings are averaged: a fast move smears exactly as in a camera. A still node is painted
  // once; a node fading or blurring is painted on its own and composited as one picture.
  const tmp = createCanvas(g.W, g.H), tx = tmp.getContext("2d");
  const acc = createCanvas(g.W, g.H), ax = acc.getContext("2d");
  const SHUTTER = 0.5 / fps;
  const paintAt = (c, n, m, t) => { c.save(); c.translate(m.x, m.y); if (m.rot) c.rotate(m.rot); c.scale(m.s * m.sx, m.s * m.sy); P8[n.kind](c, n, m.st, t); c.restore(); };
  const boxOf = (n, m) => {
    if (n.local || n.kind === "streak") return [0, 0, g.W, g.H];
    const r = Math.hypot(n.w, n.h) * 0.5 * m.s * Math.max(1, Math.abs(m.sx)) + 170 * K + m.blur * 3;   // its shadow and glow
    return [m.x - r, m.y - r, m.x + r, m.y + r];
  };
  const clampBox = b => { const x0 = Math.max(0, Math.floor(b[0])), y0 = Math.max(0, Math.floor(b[1])), x1 = Math.min(g.W, Math.ceil(b[2])), y1 = Math.min(g.H, Math.ceil(b[3])); return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null; };
  function drawNode(ctx, n, t) {
    const m0 = xf(n, t);
    if (m0.a <= 0.003) return;
    let N = 1;
    if (n.mb !== false) {
      const m1 = xf(n, t - SHUTTER), ext = Math.hypot(n.w, n.h) * 0.5;
      const disp = Math.hypot(m0.x - m1.x, m0.y - m1.y) + Math.abs(m0.s - m1.s) * ext + Math.abs(m0.rot - m1.rot) * ext + Math.abs(m0.sx - m1.sx) * n.w * 0.5;
      N = Math.min(16, Math.max(1, Math.round(disp / 3)));
    }
    if (N === 1 && m0.a > 0.995 && m0.blur < 0.4) { ctx.save(); ctx.globalAlpha = 1; paintAt(ctx, n, m0, t); ctx.restore(); return; }
    const ms = N === 1 ? [m0] : Array.from({ length: N }, (_, i) => xf(n, t - SHUTTER * i / (N - 1)));
    let b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const m of ms) { const q = boxOf(n, m); b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])]; }
    const cb = clampBox(b); if (!cb) return;
    // tmp and acc are shared by every node of every frame, and a blurred copy of the box reads the
    // pixels around it: a node is painted inside its box only, and the box is cleared once copied,
    // so nothing a node left there bleeds into the next one (a seam through an icon, 2026-10-08)
    const paintIn = (m, tm) => { tx.clearRect(...cb); tx.save(); tx.beginPath(); tx.rect(...cb); tx.clip(); paintAt(tx, n, m, tm); tx.restore(); };
    if (N === 1) {
      paintIn(m0, t);
      ctx.save(); ctx.globalAlpha = m0.a; if (m0.blur > 0.4) ctx.filter = `blur(${m0.blur.toFixed(1)}px)`;
      ctx.drawImage(tmp, cb[0], cb[1], cb[2], cb[3], cb[0], cb[1], cb[2], cb[3]); ctx.restore();
      tx.clearRect(...cb);
      return;
    }
    ax.clearRect(...cb);
    ax.globalCompositeOperation = "lighter";
    ms.forEach((m, i) => {
      if (m.a <= 0.003) return;
      paintIn(m, t - SHUTTER * i / (N - 1));
      ax.globalAlpha = m.a / N;
      ax.drawImage(tmp, cb[0], cb[1], cb[2], cb[3], cb[0], cb[1], cb[2], cb[3]);
    });
    ax.globalAlpha = 1; ax.globalCompositeOperation = "source-over";
    ctx.save(); if (m0.blur > 0.4) ctx.filter = `blur(${m0.blur.toFixed(1)}px)`;
    ctx.drawImage(acc, cb[0], cb[1], cb[2], cb[3], cb[0], cb[1], cb[2], cb[3]); ctx.restore();
    tx.clearRect(...cb); ax.clearRect(...cb);
  }

  // THE GROUND, not black (on black no shadow shows: reviewed 2026-10-05): charcoal lit from the
  // middle of the stage, a vignette, dithered once so its gradients never band in the encode; on
  // it a light on each scene that travels with the camera, a red glow drifting in the top corner,
  // the grid of dots at a quarter of the camera's speed, dust floating at three depths (each at
  // its own speed under a camera move); the speaker's frame casts its shadow, has a lit rim and is
  // cut out (the take shows through it)
  const step = g.dots.step, top = g.box.top;
  const base = (() => {
    const c = createCanvas(g.W, g.H), x = c.getContext("2d"), cy = C.y - 0.04 * g.H;
    x.fillStyle = T.ground; x.fillRect(0, 0, c.width, c.height);
    let gr = x.createRadialGradient(g.W / 2, cy, 0, g.W / 2, cy, 0.62 * g.H);
    gr.addColorStop(0, T.groundLit); gr.addColorStop(0.55, T.groundMid); gr.addColorStop(1, T.groundEdge);
    x.fillStyle = gr; x.fillRect(0, 0, c.width, c.height);
    gr = x.createRadialGradient(g.W / 2, cy, 0.3 * g.H, g.W / 2, cy, 0.85 * g.H);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, T.vignette);
    x.fillStyle = gr; x.fillRect(0, 0, c.width, c.height);
    const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
    let seed = 7;
    for (let i = 0; i < d.length; i += 4) {
      seed = (seed * 16807) % 2147483647; const r = (seed / 2147483647 - 0.5) * 3;
      d[i] = Math.min(255, Math.max(0, d[i] + r)); d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + r)); d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + r));
    }
    x.putImageData(im, 0, 0);
    return c;
  })();
  const radial = (R, stops) => { const c = createCanvas(2 * R, 2 * R), x = c.getContext("2d"), gr = x.createRadialGradient(R, R, 0, R, R, R); for (const [k, col] of stops) gr.addColorStop(k, col); x.fillStyle = gr; x.fillRect(0, 0, 2 * R, 2 * R); return c; };
  const spot = radial(Math.round(560 * K), T.spot);
  const ember = radial(Math.round(480 * K), T.ember);
  const dots = (() => {
    const c = createCanvas(g.W + 2 * Math.ceil(step), g.H + 2 * Math.ceil(step)), x = c.getContext("2d");
    x.fillStyle = T.dot;
    for (let y = g.dots.oy; y < c.height; y += step) for (let xx = g.dots.ox; xx < c.width; xx += step) { x.beginPath(); x.arc(xx, y, g.dots.r, 0, 7); x.fill(); }
    return c;
  })();
  // dust: far (small, sharp), middle, near (big, out of focus); [parallax, rise px/s, opacity, size]
  const DEPTH = [[0.12, 7, 0.24, 3.2], [0.25, 12, 0.15, 7], [0.5, 19, 0.075, 30]];
  const motes = [0.6, 2.2, 7].map(b => { const R = 26, c = createCanvas(2 * R, 2 * R), x = c.getContext("2d"); x.filter = `blur(${b}px)`; x.fillStyle = `rgb(${T.dustRGB})`; x.beginPath(); x.arc(R, R, 9, 0, 7); x.fill(); return c; });
  const DUST = Array.from({ length: 30 }, (_, i) => ({ x: hash(`dx${i}`), y: hash(`dy${i}`), d: i % 3, v: 0.7 + 0.6 * hash(`dv${i}`), a: 0.6 + 0.8 * hash(`da${i}`), s: 0.7 + 0.6 * hash(`ds${i}`), ph: hash(`dp${i}`) * 6.28 }));
  const boxH = g.H - top + 2 * g.box.r, frameShadow = silhouette("frame", g.box.w, boxH, 34 * K, `rgb(${T.shadeRGB})`, rrShape(g.box.r));
  // the ground itself: the base, the lights, the dots, the dust (down to `dustH`)
  function groundAt(ctx, t, dustH = top) {
      const c = S.cam(t), cur = Math.max(0, scenes.findLastIndex(s => s.t0 <= t)), sc = sceneState(cur, t);
      ctx.drawImage(base, 0, 0);
      // a light on each scene on screen, carried by the camera with it
      for (let i = Math.max(0, cur - 1); i <= Math.min(scenes.length - 1, cur + 1); i++) {
        const q = sceneState(i, t); if (q.a <= 0.01 || (i > cur && t < scenes[i].t0)) continue;
        const vx = C.x + q.ox - c.x + q.dx, vy = C.y - 0.03 * g.H + q.oy - c.y + q.dy, R = spot.width / 2 * q.z;
        if (vx + R < 0 || vx - R > g.W || vy + R < 0 || vy - R > top) continue;
        ctx.save(); ctx.globalAlpha = q.a; ctx.drawImage(spot, vx - R, vy - R, 2 * R, 2 * R); ctx.restore();
      }
      // the red glow, drifting slowly in the top right corner (it stays there whatever the camera)
      { const R = ember.width / 2, ex = g.W * (0.93 + 0.04 * Math.sin(t * 0.21)), ey = top * (0.06 + 0.04 * Math.cos(t * 0.17));
        ctx.save(); ctx.globalAlpha = 0.85 + 0.15 * Math.sin(t * 0.6); ctx.drawImage(ember, ex - R, ey - R); ctx.restore(); }
      const px = ((c.x * 0.25) % step + step) % step, py = (((c.y - sc.dy) * 0.25) % step + step) % step;
      ctx.drawImage(dots, -px - step, -py - step);
      // the dust, each depth at its own speed
      const span = g.W * 1.3;
      for (const m of DUST) {
        const [pp, v, a, sz] = DEPTH[m.d], size = sz * m.s * K;
        const x = ((m.x * span - c.x * pp) % span + span) % span - 0.15 * g.W + Math.sin(t * 0.45 + m.ph) * 14 * K;
        const y = ((m.y * dustH - t * v * m.v * K - c.y * pp) % dustH + dustH) % dustH;
        ctx.save(); ctx.globalAlpha = a * m.a * T.dustK * (0.7 + 0.3 * Math.sin(t * 1.3 + m.ph * 3)); ctx.drawImage(motes[m.d], x - size, y - size, 2 * size, 2 * size); ctx.restore();
      }
  }
  const GROUND = {
    id: "ground", kind: "ground", from: 0, to: P.duration, layer: L,
    draw(ctx, t) {
      const pv = previewAt(t);
      if (S.isFull(t) && !pv) return;
      groundAt(ctx, t, pv ? g.H : top);
      // a preview of the next video has its own frame (the preview section below)
      if (pv) { PV[pv[2].preview].frame(ctx, pvGeom(pv, t, true), t, null); return; }
      // the frame: its shadow on the ground, the hole, its rim lit from above
      paintSprite(ctx, frameShadow, 0.9 * T.shade, g.box.x + g.box.w / 2, top + boxH / 2 + 12 * K);
      ctx.save(); ctx.globalCompositeOperation = "destination-out";
      roundRect(ctx, g.box.x, top, g.box.w, boxH, g.box.r);
      ctx.fillStyle = "#000"; ctx.fill(); ctx.restore();
      roundRect(ctx, g.box.x + 0.75, top + 0.75, g.box.w - 1.5, boxH, g.box.r);
      const rim = ctx.createLinearGradient(0, top, 0, top + 220 * K); rim.addColorStop(0, T.frameRim[0]); rim.addColorStop(1, T.frameRim[1]);
      ctx.strokeStyle = rim; ctx.lineWidth = 2 * K; ctx.stroke();
    },
  };
  S.beats.push(GROUND);
  // THE STAGE: every node alive, in its order, on a layer of its own above the speaker's frame,
  // faded out over its last 70 px (the ground shows through)
  const stg = createCanvas(g.W, Math.max(1, Math.round(top - 2 * K))), sx = stg.getContext("2d"), fadeH = 70 * K;
  const STAGE = {
    id: "stage", kind: "stage", from: 0, to: P.duration, layer: L,
    draw(ctx, t) {
      if (S.isFull(t)) return;
      const live = S.nodes.filter(n => n.alive(t)).sort((a, b) => a.z - b.z);
      if (!live.length) return;
      sx.clearRect(0, 0, stg.width, stg.height);
      for (const n of live) drawNode(sx, n, t);
      sx.save(); sx.globalCompositeOperation = "destination-out";
      const gr = sx.createLinearGradient(0, stg.height - fadeH, 0, stg.height); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.92)");
      sx.fillStyle = gr; sx.fillRect(0, stg.height - fadeH, g.W, fadeH); sx.restore();
      const pk = punchBack(t);
      if (pk) { ctx.save(); ctx.translate(C.x, C.y); ctx.scale(pk.s, pk.s); ctx.translate(-C.x, -C.y); if (pk.blur > 0.4) ctx.filter = `blur(${pk.blur.toFixed(1)}px)`; ctx.drawImage(stg, 0, 0); ctx.restore(); }
      else ctx.drawImage(stg, 0, 0);
    },
    cues: () => thin([...S.nodes.flatMap(n => n.sfx), ...S.extra].filter(c => c && !S.isFull(c.t - 0.02))),
  };
  S.beats.push(STAGE);

  // The small sounds never crowd: a light one within 0.15 s of a big one (a scene's whoosh, the
  // flash, the glitch) is dropped, the big one carries it; a light one closer than 70 ms to
  // another light one too, or than 0.1 s to one of its own role
  const LIGHT = new Set(Object.keys(MX));
  function thin(cues) {
    const out = [], sorted = cues.slice().sort((a, b) => a.t - b.t);
    const big = [...sorted.filter(c => !LIGHT.has(c.role) && /whoosh|flash|glitch/.test(c.kind)), ...BIG];
    for (const c of sorted) {
      if (LIGHT.has(c.role)) {
        if (big.some(b => Math.abs(b.t - c.t) < 0.15)) continue;
        if (out.some(o => LIGHT.has(o.role) && (Math.abs(o.t - c.t) < 0.07 || (o.role === c.role && Math.abs(o.t - c.t) < 0.1)))) continue;
      }
      out.push(c);
    }
    return out;
  }

  // ── the figures ────────────────────────────────────────────────────────────────────────
  const add = (kind, at, o) => { const n = new Node(S, kind, at, o); S.nodes.push(n); return n; };
  // the sound of an entrance, unless the figure says otherwise (sfx: null, or a name): a swish for
  // what flies or rises in (a big one for what comes from far below), a pop for what pops, a
  // stretch for a line drawn, a tick for words, a flicker for a flicker
  const entranceSound = (n, at, o) => {
    if (o.sfx === null) return;
    const name = o.sfx ?? ({ left: "swish", right: "swish", rise: "swish", drop: "swish", up: "swishBig", pop: "pop", zoom: "pop", flip: "pop", blur: "popSoft", draw: "stretch", wipe: "stretch", words: "tick", type: "tick", flicker: "flicker" }[n.enter]);
    if (name) n.sound(at + (["left", "right", "rise", "drop", "up"].includes(n.enter) ? 0.04 : 0), name);
  };
  // a figure placed while the camera brings its scene in (or while a push opens it) is already
  // there: it arrives WITH the camera, silent (the scene's whoosh carries it)
  S.riding = at => { const sc = scenes[S.cur]; const w = sc.din || (sc.kin === "push" || sc.kin === "pull" ? 0.4 : 0); return S.cur > 0 && w > 0 && at >= sc.t0 - 0.01 && at <= sc.t0 + w + 0.02; };
  const fig = (kind, at, o, defaults) => {
    const ride = o.enter === undefined && S.riding(at);
    const opts = { ...defaults, ...o, ...(ride ? { enter: "none", sfx: o.sfx ?? null } : {}) };
    const n = add(kind, at, opts); entranceSound(n, at, opts); return n;
  };

  // THE TITLE: two lines at the top, the words rising one after the other out of a blur, then a
  // flicker of light; `*word*` in the serif, `red: 0|1` a red box swept behind a line,
  // `underline` a red rule drawn under the last one. A new title takes the place of the last.
  let lastTitle = null;
  S.title = (at, lines, o = {}) => {
    // the old title rises out first (0.2 s), the new words start as it clears; a title set as a
    // breather ends replaces the old one unseen (cut at the breather's start)
    const replacing = lastTitle && lastTitle.t1 > at;
    const breath = FULL.find(([a, b]) => at >= a - 0.01 && at <= b + 0.35);
    if (replacing && breath) { lastTitle.out(breath[0], "cut"); at = Math.max(at, breath[1]); }
    else if (replacing) lastTitle.out(at, "up", 0.2);
    if (replacing && !breath && o.delay == null) o = { ...o, delay: 0.16 };
    const yc = ((o.y ?? g.title.y1 / g.H) * g.H + ((lines.length - 1) * (o.lead ?? 55.5) * g.KY) / 2 - 20 * K) / g.H;
    const n = add("title", at, { enter: "none", until: o.until, ...o, screen: true, baseline: o.y ?? g.title.y1 / g.H, x: 0.5, y: yc, float: false });
    n.local = true; n.w = g.W; n.h = g.H;
    n.o.lines = lines.map(runs);
    n.enterDur = 0.06 * lines.join(" ").split(/\s+/).length + 0.5;
    const near = S.extra.some(c => c && Math.abs(c.t - at) < 0.35 && /whoosh/.test(c.kind));
    if (o.sfx !== null && !near) n.sound(at, o.sfx ?? "whooshOut");
    if (o.sfx !== null) {
      const nw = lines.join(" ").split(/\s+/).length, d = o.delay ?? 0;
      if (o.red != null) n.sound(at + d + 0.02, "swish");
      n.sound(at + d + 0.06 * nw + 0.1 + 0.05, "flicker");             // the flicker of light
    }
    lastTitle = n;
    return n;
  };
  P8.title = (ctx, n, st, t) => {
    const size = (n.o.size ?? 55.7) * K, lead = (n.o.lead ?? 55.5) * g.KY, y1 = n.o.baseline * g.H;
    ctx.save(); ctx.translate(-st.x, -st.y);
    const nw = n.o.lines.map(l => l.map(r => r.t).join("")).join(" ").split(/\s+/).length;
    const fl = seg(t, n.t0 + 0.06 * nw + 0.1, 0.42), f = [1, 0.55, 1, 0.75, 1], p = fl * (f.length - 1), i0 = Math.min(f.length - 2, Math.floor(p));
    ctx.globalAlpha *= lerp(f[i0], f[i0 + 1], p - i0);
    n.o.lines.forEach((l, i) => {
      if (n.o.red !== i) return;
      const y = y1 + i * lead, w = measureRuns(ctx, l, size), px = 14 * K, top = y - size * 0.86, bh = size * 1.08;
      const u = ease("outExpo", seg(t, n.t0 + (n.o.delay ?? 0), 0.5));
      const gr = ctx.createLinearGradient(g.W / 2 - w / 2 - px, 0, g.W / 2 + w / 2 + px, 0);
      X.redBox.forEach((c, k) => gr.addColorStop(k / (X.redBox.length - 1), c));
      ctx.save(); ctx.shadowColor = "rgba(230,20,20,0.55)"; ctx.shadowBlur = 26 * K;
      ctx.fillStyle = gr; ctx.fillRect(g.W / 2 - w / 2 - px, top, (w + 2 * px) * u, bh); ctx.restore();
    });
    textShade(ctx, K, 0.62);
    revealWords(ctx, n.o.lines, size, lead, t, n.t0 + (n.o.delay ?? 0), { y0: y1, x0: g.W / 2, stagger: 0.06, lineColors: n.o.lines.map((_, i) => (n.o.red === i ? "#FFFFFF" : T.ink)) });
    noShade(ctx);
    if (n.o.underline) {
      const l = n.o.lines.at(-1), w = measureRuns(ctx, l, size), k = clamp01((t - n.t0 - 0.35) / 0.4), y = y1 + (n.o.lines.length - 1) * lead;
      ctx.save(); ctx.shadowColor = "rgba(230,20,20,0.6)"; ctx.shadowBlur = 12 * K;
      ctx.fillStyle = X.red; ctx.fillRect(g.W / 2 - w / 2, y + size * 0.2, w * ease("outExpo", k), 3 * K); ctx.restore();
    }
    ctx.restore();
  };

  // THE LIST: numbered bars (01, 02…) flying in from the left one after the other, the labels
  // blurred until each is said; .reveal(i, t) .focus(i, t) .unfocus(t) .header(i, t, at) .out(t)
  // A label may be { label, glyph: "check", glyphColor: "green" }: its verdict pops when said.
  S.list = (at, labels, o = {}) => {
    const n0 = labels.length;
    const fit = Math.min(1, (area.bottom - area.top) / ((n0 * (o.h ?? 143) + (n0 - 1) * (o.gap ?? 43)) * K));
    const bw = (o.w ?? 570) * Math.max(0.8, fit), bh = (o.h ?? 143) * fit, gap = (o.gap ?? 43) * fit;
    const totalH = (n0 * bh + (n0 - 1) * gap) * K;
    const yc = (o.y ?? C.y / g.H) * g.H, top = yc - totalH / 2, step0 = o.stagger ?? 0.07;
    const ph = hash(`list${at}`) * 6.28;
    const bars = labels.map((lab, i) => {
      const it = typeof lab === "string" ? { label: lab } : lab;
      const n = add("bar", at + i * step0, { num: String(i + 1 + (o.start ?? 0)).padStart(2, "0"), ...it, x: o.x ?? 0.5,
        y: (top + i * (bh + gap) * K + bh * K / 2) / g.H, w: bw, h: bh, until: o.until, size: o.size, enter: o.enter ?? (S.riding(at) ? "none" : "left"), phase: ph,
        state: { reveal: (o.revealed ?? []).includes(i) ? 1 : 0 } });
      if (o.sfx !== null && !S.riding(at)) n.sound(at + i * step0 + (i ? 0.12 : 0.04), i ? "tick" : "swish");
      return n;
    });
    const VERDICT = { check: "confirm", cross: "deny" };
    const said = [];
    const Lh = {
      bars,
      reveal(i, t) {
        bars[i].set(t, { reveal: 1 }, 0.32); bars[i].sound(t, "select"); said.push([i, t]);
        if (bars[i].o.glyph) bars[i].sound(t + 0.17, VERDICT[bars[i].o.glyph] ?? "popSmall");
        return Lh;
      },
      focus(i, t, v = 0.62) {
        bars.forEach((b, k) => (k === i ? b.lit(t).set(t, { hi: 1, s: 1.045 }, 0.3, "outBack") : b.dim(t, v).set(t, { hi: 0, s: 1 }, 0.3)));
        if (!said.some(([k, at]) => k === i && Math.abs(at - t) < 0.1)) bars[i].sound(t, "thump");
        return Lh;
      },
      unfocus(t) { bars.forEach(b => b.lit(t).set(t, { hi: 0, s: 1 }, 0.3)); return Lh; },
      header(i, t, p = {}) {
        if (lastTitle && lastTitle.t1 > t && p.keepTitle !== true) lastTitle.out(t, "up", 0.3);
        bars.forEach((b, k) => (k === i ? b.set(t, { reveal: 1, hi: 0 }, 0.2).lit(t).move(t, { x: p.x ?? 0.32, y: p.y ?? 0.125, s: p.s ?? 0.55 }, 0.6) : b.out(t + 0.03 * k, "left")));
        bars[i].sound(t, "swish");
        return bars[i];
      },
      out(t, kind = "left") { bars.forEach((b, k) => b.out(t + 0.04 * k, kind)); return Lh; },
    };
    return Lh;
  };

  S.pill = (at, text, o = {}) => fig("pill", at, { text, ...o }, { w: 300, h: 96, enter: "pop" });
  S.text = (at, text, o = {}) => fig("text", at, { text, ...o }, { w: 900, h: 120, enter: "words" });
  S.card = (at, o = {}) => fig("card", at, o, { w: 220, h: 390, enter: "rise", ...(/shots\//.test(o.img ?? "") && o.enter !== "none" ? { sfx: "shutter" } : {}) });
  S.icon = (at, o = {}) => fig("icon", at, o, { w: 220, h: 220, enter: "pop" });
  S.glyph = (at, kind, o = {}) => fig("glyph", at, { kind, ...o }, { w: 150, h: 150, enter: "pop", ...(o.tile === false ? { sfx: "popSmall" } : {}) });
  // a COUNTER climbing: the ratchet of a gear while it climbs, money when it lands on a price
  S.count = (at, o = {}) => {
    const ride = o.enter === undefined && S.riding(at), n = fig("count", at, o, { w: 700, h: 180, enter: "zoom", sfx: null });
    if (!ride && o.sfx !== null) { n.sound(at, "gear"); if (/[$€£]/.test(`${o.prefix ?? ""}${o.suffix ?? ""}`)) n.sound(at + (o.dur ?? 1.1) * 0.55, "money"); }
    return n;
  };
  S.sign = (at, text, o = {}) => fig("sign", at, { text, ...o }, { w: 90, h: 90, enter: "pop" });
  // a GRID of cards: items [{ img, label, glyph }], `rows` per row ([3, 2]), one after the other
  S.cards = (at, items, o = {}) => {
    const rows = o.rows ?? [items.length], cw = o.w ?? 220, ch = o.h ?? 390, gx = o.gapX ?? 60, gy = o.gapY ?? 70;
    const Hh = rows.length * ch + (rows.length - 1) * gy + (o.labels ? 34 * rows.length : 0);
    const top = (o.y ?? C.y / g.H) * g.H - (Hh * K) / 2;
    const out = []; let k = 0;
    rows.forEach((nr, r) => {
      const rowW = nr * cw + (nr - 1) * gx;
      for (let c = 0; c < nr && k < items.length; c++, k++) {
        const it = typeof items[k] === "string" ? { img: items[k] } : items[k];
        const x = ((o.x ?? 0.5) * g.W - (rowW * K) / 2 + (c * (cw + gx) + cw / 2) * K) / g.W;
        const y = (top + (r * (ch + gy + (o.labels ? 34 : 0)) + (o.labels ? 34 : 0) + ch / 2) * K) / g.H;
        const t = Array.isArray(o.at) ? o.at[k] ?? at : at + k * (o.stagger ?? 0.09);
        const ride = o.enter === undefined && S.riding(t);
        const photo = /shots\//.test(it.img ?? "");
        out.push(S.card(t, { enter: ride ? "none" : o.enter ?? (r % 2 ? "rise" : "drop"), ...o.card, ...it, x, y, w: cw, h: ch, until: o.until, label: it.label,
          sfx: ride || o.sfx === null ? null : photo ? "shutter" : k === 0 ? undefined : "tick" }));
      }
    });
    return out;
  };
  // a PHONE rising from the bottom of the stage; .show(i, t) slides screen i up into it
  S.phone = (at, o = {}) => { const n = fig("phone", at, { ...o, state: { screen: 0 } }, { w: 470, h: 960, enter: "up" }); n.show = (i, t, d = 0.42) => { n.set(t, { screen: i }, d, "inOutExpo"); n.sound(t, "swish"); return n; }; return n; };
  // CONNECTORS from a parent to its children, drawn on with a spark riding the tip
  S.wires = (at, parent, children, o = {}) => {
    const dir = o.dir ?? "down", paths = [];
    const box = n => { const st = n.state(Math.max(at, n.t0 + n.enterDur) + 0.05); return { x: st.x, y: st.y, w: n.w * st.s, h: n.h * st.s }; };
    const p = box(parent);
    if (dir === "down") {
      const busY = (p.y + p.h / 2 + Math.min(...children.map(c => box(c).y - box(c).h / 2))) / 2;
      for (const c0 of children) { const c = box(c0); paths.push([[p.x, p.y + p.h / 2], [p.x, busY], [c.x, busY], [c.x, c.y - c.h / 2]]); }
    } else {
      const busX = (p.x + p.w / 2 + Math.min(...children.map(c => box(c).x - box(c).w / 2))) / 2;
      for (const c0 of children) { const c = box(c0); paths.push([[p.x + p.w / 2, p.y], [busX, p.y], [busX, c.y], [c.x - c.w / 2, c.y]]); }
    }
    const n = add("wires", at, { enter: "draw", enterDur: o.dur ?? 0.42, until: o.until, paths, ...o, x: 0, y: 0, float: false, mb: false });
    n.local = true; n.x = 0; n.y = 0; n.w = g.W; n.h = g.H;
    if (o.sfx !== null) n.sound(at, o.sfx ?? "stretch");
    return n;
  };
  // a TREE: a parent and its children (nodes, or pill texts) dropping in, each wired as it comes
  S.tree = (at, parent, kids, o = {}) => {
    const dir = o.dir ?? "down", n = kids.length, cw = o.w ?? 290, ch = o.h ?? 120, gap = o.gap ?? 36;
    const children = kids.map((k, i) => {
      if (k instanceof Node) return k;
      const t = Array.isArray(o.at) ? o.at[i] : at + 0.25 + i * (o.stagger ?? 0.14);
      const it = typeof k === "string" ? { text: k } : k;
      if (dir === "down") {
        const total = n * cw + (n - 1) * gap, x = ((o.x ?? 0.5) * g.W - (total * K) / 2 + (i * (cw + gap) + cw / 2) * K) / g.W;
        return S.pill(t, it.text, { enter: "drop", ...it, x, y: o.y ?? 0.33, w: cw, h: ch, size: o.size ?? 28, until: o.until, blur: (o.hidden ?? []).includes(i) ? 12 * K : 0 });
      }
      const total = n * ch + (n - 1) * gap, y = ((o.y ?? 0.4) * g.H - (total * K) / 2 + (i * (ch + gap) + ch / 2) * K) / g.H;
      return S.pill(t, it.text, { enter: "right", ...it, x: o.x ?? 0.7, y, w: cw, h: ch, size: o.size ?? 28, until: o.until, blur: (o.hidden ?? []).includes(i) ? 12 * K : 0 });
    });
    const wires = children.map((c, i) => S.wires(Math.max(at, c.t0) + 0.05, parent, [c], { dir, until: o.until, sfx: i === 0 ? undefined : null }));
    return { parent, children, wires, reveal(i, t) { children[i].blurTo(t, 0, 0.3); children[i].sound(t, "select"); return this; }, out(t) { [...wires, ...children].forEach(c => c.out(t)); return this; } };
  };
  S.arrow = (at, a, b, o = {}) => { const n = add("arrow", at, { enter: "draw", enterDur: o.dur ?? 0.36, a: [a[0] * g.W, a[1] * g.H], b: [b[0] * g.W, b[1] * g.H], ...o, x: 0, y: 0, float: false, mb: false }); n.local = true; n.x = 0; n.y = 0; n.w = g.W; n.h = g.H; if (o.sfx !== null) n.sound(at, o.sfx ?? "stretch"); return n; };
  // RINGS (ring: true) or sparks round a node; silent unless asked (sfx: "ping")
  S.ping = (at, target, o = {}) => {
    const st = target.state(Math.max(at, target.t0 + target.enterDur));
    const n = add("ping", at, { x: st.x / g.W, y: st.y / g.H, w: target.w * st.s / K, h: target.h * st.s / K, until: at + (o.dur ?? 0.8), exit: "cut", enter: "none", z: 5, float: false, mb: false, ...o });
    n.scene = target.scene;
    if (o.sfx) n.sound(at, o.sfx);
    return n;
  };
  // AN EQUATION: rows of [node or text, "+", node, "=", node]; texts become pills
  S.equation = (at, rows, o = {}) => {
    const out = [], cw = o.w ?? 230, ch = o.h ?? 110, sg = o.sign ?? 70;
    rows.forEach((row, r) => {
      const y = (o.y ?? 0.4) + (r - (rows.length - 1) / 2) * (o.rowGap ?? 0.085);
      const widths = row.map(it => (typeof it === "string" && /^[+=×x→]$|^vs$/i.test(it) ? sg : it instanceof Node ? it.w / K : cw));
      const total = widths.reduce((s, v) => s + v, 0) + (row.length - 1) * 18;
      let x = (o.x ?? 0.5) * g.W - (total * K) / 2;
      row.forEach((it, i) => {
        const wpx = widths[i] * K, cx = (x + wpx / 2) / g.W;
        const t = Array.isArray(o.at) ? o.at[r] ?? at : at + r * (o.stagger ?? 0.3) + i * 0.07;
        if (it instanceof Node) it.move(t, { x: cx, y }, 0.5);
        else if (typeof it === "string" && /^[+=×x→]$|^vs$/i.test(it)) out.push(S.sign(t, it, { x: cx, y, size: /vs/i.test(it) ? 64 : 56, until: o.until, sfx: /vs/i.test(it) ? "glitch" : "button", color: o.signColor }));
        else out.push(S.pill(t, it, { x: cx, y, w: cw, h: ch, size: o.size ?? 24, until: o.until, sfx: i === 0 ? undefined : null }));
        x += wpx + 18 * K;
      });
    });
    return out;
  };
  S.file = (at, o = {}) => fig("file", at, o, { w: 240, h: 240, enter: "pop" });
  // A PROMPT box: typed letter by letter from `typeFrom` (0.25 s after it lands) to `typeTo`
  S.prompt = (at, o = {}) => {
    const n = fig("prompt", at, { ...o, state: { type: 0 } }, { w: 860, h: 230, enter: "rise" });
    const a = o.typeFrom ?? at + 0.25, d = Math.max(0.3, (o.typeTo ?? a + 1.4) - a);
    n.set(a, { type: 1 }, d, "linear");
    if (o.sfx !== null) { n.sound(a, "typing", undefined, { len: d }); n.sound(a + d + 0.05, "confirm"); }
    return n;
  };
  // DOCUMENT pages in a grid, dropping in one after the other; .light(i, t) tints one green
  S.docs = (at, n0, o = {}) => {
    const cols = o.cols ?? 3, pw = o.w ?? 230, ph = o.h ?? 230, gp = o.gap ?? 34, rows = Math.ceil(n0 / cols);
    const top = (o.y ?? C.y / g.H) * g.H - ((rows * ph + (rows - 1) * gp) * K) / 2;
    const pages = Array.from({ length: n0 }, (_, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = ((o.x ?? 0.5) * g.W + ((c - (cols - 1) / 2) * (pw + gp)) * K) / g.W, y = (top + (r * (ph + gp) + ph / 2) * K) / g.H;
      return S.card(at + (o.stagger ?? 0.06) * i, { docs: true, x, y, w: pw, h: ph, seed: i * 7 + 3, img: o.imgs?.[i], until: o.until, state: { tint: 0 }, enter: "drop", r: 3, sfx: i === 0 ? undefined : "tick" });
    });
    return { pages, light(i, t) { pages[i].set(t, { tint: 1 }, 0.2); pages[i].sound(t, "select"); return this; }, out(t) { pages.forEach((p, k) => p.out(t + 0.03 * k, "sink")); return this; } };
  };
  S.callout = (at, a, b, text, o = {}) => { const n = add("callout", at, { enter: "draw", enterDur: 0.32, a: [a[0] * g.W, a[1] * g.H], b: [b[0] * g.W, b[1] * g.H], text, ...o, x: 0, y: 0, float: false, mb: false }); n.local = true; n.x = 0; n.y = 0; n.w = g.W; n.h = g.H; if (o.sfx !== null) n.sound(at, o.sfx ?? "stretch"); return n; };
  S.wave = (at, o = {}) => fig("wave", at, o, { w: 330, h: 90, enter: "pop" });
  // A MARK on a node at t: "box" (swept behind it), "frame", "underline", "strike", "circle"
  S.mark = (at, target, o = {}) => {
    const st = target.state(Math.max(at, target.t0 + target.enterDur));
    const n = add("mark", at, { kind: "circle", ...o, enter: "draw", enterDur: o.dur ?? 0.42, x: st.x / g.W, y: st.y / g.H, w: (o.w ?? target.w * st.s / K), h: (o.h ?? target.h * st.s / K), z: o.kind === "box" ? target.z - 1 : target.z + 1, float: false });
    n.scene = target.scene;
    if (o.sfx !== null) n.sound(at, o.sfx ?? (o.kind === "box" ? "swish" : "stretch"));
    return n;
  };
  // A RISER ending dead on t (its stop is the accent)
  S.riser = (t, gain) => { S.extra.push(S.snd("riser", t, gain)); };
  // a SOUND alone at t (a role of the light pack, or one of the house's names)
  S.sound = (t, name, gain) => { S.extra.push(S.snd(name, t, gain)); };
  // A WHITE FLASH over everything at t (the change of shot), with the pack's camera flash
  S.flash = (at, o = {}) => {
    const up = 0.075, hold = 0.045, down = 0.095, peak = o.peak ?? 0.82, top0 = at - hold / 2, top1 = at + hold / 2, from = top0 - up, to = top1 + down;
    S.beats.push({ id: `flash-${at}`, kind: "flash", from, to, layer: "over",
      draw(ctx, t) { if (t < from || t > to) return; const k = t < top0 ? Math.pow(clamp01((t - from) / up), 1.6) : t <= top1 ? 1 : 1 - EASE.outCubic(clamp01((t - top1) / down)); if (k <= 0.004) return; ctx.save(); ctx.fillStyle = `rgba(255,255,255,${(peak * k).toFixed(3)})`; ctx.fillRect(0, 0, g.W, g.H); ctx.restore(); },
      cues: () => (o.sfx === null ? [] : [S.snd("flash", at)]) });
  };
  // everything of the current scene leaves at t (the title stays): blur, sink, left…
  S.clear = (t, kind = "blur", { keepTitle = true } = {}) => { let k = 0; for (const n of S.nodes) if (n.alive(t) && n.t1 > t && n.scene === S.cur && !(keepTitle && n.kind === "title")) n.out(t + 0.025 * k++, kind); };

  // ── THE BREATHERS: how the cut to full screen, and back, is dressed ─────────────────────────
  // project.json stage.breath (EXPLAINER_BREATH=<name> to compare without touching it):
  //   flash  · a hard cut under a white flash and the camera flash (the reference's)
  //   expand · the speaker's frame grows to the whole screen in 0.42 s while the stage recedes,
  //            its rim lit, and shrinks back into place
  //   punch  · a hard cut onto the full shot zoomed in that snaps back (a zoom blur, a chromatic
  //            split, a light flash); on the way back the stage punches in
  //   glitch · a digital glitch: torn slices, a chromatic split, scanlines, a burst of noise
  //   leak   · a warm light leak sweeping across the cut, the film burn of the shelf under it
  //   whip   · a vertical whip pan: the split rises out, the full shot rises in (motion blur)
  // The ones that move the picture draw the take's own frames (extracted once into tmp/breath/,
  // with the person matte for the head out of the frame), on the over layer, over everything.
  const BREATH = String(process.env.EXPLAINER_BREATH || breath || P.stage?.breath || "flash");
  const BIG = [];                                         // the breathers' sounds: the light ones give way
  const FR = new Map(), NEED = new Map();                 // output frame → { img, person } · → with the person
  const want = (t0, t1, person = false) => { for (let k = Math.max(0, Math.ceil(t0 * fps - 1e-6)); k / fps < t1 - 1e-6 && k / fps <= P.duration; k++) NEED.set(k, NEED.get(k) || person); };
  const frameAt = t => FR.get(Math.round(t * fps)) ?? null;
  S.loadBreath = async () => {
    if (!NEED.size) return;
    if (!P.source || !fs.existsSync(P.source)) { console.error("  ⚠ explainer: the source is not found: the breathers are drawn without their frames"); return; }
    const dir = path.resolve(process.cwd(), "tmp", "breath"); fs.mkdirSync(dir, { recursive: true });
    const pr = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", P.source], { encoding: "utf8" });
    const [sw, sh] = pr.stdout.trim().split(",").map(Number);
    for (const [k, person] of [...NEED].sort((x, y) => x[0] - y[0])) {
      const name = path.join(dir, `f${String(k).padStart(5, "0")}`), tmpf = ext => `${name}.${process.pid}.${ext}`;
      if (!fs.existsSync(`${name}.jpg`)) {
        spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", outToSrc(k / fps, P).toFixed(4), "-i", P.source, "-frames:v", "1", "-q:v", "2", tmpf("jpg")]);
        if (fs.existsSync(tmpf("jpg"))) fs.renameSync(tmpf("jpg"), `${name}.jpg`);
      }
      const m = path.resolve(process.cwd(), "matte", `m${String(k + 1).padStart(5, "0")}.png`);
      if (person && sw && fs.existsSync(m) && fs.existsSync(`${name}.jpg`) && !fs.existsSync(`${name}.png`)) {
        spawnSync("ffmpeg", ["-v", "error", "-y", "-i", `${name}.jpg`, "-i", m, "-filter_complex", `[1:v]scale=${sw}:${sh},format=gray[a];[0:v][a]alphamerge`, "-frames:v", "1", tmpf("png")]);
        if (fs.existsSync(tmpf("png"))) fs.renameSync(tmpf("png"), `${name}.png`);
      }
      FR.set(k, { img: fs.existsSync(`${name}.jpg`) ? await loadImage(`${name}.jpg`) : null, person: person && fs.existsSync(`${name}.png`) ? await loadImage(`${name}.png`) : null });
    }
  };
  // the take laid out as the build lays it: across the speaker's frame, or full screen
  // (shot by shot when the take has several: its crop, its full framing)
  const XSAt = t => ({ x: g.box.x, y: Math.round(g.box.top - g.cropAt(t) * g.bh), w: g.box.w, h: g.bh });
  const XFull = (f, t) => { const F = { ...g.full, ...(t != null && g.shots.length ? g.fullAt(t) : {}), ...(f ?? {}) }, q = 1 / Math.max(1, F.zoom), fx = Math.min(1 - q, Math.max(0, F.x - q / 2)), fy = Math.min(1 - q, Math.max(0, F.y - F.topAt * q)); return { x: -fx / q * g.W, y: -fy / q * g.H, w: g.W / q, h: g.H / q }; };
  const mix4 = (A, B, k) => ({ x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), w: lerp(A.w, B.w, k), h: lerp(A.h, B.h, k), r: lerp(A.r ?? 0, B.r ?? 0, k) });
  const BOXR = { x: g.box.x, y: g.box.top, w: g.box.w, h: g.H - g.box.top + 2 * g.box.r, r: g.box.r }, FULLR = { x: 0, y: 0, w: g.W, h: g.H, r: 0 };
  // a whole-frame painting with motion blur: `paint(c, t)` at N instants over the shutter, averaged
  const bt = createCanvas(g.W, g.H), btx = bt.getContext("2d"), ba = createCanvas(g.W, g.H), bax = ba.getContext("2d");
  function blurred(ctx, t, N, paint, shutter = SHUTTER) {
    if (N <= 1) { ctx.save(); paint(ctx, t); ctx.restore(); return; }
    bax.clearRect(0, 0, g.W, g.H); bax.globalCompositeOperation = "lighter";
    for (let i = 0; i < N; i++) { btx.clearRect(0, 0, g.W, g.H); btx.save(); paint(btx, t - shutter * i / (N - 1)); btx.restore(); bax.globalAlpha = 1 / N; bax.drawImage(bt, 0, 0); }
    bax.globalAlpha = 1; bax.globalCompositeOperation = "source-over";
    ctx.drawImage(ba, 0, 0);
  }
  // the picture split into its red, green and blue, moved d px apart (the sum of the three is the
  // picture): what a lens does at the edge, what a glitch does everywhere
  const chc = createCanvas(g.W, g.H), chx = chc.getContext("2d"), cho = createCanvas(g.W, g.H), chox = cho.getContext("2d");
  function chroma(img, T, d) {
    chox.globalCompositeOperation = "source-over"; chox.fillStyle = "#000"; chox.fillRect(0, 0, g.W, g.H);
    for (const [col, dx] of [["#FF0000", d], ["#00FF00", 0], ["#0000FF", -d]]) {
      chx.globalCompositeOperation = "source-over"; chx.clearRect(0, 0, g.W, g.H); chx.drawImage(img, T.x + dx, T.y, T.w, T.h);
      chx.globalCompositeOperation = "multiply"; chx.fillStyle = col; chx.fillRect(0, 0, g.W, g.H);
      chx.globalCompositeOperation = "destination-in"; chx.drawImage(img, T.x + dx, T.y, T.w, T.h);
      chox.globalCompositeOperation = "lighter"; chox.drawImage(chc, 0, 0);
    }
    chox.globalCompositeOperation = "source-over";
    return cho;
  }
  const scan = (() => { const c = createCanvas(g.W, 6), x = c.getContext("2d"); x.fillStyle = "rgba(0,0,0,0.9)"; x.fillRect(0, 0, g.W, 2); return c; })();
  const noise = (() => { const c = createCanvas(360, 64), x = c.getContext("2d"), im = x.createImageData(360, 64); let sd = 11; for (let i = 0; i < im.data.length; i += 4) { sd = (sd * 16807) % 2147483647; const v = (sd / 2147483647) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); return c; })();
  // the split view as the build composes it at ts (the ground, the stage, the take in its frame,
  // the head out of it), for the whip
  const spl = createCanvas(g.W, g.H), splx = spl.getContext("2d");
  function splitView(ts, fr) {
    splx.clearRect(0, 0, g.W, g.H);
    GROUND.draw(splx, ts); STAGE.draw(splx, ts);
    splx.save(); splx.globalCompositeOperation = "destination-over"; splx.fillStyle = "#000"; splx.fillRect(0, 0, g.W, g.H); splx.restore();
    if (fr?.img) {
      const XS = XSAt(ts);
      splx.save(); roundRect(splx, BOXR.x, BOXR.y, BOXR.w, BOXR.h, BOXR.r); splx.clip(); splx.drawImage(fr.img, XS.x, XS.y, XS.w, XS.h); splx.restore();
      if (fr.person) { splx.save(); splx.beginPath(); splx.rect(0, 0, g.W, BOXR.y); splx.clip(); splx.drawImage(fr.person, XS.x, XS.y, XS.w, XS.h); splx.restore(); }
    }
    return spl;
  }
  const morphs = [], punches = [];
  // the caption follows a frame that grows: its place and size between the split's and the full's
  function breathK(t) { for (const m of morphs) if (t >= m.from && t < m.to) return m.k(t); return null; }
  function punchBack(t) { for (const [a, d] of punches) if (t >= a && t < a + d) { const u = seg(t, a, d); return { s: lerp(1.08, 1, ease("outExpo", u)), blur: 9 * K * Math.pow(1 - u, 2) }; } return null; }
  // (half a frame of margin: a frame's time is a sum of floats, 20.666…664 for the cut at 20.666…668;
  // each drawing keeps its own exact bounds)
  const beat = (id, from, to, draw, cues) => S.beats.push({ id, kind: "breath", from: from - 0.5 / fps, to: to + 0.5 / fps, layer: "over", draw, cues });
  const sounds = list => () => list.filter(Boolean);
  const big = c => { if (c) BIG.push(c); return c; };

  // EXPAND: the frame grows to the whole screen (inOutCubic, 0.5 s: a quintic peaks too fast and
  // smears the face), the stage recedes under a veil, the frame's rim lit while it moves, its
  // shadow on the stage; the head stays out of it; a 108° shutter (the face stays readable)
  const EXP = 0.5, EXS = SHUTTER * 0.6;
  function expandAt(c, fr, k, XF, XS) {
    const T = mix4(XS, XF, k), M = mix4(BOXR, FULLR, k), mv = Math.sin(Math.PI * clamp01(k));
    if (k > 0.002) { c.fillStyle = `rgba(${T.veilRGB},${(0.62 * k).toFixed(3)})`; c.fillRect(0, 0, g.W, g.H); }
    if (mv > 0.01) { c.save(); c.shadowColor = shadeC(0.75 * mv); c.shadowBlur = 60 * K; c.shadowOffsetY = 24 * K; roundRect(c, M.x, M.y, M.w, M.h, M.r); c.fillStyle = "#000"; c.fill(); c.restore(); }
    c.save(); roundRect(c, M.x, M.y, M.w, M.h, M.r); c.clip(); c.drawImage(fr.img, T.x, T.y, T.w, T.h); c.restore();
    if (mv > 0.01) { c.save(); roundRect(c, M.x + 1, M.y + 1, M.w - 2, M.h - 2, M.r); c.strokeStyle = `rgba(255,255,255,${(0.7 * mv).toFixed(3)})`; c.lineWidth = 2.5 * K; c.shadowColor = `rgba(255,255,255,${(0.6 * mv).toFixed(3)})`; c.shadowBlur = 28 * K; c.stroke(); c.restore(); }
    if (fr.person && M.y > 1) { c.save(); c.beginPath(); c.rect(0, 0, g.W, M.y + 0.5); c.clip(); c.drawImage(fr.person, T.x, T.y, T.w, T.h); c.restore(); }
  }
  function breathExpand([a, b, f]) {
    const XF = XFull(f, a);
    const go = (from, to, k, frozen, cues) => {
      want(from, to, true); if (frozen != null) want(frozen, frozen + 1e-3, true);
      morphs.push({ from, to, k });
      beat(`breath-${from.toFixed(2)}`, from, to, (ctx, t) => {
        if (t < from - 1e-4 || t >= to - 1e-4) return;
        const fr = frameAt(frozen ?? t); if (!fr?.img) return;
        const M0 = mix4(BOXR, FULLR, k(t)), M1 = mix4(BOXR, FULLR, k(t - EXS)), disp = Math.abs(M0.y - M1.y) + Math.abs(M0.x - M1.x) + Math.abs(M0.w - M1.w) * 0.5;
        const XS = XSAt(from < a ? a - 1 / fps : b);
        blurred(ctx, t, Math.min(10, Math.max(1, Math.round(disp / 4))), (c, tt) => expandAt(c, fr, k(tt), XF, XS), EXS);
      }, sounds(cues));
    };
    // a window with its own framing is another shot: it grows from its own first frame
    if (a > EXP + 0.2) go(a - EXP, a, t => ease("inOutCubic", seg(t, a - EXP, EXP)), f ? a : null, [big(S.snd("swishBig", a - EXP * 0.45)), big(S.snd("thump", a))]);
    if (b < P.duration - EXP - 0.2) go(b, b + EXP, t => 1 - ease("inOutCubic", seg(t, b, EXP)), null, [big(S.snd("swish", b + EXP * 0.45)), big(S.snd("popSoft", b + EXP))]);
  }

  // PUNCH: the full shot arrives 1.24x and snaps back (outExpo, 0.38 s) with a zoom blur, a
  // chromatic split and a light flash; back to the split, the stage punches in from 1.08x
  const PUN = 0.38;
  function breathPunch([a, b, f]) {
    const XF = XFull(f, a);
    if (a > 0.3) {
      want(a, a + PUN);
      beat(`breath-${a.toFixed(2)}`, a, a + PUN, (ctx, t) => {
        if (t < a - 1e-4 || t >= a + PUN) return;
        const fr = frameAt(t); if (!fr?.img) return;
        const u = seg(t, a, PUN), sc = lerp(1.24, 1, ease("outExpo", u)), cx = g.W / 2, cy = g.H * 0.36, spread = 0.09 * Math.pow(1 - u, 2.2);
        const at = s => ({ x: cx + (XF.x - cx) * s, y: cy + (XF.y - cy) * s, w: XF.w * s, h: XF.h * s });
        const d = 16 * K * Math.max(0, 1 - u / 0.3);
        const pic = s => (d > 0.5 ? (() => { const o = chroma(fr.img, at(s), d); return { img: o, T: { x: 0, y: 0, w: g.W, h: g.H } }; })() : { img: fr.img, T: at(s) });
        const n = spread > 0.004 ? 8 : 1;
        if (n === 1) { const p = pic(sc); ctx.drawImage(p.img, p.T.x, p.T.y, p.T.w, p.T.h); }
        else {
          // the zoom blur: copies of the picture spread outwards from the face, averaged
          const base = pic(sc), src = base.img === fr.img ? null : base.img;
          bax.clearRect(0, 0, g.W, g.H); bax.globalCompositeOperation = "lighter";
          for (let i = 0; i < n; i++) {
            const s = 1 + spread * i / (n - 1);
            bax.globalAlpha = 1 / n;
            if (src) bax.drawImage(src, cx - cx * s, cy - cy * s, g.W * s, g.H * s);
            else { const T = at(sc * s); bax.drawImage(fr.img, T.x, T.y, T.w, T.h); }
          }
          bax.globalAlpha = 1; bax.globalCompositeOperation = "source-over";
          ctx.drawImage(ba, 0, 0);
        }
        const fl = Math.max(0, 1 - u / 0.42);
        if (fl > 0.01) { ctx.fillStyle = `rgba(255,255,255,${(0.55 * fl * fl).toFixed(3)})`; ctx.fillRect(0, 0, g.W, g.H); }
      }, sounds([big(S.snd("flash", a)), big(S.snd("thump", a + 0.01))]));
    }
    if (b < P.duration - 0.3) {
      punches.push([b, 0.34]);
      beat(`breath-${b.toFixed(2)}`, b, b + 0.2, (ctx, t) => { const u = seg(t, b, 0.2); if (u >= 1 || t < b - 1e-4) return; ctx.fillStyle = `rgba(255,255,255,${(0.4 * (1 - u) * (1 - u)).toFixed(3)})`; ctx.fillRect(0, 0, g.W, g.H); },
        sounds([big(S.snd("swish", b + 0.04)), big(S.snd("popSoft", b + 0.1))]));
    }
  }

  // GLITCH: nine frames of digital damage on the full shot (a chromatic split, torn slices,
  // scanlines, a band of noise), decaying; two frames of tears over the split before it
  const GL = 9 / fps;
  function glitchAt(ctx, fr, XF, e, k, pre) {
    const r = i => hash(`gl${k}:${i}`);
    if (pre) {
      // tears: bands of the full shot over the split, out of place, with coloured edges
      for (let i = 0; i < 6; i++) {
        const y = r(i) * g.H, h = (8 + 54 * r(i + 0.3)) * K, dx = (r(i + 0.6) - 0.5) * 180 * K;
        ctx.save(); ctx.beginPath(); ctx.rect(0, y, g.W, h); ctx.clip(); ctx.drawImage(fr.img, XF.x + dx, XF.y, XF.w, XF.h); ctx.restore();
        ctx.fillStyle = r(i + 0.9) > 0.5 ? "rgba(0,255,240,0.45)" : "rgba(255,30,60,0.45)"; ctx.fillRect(0, y, g.W, 2 * K);
      }
      return;
    }
    const pic = chroma(fr.img, XF, 22 * K * e);
    ctx.drawImage(pic, 0, 0);
    const nb = 2 + Math.round(6 * e);
    for (let i = 0; i < nb; i++) {
      const y = r(i) * g.H, h = (10 + 90 * r(i + 0.3)) * K, dx = (r(i + 0.6) - 0.5) * 220 * K * e;
      ctx.drawImage(pic, 0, y, g.W, h, dx, y, g.W, h);
    }
    if (e > 0.4 && r(9) > 0.45) { const y = r(10) * g.H, h = (20 + 50 * r(11)) * K; ctx.save(); ctx.globalAlpha = 0.55 * e; ctx.drawImage(noise, 0, 0, noise.width, noise.height, 0, y, g.W, h); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = 0.22 * e; for (let y = 0; y < g.H; y += 6) ctx.drawImage(scan, 0, y); ctx.restore();
  }
  function breathGlitch([a, b, f]) {
    const XF = XFull(f, a);
    if (a > 0.3) {
      want(a - 2 / fps, a + GL);
      beat(`breath-${a.toFixed(2)}`, a - 2 / fps, a + GL, (ctx, t) => {
        if (t < a - 2 / fps - 1e-4 || t >= a + GL - 1e-4) return;
        const pre = t < a - 1e-4, fr = frameAt(pre ? a : t); if (!fr?.img) return;
        glitchAt(ctx, fr, XF, pre ? 1 : Math.pow(1 - seg(t, a, GL), 1.5), Math.round(t * fps), pre);
      }, sounds([big(S.snd("glitch", a)), big(S.snd("flicker", a - 0.05))]));
    }
    if (b < P.duration - 0.3) {
      want(b - GL, b + 2 / fps);
      beat(`breath-${b.toFixed(2)}`, b - GL, b + 2 / fps, (ctx, t) => {
        if (t < b - GL - 1e-4 || t >= b + 2 / fps - 1e-4) return;
        const post = t >= b - 1e-4, fr = frameAt(post ? b - 1 / fps : t); if (!fr?.img) return;
        glitchAt(ctx, fr, XF, post ? 1 : Math.pow(seg(t, b - GL, GL), 1.5), Math.round(t * fps), post);
      }, sounds([big(S.snd("glitch", b - 0.12, -19)), big(S.snd("select", b))]));
    }
  }

  // LEAK: a warm light leak crossing the frame, its brightest on the cut (where it hides it),
  // a white core at the peak; the film burn of the shelf under it
  const BURN = path.resolve(process.cwd(), "assets", "sfx-burn.wav");
  if (BREATH === "leak" && !fs.existsSync(BURN)) {
    const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../assets/sfx/Film Burn Transition 2.wav");
    const tmpf = `${BURN}.${process.pid}.wav`;
    if (fs.existsSync(src)) spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-af", "aresample=48000:filter_size=64:phase_shift=10:cutoff=0.97,volume=-3dB", "-ac", "2", "-c:a", "pcm_s16le", tmpf]);
    if (fs.existsSync(tmpf)) fs.renameSync(tmpf, BURN);
  }
  function breathLeak([a, b]) {
    const leak = (t0, peak, t1, dir, strength, cues) => beat(`breath-${t0.toFixed(2)}`, t0, t1, (ctx, t) => {
      if (t < t0 || t > t1) return;
      const I = strength * (t < peak ? ease("inCubic", seg(t, t0, peak - t0)) : 1 - ease("outCubic", seg(t, peak, t1 - peak)));
      if (I <= 0.003) return;
      const u = seg(t, t0, t1 - t0), cx = dir > 0 ? lerp(-0.3 * g.W, 1.3 * g.W, u) : lerp(1.3 * g.W, -0.3 * g.W, u), cy = lerp(0.18 * g.H, 0.72 * g.H, u);
      ctx.save();
      ctx.fillStyle = `rgba(255,110,30,${(0.3 * I).toFixed(3)})`; ctx.fillRect(0, 0, g.W, g.H);
      for (const [dx, dy, R, c0, c1] of [[0, 0, 1.0, "255,200,120", "255,90,20"], [0.35, -0.25, 0.7, "255,120,60", "255,30,10"], [-0.4, 0.3, 0.6, "255,170,80", "200,40,10"]]) {
        const x = cx + dx * g.W, y = cy + dy * g.H, rr = R * g.H, gr = ctx.createRadialGradient(x, y, 0, x, y, rr);
        gr.addColorStop(0, `rgba(${c0},${(0.85 * I).toFixed(3)})`); gr.addColorStop(0.4, `rgba(${c1},${(0.5 * I).toFixed(3)})`); gr.addColorStop(1, `rgba(${c1},0)`);
        ctx.fillStyle = gr; ctx.fillRect(0, 0, g.W, g.H);
      }
      if (I > 0.78) { ctx.fillStyle = `rgba(255,246,232,${(0.85 * (I - 0.78) / 0.22).toFixed(3)})`; ctx.fillRect(0, 0, g.W, g.H); }
      ctx.restore();
    }, sounds(cues));
    const burn = (t, slice, align, gain) => (fs.existsSync(BURN) ? big({ t: +t.toFixed(3), kind: `sample:sfx-burn.wav${slice}`, gain, align, role: "burn" }) : big(S.snd("flash", t)));
    if (a > 0.3) leak(a - 0.3, a, a + 0.5, 1, 1, [burn(a, "", 1.0, -13)]);
    if (b < P.duration - 0.3) leak(b - 0.2, b, b + 0.36, -1, 0.8, [burn(b, ":0.55:1.2", 0.45, -17)]);
  }

  // WHIP: the camera whips down from the split to the full shot (inOutQuint, 0.36 s, motion
  // blur): the split view rises out, the full shot rises in; back, the reverse (a drop)
  const WH = 0.36;
  function breathWhip([a, b, f]) {
    const XF = XFull(f, a);
    const go = (from, mid, dir, splitAt, fullAt, cues) => {
      const to = from + WH, e = t => ease("inOutQuint", seg(t, from, WH));
      want(from - 1 / fps, to + 1 / fps, dir < 0); want(splitAt(from), splitAt(from) + 1e-3, true);
      morphs.push({ from, to, k: t => (dir > 0 ? (t >= mid ? 1 : 0) : (t >= mid ? 0 : 1)) });
      beat(`breath-${from.toFixed(2)}`, from, to, (ctx, t) => {
        if (t < from - 1e-4 || t >= to - 1e-4) return;
        const N = Math.min(16, Math.max(1, Math.round(Math.abs(e(t) - e(t - SHUTTER)) * g.H / 3)));
        const fs0 = splitAt(t), sv = splitView(fs0, frameAt(fs0)), ff = frameAt(fullAt(t));
        blurred(ctx, t, N, (c, tt) => {
          const y = e(tt) * g.H;
          if (dir > 0) { c.drawImage(sv, 0, -y); if (ff?.img) { c.save(); c.translate(0, g.H - y); c.beginPath(); c.rect(0, 0, g.W, g.H); c.clip(); c.drawImage(ff.img, XF.x, XF.y, XF.w, XF.h); c.restore(); } }
          else { if (ff?.img) { c.save(); c.translate(0, y); c.beginPath(); c.rect(0, 0, g.W, g.H); c.clip(); c.drawImage(ff.img, XF.x, XF.y, XF.w, XF.h); c.restore(); } c.drawImage(sv, 0, y - g.H); }
        });
      }, sounds(cues));
    };
    // in: the split as it was on the frame before the cut; the full shot from the cut on (or its first frame before)
    if (a > WH) go(a - WH / 2, a, 1, () => a - 1 / fps, t => Math.max(t, f ? a : t), [big(S.snd("whoosh", a))]);
    // back: the full shot as it was on its last frame; the split live from the cut on
    if (b < P.duration - WH) go(b - WH / 2, b, -1, t => Math.max(t, b), t => Math.min(t, b - 1 / fps), [big(S.snd("whoosh", b))]);
  }

  // ── THE PREVIEW of the next video ───────────────────────────────────────────────────────────
  // A window made by preview(a, b, style): not the talk any more but a glimpse of the next video,
  // in a frame of its own on the ground. The camera puts the clip in its rect; here: the frame
  // around it (on the ground's layer, a hole where the clip shows), its chrome (over the clip), its
  // entrance (the take's own frames, the clip moving into place, drawn over everything), its sound.
  function previewAt(t) { const w = windowAt(t, FULL, fps); return w && w[2]?.preview ? w : null; }
  const RK = r => ({ x: r.x * K, y: r.y * g.KY, w: r.w * K, h: r.h * g.KY });
  // the geometry of a preview at t: settled, or on its way in (u: 0 → 1 over its entrance)
  function pvGeom(w, t, settled = false) {
    const st = PV[w[2].preview], R = RK(w[2].rect), u = settled ? 1 : seg(t, w[0], st.enter);
    return { R, src: w[2].src, u, ...st.move(R, u, w) };
  }
  const clipIn = (c, img, src, G, r = 0) => { c.save(); roundRect(c, G.x, G.y, G.w, G.h, r); c.clip(); c.drawImage(img, src.x * img.width, src.y * img.height, src.w * img.width, src.h * img.height, G.x, G.y, G.w, G.h); c.restore(); };
  const holeIn = (c, G, r) => { c.save(); c.globalCompositeOperation = "destination-out"; roundRect(c, G.x, G.y, G.w, G.h, r); c.fillStyle = "#000"; c.fill(); c.restore(); };
  const lift = (c, G, r, a = 0.7, blur = 70, dy = 34) => { if (a <= 0.01) return; c.save(); c.shadowColor = shadeC(a); c.shadowBlur = blur * K; c.shadowOffsetY = dy * K; roundRect(c, G.x, G.y, G.w, G.h, r); c.fillStyle = "#000"; c.fill(); c.restore(); };
  const halo = (c, G, r, hc = "rgba(255,255,255,0.18)", blur = 48) => { if (!T.glowN && isNeutral(hc)) return; c.save(); c.shadowColor = hc; c.shadowBlur = blur * K; roundRect(c, G.x, G.y, G.w, G.h, r); c.fillStyle = "#000"; c.fill(); c.restore(); };
  const rimOf = (c, G, r, top = 0.85, bot = 0.3, wdt = 2.5) => { if (top <= 0.01) return; c.save(); roundRect(c, G.x + 0.75, G.y + 0.75, G.w - 1.5, G.h - 1.5, r); const gr = c.createLinearGradient(0, G.y, 0, G.y + G.h); gr.addColorStop(0, T.name === "light" ? T.rimTop : `rgba(255,255,255,${top.toFixed(3)})`); gr.addColorStop(1, T.name === "light" ? neutral(Math.min(0.2, bot * 0.5).toFixed(3)) : `rgba(255,255,255,${bot.toFixed(3)})`); c.strokeStyle = gr; c.lineWidth = wdt * K; c.stroke(); c.restore(); };
  // a pill of the chrome (dark glass, or a fill), a pictogram at its left, a label
  function pillAt(c, cx, cy, w, h, { fill = null, text = "", size = 28, ink = fill ? "#fff" : T.ink, glyph, rim = true, glow } = {}) {
    const r = h / 2, x = cx - w / 2, y = cy - h / 2;
    c.save(); c.shadowColor = shadeC(0.55); c.shadowBlur = 24 * K; c.shadowOffsetY = 10 * K; roundRect(c, x, y, w, h, r);
    if (fill) c.fillStyle = fill; else { const gr = c.createLinearGradient(x, y + h, x + w, y); gr.addColorStop(0, T.glass[0]); gr.addColorStop(0.35, T.glass[1]); gr.addColorStop(1, T.glass[2]); c.fillStyle = gr; }
    c.fill(); if (glow) { c.shadowColor = glow; c.shadowBlur = 26 * K; c.shadowOffsetY = 0; c.fill(); } c.restore();
    c.save(); roundRect(c, x, y, w, h, r); c.clip(); const gl = c.createLinearGradient(0, y, 0, y + h * 0.6); gl.addColorStop(0, `rgba(255,255,255,${fill ? 0.16 : T.gloss})`); gl.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gl; c.fillRect(x, y, w, h * 0.6); c.restore();
    if (rim) rimOf(c, { x, y, w, h }, r, 0.8, 0.28, 1.6);
    const s = size * K; let tx = cx;
    if (glyph) { c.save(); c.translate(x + h * 0.56, cy); drawGlyph(c, glyph, s * 1.1, { color: ink, fill: glyph === "play", width: 2.4 }); c.restore(); tx = cx + h * 0.24; }
    c.save(); c.font = `${s}px ${FONT.xb}`; c.letterSpacing = `${-0.01 * s}px`; c.fillStyle = ink; c.textAlign = "center"; c.textBaseline = "alphabetic"; c.fillText(text, tx, cy + s * 0.36); c.restore();
  }
  const popAt = (t, t0, d = 0.5) => Math.max(0, EASE.spring(clamp01((t - t0) / d)));
  // the title above the frame, the section titles' lockup, its words rising one after the other
  const titleOver = (c, w, t, t0) => { const ls = (w[2].title ?? ["Next Video", ...(w[2].name ? [w[2].name] : [])]).map(runs); c.save(); textShade(c, K, 0.62); revealWords(c, ls, 55.7 * K, 55.5 * g.KY, t, t0, { y0: g.title.y1, x0: g.W / 2, stagger: 0.06 }); c.restore(); };
  const nameOf = w => w[2].name ?? "The next video";
  const PV = {
    // CARD: the clip in a card on the ground, rising in on a spring; an "Up next" badge on its
    // corner, the title above, a red progress bar under it running to the end (nothing under it:
    // a "Stay tuned" there was too much, reviewed 2026-10-05)
    card: {
      enter: 0.62, captionY: 1270,
      move(R, u) { const e = EASE.spring(clamp01(u)), s = lerp(0.88, 1, e), w = R.w * s, h = R.h * s; return { G: { x: R.x + (R.w - w) / 2, y: R.y + (R.h - h) / 2 + (1 - e) * 0.6 * g.H, w, h }, r: 32 * K * s }; },
      frame(c, M, t, img) { lift(c, M.G, M.r); halo(c, M.G, M.r); if (img) clipIn(c, img, M.src, M.G, M.r); else holeIn(c, M.G, M.r); rimOf(c, M.G, M.r); },
      chrome(c, w, t) {
        const [a, b] = w, R = RK(w[2].rect);
        titleOver(c, w, t, a + 0.15);
        const kb = popAt(t, a + 0.42); if (kb > 0) { c.save(); c.translate(R.x + 132 * K, R.y + 4 * K); c.scale(kb, kb); pillAt(c, 0, 0, 236 * K, 66 * K, { fill: X.red, text: "UP NEXT", size: 26, glyph: "play", rim: false, glow: "rgba(255,30,30,0.55)" }); c.restore(); }
        const y = R.y + R.h + 40 * K, kw = ease("outCubic", clamp01((t - a - 0.45) / 0.35)), kp = clamp01((t - a - 0.55) / Math.max(0.5, b - a - 0.6));
        if (kw > 0) {
          c.save(); c.globalAlpha *= kw; roundRect(c, R.x, y, R.w, 8 * K, 4 * K); c.fillStyle = neutral(0.16); c.fill();
          c.shadowColor = "rgba(255,40,40,0.6)"; c.shadowBlur = 12 * K; roundRect(c, R.x, y, Math.max(8 * K, R.w * kp), 8 * K, 4 * K); c.fillStyle = X.hot; c.fill();
          c.shadowColor = T.glowN ? "rgba(255,255,255,0.7)" : shadeC(0.5); c.shadowBlur = 14 * K; c.beginPath(); c.arc(R.x + R.w * kp, y + 4 * K, 11 * K, 0, 7); c.fillStyle = "#fff"; c.fill(); c.restore();
        }
      },
      sounds: (a, b) => [S.snd("swishBig", a + 0.12), S.snd("pop", a + 0.45)],
    },
    // PHONE: the clip on a phone's screen, as the next short in a feed: the phone rises from below,
    // the feed's chrome on the clip (the tabs, the icons popping in, a like, the name, its progress)
    phone: {
      enter: 0.7, captionY: 1460,
      move(R, u) { const e = ease("outExpo", clamp01(u)); return { G: { x: R.x, y: R.y + (1 - e) * 0.78 * g.H, w: R.w, h: R.h }, r: 0 }; },
      frame(c, M, t, img) {
        const S0 = M.G, B = { x: S0.x - 28 * K, y: S0.y - 28 * K, w: S0.w + 56 * K, h: S0.h + 56 * K }, rb = 0.16 * B.w, rs = rb * 0.82;
        lift(c, B, rb, 0.75, 80, 40); halo(c, B, rb, "rgba(255,255,255,0.16)", 50);
        roundRect(c, B.x, B.y, B.w, B.h, rb); c.fillStyle = "#050506"; c.fill();
        roundRect(c, B.x, B.y, B.w, B.h, rb); const fr = c.createLinearGradient(B.x, B.y, B.x + B.w, B.y + B.h); fr.addColorStop(0, "rgba(255,255,255,0.88)"); fr.addColorStop(0.45, "rgba(255,255,255,0.3)"); fr.addColorStop(1, "rgba(255,255,255,0.6)"); c.strokeStyle = fr; c.lineWidth = 2.6 * K; c.stroke();
        c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 4 * K;
        for (const [x, y0, y1] of [[B.x + B.w + 2 * K, 0.22, 0.32], [B.x - 2 * K, 0.18, 0.23], [B.x - 2 * K, 0.27, 0.35]]) { c.beginPath(); c.moveTo(x, B.y + y0 * B.h); c.lineTo(x, B.y + y1 * B.h); c.stroke(); }
        if (img) clipIn(c, img, M.src, S0, rs); else holeIn(c, S0, rs);
        if (img) this.island(c, S0);
      },
      island(c, S0) { c.fillStyle = "#000"; roundRect(c, S0.x + S0.w / 2 - 0.17 * S0.w, S0.y + 16 * K, 0.34 * S0.w, 40 * K, 20 * K); c.fill(); },
      chrome(c, w, t) {
        const [a, b] = w, R = RK(w[2].rect), rs = 0.16 * (R.w + 56 * K) * 0.82, ke = ease("outCubic", clamp01((t - a - 0.55) / 0.3));
        titleOver(c, w, t, a + 0.2);
        c.save(); roundRect(c, R.x, R.y, R.w, R.h, rs); c.clip();
        if (t >= a + this.enter - 1e-4) this.island(c, R);          // (on its way in, the phone carries its own)
        if (ke > 0) {
          c.save(); c.globalAlpha *= ke;
          const gr = c.createLinearGradient(0, R.y + R.h * 0.62, 0, R.y + R.h); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.62)"); c.fillStyle = gr; c.fillRect(R.x, R.y + R.h * 0.62, R.w, R.h * 0.38);
          const gt = c.createLinearGradient(0, R.y, 0, R.y + 190 * K); gt.addColorStop(0, "rgba(0,0,0,0.45)"); gt.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gt; c.fillRect(R.x, R.y, R.w, 190 * K);
          c.shadowColor = "rgba(0,0,0,0.45)"; c.shadowBlur = 10 * K;
          c.textAlign = "center"; c.fillStyle = "rgba(255,255,255,0.62)"; c.font = `${28 * K}px ${FONT.sb}`; c.fillText("Following", R.x + R.w / 2 - 92 * K, R.y + 108 * K);
          c.fillStyle = "#fff"; c.font = `${30 * K}px ${FONT.b}`; c.fillText("For You", R.x + R.w / 2 + 78 * K, R.y + 108 * K); c.fillRect(R.x + R.w / 2 + 52 * K, R.y + 122 * K, 52 * K, 4 * K);
          c.textAlign = "left"; c.font = `${30 * K}px ${FONT.b}`; c.fillText("Next video", R.x + 34 * K, R.y + R.h - 150 * K);
          const nm = wrapRuns(c, nameOf(w), 26 * K, R.w - 170 * K); nm.slice(0, 2).forEach((l, i) => drawRuns(c, l, R.x + 34 * K, R.y + R.h - 106 * K + i * 34 * K, 26 * K, { align: "left", color: "rgba(255,255,255,0.92)", track: 0 }));
          c.restore();
        }
        // the icons, popping in one after the other; the heart is liked
        const like = clamp01((t - a - 1.5) / 0.35);
        ["heart", "comment", "bookmark", "share"].forEach((gk, i) => {
          const k = popAt(t, a + 0.55 + 0.09 * i, 0.45); if (k <= 0) return;
          const x = R.x + R.w - 66 * K, y = R.y + R.h - 560 * K + i * 116 * K, sc = k * (gk === "heart" && like > 0 ? 1 + 0.35 * Math.sin(Math.PI * like) : 1);
          c.save(); c.translate(x, y); c.scale(sc, sc); c.shadowColor = "rgba(0,0,0,0.45)"; c.shadowBlur = 12 * K;
          drawGlyph(c, gk, 64 * K, { color: gk === "heart" && like > 0.3 ? "#FE2C55" : "#FFFFFF", fill: true }); c.restore();
          if (gk === "heart" && like > 0 && like < 1) { c.save(); c.strokeStyle = `rgba(254,44,85,${(1 - like).toFixed(3)})`; c.lineWidth = 4 * K; c.beginPath(); c.arc(x, y, 40 * K + 50 * K * ease("outExpo", like), 0, 7); c.stroke(); c.restore(); }
        });
        const kp = clamp01((t - a - 0.6) / Math.max(0.5, b - a - 0.65));
        if (ke > 0) { c.fillStyle = "rgba(255,255,255,0.3)"; c.fillRect(R.x, R.y + R.h - 8 * K, R.w, 4 * K); c.fillStyle = "#fff"; c.fillRect(R.x, R.y + R.h - 8 * K, R.w * kp, 4 * K); }
        c.restore();
      },
      sounds: (a, b) => [S.snd("swishBig", a + 0.1), S.snd("pop", a + 0.56), S.snd("pop", a + 0.74), S.snd("ping", a + 1.5)],
    },
    // UP NEXT: the clip, full screen on the cut, shrinks into a card (an autoplay screen): "Up
    // next" and the name on it, a countdown ring round a play button filling to the end, the
    // buttons under it
    upnext: {
      enter: 0.5, captionY: 1350,
      move(R, u, w) {
        const k = 1 - ease("inOutCubic", clamp01(u)), s1 = w[2].src;
        return { G: { x: lerp(R.x, 0, k), y: lerp(R.y, 0, k), w: lerp(R.w, g.W, k), h: lerp(R.h, g.H, k) }, r: lerp(30 * K, 0, k), src: { x: lerp(s1.x, 0, k), y: lerp(s1.y, 0, k), w: lerp(s1.w, 1, k), h: lerp(s1.h, 1, k) }, k };
      },
      frame(c, M, t, img) { const v = 1 - (M.k ?? 0); lift(c, M.G, M.r, 0.7 * v); if (v > 0.02) halo(c, M.G, M.r, `rgba(255,255,255,${(0.16 * v).toFixed(3)})`, 46); if (img) clipIn(c, img, M.src, M.G, M.r); else holeIn(c, M.G, M.r); rimOf(c, M.G, M.r, 0.7 * v, 0.25 * v); },
      chrome(c, w, t) {
        const [a, b] = w, R = RK(w[2].rect), r = 30 * K, kc = ease("outCubic", clamp01((t - a - 0.42) / 0.35));
        if (kc <= 0) return;
        c.save(); c.globalAlpha *= kc;
        c.save(); roundRect(c, R.x, R.y, R.w, R.h, r); c.clip();
        c.fillStyle = "rgba(0,0,0,0.26)"; c.fillRect(R.x, R.y, R.w, R.h);
        const gr = c.createLinearGradient(0, R.y + R.h * 0.55, 0, R.y + R.h); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.86)"); c.fillStyle = gr; c.fillRect(R.x, R.y + R.h * 0.55, R.w, R.h * 0.45);
        c.font = `${24 * K}px ${FONT.b}`; c.letterSpacing = `${4 * K}px`; c.fillStyle = "rgba(255,255,255,0.72)"; c.textAlign = "left"; c.fillText("UP NEXT", R.x + 44 * K, R.y + R.h - 196 * K); c.letterSpacing = "0px";
        const nm = wrapRuns(c, nameOf(w), 46 * K, R.w - 88 * K); nm.slice(0, 2).forEach((l, i) => drawRuns(c, l, R.x + 44 * K, R.y + R.h - 132 * K + i * 56 * K, 46 * K, { align: "left" }));
        c.restore();
        const cx = R.x + R.w / 2, cy = R.y + R.h * 0.42, RR = 84 * K, kp = clamp01((t - a - 0.55) / Math.max(0.5, b - a - 0.7));
        c.beginPath(); c.arc(cx, cy, RR + 22 * K, 0, 7); c.fillStyle = "rgba(0,0,0,0.38)"; c.fill();
        c.lineWidth = 7 * K; c.strokeStyle = "rgba(255,255,255,0.28)"; c.beginPath(); c.arc(cx, cy, RR, 0, 7); c.stroke();
        c.save(); c.strokeStyle = "#fff"; c.lineWidth = 7 * K; c.shadowColor = "rgba(255,255,255,0.7)"; c.shadowBlur = 14 * K; c.lineCap = "round"; c.beginPath(); c.arc(cx, cy, RR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, kp)); c.stroke(); c.restore();
        c.save(); c.translate(cx + 6 * K, cy); drawGlyph(c, "play", 86 * K, { color: "#fff", fill: true }); c.restore();
        const by = R.y + R.h + 74 * K, kb1 = popAt(t, a + 0.6, 0.45), kb2 = popAt(t, a + 0.7, 0.45);
        if (kb1 > 0) { c.save(); c.translate(g.W / 2 - 170 * K, by); c.scale(kb1, kb1); pillAt(c, 0, 0, 300 * K, 88 * K, { text: "Cancel", size: 32 }); c.restore(); }
        if (kb2 > 0) { c.save(); c.translate(g.W / 2 + 170 * K, by); c.scale(kb2, kb2); pillAt(c, 0, 0, 300 * K, 88 * K, { text: "Play now", size: 32, fill: T.button.fill, ink: T.button.ink, rim: false, glow: T.glowN ? "rgba(255,255,255,0.35)" : null }); c.restore(); }
        c.restore();
      },
      sounds: (a, b) => [S.snd("whoosh", a + 0.25), S.snd("pop", a + 0.62), S.snd("tick", a + 1.4), S.snd("tick", a + 2.4), S.snd("tick", a + 3.4)],
    },
    // FILM: a teaser at the cinema: the clip on a strip of film whose perforations run, warm,
    // grainy, vignetted, flickering on as a projector starts; "Coming soon" in the serif above
    film: {
      enter: 0.45, captionY: 1290,
      move(R) { return { G: R, r: 4 * K }; },
      frame(c, M, t, img) {
        const G = M.G, F = { x: G.x - 92 * K, y: G.y - 46 * K, w: G.w + 184 * K, h: G.h + 92 * K };
        lift(c, F, 10 * K, 0.75, 70, 30);
        roundRect(c, F.x, F.y, F.w, F.h, 10 * K); c.fillStyle = "#0D0B09"; c.fill();
        const st = 62 * K, off = ((t * 220 * K) % st + st) % st;
        c.save(); roundRect(c, F.x, F.y, F.w, F.h, 10 * K); c.clip(); c.fillStyle = "rgba(226,218,204,0.9)";
        for (const x of [F.x + 26 * K, F.x + F.w - 66 * K]) for (let y = F.y - st + off; y < F.y + F.h; y += st) { roundRect(c, x, y, 40 * K, 28 * K, 6 * K); c.fill(); }
        c.restore();
        if (img) clipIn(c, img, M.src, G, M.r); else holeIn(c, G, M.r);
        c.strokeStyle = "rgba(255,255,255,0.12)"; c.lineWidth = 2 * K; roundRect(c, G.x - 3 * K, G.y - 3 * K, G.w + 6 * K, G.h + 6 * K, 6 * K); c.stroke();
      },
      chrome(c, w, t) {
        const [a] = w, R = RK(w[2].rect), k = Math.round(t * fps), r = i => hash(`film${k}:${i}`);
        c.save(); roundRect(c, R.x, R.y, R.w, R.h, 4 * K); c.clip();
        c.fillStyle = "rgba(255,160,80,0.10)"; c.fillRect(R.x, R.y, R.w, R.h);
        c.globalAlpha = 0.13; const nx = r(1) * noise.width * 3, ny = r(2) * noise.height * 3;
        for (let y = R.y - ny; y < R.y + R.h; y += noise.height * 3) for (let x = R.x - nx; x < R.x + R.w; x += noise.width * 3) c.drawImage(noise, x, y, noise.width * 3, noise.height * 3);
        c.globalAlpha = 1;
        const vg = c.createRadialGradient(R.x + R.w / 2, R.y + R.h / 2, R.w * 0.3, R.x + R.w / 2, R.y + R.h / 2, R.w * 0.78); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.5)"); c.fillStyle = vg; c.fillRect(R.x, R.y, R.w, R.h);
        c.fillStyle = `rgba(0,0,0,${(0.07 * r(3)).toFixed(3)})`; c.fillRect(R.x, R.y, R.w, R.h);
        if (r(4) > 0.72) { c.fillStyle = "rgba(255,240,220,0.28)"; c.fillRect(R.x + r(5) * R.w, R.y, 1.6 * K, R.h); }
        if (r(6) > 0.8) { c.fillStyle = "rgba(0,0,0,0.55)"; c.beginPath(); c.arc(R.x + r(7) * R.w, R.y + r(8) * R.h, (2 + 4 * r(9)) * K, 0, 7); c.fill(); }
        const fl = [1, 1, 0.25, 0.85, 0.05, 0.55, 0, 0.3, 0, 0, 0.15, 0, 0, 0], i = Math.round((t - a) * fps);
        if (i >= 0 && i < fl.length && fl[i] > 0) { c.fillStyle = `rgba(0,0,0,${fl[i]})`; c.fillRect(R.x, R.y, R.w, R.h); }
        c.restore();
        const kt = clamp01((t - a - 0.2) / 0.6);
        if (kt > 0) {
          c.save(); c.globalAlpha *= ease("outCubic", kt); c.textAlign = "center"; c.font = `${132 * K}px ${FONT.serif}`; c.fillStyle = T.ink; c.shadowColor = T.glowN ? "rgba(255,200,150,0.55)" : shadeC(0.3); c.shadowBlur = 30 * K;
          c.fillText("Coming soon", g.W / 2, 330 * g.KY + (1 - ease("outExpo", kt)) * 30 * K); c.restore();
          c.save(); c.globalAlpha *= ease("outCubic", clamp01((t - a - 0.5) / 0.5)); c.textAlign = "center"; c.font = `${30 * K}px ${FONT.b}`; c.letterSpacing = `${6 * K}px`; c.fillStyle = neutral(0.78);
          c.fillText(nameOf(w).toUpperCase(), g.W / 2, R.y + R.h + 136 * K); c.letterSpacing = "0px"; c.restore();
        }
      },
      sounds: (a, b) => [S.snd("shutter", a), S.snd("projector", a + 0.05, undefined, { len: b - a })],
    },
  };
  function previewBeats(w) {
    const [a, b] = w, st = PV[w[2].preview];
    want(a, a + st.enter + 1 / fps);
    // the entrance: the ground, the frame on its way, the clip in it, over everything
    beat(`preview-in-${a.toFixed(2)}`, a, a + st.enter, (ctx, t) => {
      if (t < a - 1e-4 || t >= a + st.enter - 1e-4) return;
      const fr = frameAt(t); if (!fr?.img) return;
      const M0 = pvGeom(w, t), M1 = pvGeom(w, t - SHUTTER * 0.7), disp = Math.abs(M0.G.y - M1.G.y) + Math.abs(M0.G.x - M1.G.x) + Math.abs(M0.G.w - M1.G.w);
      blurred(ctx, t, Math.min(10, Math.max(1, Math.round(disp / 5))), (c, tt) => { groundAt(c, tt, g.H); st.frame(c, pvGeom(w, tt), tt, fr.img); }, SHUTTER * 0.7);
    }, () => []);
    // the chrome, over the clip, to the end
    beat(`preview-${a.toFixed(2)}`, a, b, (ctx, t) => { if (t < a - 1e-4 || t > b + 1e-4) return; ctx.save(); st.chrome(ctx, w, t); ctx.restore(); }, sounds(st.sounds(a, b).map(big)));
  }

  // the cuts to full screen and back, dressed
  const BREATHERS = { flash: null, expand: breathExpand, punch: breathPunch, glitch: breathGlitch, leak: breathLeak, whip: breathWhip };
  if (!(BREATH in BREATHERS)) console.error(`  ⚠ explainer: no breather "${BREATH}" (flash, expand, punch, glitch, leak, whip): the flash`);
  if (flashOnFull) for (const w of FULL) {
    if (w[2]?.preview) { previewBeats(w); continue; }
    const fn = BREATHERS[BREATH];
    if (fn) { fn(w); continue; }
    const [a, b] = w;
    if (a > 0.3) S.flash(a);
    // (3 frames after the cut: on it, the stage's sounds are still filtered as full screen)
    if (b < P.duration - 0.3) S.extra.push(S.snd("whooshOut", b + 0.03));
  }

  // THE CAPTIONS: the words one at a time (two when a short one goes with its neighbour), in
  // Inter ExtraBold under the stage, lower and bigger while the speaker is full screen.
  if (captions) {
    const ws = (W ?? words(P)).filter(w => w.w && !w.cut && w.s < P.duration);
    const groups = captionGroups(ws, fix);
    S.captions = groups;
    S.beats.push({
      id: "captions", kind: "captions", from: 0, to: P.duration, layer: "over",
      draw(ctx, t) {
        const c = groups.find(c => t >= c.s && t < c.e);
        if (!c) return;
        const fullNow = S.isFull(t), bk = breathK(t), pv = previewAt(t);
        const geo = pv ? { y: Math.round(PV[pv[2].preview].captionY * g.KY), size: Math.round(54 * K) }
          : bk != null ? { y: lerp(g.captionAt(t), g.caption.full.y, bk), size: lerp(g.caption.split.size, g.caption.full.size, bk) } : fullNow ? g.caption.full : { y: g.captionAt(t), size: g.caption.split.size };
        // over the take (full screen) white with its shadow; on the stage, the theme's
        const overTake = (fullNow && !pv) || (bk != null && bk >= 0.5), cs = overTake ? THEMES.dark.caption : T.caption;
        ctx.save();
        ctx.shadowColor = cs.shadow; ctx.shadowBlur = 18 * K; ctx.shadowOffsetY = overTake || T.name === "dark" ? 4 * K : 0;
        drawRuns(ctx, [{ t: c.text }], g.W / 2, geo.y, geo.size, { track: -0.01, color: cs.color });
        ctx.restore();
      },
    });
  }
  return S;
}

// The caption groups: each word on its own from its onset, until the next one starts; a short
// word (3 letters or less, said in under 0.2 s) goes with the next one when the two make 10
// characters or less ("is the", "You also", "1 to"), never across a sentence's end. `fix`
// mends a word ({ "klesos": "Klesos" }, matched without case or punctuation).
export function captionGroups(ws, fix = {}) {
  const key = s => s.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
  const F = Object.fromEntries(Object.entries(fix).map(([k, v]) => [key(k), v]));
  const text = w => { const k = key(w.w); return F[k] ? w.w.replace(/[\p{L}\p{N}']+/u, F[k]) : w.w; };
  const out = [];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i], n = ws[i + 1];
    let t = text(w), e = w.e, j = i;
    const short = key(w.w).length <= 3 && w.e - w.s < 0.2 && !/[.!?,;:]$/.test(w.w);
    if (short && n && (t + " " + text(n)).length <= 10 && n.s - w.e < 0.12) { t = `${t} ${text(n)}`; e = n.e; j = i + 1; }
    out.push({ s: w.s, e, text: t, from: i, to: j });
    i = j;
  }
  for (let k = 0; k < out.length; k++) out[k].e = k + 1 < out.length ? Math.min(out[k + 1].s, out[k].e + 0.8) : out[k].e + 0.5;
  return out;
}
