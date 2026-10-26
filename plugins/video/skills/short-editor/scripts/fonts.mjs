// The faces the vertical language draws with, provisioned so nobody installs a font.
//
//   node fonts.mjs            # from the working directory — init.sh runs it
//
// Impact is a macOS system font. The script accent is SACRAMENTO (picked in review
// over Snell Roundhand and Lobster): Google Fonts, SIL Open Font License,
// fetched ONCE into the project's assets/fonts from Google's own repository. The
// engine searches that folder first (scene.mjs FONT_DIRS), so nothing is installed
// system-wide and no font is committed to this repo. A face this file does not know
// has to be dropped into assets/fonts by hand — a paid one (Relation) always does.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const KNOWN = {
  "Sacramento-Regular.ttf": "ofl/sacramento/Sacramento-Regular.ttf",
  "Lobster-Regular.ttf": "ofl/lobster/Lobster-Regular.ttf",
};
const P = fs.existsSync("project.json") ? JSON.parse(fs.readFileSync("project.json", "utf8")) : {};
const want = [...new Set([P.script ?? "Sacramento-Regular.ttf", P.scriptBlack ?? P.script ?? "Sacramento-Regular.ttf"])];
const HERE = path.resolve("assets", "fonts");
const DIRS = [HERE, path.join(os.homedir(), "Library", "Fonts"), "/Library/Fonts"];

let bad = 0;
for (const f of want) {
  if (DIRS.some(d => fs.existsSync(path.join(d, f)))) continue;
  const src = KNOWN[f];
  if (!src) { console.error(`  ⚠ font ${f} not found; drop the file into assets/fonts/`); bad++; continue; }
  const url = `https://raw.githubusercontent.com/google/fonts/main/${src}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    fs.mkdirSync(HERE, { recursive: true });
    fs.writeFileSync(path.join(HERE, f), Buffer.from(await r.arrayBuffer()));
    console.error(`  ✓ ${f} (Google Fonts, OFL) → assets/fonts/`);
  } catch (e) {
    console.error(`  ⚠ ${f}: download failed (${e.message}); ${url}`);
    bad++;
  }
}
process.exit(bad ? 1 : 0);
