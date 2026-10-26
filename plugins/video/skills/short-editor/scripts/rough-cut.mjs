#!/usr/bin/env node
// The assembly pass: a long, restart-heavy rush -> one continuous good take.
//
//   node rough-cut.mjs [--adopt] [--dry-run] [--out rough.mov]
//                      [--crf 20] [--preset fast] [--tonemap]
//
// Run from the working directory. Reads `cut.mjs` (the keep list, written by
// hand after reading the transcript) and `project.json`, and renders the kept
// segments into one file.
//
// WHY IT IS A SEPARATE PASS. The rest of this skill assumes the source is
// already the take you want: every cue in edl.mjs is a word onset in
// words.json, so a cut made after the fact would shift every graphic. So the
// assembly happens FIRST, produces a real file, and the pipeline restarts from
// it with a fresh transcript. `--adopt` does that rotation:
//
//   project.json  source -> rough.mov, rawSource/rawDuration -> the original
//   words.json    -> words.raw.json    (the rush's transcript; NEVER clobbered)
//   voice.wav     removed              (it belongs to the old source)
//
// WHAT IT REFUSES TO DO. It does not pick the takes. Choosing which attempt at
// a sentence is the good one is a judgment call on meaning and delivery, and it
// is made by reading the transcript, not by a silence threshold. A VAD-driven
// "remove the gaps" pass keeps all five attempts at the same sentence and
// deletes the breath before the good one.
//
// COLOUR IS NOT TOUCHED. The pixels and the colour tags of the rush go through
// unchanged, and the output keeps the source's bit depth and codec family.
// Tone mapping is a grading decision, not a technical fix, and it belongs to
// the person whose video it is: `--tonemap` exists, and it is opt-in.
// (A first pass once shipped an HLG -> BT.709 conversion nobody asked for; the
// user's colours are theirs.)
//
// The cut list format, in cut.mjs:
//
//   export const KEEP = [
//     { from: 12.402, to: 19.780, note: "hook, 3rd attempt" },   // word ONSETS
//     { fromExact: 520.92, toExact: 521.66, note: "measured" },  // pinned
//   ];
//   export const OPTS = { headPad: 0.12, tailPad: 0.20, audioFade: 0.015 };

import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const flag = (k) => process.argv.includes(`--${k}`);

if (!existsSync("project.json")) {
  console.error("project.json not found; run from the work directory");
  process.exit(1);
}
if (!existsSync("cut.mjs")) {
  console.error("cut.mjs not found; write the list of segments to keep first");
  process.exit(1);
}

const P = JSON.parse(readFileSync("project.json", "utf8"));
const { KEEP, OPTS = {} } = await import(pathToFileURL(process.cwd() + "/cut.mjs").href);

// Iterating on a cut is the normal case, not the exception: you read the
// transcript of the assembly, find a leftover word at a join, and re-cut. So
// the input is ALWAYS the rush -- `rawSource` once `--adopt` has run -- and the
// reference transcript is always the rush's. Cutting the previous assembly
// again would apply rush timecodes to a 158 s file and produce nonsense.
const SRC = P.rawSource || P.source;
const SRC_DUR = P.rawSource ? P.rawDuration || 0 : P.duration;
const FPS = P.fps || 60;
const OUT = arg("out", "rough.mov");
const CRF = arg("crf", "20");
const PRESET = arg("preset", "fast");
const TONEMAP = flag("tonemap");
const O = {
  // Generous by design. The first pass ran headPad 0.06 / tailPad 0.10 and
  // clipped the last syllable of 23 of 40 segments -- 10.2 s of speech, 256 ms
  // a segment. A phrase needs to land; the pause after it is where the cut
  // belongs, not the decay of its final consonant.
  headPad: 0.12,
  tailPad: 0.20,
  audioFade: 0.015,
  ...OPTS,
};

// --- the reference transcript ------------------------------------------------
const RAWWORDS = existsSync("words.raw.json") ? "words.raw.json"
  : existsSync("words.json") ? "words.json" : null;
