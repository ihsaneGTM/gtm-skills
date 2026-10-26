#!/usr/bin/env node
// THE SERIES IDENT, as sound — composed here, note by note, from the same DSP
// toolbox as the effects. Nothing sampled, nothing licensed.
//
//   node jingle.mjs --out assets [--only a|b|c]
//
// Writes jingle-a.wav, jingle-b.wav, jingle-c.wav (48 kHz 16-bit stereo) and
// prints, for each, where its downbeat sits (`align`) so a cue lands the hit on
// the word — the same rule as the supplied library sounds.
//
// Three readings of a series ident, to be listened to and chosen from:
//   a  PENCIL & KALIMBA — three pencil taps in rhythm, then a four-note motif on a
//      plucked kalimba, a warm pad opening under it. Quiet confidence; the
//      "notebook" ident.
//   b  PAPER & SUB — a sheet swept in, a deep soft sub with a snap, a two-note
//      electric-piano call. Darker, closer to a moody music bed. The "studio" ident.
//   c  METRONOME & CHORD — three metronome ticks, a reversed shimmer, one bright
//      chord hit with a low thump, a pencil flourish. The most "methodical".
import fs from "node:fs";
import path from "node:path";
import { SR, svfBandpass, env, highpass, noise, mulEnv, addTo, chirp, room, rnd, make } from "./sfx.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const OUT = arg("--out", "assets"), ONLY = arg("--only", null);
fs.mkdirSync(OUT, { recursive: true });

const buf = sec => new Float32Array((sec * SR) | 0);
const place = (dst, src, at, g = 1, pan = 0) => {   // pan -1..1 into a stereo pair
  const off = (at * SR) | 0;
  const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4);
  const s = src.L || src, s2 = src.R || src;
  for (let i = 0; i < s.length && off + i < dst.L.length; i++) { dst.L[off + i] += s[i] * g * l * 1.2; dst.R[off + i] += s2[i] * g * r * 1.2; }
};
const stereo = sec => ({ L: buf(sec), R: buf(sec), length: (sec * SR) | 0 });
const midi = m => 440 * Math.pow(2, (m - 69) / 12);

// --- instruments ---------------------------------------------------------------
// a kalimba / marimba tine: the fundamental, a 4:1 partial that dies fast (that
// ratio is what makes it a marimba and not a bell), a breath of pluck
function tine(f, dur = 1.1, bright = 1) {
  const n = (dur * SR) | 0;
  const o = chirp(n, f, f, 0.42, 2.2);
  addTo(o, chirp(n, f * 4.0, f * 4.0, 0.09, 3.4), 0.32 * bright);
  addTo(o, chirp(n, f * 9.9, f * 9.9, 0.03, 4), 0.06 * bright);
  addTo(o, mulEnv(svfBandpass(noise(n), () => f * 3, 2.5), env(n, 0.0005, 0.012, 4)), 0.10);
  // a soft attack so it is struck, not switched on
  for (let i = 0; i < 60 && i < n; i++) o[i] *= i / 60;
  return o;
}
// a 2-op FM electric piano
function epiano(f, dur = 1.4) {
  const n = (dur * SR) | 0, o = new Float32Array(n);
  let ph = 0, mph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, idx = 2.4 * Math.exp(-t * 4.5);
    mph += 2 * Math.PI * f * 1.0 / SR;                  // 1:1 ratio = the classic tine
    ph += 2 * Math.PI * f / SR;
    o[i] = Math.sin(ph + idx * Math.sin(mph)) * Math.exp(-t * 2.6) * (1 - Math.exp(-t * 900));
  }
  addTo(o, chirp(n, f * 2, f * 2, 0.25, 3), 0.12);
  return o;
}
// a warm pad: detuned saws through a low-pass that opens, with attack/release
function pad(freqs, dur = 2.2, atk = 0.5, rel = 0.9) {
  const n = (dur * SR) | 0, o = new Float32Array(n);
  for (const f of freqs) for (const det of [-0.35, 0.35, 0]) {
    let ph = 0; const ff = f * Math.pow(2, det / 1200);
    for (let i = 0; i < n; i++) { ph += ff / SR; ph -= Math.floor(ph); o[i] += (2 * ph - 1) * 0.11; }
  }
  const lp = svfBandpass(o, t => 500 + 900 * Math.min(1, t / atk), 0.6);   // low Q bandpass ≈ soft lowpass body
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; const e = Math.min(1, t / atk) * Math.min(1, Math.max(0, (dur - t) / rel)); out[i] = (lp[i] * 0.7 + o[i] * 0.06) * e; }
  return out;
}
function sub(f0 = 55, dur = 0.9) {
  const n = (dur * SR) | 0;
  const o = chirp(n, f0 * 1.6, f0, 0.32, 2.2);
  addTo(o, chirp(n, f0 * 2, f0 * 2, 0.16, 2.6), 0.5);           // so a phone hears it
  addTo(o, mulEnv(noise(n), env(n, 0.0003, 0.004, 4)), 0.07);
  return o;
}
function snap() {
  const n = (0.18 * SR) | 0;
  const o = mulEnv(svfBandpass(noise(n), () => 2300, 1.8), env(n, 0.0004, 0.012, 4));
  addTo(o, chirp(n, 1100, 700, 0.02, 3.6), 0.5);
  addTo(o, chirp(n, 380, 260, 0.04, 3), 0.25);
  return o;
}
function metronome(bright = 1) {
  const n = (0.09 * SR) | 0;
  const o = chirp(n, 3400, 2600, 0.006, 4);
  addTo(o, chirp(n, 1250 * bright, 1000, 0.018, 3.6), 0.5);
  addTo(o, mulEnv(noise(n), env(n, 0.0002, 0.002, 4)), 0.1);
  return o;
}
function shimmerRev(dur = 0.6) {
  const n = (dur * SR) | 0;
  const swept = svfBandpass(noise(n), t => 900 * Math.pow(5200 / 900, Math.min(1, t / dur)), 2.4);
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) { const u = i / n; e[i] = Math.pow(u, 2.4) * (u < 0.97 ? 1 : (1 - u) / 0.03); }
  const o = mulEnv(swept, e);
  for (const m of [67, 74, 79]) addTo(o, mulEnv(chirp(n, midi(m), midi(m) * 2, 6, 0), e), 0.05);
  return o;
}

