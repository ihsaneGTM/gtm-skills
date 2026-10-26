// The assembly: which parts of the rush survive.
//
// Only needed when the source is a RUSH — a long take with restarts, false
// starts, thinking-out-loud and dead air. If the source is already the take you
// want, skip this file entirely and go straight to plan.mjs / edl.mjs.
//
//   node .../scripts/rough-cut.mjs --dry-run   # read the list back, no render
//   node .../scripts/rough-cut.mjs --adopt     # render, then restart the
//                                              # pipeline on the assembly
//
// Every `from`/`to` is a word onset from words.json — the transcript of the
// RUSH. Not a round number, and not a silence boundary: the choice of which
// attempt at a sentence is the good one is made by reading, and a silence
// detector cannot make it (it keeps all five attempts and deletes the breath
// before the best one).
//
// Rules that were paid for:
//   - Cut on the BREATH, not on the word. Starting a segment exactly on the
//     first phoneme clips the attack and the speaker sounds out of breath.
//     headPad exists for that; 60-100 ms is usually enough.
//   - A segment under ~0.35 s reads as a glitch, not as an edit.
//   - Keep whole thoughts. Splicing the first half of attempt 2 onto the second
//     half of attempt 4 works on paper and almost never works in the room:
//     the energy, the pitch and the head position all jump.
//   - Order is the order of the finished speech. The list is sorted by `from`
//     before rendering, so reordering the rush is NOT possible here by design —
//     if the speech needs re-ordering, say so rather than faking it.

export const KEEP = [
  // { from: 12.402, to: 19.780, note: "hook, 3rd attempt, the good one" },
];

export const OPTS = {
  headPad: 0.06,   // seconds of breath kept before the first word
  tailPad: 0.10,   // and after the last one, so the phrase can land
  audioFade: 0.015, // fade at each join; a hard splice on a voice clicks
};
