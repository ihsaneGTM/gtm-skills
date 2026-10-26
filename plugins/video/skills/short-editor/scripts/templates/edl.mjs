// THE EDIT — the camera (it lives in plan.mjs, so speaker.mjs can read it) and the sound.
//
// The sound of a vertical short, as settled in review (short-editor/SKILL.md,
// references/audio-spec.md "The vertical short", plugins/video/assets/sfx/README.md):
//   · the music bed — project.json bed / bedDb, about 15 LU under the voice AS HEARD,
//     measured by subtraction (a landscape intro's level was not loud enough here)
//   · a whoosh on a camera move: whoosh_out on the opening de-zoom, swoosh_in on a punch
//   · THE SFX PACK (assets/sfx-top5/, copied by init.sh), one role each, the rules of the
//     video it came with: the FLASH on a hard cut (plan.mjs flash(), picture and sound), the
//     CLICK on what appears (stickers({ land }) in plan.mjs; one add() for anything else), the
//     WHOOSH on a transition into a paper plate, the GLITCH on ONE text pop (the first
//     yellow word of the hook), the RISER ending dead on the payoff word
//   · what the paper emits itself: sheet_in when it lands (under the whoosh), and in
//     stop-motion a click, a ptick or a felt on the poses — one sound per step
//   · THE MOTIONIX PACK (assets/sfx-motionix/, copied by init.sh), the explainer's light sounds,
//     emitted by figures.mjs and paperend.mjs (pro.mjs mx()): a swish as a logo flies out from
//     behind the speaker; never on top of a big one (thin(): dropped within 0.15 s of a whoosh, the
//     flash, the glitch or a riser's end, or 70 ms of another light one)
//   · and NOTHING else: no sound per headline word, no hit after a riser (it dates the
//     edit), none of the old procedural taps, shutter or pens
// Levels are dB relative to the voice, on top of project.json sfxMasterDb; `align` is where
// the transient sits in the file (measured, sfx/README.md) — without it a sound lands late
// by its own pre-roll.
//
// The OLD-RADIO HOOK is a bonus, asked every time (SKILL.md § 0.2): it is not here but in
// project.json — `voiceFx` (the voice, mix.mjs) and `look` (the picture, looks.mjs).
import fs from "node:fs";
import { STEPS, at, BEATS } from "./plan.mjs";
const { thin } = await import("__SCRIPTS__/pro.mjs");

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
export function cameraSteps() { return STEPS; }

export const MAP = { acts: [] };     // the GTM OS map set-piece, when a video shows it
export const MAC = null;              // the macOS product demo, idem
export const SKILLS = null;
export const BLUR_WINDOWS = [];       // no blur band in this language: shade() darkens the top

const cuesOf = beats => beats.flatMap(b => (typeof b.cues === "function" ? b.cues() : []));
const SFX = "sample:sfx-top5/";

export function sfxCues() {
  const c = [];
  const add = (t, kind, gain, align) => c.push({ t: +t.toFixed(3), kind, gain, align });

  // in project.json, not in BED=, or verify.mjs reports the music as a missing cue
  if (P.bed) {
    if (fs.existsSync(`assets/${P.bed}`)) add(0.00, `sample:${P.bed}`, Number(P.bedDb));
    else console.error(`  ⚠ the music ${P.bed} is not in assets/; prepare it (plugins/video/assets/music/README.md)`);
  }
  add(0.00, "whoosh_out", -21);                 // the opening de-zoom
  // add(at(6.98), "swoosh_in", -25);            // a punch
  // add(at(2.16), "uipop", -20);                // a screen appearing

  // the pack — each on the moment its rule names, once per gesture:
  // add(at(1.20), SFX + "glitch.wav", -17, 0.15);   // the first yellow word of the hook
  // add(at(15.62), SFX + "riser.wav", -14, 1.765);  // ENDS on the payoff word: its stop is the accent
  // add(14.87, SFX + "whoosh.wav", -9.5, 0.94);     // a plate's `at` + 0.01: its crest as the sheet covers the frame

  // what the figures emit (the flash, the clicks, the paper): two figures changing pose on
  // the same step make ONE sound, the most telling — a landing, then a felt stroke, then a
  // tick. NO_PAPER=1 renders the same mix without any of them.
  const RANK = k => (k.startsWith("mallet:") || k.endsWith("click.wav") ? 3 : k.startsWith("felt:") ? 2 : k.startsWith("ptick:") ? 1 : 4);
  const whooshes = c.filter(x => x.kind.endsWith("whoosh.wav")).map(x => x.t);
  // the paper's sounds (no role) by the rules below; the light ones (a Motionix role) by thin()
  const all = process.env.NO_PAPER ? [] : cuesOf(BEATS);
  const isPaper = q => !q.role && !/camera-flash/.test(q.kind);
  const beats = all.filter(isPaper).sort((a, b) => a.t - b.t || RANK(b.kind) - RANK(a.kind))
    // a sheet landing under the pack's whoosh keeps its own sound, lower: the paper's flap
    .map(q => (q.kind === "sheet_in" && whooshes.some(t => Math.abs(t - q.t) < 0.1) ? { ...q, gain: -21 } : q));
  // a felt GLIDE (a whole stroke, longer than one pose) is the hand, not a pose: it runs under
  // the poses' sounds, never in competition with them
  const glide = k => k.startsWith("felt:") && parseFloat(k.slice(5)) > 0.15;
  for (const q of beats) {
    if (glide(q.kind)) { c.push(q); continue; }
    const clash = c.find(x => RANK(x.kind) < 4 && !glide(x.kind) && Math.abs(x.t - q.t) < 0.04);
    if (!clash) { c.push(q); continue; }
    if (RANK(q.kind) > RANK(clash.kind)) c.splice(c.indexOf(clash), 1, q);
  }
  // while a pen glides, the paper's little ticks are quiet: the stroke is what you hear
  const glides = c.filter(x => glide(x.kind)).map(x => [x.t - 0.02, x.t + parseFloat(x.kind.slice(5))]);
  for (let i = c.length - 1; i >= 0; i--) if (c[i].kind.startsWith("ptick:") && glides.some(([a, b]) => c[i].t >= a && c[i].t <= b)) c.splice(i, 1);
  const out = thin([...c, ...all.filter(q => !isPaper(q))]).map(({ keep, ...q }) => q);
  // NO_CUES=<regex>: the same mix without the sounds whose name (or role) matches, to measure
  // each one by subtraction (NO_CUES=click, NO_CUES='flash|whoosh.wav', NO_CUES=swish…)
  const drop = process.env.NO_CUES ? new RegExp(process.env.NO_CUES) : null;
  return out.filter(x => x.t >= 0 && x.t < P.duration - 0.05 && !(drop && (drop.test(x.kind) || drop.test(x.role ?? "")))).sort((a, b) => a.t - b.t);
}

// no bottom subtitles: the speaker's words are the headlines at the top (and discreet subtitles
// on a plate). build_subs.mjs is not run, so there is no subs.json to draw.
export const SUB_STYLE = "clean";
