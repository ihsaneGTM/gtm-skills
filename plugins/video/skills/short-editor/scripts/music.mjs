// A procedural music bed — synthesised in this file, note by note. Nothing is
// downloaded, sampled or looked up: that is where the beds come from, and it
// is also their ceiling. A real produced track (YouTube Audio Library, Pixabay,
// Mixkit, or a paid catalogue) will always sound like a record next to this;
// drop one in assets/ as a `sample:` cue and it takes the same slot.
//
//   node music.mjs --style boombap --out assets/music.wav --end 62.9 [--bars N]
//                  [--drop B] [--break A B] [--fade 1.6] [--seed 7]
//
// v3 — a small style engine, because the register is the whole question:
//   boombap  91 bpm · swung hats, kick/snare, an FM electric piano (Rhodes-like
//            2-op FM), sub bass, vinyl crackle. The register of most
//            business YouTube intros.
//   funk     122 bpm · Karplus-Strong plucked "guitar" riffs on a bright major
//            progression, claps, shaker, a plucked bass. Upbeat corporate.
//   pulse    122 bpm · an 8th-note filtered pluck pulse over a drone, sparse
//            four-on-the-floor, side-chained pads. The tech-explainer register.
//   synth    122 bpm · v2: supersaw chords pumped by a sidechain, off-beat
//            bass, kick 4/4. Kept for reference, rejected in review.
// Timbre is the difference (plucked strings and FM tines, never bare sines),
// then space (ping-pong delay + reverb on a send bus), then the groove.
//
// Structure follows the edit: --end is the cut the bed must be gone by (a
// low-pass sweep and a fade over --fade seconds INTO it); --bars sets the
// tempo so the bar grid lands on the cut; --drop is the bar the drums enter;
// --break A B mutes drums and bass for bars [A, B). Defaults per style put the
// drop on the word at ~7.9 s and the break under 39.3–43 s.
//
// Output: 16-bit PCM STEREO WAV, peak −3 dBFS. Reference it from edl.mjs as
// { t: 0, kind: "sample:music.wav", gain: G } — and set G from a measurement of
// the finished file, bed alone, in a real pause (references/audio-spec.md).
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const STYLE = arg("--style", "boombap");
const OUT = arg("--out", "assets/music.wav");
const END = parseFloat(arg("--end", "60"));
const FADE = parseFloat(arg("--fade", "1.6"));
const SEED = parseInt(arg("--seed", "7"), 10);

const DEF = {
  boombap: { bars: 24, drop: 3, brk: [15, 17], swing: 0.16, pump: 0 },
  funk:    { bars: 32, drop: 4, brk: [20, 22], swing: 0.06, pump: 0.25 },
  pulse:   { bars: 32, drop: 4, brk: [20, 22], swing: 0.00, pump: 0.55 },
  synth:   { bars: 32, drop: 4, brk: [20, 22], swing: 0.00, pump: 0.82 },
};
if (!DEF[STYLE]) { console.error(`unknown style: ${STYLE} (boombap | funk | pulse | synth)`); process.exit(1); }
const S = DEF[STYLE];
const BARS = parseInt(arg("--bars", String(S.bars)), 10);
const DROP = parseInt(arg("--drop", String(S.drop)), 10);
const BRK = argv.includes("--break")
  ? [parseInt(argv[argv.indexOf("--break") + 1], 10), parseInt(argv[argv.indexOf("--break") + 2], 10)]
  : S.brk;

const SR = 48000;
const BAR = END / BARS, BEAT = BAR / 4, STEP = BEAT / 4, BPM = 60 / BEAT;
const N = Math.ceil((END + 0.8) * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const sendL = new Float32Array(N), sendR = new Float32Array(N);   // delay + reverb bus

let seed = (SEED * 2654435761) >>> 0;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296) * 2 - 1; };
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const inGroove = bar => bar >= DROP && !(BRK && bar >= BRK[0] && bar < BRK[1]);
// step s (0..15) of bar b, with swing on the odd 16ths
const tStep = (b, s) => b * BAR + s * STEP + ((s & 1) ? S.swing * STEP : 0);

