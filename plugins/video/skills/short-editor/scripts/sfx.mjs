// Synthesises the sound-effect bed for the whole video and writes sfx.wav.
//
//   node sfx.mjs           # reads project.json + edl.mjs from the working dir
//
// Everything is generated here — no samples, nothing licensed: resonant-filtered
// noise sweeps for the whooshes, pitch-dropping sines for the pops, a low sine
// with a noise transient for the impacts. Two reasons that matters: it costs
// nothing, and it never puts a copyright claim on the user's video.
//
// Licensed or meme samples are never ripped from YouTube. If the user supplies
// the files, drop them in assets/ and reference them from a cue as
// kind "sample:name.wav" — integrating a file the user provides is normal
// editing work, extracting it is not.
//
// Levels are set in dB RELATIVE to the speaking voice, measured, not guessed.
// MASTER_DB exists because the first pass landed the cues ~13 dB hot and the
// whole thing read as a sound-effects reel instead of as editing.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CWD = process.cwd();
// Run as a script it renders the project's bed; imported (the listening board,
// a test) it only exposes the library.
const MAIN = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

export const SR = 48000;
const CH = 2;

// --- tiny DSP toolbox --------------------------------------------------------
const rnd = (() => { let s = 0x2545f491; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; })();

// Chamberlin state-variable filter — stable, cheap, and its cutoff can be
// modulated per-sample, which is exactly what a whoosh needs.
function svfBandpass(input, fEnv, q = 3.2) {
  const out = new Float32Array(input.length);
  let low = 0, band = 0;
  for (let i = 0; i < input.length; i++) {
    const f = 2 * Math.sin(Math.PI * Math.min(fEnv(i / SR), SR * 0.45) / SR);
    const qq = 1 / q;
    const high = input[i] - low - qq * band;
    band += f * high;
    low += f * band;
    out[i] = band;
  }
  return out;
}
const env = (n, atk, dec, curve = 3) => {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const up = atk <= 0 ? 1 : Math.min(1, t / atk);
    const dn = Math.exp(-(Math.max(0, t - atk) / dec) * curve);
    a[i] = up * dn;
  }
  return a;
};
function highpass(x, fc) {
  const rc = 1 / (2 * Math.PI * fc), a = rc / (rc + 1 / SR);
  const o = new Float32Array(x.length); let px = 0, py = 0;
  for (let i = 0; i < x.length; i++) { o[i] = a * (py + x[i] - px); px = x[i]; py = o[i]; }
  return o;
}
const noise = n => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = rnd(); return a; };
const mulEnv = (x, e) => { const o = new Float32Array(x.length); for (let i = 0; i < x.length; i++) o[i] = x[i] * e[i]; return o; };
const addTo = (dst, src, g = 1) => { for (let i = 0; i < src.length && i < dst.length; i++) dst[i] += src[i] * g; };

// sine with an exponential frequency glide
function chirp(n, f0, f1, decay, curve = 3) {
  const o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const f = f0 * Math.pow(f1 / f0, u);
    ph += (2 * Math.PI * f) / SR;
    o[i] = Math.sin(ph) * Math.exp(-(i / SR / decay) * curve);
  }
  return o;
}

// A sample the user supplied (or a bed music.mjs generated), read from the
// project's assets/ folder. 16-bit PCM WAV; the chunks are walked rather than
// assuming a 44-byte header (an exported WAV often carries a LIST chunk), and
// a stereo file keeps its width (the bed is stereo) — reading it as mono would
// have played it an octave down at half speed.
function loadWav(name) {
  const b = fs.readFileSync(path.resolve(CWD, "assets", name));
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WAVE") throw new Error(`${name}: not a WAV`);
  let pos = 12, ch = 1, bits = 16, rate = SR, data = null;
  while (pos + 8 <= b.length) {
    const id = b.toString("ascii", pos, pos + 4), len = b.readUInt32LE(pos + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(pos + 10); rate = b.readUInt32LE(pos + 12); bits = b.readUInt16LE(pos + 22); }
    else if (id === "data") { data = b.subarray(pos + 8, pos + 8 + len); break; }
    pos += 8 + len + (len & 1);
  }
  if (!data) throw new Error(`${name}: no data chunk`);
  if (bits !== 16) throw new Error(`${name}: ${bits} bits; export as 16-bit PCM`);
  if (rate !== SR) console.error(`  ⚠ ${name} is ${rate} Hz, the bed is ${SR} Hz; it will play ${(rate / SR).toFixed(2)}x too fast/slow`);
  const frames = Math.floor(data.length / (2 * ch));
  if (ch === 1) {
    const o = new Float32Array(frames);
    for (let i = 0; i < frames; i++) o[i] = data.readInt16LE(i * 2) / 32768;
    return o;
  }
  // stereo keeps its width: the bed is stereo too (see below); wider files are folded to L/R
  const l = new Float32Array(frames), r = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    l[i] = data.readInt16LE((i * ch) * 2) / 32768;
    r[i] = data.readInt16LE((i * ch + 1) * 2) / 32768;
  }
  return { L: l, R: r, length: frames };
}

// A small room for a hit or a ping: Schroeder combs + an allpass, mixed under
// the dry sound. `tail` is the -60 dB time in seconds, `wet` the mix.
function room(dry, tail = 0.8, wet = 0.3) {
  const n = dry.length;
  const out = new Float32Array(n);
  const combs = [0.0297, 0.0371, 0.0411, 0.0437].map(d => ({ N: Math.round(d * SR), buf: new Float32Array(Math.round(d * SR)), g: Math.pow(0.001, d / tail), i: 0 }));
  let wetv = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (const c of combs) { const y = c.buf[c.i]; c.buf[c.i] = dry[i] + y * c.g; c.i = (c.i + 1) % c.N; acc += y; }
    wetv[i] = acc * 0.25;
  }
  const apN = Math.round(0.005 * SR), ap = new Float32Array(apN); let api = 0;
  for (let i = 0; i < n; i++) { const x = wetv[i], y = -0.5 * x + ap[api]; ap[api] = x + 0.5 * y; api = (api + 1) % apN; out[i] = dry[i] + y * wet; }
  return out;
}

