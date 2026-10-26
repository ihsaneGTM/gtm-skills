// HOLES IN THE MATTE — rectangles that are NOT the speaker, whatever Vision says.
//
//   node matte-holes.mjs          # from the working directory; matte.mjs runs it too
//
// project.json:
//   "matteHoles": [ { "from": 0, "to": 4.076, "rect": [0.00, 0.40, 0.585, 0.80] } ]
// `from`/`to` are OUTPUT seconds (the matte is per output frame), `rect` is
// [x0, y0, x1, y1] in fractions of the frame, in the matte's own space — i.e.
// BEFORE the camera, the frame as shot.
//
// Why it exists (2026-09-29): Vision segments a PERSON, and what a person holds
// is part of the person. In the opening of the GTM OS short the speaker holds a laptop,
// and the matte kept the laptop at 50-90 % opacity (5 141 px of a 22 500 px probe
// window non-zero, up to 235/255). A window meant to slide out from behind the speaker's
// torso over that laptop then showed the laptop THROUGH it, because the person
// layer — laptop included — is composited on top of the under layer. A threshold
// cannot fix that (the laptop is not faint, it is half-confident); a hole in the
// region where the speaker is not can.
//
// Idempotent: painting black over black changes nothing, so it can run after
// every matte.mjs and again whenever the list changes.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function applyHoles(cwd = process.cwd()) {
  const P = JSON.parse(fs.readFileSync(path.resolve(cwd, "project.json"), "utf8"));
  const holes = P.matteHoles ?? [];
  const dir = path.resolve(cwd, "matte");
  if (!holes.length || !fs.existsSync(dir)) return 0;
  const W = P.width ?? 1080, H = P.height ?? 1920, FPS = P.fps ?? 30;
  const have = fs.readdirSync(dir).filter(f => /^m\d{5}\.png$/.test(f)).length;
  let n = 0;
  for (const h of holes) {
    const a = Math.max(1, Math.round(h.from * FPS) + 1), b = Math.min(have, Math.round(h.to * FPS) + 1);
    if (b < a) continue;
    const [x0, y0, x1, y1] = h.rect;
    const box = `drawbox=x=${Math.round(x0 * W)}:y=${Math.round(y0 * H)}:w=${Math.round((x1 - x0) * W)}:h=${Math.round((y1 - y0) * H)}:color=black:t=fill`;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "holes-"));
    // the output MUST stay 8-bit gray like the rest of matte/: drawbox hands back an
    // RGB frame and the PNG muxer then writes rgb24 — and a mask sequence whose pixel
    // format changes mid-way makes ffmpeg RE-INITIALISE the whole filtergraph at that
    // frame. Seen on the GTM OS short: three frames with no layer at all, right on the
    // cut where the repainted masks (rgb24) met the untouched ones (gray).
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-start_number", String(a), "-i", path.join(dir, "m%05d.png"),
      "-frames:v", String(b - a + 1), "-vf", `format=gray,${box},format=gray`, "-pix_fmt", "gray",
      "-start_number", String(a), path.join(tmp, "m%05d.png")], { stdio: "inherit" });
    if (r.status !== 0) { fs.rmSync(tmp, { recursive: true, force: true }); throw new Error(`matte-holes: ffmpeg failed on ${a}-${b}`); }
    for (const f of fs.readdirSync(tmp)) { fs.renameSync(path.join(tmp, f), path.join(dir, f)); n++; }
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`  hole [${h.rect.join(", ")}] on masks ${a}-${b} (${h.from}-${h.to} s)`);
  }
  return n;
}

const MAIN = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (MAIN) {
  const n = applyHoles();
  console.log(n ? `matte-holes: ${n} mask(s) repainted` : "matte-holes: nothing to do (no matteHoles in project.json)");
}