// --- the sidechain pump: a gain curve that ducks on every beat and recovers ---
const SC = new Float32Array(N).fill(1);
if (S.pump > 0) {
  const rel = 0.24;
  for (let i = 0; i < N; i++) {
    const t = i / SR, bar = Math.floor(t / BAR);
    if (!inGroove(bar)) continue;
    const ph = (t % BEAT) / rel;
    SC[i] = (1 - S.pump) + S.pump * (1 - Math.exp(-3.2 * Math.min(ph, 1)));
  }
}

// --- writing --------------------------------------------------------------------
// gen(t, u) returns a number (mono) or [l, r]. pan ∈ [−1, 1] places a mono voice.
function add(t0, dur, gen, gain = 1, { pumped = false, send = 0, pan = 0 } = {}) {
  const off = Math.round(t0 * SR), n = Math.round(dur * SR);
  const gl = Math.min(1, 1 - pan) * gain, gr = Math.min(1, 1 + pan) * gain;
  for (let i = 0; i < n; i++) {
    const j = off + i; if (j < 0 || j >= N) continue;
    const v = gen(i / SR, i / n);
    let l = Array.isArray(v) ? v[0] * gain : v * gl, r = Array.isArray(v) ? v[1] * gain : v * gr;
    if (pumped) { l *= SC[j]; r *= SC[j]; }
    if (!Number.isFinite(l) || !Number.isFinite(r)) continue;
    L[j] += l; R[j] += r;
    if (send) { sendL[j] += l * send; sendR[j] += r * send; }
  }
}
// a pre-rendered buffer (mono Float32Array) placed at t0
function place(t0, buf, gain = 1, opts = {}) { add(t0, buf.length / SR, t => buf[Math.min(buf.length - 1, (t * SR) | 0)], gain, opts); }

// --- instruments: the buffers -------------------------------------------------------
const env = (t, a, d, curve = 3) => (a <= 0 ? 1 : Math.min(1, t / a)) * Math.exp(-(Math.max(0, t - a) / d) * curve);

// Karplus-Strong: a plucked string. A noise burst in a delay line the length of
// the period, averaged on every pass — the loop IS the low-pass that makes it
// ring like a string and not like noise. `t60` is how long it rings.
function pluck(f, dur, { t60 = 1.1, bright = 0.5 } = {}) {
  const per = Math.max(2, Math.round(SR / f)), n = Math.round(dur * SR);
  const buf = new Float32Array(per), out = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < per; i++) { const w = rnd(); prev = prev + bright * (w - prev); buf[i] = prev; } // darker burst = softer pick
  const decay = Math.pow(0.001, 1 / (f * t60));
  let p = 0;
  for (let i = 0; i < n; i++) {
    const cur = buf[p], nxt = buf[(p + 1) % per];
    out[i] = cur;
    buf[p] = decay * 0.5 * (cur + nxt);
    p = (p + 1) % per;
  }
  return out;
}
// A 2-operator FM electric piano: carrier and modulator at the same frequency,
// the index decaying fast (the bark of the tine), a quiet 14th partial for the
// hammer. Reads as a Rhodes at low index, as a DX7 at high.
function epiano(f, dur, { index = 2.4, vel = 1 } = {}) {
  const n = Math.round(dur * SR), out = new Float32Array(n);
  const w = 2 * Math.PI * f / SR;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const I = index * vel * Math.exp(-t / 0.22) + 0.15;
    const mod = Math.sin(w * i) * I + Math.sin(w * 14 * i) * 0.12 * Math.exp(-t / 0.04);
    out[i] = Math.sin(w * i + mod) * Math.exp(-t / 1.4) * (1 - Math.exp(-t / 0.004));
  }
  return out;
}
// a Chamberlin SVF low-pass, cutoff modulated per sample — the pluck-synth
function svfLow(input, fEnv, q = 1.6) {
  const out = new Float32Array(input.length); let low = 0, band = 0;
  for (let i = 0; i < input.length; i++) {
    const f = 2 * Math.sin(Math.PI * Math.min(fEnv(i / SR), 18000) / SR);
    const high = input[i] - low - band / q; band += f * high; low += f * band; out[i] = low;
  }
  return out;
}
function saw(f, n, detune = 0) { const o = new Float32Array(n); let ph = rnd() * 0.5; const inc = f * (1 + detune) / SR; for (let i = 0; i < n; i++) { ph += inc; if (ph >= 1) ph -= 1; o[i] = 2 * ph - 1; } return o; }
function supersaw(f, dur, voices = 5, spread = 0.012) {
  const n = Math.round(dur * SR), o = new Float32Array(n);
  for (let v = 0; v < voices; v++) { const s = saw(f, n, (v - (voices - 1) / 2) * spread); for (let i = 0; i < n; i++) o[i] += s[i] / voices; }
  return o;
}
// the pulse pluck: a saw through a low-pass whose cutoff snaps open and closes
function pulsePluck(f, dur) {
  const n = Math.round(dur * SR), s = saw(f, n);
  const o = svfLow(s, t => 240 + 3200 * Math.exp(-t / 0.09), 2.2);
  for (let i = 0; i < n; i++) o[i] *= Math.exp(-(i / SR) / 0.32) * (1 - Math.exp(-(i / SR) / 0.002));
  return o;
}
const noiseBuf = n => { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = rnd(); return o; };
function bandNoise(n, f, q, envFn) { const b = svfBand(noiseBuf(n), () => f, q); for (let i = 0; i < n; i++) b[i] *= envFn(i / SR); return b; }
function svfBand(input, fEnv, q = 3) {
  const out = new Float32Array(input.length); let low = 0, band = 0;
  for (let i = 0; i < input.length; i++) {
    const f = 2 * Math.sin(Math.PI * Math.min(fEnv(i / SR), 18000) / SR);
    const high = input[i] - low - band / q; band += f * high; low += f * band; out[i] = band;
  }
  return out;
}
function hp1(x, fc) { const rc = 1 / (2 * Math.PI * fc), a = rc / (rc + 1 / SR); const o = new Float32Array(x.length); let px = 0, py = 0; for (let i = 0; i < x.length; i++) { o[i] = a * (py + x[i] - px); px = x[i]; py = o[i]; } return o; }

