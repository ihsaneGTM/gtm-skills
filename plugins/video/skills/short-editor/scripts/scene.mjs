// Drawing primitives and design tokens shared by every graphic beat.
//
// Everything here is frame-space: the compositor renders a full 1080x1920 RGBA
// overlay and ffmpeg lays it over the speaker. The "card" is the dark panel that
// hosts the app map and any beat that wants a ground of its own; most beats
// float directly on the progressive blur instead (see references/motion-language.md).
import { createCanvas, loadImage, GlobalFonts, Path2D } from "@napi-rs/canvas";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// --- display faces ------------------------------------------------------------
// skia resolves a font by the FAMILY it finds in the file; a style-linked name
// such as "Satoshi Black" silently falls back to the system sans (and drops the
// accents). So the faces the landscape titles use are registered from their
// files under an alias, one face each — weight and style in the CSS string are
// then irrelevant. Missing file → null, and the caller falls back to Inter.
// A file name is looked up in the user's fonts first, then the system's, so a
// macOS face (Didot, SuperClarendon, Big Caslon…) is as usable as an installed
// one; an absolute path is taken as given.
const FONT_DIRS = [
  // a face the PROJECT carries wins: that is where a face extracted from a macOS
  // font collection lives (scripts/ttc-face.py), so nothing has to be installed
  // system-wide and nothing licensed gets committed to the repo
  path.resolve(process.cwd(), "assets", "fonts"),
  path.join(os.homedir(), "Library", "Fonts"),
  "/Library/Fonts", "/System/Library/Fonts", "/System/Library/Fonts/Supplemental",
];
function registerFace(file, alias) {
  const cands = path.isAbsolute(file) ? [file] : FONT_DIRS.map(d => path.join(d, file));
  for (const p of cands) {
    try { if (fs.existsSync(p) && GlobalFonts.registerFromPath(p, alias)) return alias; } catch {}
  }
  return null;
}
// A face that only exists INSIDE a macOS collection (Snell Roundhand Bold is the
// second face of SnellRoundhand.ttc): registering the .ttc gives its FIRST face,
// so the one we want is extracted once into the project's assets/fonts with
// ttc-face.py — here, on first use, so nobody has to run it by hand. Needs
// fontTools in the system python3; without it the collection's first face is
// registered instead, and that is said, not hidden.
export function extractedFace(file, ttc, style, alias) {
  const hit = registerFace(file, alias);
  if (hit) return hit;
  const out = path.resolve(process.cwd(), "assets", "fonts");
  const src = FONT_DIRS.map(d => path.join(d, ttc)).find(p => fs.existsSync(p));
  if (src) {
    try {
      fs.mkdirSync(out, { recursive: true });
      const here = path.dirname(fileURLToPath(import.meta.url));
      spawnSync("python3", [path.join(here, "ttc-face.py"), src, "--style", style, "--out", out], { stdio: "ignore" });
      const again = registerFace(path.join(out, file), alias);
      if (again) return again;
    } catch {}
    console.error(`  ⚠ ${file} not found and not extractable (no fontTools?); the first face of ${ttc} instead`);
    return registerFace(src, alias);
  }
  return null;
}
// The SERIF ACCENT is a choice, not a constant — the first one was rejected in
// review and several had to be compared. project.json `serif` names the file (`serifLight`
// its lighter companion, optional); SERIF_FACE in the environment overrides it,
// which is how a comparison sheet gets rendered without touching this file.
// NOTE on .ttc collections: registering one gives you the collection's FIRST
// face, i.e. usually the Regular — the CSS weight and style cannot reach the
// others, since an alias is one face. So a system serif arrives upright and at
// text weight, which is a real constraint on the shortlist and not a bug.
const PJ = (() => {
  try { return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "project.json"), "utf8")); }
  catch { return {}; }
})();
const SERIF_FILE = process.env.SERIF_FACE || PJ.serif || "Spectral-BoldItalic.ttf";
const SERIF_LIGHT_FILE = process.env.SERIF_FACE_LIGHT || PJ.serifLight || "Spectral-SemiBoldItalic.ttf";
// Satoshi Black for the sans; Spectral Bold Italic for the serif accent (a real
// serif — Ranade, tried first, is a geometric SANS despite the editorial name;
// the alias resolved fine and the frame came back in sans italic).
export const FACE = {
  sansBlack: registerFace("Satoshi-Black.otf", "SatoshiBlack"),
  sansBlackItalic: registerFace("Satoshi-BlackItalic.otf", "SatoshiBlackItalic"),
  serifItalic: registerFace(SERIF_FILE, "SerifAccent"),
  serifLightItalic: registerFace(SERIF_LIGHT_FILE, "SerifAccentLight"),
  // The HANDWRITING (hand.mjs). Kalam is the house hand — the thumbnails and the
  // whiteboard visuals use it — and on the specimen sheet it was the only face that read as a real hand at 84 px without turning into a
  // school font (Noteworthy, Chalkboard) or a marker cliché (Marker Felt).
  // project.json `hand` / `handBold` can name other files; SERIF_FACE-style env
  // overrides exist for a comparison sheet.
  hand: registerFace(process.env.HAND_FACE || PJ.hand || "Kalam-Regular.otf", "HandRegular"),
  handBold: registerFace(process.env.HAND_FACE_BOLD || PJ.handBold || "Kalam-Bold.otf", "HandBold"),
  handLight: registerFace(PJ.handLight || "Kalam-Light.otf", "HandLight"),
  // a felt MARKER for a lockup or a poster word; macOS ships it as a collection,
  // so the Wide face has to be extracted into the project (scripts/ttc-face.py)
  marker: registerFace(PJ.marker || "MarkerFelt-Wide.ttf", "MarkerWide"),
  // THE VERTICAL HEADLINE (headline.mjs, 2026-09-29): Impact carries the speaker's words, in
  // capitals, big, at the top of the frame; a script is the ONE accent word written
  // across them, the way "LOVE Hard" sits a script word over a condensed one. Impact
  // is a macOS system file. The script is SACRAMENTO — Snell Roundhand was the first
  // one (rejected in review as the secondary face), then Sacramento won against Lobster
  // in review. Google Fonts, OFL: fonts.mjs fetches it into the
  // project's assets/fonts (init.sh runs it). If it is missing, headline.mjs falls
  // back to Snell and says so.
  impact: registerFace(PJ.impact || "Impact.ttf", "ImpactDisplay"),
  script: registerFace(PJ.script || "Sacramento-Regular.ttf", "ScriptAccent"),
  scriptBlack: registerFace(PJ.scriptBlack || PJ.script || "Sacramento-Regular.ttf", "ScriptAccentBlack"),
};

