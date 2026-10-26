// THE PLAN — a cold call in THE CALL LANGUAGE (cold-call-editor/SKILL.md § The call language).
//
// The sound is a phone call between two people over a picture that has nothing to do
// with it, so the frame says what the picture cannot: it is a CALL, there are TWO voices,
// and this is what they said.
//   · THE HOOK: the most suspenseful line of the call, up front, the GLITCH on its stressed
//     words (the footage in the assembly, the lettering here), typed in the record
//   · THE RINGING: a paper sheet, the caller's microphone and the other side's handset land
//     in stop-motion, a dotted line runs between them, the handset shakes, the ringback tone
//   · BAM: the camera flash, the de-zoom, the music on its first big hit, the call
//   · THE CALL: the typed record at the bottom, the voice as one thin line of wave above it,
//     a camera punch where the call turns, what is named coming out from behind the person
//
// Every time is a word onset of the RAW take (assets/words-fixed.json); at() and atHook()
// map it to the output (call.mjs). Fill PICKS and the placements, then look at it with the
// engine's preview.mjs before building.
import fs from "node:fs";
const E = "__ENGINE__/";      // the short-editor engine: shade, chips, flash, the paper, the looks
const S = "__SKILL__/";       // this skill's figures
const { shade } = await import(E + "headline.mjs");
const { chips, flash } = await import(E + "titles.mjs");
const { cover } = await import(E + "illustrate.mjs");
const { currentLook, lookBeats } = await import(E + "looks.mjs");
const { project, speakers, timeline, words, loadLevels, utterances } = await import(S + "call.mjs");
const { record } = await import(S + "typewriter.mjs");
const { wave } = await import(S + "wave.mjs");
const { ringScene } = await import(S + "ringscene.mjs");
const { glitchText } = await import(S + "glitchtext.mjs");
const SFX = "sample:sfx-top5/";

const P = project();
const frame = { w: P.width, h: P.height };
const TL = timeline(P);
export const { at, atHook, HOOK_END, C0, PLATE_AT, RING_AT, RINGS } = TL;
const END = P.duration;
const SPK = speakers(P);

// the words on their measured onsets (onsets.py; the ones pinned by hand are project.json
// `onsetFix`, so the record, the turns, the levels and the bursts agree)
const { W, on } = words();
export { on };

// ── THE PICKS — word indices of words.json, chosen by READING the call (SKILL.md § 6)
export const PICKS = {
  hookStress: null,    // the hook's most stressed word: the pack's glitch sound on it ("NUMBER?")
  hookRiserEnd: null,  // the riser of the hook ENDS on it ("NOT" in "not listed")
  punches: [],         // [[word, release word], …]: where the call turns, 3 to 6, released on the next phrase
  payoff: null,        // the last word that lands: the riser ends on it, the last punch, held to the end
  chips: [],           // [{ kind: "phone"|"mail", i, until: <raw s> }]: a thing NAMED comes out from behind the person
};

// ── THE CAMERA — [t, zoom, ramp, anchorX, ease]; the anchor on the person's eyes
// (project.json anchorX / anchorY). The hook jolts with every glitch burst; under the
// flash the frame jumps tight and the call opens on the house de-zoom (1.30 → 1.00 in
// 0.62 s, with its whoosh); then a punch (1.13 in 0.10 s) only where the call turns.
const AX = P.anchorX ?? 0.5;
const HFX = JSON.parse(fs.readFileSync("assets/hookfx.json", "utf8"));
export const BURSTS = HFX.glitch.bursts;
export const PUNCHES = [...PICKS.punches.map(([i]) => at(on(i))), ...(PICKS.payoff != null ? [at(on(PICKS.payoff))] : [])];
export const STEPS = [
  [0.00, 1.00, 0.00, AX],
  ...BURSTS.flatMap(([a]) => [[a, 1.035, 0.02, AX], [+(a + 0.06).toFixed(3), 1.00, 0.06, AX]]),
  [C0, 1.30, 0.00, AX],
  [C0, 1.00, 0.62, AX, "out"],
  ...PICKS.punches.flatMap(([i, j]) => [[at(on(i)), 1.13, 0.10, AX], [at(on(j)), 1.00, 0.34, AX, "out"]]),
  ...(PICKS.payoff != null ? [[at(on(PICKS.payoff)), 1.14, 0.09, AX]] : []),
].sort((a, b) => a[0] - b[0]);