// drums
function kick({ f0 = 150, f1 = 46, dur = 0.34, click = 0.10, body = 1 } = {}) {
  const n = Math.round(dur * SR), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, u = i / n, f = f0 * Math.pow(f1 / f0, Math.min(1, t / 0.09));
    ph += 2 * Math.PI * f / SR;
    o[i] = Math.tanh(Math.sin(ph) * 1.6 * body) * Math.exp(-t / 0.13) + rnd() * click * Math.exp(-t / 0.004);
  }
  return o;
}
function snare({ dur = 0.22, tone = 185 } = {}) {
  const n = Math.round(dur * SR), o = bandNoise(n, 2400, 0.9, t => Math.exp(-t / 0.07));
  let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * tone / SR; o[i] = o[i] * 0.9 + Math.sin(ph) * 0.6 * Math.exp(-t / 0.05); }
  return o;
}
function clap({ dur = 0.30 } = {}) {
  const n = Math.round(dur * SR), o = new Float32Array(n);
  for (const off of [0, 0.011, 0.023, 0.036]) { const b = bandNoise(n, 1700, 1.1, t => t < 0 ? 0 : Math.exp(-t / (off === 0.036 ? 0.09 : 0.012))); const k = Math.round(off * SR); for (let i = 0; i + k < n; i++) o[i + k] += b[i] * (off === 0.036 ? 1 : 0.7); }
  return o;
}
function hat({ dur = 0.06, open = false } = {}) { const n = Math.round((open ? 0.28 : dur) * SR); return hp1(bandNoise(n, 8200, 0.7, t => Math.exp(-t / (open ? 0.09 : 0.014))), 5000); }
function shaker({ dur = 0.09 } = {}) { const n = Math.round(dur * SR); return bandNoise(n, 4300, 1.3, t => Math.min(1, t / 0.012) * Math.exp(-t / 0.028)); }
function rim() { const n = Math.round(0.08 * SR); const o = bandNoise(n, 820, 6, t => Math.exp(-t / 0.02)); for (let i = 0; i < n; i++) o[i] += rnd() * 0.3 * Math.exp(-(i / SR) / 0.002); return o; }
// a riser and a boom into a drop
function riser(dur) { const n = Math.round(dur * SR); const o = svfBand(noiseBuf(n), t => 200 * Math.pow(6000 / 200, t / dur), 2.4); for (let i = 0; i < n; i++) { const u = i / n; o[i] *= Math.pow(u, 2) * (u < 0.97 ? 1 : (1 - u) / 0.03); } return o; }
function boom() { const n = Math.round(1.1 * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR, f = 110 * Math.pow(32 / 110, Math.min(1, t / 0.3)); ph += 2 * Math.PI * f / SR; o[i] = Math.tanh(Math.sin(ph) * 1.8) * Math.exp(-t / 0.35) + rnd() * 0.25 * Math.exp(-t / 0.02); } return o; }

