// The faces of the explainer language, provisioned so nobody installs a font.
//
//   node fonts.mjs            # from the working directory — init.sh runs it
//
// INTER (Rasmus Andersson, SIL Open Font License): ExtraBold for every word on screen (the
// title, the captions, the figures: measured on the reference, Inter at -0.01 em), Bold,
// SemiBold and Medium for small print. Static files from the npm package `inter-ui` (pinned),
// through jsDelivr. INSTRUMENT SERIF ITALIC (Google Fonts, OFL): the one accent of a title.
// Fetched ONCE into the project's assets/fonts; stage.mjs registers them from there (or from
// ~/Library/Fonts when they are installed). Nothing is installed system-wide, nothing committed.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const INTER = "https://cdn.jsdelivr.net/npm/inter-ui@4.1.0/web";
const WANT = [
  ["Inter-ExtraBold", `${INTER}/Inter-ExtraBold.woff2`, "woff2"],
  ["Inter-Bold", `${INTER}/Inter-Bold.woff2`, "woff2"],
  ["Inter-SemiBold", `${INTER}/Inter-SemiBold.woff2`, "woff2"],
  ["Inter-Medium", `${INTER}/Inter-Medium.woff2`, "woff2"],
  ["InstrumentSerif-Italic", "https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/InstrumentSerif-Italic.ttf", "ttf"],
];
const HERE = path.resolve("assets", "fonts");
const DIRS = [HERE, path.join(os.homedir(), "Library", "Fonts"), "/Library/Fonts"];
const have = name => DIRS.some(d => ["ttf", "otf", "woff2"].some(e => fs.existsSync(path.join(d, `${name}.${e}`))));

let bad = 0;
for (const [name, url, ext] of WANT) {
  if (have(name)) continue;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    fs.mkdirSync(HERE, { recursive: true });
    fs.writeFileSync(path.join(HERE, `${name}.${ext}`), Buffer.from(await r.arrayBuffer()));
    console.error(`  ✓ ${name} (OFL) → assets/fonts/`);
  } catch (e) {
    console.error(`  ⚠ ${name}: download failed (${e.message}); ${url}`);
    bad++;
  }
}
process.exit(bad ? 1 : 0);
