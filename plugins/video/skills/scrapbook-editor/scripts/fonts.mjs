// The face of the scrapbook language, provisioned so nobody installs a font.
//
//   node fonts.mjs            # from the working directory — init.sh runs it
//
// THREE faces (2026-10-05). The MARKER HAND of every word on paper (hands.mjs: Gochi Hand by
// default, the user's pick; project.json `paperFont` another). ARCHIVO (Omnibus-Type, SIL
// Open Font License; the face of the GTM by Pipecorn interface), its variable file (a width axis
// 62-125, a weight axis 100-900): book.mjs cuts the words on paper (Black, a little wide), the small
// print on tags (ExtraBold condensed, capitals) and the captions (ExtraBold) from it. FRAUNCES
// (Undercase Type, OFL): the one important word, in colour, as the reference's « Claude ». Fetched ONCE
// into the project's assets/fonts from Google's own repository (or found in ~/Library/Fonts when it
// is installed). Nothing system-wide, nothing committed.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { HANDS, DEFAULT_HAND } from "./hands.mjs";

// the marker hand on the paper: project.json `paperFont` (hands.mjs), Gochi Hand by default
const P = (() => { try { return JSON.parse(fs.readFileSync("project.json", "utf8")); } catch { return {}; } })();
const HAND = HANDS[(P.paperFont || DEFAULT_HAND).toLowerCase()] ?? HANDS[DEFAULT_HAND];
const FILES = {
  [HAND.files[0]]: { src: HAND.src, also: HAND.files.slice(1) },
  "Archivo[wdth,wght].ttf": { src: "ofl/archivo/Archivo%5Bwdth%2Cwght%5D.ttf", also: ["Archivo-VariableFont_wdth,wght.ttf"] },
  // the important word in colour (2026-10-05: the reference's « Claude »): Fraunces, the soft heavy serif
  "Fraunces[SOFT,WONK,opsz,wght].ttf": { src: "ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf", also: ["Fraunces-VF.ttf"] },
};
const HERE = path.resolve("assets", "fonts");
const DIRS = [HERE, path.join(os.homedir(), "Library", "Fonts"), "/Library/Fonts"];
let bad = 0;
for (const [f, { src, also = [] }] of Object.entries(FILES)) {
  if (DIRS.some(d => [f, ...also].some(n => fs.existsSync(path.join(d, n))))) continue;
  const urls = [`https://raw.githubusercontent.com/google/fonts/main/${src}`, `https://cdn.jsdelivr.net/gh/google/fonts@main/${src}`];
  let ok = false;
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const b = Buffer.from(await r.arrayBuffer());
      if (b.length < 10000) throw new Error("not a font");
      fs.mkdirSync(HERE, { recursive: true });
      fs.writeFileSync(path.join(HERE, f), b);
      console.error(`  ✓ ${f} (Google Fonts, OFL) → assets/fonts/`);
      ok = true; break;
    } catch (e) { if (url === urls[urls.length - 1]) console.error(`  ⚠ ${f}: download failed (${e.message})`); }
  }
  if (!ok) bad++;
}
process.exit(bad ? 1 : 0);
