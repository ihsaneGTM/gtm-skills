#!/usr/bin/env node
// Long video to shorts, the delivery: every finished short of the run (workspace/videos/<slug>-<n>-….mp4) linked into the
// run's exports/ (a hard link: the same file twice on the disk costs nothing), so the app's page of the run
// (/motion/<slug>) plays them, and the step « checks » marked done. Nothing is copied, moved or deleted.
//
//   node deliver.mjs <run-dir>
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../../motion/brand.mjs";
import { step } from "../../../motion/progress.mjs";

const RUN = path.resolve(process.argv[2] || "");
const run = (() => { try { return JSON.parse(fs.readFileSync(path.join(RUN, "run.json"), "utf8")); } catch { return null; } })();
if (!run?.slug) { console.error("✗ node deliver.mjs <run-dir>: the run's folder (its run.json)"); process.exit(2); }
const VIDEOS = path.join(ROOT, "workspace", "videos"), OUT = path.join(RUN, "exports");
fs.mkdirSync(OUT, { recursive: true });
const mine = fs.readdirSync(VIDEOS).filter(f => f.startsWith(`${run.slug}-`) && /\.mp4$/i.test(f) && !/\.tmp\.mp4$/i.test(f)).sort();
let linked = 0;
for (const f of mine) {
  const src = path.join(VIDEOS, f), dst = path.join(OUT, f);
  try {
    if (fs.existsSync(dst)) { if (fs.statSync(dst).ino !== fs.statSync(src).ino) console.log(`⚠ exports/${f} is another file (an older render?): left as it is`); continue; }
    fs.linkSync(src, dst); linked++;
  } catch (e) { console.log(`⚠ ${f}: not linked (${e.code || e.message}); it stays in workspace/videos/`); }
}
step(RUN, "checks", "done", `${mine.length} short${mine.length > 1 ? "s" : ""} delivered`);
console.log(`${mine.length} short${mine.length > 1 ? "s" : ""} of ${run.slug} in exports/ (${linked} new link${linked > 1 ? "s" : ""}): ${mine.join(", ") || "none yet"}`);
