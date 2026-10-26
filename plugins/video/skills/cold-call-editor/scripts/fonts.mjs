// The face of the call record, provisioned so nobody installs a font.
//
//   node fonts.mjs            # from the working directory — init.sh runs it
//
// GEIST MONO (Vercel, SIL Open Font License), the two weights the record draws with:
// Medium for the words, Bold for the names. Fetched ONCE into the project's assets/fonts
// from the npm package `geist` (pinned) through jsDelivr; typewriter.mjs registers them
// from there. Nothing is installed system-wide and no font is committed to this repo.
import fs from "node:fs";
import path from "node:path";

const VERSION = "1.5.1";
const FILES = ["GeistMono-Medium.ttf", "GeistMono-Bold.ttf"];
const HERE = path.resolve("assets", "fonts");
let bad = 0;
for (const f of FILES) {
  if (fs.existsSync(path.join(HERE, f))) continue;
  const url = `https://cdn.jsdelivr.net/npm/geist@${VERSION}/dist/fonts/geist-mono/${f}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    fs.mkdirSync(HERE, { recursive: true });
    fs.writeFileSync(path.join(HERE, f), Buffer.from(await r.arrayBuffer()));
    console.error(`  ✓ ${f} (Geist Mono, OFL) → assets/fonts/`);
  } catch (e) {
    console.error(`  ⚠ ${f}: download failed (${e.message}); ${url}`);
    bad++;
  }
}
process.exit(bad ? 1 : 0);
