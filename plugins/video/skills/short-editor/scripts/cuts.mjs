#!/usr/bin/env node
// cuts.mjs — stretches of the SOURCE removed before anything else sees it.
//
//   project.json   "cuts": [[62.75, 65.62]]      SOURCE seconds, sorted, non-overlapping
//
// WHY. A retake left in the master (a sentence said a second time right after the
// intro's hard cut, hidden by an overlay in the picture but not in the voice) has
// to vanish from the picture AND the voice by the same frames, and nothing downstream may notice: the speed,
// `duration`, `editEnd`, the camera steps, the beats, the cues and the captions all
// keep living on ONE output timeline (source → cuts → speed → output). Never by
// re-encoding the source (a second generation on a 4K master), never by hand-shifting
// cues. Put the cut points in the PAUSES, measured on the envelope (astats RMS per
// 50 ms) — whisper's word ends run early and its next word swallows the pause.
//
//   node cuts.mjs --count              how many cuts (0: nothing to do)
//   node cuts.mjs --video [in] [out]   a filtergraph PREFIX: "[0:v]split=…concat…[vsrc];"
//   node cuts.mjs --audio "<af>"       a whole -filter_complex for voice.wav: the cuts,
//                                      then the voice chain `<af>`, into [aout]
//   node cuts.mjs --to-src <t>         the SOURCE second an OUTPUT second lands on
//
// As a library: cutsOf(P), outToSrc(t, P), srcToOut(s, P), videoGraph(P, in, out),
// audioGraph(P, af, out). preview.mjs and matte.mjs import it, so a frame grabbed at
// output time t is the frame build.sh will show there.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function cutsOf(P) {
  const c = (P.cuts ?? []).map(([a, b]) => [+a, +b]);
  for (const [a, b] of c) if (!(b > a) || a < 0) throw new Error(`invalid cut: [${a}, ${b}]`);
  c.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < c.length; i++) if (c[i][0] < c[i - 1][1]) throw new Error(`overlapping cuts: [${c[i - 1]}] and [${c[i]}]`);
  return c;
}
// output second → source second: undo the speed, then put the removed stretches back
export function outToSrc(t, P) {
  const u = t * (P.speed ?? 1);
  let removed = 0;
  for (const [a, b] of cutsOf(P)) { if (u + removed >= a) removed += b - a; else break; }
  return u + removed;
}
// source second → output second (a second inside a cut lands on the join)
export function srcToOut(s, P) {
  let removed = 0;
  for (const [a, b] of cutsOf(P)) { if (s >= b) removed += b - a; else if (s > a) { s = a; break; } else break; }
  return (s - removed) / (P.speed ?? 1);
}
function segments(P) {
  const segs = []; let prev = 0;
  for (const [a, b] of cutsOf(P)) { segs.push([prev, a]); prev = b; }
  segs.push([prev, null]);
  return segs;
}
export function videoGraph(P, inLabel = "0:v", out = "vsrc") {
  const segs = segments(P), n = segs.length;
  if (n === 1) return "";
  return `[${inLabel}]split=${n}${segs.map((_, i) => `[c${i}]`).join("")};`
    + segs.map(([s, e], i) => `[c${i}]trim=start=${s}${e != null ? `:end=${e}` : ""},setpts=PTS-STARTPTS[v${i}];`).join("")
    + `${segs.map((_, i) => `[v${i}]`).join("")}concat=n=${n}:v=1:a=0[${out}];`;
}
export function audioGraph(P, af = "", out = "aout", inLabel = "0:a") {
  const segs = segments(P), n = segs.length, chain = af || "anull";
  if (n === 1) return `[${inLabel}]${chain}[${out}]`;
  return `[${inLabel}]asplit=${n}${segs.map((_, i) => `[d${i}]`).join("")};`
    + segs.map(([s, e], i) => `[d${i}]atrim=start=${s}${e != null ? `:end=${e}` : ""},asetpts=PTS-STARTPTS[a${i}];`).join("")
    + `${segs.map((_, i) => `[a${i}]`).join("")}concat=n=${n}:v=0:a=1[ac];[ac]${chain}[${out}]`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), cmd = argv[0];
  const P = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "project.json"), "utf8"));
  if (cmd === "--count") console.log(String(cutsOf(P).length));
  else if (cmd === "--video") process.stdout.write(videoGraph(P, argv[1] ?? "0:v", argv[2] ?? "vsrc"));
  else if (cmd === "--audio") process.stdout.write(audioGraph(P, argv[1] ?? ""));
  else if (cmd === "--to-src") console.log(outToSrc(Number(argv[1]), P).toFixed(4));
  else { console.error('usage: cuts.mjs --count | --video [in] [out] | --audio "<af>" | --to-src <t>'); process.exit(1); }
}
