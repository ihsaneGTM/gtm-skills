#!/usr/bin/env node
// ONE COMPOSITED FRAME of the project at output time t — the source through the
// camera, the under layer, the speaker (through the matte), the over layer and the
// captions — without a render. What a look at a beat costs: ~3 s instead of 4 min.
//
//   node preview.mjs 12.3 20.1 --out <dir> [--width 1280] [--sheet [columns]]
//
// --sheet: the instants also laid out in ONE picture, <dir>/sheet.jpg, each with its time written
// on it (4 columns by default): one image to look at instead of a sheet made by hand.
//
// Uses render.mjs --png for the two overlay layers (so what you see is exactly
// what build.sh will composite) and ffmpeg for the camera and the matte. Several instants are
// made at once, one process each (four at a time), so a sheet of eight costs about two.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL, fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const OUT = arg("--out", "preview"), VW = Number(arg("--width", 1280));
const SHEET = argv.includes("--sheet"), COLS = Number(argv[argv.indexOf("--sheet") + 1]) || 4;
const TIMES = argv.filter((a, i) => /^\d/.test(a) && !["--out", "--width", "--sheet"].includes(argv[i - 1])).map(Number);
const CWD = process.cwd();
const P = JSON.parse(fs.readFileSync(path.resolve(CWD, "project.json"), "utf8"));
const E = await import(pathToFileURL(path.resolve(CWD, "edl.mjs")).href);
const SCRIPTS = path.resolve(fileURLToPath(new URL(".", import.meta.url)));
// output time → source time through the speed AND the project's `cuts` (cuts.mjs)
const { outToSrc } = await import(pathToFileURL(path.join(SCRIPTS, "cuts.mjs")).href);
const { camEase } = await import(pathToFileURL(path.join(SCRIPTS, "scene.mjs")).href);
const W = P.width, H = P.height, FPS = P.fps ?? 30, SPEED = P.speed ?? 1, AY = P.anchorY ?? 0.28;
const steps = E.cameraSteps();
const cam = t => {
  let z = steps[0]?.[1] ?? 1, ax = steps[0]?.[3] ?? P.anchorX ?? 0.5;
  for (let i = 1; i < steps.length; i++) { const [ts, zs, r, a, e] = steps[i]; if (ts > t) break; const k = r > 0 ? camEase(e, Math.min(1, (t - ts) / r)) : 1; z = z + (zs - z) * k; if (a != null) ax = ax + (a - ax) * k; }
  return { z, ax };
};
fs.mkdirSync(OUT, { recursive: true });
const HAS_MATTE = fs.existsSync(path.resolve(CWD, "matte")) && fs.readdirSync(path.resolve(CWD, "matte")).some(f => f.endsWith(".png"));
const run = promisify(execFile);
async function one(t) {
  const { z, ax } = cam(t);
  // a style that lays the picture out itself (project.json `layout`, as build.sh): its filter
  // for this one instant, the same for the picture and the matte
  const crop = P.layout ? execFileSync("node", [P.layout, "--at", String(t)], { cwd: CWD, encoding: "utf8" }).trim()
    : `crop=iw/${z.toFixed(5)}:ih/${z.toFixed(5)}:${ax.toFixed(5)}*(iw-iw/${z.toFixed(5)}):${AY}*(ih-ih/${z.toFixed(5)}),scale=${W}:${H}`;
  const tag = t.toFixed(2);
  await run("node", [path.join(SCRIPTS, "render.mjs"), "--png", String(t), "--layer", "over"], { cwd: CWD, maxBuffer: 1 << 26 });
  fs.renameSync(path.resolve(CWD, `frame_${t}.png`), path.resolve(OUT, `over_${tag}.png`));
  let inputs = ["-ss", String(outToSrc(t, P)), "-i", P.source, "-i", path.resolve(OUT, `over_${tag}.png`)];
  let graph;
  if (HAS_MATTE) {
    await run("node", [path.join(SCRIPTS, "render.mjs"), "--png", String(t), "--layer", "under"], { cwd: CWD, maxBuffer: 1 << 26 });
    fs.renameSync(path.resolve(CWD, `frame_${t}.png`), path.resolve(OUT, `under_${tag}.png`));
    const mi = Math.min(fs.readdirSync(path.resolve(CWD, "matte")).filter(f => f.endsWith(".png")).length, Math.round(t * FPS) + 1);
    inputs.push("-i", path.resolve(OUT, `under_${tag}.png`), "-i", path.resolve(CWD, "matte", `m${String(mi).padStart(5, "0")}.png`));
    graph = `[0:v]${crop},format=rgba[cam];[3:v]format=gray,${crop}[mask];[cam]split=2[bg][cut];[cut][mask]alphamerge[person];` +
      `[bg][2:v]overlay=0:0:format=auto[b1];[b1][person]overlay=0:0:format=auto[b2];[b2][1:v]overlay=0:0:format=auto,scale=${VW}:-2[v]`;
  } else {
    graph = `[0:v]${crop},format=rgba[cam];[cam][1:v]overlay=0:0:format=auto,scale=${VW}:-2[v]`;
  }
  const outFile = path.resolve(OUT, `p_${tag}.jpg`);
  await run("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", graph, "-map", "[v]", "-frames:v", "1", "-q:v", "3", outFile]);
  for (const f of [`over_${tag}.png`, `under_${tag}.png`]) { try { fs.unlinkSync(path.resolve(OUT, f)); } catch {} }
  return `${outFile}  (zoom ${z.toFixed(2)} @${ax.toFixed(2)})`;
}
// the same instant twice would write the same files at once: each is made once
const ALL = [...new Set(TIMES)], lines = new Array(ALL.length);
let next = 0;
await Promise.all(Array.from({ length: Math.max(1, Math.min(4, os.availableParallelism() - 2, ALL.length)) }, async () => {
  while (next < ALL.length) { const k = next++; lines[k] = await one(ALL[k]); }
}));
for (const l of lines) console.log(l);
if (SHEET && ALL.length) {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const tw = Math.min(360, Math.round(1440 / Math.min(COLS, ALL.length))), th = Math.round(tw * H / W), cols = Math.min(COLS, ALL.length);
  const c = createCanvas(cols * tw, Math.ceil(ALL.length / cols) * th), x = c.getContext("2d");
  x.fillStyle = "#111"; x.fillRect(0, 0, c.width, c.height);
  for (const [k, t] of ALL.entries()) {
    const img = await loadImage(path.resolve(OUT, `p_${t.toFixed(2)}.jpg`));
    const X = (k % cols) * tw, Y = Math.floor(k / cols) * th;
    x.drawImage(img, X, Y, tw, th);
    x.font = `bold ${Math.round(tw / 11)}px Helvetica`; x.fillStyle = "rgba(0,0,0,.65)"; x.fillRect(X, Y, tw, Math.round(tw / 8));
    x.fillStyle = "#FFD90D"; x.fillText(`${t.toFixed(2)} s`, X + 8, Y + Math.round(tw / 11));
  }
  fs.writeFileSync(path.resolve(OUT, "sheet.jpg"), await c.encode("jpeg", 85));
  console.log(`${path.resolve(OUT, "sheet.jpg")}  (${ALL.length} instants)`);
}
