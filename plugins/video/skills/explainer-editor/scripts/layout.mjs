#!/usr/bin/env node
// The picture of the explainer language: the speaker in a frame at the bottom of a black stage,
// or full screen for a breather. project.json `layout` names this file, and the engine runs it
// in place of its zoom (build.sh, preview.mjs). Run from the project's working directory.
//
//   node layout.mjs --measure [--write] [--keep-frame]   where the head is, read on the matte:
//                                         the frame's width (a close take gets a narrower one),
//                                         its crop and the full-screen framing (→ project.json stage)
//   node layout.mjs --print               the geometry and the full-screen windows of plan.mjs
//   node layout.mjs --ffmpeg --tag v|m [--offset s]    the camera filter (build.sh)
//   node layout.mjs --at t                the filter of one instant (preview.mjs)
//
// The full-screen windows are plan.mjs `FULL` ([[from, to], …], output seconds), the same list
// stage.mjs reads to take the stage away, so the picture and the drawing switch on one frame.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { geometry, cameraFilter, cameraAt, snap } from "./geometry.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const CWD = process.cwd();
const PJ = path.resolve(CWD, "project.json");
const P = JSON.parse(fs.readFileSync(PJ, "utf8"));

async function windows() {
  const f = path.resolve(CWD, "plan.mjs");
  if (!fs.existsSync(f)) return [];
  const M = await import(pathToFileURL(f).href);
  return Array.isArray(M.FULL) ? M.FULL : [];
}

if (argv.includes("--ffmpeg")) {
  process.stdout.write(cameraFilter(P, await windows(), { tag: arg("--tag", "v"), offset: parseFloat(arg("--offset", "0")) || 0 }));
  process.exit(0);
}
if (argv.includes("--at")) {
  process.stdout.write(cameraAt(P, await windows(), parseFloat(arg("--at", "0"))));
  process.exit(0);
}
if (argv.includes("--print")) {
  const g = geometry(P), W = snap(await windows(), P.fps ?? 30);
  console.log(`frame     x ${g.box.x} · w ${g.box.w} · top ${g.box.top} · radius ${g.box.r}  (${g.W}x${g.H})`);
  console.log(`split     source x${g.s.toFixed(3)}, its row ${(g.crop * 100).toFixed(1)} % on the frame's top edge (y0 ${g.y0})`);
  console.log(`full      zoom ${g.full.zoom} on x ${g.full.x}, head top ${g.full.y} at ${g.full.topAt} of the frame`);
  const tot = W.reduce((s, [a, b]) => s + b - a, 0);
  console.log(`breathers ${W.length}: ${W.map(([a, b]) => `${a.toFixed(2)}-${b.toFixed(2)}`).join(", ") || "none"} (${tot.toFixed(1)} s of ${P.duration} s)`);
  process.exit(0);
}

