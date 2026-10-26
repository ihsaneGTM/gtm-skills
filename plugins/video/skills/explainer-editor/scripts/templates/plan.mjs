// THE PLAN — a take in THE EXPLAINER LANGUAGE (explainer-editor/SKILL.md § The explainer language).
//
// The speaker sits in a frame at the bottom of a dark stage lit like a set, their head rising out
// of it; above them, the stage EXPLAINS what they say as they say it, with the motion and the light
// of an After Effects edit (every figure its shadow and its glow, drawn by stage.mjs):
//   · SCENES, one idea each (4-8 s), joined by CAMERA MOVES: S.scene(t, "whip" | "rise" | "push")
//   · a scene ARRIVES COMPOSED: what you place at the scene's own time rides in with the camera
//   · SOMETHING NEW EVERY SECOND OR SO, each figure on the word that names it
//   · THE TITLE: the section's topic, two lines (Inter + one serif accent), changed per section
//   · THE CAPTIONS: automatic, one word at a time
//   · THE BREATHERS: FULL, the speaker full screen for 2-6 s (a camera flash on the cut)
// Every figure makes its own light sound (the Motionix pack: a pop, a swish, a tick, a select, a
// shutter…; `sfx: "<role>"` for another, null for none), every scene change the house pack's whoosh.
//
// Write the storyboard first (SKILL.md § 3), then this file. Every time is an OUTPUT second:
// on(i) is the onset of word i of words.json. Look at it in motion before building (§ 5).
import fs from "node:fs";
const SK = "__SKILL__/";
const { stage, words, preview } = await import(SK + "stage.mjs");

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const W = words(P);
export const on = i => W[i].s;            // the onset of word i (output seconds)
export const end = i => W[i].e;           // its end
const END = P.duration;

// ── THE BREATHERS — [from, to] output seconds; a shot that is not the talking head: [from, to, { zoom: 1 }];
//    an end that shows the NEXT video: preview(from, END, "card" | "phone" | "upnext" | "film", { name })
export const FULL = [
  // [on(120), on(131)],
  // preview(46.2, END, "card", { name: "The next video's name" }),
];

const S = await stage({ project: P, full: FULL, fix: {
  // the words the transcript spells wrong, as they should read: "klesos": "Klesos"
} });

// ── THE SCENES (nothing is drawn but the ground and the captions until you write them) ──────
// Scene 1, the promise: the title, the first figure on its word
// S.title(on(0), ["This Is How To Write", "*Killer* Text Hooks"]);
// const shots = S.cards(on(1), ["assets/shots/a.jpg", "assets/shots/b.jpg", "assets/shots/c.jpg"], { rows: [3], w: 220, h: 390 });
// S.pill(on(6), "Text Hooks", { x: 0.8, y: 0.29, w: 300, h: 90, size: 42, enter: "right" });
// S.arrow(on(6) + 0.1, [0.6, 0.24], [0.72, 0.27]);

// Scene 2, a list: the camera whips to it, the bars ride in with it, each label on its word
// S.scene(on(12), "whip");
// const L = S.list(on(12), [{ label: "Substance", glyph: "check", glyphColor: "green" }, "Design", "Formats"]);
// L.reveal(0, on(15)); L.focus(0, on(15));

// Scene 3, a reveal: push through, the answer blurred until said
// S.scene(on(30), "push");
// S.title(on(30), ["3 Winning Types Of", "*Text Hooks*"], { red: 0 });
// const k = S.pill(on(30), "The answer", { x: 0.5, y: 0.27, w: 440, h: 132, size: 58, blur: 16 });
// k.blurTo(on(33), 0, 0.3).sound(on(33), "select"); S.ping(on(33), k, { ring: true });
// S.sound(on(34), "data");                                               // a sound alone: a scan, a landing ("thump")…
// S.riser(on(36));                                                       // a riser ending on the payoff

// THE BEATS: the ground, the stage, the captions, the flashes
export const BEATS = S.beats;
export const STEPS = [];                  // no engine camera: the stage has its own
export async function load(o) { await S.load(o); }    // o.layer: the frames of the breathers only where they are drawn
