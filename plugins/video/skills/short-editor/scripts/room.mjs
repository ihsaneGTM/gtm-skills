#!/usr/bin/env node
// THE ROOM THE HEAD LEAVES AT THE TOP, for a headline: over a whole window of time, through the
// camera, where the speaker is at each height of the frame. What a block may take without going
// behind the head (or how far it goes behind it), BEFORE the plan is written and checked: every
// edit measured it by hand, then rewrote its plan after occlusion.mjs said no.
//
//   node room.mjs                     every headline window of plan.mjs (output seconds)
//   node room.mjs 6.5-8.0 12-15.3     windows of your own (output seconds)
//   node room.mjs --phrases           the take's phrases (a new one after a pause of 0.35 s, a full stop, or 6 s)
//
// From the project folder, after matte.mjs. For each window: the highest the head goes (the top of
// the speaker, as a fraction of the height) and, at heights 0.04 to 0.30, the part of the width the
// speaker takes at some instant of the window ("free": nobody there). Masks sampled 15 times a
// second, the camera of edl.mjs (none yet: no zoom).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas, loadImage, camEase } from "./scene.mjs";

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const W = P.width, H = P.height, FPS = P.fps ?? 30, AY = P.anchorY ?? 0.34, SP = P.speed ?? 1;
if (!fs.existsSync("matte")) { console.error("matte/ missing: run matte.mjs first"); process.exit(1); }
const NM = fs.readdirSync("matte").filter(f => /^m\d{5}\.png$/.test(f)).length;
let steps = [[0, 1, 0, P.anchorX ?? 0.5]];
try { if (fs.existsSync("edl.mjs")) steps = (await import(pathToFileURL(path.resolve("edl.mjs")).href)).cameraSteps() || steps; } catch {}
const cam = t => {
  let z = steps[0]?.[1] ?? 1, ax = steps[0]?.[3] ?? P.anchorX ?? 0.5;
  for (let i = 1; i < steps.length; i++) { const [ts, zs, r, a, e] = steps[i]; if (ts > t) break; const k = r > 0 ? camEase(e, Math.min(1, (t - ts) / r)) : 1; z += (zs - z) * k; if (a != null) ax += (a - ax) * k; }
  return { z, ax };
};

// the windows
const argv = process.argv.slice(2);
let wins = argv.filter(a => /^[\d.]+-[\d.]+$/.test(a)).map(a => { const [x, y] = a.split("-").map(Number); return { id: a, from: x, to: y }; });
if (!wins.length && argv.includes("--phrases")) {
  const src = fs.existsSync("words-fixed.json") ? JSON.parse(fs.readFileSync("words-fixed.json", "utf8")).words : JSON.parse(fs.readFileSync("words.json", "utf8")).map(q => ({ ...q, a: q.s, z: q.e }));
  for (const [i, q] of src.entries()) {
    const prev = src[i - 1];
    if (!wins.length || q.a - (prev.z ?? prev.e) >= 0.35 || /[.!?]$/.test(prev.w) || q.a / SP - wins.at(-1).from > 6) wins.push({ id: "", from: q.a / SP, to: (q.z ?? q.e) / SP, words: [] });
    const w = wins.at(-1); w.to = (q.z ?? q.e) / SP; w.words.push(q.w);
  }
  for (const w of wins) w.id = `« ${w.words.slice(0, 4).join(" ")}${w.words.length > 4 ? " …" : ""} »`;
}
if (!wins.length) {
  const PLAN = await import(pathToFileURL(path.resolve("plan.mjs")).href);
  wins = (PLAN.BEATS ?? []).filter(b => b?.kind === "headline").map(b => ({ id: b.id, from: b.from, to: b.to }));
  if (!wins.length) { console.error("no window: give some (6.5-8.0), --phrases, or write the plan's headlines first"); process.exit(1); }
}

// the masks, a quarter of the size, one bit a pixel, decoded four at a time
const S = 4, w = Math.round(W / S), h = Math.round(H / S);
const mc = createCanvas(w, h), mx = mc.getContext("2d"), cache = new Map();
const frameAt = t => Math.min(NM, Math.max(1, Math.round(t * FPS) + 1));
async function load(i) {
  const img = await loadImage(path.join("matte", `m${String(i).padStart(5, "0")}.png`));
  mx.clearRect(0, 0, w, h); mx.drawImage(img, 0, 0, w, h);
  const d = mx.getImageData(0, 0, w, h).data, g = new Uint8Array((w * h + 7) >> 3);
  for (let j = 0; j < w * h; j++) if (d[j * 4] > 127) g[j >> 3] |= 1 << (j & 7);
  cache.set(i, g);
}
const need = [...new Set(wins.flatMap(x => { const o = []; for (let t = x.from; t <= x.to; t += 1 / 15) o.push(frameAt(t)); return o; }))];
let k = 0;
await Promise.all(Array.from({ length: 4 }, async () => { while (k < need.length) await load(need[k++]); }));
const on = (g, sx, sy) => { const ix = sx | 0, iy = sy | 0; if (ix < 0 || iy < 0 || ix >= w || iy >= h) return false; const j = iy * w + ix; return (g[j >> 3] >> (j & 7)) & 1; };

const ROWS = [0.04, 0.07, 0.10, 0.13, 0.16, 0.19, 0.22, 0.26, 0.30];
console.log(`window${" ".repeat(26)}head top   ${ROWS.map(y => `y ${y.toFixed(2)}`.padEnd(11)).join("")}`);
for (const win of wins) {
  const ext = ROWS.map(() => [1, 0]);
  let top = 1;
  for (let t = win.from; t <= win.to + 1e-9; t += 1 / 15) {
    const g = cache.get(frameAt(t)), { z, ax } = cam(t);
    const src = (X, Y) => [(ax * (W - W / z) + X / z) / S, (AY * (H - H / z) + Y / z) / S];
    for (let Y = 0; Y < H * 0.5; Y += S) { let hit = false; for (let X = 0; X < W && !hit; X += S) hit = on(g, ...src(X, Y)); if (hit) { top = Math.min(top, Y / H); break; } }
    ROWS.forEach((y, j) => { for (let X = 0; X < W; X += S) if (on(g, ...src(X, y * H))) { ext[j][0] = Math.min(ext[j][0], X / W); ext[j][1] = Math.max(ext[j][1], X / W); } });
  }
  const label = `${String(win.id).slice(0, 18).padEnd(18)} ${win.from.toFixed(2)}-${win.to.toFixed(2)}`.padEnd(32);
  console.log(`${label}${top >= 1 ? "  —   " : top.toFixed(3)}      ${ext.map(([a, b]) => (a > b ? "free" : `${a.toFixed(2)}-${b.toFixed(2)}`).padEnd(11)).join("")}`);
}
console.log("A block above the head: its rows above the head's top; beside it: in the free part of its rows' heights. occlusion.mjs is the verdict once the plan is written.");