if (argv.includes("--measure")) {
  // The head, on the person matte (the engine's matte.mjs): its top, its centre and its width,
  // shot by shot (a take cut from several shots has its framing measured in each: the source's
  // cuts found as verify.mjs finds them). The frame's width puts the head at the reference's size
  // (from the longest shot); in each shot the frame's top edge passes `pop` px (88 at 1080, the
  // reference) under the top of the head, and the full screen makes the head 0.45 of the width.
  const { createCanvas, loadImage } = await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../short-editor/node_modules/@napi-rs/canvas/index.js")).href);
  const { srcToOut, outToSrc } = await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../short-editor/scripts/cuts.mjs")).href);
  const dir = path.resolve(CWD, "matte");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^m\d+\.png$/.test(f)).sort() : [];
  if (!files.length) { console.error("no matte/ yet: run the engine's matte.mjs first"); process.exit(1); }
  const fps = P.fps ?? 30, dur = P.duration;
  const sc = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", P.source, "-t", String(outToSrc(dur, P)), "-vf", "scale=160:-2,select='gt(scene,0.30)',showinfo", "-f", "null", "-"], { encoding: "utf8" });
  const cuts = [...(sc.stderr || "").matchAll(/pts_time:([\d.]+)/g)].map(m => +srcToOut(+m[1], P).toFixed(3)).filter(t => t > 0.4 && t < dur - 0.4);
  const bounds = [0, ...cuts, dur];
  const med = a => { const s0 = [...a].sort((x, y) => x - y); return s0[Math.floor(s0.length / 2)]; };
  const pct = (a, q) => { const s0 = [...a].sort((x, y) => x - y); return s0[Math.floor(q * (s0.length - 1))]; };
  async function head(from, to) {
    const k0 = Math.round(from * fps) + 3, k1 = Math.min(files.length, Math.round(to * fps) - 3), n = Math.min(32, Math.max(0, k1 - k0));
    const tops = [], centres = [], widths = [];
    for (let i = 0; i < n; i++) {
      const f = `m${String(Math.min(files.length, k0 + Math.floor((i + 0.5) * (k1 - k0) / n) + 1)).padStart(5, "0")}.png`;
      if (!fs.existsSync(path.join(dir, f))) continue;
      const img = await loadImage(path.join(dir, f));
      const w = 270, h = Math.round(img.height * w / img.width);
      const c = createCanvas(w, h), x = c.getContext("2d");
      x.drawImage(img, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data, on = (a, b) => d[(b * w + a) * 4] > 127;
      // the head's top: the first row with a run of person pixels wider than 2 % of the frame
      let top = -1;
      for (let j = 0; j < h && top < 0; j++) { let m = 0; for (let a = 0; a < w; a++) if (on(a, j)) m++; if (m > w * 0.02) top = j; }
      if (top < 0) continue;
      // its width and centre, a little under the top (above the ears, under the hair's crown)
      const row = Math.min(h - 1, top + Math.round(h * 0.045));
      let a0 = -1, b0 = -1; for (let a = 0; a < w; a++) if (on(a, row)) { if (a0 < 0) a0 = a; b0 = a; }
      if (a0 < 0) continue;
      tops.push(top / h); centres.push((a0 + b0) / 2 / w); widths.push((b0 - a0 + 1) / w);
    }
    if (tops.length < 4) return null;
    // the frame is set on the head's USUAL top (the median): the face stays in it; the head bobs,
    // so the caption goes up by how much higher it usually rises (the 15th percentile of its top)
    return { from, to, top: med(tops), high: pct(tops, 0.15), cx: med(centres), hw: med(widths), n: tops.length };
  }
  const shots = [];
  for (let i = 0; i + 1 < bounds.length; i++) { const m = await head(bounds[i], bounds[i + 1]); if (m) shots.push(m); else if (shots.length) shots.at(-1).to = bounds[i + 1]; }
  if (!shots.length) { console.error("the matte holds no person to measure: measure by eye instead"); process.exit(1); }
  shots[0].from = 0; shots.at(-1).to = dur;
  for (let i = 1; i < shots.length; i++) shots[i].from = shots[i - 1].to = Math.min(shots[i].from, shots[i - 1].to);
  const main = shots.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
  // the frame's WIDTH (the longest shot's head at 226 px, a close take gets a narrower frame,
  // centred, its shoulders and chest come in; --keep-frame: the reference's 942 whatever)
  const g0 = geometry({ ...P, stage: {} });
  const fit = Math.min(942 * g0.K, Math.round((226 * g0.K) / main.hw / 2) * 2);
  const boxW = argv.includes("--keep-frame") ? (P.stage?.boxW ?? 942 / 1080) : +(fit / g0.W).toFixed(5);
  const boxX = argv.includes("--keep-frame") ? (P.stage?.boxX ?? 69 / 1080) : +(((g0.W - fit) / 2) / g0.W).toFixed(5);
  const g = geometry({ ...P, stage: { ...(P.stage ?? {}), boxW, boxX, captionY: undefined, shots: undefined } });
  const frame = m => {
    const crop = m.top + g.pop / g.bh, lift = Math.min(90 * g.K, Math.max(0, (m.top - m.high) * g.bh));
    return { crop: +crop.toFixed(4), captionY: +((g.box.top - g.pop - lift - 20 * g.K) / g.H).toFixed(4), full: { zoom: +Math.max(1, Math.min(2.2, 0.45 / m.hw)).toFixed(3), x: +m.cx.toFixed(4), y: +m.high.toFixed(4) }, lift };
  };
  const F = frame(main);
  const stage = { ...(P.stage ?? {}), boxW, boxX, crop: F.crop, captionY: F.captionY, full: { ...(P.stage?.full ?? {}), ...F.full } };
  if (shots.length > 1) stage.shots = shots.map(m => { const f = frame(m); return { from: +m.from.toFixed(3), to: +m.to.toFixed(3), crop: f.crop, captionY: f.captionY, full: f.full }; });
  else delete stage.shots;
  for (const m of shots) {
    const f = frame(m);
    console.log(`shot      ${m.from.toFixed(2)}-${m.to.toFixed(2)} s · head top ${(m.top * 100).toFixed(1)} % (${(m.high * 100).toFixed(1)} % at its highest) · centre ${(m.cx * 100).toFixed(1)} % · width ${(m.hw * 100).toFixed(1)} % (${m.n} frames) → the source row ${(f.crop * 100).toFixed(1)} % on the frame's top edge, the caption at ${Math.round(f.captionY * g.H)} px, full zoom ${f.full.zoom}`);
  }
  console.log(`frame     ${g.box.w} px wide at x ${g.box.x} (the head ${Math.round(main.hw * g.box.w)} px wide in the longest shot, 226 on the reference; the head rises ${Math.round(g.pop)} px out of it)`);
  if (shots.length > 1) console.log(`shots     ${shots.length}, cut at ${cuts.map(c => c.toFixed(2)).join(", ")} s: each framed on its own (project.json stage.shots)`);
  if (main.hw * 942 * g0.K > 226 * g0.K * 1.05 && argv.includes("--keep-frame")) console.log(`  ⚠ a close take kept in the reference's frame: the head is ${(main.hw * 100).toFixed(0)} % of the width (about 24 % on the reference), so the frame shows mostly the face`);
  else if (g.box.w < 942 * g0.K) console.log(`  a close take (the head ${(main.hw * 100).toFixed(0)} % of its width): the frame narrowed to ${g.box.w} px so it shows the speaker down to the chest`);
  if (argv.includes("--write")) {
    P.stage = stage;
    fs.writeFileSync(PJ, JSON.stringify(P, null, 2));
    console.log("project.json stage written");
  } else console.log("(--write to keep it in project.json)");
  process.exit(0);
}
console.error("usage: layout.mjs --measure [--write] | --print | --ffmpeg --tag v|m [--offset s] | --at t");
process.exit(2);