const RAW = RAWWORDS ? JSON.parse(readFileSync(RAWWORDS, "utf8")) : null;
// A transcript of the wrong file resolves nothing and says nothing. If it does
// not reach the end of the rush, it is not the rush's.
if (RAW && SRC_DUR && RAW.length && RAW[RAW.length - 1].e < SRC_DUR * 0.5) {
  console.error(
    `${RAWWORDS} only covers ${RAW[RAW.length - 1].e.toFixed(0)}s of a ` +
    `${SRC_DUR.toFixed(0)}s rush; it is not the rush's transcript.\n` +
    `Transcribe it again: transcribe.sh --source "${SRC}" --out words.raw.json`,
  );
  process.exit(1);
}

// --- where the speech actually stops, measured -------------------------------
// This is the part that has to be right, and the only way to get it right is to
// look at the signal.
//
// `silencedetect` cannot answer the question: it reports `silence_start` at the
// moment the level CROSSES the threshold, which is well before the sound stops
// -- a final fricative or a vowel decay sits under -35 dB and is still plainly
// audible. whisper's word `e` is early too, and it doubles as the onset of the
// next word. Taking the smaller of two already-early bounds and adding 100 ms
// is what cut 23 phrases mid-syllable.
//
// So: decode the rush once, build a 10 ms RMS envelope, and find the end of
// speech by walking forward until the signal stays near the noise floor for
// 140 ms. The floor is measured from the envelope itself, not assumed.
const HOP = 0.010;
const HOLD = 0.120; // silence has to last this long to count as the end

const env = (() => {
  if (existsSync("envelope.bin") && existsSync("envelope.json")) {
    const meta = JSON.parse(readFileSync("envelope.json", "utf8"));
    if (meta.source === SRC && meta.hop === HOP) {
      const buf = readFileSync("envelope.bin");
      return {
        db: new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4),
        room: meta.room, floor: meta.floor,
      };
    }
  }
  const SR = 16000;
  const r = spawnSync("ffmpeg", [
    "-v", "error", "-i", SRC, "-map", "0:a", "-ac", "1", "-ar", String(SR),
    "-f", "s16le", "-",
  ], { maxBuffer: 1 << 30 });
  if (r.status !== 0) { console.error("audio decode failed"); process.exit(1); }
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 2);
  const W = Math.round(SR * HOP);
  const n = Math.floor(pcm.length / W);
  const db = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * W; j < (i + 1) * W; j++) s += pcm[j] * pcm[j];
    db[i] = 10 * Math.log10(s / W / (32768 * 32768) + 1e-20);
  }
  // The ROOM TONE, not the floor. The 5th percentile is the quietest the room
  // ever gets (-69.5 dBFS here); the room actually sits around its MEDIAN
  // (-63.6), with excursions to -57. A threshold set from the 5th percentile
  // lands BELOW the room itself, so "120 ms of silence" is never found, the
  // search runs to its limit, and a segment grows from 4 s to 31 s. On a
  // restart-heavy rush more than half the timeline is silence, which is exactly
  // what makes the median the room.
  const sorted = Float32Array.from(db).sort();
  const room = sorted[Math.floor(n * 0.5)];
  const floor = sorted[Math.floor(n * 0.05)];
  writeFileSync("envelope.bin", Buffer.from(db.buffer));
  writeFileSync("envelope.json", JSON.stringify({ source: SRC, hop: HOP, room, floor, frames: n }));
  return { db, room, floor };
})();

// 9 dB over the room tone: above its excursions (-57 here), well under the
// decay of a word (-45 and still ringing).
const QUIET = env.room + 9;
if (env.room > -45)
  console.log(`  ⚠ high background noise (${env.room.toFixed(1)} dBFS); measured bounds are less reliable`);
const idx = (t) => Math.max(0, Math.min(env.db.length - 1, Math.round(t / HOP)));
const loud = (t) => env.db[idx(t)] > QUIET;