// the toolbox is exported so jingle.mjs (the series ident) composes with the
// same primitives instead of carrying a second DSP file
export { svfBandpass, env, highpass, noise, mulEnv, addTo, chirp, room, rnd };

// --- the sound library -------------------------------------------------------
export function make(kind) {
  switch (kind) {
    case "whoosh_in": {
      const n = (0.62 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 380 * Math.pow(4200 / 380, Math.min(1, t / 0.5)), 2.6);
      const e = env(n, 0.30, 0.14, 2.6);
      const body = highpass(highpass(mulEnv(swept, e), 190), 190);
      addTo(body, mulEnv(chirp(n, 420, 1200, 0.30), env(n, 0.28, 0.10)), 0.14);
      return body;
    }
    case "whoosh_out": {
      const n = (0.66 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 3200 * Math.pow(320 / 3200, Math.min(1, t / 0.55)), 2.4);
      return highpass(highpass(mulEnv(swept, env(n, 0.05, 0.22, 2.2)), 190), 190);
    }
    case "swoosh_in": {
      const n = (0.34 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 700 * Math.pow(5200 / 700, Math.min(1, t / 0.26)), 3.0);
      return highpass(mulEnv(swept, env(n, 0.17, 0.075, 2.8)), 240);
    }
    case "swoosh_out": {
      const n = (0.36 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 4600 * Math.pow(600 / 4600, Math.min(1, t / 0.30)), 2.8);
      return highpass(mulEnv(swept, env(n, 0.03, 0.13, 2.4)), 240);
    }
    case "tick0": case "tick1": case "tick2": case "tick3": {
      const k = +kind.slice(-1);
      const f = [1080, 1240, 1420, 1620][k];
      const n = (0.13 * SR) | 0;
      const o = chirp(n, f * 1.55, f * 0.92, 0.036, 3.4);
      addTo(o, mulEnv(noise(n), env(n, 0.0004, 0.006, 4)), 0.055);  // transient
      addTo(o, chirp(n, f * 2.6, f * 1.8, 0.018, 4), 0.075);         // harmonic sparkle
      return o;
    }
    case "blip": {
      const n = (0.10 * SR) | 0;
      const o = chirp(n, 2500, 2500, 0.026, 3.6);
      addTo(o, chirp(n, 3750, 3750, 0.016, 4), 0.22);
      return o;
    }
    case "chime": {
      const n = (0.9 * SR) | 0;
      const o = chirp(n, 880, 880, 0.30, 2.2);
      addTo(o, chirp(n, 1320, 1320, 0.24, 2.4), 0.5);
      addTo(o, chirp(n, 1760, 1760, 0.16, 2.8), 0.22);
      return mulEnv(o, env(n, 0.004, 0.42, 1.6));
    }
    case "impact_soft": {
      const n = (0.55 * SR) | 0;
      const o = chirp(n, 210, 78, 0.20, 2.4);
      addTo(o, chirp(n, 520, 250, 0.13, 2.6), 0.70);   // phone-speaker body
      addTo(o, mulEnv(svfBandpass(noise(n), () => 1200, 1.8), env(n, 0.0006, 0.022, 4)), 0.10);
      addTo(o, chirp(n, 900, 520, 0.030, 3.6), 0.07);
      return o;
    }
    case "impact_big": {
      const n = (1.15 * SR) | 0;
      const o = chirp(n, 150, 46, 0.34, 2.1);
      addTo(o, chirp(n, 330, 105, 0.26, 2.2), 0.95);   // the part a phone can play
      addTo(o, chirp(n, 560, 210, 0.16, 2.6), 0.45);
      addTo(o, mulEnv(svfBandpass(noise(n), t => 2200 * Math.exp(-t * 8), 1.5), env(n, 0.0008, 0.075, 3)), 0.26);
      addTo(o, chirp(n, 1100, 620, 0.04, 4), 0.10);
      return o;
    }
    case "pop": {
      // a logo landing: more body than a tick, still short
      const n = (0.22 * SR) | 0;
      const o = chirp(n, 900, 380, 0.055, 3.0);
      addTo(o, chirp(n, 1800, 900, 0.030, 3.6), 0.34);
      addTo(o, chirp(n, 260, 150, 0.075, 2.6), 0.42);          // phone-speaker weight
      addTo(o, mulEnv(noise(n), env(n, 0.0004, 0.005, 4)), 0.05);
      return o;
    }
    case "buzz": {
      // the "and which one doesn't" cross: a short descending buzz
      const n = (0.30 * SR) | 0;
      const o = new Float32Array(n); let ph = 0;
      for (let i = 0; i < n; i++) {
        const u = i / n, f = 340 * Math.pow(150 / 340, u);
        ph += (2 * Math.PI * f) / SR;
        // squared-off wave: reads as "wrong" where a pure sine reads as "note"
        o[i] = Math.tanh(Math.sin(ph) * 2.6) * Math.exp(-u * 3.4);
      }
      return o;
    }
    case "rattle": {
      // "TOO MUCH": a fast cluster of ticks, deliberately messy
      const n = (0.45 * SR) | 0;
      const o = new Float32Array(n);
      for (let k = 0; k < 7; k++) {
        const off = Math.round((0.012 + k * 0.030) * SR);
        const f = 1500 - k * 95;
        const c2 = chirp((0.09 * SR) | 0, f * 1.5, f * 0.9, 0.028, 3.4);
        for (let i = 0; i < c2.length; i++) if (off + i < n) o[off + i] += c2[i] * (1 - k * 0.10);
      }
      return o;
    }
    case "type": {
      // a key bottoming out: a click, then a short woody thock so it survives
      // being played under a loud sentence
      const n = (0.09 * SR) | 0;
      const o = mulEnv(noise(n), env(n, 0.0003, 0.0040, 4));
      addTo(o, chirp(n, 2300, 1600, 0.009, 4), 0.34);
      addTo(o, chirp(n, 820, 520, 0.022, 3.2), 0.40);
      addTo(o, chirp(n, 340, 240, 0.030, 3.0), 0.16);
      return o;
    }
    case "tap": {
      // deliberately slighter than `pop`: no low end, nothing to thump
      const n = (0.09 * SR) | 0;
      const o = chirp(n, 1750, 1250, 0.022, 3.4);
      addTo(o, chirp(n, 3400, 2600, 0.012, 4), 0.16);
      addTo(o, mulEnv(noise(n), env(n, 0.0004, 0.0035, 4)), 0.035);
      return o;
    }
    case "riser": {
      const n = (1.25 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 240 * Math.pow(6800 / 240, Math.min(1, t / 1.15)), 3.4);
      const e = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / n; e[i] = Math.pow(u, 1.9) * (1 - Math.pow(Math.max(0, u - 0.95) / 0.05, 2)); }
      const body = mulEnv(swept, e);
      // a rising minor-third pair under the noise gives it pitch, not just hiss
      addTo(body, mulEnv(chirp(n, 220, 1760, 4, 0), e), 0.11);
      addTo(body, mulEnv(chirp(n, 262, 2093, 4, 0), e), 0.08);
      return body;
    }
    // ---- the alternative designs, one board's worth (see references/audio-spec.md) ----
    case "air_in": {
      // a block arriving as moving AIR, not a laser: wide band (low Q), a slow
      // sweep, the whole thing panned left→right so it crosses the frame.
      const n = (0.50 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 320 * Math.pow(3000 / 320, Math.min(1, t / 0.42)), 1.4);
      const body = highpass(mulEnv(swept, env(n, 0.26, 0.11, 2.4)), 160);
      const L = new Float32Array(n), R = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / n; L[i] = body[i] * Math.cos(u * Math.PI / 2) * 1.2; R[i] = body[i] * Math.sin(u * Math.PI / 2) * 1.2; }
      return { L, R, length: n };
    }
    case "flick": {
      // a card flicked onto the table: one transient and a breath of paper
      const n = (0.14 * SR) | 0;
      const o = mulEnv(noise(n), env(n, 0.0003, 0.004, 4));
      addTo(o, mulEnv(svfBandpass(noise(n), () => 5200, 1.6), env(n, 0.002, 0.030, 3)), 0.55);
      addTo(o, chirp(n, 640, 380, 0.030, 3.2), 0.30);
      return o;
    }
    case "thump": {
      // the yellow word as WEIGHT: a sub that drops 95→42 Hz, a knock at 180 Hz
      // so a phone still hears something, and the smallest click for the onset
      const n = (0.42 * SR) | 0;
      const o = chirp(n, 95, 42, 0.16, 2.2);
      addTo(o, chirp(n, 190, 120, 0.09, 2.6), 0.55);
      addTo(o, mulEnv(noise(n), env(n, 0.0003, 0.003, 4)), 0.06);
      addTo(o, chirp(n, 1400, 900, 0.012, 4), 0.05);
      return o;
    }
    case "shutter": {
      // a camera shutter: two mechanical clicks 28 ms apart, then the mirror's body
      const n = (0.16 * SR) | 0;
      const o = new Float32Array(n);
      for (const [off, f, g] of [[0, 2600, 1], [0.028, 1500, 0.8]]) {
        const c = mulEnv(svfBandpass(noise(n), () => f, 2.2), env(n, 0.0004, 0.010, 4));
        const k = Math.round(off * SR);
        for (let i = 0; i + k < n; i++) o[i + k] += c[i] * g;
      }
      addTo(o, chirp(n, 420, 300, 0.045, 3.2), 0.28);
      return o;
    }
    case "glass": {
      // a bright metallic ping: bell partials, then a short room
      const n = (0.70 * SR) | 0;
      const f = 1320;
      const o = chirp(n, f, f, 0.16, 2.6);
      addTo(o, chirp(n, f * 2.76, f * 2.76, 0.09, 3), 0.45);
      addTo(o, chirp(n, f * 5.40, f * 5.40, 0.05, 3.4), 0.22);
      addTo(o, mulEnv(noise(n), env(n, 0.0003, 0.002, 4)), 0.08);
      return room(o, 0.35, 0.28);
    }
    case "hit_tail": {
      // the payoff as a cinematic HIT: a noise burst and a boom, then 1.4 s of
      // room so it lands in a space instead of stopping dead
      const n = (1.60 * SR) | 0;
      const o = chirp(n, 120, 38, 0.30, 2.0);
      addTo(o, chirp(n, 250, 95, 0.18, 2.4), 0.8);
      addTo(o, mulEnv(svfBandpass(noise(n), t => 1800 * Math.exp(-t * 6), 1.2), env(n, 0.0008, 0.09, 3)), 0.5);
      addTo(o, mulEnv(noise(n), env(n, 0.0004, 0.006, 4)), 0.18);
      return room(o, 1.2, 0.42);
    }
    case "bass_drop": {
      // a pitched drop with grit: 220→28 Hz over 0.55 s through a soft clipper
      const n = (0.95 * SR) | 0;
      const o = new Float32Array(n); let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / SR, u = Math.min(1, t / 0.55);
        const f = 220 * Math.pow(28 / 220, u);
        ph += (2 * Math.PI * f) / SR;
        const e = Math.exp(-Math.max(0, t - 0.4) * 5);
        o[i] = Math.tanh(Math.sin(ph) * 2.2 + Math.sin(ph * 2) * 0.35) * e * 0.8;
      }
      addTo(o, mulEnv(noise(n), env(n, 0.0004, 0.005, 4)), 0.12);
      return o;
    }
    case "riser_tonal": {
      // tension with PITCH: a shimmer of partials climbing an octave over the
      // noise, cut dead at the top so the impact has a hole to land in
      const n = (1.50 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 300 * Math.pow(6000 / 300, Math.min(1, t / 1.42)), 2.6);
      const e = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / n; e[i] = Math.pow(u, 1.7) * (u < 0.965 ? 1 : Math.max(0, 1 - (u - 0.965) / 0.035)); }
      const body = mulEnv(swept, e);
      for (const m of [57, 64, 69, 72]) {                     // A minor, climbing an octave
        const f0 = 440 * Math.pow(2, (m - 69) / 12);
        addTo(body, mulEnv(chirp(n, f0, f0 * 2, 9, 0), e), 0.07);
      }
      return body;
    }
    case "rev_whoosh": {
      // a section leaving as a REVERSED whoosh: swells, then stops on the cut
      const n = (0.55 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 500 * Math.pow(4200 / 500, Math.min(1, t / 0.5)), 2.2);
      const e = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / n; e[i] = Math.pow(u, 2.2) * (u < 0.96 ? 1 : Math.max(0, 1 - (u - 0.96) / 0.04)); }
      return highpass(mulEnv(swept, e), 200);   // no click at the end: the cut is the click
    }
    // ---- THE HANDWRITTEN EDIT (hand.mjs): paper, tape, a pencil tapped ------------
    case "paper_in": {
      // a sheet slid onto the desk: a soft, low, brushed noise that ends in the
      // smallest flap as the paper lands
      const n = (0.36 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 2400 * Math.pow(600 / 2400, Math.min(1, t / 0.32)), 1.1);
      const o = mulEnv(swept, env(n, 0.10, 0.11, 2.2));
      const flap = mulEnv(svfBandpass(noise(n), () => 900, 1.6), env(n, 0.001, 0.03, 3.2));
      for (let i = 0; i < n; i++) { const j = i - ((0.27 * SR) | 0); if (j >= 0) o[i] += flap[j] * 0.5; }
      return highpass(o, 180);
    }
    case "paper_out": {
      // the sheet lifted away: the flap first, then the brushed noise swelling and gone
      const n = (0.40 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 700 * Math.pow(2600 / 700, Math.min(1, t / 0.36)), 1.1);
      const e = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / n; e[i] = Math.pow(Math.sin(u * Math.PI), 1.4) * (u < 0.9 ? 1 : (1 - u) / 0.1); }
      const o = mulEnv(swept, e);
      addTo(o, mulEnv(svfBandpass(noise(n), () => 1100, 1.6), env(n, 0.001, 0.025, 3.2)), 0.45);
      return highpass(o, 200);
    }
    case "sheet_in": {
      // a full sheet swept over the frame: the paper_in gesture, bigger and lower
      const n = (0.48 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 1800 * Math.pow(380 / 1800, Math.min(1, t / 0.42)), 1.0);
      const o = mulEnv(swept, env(n, 0.14, 0.13, 2.2));
      const flap = mulEnv(svfBandpass(noise(n), () => 700, 1.4), env(n, 0.001, 0.045, 3.0));
      for (let i = 0; i < n; i++) { const j = i - ((0.38 * SR) | 0); if (j >= 0) o[i] += flap[j] * 0.7; }
      addTo(o, chirp(n, 140, 90, 0.08, 3), 0.12);          // the desk under it
      return highpass(o, 140);
    }
    case "sheet_out": {
      const n = (0.46 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 500 * Math.pow(2400 / 500, Math.min(1, t / 0.4)), 1.0);
      const e = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / n; e[i] = Math.pow(Math.sin(u * Math.PI), 1.3) * (u < 0.88 ? 1 : (1 - u) / 0.12); }
      const o = mulEnv(swept, e);
      addTo(o, mulEnv(svfBandpass(noise(n), () => 800, 1.4), env(n, 0.001, 0.04, 3.0)), 0.6);
      return highpass(o, 160);
    }
    case "tear": {
      // paper torn across: a dense crackle whose rate rides a sweep, over a
      // fibrous rasp — the crackle is what says "torn" rather than "swept"
      const n = (0.42 * SR) | 0;
      const rasp = mulEnv(svfBandpass(noise(n), t => 1400 + 2200 * Math.min(1, t / 0.38), 1.3), env(n, 0.02, 0.18, 2.0));
      const o = new Float32Array(n);
      addTo(o, rasp, 0.5);
      let next = 0.01 * SR;
      for (let i = 0; i < n; i++) {
        if (i >= next) {
          const u = i / n, gap = (0.0025 + 0.006 * Math.abs(rnd())) * (1 - 0.5 * Math.sin(u * Math.PI));
          next = i + gap * SR;
          const c = mulEnv(svfBandpass(noise((0.006 * SR) | 0), () => 3000 + 3000 * rnd(), 2.2), env((0.006 * SR) | 0, 0.0002, 0.0015, 4));
          for (let j = 0; j < c.length && i + j < n; j++) o[i + j] += c[j] * (0.5 + 0.5 * Math.abs(rnd())) * Math.sin(u * Math.PI);
        }
      }
      return highpass(o, 500);
    }
    case "tape": {
      // a strip of tape pulled off the roll and pressed down: a buzzy rip (noise
      // modulated at ~110 Hz sliding down), then a soft thud of the thumb
      const n = (0.30 * SR) | 0;
      const rip = svfBandpass(noise(n), t => 3200 - 1800 * Math.min(1, t / 0.2), 1.5);
      const o = new Float32Array(n);
      for (let i = 0; i < n; i++) { const t = i / SR; const am = 0.55 + 0.45 * Math.max(0, Math.sin(2 * Math.PI * (120 - 50 * Math.min(1, t / 0.2)) * t)); o[i] = rip[i] * am * env(1, 0, 1)[0]; }
      const e = env(n, 0.006, 0.09, 2.6);
      for (let i = 0; i < n; i++) o[i] *= e[i];
      const thud = chirp(n, 300, 180, 0.05, 3.2);
      for (let i = 0; i < n; i++) { const j = i - ((0.22 * SR) | 0); if (j >= 0) o[i] += thud[j] * 0.35; }
      return highpass(o, 300);
    }
    case "tap_pencil": {
      // a pencil tapped on the desk: a woody click, no ring
      const n = (0.12 * SR) | 0;
      const o = chirp(n, 1500, 900, 0.010, 4);
      addTo(o, chirp(n, 420, 300, 0.035, 3.2), 0.6);
      addTo(o, chirp(n, 190, 150, 0.05, 3.0), 0.3);
      addTo(o, mulEnv(noise(n), env(n, 0.0003, 0.003, 4)), 0.08);
      return o;
    }
    case "sticker": {
      // a sticker slapped on: a short flat pat with a little paper
      const n = (0.16 * SR) | 0;
      const o = mulEnv(svfBandpass(noise(n), () => 1400, 1.2), env(n, 0.001, 0.035, 3.2));
      addTo(o, chirp(n, 260, 170, 0.045, 3.0), 0.5);
      addTo(o, mulEnv(noise(n), env(n, 0.0003, 0.004, 4)), 0.07);
      return o;
    }
    // ---- THE ILLUSTRATED INTRO (illustrate.mjs) -----------------------------------
    case "thock": {
      // an arrow landing in a board: a woody knock with a short buzz of the shaft
      const n = (0.26 * SR) | 0;
      const o = chirp(n, 900, 380, 0.022, 3.6);
      addTo(o, chirp(n, 330, 190, 0.07, 3.0), 0.8);
      addTo(o, mulEnv(noise(n), env(n, 0.0003, 0.006, 4)), 0.14);
      // the shaft vibrating: a 28 Hz tremolo on a thin tone, dying in 200 ms
      const sh = chirp(n, 640, 600, 0.16, 2.4);
      for (let i = 0; i < n; i++) { const t = i / SR; o[i] += sh[i] * 0.22 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 28 * t)); }
      return o;
    }
    case "stamp": {
      // a rubber stamp pressed on paper: a flat thud, a little squash, paper
      const n = (0.24 * SR) | 0;
      const o = chirp(n, 240, 120, 0.06, 2.8);
      addTo(o, chirp(n, 520, 300, 0.03, 3.2), 0.4);
      addTo(o, mulEnv(svfBandpass(noise(n), () => 1600, 1.3), env(n, 0.001, 0.03, 3)), 0.28);
      return o;
    }
    case "rocket": {
      // a doodled rocket taking off: a whoosh that RISES, with a sputter under it
      const n = (0.7 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 300 * Math.pow(3800 / 300, Math.min(1, t / 0.6)), 2.0);
      const e = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / n; e[i] = Math.pow(Math.sin(u * Math.PI), 1.1) * (u < 0.92 ? 1 : (1 - u) / 0.08); }
      const o = mulEnv(swept, e);
      const sput = svfBandpass(noise(n), () => 140, 1.2);
      for (let i = 0; i < n; i++) { const t = i / SR; o[i] += sput[i] * e[i] * 0.5 * (0.5 + 0.5 * Math.abs(Math.sin(2 * Math.PI * 41 * t))) * (1 - i / n); }
      return highpass(o, 120);
    }
    case "bubble": {
      // a message sent: a soft two-note rise, rounded
      const n = (0.20 * SR) | 0;
      const o = chirp(n, 620, 620, 0.05, 2.6);
      const b = chirp(n, 930, 930, 0.07, 2.6);
      for (let i = 0; i < n; i++) { const j = i - ((0.06 * SR) | 0); if (j >= 0) o[i] += b[j] * 0.8; }
      for (let i = 0; i < 80 && i < n; i++) o[i] *= i / 80;
      return o;
    }
    case "seen": {
      // the two read ticks: two tiny high blips, 70 ms apart
      const n = (0.16 * SR) | 0;
      const o = chirp(n, 2100, 2100, 0.018, 3.6);
      const b = chirp(n, 2500, 2500, 0.018, 3.6);
      for (let i = 0; i < n; i++) { const j = i - ((0.07 * SR) | 0); if (j >= 0) o[i] += b[j]; }
      return o;
    }
    case "pageflip": {
      // a page flicked over: a fast brushed noise with a flap at the end
      const n = (0.22 * SR) | 0;
      const swept = svfBandpass(noise(n), t => 1200 * Math.pow(3400 / 1200, Math.min(1, t / 0.16)), 1.2);
      const o = mulEnv(swept, env(n, 0.03, 0.09, 2.4));
      const flap = mulEnv(svfBandpass(noise(n), () => 1000, 1.5), env(n, 0.001, 0.02, 3.2));
      for (let i = 0; i < n; i++) { const j = i - ((0.15 * SR) | 0); if (j >= 0) o[i] += flap[j] * 0.6; }
      return highpass(o, 300);
    }
    case "clock": {
      // one tick of a wall clock: a dry mechanical click with a hint of body
      const n = (0.08 * SR) | 0;
      const o = chirp(n, 2600, 1900, 0.006, 4);
      addTo(o, chirp(n, 700, 520, 0.02, 3.4), 0.5);
      addTo(o, mulEnv(noise(n), env(n, 0.0002, 0.003, 4)), 0.12);
      return o;
    }
    case "uipop": {
      // a window opening: a rounded pop with a short upward glide, no low end
      const n = (0.16 * SR) | 0;
      const o = chirp(n, 520, 880, 0.045, 2.8);
      addTo(o, chirp(n, 1400, 1700, 0.02, 3.4), 0.25);
      for (let i = 0; i < 60 && i < n; i++) o[i] *= i / 60;
      return o;
    }
    case "spark": {
      // the pen head's glow arriving at the top of the chart: a short bright shimmer
      const n = (0.5 * SR) | 0;
      const o = new Float32Array(n);
      for (const f of [1568, 2349, 3136, 3951]) addTo(o, mulEnv(chirp(n, f, f * 1.003, 0.18, 2.2), env(n, 0.004, 0.22, 2)), 0.22);
      addTo(o, mulEnv(svfBandpass(noise(n), t => 5000 + 3000 * t, 3), env(n, 0.01, 0.12, 2.5)), 0.12);
      return o;
    }
    case "flash_in": {
      // a hard cut TO light: a bright airy burst with a short bloom behind it —
      // what carries a full-frame cutaway in the reference edit (neon.mjs)
      const n = (0.42 * SR) | 0;
      const o = new Float32Array(n);
      addTo(o, mulEnv(svfBandpass(noise(n), t => 2600 + 9000 * Math.min(1, t / 0.05), 1.5), env(n, 0.003, 0.16, 3.2)), 0.30);
      addTo(o, mulEnv(chirp(n, 260, 90, 0.22, 1.6), env(n, 0.004, 0.20, 2.6)), 0.16);
      addTo(o, mulEnv(svfBandpass(noise(n), () => 700, 1.1), env(n, 0.02, 0.34, 1.8)), 0.07);
      return highpass(o, 120);
    }
    default:
      if (/^(pencil|marker|scribble|eraser|graphite|fineliner|crayon|chalk):/.test(kind)) {
        // THE PEN ON PAPER, for exactly as long as the line is being drawn:
        //   pencil:<dur>[:w]  graphite — bright, dry, grainy; `:w` = writing (the pen
        //                     lifts between glyphs, so the scratch has micro-gaps)
        //   marker:<dur>      felt tip — lower, wetter, a squeak riding the stroke
        //   scribble:<dur>    hatching — the pencil going back and forth fast
        //   eraser:<dur>      a dull rub
        // The loudness follows a slow random drift (pressure), the texture is noise
        // with a resonance that wanders — a fixed filter reads as a synth, not a pen.
        const [what, durS, mode] = kind.split(":");
        const dur = Math.max(0.05, parseFloat(durS) || 0.3);
        const n = ((dur + 0.06) * SR) | 0;
        const isMarker = what === "marker", isScribble = what === "scribble", isEraser = what === "eraser";
        // the OTHER pens — so twelve notes in a row are not twelve identical scratches:
        //   graphite  a softer, lower pencil (a 2B, pressed less)
        //   fineliner thin and high, smooth — almost no grain
        //   crayon    waxy, low, heavy grain
        //   chalk     dry and wide, dusty bursts
        const PEN = { pencil: [2600, 2400, 1.4], graphite: [1700, 1500, 1.2], fineliner: [3800, 2000, 2.6], crayon: [900, 900, 0.9],
          chalk: [2200, 3000, 0.8], marker: [1500, 1100, 3.6], eraser: [700, 500, 1.0], scribble: [2600, 2400, 1.4] }[what] || [2600, 2400, 1.4];
        const [f0, fw, q] = PEN;
        const grainAmt = what === "fineliner" ? 0.15 : what === "crayon" ? 0.7 : what === "chalk" ? 0.6 : 0.45;
        let wander = 0;
        const body = svfBandpass(noise(n), t => { wander = wander * 0.9995 + (rnd()) * 0.0009; const w = Math.sin(t * 7.3 + wander * 40) * 0.5 + Math.sin(t * 19.1) * 0.3 + wander * 6; return f0 + fw * (0.5 + 0.5 * w); }, q);
        const o = new Float32Array(n);
        // the texture: fast random amplitude (paper grain under the tip)
        let g = 0.6;
        for (let i = 0; i < n; i++) { if ((i & 63) === 0) g = (1 - grainAmt) + grainAmt * Math.abs(rnd()); o[i] = body[i] * g; }
        if (what === "chalk") { for (let i = 0; i < n; i++) { if ((i & 1023) === 0) g = 0.5 + 0.5 * Math.abs(rnd()); o[i] *= g; } }
        // the pressure: a slow drift, and the pen lifting between glyphs when writing
        const drift = new Float32Array(n); let d = 0.8;
        for (let i = 0; i < n; i++) { if ((i & 2047) === 0) d = 0.65 + 0.35 * Math.abs(rnd()); drift[i] = d; }
        const e = new Float32Array(n);
        const atk = isMarker ? 0.012 : 0.02, rel = 0.05;
        for (let i = 0; i < n; i++) { const t = i / SR; e[i] = Math.min(1, t / atk) * Math.min(1, Math.max(0, (dur - t) / rel + 0)) ; if (t > dur) e[i] = 0; }
        if (mode === "w") {
          // glyph-sized bursts: ~60 ms on, ~15 ms off, jittered
          let t = 0; const gaps = [];
          while (t < dur) { const on = 0.045 + rnd() * 0.02 + 0.02, off = 0.012 + Math.abs(rnd()) * 0.012; gaps.push([t + on, t + on + off]); t += on + off; }
          for (const [a, b] of gaps) for (let i = (a * SR) | 0; i < (b * SR) | 0 && i < n; i++) e[i] *= 0.12;
        }
        if (isScribble) { for (let i = 0; i < n; i++) { const t = i / SR; e[i] *= 0.35 + 0.65 * Math.abs(Math.sin(2 * Math.PI * 9 * t)); } }
        for (let i = 0; i < n; i++) o[i] *= e[i] * drift[i];
        if (isMarker) {
          // the squeak: a thin resonance that comes and goes
          const sq = svfBandpass(noise(n), t => 3200 + 900 * Math.sin(t * 11), 12);
          for (let i = 0; i < n; i++) o[i] += sq[i] * e[i] * drift[i] * 0.35 * (0.5 + 0.5 * Math.sin(i / SR * 5.1));
          // and the felt's low rub
          const rub = svfBandpass(noise(n), () => 420, 1.2);
          for (let i = 0; i < n; i++) o[i] += rub[i] * e[i] * 0.4;
        } else if (!isEraser) {
          // graphite's faint desk resonance (more of it under a soft 2B and a crayon)
          const dk = what === "graphite" ? 0.28 : what === "crayon" ? 0.34 : what === "fineliner" ? 0.06 : 0.16;
          const desk = svfBandpass(noise(n), () => (what === "crayon" ? 160 : 210), 2.0);
          for (let i = 0; i < n; i++) o[i] += desk[i] * e[i] * dk;
        }
        return highpass(o, isEraser ? 250 : what === "crayon" ? 300 : 500);
      }
      // ── THE STOP-MOTION PAPER (2026-09-29) — the brief was different sounds from the
      //    earlier pass, and satisfying ones. The reviewer had just refused the tap per logo, the
      //    sticker thock, the marker pens and the metallic hit; these three share nothing
      //    with them: rounded, tactile, short, nothing harsh above 6 kHz, and PITCHED where
      //    a pitch can be in tune with the bed. hand.mjs emits them on the poses themselves.
      if (kind.startsWith("mallet:")) {
        // a sticker LANDING: a muted marimba bar — the fundamental settling 3 % in its
        // first 6 ms, the bar's own 4th partial dying three times faster, a 1.5 ms mallet
        // click, a small room. mallet:<Hz>: the stickers of one gesture climb a chord.
        const f = parseFloat(kind.slice(7)), n = (0.46 * SR) | 0;
        const o = new Float32Array(n); let p1 = 0, p4 = 0;
        for (let i = 0; i < n; i++) {
          const t = i / SR, fi = f * (1 + 0.03 * Math.exp(-t / 0.006));
          p1 += (2 * Math.PI * fi) / SR; p4 += (2 * Math.PI * fi * 3.98) / SR;
          o[i] = Math.min(1, t / 0.0015) * (Math.sin(p1) * Math.exp(-t / 0.085) + 0.30 * Math.sin(p4) * Math.exp(-t / 0.028));
        }
        addTo(o, chirp(n, f * 0.53, f * 0.5, 0.05, 3), 0.20);                            // warmth an octave down
        addTo(o, mulEnv(svfBandpass(noise(n), () => 3200, 1.4), env(n, 0.0003, 0.0025, 4)), 0.22);  // the mallet
        return room(o, 0.35, 0.12);
      }
      if (kind.startsWith("ptick:")) {
        // one POSE of a stop-motion settle: a paper cut-out nudged on the table by a
        // fingertip — a 10 ms breath of card over a tiny knock. Four variants a few per
        // cent apart (ptick:0…3), so a run of poses never repeats one sample.
        const k = (+kind.slice(6) || 0) % 4, n = (0.09 * SR) | 0;
        const o = mulEnv(svfBandpass(noise(n), () => [2300, 2550, 2150, 2750][k], 1.6), env(n, 0.0006, 0.010, 3.5));
        addTo(o, chirp(n, 520 + 30 * k, 380 + 20 * k, 0.018, 3.2), 0.35);
        return highpass(o, 180);
      }
      if (kind.startsWith("felt:")) {
        // a FELT TIP gliding for one chunk of a stop-motion mark — the soft side of a
        // marker, not the scratch the old pens made: band-passed noise around 1.5 kHz, a
        // faint resonant squeak drifting 2.4 → 2.7 kHz on top, a slow 23 Hz shimmer for
        // the fibre, 12 ms in, 40 ms out, then TWO one-pole low-passes at 2.6 kHz — a lone
        // band-pass leaves white noise its whole top octave, and the first version measured
        // BRIGHTER than the old marker (centroid 3.9 kHz, 7.6 % above 6 kHz).
        // felt:<seconds>, as long as the mark takes to draw. The felt tip below is the level's
        // reference only.
        const d = parseFloat(kind.slice(5)), n = ((d + 0.05) * SR) | 0;
        const body = svfBandpass(noise(n), () => 1500, 1.1);
        const squeak = svfBandpass(noise(n), t => 2400 + 300 * Math.min(1, t / d), 9.0);
        let o = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const t = i / SR;
          const e = Math.min(1, t / 0.012) * Math.min(1, Math.max(0, (d + 0.03 - t) / 0.04)) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 23 * t));
          o[i] = (body[i] + 0.35 * squeak[i]) * e;
        }
        const a = 1 - Math.exp(-2 * Math.PI * 2600 / SR);
        for (let pass = 0; pass < 2; pass++) { let y = 0; for (let i = 0; i < n; i++) { y += a * (o[i] - y); o[i] = y; } }
        const felt = highpass(o, 350);
        // what is heard is a SOFT BRUSH swish, the one the reviewer chose over the felt tip and the
        // pencil: band-passed air rising 900 → 1600 Hz and falling back with the stroke, a sine^1.5
        // envelope over the whole mark, two low-passes at 2 kHz (no grain, nothing bright), at the
        // felt tip's RMS minus 7 dB ("good, just a bit loud" at the felt's level; −7 dB kept)
        const b = svfBandpass(noise(n), t => 900 + 700 * Math.sin(Math.PI * Math.min(1, t / d)), 0.8);
        for (let i = 0; i < n; i++) { const t = i / SR; b[i] *= Math.pow(Math.sin(Math.PI * Math.min(1, t / (d + 0.03))), 1.5); }
        const lp = 1 - Math.exp(-2 * Math.PI * 2000 / SR);
        for (let pass = 0; pass < 2; pass++) { let y = 0; for (let i = 0; i < n; i++) { y += lp * (b[i] - y); b[i] = y; } }
        const brush = highpass(b, 200), rms = x => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length));
        const k = rms(brush) > 0 ? (rms(felt) / rms(brush)) * Math.pow(10, -7 / 20) : 0;
        for (let i = 0; i < n; i++) brush[i] *= k;
        return brush;
      }
      if (kind.startsWith("scroll:")) {
        // A LIST SCROLLED FAST — the sound OF the picture, not a guess about it.
        // The profile file sits next to the clip and carries `dy`, the vertical
        // displacement MEASURED between consecutive frames of that clip, and
        // `rowPx`, the row pitch. One click per row crossing the edge, so the
        // riffle's density IS the scroll speed and the two cannot drift: at a
        // median 54 px/frame that is 28 rows a second, at a peak 78 — dense
        // enough to read as "there are thousands of them", which is the whole
        // reason the shot exists.
        const prof = JSON.parse(fs.readFileSync(path.resolve(CWD, kind.slice(7)), "utf8"));
        const fps = prof.fps || 30, dy = prof.dy || [], rowPx = prof.rowPx || 58;
        const n = ((dy.length / fps + 0.25) * SR) | 0;
        const spd = i => {                                  // px per second at sample i
          const f = Math.min(dy.length - 1, Math.max(0, (i / SR) * fps));
          const j = Math.floor(f), a = dy[j] ?? 0, b = dy[Math.min(dy.length - 1, j + 1)] ?? 0;
          return (a + (b - a) * (f - j)) * fps;
        };
        const vmax = Math.max(1, ...dy) * fps;
        // four variants, so a 30 Hz stream of them is a riffle and not a buzzer
        const clicks = [[5200, 3100], [4300, 2600], [6100, 3600], [3600, 2200]].map(([f0, f1]) => {
          const m = (0.007 * SR) | 0;
          const o = mulEnv(noise(m), env(m, 0.0002, 0.0018, 4));
          addTo(o, chirp(m, f0, f1, 0.0016, 3.6), 0.45);
          return highpass(o, 1400);
        });
        const out = new Float32Array(n);
        let acc = 0, k = 0;
        for (let i = 0; i < n; i++) {
          acc += spd(i) / SR;
          if (acc >= rowPx) {
            acc -= rowPx;
            const c = clicks[k++ % clicks.length], g = 0.55 + 0.45 * Math.abs(rnd());
            for (let j = 0; j < c.length && i + j < n; j++) out[i + j] += c[j] * g;
          }
        }
        // the travel under the clicks: band-passed noise whose level and centre
        // follow the speed. Clicks alone read as a mechanism; this reads as motion.
        const bed = svfBandpass(noise(n), t => 900 + 2600 * Math.min(1, spd((t * SR) | 0) / vmax), 1.5);
        for (let i = 0; i < n; i++) out[i] += bed[i] * 0.22 * Math.pow(Math.min(1, spd(i) / vmax), 0.7);
        const fi = (0.12 * SR) | 0, fo = (0.30 * SR) | 0;
        for (let i = 0; i < n; i++) {
          if (i < fi) out[i] *= i / fi;
          if (i > n - fo) out[i] *= (n - i) / fo;
        }
        return highpass(out, 700);
      }
      if (kind.startsWith("sample:")) {
        // sample:name.wav[:startS:lenS] — a slice of a supplied file, faded out
        const parts = kind.slice(7).split(":");
        const w = loadWav(parts[0]);
        if (parts.length < 3) return w;
        const a = Math.round(parseFloat(parts[1]) * SR), n = Math.round(parseFloat(parts[2]) * SR);
        const fade = Math.min(Math.round(0.18 * SR), n >> 1);
        // A slice out of the MIDDLE of a sound starts on a non-zero sample, and
        // that step is a click — on a riser cut at half-build it is the loudest
        // thing in the cue. 40 ms is inaudible as a fade and removes it.
        const rise = a > 0 ? Math.min(Math.round(0.04 * SR), n >> 2) : 0;
        const cut = (src) => { const o = new Float32Array(n);
          for (let i = 0; i < n; i++) { const j = a + i; o[i] = j < src.length ? src[j] : 0;
            if (i < rise) o[i] *= i / rise;
            if (i > n - fade) o[i] *= (n - i) / fade; } return o; };
        if (w.L) return { L: cut(w.L), R: cut(w.R), length: n };
        return cut(w);
      }
      throw new Error(`unknown effect: ${kind}`);
  }
}

