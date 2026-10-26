#!/usr/bin/env node
// Frames of the take itself, as pictures for the stage (a video card, a phone's screen, a
// thumbnail in a grid): real material, the speaker's own footage.
//
//   node stills.mjs 3.2 12.5 20      # OUTPUT seconds → assets/shots/s_3.20.jpg …
//
// From the working directory; each time goes through the project's cuts and speed (the
// engine's cuts.mjs), so the still is the frame the edit shows there. 540 px wide, JPEG.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const E = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../short-editor/scripts");
const { outToSrc } = await import(pathToFileURL(path.join(E, "cuts.mjs")).href);
const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const src = P.rawSource && !P.assembly ? P.source : P.source;
const times = process.argv.slice(2).map(Number).filter(Number.isFinite);
if (!times.length) { console.error("usage: stills.mjs <output seconds> …"); process.exit(2); }
fs.mkdirSync("assets/shots", { recursive: true });
for (const t of times) {
  const out = `assets/shots/s_${t.toFixed(2)}.jpg`;
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(outToSrc(t, P)), "-i", src, "-frames:v", "1", "-vf", "scale=540:-2:flags=lanczos", "-q:v", "3", out]);
  console.log(r.status === 0 ? out : `✗ ${t}: ${String(r.stderr).trim()}`);
}