// First moment at or after `t` where the signal stays quiet for HOLD.
const speechEndAfter = (t, limit = 2.5) => {
  const hold = Math.round(HOLD / HOP);
  const i0 = idx(t), iMax = Math.min(env.db.length - hold, idx(t + limit));
  for (let i = i0; i <= iMax; i++) {
    let ok = true;
    for (let j = i; j < i + hold; j++) if (env.db[j] > QUIET) { ok = false; break; }
    if (ok) return { t: i * HOP, measured: true };
  }
  return { t: t + limit, measured: false };
};

// Last moment at or before `t` where the signal was quiet for HOLD — i.e. where
// this phrase's attack begins.
const speechStartBefore = (t, limit = 1.5) => {
  const hold = Math.round(HOLD / HOP);
  const i0 = idx(t), iMin = Math.max(hold, idx(t - limit));
  for (let i = i0; i >= iMin; i--) {
    let ok = true;
    for (let j = i - hold; j < i; j++) if (env.db[j] > QUIET) { ok = false; break; }
    if (ok) return { t: i * HOP, measured: true };
  }
  return { t: t - limit, measured: false };
};

// THE RULE, and it took three rounds to get here: **never cut anywhere but in
// measured silence.** Two earlier strategies both cut inside words. Padding by
// a fixed amount clipped 23 of 40 phrases. Cutting at a "boundary" — the
// deepest dip within 100 ms of the transcript's word break, requiring a 10 dB
// drop — clipped 17 of 39, because a 10 dB dip mid-word is ordinary: between
// two syllables, on any stop consonant. There is no threshold that separates
// "gap between words" from "gap inside a word" on an envelope.
//
// So when a phrase runs straight on into a false start, the machine does not
// choose. It extends to the next real pause, keeps the extra words, and REPORTS
// them. Fixing the speech is then a cut-list decision — start the following
// segment after those words, or aim at a different last word — which is a
// judgment about language, not about signal.

// Where the NEXT phrase starts, so the tail padding never reaches into it.
const nextSpeechAfter = (t, limit = 6) => {
  const iMax = Math.min(env.db.length - 1, idx(t + limit));
  for (let i = idx(t); i <= iMax; i++) if (env.db[i] > QUIET) return i * HOP;
  return null;
};

// --- the breath map ----------------------------------------------------------
// THE UNIT OF EDITING IS THE BREATH, NOT THE SENTENCE. This is the lesson that
// took three rejected cuts to learn. A speaker talks with 150-300 ms micro-pauses
// INSIDE sentences and none at all between some of them, so "one segment per
// sentence" forces cuts into the middle of words. A breath group — a run of
// speech between two real pauses — is the smallest thing that can be cut on
// both sides without touching the voice.
//
// Edges use HYSTERESIS, two thresholds. Confirm speech at room+9 dB, then walk
// outward to room+3 to find where the sound actually starts and stops. One
// threshold cannot do both: at room+9 the soft attack of "This", "Okay",
// "We're", "But" is already below it, and every group started after the first
// word — clipping the start of every sentence.
const HI = env.room + 9, LO = env.room + 3;
const breaths = (() => {
  const n = env.db.length, out = [];
  let i = 0;
  while (i < n) {
    if (env.db[i] <= HI) { i++; continue; }
    let a = i; while (a > 0 && env.db[a - 1] > LO) a--;
    let j = i; while (j < n && env.db[j] > LO) j++;
    out.push([a * HOP, j * HOP]);
    i = j;
  }
  // Gaps under 250 ms are inside one breath, not between two.
  const m = [];
  for (const [a, b] of out) {
    if (m.length && a - m[m.length - 1][1] < 0.25) m[m.length - 1][1] = b;
    else m.push([a, b]);
  }
  return m.filter(([a, b]) => b - a >= 0.30);
})();

if (flag("bursts")) {
  console.log(`${breaths.length} breaths · hysteresis ${HI.toFixed(1)}/${LO.toFixed(1)} dBFS · room tone ${env.room.toFixed(1)}\n`);
  for (const [a, b] of breaths) {
    const ws = RAW ? RAW.filter((w) => w.s >= a - 0.05 && w.s < b + 0.05).map((w) => w.w) : [];
    if (!ws.length) continue;
    console.log(`{ fromExact: ${a.toFixed(2)}, toExact: ${(b + 0.20).toFixed(2)}, note: "${ws.join(" ").replace(/"/g, "")}" },`);
  }
  process.exit(0);
}