// --- harmony -------------------------------------------------------------------
const PROG = {
  boombap: [ // Am9 · Fmaj7 · Cmaj7 · G6 — the lo-fi loop, in the EP register
    { bass: 45, chord: [57, 60, 64, 67, 71], lead: [64, 67, 69, 71, 72, 76] },
    { bass: 41, chord: [53, 57, 60, 64, 69], lead: [60, 64, 65, 69, 72, 76] },
    { bass: 48, chord: [55, 60, 64, 67, 71], lead: [64, 67, 71, 72, 74, 76] },
    { bass: 43, chord: [55, 59, 62, 64, 67], lead: [62, 64, 67, 69, 71, 74] },
  ],
  funk: [ // C · G · Am · F — bright, major, plucked
    { bass: 36, chord: [55, 60, 64, 67], lead: [67, 72, 74, 76, 79] },
    { bass: 43, chord: [55, 59, 62, 67], lead: [67, 71, 74, 76, 79] },
    { bass: 45, chord: [57, 60, 64, 69], lead: [69, 72, 76, 79, 81] },
    { bass: 41, chord: [53, 57, 60, 65], lead: [65, 69, 72, 76, 77] },
  ],
  pulse: [ // Am · F · C · G — the arpeggio register
    { bass: 33, chord: [57, 60, 64, 69], lead: [69, 72, 76, 81] },
    { bass: 29, chord: [53, 57, 60, 65], lead: [65, 69, 72, 77] },
    { bass: 36, chord: [55, 60, 64, 67], lead: [67, 72, 76, 79] },
    { bass: 31, chord: [55, 59, 62, 67], lead: [67, 71, 74, 79] },
  ],
};
PROG.synth = PROG.pulse;
const chordAt = bar => PROG[STYLE][bar % 4];

// ================================ the styles =====================================
const KICK = kick(), SNARE = snare(), CLAP = clap(), HAT = hat(), OHAT = hat({ open: true }), SHK = shaker(), RIM = rim();
const lastBar = BARS - 1;

if (STYLE === "boombap") {
  // vinyl: a noise floor and sparse crackle, the whole way — it is the room the record plays in
  add(0, END, t => rnd() * 0.5, 0.010, { send: 0 });
  for (let t = 0; t < END; t += 0.02 + Math.abs(rnd()) * 0.35) add(t, 0.012, (tt, u) => rnd() * Math.exp(-tt / 0.0015), 0.10);
  for (let b = 0; b < BARS; b++) {
    const c = chordAt(b), grooving = inGroove(b);
    // EP chord: stabs on 1 and the "and" of 2, a softer one on 4, spread across the field
    const stabs = [[0, 1.0], [6, 0.7], [12, 0.55]];
    for (const [s, vel] of stabs) {
      c.chord.forEach((m, k) => place(tStep(b, s) + k * 0.007, epiano(midi(m), 1.6, { index: 2.2, vel }), 0.11 * vel, { send: 0.30, pan: (k - 2) * 0.22 }));
    }
    // a lead fragment every other bar: three notes from the chord's scale, laid back
    if (b % 2 === 1 && b >= DROP - 1) {
      const picks = [2, 4, 3].map(i => c.lead[i]);
      picks.forEach((m, k) => place(tStep(b, 2 + k * 3) + 0.02, epiano(midi(m), 1.2, { index: 3.0, vel: 0.8 }), 0.10, { send: 0.42, pan: 0.15 }));
    }
    if (!grooving) continue;
    // sub bass: root on 1, the fifth pushed on the "and" of 3, a slide back
    add(tStep(b, 0), BEAT * 1.7, t => Math.tanh(Math.sin(2 * Math.PI * midi(c.bass) * t) * 1.8 + Math.sin(2 * Math.PI * midi(c.bass) * 2 * t) * 0.3) * env(t, 0.01, 0.6, 2.2), 0.30);
    add(tStep(b, 10), BEAT * 1.1, t => Math.tanh(Math.sin(2 * Math.PI * midi(c.bass + 7) * t) * 1.8) * env(t, 0.01, 0.4, 2.2), 0.24);
    // drums: the boom-bap
    for (const s of [0, 7, 10]) place(tStep(b, s), KICK, s === 0 ? 0.62 : 0.48);
    for (const s of [4, 12]) place(tStep(b, s), SNARE, 0.42, { send: 0.18 });
    if (b % 4 === 3) place(tStep(b, 15), SNARE, 0.18, { send: 0.18 });          // a ghost before the turnaround
    for (let s = 0; s < 16; s += 2) place(tStep(b, s) + (s % 4 === 2 ? 0.09 * STEP : 0), HAT, s % 4 === 0 ? 0.20 : 0.13, { pan: 0.35 });
    if (b % 2 === 1) place(tStep(b, 14), OHAT, 0.12, { pan: 0.35 });
    place(tStep(b, 3), RIM, 0.10, { pan: -0.4 });
  }
}