// --- the three idents -------------------------------------------------------------
function jingleA() {
  const J = stereo(2.9);
  // three pencil taps, a little swing on the third
  place(J, make("tap_pencil"), 0.00, 0.9, -0.3);
  place(J, make("tap_pencil"), 0.17, 0.8, -0.3);
  place(J, make("tap_pencil"), 0.36, 1.0, -0.3);
  // the motif: G4 C5 D5 → G5, kalimba, alternating sides
  const notes = [[67, 0.60, 0.9, -0.2], [72, 0.78, 0.9, 0.2], [74, 0.96, 0.95, -0.15], [79, 1.20, 1.15, 0.15]];
  for (const [m, t, g, p] of notes) place(J, tine(midi(m), 1.3), t, g * 0.55, p);
  // the pad opens under the last note: C major add9 (C3 G3 D4 E4)
  place(J, pad([midi(48), midi(55), midi(62), midi(64)], 1.7, 0.35, 0.8), 1.15, 0.26, 0);
  // and a marker swipe where the yellow rule is drawn
  place(J, make("marker:0.26"), 1.42, 0.6, 0.1);
  return { J, align: 1.20 };
}
function jingleB() {
  const J = stereo(2.6);
  place(J, make("sheet_in"), 0.00, 0.8, 0);
  place(J, sub(52, 1.0), 0.42, 0.9, 0);
  place(J, snap(), 0.42, 0.75, 0.1);
  // a two-note call on the e-piano: E4 → B4, then a soft fifth under it
  place(J, epiano(midi(64), 1.3), 0.62, 0.5, -0.25);
  place(J, epiano(midi(71), 1.5), 0.88, 0.55, 0.25);
  place(J, epiano(midi(59), 1.6), 0.90, 0.22, 0);
  place(J, make("marker:0.26"), 1.20, 0.55, 0.1);
  // a short room on the whole thing, so it lands in a space
  const wet = room(mix(J), 0.9, 0.35);
  for (let i = 0; i < J.length; i++) { const w = (wet[i] - mix(J)[i]) * 0.5; J.L[i] += w; J.R[i] += w; }
  return { J, align: 0.42 };
}
function jingleC() {
  const J = stereo(2.8);
  place(J, metronome(1.0), 0.00, 0.8, -0.35);
  place(J, metronome(1.0), 0.30, 0.8, 0.35);
  place(J, metronome(1.15), 0.60, 0.9, -0.35);
  place(J, shimmerRev(0.55), 0.38, 0.5, 0);
  // the hit: a bright chord (D5 F#5 A5 D6) on tines, a sub under, a snap on top
  for (const [m, p] of [[74, -0.3], [78, 0.3], [81, -0.15], [86, 0.15]]) place(J, tine(midi(m), 1.5, 1.1), 0.93, 0.42, p);
  place(J, sub(49, 0.9), 0.93, 0.8, 0);
  place(J, snap(), 0.93, 0.5, 0);
  // the pencil flourish where the title is written
  place(J, make("pencil:0.55:w"), 1.10, 0.7, 0.2);
  place(J, pad([midi(50), midi(57), midi(62), midi(66)], 1.6, 0.3, 0.7), 0.93, 0.2, 0);
  return { J, align: 0.93 };
}
function mix(J) { const o = new Float32Array(J.length); for (let i = 0; i < J.length; i++) o[i] = (J.L[i] + J.R[i]) * 0.5; return o; }

function writeWav(file, J) {
  // normalise to -3 dBFS peak so the cue gain in the plan means the same thing for all three
  let pk = 0; for (let i = 0; i < J.length; i++) pk = Math.max(pk, Math.abs(J.L[i]), Math.abs(J.R[i]));
  const g = pk > 0 ? Math.pow(10, -3 / 20) / pk : 1;
  const bytes = J.length * 4, b = Buffer.alloc(44 + bytes);
  b.write("RIFF", 0); b.writeUInt32LE(36 + bytes, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
  b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(bytes, 40);
  for (let i = 0; i < J.length; i++) {
    b.writeInt16LE((Math.max(-1, Math.min(1, J.L[i] * g)) * 32767) | 0, 44 + i * 4);
    b.writeInt16LE((Math.max(-1, Math.min(1, J.R[i] * g)) * 32767) | 0, 44 + i * 4 + 2);
  }
  fs.writeFileSync(file, b);
}

const ALL = { a: jingleA, b: jingleB, c: jingleC };
for (const [k, fn] of Object.entries(ALL)) {
  if (ONLY && ONLY !== k) continue;
  const { J, align } = fn();
  const f = path.join(OUT, `jingle-${k}.wav`);
  writeWav(f, J);
  console.log(`${f}  ${(J.length / SR).toFixed(2)} s  downbeat (align) ${align.toFixed(2)} s`);
}
