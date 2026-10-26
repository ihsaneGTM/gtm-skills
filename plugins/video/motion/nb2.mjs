#!/usr/bin/env node
// A picture made for the video, with Nano Banana 2 (Gemini 3.1 Flash Image): a sticker of an object
// the video names, a reportage-style photo of what no shot shows, a specimen document's background.
// About $0.07 a picture at 1K, billed by Google to the user's key. Nothing is downloaded from anyone.
//
//   node nb2.mjs "<prompt>" <out.jpg|png> [--aspect 16:9] [--size 1K|2K|4K] [--ref a.jpg --ref b.png] [--retries 2]
//
// The key: GEMINI_API_KEY (or NANO_BANANA_API_KEY), from the environment or the folder's .env.local.
// A picture is re-encoded: JPEG quality 92 unless the name ends in .png (a sticker source keeps PNG).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const MODEL = "gemini-3.1-flash-image-preview";

export function key() {
  for (const k of ["GEMINI_API_KEY", "NANO_BANANA_API_KEY"]) if (process.env[k]?.trim()) return process.env[k].trim();
  try {
    const m = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").match(/^\s*(?:export\s+)?(?:GEMINI_API_KEY|NANO_BANANA_API_KEY)\s*=\s*['"]?([^'"\s]+)/m);
    if (m) return m[1];
  } catch {}
  return null;
}

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
// a reference sent smaller (1280 px wide at most): the look is what counts, not the pixels
function refPart(file) {
  let buf = fs.readFileSync(file), mime = MIME[path.extname(file).toLowerCase()] || "image/jpeg";
  const tmp = path.join(fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "nb2-")), "ref.jpg");
  const r = spawnSync("sips", ["-Z", "1280", "-s", "format", "jpeg", file, "--out", tmp], { encoding: "utf8" });
  if (r.status === 0 && fs.existsSync(tmp)) { buf = fs.readFileSync(tmp); mime = "image/jpeg"; }
  return { inline_data: { mime_type: mime, data: buf.toString("base64") } };
}

export async function generate(prompt, out, { aspect = "16:9", size = "1K", refs = [], retries = 2 } = {}) {
  const k = key();
  if (!k) throw new Error("No Gemini key: add GEMINI_API_KEY in .env.local (in the app: Settings › Connectors › Add key).");
  const body = { contents: [{ parts: [{ text: prompt }, ...refs.map(refPart)] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: aspect, imageSize: size } } };
  let last = null;
  for (let i = 0; i <= retries; i++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, { method: "POST", headers: { "x-goog-api-key": k, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    const parts = j.candidates?.[0]?.content?.parts || [];
    const img = parts.find(p => p.inlineData || p.inline_data);
    if (r.ok && img) {
      const raw = Buffer.from((img.inlineData || img.inline_data).data, "base64");
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
      const tmp = `${out}.raw`;
      fs.writeFileSync(tmp, raw);
      const png = /\.png$/i.test(out);
      const s = spawnSync("sips", ["-s", "format", png ? "png" : "jpeg", ...(png ? [] : ["-s", "formatOptions", "92"]), tmp, "--out", out], { encoding: "utf8" });
      if (s.status !== 0) fs.renameSync(tmp, out); else fs.rmSync(tmp, { force: true });
      return out;
    }
    last = j.error?.message || `no picture in the answer (HTTP ${r.status})`;
    console.error(`  Nano Banana 2: ${last}${i < retries ? ", trying again" : ""}`);
  }
  throw new Error(`Nano Banana 2: ${last}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (k, d) => { const i = a.indexOf(k); return i < 0 ? d : a[i + 1]; };
  const refs = a.flatMap((x, i) => x === "--ref" ? [a[i + 1]] : []);
  if (a.length < 2) { console.log('usage: node nb2.mjs "<prompt>" <out.jpg|png> [--aspect 16:9] [--size 1K] [--ref file]… [--retries 2]'); process.exit(2); }
  generate(a[0], a[1], { aspect: opt("--aspect", "16:9"), size: opt("--size", "1K"), refs, retries: +opt("--retries", 2) })
    .then(f => console.log(`→ ${f}: look at it before it goes in the video`))
    .catch(e => { console.error(`✗ ${e.message}`); process.exit(1); });
}
