#!/usr/bin/env node
// A new voiceover video: its folder, the style's film template, the brand, the voice's skeleton.
//
//   node new.mjs <run-dir> --video <the filmed take> [--script <file.md|txt>] [--style document] [--subject "…"]
//                [--language en|fr] [--slug <name>] [--brand <brand.json>] [--force]
//
// <run-dir> is workspace/projects/<slug>/. When the app started the run, its run.json is there already
// ({ "skill": "voiceover-video", "video", "script", "language", "notes", … }) and gives what the options do not.
// --style: one of styles.json (default: its "default"). A style is a film template (template/<style>/film), its look
//          (references/look*.md) and its example story.
// --brand: the brand of THIS video when it is not the user's own: { "name", "colors": { "accent", "dark" },
//          "logo": "<path or https url>", "site", "phone" }.
// --force: the template again (a fixed bug reaches a video already made); never a story, docs.js, photos.js.
// Writes, in <run-dir>:
//   run.json, progress.json   what the video is; the steps the app draws
//   film/                     the template (engine, effects, blocks, the stock-shot frame, the look) + brand.css,
//                             brand.js, fonts/; the stories (film/story-<n>.js, film/intro-story.js, film/cutback-<n>-story.js)
//                             and their pages are written by prep.mjs and intro.mjs from the template's skeletons
//   brand/theme.json          the brand of this video (plugins/video/motion/brand.mjs)
//   vo/part-1/vo.json         the first motion part's voice: the user's clone (workspace/motion/profile.json › voiceClone)
//   take/ real/ assets/{raw,clips,gifs,stock}/ stills/ build/ exports/   (filled by the next steps)
//   README.md                 to keep up to date
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeRun, profile, DEFAULT_FONTS, ROOT } from "../../../motion/brand.mjs";
import { step } from "../../../motion/progress.mjs";
import { colours, logoTone } from "./colours.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, "..");
const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf(k); return i >= 0 && i + 1 < a.length ? a[i + 1] : d; };
if (!a[0] || a[0].startsWith("-")) { const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n"); console.log(src.slice(1, src.findIndex(l => l.startsWith("import "))).map(l => l.replace(/^\/\/ ?/, "")).join("\n")); process.exit(2); }
const RUN = path.resolve(a[0]);
const readJSON = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const rel = p => path.relative(ROOT, p).split(path.sep).join("/");
const run = readJSON(path.join(RUN, "run.json"), {}) || {};
const slug = opt("--slug") || run.slug || path.basename(RUN);
if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(slug)) { console.error(`✗ the slug must be lower case letters, digits and dashes: ${slug}`); process.exit(2); }
const STYLES = readJSON(path.join(SKILL, "styles.json"));
const style = opt("--style") || run.style || STYLES.default;
if (!STYLES.styles[style]) { console.error(`✗ no style « ${style} » (styles.json has: ${Object.keys(STYLES.styles).join(", ")})`); process.exit(2); }
const language = opt("--language") || run.language || profile().language || "en";
const subject = opt("--subject") || run.subject || "";
// the filmed take: a path from the folder's root (or absolute), or a file the app put in assets/inbox/
const inbox = path.join(RUN, "assets", "inbox");
const fromInbox = () => { try { return fs.readdirSync(inbox).filter(f => /\.(mp4|mov|m4v|mkv)$/i.test(f)).map(f => path.join(inbox, f))[0] || null; } catch { return null; } };
// the mode (Ihsane, 2026-10-14): facecam (the whole video filmed, your real voice), ai (no filming, an AI voice), hybrid
// (a filmed intro and cutbacks, the rest in your cloned voice: the default, as the reference was made)
const mode = opt("--mode") || run.mode || "hybrid";
if (!["facecam", "ai", "hybrid"].includes(mode)) { console.error(`✗ --mode facecam | ai | hybrid (not ${mode})`); process.exit(2); }
const videoArg = opt("--video") || run.video || fromInbox();
const video = videoArg ? path.resolve(ROOT, videoArg) : null;
if (mode !== "ai" && (!video || !fs.existsSync(video))) { console.error(`✗ the filmed take is needed: --video <file>${videoArg ? ` (not found: ${videoArg})` : ""}`); process.exit(2); }
const scriptArg = opt("--script") || run.script || null;
const script = scriptArg ? path.resolve(ROOT, scriptArg) : null;
if (script && !fs.existsSync(script)) { console.error(`✗ the script is not found: ${scriptArg}`); process.exit(2); }
fs.mkdirSync(RUN, { recursive: true });
if (fs.existsSync(path.join(RUN, "film", "engine.js")) && !a.includes("--force")) { console.error(`✗ ${rel(RUN)}/film already exists (--force puts the template in again, never a story)`); process.exit(2); }
const keepPath = p => (p.startsWith(ROOT + path.sep) ? rel(p) : p);
fs.writeFileSync(path.join(RUN, "run.json"), JSON.stringify({ skill: "voiceover-video", createdAt: Date.now(), ...run, slug, language, subject, style, mode,
  video: video && fs.existsSync(video) ? keepPath(video) : null, script: script ? keepPath(script) : null }, null, 2) + "\n");