// --- render the bed ----------------------------------------------------------
// Two channels: every synthesised effect is mono and lands in both; a stereo
// sample (a music bed) keeps its width.
if (MAIN) {
const P = JSON.parse(fs.readFileSync(path.resolve(CWD, "project.json"), "utf8"));
const { sfxCues } = await import(pathToFileURL(path.resolve(CWD, "edl.mjs")).href);
const DUR = P.duration + 1.0;                  // a tail so a late cue is not clipped
const MASTER_DB = P.sfxMasterDb ?? -13;
const N = (DUR * SR) | 0;
const bedL = new Float32Array(N), bedR = new Float32Array(N);
const cache = new Map();
const cues = sfxCues();
const manifest = [];
for (const c of cues) {
  if (!cache.has(c.kind)) cache.set(c.kind, make(c.kind));
  const s = cache.get(c.kind);
  const sl = s.L || s, sr = s.R || s;
  const g = Math.pow(10, (c.gain + MASTER_DB) / 20);
  // `align` = where the TRANSIENT sits inside the file, in seconds. A supplied
  // library sound is not a synthesised one: an impact may peak 0.30 s in, a
  // transition 1.00 s in, and a riser only ENDS on its peak, seconds later.
  // Without this every one of them lands late by its own pre-roll.
  const off = Math.round((c.t - (c.align ?? 0)) * SR);
  let pk = 0;
  for (let i = 0; i < s.length; i++) {
    const j = off + i;
    if (j >= 0 && j < N) {
      const vl = sl[i] * g, vr = sr[i] * g;
      bedL[j] += vl; bedR[j] += vr;
      const a = Math.max(Math.abs(vl), Math.abs(vr)); if (a > pk) pk = a;
    }
  }
  // What was actually rendered, cue by cue. verify.mjs reads this instead of
  // guessing from silence detection: a slow-attack sound like `riser` is
  // genuinely below -60 dB for its first 200 ms, and a fixed probe window
  // reports it missing when it is perfectly present.
  manifest.push({ t: c.t, kind: c.kind, gain: c.gain, align: c.align ?? 0,
    dur: +(s.length / SR).toFixed(3), peak: +pk.toFixed(6) });
}
fs.writeFileSync(path.resolve(CWD, "sfx.json"), JSON.stringify(manifest));

// soft clip so a stacked cue can never crack
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(bedL[i]), Math.abs(bedR[i]));
for (let i = 0; i < N; i++) { bedL[i] = Math.tanh(bedL[i] * 1.05); bedR[i] = Math.tanh(bedR[i] * 1.05); }

// --- WAV (16-bit stereo) -----------------------------------------------------
const bytes = N * CH * 2;
const buf = Buffer.alloc(44 + bytes);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + bytes, 4); buf.write("WAVE", 8);
buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(CH, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * CH * 2, 28);
buf.writeUInt16LE(CH * 2, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(bytes, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE((Math.max(-1, Math.min(1, bedL[i])) * 32767) | 0, 44 + i * 4);
  buf.writeInt16LE((Math.max(-1, Math.min(1, bedR[i])) * 32767) | 0, 44 + i * 4 + 2);
}
fs.writeFileSync(path.resolve(CWD, "sfx.wav"), buf);
console.log(`sfx.wav + sfx.json — ${cues.length} cues, ${cache.size} distinct sounds, raw peak ${peak.toFixed(3)}`);
const late = cues.filter(c => c.t > P.duration);
if (late.length) console.error(`  ⚠ ${late.length} cue(s) after the end of the video (${P.duration}s): ${late.map(c => c.t).join(", ")}`);
}
