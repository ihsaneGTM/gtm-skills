// THE EDIT — the camera (it lives in plan.mjs, so speaker.mjs can read it) and the sound.
//
// The sound of a cold call, as settled in review (cold-call-editor/SKILL.md § The call
// language; the engine's audio-spec.md and plugins/video/assets/sfx/README.md for the pack):
//   · THE HOOK: the track's own intro, muffled (assets/music-hook.wav: the music is in the
//     next room); the pack's GLITCH on the hook's stressed word; a RISER that ends dead on
//     the word that turns the line
//   · THE RINGING: the pack's WHOOSH carries the sheet in (its crest when the sheet covers
//     the frame), then the RINGBACK TONE (assets/ringback.wav, synthesised: 440 + 480 Hz),
//     no music
//   · BAM: the FLASH (emitted by plan.mjs flash()), the de-zoom's whoosh_out, the BED from
//     its first big hit (assets/music.wav), about 17 LU under the voice AS HEARD
//   · THE CALL: a swoosh_in on each punch, the pack's CLICK when a chip clears the person,
//     a RISER ending dead on the payoff word
//   · what the paper emits itself: sheet_in when it lands (under the whoosh), the stickers'
//     clicks, one felt glide for the dotted line
//   · nothing else: no sound when the call changes side (the voices are the change), none
//     per typed word, no hit after a riser
// Levels are dB on top of project.json sfxMasterDb; `align` is where the transient sits in
// the file. Every level was measured by subtraction on the reference cut (measure.mjs);
// re-measure on every cut.
import fs from "node:fs";
import { STEPS, at, on, atHook, BEATS, PUNCHES, PICKS, CHIPS, C0, PLATE_AT, RING_AT } from "./plan.mjs";

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
export function cameraSteps() { return STEPS; }

export const MAP = { acts: [] };
export const MAC = null;
export const SKILLS = null;
export const BLUR_WINDOWS = [];       // no blur band: the record carries its own scrim

const cuesOf = beats => beats.flatMap(b => (typeof b.cues === "function" ? b.cues() : []));
const SFX = "sample:sfx-top5/";

export function sfxCues() {
  const c = [];
  const add = (t, kind, gain, align) => c.push({ t: +t.toFixed(3), kind, gain, align });
  const G = P.cueGains ?? {};

  // ── THE HOOK
  if (fs.existsSync("assets/music-hook.wav")) add(0.00, "sample:music-hook.wav", G.hookBed ?? -15);
  if (PICKS.hookStress != null) add(atHook(on(PICKS.hookStress)), SFX + "glitch.wav", G.glitch ?? -17, 0.15);
  if (PICKS.hookRiserEnd != null) add(atHook(on(PICKS.hookRiserEnd)), SFX + "riser.wav", G.riserHook ?? -14, 1.765);

  // ── THE RINGING
  add(PLATE_AT + 0.01, SFX + "whoosh.wav", G.whoosh ?? -9.5, 0.94);
  add(RING_AT, "sample:ringback.wav", G.ring ?? -13.5);

  // ── BAM: the flash comes from plan.mjs; the de-zoom's whoosh; the bed from its first big
  // hit (the cue starts 20 ms before the bam, on its fade-in)
  add(C0, "whoosh_out", G.whoosh_out ?? -21);
  if (P.bed) {
    if (fs.existsSync(`assets/${P.bed}`)) add(C0 - 0.02, `sample:${P.bed}`, Number(P.bedDb ?? -20.9));
    else console.error(`  ⚠ the music ${P.bed} is not in assets/: run the skill's sounds.py`);
  }

  // ── THE CALL
  for (const t of PUNCHES) add(t, "swoosh_in", G.swoosh_in ?? -25);
  for (const ch of CHIPS) add(ch.t + 0.12, SFX + "click.wav", G.click ?? -11, 0.005);   // clearing the person
  if (PICKS.payoff != null) add(at(on(PICKS.payoff)), SFX + "riser.wav", G.riser ?? -14, 1.765);   // ENDS on the payoff

  // what the figures emit themselves; a sheet landing under the pack's whoosh keeps its own
  // sound, lower (the paper's flap); the sheet leaves under the flash, silently
  const whooshes = c.filter(x => x.kind.endsWith("whoosh.wav")).map(x => x.t);
  for (const q of process.env.NO_PAPER ? [] : cuesOf(BEATS)) {
    if (q.kind === "sheet_out" || q.kind === "tear") continue;
    c.push(q.kind === "sheet_in" && whooshes.some(t => Math.abs(t - q.t) < 0.1) ? { ...q, gain: -21 } : q);
  }
  // NO_CUES=<regex>: the same mix without the sounds whose name matches, to measure each
  // one by subtraction (measure.mjs)
  const drop = process.env.NO_CUES ? new RegExp(process.env.NO_CUES) : null;
  return c.filter(x => x.t >= 0 && x.t < P.duration - 0.05 && !(drop && drop.test(x.kind))).sort((a, b) => a.t - b.t);
}

// no engine subtitles: the record is the text
export const SUB_STYLE = "clean";
