// AN ILLUSTRATION FOR A CARD, generated with Nano Banana 2 (Gemini 3.1 Flash Image) — for the
// pictures the reference took from stock and clipart: "COMPETITIVE ANALYSIS" scribbles, a 3D man
// with a magnifier, a truth-or-lie meter, a hacker at a desk. Never for a real product screen, a
// real logo, a real person or a number: those are the user's real material (SKILL.md).
//
//   node picture.mjs "<what it shows>" --name meter [--look clipart] [--aspect 4:3] [--size 1K]
//                    [--ref assets/media/other.jpeg …]
//
// --look sets the family of the reference's pictures:
//   clipart     glossy 3D clipart, white figures, white background (the 2010s stock look)
//   infographic hand-drawn marker infographic on cream paper, a few words, arrows, doodles
//   halftone    black-and-white halftone collage with one accent colour (the brand's)
//   cartoon     a funny flat cartoon, like a classic meme panel, no text
//   photo       a candid, funny stock photo
// Writes assets/media/<name>.jpeg (JPEG q92), prints the size and what it cost.
// Needs GEMINI_API_KEY (.env.local at the root of GTM by Pipecorn).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { key } from "./keys.mjs";

const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const what = argv[0], name = arg("--name");
if (!what || what.startsWith("--") || !name) { console.error('usage: node picture.mjs "<what it shows>" --name <name> [--look clipart|infographic|halftone|cartoon|photo] [--aspect 4:3] [--size 1K] [--ref file]'); process.exit(2); }
const KEY = key("GEMINI_API_KEY");
if (!KEY) { console.error("GEMINI_API_KEY is not set (.env.local at the root of GTM by Pipecorn): no generated picture. Use a picture the user supplies (media.mjs), or leave the moment to the captions."); process.exit(3); }
const P = fs.existsSync("project.json") ? JSON.parse(fs.readFileSync("project.json", "utf8")) : {};
const accent = P.accent || "#DA7756";
const LOOKS = {
  clipart: "Glossy 3D clipart illustration in the style of a 2010s stock image: smooth white 3D figures, soft studio shadows, plain pure white background.",
  infographic: "A hand-drawn marker infographic on cream paper: one big title in blue capitals, a few short labels around it with arrows and small doodle icons, clean and readable.",
  halftone: `A black-and-white halftone photo collage cut-out, high contrast, with ONE accent colour (${accent}), on a plain white background, editorial zine style.`,
  cartoon: "A funny flat cartoon panel in the style of a classic internet meme, bold outlines, saturated colours, expressive.",
  photo: "A candid, slightly funny stock photo, natural light, sharp focus.",
};
const look = LOOKS[arg("--look", "clipart")] ?? LOOKS.clipart;
const aspect = arg("--aspect", "4:3"), size = arg("--size", "1K");
const PRICE = { "0.5K": 0.045, "1K": 0.067, "2K": 0.101, "4K": 0.151 };
const prompt = `${what}.\n${look}\nThe subject centred and filling about 70 % of the frame.\nNo watermark, no logo${/text|title|label|words/i.test(what) ? "" : ", no text"}.`;

const parts = [{ text: prompt }];
for (let i = 0; i < argv.length; i++) if (argv[i] === "--ref" && argv[i + 1]) {
  const f = argv[i + 1];
  const tmp = path.resolve("tmp", `ref-${path.basename(f)}.jpg`);
  fs.mkdirSync("tmp", { recursive: true });
  spawnSync("ffmpeg", ["-v", "error", "-y", "-i", f, "-vf", "scale='min(1280,iw)':-2", "-q:v", "3", tmp]);
  parts.push({ inline_data: { mime_type: "image/jpeg", data: fs.readFileSync(tmp).toString("base64") } });
}

const body = JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: aspect, imageSize: size } } });
let buf = null, last = null;
for (let attempt = 0; attempt < 3 && !buf; attempt++) {
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent",
      { method: "POST", headers: { "x-goog-api-key": KEY, "Content-Type": "application/json" }, body });
    last = await r.json();
    const inline = (last.candidates?.[0]?.content?.parts ?? []).find(p => p.inlineData || p.inline_data);
    if (inline) buf = Buffer.from((inline.inlineData || inline.inline_data).data, "base64");
  } catch (e) { last = { error: String(e) }; }
}
if (!buf) {
  fs.mkdirSync("tmp", { recursive: true });
  fs.writeFileSync(path.join("tmp", `${name}-response.json`), JSON.stringify(last, null, 1));
  console.error(`no picture came back (3 attempts); the answer is in tmp/${name}-response.json`);
  process.exit(1);
}
fs.mkdirSync(path.resolve("assets", "media"), { recursive: true });
const raw = path.resolve("tmp", `${name}.raw`);
fs.writeFileSync(raw, buf);
const out = path.resolve("assets", "media", `${name}.jpeg`);
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-q:v", "2", out]);
if (r.status !== 0) { console.error("could not re-encode the picture"); process.exit(1); }
const s = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "json", out], { encoding: "utf8" }).stdout).streams[0];
console.log(`assets/media/${name}.jpeg — ${s.width}x${s.height} (aspect h/w ${(s.height / s.width).toFixed(3)}) · Nano Banana 2, ${size}, about $${PRICE[size] ?? "?"}`);