export async function load() {}
export const BEATS = [];
const add = (...b) => BEATS.push(...b);

// the top of the room a little in shadow, behind the person: only the chips live up there
add(shade({ id: "shade", from: 0, to: END, frame, bottom: 0.32, alpha: 0.32 }));

// ── THE RECORD: the words of dialogue.json, typed on their onsets; it starts again at the bam
const D = JSON.parse(fs.readFileSync("dialogue.json", "utf8"));
export const U = utterances(D, { tl: TL, on, end: END });
add(record(U, { frame, end: END, names: SPK.names, labels: SPK.label }));

// ── WHAT IS NAMED COMES OUT FROM BEHIND THE PERSON — generic glyphs, not brands (a phone
// number and an email are things); each slides out of the person's silhouette on the word,
// the pack's click as it clears them (edl.mjs). fromX: where the person is; x: the free side.
// A chip can say where it goes: { …, x, y, fromX } (read on a preview frame).
export const CHIPS = PICKS.chips.map(c => ({ ...c, t: at(on(c.i)), to: at(c.until) }));
const FROM_X = P.anchorX ?? 0.5, FREE_X = FROM_X > 0.5 ? 0.30 : 0.70;
for (const c of CHIPS)
  add(chips({ id: `chip-${c.kind}-${c.t}`, from: c.t - 0.02, to: c.to, frame, size: 350, layer: "under",
    items: [{ kind: c.kind, t: c.t, x: c.x ?? FREE_X, y: c.y ?? 0.505, fromX: c.fromX ?? FROM_X, rot: (c.fromX ?? FROM_X) > 0.5 ? -6 : 6 }] }));

// ── THE VOICE: one thin line of wave above the record, the colour of the one talking;
// gone under the ringing sheet
export const LEVELS = loadLevels();
add(wave({ frame, data: LEVELS, from: 0, to: END, hide: [PLATE_AT, C0], colors: SPK.colors }));

// ── THE HOOK'S GLITCH, on what is drawn: the record breaks up with the picture
add(glitchText({ frame, fps: P.fps ?? 60, bursts: BURSTS, sources: BEATS.filter(b => b.id === "dialogue") }));

// ── THE RINGING: the call being placed, on paper — the sheet drops once the hook line has
// breathed (the pack's whoosh carries it, edl.mjs), the two ends land in stop-motion with
// the pack's click, the dotted line runs, the handset shakes while the ringback plays, and
// the sheet goes under the flash
const ring = cover({ id: "ring", from: PLATE_AT - 0.02, to: C0 + 0.03, at: PLATE_AT, frame, stencil: null,
  enter: "drop", enterDur: 0.26, exit: "fade", exitDur: 0.06, doSketch: false, doRim: false, grid: "quad",
  mutesCaptions: false,
  children: [ringScene({ frame, stepFps: 8,
    // (inside the feed's safe area, its names too: the phone's edge before the buttons at x 0.84)
    mic: { x: 0.30, y: 0.445, t: +(PLATE_AT + 0.21).toFixed(3), size: 260, rot: -5, name: SPK.names.A },
    phone: { x: 0.69, y: 0.445, t: +(PLATE_AT + 0.335).toFixed(3), size: 260, rot: 4, name: SPK.names.B },
    line: { t: +(PLATE_AT + 0.335).toFixed(3), dur: 0.25 },
    rings: RINGS,
    land: { kind: SFX + "click.wav", gain: -11, align: 0.005 } })] });
add(...ring.beats);

// ── BAM: the camera flash on the change of shot (the sheet → the call), drawn last so it
// covers everything; the pack's camera flash lands on the cut
add(...lookBeats(currentLook(P), { frame }));
add(flash({ id: "flash-bam", at: C0, frame, sound: SFX + "camera-flash.wav", gain: -7, align: 0.255 }));
