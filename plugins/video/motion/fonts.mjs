#!/usr/bin/env node
// The faces the motion skills draw with when the user's brand has none: all SIL Open Font License,
// fetched ONCE from Google's own repository into plugins/video/motion/fonts/ (never committed: the
// folder is gitignored, as the music is). Your brand's own fonts (workspace/brand/fonts) come first.
//
//   node fonts.mjs [--check]
//
//   Archivo            captions, labels, big numbers (the vertical styles' one-word captions: 900)
//   Onest              the text of cards and documents (the article video)
//   Bricolage Grotesque titles (the article video, the trailer's default display face)
//   Fraunces           the arch titles of the vertical styles (900, soft and wonky, 70s serif)
//   Instrument Serif   one italic accent where a style takes one
//   Caveat             handwriting on a document (the documents look of the motion short: a date, a name)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fonts");
export const FONTS = {
  "Archivo.ttf": "ofl/archivo/Archivo%5Bwdth,wght%5D.ttf",
  "Onest.ttf": "ofl/onest/Onest%5Bwght%5D.ttf",
  "BricolageGrotesque.ttf": "ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz,wdth,wght%5D.ttf",
  "Fraunces.ttf": "ofl/fraunces/Fraunces%5BSOFT,WONK,opsz,wght%5D.ttf",
  "InstrumentSerif-Italic.ttf": "ofl/instrumentserif/InstrumentSerif-Italic.ttf",
  "Caveat.ttf": "ofl/caveat/Caveat%5Bwght%5D.ttf",
  // GTM by Pipecorn's labels (its site and app): commands, eyebrows, buttons
  "GeistMono.ttf": "ofl/geistmono/GeistMono%5Bwght%5D.ttf",
};
export const missing = () => Object.keys(FONTS).filter(f => !fs.existsSync(path.join(DIR, f)));

export async function fetchFonts({ quiet = false } = {}) {
  const bad = [];
  for (const f of missing()) {
    const url = `https://raw.githubusercontent.com/google/fonts/main/${FONTS[f]}`;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      fs.mkdirSync(DIR, { recursive: true });
      const tmp = path.join(DIR, `${f}.part`);
      fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
      fs.renameSync(tmp, path.join(DIR, f));
      if (!quiet) console.error(`  ✓ ${f} (Google Fonts, OFL)`);
    } catch (e) { bad.push(`${f}: ${e.message} (${url})`); }
  }
  return bad;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) { const m = missing(); console.log(m.length ? `missing: ${m.join(", ")}` : "all fonts here"); process.exit(m.length ? 1 : 0); }
  const bad = await fetchFonts();
  for (const b of bad) console.error(`  ⚠ ${b}`);
  process.exit(bad.length ? 1 : 0);
}
