// The ffmpeg gate for the progressive blur, generated from the project's
// BLUR_WINDOWS so the filter graph and the beats can never drift apart.
// Commas are escaped because the expression is embedded in a geq option inside
// a filtergraph.
//
// One window per beat, never one wide window covering the whole intro: blur
// over a stretch where nothing is drawn reads as a mistake: when nothing is
// on screen, the blur goes too.
import path from "node:path";
import { pathToFileURL } from "node:url";

const { BLUR_WINDOWS } = await import(pathToFileURL(path.resolve(process.cwd(), "edl.mjs")).href);
if (!BLUR_WINDOWS.length) { process.stdout.write("0"); process.exit(0); }
const g = BLUR_WINDOWS
  .map(([a, b]) => `clip(min((T-${a.toFixed(2)})/0.35,(${b.toFixed(2)}-T)/0.45),0,1)`)
  .reduce((x, y) => `max(${x},${y})`);
process.stdout.write(g.replace(/,/g, "\\,"));
