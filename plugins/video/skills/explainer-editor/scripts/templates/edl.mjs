// THE EDIT — the sound of a take in the explainer language (there is no camera move here: the
// picture is laid out by layout.mjs, the stage's camera lives in stage.mjs).
//
// As settled for this style (explainer-editor/SKILL.md § The explainer language), every sound is
// emitted by the stage itself (stage.mjs SND and MX):
//   · the house pack (assets/sfx-top5) on the big moves: the WHOOSH on every scene change (its
//     crest at the camera move's middle), the GLITCH on a hit (a VS), the RISER ending on the
//     payoff (S.riser in plan.mjs), the CAMERA FLASH on each cut to full screen, whoosh_out on the
//     way back and on a title
//   · the Motionix pack (assets/sfx-motionix) on everything that appears, light: a pop, a swish,
//     a tick, a select, a confirm or a deny, a stretch for a line drawn, a shutter for a frame of
//     the take, the typing of a prompt, the data of a scan
//   · THE BED: assets/music.wav (bed.mjs: the track, its drop on the breather that lands the point)
// Levels: the stage's, on project.json sfxMasterDb (set by init.sh on the take's voice: the kit is
// heard as in the base skills); cueGains overrides one by name (whoosh, glitch, pop, swish…);
// measure them as heard with the skill's measure.mjs (the light ones: measure.mjs fine). Nothing
// per caption word.
import fs from "node:fs";
import { BEATS, on } from "./plan.mjs";

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
export function cameraSteps() { return []; }
export const MAP = { acts: [] };
export const MAC = null;
export const SKILLS = null;
export const BLUR_WINDOWS = [];          // no blur band: the stage is a ground of its own

const cuesOf = beats => beats.flatMap(b => (typeof b.cues === "function" ? b.cues() : []));
const SFX = "sample:sfx-top5/";

export function sfxCues() {
  const c = [];
  const add = (t, kind, gain, align) => c.push({ t: +t.toFixed(3), kind, gain, align });
  const G = P.cueGains ?? {};

  // THE BED, from the first frame (in project.json, or verify.mjs reports it missing)
  if (P.bed) {
    if (fs.existsSync(`assets/${P.bed}`)) add(0.0, `sample:${P.bed}`, Number(P.bedDb ?? -21));
    else console.error(`  ⚠ the music ${P.bed} is not in assets/: run the skill's bed.mjs`);
  }

  // what the stage emits (every move's sound, at its level); two of a kind closer than 60 ms
  // make one (the first)
  for (const q of process.env.NO_PAPER ? [] : cuesOf(BEATS).sort((a, b) => a.t - b.t)) {
    if (c.some(x => x.kind === q.kind && Math.abs(x.t - q.t) < 0.06)) continue;
    c.push(q);
  }
  // NO_CUES=<regex>: the same mix without the sounds whose name matches (to measure one)
  const drop = process.env.NO_CUES ? new RegExp(process.env.NO_CUES) : null;
  return c.filter(x => x.t >= 0 && x.t < P.duration - 0.05 && !(drop && drop.test(x.kind))).sort((a, b) => a.t - b.t);
}

// no engine subtitles: the captions are drawn by the stage (one word at a time)
export const SUB_STYLE = "clean";