// ── the template: copied, so a finished video never moves when the skill changes ─────────────────
// the skeletons (story.js, intro-story.js) and the page templates (part.html, clip.html) stay in the skill: prep.mjs and
// intro.mjs write each part's and each clip's own from them
const SKIP = ["story.js", "intro-story.js", "part.html", "clip.html"];
const copyTpl = (src, dst) => {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyTpl(s, d);
    else if (!SKIP.includes(e.name) && !(["docs.js", "photos.js"].includes(e.name) && fs.existsSync(d))) fs.copyFileSync(s, d);
  }
};
copyTpl(path.join(SKILL, STYLES.styles[style].template, "film"), path.join(RUN, "film"));
for (const d of ["film/img/people", "film/img/logos", "film/img/pages", "film/img/photos", "film/img/stickers", "film/media", "take", "real", "vo/part-1/voix", "assets/raw", "assets/clips", "assets/gifs", "assets/stock", "stills", "build/junctions/1080", "exports"]) fs.mkdirSync(path.join(RUN, d), { recursive: true });

// ── the brand: the user's (workspace/brand/), or this video's own (--brand, run.json) ───────────
const prev = readJSON(path.join(RUN, "brand", "theme.json"));
const over = opt("--brand") ? readJSON(path.resolve(opt("--brand"))) : run.brand || null;
let theme = !over && prev?.override ? prev : writeRun(RUN);
if (over) {
  theme = { ...theme, name: over.name ?? theme.name, colors: { ...theme.colors, ...(over.colors || {}) }, site: over.site ?? theme.site, phone: over.phone ?? theme.phone };
  if (over.logo) {
    const ext = (path.extname(String(over.logo).split("?")[0]) || ".png").toLowerCase();
    const dst = path.join(RUN, "brand", `logo${ext}`);
    if (/^https?:/.test(over.logo)) { const r = await fetch(over.logo); if (r.ok) fs.writeFileSync(dst, Buffer.from(await r.arrayBuffer())); }
    else fs.copyFileSync(path.resolve(ROOT, over.logo), dst);
    if (fs.existsSync(dst)) theme.logo = `brand/logo${ext}`;
  }
  theme.override = true;
  fs.writeFileSync(path.join(RUN, "brand", "theme.json"), JSON.stringify(theme, null, 2) + "\n");
}
// the colours, measured (a light accent, a yellow or a lime: its lines and words on white in the brand's dark)
const C = colours(theme.colors?.accent || "#5955EF", theme.colors?.dark || "#1C1A2E");
const logoFile = theme.logo && fs.existsSync(path.join(RUN, theme.logo)) ? path.join(RUN, theme.logo) : null;
const tone = logoFile ? logoTone(logoFile) : null;
const logoOnV = tone === "one" ? (C.light ? "brightness(0)" : "brightness(0) invert(1)") : "none";
const FONTS = path.join(RUN, "film", "fonts");
fs.mkdirSync(FONTS, { recursive: true });
const face = (r, fallback) => {
  const src = r ? path.join(RUN, r) : fallback;
  if (!fs.existsSync(src)) return null;
  fs.copyFileSync(src, path.join(FONTS, path.basename(src)));
  return path.basename(src);
};
const titleFile = face(theme.fonts?.headline, DEFAULT_FONTS.title), textFile = face(theme.fonts?.text, DEFAULT_FONTS.text);
// the italic serif of the filmed clips' lockups (« GTM Serif » in intro-story.js): Instrument Serif, OFL
face(null, DEFAULT_FONTS.accent);
if (!titleFile || !textFile) console.error("⚠ a default font is missing: run node plugins/video/motion/bootstrap.mjs");
const fmt = f => (/\.otf$/i.test(f) ? "opentype" : "truetype");
fs.writeFileSync(path.join(RUN, "film", "brand.css"), `/* written by scripts/new.mjs from brand/theme.json: the brand's colours and faces for this video.
   --v-on-white: the accent as a line or a word on white (contrast ${C.contrast.toFixed(2)}:1 on white${C.light ? `: too light, ${C.onWhiteFrom}` : ""});
   --logo-on-v: the logo on the accent (${tone === "one" ? "one colour: turned " + (C.light ? "dark" : "white") : tone === "colour" ? "in colour: as it is" : "none"}) */
@font-face{font-family:"GTM Title";src:url(fonts/${titleFile}) format("${fmt(titleFile)}");font-weight:100 900}
@font-face{font-family:"GTM Text";src:url(fonts/${textFile}) format("${fmt(textFile)}");font-weight:100 900}
:root{--v:${C.accent};--ink:${C.ink};--on-v:${C.onAccent};--v-on-white:${C.onWhite};--logo-on-v:${logoOnV}}
`);
let logo = null;
if (logoFile) { logo = `img/logo${path.extname(theme.logo)}`; fs.copyFileSync(logoFile, path.join(RUN, "film", logo)); }
const brandJS = { name: theme.name || "", logo, site: theme.site || "", phone: theme.phone || "", ...(C.light ? { lightAccent: true } : {}) };
fs.writeFileSync(path.join(RUN, "film", "brand.js"), `/* written by scripts/new.mjs: who the video is for, in which language */
window.LANG = ${JSON.stringify(language)};
window.BRAND = ${JSON.stringify(brandJS)};
window.FONTS = ['700 40px "GTM Title"', '600 40px "GTM Title"', '400 40px "GTM Text"', '700 40px "GTM Text"'];
`);