// --- card geometry (frame-space, 1080 wide) ----------------------------------
export const CARD = { x: 44, y: 46, w: 992, h: 516, r: 34 };

// --- design tokens -----------------------------------------------------------
// House dark palette. Do not invent values here: if the palette moves, re-read
// it rather than eyeballing a near-match.
export const C = {
  canvas: "#141517",
  paper: "#202228",
  line: "rgba(255,255,255,.085)",
  dot: "rgba(255,255,255,.075)",
  ink: "#F4F5F7",
  muted: "#9AA1B1",
  flow: "#5C6273",
  green: "#0EA968", red: "#E5484D", orange: "#F08C00", grey: "#9AA1B1",
  yellow: "#FFD90D",
};
export const STATUS = { green: C.green, red: C.red, orange: C.orange, grey: C.grey };

// --- fonts -------------------------------------------------------------------
// skia reads a non-standard weight as a SIZE. `650` once rendered 650px-tall
// white letterforms across the whole card. Route every font string through this.
const WEIGHTS = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900]);
export function F(w, s, family = 'Inter, "Helvetica Neue", Arial') {
  if (!WEIGHTS.has(w)) throw new Error(`invalid font weight: ${w} (skia would read it as a size)`);
  return `${w} ${s}px ${family}`;
}
export const MONO = (w, s) => F(w, s, '"Geist Mono", ui-monospace, monospace');