if (STYLE === "funk") {
  for (let b = 0; b < BARS; b++) {
    const c = chordAt(b), grooving = inGroove(b);
    // the plucked riff: chord tones on a syncopated 16th grid — this is the hook
    const riff = [[0, 0], [3, 1], [6, 2], [8, 0], [10, 3], [11, 1], [14, 2]];
    for (const [s, k] of riff) {
      const m = c.chord[k % c.chord.length] + 12;
      place(tStep(b, s), pluck(midi(m), 0.7, { t60: 0.9, bright: 0.65 }), 0.20, { send: 0.22, pan: k % 2 ? 0.3 : -0.3 });
    }
    // a chord strum on 1 (four strings, 9 ms apart) and a muted one on the "and" of 3
    c.chord.forEach((m, k) => place(tStep(b, 0) + k * 0.009, pluck(midi(m), 1.4, { t60: 1.3, bright: 0.5 }), 0.12, { send: 0.28, pan: (k - 1.5) * 0.3 }));
    c.chord.forEach((m, k) => place(tStep(b, 10) + k * 0.007, pluck(midi(m), 0.25, { t60: 0.12, bright: 0.4 }), 0.10, { pan: (k - 1.5) * 0.3 }));
    // lead answer every 2 bars from the drop
    if (b % 2 === 1 && b >= DROP) [1, 3, 2, 4].forEach((i, k) => place(tStep(b, 8 + k * 2), pluck(midi(c.lead[i]), 0.6, { t60: 0.7, bright: 0.8 }), 0.16, { send: 0.35, pan: 0.2 }));
    if (!grooving) continue;
    // plucked bass: root on 1 and 6, octave on 11, fifth on 14 — with a sub under it
    for (const [s, off, g] of [[0, 0, 1], [6, 0, 0.8], [11, 12, 0.7], [14, 7, 0.7]]) {
      const f = midi(c.bass + off);
      place(tStep(b, s), pluck(f, 0.5, { t60: 0.55, bright: 0.35 }), 0.36 * g);
      add(tStep(b, s), 0.32, t => Math.sin(2 * Math.PI * f * t) * env(t, 0.004, 0.16, 2.5), 0.22 * g);
    }
    // drums: kick, claps, 16th hats, shaker on the 8ths
    for (const s of [0, 5, 8, 11]) place(tStep(b, s), KICK, s % 8 === 0 ? 0.58 : 0.40);
    for (const s of [4, 12]) place(tStep(b, s), CLAP, 0.40, { send: 0.25, pan: 0.1 });
    for (let s = 0; s < 16; s++) place(tStep(b, s), HAT, s % 4 === 0 ? 0.17 : s % 2 === 0 ? 0.12 : 0.07, { pan: 0.4 });
    for (let s = 2; s < 16; s += 4) place(tStep(b, s), SHK, 0.10, { pan: -0.45 });
    if (b % 4 === 3) place(tStep(b, 14), OHAT, 0.12, { pan: 0.4 });
  }
}

