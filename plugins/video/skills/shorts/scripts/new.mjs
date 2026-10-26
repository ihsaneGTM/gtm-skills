#!/usr/bin/env node
// Long video to shorts: the run's folder. One long take in (filmed talking to the camera, often derushed already,
// horizontal or vertical), several vertical shorts out, each cut from its best moments and edited in Dynamic text with the long
// video's pictures (styles.json, references/look.md).
//
//   node new.mjs <run-dir> --video <the long take> [--count 3] [--style behind|prints|cuts] [--subject "…"]
//                [--language en|fr] [--slug <name>]
//   node new.mjs <project> --video <one take> --one --out workspace/videos/<slug>.mp4 [--skill whiteboard-editor]
//
// --one    ONE take edited in place into ONE short (the Short video editor's Whiteboard style: whiteboard-editor/scripts/
//          init.sh runs this): run.json › one, out, count 1, the take's own pace (×1 unless --speed), no shorts/ list;
//          the same look, cut and scripts as a short of a long video (cut.mjs --one)
//
// <run-dir> is workspace/projects/<slug>/. When the app started the run, its run.json is there already
// ({ "skill": "shorts", "video", "language", "notes", "count", "style" }) and gives what the options do not.
// --count  how many shorts to look for (default 3; the take decides: fewer when it does not hold them)
// --style  the look of every short of the run (styles.json): behind (the pictures out from behind you, the default),
//          prints (pinned over the top of the frame), cuts (cutaways over the whole frame); a short can take another
//          one in shorts.json
// Writes run.json, progress.json, README.md and the folders: take/ (the take heard), shorts/<n>/ (each short's edit),
// stills/. The long take is never copied nor changed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { profile, ROOT, writeRun } from "../../../motion/brand.mjs";
import { step } from "../../../motion/progress.mjs";

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
const inbox = path.join(RUN, "assets", "inbox");
const fromInbox = () => { try { return fs.readdirSync(inbox).filter(f => /\.(mp4|mov|m4v|mkv)$/i.test(f)).map(f => path.join(inbox, f))[0] || null; } catch { return null; } };
const videoArg = opt("--video") || run.video || fromInbox();
const video = videoArg ? path.resolve(ROOT, videoArg) : null;
if (!video || !fs.existsSync(video)) { console.error(`✗ the long take is needed: --video <file>${videoArg ? ` (not found: ${videoArg})` : ""}`); process.exit(2); }
const ONE = a.includes("--one") || run.one === true;
const count = ONE ? 1 : Math.max(1, Math.min(10, +(opt("--count") || run.count || 3)));
const out = ONE ? (opt("--out") || run.out || `workspace/videos/${slug}.mp4`) : null;
const keepPath = p => (p.startsWith(ROOT + path.sep) ? rel(p) : p);
fs.mkdirSync(RUN, { recursive: true });
for (const d of ONE ? ["take", "assets/media", "assets/clips", "assets/gifs", "assets/stock", "film/media"] : ["take", "shorts", "stills", "assets/media", "assets/clips", "assets/gifs", "assets/stock", "film/media", "exports"]) fs.mkdirSync(path.join(RUN, d), { recursive: true });
// one take keeps the pace the user picked (the editor's brief: ×1 by default); a long video's shorts, the take's speed
const speed = +(opt("--speed") || run.speed || (ONE ? 1 : profile().voiceover?.introSpeed || 1.1));
fs.writeFileSync(path.join(RUN, "run.json"), JSON.stringify({ skill: opt("--skill") || (ONE ? "whiteboard-editor" : "shorts"), createdAt: Date.now(), ...run, slug, ...(ONE ? { one: true, out: keepPath(path.resolve(ROOT, out)) } : {}),
  language: opt("--language") || run.language || profile().language || "en", subject: opt("--subject") || run.subject || "",
  style, count, speed, video: keepPath(video) }, null, 2) + "\n");
// the brand of the run (workspace/brand/, set once in the app): the accent of the marker, the logo
try { writeRun(RUN); } catch (e) { console.log(`⚠ the brand could not be read (${e.message}): the style's yellow is used`); }
if (!fs.existsSync(path.join(RUN, "README.md")))
  fs.writeFileSync(path.join(RUN, "README.md"), ONE
    ? `# Whiteboard · ${slug}\n\nMade with GTM by Pipecorn (\`/video-whiteboard-editor\`) from \`${keepPath(video)}\`.\nPictures: ${STYLES.styles[style].name}.\n\n## What is made up on screen, the media and their licences\n\n`
    : `# Shorts · ${slug}\n\nMade with GTM by Pipecorn (\`/video-long-to-shorts\`) from \`${keepPath(video)}\`.\nStyle: ${STYLES.styles[style].name}.\n\n## The shorts\n\n(written by cut.mjs and at the delivery)\n\n## What is made up on screen, the media and their licences\n\n`);
step(RUN, "take", "waiting", ONE ? "Your take, ready to be heard" : "Your long video, ready to be heard");
console.log(ONE ? `project: ${rel(RUN)} · ${path.basename(video)} · one short, edited in place → ${keepPath(path.resolve(ROOT, out))} · pictures ${STYLES.styles[style].name} · ×${speed}`
  : `run: ${rel(RUN)} · ${path.basename(video)} · ${count} shorts wanted · style ${STYLES.styles[style].name} · ×${speed}`);
console.log(`→ next: node plugins/video/skills/shorts/scripts/listen.mjs ${rel(RUN)} --lang ${opt("--language") || run.language || "en"}`);