// --- easing ------------------------------------------------------------------
export const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
export const easeOutBack = (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
// critically-tuned spring: overshoots once then settles — the "motion design" pop
export function spring(t, freq = 3.1, damp = 5.2) {
  if (t >= 1) return 1;
  if (t <= 0) return 0;
  return 1 - Math.exp(-damp * t) * Math.cos(freq * Math.PI * t);
}
export const lerp = (a, b, t) => a + (b - a) * t;
// the camera's ramp shapes — the SAME curves zexpr.mjs writes into the ffmpeg
// expression, so anything that follows the camera in JS (speaker, fit, preview)
// agrees with the picture to the frame. A step's 5th value names one.
export const CAM_EASE = { linear: u => u, out: u => 1 - Math.pow(1 - u, 3), inout: u => u * u * (3 - 2 * u) };
export const camEase = (name, u) => (CAM_EASE[name ?? "linear"] ?? CAM_EASE.linear)(u);
// local progress of the window [a,b] at time t
export const seg = (t, a, b) => clamp01((t - a) / (b - a));

// --- canvas helpers ----------------------------------------------------------
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function withAlpha(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// The dark panel every card-hosted beat sits on. Call endCardShell to close it:
// this one leaves a clip in place so the caller can draw inside the rounded rect.
export function drawCardShell(ctx, a, scale = 1, rect = CARD) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 46; ctx.shadowOffsetY = 16;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.r);
  ctx.fillStyle = "rgba(17,18,20,0.955)"; ctx.fill();
  ctx.restore();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.r);
  ctx.save(); ctx.clip();
  ctx.fillStyle = C.dot;
  for (let y = rect.y + 14; y < rect.y + rect.h; y += 26)
    for (let x = rect.x + 14; x < rect.x + rect.w; x += 26) { ctx.beginPath(); ctx.arc(x, y, 1.25, 0, 7); ctx.fill(); }
  const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + 150);
  g.addColorStop(0, "rgba(255,255,255,.045)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(rect.x, rect.y, rect.w, 150);
}
export function endCardShell(ctx, rect = CARD) {
  ctx.restore();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.r);
  ctx.strokeStyle = "rgba(255,255,255,.10)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

