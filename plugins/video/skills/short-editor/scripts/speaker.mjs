// WHERE THE SPEAKER IS, in the OUTPUT frame, at a given time — for a plan that
// wants to start an arrow behind the speaker's shoulder or rest a sticker on
// their edge.
//
//   import { speaker } from ".../speaker.mjs";
//   const S = speaker();                 // reads matte/edges.json + edl.mjs camera
//   S.left(t, 0.55)  → fraction of the width where the speaker's LEFT edge is at height 0.55
//   S.right(t, 0.55), S.centre(t), S.top(t)
//
// The matte is measured WITHOUT the camera (matte.mjs), and the overlay is drawn
// on top of the camera's output, so the same transform fit.mjs applies is applied
// here: x → x·z − (z−1)·anchor. Heights are not scaled (anchorY is the head and the
// zoom is small), which is within a band's tolerance.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { camEase } from "./scene.mjs";

export async function speaker(cwd = process.cwd(), { steps = null } = {}) {
  const P = JSON.parse(fs.readFileSync(path.resolve(cwd, "project.json"), "utf8"));
  // a PLAN that wants the speaker's position must hand the camera steps in: edl.mjs
  // imports the plan for its cues, so the plan importing edl.mjs would be a cycle
  if (!steps) { const E = await import(pathToFileURL(path.resolve(cwd, "edl.mjs")).href); steps = E.cameraSteps(); }
  const f = path.resolve(cwd, "matte", "edges.json");
  const EDGES = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
  const fps = EDGES?.fps || P.fps || 30;
  const cam = t => {
    let z = steps[0]?.[1] ?? 1, ax = steps[0]?.[3] ?? P.anchorX ?? 0.5;
    for (let i = 1; i < steps.length; i++) {
      const [ts, zs, r, a, e] = steps[i]; if (ts > t) break;
      const k = r > 0 ? camEase(e, Math.min(1, (t - ts) / r)) : 1;
      z = z + (zs - z) * k; if (a != null) ax = ax + (a - ax) * k;
    }
    return { z, ax };
  };
  const bandAt = (t, py, side) => {
    if (!EDGES) return side === "left" ? (P.speakerX ?? 0.5) - 0.12 : (P.speakerX ?? 0.5) + 0.12;
    const fr = EDGES.frames[Math.min(EDGES.frames.length - 1, Math.max(0, Math.round(t * fps)))];
    const pts = EDGES.bands.map((y, b) => [y, fr[b * 2 + (side === "left" ? 0 : 1)], fr[b * 2 + 1]]).filter(p => p[2] > 0);
    if (!pts.length) return side === "left" ? 0.4 : 0.6;
    if (py <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (py <= pts[i][0]) { const [y0, v0] = pts[i - 1], [y1, v1] = pts[i]; return v0 + (v1 - v0) * (py - y0) / (y1 - y0); }
    return pts[pts.length - 1][1];
  };
  const out = (t, x) => { const { z, ax } = cam(t); return x * z - (z - 1) * ax; };
  return {
    cam,
    left: (t, py) => out(t, bandAt(t, py, "left")),
    right: (t, py) => out(t, bandAt(t, py, "right")),
    centre: t => out(t, P.speakerX ?? 0.5),
    // the first band with any width = the top of the head
    top: t => { if (!EDGES) return 0.1; const fr = EDGES.frames[Math.min(EDGES.frames.length - 1, Math.round(t * fps))]; for (let b = 0; b < EDGES.bands.length; b++) if (fr[b * 2 + 1] > 0) return EDGES.bands[b]; return 0.1; },
  };
}
