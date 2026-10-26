// Does every title row stay out of the speaker at the block's PEAK zoom?
//
//   node fit.mjs            # from the working directory
//
// A block that clears the head at rest can sit on a shoulder once the camera
// punches in and drifts. This lays every block out with the real fonts, takes
// the largest zoom and its anchor inside the block's window from edl.mjs, and
// checks each row against a silhouette of a centred seated speaker (half-width
// by frame height, measured on the source at rest: head 0.085, neck 0.07,
// chest 0.13 → shoulders 0.21). Override the silhouette in project.json as
// `silhouette: [[y, halfWidth], …]` and its centre as `speakerX`.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas, camEase } from "./scene.mjs";
import { layoutBlock } from "./titles.mjs";

const CWD = process.cwd();
const P = JSON.parse(fs.readFileSync(path.resolve(CWD, "project.json"), "utf8"));
const E = await import(pathToFileURL(path.resolve(CWD, "edl.mjs")).href);
const PLAN = await import(pathToFileURL(path.resolve(CWD, "plan.mjs")).href);
const W = P.width, H = P.height, AY = P.anchorY ?? 0.28, CX = P.speakerX ?? 0.5;
const SIL = P.silhouette ?? [[0.08, 0.05], [0.13, 0.085], [0.36, 0.09], [0.42, 0.07], [0.47, 0.13], [0.52, 0.18], [0.57, 0.21], [1.0, 0.22]];
const MARGIN = 0.012 * W;
const hw = py => {
  if (py <= SIL[0][0]) return SIL[0][1];
  for (let i = 1; i < SIL.length; i++) if (py <= SIL[i][0]) { const [y0, w0] = SIL[i - 1], [y1, w1] = SIL[i]; return w0 + (w1 - w0) * (py - y0) / (y1 - y0); }
  return SIL[SIL.length - 1][1];
};
// A MEASURED silhouette beats a modelled one, and it has to be windowed. On the
// reference take the model was 64 px PESSIMISTIC at head height (it refused a
// size that fit) and ~130 px OPTIMISTIC below the shoulders (it passed rows that
// land on the speaker's arm) — wrong in both directions, and a check that is wrong gets
// ignored. `matte/edges.json` (scripts/silhouette.mjs --all)
// holds the speaker's real edges per frame, so each row is checked against the envelope of
// ITS OWN window instead of the worst frame of the whole intro.
const EDGES = (() => {
  const f = path.resolve(CWD, "matte", "edges.json");
  try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; } catch { return null; }
})();
const lerpAt = (pts, py) => {
  if (py <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (py <= pts[i][0]) {
    const [y0, w0] = pts[i - 1], [y1, w1] = pts[i];
    return w0 + (w1 - w0) * (py - y0) / (y1 - y0);
  }
  return pts[pts.length - 1][1];
};
// LEFT AND RIGHT SEPARATELY. A single half-width is the mistake the modelled
// silhouette also makes: the speaker is not symmetric — the head spans 0.42→0.58 of
// the width while the arms reach 0.31→0.72 — so collapsing to one number lets the
// widest side dictate both, and a gesture on one side then refuses a block on the
// other. Measured that way, three rows that visibly clear the speaker by 200 px were
// flagged. Keep the two edges, and check each block against the one it faces.
const edgesIn = (t0, t1) => {
  if (!EDGES) return null;
  const fps = EDGES.fps || P.fps || 30;
  const a = Math.max(0, Math.floor(t0 * fps));
  const z = Math.min(EDGES.frames.length - 1, Math.ceil(t1 * fps));
  const L = EDGES.bands.map(() => 1), R = EDGES.bands.map(() => 0);
  for (let i = a; i <= z; i++) {
    const fr = EDGES.frames[i]; if (!fr) continue;
    EDGES.bands.forEach((_, b) => {
      const l = fr[b * 2], r = fr[b * 2 + 1];
      if (r > 0) { L[b] = Math.min(L[b], l); R[b] = Math.max(R[b], r); }
    });
  }
  const lp = EDGES.bands.map((y, b) => [y, L[b]]).filter((_, b) => R[b] > 0);
  const rp = EDGES.bands.map((y, b) => [y, R[b]]).filter((_, b) => R[b] > 0);
  return lp.length ? { left: py => lerpAt(lp, py), right: py => lerpAt(rp, py) } : null;
};

const steps = E.cameraSteps();
function cameraAt(t) {
  let z = steps[0]?.[1] ?? 1, ax = steps[0]?.[3] ?? P.anchorX ?? 0.5;
  for (let i = 1; i < steps.length; i++) {
    const [ts, zs, r, a, e] = steps[i]; if (ts > t) break;
    const k = r > 0 ? camEase(e, Math.min(1, (t - ts) / r)) : 1;
    z = z + (zs - z) * k;
    if (a != null) ax = ax + (a - ax) * k;
  }
  return { z, ax };
}
function peakIn(from, to) {
  let best = { z: 0, ax: 0.5, t: from };
  for (let t = from; t <= to; t += 0.05) { const c = cameraAt(t); if (c.z > best.z) best = { ...c, t }; }
  return best;
}
const ctx = createCanvas(W, H).getContext("2d");
console.log(EDGES
  ? `silhouette MEASURED on ${EDGES.frames.length} matte frames, window by window (centre ${CX})`
  : `silhouette MODELLED (no matte/edges.json); approximate in both directions`);
let bad = 0;
for (const b of PLAN.BEATS) {
  if (!b.spec) { console.log(`${b.id}: no spec exposed; skipped`); continue; }
  const lay = layoutBlock(ctx, b.spec);
  console.log(`\n${b.id}  (${b.from.toFixed(2)}–${b.to.toFixed(2)} s)`);
  lay.rows.forEach((r, i) => {
    // a row exists from ITS onset, so its window starts there — a block's first
    // line often lands while the camera is still releasing from the previous
    // punch, and checking every row against that instant flagged rows that
    // were not on screen yet
    const t0 = Math.max(b.from, b.spec.lines[i]?.t ?? b.from);
    const cam = peakIn(t0, b.to);
    const me = edgesIn(t0, b.to);
    const center = CX * cam.z - (cam.z - 1) * cam.ax;
    // check the row's top and bottom against the silhouette at that output height
    let worst = Infinity;
    for (const yo of [r.y0, r.y1]) {
      const py = AY + (yo / H - AY) / cam.z;
      // an x at rest lands at x·z − (z−1)·anchor once the camera has moved
      const edge = me
        ? ((b.spec.align === "right" ? me.right(py) : me.left(py)) * cam.z - (cam.z - 1) * cam.ax) * W
        : (b.spec.align === "right" ? (center + hw(py) * cam.z) * W : (center - hw(py) * cam.z) * W);
      const slack = b.spec.align === "right" ? r.x0 - MARGIN - edge : edge - MARGIN - r.x1;
      worst = Math.min(worst, slack);
    }
    const ok = worst >= 0;
    if (!ok) bad++;
    console.log(`  ${ok ? "✓" : "✗"} ${r.text.padEnd(22)} ${String(r.size).padStart(3)}px  x ${(r.x0 / W * 100).toFixed(1)}–${(r.x1 / W * 100).toFixed(1)} %  y ${(r.y0 / H * 100).toFixed(0)}–${(r.y1 / H * 100).toFixed(0)} %  zoom ${cam.z.toFixed(2)} @${cam.t.toFixed(2)}s  margin ${worst.toFixed(0)} px`);
  });
}
console.log(bad ? `\n✗ ${bad} row(s) inside the silhouette` : "\n✓ every block clears the speaker at peak zoom");
process.exit(bad ? 1 : 0);