// --- normalise the keep list -------------------------------------------------
// FLOOR, not round. Rounding a cut point up by half a frame is enough to cross
// the onset of the word you are removing.
const snap = (t) => Math.floor(t * FPS + 1e-6) / FPS;
const lo = (s) => s.fromExact ?? s.from;
const hi = (s) => s.toExact ?? s.to;

let segs = KEEP.filter((s) => s && hi(s) > lo(s)).map((s, i) => {
  const headPad = s.headPad ?? O.headPad;
  const tailPad = s.tailPad ?? O.tailPad;

  // The two sides resolve INDEPENDENTLY, so a segment whose start the
  // transcript gets wrong can still have its end measured. Pinning both was a
  // false economy: it froze several ends at the tight values the old, clipping
  // logic had produced.
  let from, to, howFrom, howTo, contiguous = false, extraOut = [];

  // Two situations, and they want opposite treatment. Padding a boundary that
  // sits in a pause is breath. Padding one that sits in continuous speech is
  // just importing the false start next door: 0.37 s of head room brought back
  // "where and that's where", "on your go to market on your", "exactly that's
  // exactly". So measure which case it is, and only pad in the first.
  const wordBefore = RAW ? [...RAW].reverse().find((w) => w.s < s.from - 0.05) : null;
  const wordAfter = RAW ? RAW.find((w) => w.s > s.to + 0.05) : null;

  // --- in: always in silence, whatever it costs in extra words
  let extraIn = [];
  if (s.fromExact != null) {
    from = s.fromExact;
    howFrom = "pinned";
  } else {
    const st = speechStartBefore(s.from, 3.5);
    from = st.t - Math.max(headPad, 0.15);
    howFrom = st.measured ? "measured" : "cap";
    extraIn = RAW ? RAW.filter((w) => w.s >= from && w.s < s.from - 0.05) : [];
    if (extraIn.length) howFrom = "extended";
  }

  // --- out
  if (s.toExact != null) {
    to = s.toExact;
    howTo = "pinned";
    contiguous = loud(to - 0.02);
  } else {
    const en = speechEndAfter(s.to, 3.5);
    const nx = nextSpeechAfter(en.t + HOLD);
    to = en.t + tailPad;
    if (nx != null) to = Math.min(to, nx - 0.06);
    to = Math.max(to, en.t + 0.06);
    howTo = en.measured ? "measured" : "cap";
    extraOut = RAW ? RAW.filter((w) => w.s > s.to + 0.05 && w.s < to) : [];
    if (extraOut.length) howTo = "extended";
  }

  // Runaway guards. A measurement that wants 20 s of tail is a broken
  // measurement, not a long pause — and it silently merged the hook into the
  // next paragraph once. Clamp, and say so.
  const FROM_MIN = lo(s) - 3.50, TO_MAX = hi(s) + 3.50;
  let clamped = "";
  if (s.fromExact == null && from < FROM_MIN) { from = FROM_MIN; clamped += "E"; }
  if (s.toExact == null && to > TO_MAX) { to = TO_MAX; clamped += "S"; }

  return {
    i,
    from: snap(Math.max(0, from)),
    to: snap(Math.min(SRC_DUR || 1e9, Math.max(to, from + 0.2))),
    note: s.note || "",
    how: (howFrom === howTo ? howFrom : `${howFrom}/${howTo}`) + (clamped ? `!${clamped}` : ""),
    extra: [...extraIn.map((w) => `<${w.w}`), ...extraOut.map((w) => `${w.w}>`)],
    contiguous,
  };
});
segs.sort((a, b) => a.from - b.from);

// Padding can make two neighbouring keeps overlap. Merging them is right —
// the alternative is playing the same frames twice, which reads as a stutter.
const merged = [];
for (const s of segs) {
  const last = merged[merged.length - 1];
  if (last && s.from <= last.to + 1 / FPS) {
    if (s.to > last.to) last.to = s.to;
    last.note = last.note ? `${last.note} + ${s.note}` : s.note;
  } else merged.push({ ...s });
}
segs = merged;