// ── the voice of the motion part: the user's clone, from the profile (scripts/clone.mjs makes it the first time) ──
const voF = path.join(RUN, "vo", "part-1", "vo.json");
const vc = mode === "facecam" ? null : profile().voiceClone || null;   // facecam: your real voice, no clone
const clone = vc?.id ? { voice: vc.id, voice_name: vc.name || null, model: vc.model || "eleven_v4", stability: vc.stability ?? 0.5, similarity: vc.similarity ?? 0.85, language: vc.language || language, prefix: vc.prefix || "" } : null;
const vo = readJSON(voF);
if (!vo) fs.writeFileSync(voF, JSON.stringify({ voice: null, voice_name: null, model: "eleven_v4", stability: 0.5, similarity: 0.85, seed: 7, language, prefix: "", ...(clone || {}), text: "", say: {}, pauses: [] }, null, 1) + "\n");
else if (!vo.voice && clone) fs.writeFileSync(voF, JSON.stringify({ ...vo, ...clone }, null, 1) + "\n");

// ── the README ─────────────────────────────────────────────────────────────────────────────────────
const readme = path.join(RUN, "README.md");
if (!fs.existsSync(readme)) fs.writeFileSync(readme, `# ${subject || slug}

YouTube video (« YouTube video editor »), made on ${new Date().toISOString().slice(0, 10)} with GTM by Pipecorn (\`/video-youtube-editor\`).
Mode: ${mode}. The filmed take: \`${video ? keepPath(video) : "(none: AI voice)"}\`${script ? ` · the script: \`${keepPath(script)}\`` : ""}. Style: ${STYLES.styles[style].name} · brand: ${theme.name || "(none set)"} · language: ${language}.
Final video: \`workspace/videos/${slug}.mp4\`.

## The cut

| Part | From the take | Length |
| --- | --- | --- |

## The text said by the clone

(as in \`vo/part-<n>/vo.json\`; what was cleaned from the take; what the user gave or validated)

## What is made up on screen

(fictional people, companies, phone numbers; illustrative figures)

## Pictures

| Moment (voice) | Picture | Source | Note |
| --- | --- | --- | --- |

## Decisions and feedback

Nothing is published.
`);

if (mode === "ai") step(RUN, "take", "skipped", "No filming: an AI voice");
else step(RUN, "take", "waiting", "The filmed take is in, to transcribe");
console.log(`→ ${rel(RUN)} · slug ${slug} · style ${STYLES.styles[style].name} · brand ${theme.name || "(none)"} · ${language}`);
console.log(mode === "ai" ? `  mode ai: no filming${script ? ` · the script: ${keepPath(script)}` : " · no script given: write it from the user's idea or article (SKILL.md § 5)"}` : `  mode ${mode} · the filmed take: ${keepPath(video)}${script ? ` · the script: ${keepPath(script)}` : " · no script given: the motion part says the user's own words from the take"}`);
console.log(`  colours: accent ${C.accent}${C.light ? `, light: its lines and words on white in ${C.onWhite}` : ""}${logoFile ? ` · logo ${tone === "one" ? "one colour" : "in colour"}` : " · no logo"}`);
console.log(clone ? `  the voice: your clone « ${clone.voice_name || clone.voice} » (${clone.model}, ${clone.language}${clone.prefix ? `, prefix ${JSON.stringify(clone.prefix)}` : ""})` : "  the voice: no clone yet (workspace/motion/profile.json › voiceClone): scripts/clone.mjs makes it from the take");
const vs = profile().voiceover || {};
console.log(`  your settings (profile.json › voiceover): intro at ×${vs.introSpeed ?? 1}${vs.cta?.say ? " · your end (cta) is kept" : " · no end (cta) kept yet: write it with the user, then save it"}${vs.channelStage ? ` · channel: ${vs.channelStage}` : ""}`);
