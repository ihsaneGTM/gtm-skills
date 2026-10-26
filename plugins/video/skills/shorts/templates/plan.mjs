// THE PLAN of one short of /video-long-to-shorts (SKILL.md § 4, references/look.md), or of one take edited in the
// Whiteboard style (/video-whiteboard-editor: the same look, the take in its own order). Style: __STYLE__ (styles.json).
//
// Round 2 (2026-10-14, Ihsane): YOUR FACE FROM THE FIRST FRAME (the hook is you saying it, never an intro screen), the
// words in Dynamic text (/video-short-editor: Impact capitals, the payoff in yellow, one Sacramento accent, the glitch on
// the hook's first yellow word, the opening de-zoom), and the long video's pictures with its effects: stock shots as
// floating screens (two shadows, the screen grid, grain, a vignette, a light sweep, an entrance blurred by its motion),
// GIFs as pinned prints, a stock shot over the whole frame with the pack's flash. Where they go is the style:
//   prints   over the top of the frame, on your face, for the time of their words
//   behind   out from behind your head and shoulders (the matte: run matte.mjs), you in front
//   cuts     stock shots over the whole frame; GIFs as big prints on your face
// A voice line (blocks.json › paper) has no face under it: it is ALWAYS covered by a cutaway, in every style.
//
// Every time is an OUTPUT second (words.json is on the short's clock): find("word", n, after) gives a word's onset.
import fs from "node:fs";
const E = "__ENGINE__/";
const B = "__BOOK__/";
const D = "__SHORTS__/";
const { cue } = await import(B + "book.mjs");
const { print, loadDoc } = await import(D + "doc.mjs");
const { dtHeadlines, screen, cutaway, openingSteps, hookTitle, moodOpen, whitePage, docLayer } = await import(D + "dt.mjs");
const { shade } = await import(E + "headline.mjs");

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const frame = { w: P.width, h: P.height, fps: P.fps };
const END = P.duration;
const STYLE = P.shortsStyle || "__STYLE__";
const WORDS = JSON.parse(fs.readFileSync("words.json", "utf8"));
const SHOTS = JSON.parse(fs.readFileSync("shots.json", "utf8"));
const PAPER = JSON.parse(fs.readFileSync("blocks.json", "utf8")).paper;       // [[from, to]]: a voice line
const SFX = "sample:sfx-top5/";
export const find = (text, n = 1, after = 0) => {
  const k = s => s.toLowerCase().replace(/[^a-z0-9'’%-]/g, "");
  const hits = WORDS.filter(x => x.s >= after && k(x.w) === k(text));
  if (!hits[n - 1]) throw new Error(`plan: « ${text} » #${n} is not in words.json`);
  return hits[n - 1].s;
};
const endOf = (text, n = 1, after = 0) => WORDS.find(x => x.s === find(text, n, after)).e;

export async function load() { await loadDoc(); }
export const BEATS = [];
const add = (...b) => BEATS.push(...b.flat());
export const EXTRA_CUES = [{ t: 0, kind: "whoosh_out", gain: -21 }];            // the opening de-zoom

// ── A PICTURE, placed by the style ─────────────────────────────────────────────────────────────────────────────
let side = 0;
const shot = (id, src, at, until, o = {}) => {
  if (STYLE === "cuts") return add(cutaway({ id, src, at, until, ...o }));
  if (STYLE === "behind") { const s = side++ % 2 ? 1 : -1; return add(screen({ id, src, at, until, layer: "under", x: 0.5 + s * 0.32, y: 0.50, w: 0.62, rot: 4 * s, emerge: { fromX: 0.5, fromY: 0.52 }, ...o })); }
  return add(screen({ id, src, at, until, x: 0.5, y: 0.63, w: 0.66, rot: -2, ...o }));
};
const gif = (id, src, at, until, caption, o = {}) => {
  if (STYLE === "behind") { const s = side++ % 2 ? 1 : -1; return add(print({ id, src, at, until, caption, layer: "under", x: 0.5 + s * 0.33, y: 0.49, w: 0.50, rot: 5 * s, safe: false, ...o })); }
  return add(print({ id, src, at, until, caption, x: 0.5, y: STYLE === "cuts" ? 0.50 : 0.62, w: STYLE === "cuts" ? 0.70 : 0.50, ...o }));
};

// ── THE VISUAL HOOK (the first ~3 s, before the words): the problem as a title above the head, and the MOOD: a few
// pictures of the subject (objects as stickers: node plugins/video/motion/sticker.mjs make/pick; the real icons of the
// tools it names: plugins/video/assets/logos/) out from behind the head (references/example-plan.mjs)
// const HOOK_END = endOf("message.") + 0.25;
// add(hookTitle({ until: HOOK_END, frame, lines: [[{ text: "NOBODY", size: 170 }], [{ text: "REPLIES?", hot: true, size: 200 }]], glitch: { t: 0.17, dur: 0.22, words: ["REPLIES?"] } }));
// EXTRA_CUES.push({ t: 0.17, kind: SFX + "glitch.wav", gain: -17, align: 0.15 });
// add(moodOpen({ until: HOOK_END, items: [{ src: "assets/mood/inbox.png", x: 0.17, y: 0.33, size: 0.29, rot: -8 }, …] }));
// and the words start after it: dtHeadlines({ …, skip: [[0, HOOK_END]], glitchFirst: false })

// ── THE PICTURES (one on its words, something new every 3 to 6 s) ──────────────────────────────────────────────
// shot("email", "assets/media/email", find("think") - 0.1, endOf("message.") + 0.2);
// gif("thinking", "assets/media/thinking", find("Maybe", 2) - 0.05, find("But") - 0.12, "one more word…");
// the paper under every voice line: a cutaway, whatever the style
// for (const [a, b] of PAPER) add(cutaway({ id: `vo-${a}`, src: "assets/media/<a shot>", at: a, until: b }));

// ── THE WHITE PAGES (a 1 min+ version: 2 or 3; references/motion-pages.md): a motion page over the whole frame
// add(whitePage({ id: "page-tree", at: find("There") - 0.45, until: endOf("decision.") + 0.3, seed: 5,
//   children: [docLayer({ id: "mp-tree", src: "assets/media/mp-tree-a", y: 0, w: 1 })] }));
// the last one may exit onto the face: handoff + its camera (references/example-plan.mjs, RECAP)

// ── THE CAMERA: the opening de-zoom, the jump cuts wide / close, a punch on a payoff word ───────────────────────
const PUNCH = [/* find("qualified") */];
export const STEPS = openingSteps(SHOTS.joins.filter(j => !PAPER.some(([a, b]) => j > a - 0.05 && j < b + 0.05)), PUNCH);
// EXTRA_CUES.push({ t: find("ninety-five"), kind: SFX + "riser.wav", gain: -14, align: 1.765 });   // ends ON the payoff

// ── THE WORDS, drawn last ─────────────────────────────────────────────────────────────────────────────────────
const HOT = [/* the payoff words */], SCRIPT = [/* one accent word, on a line of its own */];
// AT THE TOP, BEHIND YOU (Dynamic text's place; Ihsane, 2026-10-14: « au-dessus de moi, un peu derrière moi »): the zoom
// leaves the wall above the head for them (P.zoom > 1); the top of the room in shadow so the white reads on a light wall
// A vertical take kept whole (the Whiteboard style, cut.mjs --one) has them there too when its head leaves the room
// (project.json › headroom, the top of the head: 0.20 of the frame or more); a tight one keeps them below the head
const TOP = (P.zoom ?? 1) > 1 || (P.headroom ?? 0) >= 0.20;
if (TOP) add(shade({ id: "shade", from: 0, to: END, frame, bottom: 0.40, alpha: 0.55 }));
const QUIET = TOP ? [] : BEATS.filter(b => b.kind === "print").map(b => b.held ?? [b.from, b.to]);
const words = dtHeadlines({ words: WORDS, hot: HOT, script: SCRIPT, quiet: QUIET, frame, end: END, place: TOP ? "top" : "low",
  front: BEATS.filter(b => b.kind === "cutaway").map(b => [b.from, b.to]) });
add(words);
EXTRA_CUES.push(...words.extraCues);