if (STYLE === "pulse") {
  // the drone: two detuned saws an octave below the bass, low-passed, the floor of the whole thing
  add(0, END, (() => { const a = saw(midi(33), N, 0), b2 = saw(midi(33), N, 0.004); let lp = 0; return t => { const i = (t * SR) | 0; lp += 0.012 * ((a[i] + b2[i]) * 0.5 - lp); return lp; }; })(), 0.16, { pumped: true });
  for (let b = 0; b < BARS; b++) {
    const c = chordAt(b), grooving = inGroove(b);
    // the pulse: 8th-note plucks walking the chord, the pattern rising through the bar
    const pat = [0, 1, 2, 3, 2, 3, 1, 2];
    pat.forEach((k, i) => place(tStep(b, i * 2), pulsePluck(midi(c.chord[k]), 0.4), 0.17 + (i % 2 ? 0 : 0.04), { send: 0.30, pan: i % 2 ? 0.28 : -0.28, pumped: true }));
    // the pad: a soft supersaw, side-chained, thickening after the drop
    c.chord.forEach((m, k) => place(b * BAR, supersaw(midi(m), BAR * 1.05, 5, 0.010).map((v, i) => v * Math.min(1, i / (0.25 * SR)) * Math.min(1, (BAR * 1.05 * SR - i) / (0.3 * SR))), (b >= DROP ? 0.075 : 0.05), { pumped: true, send: 0.22, pan: (k - 1.5) * 0.25 }));
    // top line from the drop: one long note per bar, a fifth above
    if (b >= DROP && b % 2 === 0) place(tStep(b, 0), pulsePluck(midi(c.lead[1]), 1.2), 0.14, { send: 0.45, pan: 0.15 });
    if (!grooving) continue;
    add(tStep(b, 0), BAR, t => Math.tanh(Math.sin(2 * Math.PI * midi(c.bass) * t) * 1.6) * env(t, 0.01, 0.9, 1.6), 0.26);
    for (const s of [0, 4, 8, 12]) place(tStep(b, s), KICK, 0.60);
    for (const s of [4, 12]) place(tStep(b, s), CLAP, 0.32, { send: 0.25 });
    if (b >= DROP + 4) for (let s = 2; s < 16; s += 2) place(tStep(b, s), HAT, 0.13, { pan: 0.4 });
    if (b % 4 === 3) place(tStep(b, 14), OHAT, 0.11, { pan: 0.4 });
  }
}

if (STYLE === "synth") {
  for (let b = 0; b < BARS; b++) {
    const c = chordAt(b), grooving = inGroove(b);
    c.chord.forEach((m, k) => place(b * BAR, supersaw(midi(m), BAR * 1.02, 7, 0.014).map((v, i) => v * Math.min(1, i / (0.05 * SR))), 0.09, { pumped: true, send: 0.25, pan: (k - 1.5) * 0.3 }));
    [0, 2, 1, 3].forEach((k, i) => place(tStep(b, i * 4 + 2), pulsePluck(midi(c.lead[k]), 0.5), 0.13, { send: 0.4, pan: i % 2 ? 0.3 : -0.3 }));
    if (!grooving) continue;
    for (const s of [2, 6, 10, 14]) add(tStep(b, s), BEAT * 0.45, t => Math.tanh(saw(midi(c.bass), 1)[0] * 0 + Math.sin(2 * Math.PI * midi(c.bass) * t) * 1.8) * env(t, 0.005, 0.25, 2.5), 0.30);
    for (const s of [0, 4, 8, 12]) place(tStep(b, s), KICK, 0.62);
    for (const s of [4, 12]) place(tStep(b, s), CLAP, 0.36, { send: 0.25 });
    for (let s = 2; s < 16; s += 2) place(tStep(b, s), HAT, 0.14, { pan: 0.4 });
  }
}

// --- the drops: a riser into each entry, a boom on it -----------------------------
const entries = [DROP, ...(BRK ? [BRK[1]] : [])].filter(b => b > 0 && b < BARS);
for (const b of entries) {
  const dur = Math.min(BAR * 1.5, b * BAR);
  place(b * BAR - dur, riser(dur), 0.16, { send: 0.3 });
  place(b * BAR, boom(), 0.55);
}