if (!segs.length) { console.error("no segment to keep"); process.exit(1); }

// --- the map: source time <-> assembly time ---------------------------------
let acc = 0;
for (const s of segs) {
  s.dur = Math.round((s.to - s.from) * FPS) / FPS;
  s.at = Math.round(acc * FPS) / FPS;
  acc = Math.round((acc + s.dur) * FPS) / FPS;
}
const total = acc;
const dropped = (SRC_DUR || total) - total;

console.log(`${segs.length} segments · ${total.toFixed(2)}s kept of ${(SRC_DUR || 0).toFixed(2)}s`);
console.log(`  cut: ${dropped.toFixed(2)}s (${((dropped / (SRC_DUR || 1)) * 100).toFixed(1)}%)`);
const shortest = segs.reduce((a, s) => Math.min(a, s.dur), Infinity);
console.log(`  shortest segment: ${shortest.toFixed(2)}s · longest: ${segs.reduce((a, s) => Math.max(a, s.dur), 0).toFixed(2)}s`);
if (shortest < 0.35) console.log("  ⚠ a segment under 0.35s reads as a glitch, not as a cut");
if (segs.some((x) => /!/.test(x.how))) console.log(`  ⚠ ${segs.filter((x) => /!/.test(x.how)).length} bound(s) clamped by the guard (runaway measurement), marked "!"`);
console.log(`  colour: ${TONEMAP ? "HLG -> BT.709 (--tonemap requested)" : "UNCHANGED (source pixels and tags)"}`);

// The self-check that matters: after resolution, is any cut still landing while
// the speaker is talking? This is the measurement a reviewer makes by ear first.
// HOW NOT TO VERIFY THIS. The first check read the envelope at the single
// 10 ms frame of the cut point. On a cut deliberately placed in a dip that
// frame is quiet BY CONSTRUCTION, so the check reported "1 of 39 clean" while
// the reviewer was hearing clipped words. A measurement taken at the place you
// chose because it is quiet measures nothing.
//
// What matters is the level RELATIVE to the speech around it. So: the loudest
// frame in the last 60 ms before the cut, against the local speech level (the
// 75th percentile over the second before it). Within 12 dB of full speech means
// the cut is inside a word.
const edge = (t) => {
  const a = idx(t - 0.06), b = idx(t);
  let peak = -200;
  for (let i = a; i < b; i++) peak = Math.max(peak, env.db[i]);
  const w = Array.from(env.db.slice(idx(t - 1.0), b)).sort((x, y) => x - y);
  const level = w.length ? w[Math.floor(w.length * 0.75)] : -200;
  return { peak, level, into: level - peak < 12 && peak > QUIET + 8 };
};
const intoSpeech = segs.map((s, k) => ({ k, s, e: edge(s.to) })).filter((x) => x.e.into);
if (intoSpeech.length) {
  console.log(`\n  ⚠ ${intoSpeech.length} cut(s) land inside speech:`);
  for (const { k, s, e } of intoSpeech)
    console.log(`     seg#${k}  end ${s.to.toFixed(2)}  peak ${e.peak.toFixed(1)} dB vs speech ` +
                `${e.level.toFixed(1)} dB  [${s.how}]  ${s.note.slice(0, 42)}`);
} else {
  console.log(`  ✓ all ${segs.length} segments start and end in measured silence`);
}
const withExtra = segs.filter((s) => s.extra && s.extra.length);
if (withExtra.length) {
  console.log(`\n  · ${withExtra.length} segment(s) keep extra words, for lack of a pause to cut in.`);
  console.log(`    Fix the LIST (aim at another word, or start the next segment after them):`);
  for (const s of withExtra)
    console.log(`     seg#${segs.indexOf(s)}  ${s.note.slice(0, 40).padEnd(40)}  + "${s.extra.join(" ")}"`);
}

writeFileSync("rough.map.json", JSON.stringify({
  source: SRC, out: OUT, fps: FPS, sourceDuration: SRC_DUR, duration: total,
  tonemap: TONEMAP,
  segments: segs.map(({ from, to, at, dur, note, how }) => ({ from, to, at, dur, note, how })),
}, null, 2));

