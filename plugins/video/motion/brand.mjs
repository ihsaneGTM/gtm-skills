#!/usr/bin/env node
// Your brand, for one motion video: what workspace/brand/ holds (set once in the app, Settings › Your
// brand) and what the motion skills know of you (workspace/motion/profile.json: your narrator's voice,
// your site, your call to action), written into the run's own folder so the engines read one file.
//
//   node brand.mjs <run-dir>          → <run-dir>/brand/theme.json (+ the logo and font files copied beside it)
//   node brand.mjs --show             → what is set, without writing anything
//
// theme.json (every engine reads it; what is not set is null, and the style's own default holds):
//   { "name", "colors": { "accent", "dark", "light" }, "logo": "brand/logo.png",
//     "fonts": { "headline": "brand/fonts/<file>", "text": "brand/fonts/<file>" }, "notes",
//     "site", "phone", "cta": { "say", "button" }, "voice": { "id", "name", "language" }, "language",
//     "defaults": { "fonts": { "display", "title", "text", "caption", "accent" } } }   ← absolute paths of the OFL faces
// Never writes into workspace/brand/ (the user's): brand-kit.md § Your brand, set once.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DIR as FONT_DIR } from "./fonts.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = process.env.GTM_OS_ROOT ? path.resolve(process.env.GTM_OS_ROOT) : path.resolve(HERE, "..", "..", "..");
export const BRAND_DIR = path.join(ROOT, "workspace", "brand");
export const PROFILE = path.join(ROOT, "workspace", "motion", "profile.json");
const HEX = /^#[0-9a-f]{6}$/i;
const readJSON = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };

export function profile() { return readJSON(PROFILE, {}) || {}; }
export function setProfile(patch) {
  const p = { ...profile(), ...patch, updatedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(PROFILE), { recursive: true });
  fs.writeFileSync(PROFILE, JSON.stringify(p, null, 2) + "\n");
  return p;
}

export const DEFAULT_FONTS = {
  display: path.join(FONT_DIR, "Fraunces.ttf"),               // the arch titles of the vertical styles
  title: path.join(FONT_DIR, "BricolageGrotesque.ttf"),       // titles of the article video and the trailer
  text: path.join(FONT_DIR, "Onest.ttf"),                     // cards, documents, labels
  caption: path.join(FONT_DIR, "Archivo.ttf"),                // one-word captions, big numbers
  accent: path.join(FONT_DIR, "InstrumentSerif-Italic.ttf"),  // one italic accent
  hand: path.join(FONT_DIR, "Caveat.ttf"),                    // handwriting on a document (the motion short's documents look)
};

export function theme() {
  const b = readJSON(path.join(BRAND_DIR, "brand.json"), {}) || {};
  const p = profile();
  const inBrand = rel => { if (!rel) return null; const f = path.resolve(BRAND_DIR, String(rel)); return f.startsWith(BRAND_DIR + path.sep) && fs.existsSync(f) ? f : null; };
  const colors = {};
  for (const k of ["accent", "dark", "light"]) colors[k] = HEX.test(b.colors?.[k] || "") ? b.colors[k].toUpperCase() : null;
  return {
    name: String(b.name || "").trim() || null,
    colors,
    logoFile: inBrand(b.logo),
    fontFiles: { headline: inBrand(b.fonts?.headline), text: inBrand(b.fonts?.text) },
    notes: String(b.notes || "").trim(),
    site: p.site || null, phone: p.phone || null,
    cta: p.cta || null, voice: p.voice || null, language: p.language || null,
  };
}

// the run's copy: theme.json, the logo and the fonts beside it, paths relative to the run
export function writeRun(runDir) {
  const t = theme(), out = path.join(runDir, "brand");
  fs.mkdirSync(path.join(out, "fonts"), { recursive: true });
  let logo = null;
  if (t.logoFile) { logo = `brand/logo${path.extname(t.logoFile).toLowerCase()}`; fs.copyFileSync(t.logoFile, path.join(runDir, logo)); }
  const fonts = {};
  for (const [role, f] of Object.entries(t.fontFiles)) {
    if (!f) { fonts[role] = null; continue; }
    fonts[role] = `brand/fonts/${path.basename(f)}`;
    fs.copyFileSync(f, path.join(runDir, fonts[role]));
  }
  const json = { name: t.name, colors: t.colors, logo, fonts, notes: t.notes, site: t.site, phone: t.phone, cta: t.cta, voice: t.voice, language: t.language, defaults: { fonts: DEFAULT_FONTS }, writtenAt: new Date().toISOString() };
  fs.writeFileSync(path.join(out, "theme.json"), JSON.stringify(json, null, 2) + "\n");
  return json;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  if (!a.length || a[0] === "--show") {
    const t = theme();
    console.log(JSON.stringify({ ...t, logoFile: t.logoFile && path.relative(ROOT, t.logoFile), fontFiles: Object.fromEntries(Object.entries(t.fontFiles).map(([k, v]) => [k, v && path.relative(ROOT, v)])) }, null, 2));
  } else {
    const j = writeRun(path.resolve(a[0]));
    console.log(`brand: ${j.name || "(no name set)"} · accent ${j.colors.accent || "the style's"} · logo ${j.logo || "none"} · fonts ${Object.values(j.fonts).filter(Boolean).length} of yours → ${path.join(a[0], "brand", "theme.json")}`);
  }
}
