#!/usr/bin/env node
// The brand's colours for the film, measured (new.mjs writes them in film/brand.css):
//   --v-on-white  the accent drawn as a line or a word on white (ink, links, label icons, highlighted words, the
//                 method's numbers): the accent itself when it reads on white (contrast 3:1 at least); else the accent
//                 darkened until it does, when that takes little (15 points of OKLab lightness at most: a light blue
//                 stays blue); else the brand's dark (a yellow or a lime darkened turns olive: it no longer reads as
//                 the brand). Such a light accent becomes a fill and a marker on white (theme.css § a light accent).
//   --on-v        what is written on the accent: white, or the brand's dark on a light accent
//   --logo-on-v   the logo on the accent: a one-colour logo (measured in its file) turned white, or dark on a light
//                 accent; a colour logo, or one with its own ground, as it is
//
//   node colours.mjs <accent #hex> [<dark #hex>] [<logo file>]      what the film would get, to look at
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT = { accent: "#5955EF", ink: "#1C1A2E" };
export const hex6 = h => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h || "").trim());
  if (!m) return null;
  const x = m[1].length === 3 ? [...m[1]].map(c => c + c).join("") : m[1];
  return `#${x.toUpperCase()}`;
};
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gam = v => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const toHex = c => `#${c.map(v => Math.round(Math.min(1, Math.max(0, gam(v))) * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
const Y = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];                         // c: linear sRGB
export const contrastOnWhite = h => 1.05 / (Y(rgb(h).map(lin)) + 0.05);

// OKLab (Björn Ottosson), from and to linear sRGB
const oklab = ([r, g, b]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
};
const fromOklab = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
};
// the accent at a lower lightness, its hue kept and its chroma lowered only as much as the screen's colours need
const at = (L, a, b) => { let k = 1; for (let i = 0; i < 40; i++, k *= 0.94) { const c = fromOklab([L, a * k, b * k]); if (c.every(v => v >= -1e-6 && v <= 1 + 1e-6)) return c; } return fromOklab([L, 0, 0]); };
export function darkened(h, target = 3) {
  const [L0, a, b] = oklab(rgb(h).map(lin));
  let lo = 0, hi = L0;
  for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (1.05 / (Y(at(mid, a, b)) + 0.05) >= target) lo = mid; else hi = mid; }
  // written in whole hex steps, it must still reach the target
  while (lo > 0 && contrastOnWhite(toHex(at(lo, a, b))) < target) lo -= 0.002;
  return { hex: toHex(at(lo, a, b)), dL: L0 - lo };
}

export function colours(accentIn, inkIn) {
  const accent = hex6(accentIn) || DEFAULT.accent;
  let ink = hex6(inkIn) || DEFAULT.ink;
  if (contrastOnWhite(ink) < 4.5) ink = DEFAULT.ink;            // a "dark" that is not dark: the style's own
  const contrast = contrastOnWhite(accent), light = contrast < 3;
  let onWhite = accent, onWhiteFrom = "the accent itself";
  if (light) {
    const d = darkened(accent);
    if (d.dL <= 0.15) { onWhite = d.hex; onWhiteFrom = "the accent darkened"; } else { onWhite = ink; onWhiteFrom = "the brand's dark"; }
  }
  return { accent, ink, contrast, light, onWhite, onWhiteFrom, onAccent: light ? ink : "#fff" };
}

// ── the logo: one colour, or in colour ───────────────────────────────────────────────────────────
const NAMED = { black: "#000000", white: "#FFFFFF", red: "#FF0000", blue: "#0000FF", green: "#008000", currentcolor: "currentcolor" };
const canon = v => {
  v = v.trim().toLowerCase();
  const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(v);
  if (m) return `#${[m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  return hex6(v) || NAMED[v] || v;
};
function svgTone(text) {
  let s = text.replace(/<!--[\s\S]*?-->/g, "").replace(/<(defs|clipPath|mask|metadata|title|desc|style)\b[\s\S]*?<\/\1>/gi, "");
  const css = [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join(" ");
  if (/<(image|foreignObject)\b/i.test(s) || /(fill|stroke)\s*[:=]\s*["']?\s*url\(/i.test(s + css)) return "colour";
  const found = new Set();
  const add = v => { const c = canon(v); if (c && !["none", "transparent", "inherit"].includes(c)) found.add(c); };
  for (const m of s.matchAll(/\b(fill|stroke|stop-color|color)\s*=\s*["']([^"']+)["']/gi)) add(m[2]);
  for (const m of (s + " " + css).matchAll(/\b(fill|stroke|stop-color)\s*:\s*([^;"'}]+)/gi)) add(m[2]);
  // a shape with no colour of its own is black, unless a group or the picture gives one
  const bare = [...s.matchAll(/<(path|rect|circle|ellipse|polygon|polyline|line|text)\b([^>]*)>/gi)].some(m => !/\bfill\s*[=:]/i.test(m[2]));
  if (bare && !/<(svg|g)\b[^>]*\bfill\s*=\s*["'](?!none)/i.test(s) && !/\bfill\s*:/i.test(css)) found.add("#000000");
  return found.size <= 1 ? "one" : "colour";
}
function rasterTone(file) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-frames:v", "1", "-vf", "scale=96:96:force_original_aspect_ratio=decrease", "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { maxBuffer: 1 << 24 });
  if (r.status !== 0 || !r.stdout?.length) return null;
  const px = r.stdout, n = px.length / 4;
  let clear = 0;
  const opaque = [];
  for (let i = 0; i < n; i++) { const a = px[i * 4 + 3]; if (a < 32) clear++; else if (a > 224) opaque.push([px[i * 4], px[i * 4 + 1], px[i * 4 + 2]]); }
  if (clear / n < 0.02 || !opaque.length) return "colour";      // no transparency: a picture with its own ground
  const bins = new Map();
  for (const c of opaque) { const k = (c[0] >> 4) * 256 + (c[1] >> 4) * 16 + (c[2] >> 4); if (!bins.has(k)) bins.set(k, []); bins.get(k).push(c); }
  const top = [...bins.values()].sort((x, y) => y.length - x.length)[0];
  const mean = [0, 1, 2].map(j => top.reduce((s, c) => s + c[j], 0) / top.length);
  const near = opaque.filter(c => Math.hypot(c[0] - mean[0], c[1] - mean[1], c[2] - mean[2]) <= 72).length;
  return near / opaque.length >= 0.9 ? "one" : "colour";
}
export function logoTone(file) {
  try { return /\.svg$/i.test(file) ? svgTone(fs.readFileSync(file, "utf8")) : rasterTone(file); } catch { return null; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [acc, dark, logo] = process.argv.slice(2);
  if (!acc) { console.log("usage: node colours.mjs <accent #hex> [<dark #hex>] [<logo file>]"); process.exit(2); }
  const C = colours(acc, dark);
  console.log(`accent ${C.accent}: ${C.contrast.toFixed(2)}:1 on white${C.light ? " (light)" : ""}`);
  console.log(`  --v-on-white ${C.onWhite} (${C.onWhiteFrom}, ${contrastOnWhite(C.onWhite).toFixed(2)}:1)`);
  console.log(`  --on-v       ${C.onAccent}`);
  if (logo) { const t = logoTone(logo); console.log(`  logo         ${t === "one" ? `one colour: turned ${C.light ? "dark" : "white"} on the accent` : t === "colour" ? "in colour: as it is on the accent" : "not read"}`); }
}