// --- remap the rush's word timings onto the assembly -------------------------
if (RAW) {
  const out = [];
  for (const w of RAW) {
    // Membership is decided on the ONSET, never on the midpoint: whisper's `e`
    // runs to the next word's onset, so a kept word followed by a two-second
    // pause has its midpoint outside the segment and silently disappears from
    // the rebuilt transcript.
    const s = segs.find((g) => w.s >= g.from - 0.02 && w.s < g.to);
    if (!s) continue;
    out.push({
      w: w.w,
      s: Math.max(s.at, +(w.s - s.from + s.at).toFixed(3)),
      e: Math.min(s.at + s.dur, +(w.e - s.from + s.at).toFixed(3)),
    });
  }
  writeFileSync("words.rough.json", JSON.stringify(out, null, 0));
  console.log(`\n  words.rough.json — ${out.length} of ${RAW.length} words kept`);
}

if (flag("dry-run")) {
  console.log();
  for (const s of segs)
    console.log(`  ${s.at.toFixed(2)}  <-  ${s.from.toFixed(2)}-${s.to.toFixed(2)} (${s.dur.toFixed(2)}s) [${s.how}]  ${s.note}`);
  process.exit(0);
}

// --- the filter graph --------------------------------------------------------
// One decode of the input, one trim pair per segment, one concat. Frame
// accurate, and any colour work runs AFTER the concat so it only touches the
// frames that survive.
const fc = [];
const fd = O.audioFade;
segs.forEach((s, k) => {
  fc.push(`[0:v]trim=start=${s.from.toFixed(6)}:end=${s.to.toFixed(6)},setpts=PTS-STARTPTS[v${k}];`);
  // Short fades at every join. A hard splice on a voice track clicks, and a
  // click at every cut is the single most audible sign of a machine edit.
  // The fade must cover what SPILLS OVER, never the speaker's own syllable. The
  // first version put a 110 ms fade-out on the last 110 ms of the segment -- i.e.
  // on the end of the word -- which audibly clipped every word end. Now a run-on
  // segment is extended 100 ms PAST the boundary and the fade sits in that
  // overhang: the word plays at full level, the syllable that came along with it
  // fades away.
  const fadeOut = fd, fadeIn = fd; // both bounds sit in silence
  const fade = fd > 0
    ? `,afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${Math.max(0, s.dur - fadeOut).toFixed(6)}:d=${fadeOut}`
    : "";
  fc.push(`[0:a]atrim=start=${s.from.toFixed(6)}:end=${s.to.toFixed(6)},asetpts=PTS-STARTPTS${fade}[a${k}];`);
});
fc.push(segs.map((_, k) => `[v${k}][a${k}]`).join("") + `concat=n=${segs.length}:v=1:a=1[vc][a];`);

// Read the source's colour tags and hand them back verbatim. `setparams` is
// not decoration: the -colorspace/-color_trc output flags are overridden by
// whatever metadata the filter graph carries, so re-tagging has to happen in
// the graph.
// `-of csv=p=0` appends a field separator here, and a trailing comma inside a
// `setparams=` argument breaks the whole filterchain with "Invalid argument".
// `default=nw=1:nk=1` prints the bare value.
const probe = (k) => String(spawnSync("ffprobe", [
  "-v", "error", "-select_streams", "v:0", "-show_entries", `stream=${k}`,
  "-of", "default=nw=1:nk=1", SRC,
]).stdout).trim().replace(/[,\s]+$/, "");
const SRC_TRC = probe("color_transfer") || "unknown";
const SRC_PRI = probe("color_primaries") || "unknown";
const SRC_SPC = probe("color_space") || "unknown";
const SRC_RNG = probe("color_range") || "tv";
const SRC_PIX = probe("pix_fmt") || "yuv420p";
const TEN_BIT = SRC_PIX.includes("10");