// --- the send bus: ping-pong delay (dotted 8th) into a Schroeder reverb -----------
{
  const dl = Math.round(BEAT * 0.75 * SR), fb = 0.36;
  const dL = new Float32Array(dl), dR = new Float32Array(dl); let di = 0;
  for (let i = 0; i < N; i++) {
    const outL = dL[di], outR = dR[di];
    dL[di] = sendR[i] + outR * fb;          // ping-pong: each side feeds the other
    dR[di] = sendL[i] + outL * fb;
    di = (di + 1) % dl;
    sendL[i] += outL * 0.8; sendR[i] += outR * 0.8;
  }
  const combs = [0.0297, 0.0371, 0.0411, 0.0437, 0.0523, 0.0617].map((d, k) => ({ N: Math.round(d * SR * (k % 2 ? 1.013 : 1)), bufL: new Float32Array(Math.round(d * SR * 1.02)), bufR: new Float32Array(Math.round(d * SR * 1.02)), g: Math.pow(0.001, d / 1.9), i: 0 }));
  const wetL = new Float32Array(N), wetR = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let al = 0, ar = 0;
    for (const c of combs) { const yl = c.bufL[c.i], yr = c.bufR[c.i]; c.bufL[c.i] = sendL[i] + yl * c.g; c.bufR[c.i] = sendR[i] + yr * c.g; c.i = (c.i + 1) % c.N; al += yl; ar += yr; }
    wetL[i] = al / combs.length; wetR[i] = ar / combs.length;
  }
  for (const [buf, apd] of [[wetL, 0.0050], [wetR, 0.0053], [wetL, 0.0017], [wetR, 0.0019]]) {
    const an = Math.round(apd * SR), ap = new Float32Array(an); let ai = 0;
    for (let i = 0; i < N; i++) { const x = buf[i], y = -0.5 * x + ap[ai]; ap[ai] = x + 0.5 * y; ai = (ai + 1) % an; buf[i] = y; }
  }
  for (let i = 0; i < N; i++) { L[i] += wetL[i] * 0.9; R[i] += wetR[i] * 0.9; }
}

// --- master: a low-pass sweep + fade INTO the cut, soft clip, peak −3 dBFS -------------
{
  let lpL = 0, lpR = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    // u ∈ [0, 1] over the fade, CLAMPED — at t == END the raw ratio rounds past 1
    // and Math.pow(1 − u, 1.3) went NaN, which then poisoned the filter state
    const u = clamp01((t - (END - FADE)) / FADE);
    const g = Math.pow(1 - u, 1.3);
    const fc = 16000 * Math.pow(0.02, u);                    // 16 kHz → 320 Hz
    const a = 1 - Math.exp(-2 * Math.PI * fc / SR);
    lpL += a * (L[i] - lpL); lpR += a * (R[i] - lpR);
    L[i] = Math.tanh(lpL * 0.9) * g; R[i] = Math.tanh(lpR * 0.9) * g;
    if (t > END) { L[i] = 0; R[i] = 0; }
  }
  let peak = 0;
  for (let i = 0; i < N; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > peak) peak = a; }
  if (!Number.isFinite(peak) || peak === 0) { console.error(`invalid render (peak ${peak}); nothing written`); process.exit(1); }
  const k = Math.pow(10, -3 / 20) / peak;
  const bytes = N * 4, buf = Buffer.alloc(44 + bytes);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + bytes, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(bytes, 40);
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * k)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * k)) * 32767), 44 + i * 4 + 2);
  }
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(path.resolve(OUT), buf);
  console.log(`${OUT} — style ${STYLE} · ${BPM.toFixed(1)} bpm · ${BARS} bars of ${BAR.toFixed(3)} s · drop at bar ${DROP} (${(DROP * BAR).toFixed(2)} s)`
    + (BRK ? ` · break ${BRK[0]}–${BRK[1]} (${(BRK[0] * BAR).toFixed(1)}–${(BRK[1] * BAR).toFixed(1)} s)` : "") + ` · fade ${FADE} s → ${END} s · raw peak ${peak.toFixed(3)}`);
}
