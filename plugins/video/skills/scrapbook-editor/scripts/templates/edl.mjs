// THE EDIT — the camera (it lives in plan.mjs) and the sound of THE SCRAPBOOK LANGUAGE.
//
// The sound (scrapbook-editor/SKILL.md § The sounds): REAL PAPER every time a paper lands, the
// Motionix pack for what is not paper, the house pack of the other styles when a plan asks for it,
// one role each (book.mjs SOUNDS):
//   · paper    a paper landing: a keyword, a punch phrase, a list word, the ask
//   · section  a section's banner, UNDER its swoosh · name: the tag under a banner
//   · mark     the red marker drawing: a word struck out, an underline, a circle, an arrow
//   · pop      a sticker slapped on (a number's tile too) · shutter: a polaroid landing
//   · swish    a polaroid flicked away, the opening frame settling · swoosh: a banner swinging in
//   · thump    the hook's promise giving its beat · rise: the riser climbing into a change of scene
//   · bed      the music under the whole short, 15 LU under the voice (music.mjs: project.json bed /
//              bedDb), dropping on a change of scene
//   · nothing on the jump cuts (the camera's punch is silent), nothing per caption word
// The figures bring their own cues; the plan adds the rest in EXTRA_CUES. Levels are LU under the
// voice (sounds.mjs --calibrate set voiceM); measure.mjs measures them as heard.
// NO_CUES=<regex> renders the same mix without the sounds whose file or role it matches.
import fs from "node:fs";
import { STEPS, BEATS, EXTRA_CUES } from "./plan.mjs";

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
export function cameraSteps() { return STEPS; }

export const MAP = { acts: [] };
export const MAC = null;
export const SKILLS = null;
export const BLUR_WINDOWS = [];       // no blur band in this language

export function sfxCues() {
  const c = [];
  if (P.bed) {
    if (fs.existsSync(`assets/${P.bed}`)) c.push({ t: 0, kind: `sample:${P.bed}`, gain: Number(P.bedDb ?? -24), role: "bed" });
    else console.error(`  ⚠ the music ${P.bed} is not in assets/: run the skill's music.mjs`);
  }
  for (const b of process.env.NO_PAPER ? [] : BEATS) if (typeof b.cues === "function") c.push(...b.cues());
  c.push(...EXTRA_CUES);
  // two of the same role within 80 ms are one sound (two keywords landing together: one paper)
  c.sort((a, b) => a.t - b.t);
  const out = [];
  for (const q of c) if (!out.some(x => (x.role ?? x.kind) === (q.role ?? q.kind) && Math.abs(x.t - q.t) < 0.08)) out.push(q);
  const drop = process.env.NO_CUES ? new RegExp(process.env.NO_CUES) : null;
  return out.filter(x => x.t >= 0 && x.t < P.duration - 0.05 && !(drop && (drop.test(x.kind) || drop.test(x.role ?? ""))));
}

// no engine subtitles: the captions are a figure of the plan (captions.mjs)
export const SUB_STYLE = "clean";
