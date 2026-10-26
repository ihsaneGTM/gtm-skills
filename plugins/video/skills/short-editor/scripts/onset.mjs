// Checks a beat's onset against the AUDIO ENVELOPE, and never against the
// transcript alone.
//
//   node onset.mjs                       # every hot word of plan.mjs
//   node onset.mjs 14.54 15.10 15.76     # arbitrary ORIGINAL-timeline times
//   node onset.mjs --window 0.8          # how far to look for an attack
//
// Why this exists: faster-whisper's word starts are a decode by-product, not a
// measurement. On one intro it put two words at 14.54 s and 15.10 while the
// real attacks are at 14.96 and 15.70 — the block then landed half a second
// before the words were said, and a reviewer sees that immediately ("this text
// appears too early"). The envelope does not lie: a spoken word starts where
// the energy jumps out of the local floor.
//
// It reads project.json for the source and the speed, and plan.mjs for the
// beats. Times in and out are ORIGINAL-timeline seconds — divide by `speed`
// only when writing them into a plan.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CWD = process.cwd();
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const WINDOW = parseFloat(arg("--window", "0.7"));
const P = JSON.parse(fs.readFileSync(path.resolve(CWD, "project.json"), "utf8"));
const SP = P.speed ?? 1;
const SR = 16000, HOP = 160;                       // 10 ms frames

// --- the envelope, straight out of the source ---------------------------------
const END = (P.editEnd ?? P.duration) * SP + 2;
const r = spawnSync("ffmpeg", ["-v", "error", "-t", String(END), "-i", P.source,
  "-map", "0:a", "-ac", "1", "-ar", String(SR), "-f", "s16le", "-"],
  { maxBuffer: 1 << 30, encoding: "buffer" });
if (!r.stdout || !r.stdout.length) { console.error("no audio extracted from the source"); process.exit(1); }
const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1);
const n = Math.floor(pcm.length / HOP);
const db = new Float32Array(n);
for (let f = 0; f < n; f++) {
  let s = 0;
  for (let i = f * HOP; i < (f + 1) * HOP; i++) s += pcm[i] * pcm[i];
  db[f] = 20 * Math.log10(Math.sqrt(s / HOP) / 32768 + 1e-9);
}
// the local floor: the quietest frame in the preceding 150 ms
const floorAt = f => { let m = 0; for (let k = Math.max(0, f - 15); k < f; k++) m = Math.min(m, db[k] || 0); return m; };
// an attack: energy jumps ≥ 8 dB out of that floor and clears -44 dBFS
const isAttack = f => f > 2 && db[f] > -44 && db[f] - floorAt(f) > 8 && db[f] > db[f - 1] + 3;
const attacks = [];
for (let f = 3; f < n; f++) if (isAttack(f) && (!attacks.length || f - attacks[attacks.length - 1] > 6)) attacks.push(f);
console.log(`envelope: ${(n / 100).toFixed(1)} s analysed, ${attacks.length} attacks detected\n`);

// --- what to check ------------------------------------------------------------
let targets = argv.filter(a => /^[\d.]+$/.test(a)).map(parseFloat);
if (!targets.length) {
  const PLAN = await import(pathToFileURL(path.resolve(CWD, "plan.mjs")).href);
  targets = [];
  for (const b of PLAN.BEATS) {
    if (!b.spec) continue;
    for (const l of b.spec.lines) {
      const hot = l.runs.find(x => x.hot);
      const t = (hot && hot.t != null ? hot.t : l.t) * SP;     // back to original time
      targets.push({ t: +t.toFixed(2), label: `${b.id} · ${l.runs.map(x => x.text).join("")}`.trim(), hot: !!hot });
    }
  }
  // EVERY row, not only the yellow ones: a block once had its FIRST line
  // 0.4 s early while its hot word was on time.
  if (argv.includes("--hot")) targets = targets.filter(x => x.hot);
}
targets = targets.map(x => typeof x === "number" ? { t: x, label: `${x} s`, hot: true } : x);

// --- report -------------------------------------------------------------------
let late = 0;
for (const { t, label } of targets) {
  const f0 = Math.round(t * 100);
  let best = null;
  for (const f of attacks) if (Math.abs(f - f0) <= WINDOW * 100 && (best === null || Math.abs(f - f0) < Math.abs(best - f0))) best = f;
  if (best === null) { console.log(`  ?  ${label.padEnd(34)} ${t.toFixed(2)} s — no attack within ±${WINDOW} s`); continue; }
  const real = best / 100, d = real - t;
  const flag = Math.abs(d) < 0.10 ? "✓" : (d > 0 ? "✗" : "~");
  if (flag !== "✓") late++;
  console.log(`  ${flag}  ${label.padEnd(34)} transcript ${t.toFixed(2)} s · real attack ${real.toFixed(2)} s · `
    + `${d >= 0 ? "+" : ""}${d.toFixed(2)} s` + (flag === "✗" ? `  → the text lands ${(d / SP).toFixed(2)} s too early on screen` : ""));
}
console.log(late ? `\n✗ ${late} cue(s) off by more than 100 ms; move the plan onto the real attack`
                 : "\n✓ every cue lands on a real attack (±100 ms)");
// ⚠ This finds AN attack, not the RIGHT one: it cannot tell one syllable from
// another. A large offset means "look at the envelope by hand", which is how
// the two words above (14.54 in the transcript, 14.94 in the audio; 15.10 vs
// ~15.62) were pinned — by counting syllable nuclei between the word gaps.
process.exit(late ? 1 : 0);