let vcodec, vargs;
if (TONEMAP) {
  const lut = arg("lut", "hlg2709.cube");
  if (!existsSync(lut)) {
    const r = spawnSync(process.execPath, [fileURLToPath(new URL("hdr-lut.mjs", import.meta.url)), "--out", lut], { stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
  fc.push(`[vc]format=rgb48le,lut3d=file=${lut}:interp=tetrahedral,format=yuv420p,`
    + `setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv[v]`);
  vcodec = "libx264";
  vargs = ["-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"];
} else {
  // Untouched: same pixel format, same tags, same codec family as the rush.
  // HEVC because that is what the camera shot and what Apple decodes in
  // hardware; H.264 High 10 is software-only on a Mac.
  fc.push(`[vc]format=${TEN_BIT ? "yuv420p10le" : "yuv420p"},`
    + `setparams=color_primaries=${SRC_PRI}:color_trc=${SRC_TRC}:colorspace=${SRC_SPC}:range=${SRC_RNG}[v]`);
  vcodec = "libx265";
  vargs = [
    "-pix_fmt", TEN_BIT ? "yuv420p10le" : "yuv420p",
    "-tag:v", "hvc1",
    "-colorspace", SRC_SPC, "-color_primaries", SRC_PRI, "-color_trc", SRC_TRC,
    "-x265-params", "log-level=error",
  ];
}
writeFileSync(".rough.fc.txt", fc.join("\n"));

const ext = OUT.slice(OUT.lastIndexOf("."));
const TMP = OUT.replace(/\.[^.]+$/, "") + ".part" + ext;
rmSync(TMP, { force: true });

const args = [
  "-hide_banner", "-v", "warning", "-stats", "-y",
  "-i", SRC,
  "-filter_complex_script", ".rough.fc.txt",
  "-map", "[v]", "-map", "[a]",
  "-c:v", vcodec, "-preset", PRESET, "-crf", CRF, "-r", String(FPS),
  ...vargs,
  // The voice stays PCM through the assembly. An intermediate AAC pass puts
  // its noise floor around -30 dBFS, which is exactly where the QC pass looks
  // for quiet effect cues.
  "-c:a", "pcm_s16le", "-ar", "48000",
  "-movflags", "+faststart",
  TMP,
];
console.log(`\nrendering the assembly -> ${OUT} (${vcodec}, ${TEN_BIT ? "10-bit" : "8-bit"}, ${SRC_TRC}/${SRC_PRI}) …`);
const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (r.status !== 0) {
  console.error(`\nffmpeg failed (code ${r.status}); nothing published`);
  rmSync(TMP, { force: true });
  process.exit(r.status ?? 1);
}

// Gate on the exit code AND on the measured duration: a truncated render must
// never replace a good previous assembly.
const got = parseFloat(String(spawnSync("ffprobe", [
  "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", TMP,
]).stdout).trim());
if (!(got > total - 0.5)) {
  console.error(`truncated render (${got}s instead of ${total.toFixed(2)}s); nothing published`);
  rmSync(TMP, { force: true });
  process.exit(1);
}
spawnSync("mv", [TMP, OUT]);
console.log(`\nOK -> ${OUT} (${got.toFixed(2)}s)`);

if (flag("adopt")) {
  P.rawDuration = P.rawDuration || SRC_DUR;
  P.rawSource = P.rawSource || P.source;
  P.source = process.cwd() + "/" + OUT;
  P.duration = Math.round(got * 1000) / 1000;
  writeFileSync("project.json", JSON.stringify(P, null, 2));
  // NEVER overwrite an existing words.raw.json. On a second --adopt, words.json
  // is the transcript of the PREVIOUS assembly, and moving it over the rush's
  // transcript destroys the only timing reference the cut list resolves
  // against. Every unpinned boundary then falls back to a fixed cap and quietly
  // grows by up to a second. It cost two renders to notice.
  if (existsSync("words.json")) {
    if (existsSync("words.raw.json")) rmSync("words.json");
    else spawnSync("mv", ["words.json", "words.raw.json"]);
  }
  rmSync("voice.wav", { force: true });
  console.log("project.json now points at the assembly");
  console.log("next: transcribe.sh (the transcript of the assembled version), then plan.mjs / edl.mjs");
}