// A pill label. The house caption chip: yellow when it is the point, dark
// otherwise. Never a black plate behind a whole diagram — that reads as a
// slide, not as editing (see references/motion-language.md).
export function pill(ctx, text, cx, cy, k, { bg, fg, font = 34, padX = 30, h = 66 }) {
  ctx.save();
  ctx.font = F(800, font);
  const w = ctx.measureText(text).width + padX * 2;
  ctx.globalAlpha = clamp01(k);
  ctx.translate(cx, cy);
  const sc = lerp(0.82, 1, clamp01(k));
  ctx.scale(sc, sc);
  ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = bg; ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

// --- icons -------------------------------------------------------------------
// SVG path data from the house icon set (24x24 viewBox).
const P_LINKEDIN = "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z";
const P_ADS = "M3 10.5v3a1 1 0 0 0 1 1h2.2l5.3 3.6V5.9L6.2 9.5H4a1 1 0 0 0-1 1zM16 8.5a4.5 4.5 0 0 1 0 7M6.8 15.5l.7 4";
const P_GLOBE_C = "M3.2 12h17.6M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18";
// Feather (MIT) — generic glyphs, not brand marks: "email" and "a phone number"
// are things, not companies, and drawing a Gmail or a WhatsApp logo for them
// would name a vendor the speaker did not name.
const P_MAIL_BOX = "M4 5h16a1.6 1.6 0 0 1 1.6 1.6v10.8A1.6 1.6 0 0 1 20 19H4a1.6 1.6 0 0 1-1.6-1.6V6.6A1.6 1.6 0 0 1 4 5z";
const P_MAIL_FLAP = "M21.4 6.4 12 13.2 2.6 6.4";
const P_PHONE = "M21.6 16.9v2.7a1.8 1.8 0 0 1-2 1.8 17.8 17.8 0 0 1-7.8-2.8 17.6 17.6 0 0 1-5.4-5.4A17.8 17.8 0 0 1 3.6 5.4 1.8 1.8 0 0 1 5.4 3.4h2.7a1.8 1.8 0 0 1 1.8 1.6 11.6 11.6 0 0 0 .6 2.5 1.8 1.8 0 0 1-.4 1.9L9 10.5a15.9 15.9 0 0 0 5.4 5.4l1.1-1.1a1.8 1.8 0 0 1 1.9-.4 11.6 11.6 0 0 0 2.5.6 1.8 1.8 0 0 1 1.6 1.9z";
const P_USERS = "M16 19v-1.8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3V19M9.5 11.2A3.4 3.4 0 1 0 9.5 4.4a3.4 3.4 0 0 0 0 6.8zM21 19v-1.8a3 3 0 0 0-2.2-2.9M15.6 4.6A3.4 3.4 0 0 1 15.6 11";
// Pipecorn "P" — from the Pipecorn logo SVG (viewBox 0 0 296 283)
const P_PIPECORN = "M220.123 90.9442C218.969 83.176 215.121 76.4727 209.647 71.3754C206.848 68.7744 203.56 66.8018 200.045 65.318C170.032 96.443 153.645 118.438 184.549 146.037C157.615 124.67 129.963 139.997 101.543 166.129L86.2566 179.536C124.734 138.513 147.261 116.972 112.176 81.0463C147.261 113.742 167.916 97.0889 198.436 64.6721C196.424 63.9215 194.343 63.293 192.244 62.8217C184.741 61.1459 176.871 60.308 169.053 60.308H113.908L76.0601 222.566H89.8595C107.349 222.584 122.565 210.626 126.64 193.658L131.38 173.95C182.1 175.364 227.311 139.404 220.106 90.9442H220.123Z";

let CIO_IMG = null;
export async function loadIconAssets(dir) {
  try { CIO_IMG = await loadImage(new URL("./assets/customerio.png", dir)); } catch { CIO_IMG = null; }
}

// The Pipecorn "P" glyph, fitted into a box of side `s` centred on (cx, cy).
export function drawPipecornP(ctx, cx, cy, s, fill) {
  const bw = 144, bh = 163, bx = 76, by = 60;      // path bbox in the 296x283 viewBox
  const k = s / Math.max(bw, bh);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  ctx.translate(-(bx + bw / 2), -(by + bh / 2));
  ctx.fillStyle = fill;
  ctx.fill(new Path2D(P_PIPECORN));
  ctx.restore();
}

// Icon "chip": a rounded badge with the brand mark, exactly like the app map.
export function drawIcon(ctx, kind, cx, cy, size) {
  const s = size, half = s / 2;
  ctx.save();
  ctx.translate(cx, cy);
  const chip = (bg, radius = s * 0.28) => { roundRect(ctx, -half, -half, s, s, radius); ctx.fillStyle = bg; ctx.fill(); };
  const vb = k => { ctx.scale(k / 24, k / 24); ctx.translate(-12, -12); };

  if (kind === "linkedin") {
    chip("#FFFFFF");
    ctx.save(); ctx.scale(s / 24, s / 24); ctx.translate(-12, -12);
    ctx.fillStyle = "#0A66C2"; ctx.fill(new Path2D(P_LINKEDIN)); ctx.restore();
  } else if (kind === "youtube") {
    chip("#FF0000", s * 0.3);
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(-s * 0.13, -s * 0.20); ctx.lineTo(s * 0.22, 0); ctx.lineTo(-s * 0.13, s * 0.20);
    ctx.closePath(); ctx.fill();
  } else if (kind === "customerio") {
    chip("#FFFFFF");
    if (CIO_IMG) ctx.drawImage(CIO_IMG, -half * 0.82, -half * 0.82, s * 0.82, s * 0.82);
    else { ctx.fillStyle = "#22A06B"; ctx.font = F(700, s * 0.6); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("»", 0, 0); }
  } else if (kind === "pipecorn") {
    chip("#FFD90D", s * 0.28);
    drawPipecornP(ctx, 0, 0, s * 0.76, "#0B0B0B");
  } else if (kind === "ads") {
    chip("rgba(255,255,255,.94)");
    ctx.save(); vb(s * 0.86);
    ctx.strokeStyle = "#E58900"; ctx.lineWidth = 2.1; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke(new Path2D(P_ADS)); ctx.restore();
  } else if (kind === "globe") {
    chip("rgba(255,255,255,.94)");
    ctx.save(); vb(s * 0.86);
    ctx.strokeStyle = "#0284C7"; ctx.lineWidth = 2.1; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(12, 12, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.stroke(new Path2D(P_GLOBE_C)); ctx.restore();
  } else if (kind === "mail") {
    chip("rgba(255,255,255,.94)");
    ctx.save(); vb(s * 0.86);
    ctx.strokeStyle = "#1F2937"; ctx.lineWidth = 2.1; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke(new Path2D(P_MAIL_BOX)); ctx.stroke(new Path2D(P_MAIL_FLAP)); ctx.restore();
  } else if (kind === "phone") {
    chip("rgba(255,255,255,.94)");
    ctx.save(); vb(s * 0.86);
    ctx.strokeStyle = "#16A34A"; ctx.lineWidth = 2.1; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke(new Path2D(P_PHONE)); ctx.restore();
  } else if (kind === "users") {
    chip("rgba(255,255,255,.94)");
    ctx.save(); vb(s * 0.86);
    ctx.strokeStyle = "#4F46E5"; ctx.lineWidth = 2.1; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke(new Path2D(P_USERS)); ctx.restore();
  }
  ctx.restore();
}

// A CLIP: a folder of numbered frames, preloaded once and addressed by output
// time. What a `screen` beat needs to play a screen RECORDING instead of a still.
//
//   const CLIP = await loadClip("assets/clip-leads", { fps: 30, t0: at(20.68) });
//   screen({ ..., img: t => CLIP.at(t) })
//
// The frames are held DECODED: 138 of them at 1216 px cost ~450 MB of RSS, which
// is why they are extracted at the width they will be drawn at and no wider, and
// why a clip covers one beat rather than a whole video.
//
// Do NOT try to decode on demand. `Image.src = buffer` is synchronous in
// @napi-rs/canvas and reports the right width/height with complete === true, but
// drawImage of that image renders NOTHING — only the async loadImage gives a
// drawable one. (Measured: sync draw returns [0,0,0,0] everywhere, async draws
// correctly.) So the only way to feed a synchronous compositor is to preload.
//
// `windows: [[a, b], …]` (seconds on the clip's own `.at(t)` timeline) loads ONLY
// the frames inside those windows — a full-length stencil of the speaker is 1 666
// frames and 1.5 GB decoded, when a plan needs it for six covers of two seconds.
// Outside a window `.at(t)` is null; inside a window a missing frame holds.
export async function loadClip(dir, { fps = 30, t0 = 0, hold = true, windows = null } = {}) {
  const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g)$/i.test(f)).sort()
    .map(f => path.join(dir, f));
  const frames = new Array(files.length).fill(null);
  const wanted = i => !windows || windows.some(([a, b]) => { const t = t0 + i / fps; return t >= a - 1 / fps && t <= b + 1 / fps; });
  let loaded = 0;
  for (let i = 0; i < files.length; i++) if (wanted(i)) { frames[i] = await loadImage(files[i]); loaded++; }
  return {
    count: frames.length, loaded,
    at(t) {
      if (!frames.length) return null;
      const i = Math.round((t - t0) * fps);
      if (i < 0) return frames[0];
      if (i >= frames.length) return hold ? frames[frames.length - 1] : null;
      return frames[i];
    },
  };
}

export { createCanvas, loadImage, GlobalFonts, Path2D };
