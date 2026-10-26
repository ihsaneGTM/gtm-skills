// The ffmpeg zoom expression for the camera, generated from the project's
// camera steps. Printed to stdout for build.sh.
//
// zoompan, not crop: ffmpeg 8 removed `eval=frame` from crop, and crop cannot
// animate its OUTPUT SIZE at all — it fails at configure time because `t` does
// not exist yet. zoompan's time variable is `it` (input timestamp), NOT `t`.
//
// A step is [t, zoom, ramp, anchorX?, ease?]. `ease` is optional and defaults to
// the linear ramp every earlier project was cut with: "out" (cubic ease-out) is
// the opening de-zoom of a short — fast off the tight frame, settling on the wide
// one, the move a whoosh can ride (2026-09-29: a light whoosh with a de-zoom at the
// start of every video); "inout" is a smoothstep. The JS mirrors of
// this curve (speaker.mjs, fit.mjs, preview.mjs) read the same `ease` field
// through camEase() so the overlay and the picture cannot disagree.
import path from "node:path";
import { pathToFileURL } from "node:url";

import fs from "node:fs";
const { cameraSteps } = await import(pathToFileURL(path.resolve(process.cwd(), "edl.mjs")).href);
const st = cameraSteps();
// u is a clip(…) expression; the easing wraps it
const EASE = {
  linear: u => u,
  out: u => `(1-pow(1-${u},3))`,
  inout: u => `(${u}*${u}*(3-2*${u}))`,
};
const ease = (name, u) => (EASE[name ?? "linear"] ?? EASE.linear)(u);
// --ax prints the horizontal anchor as a function of time instead of the zoom.
// A step may carry a 4th value, the anchor x for that step: the frame then
// drifts AWAY from a title block as it punches in (anchor 0.25 pushes the
// speaker right, 0.75 pushes them left), and drifts back on the release. The
// drift is (zoom−1)·(0.5−ax), so it ramps with the zoom and never jumps.
if (process.argv.includes("--ax")) {
  const P = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "project.json"), "utf8"));
  let ax = P.anchorX ?? 0.5, e = ax.toFixed(4);
  for (const [t, , r, a, es] of st) {
    if (a == null || a === ax) continue;
    e += `+(${(a - ax).toFixed(4)})*${ease(es, `clip((it-${t.toFixed(2)})/${Math.max(0.001, r).toFixed(3)},0,1)`)}`;
    ax = a;
  }
  process.stdout.write(e); process.exit(0);
}
if (!st.length) { process.stdout.write("1"); process.exit(0); }
// linear ramps: at 0.2-0.5 s they read as a snap, and they keep the expression
// short enough to stay cheap to evaluate per frame
let e = `${st[0][1].toFixed(4)}`;
for (let i = 1; i < st.length; i++) {
  const [t, z, r, , es] = st[i], prev = st[i - 1][1];
  e += `+(${(z - prev).toFixed(4)})*${ease(es, `clip((it-${t.toFixed(2)})/${Math.max(0.001, r).toFixed(3)},0,1)`)}`;
}
process.stdout.write(e);
