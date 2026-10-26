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

// ── THE BREATHERS: none — a 24 s take, the stage carries it from end to end
export const FULL = [];

const S = await stage({ project: P, full: FULL, fix: { "we've": "We've", so: "So", if: "If", os: "OS", gtm: "GTM", youtube: "YouTube", tick: "Tik", tock: "Tok", instagram: "Instagram", seo: "SEO" } });

// ── A. "We've built a go to market OS, so let me show you exactly what it is and how it works"
S.title(on(0), ["We've Built A", "*Go-To-Market* OS"]);
const os = S.glyph(on(6), "rocket", { x: 0.5, y: 0.3, w: 210, tile: true, width: 2.2 });                                  // "OS"
S.ping(on(6) + 0.05, os, { ring: true });
S.pill(on(13), "What it is", { x: 0.29, y: 0.5, w: 330, h: 96, size: 36, glyph: "eye", enter: "rise" });                  // "what it is"
S.pill(on(17), "How it works", { x: 0.71, y: 0.5, w: 360, h: 96, size: 36, glyph: "bolt", enter: "rise" });               // "how it works"
S.arrow(on(13) + 0.15, [0.45, 0.36], [0.33, 0.44], { bend: 0.35 });
S.arrow(on(17) + 0.15, [0.55, 0.36], [0.67, 0.44], { bend: -0.35 });

// ── B. "If you are a founder, a marketer, or just a GTM guy like me"
S.scene(on(20), "whip");
S.title(on(20), ["Founders, Marketers", "*GTM* People"]);
// the three ride in with the camera, in the dark; each lights up on its word
const who = [[24, "rocket", "Founder", 0.2], [26, "chart", "Marketer", 0.5], [30, "target", "GTM guy", 0.8]]
  .map(([w, gk, label, x]) => S.glyph(on(20), gk, { x, y: 0.33, w: 190, tile: true, label, size: 32, blur: 10, dim: 0.6 }).blurTo(on(w), 0).lit(on(w)).set(on(w), { s: 1.12 }, 0.16).set(on(w) + 0.16, { s: 1 }, 0.35, "outBack").sound(on(w), "pop"));
who[2].set(on(32), { hi: 1, s: 1.08 }, 0.25, "outBack");
S.mark(on(32), who[2], { kind: "frame", color: "red", width: 4, w: 250, h: 300 });                                       // "like me"
S.arrow(on(32) + 0.2, [0.8, 0.47], [0.62, 0.6], { bend: -0.45, color: "red" });

// ── C. "you have to juggle between YouTube, TikTok, Instagram, SEO, all of your signups, and that's a lot to deal with"
S.scene(on(34), "rise");
S.title(on(34), ["You Have To", "*Juggle* Between"]);
// the five ride in with the camera, blurred; each comes into focus on its name
const ch = [[39, "YouTube", "play", "red", 0.3, 0.26], [40, "TikTok", "phone", null, 0.71, 0.32], [42, "Instagram", "eye", null, 0.3, 0.4], [43, "SEO", "search", null, 0.71, 0.46], [47, "Signups", "users", "green", 0.5, 0.55]]
  .map(([w, text, glyph, glyphColor, x, y]) => S.pill(on(34), text, { x, y, w: 330, h: 92, size: 36, glyph, glyphColor, blur: 12, dim: 0.55 }).blurTo(on(w), 0).lit(on(w)).sound(on(w), "select"));
ch.forEach((p, i) => p.dim(on(49) + 0.03 * i, 0.55).blurTo(on(49) + 0.03 * i, 7));                                          // "that's a lot…": they blur away
S.sign(on(51), "A LOT", { x: 0.5, y: 0.41, size: 120, color: "red", glow: true, sfx: "glitch" });                       // "a lot"
S.shake(on(51) + 0.05, 16);

// ── D. "You have to know which channel is running, which channel needs your attention, which channel brings your client, which one is not"
S.scene(on(55), "whip");
S.title(on(55), ["You Have To Know", "*Which Channel*…"]);
const L = S.list(on(55), [
  { label: "Is running", glyph: "check", glyphColor: "green" },
  { label: "Needs your attention", glyph: "warning", glyphColor: "yellow" },
  { label: "Brings your clients", glyph: "money", glyphColor: "green" },
  { label: "Is not", glyph: "cross", glyphColor: "red" },
], { w: 760 });                                                                                                          // rides in with the camera
[[0, 62], [1, 67], [2, 70], [3, 74]].forEach(([i, w]) => { L.reveal(i, on(w)); L.focus(i, on(w), 0.55); });               // each on its word

// THE BEATS: the ground, the stage, the captions
export const BEATS = S.beats;
export const STEPS = [];
export async function load(o) { await S.load(o); }
