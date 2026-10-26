// THE PLAN of one short of /video-long-to-shorts (SKILL.md § 4, references/look.md). Style: behind (styles.json).
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
// (in a real short these three are the paths init.sh writes: templates/plan.mjs)
const E = "__ENGINE__/";
const B = "__BOOK__/";
const D = "__SHORTS__/";
const { cue } = await import(B + "book.mjs");
const { print, loadDoc } = await import(D + "doc.mjs");
const { dtHeadlines, screen, cutaway, openingSteps, hookTitle, hookPanel, moodOpen, whitePage, docLayer } = await import(D + "dt.mjs");
const { shade } = await import(E + "headline.mjs");

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const frame = { w: P.width, h: P.height, fps: P.fps };
const END = P.duration;
const STYLE = P.shortsStyle || "behind";
const WORDS = JSON.parse(fs.readFileSync("words.json", "utf8"));
const SHOTS = JSON.parse(fs.readFileSync("shots.json", "utf8"));
const PAPER = JSON.parse(fs.readFileSync("blocks.json", "utf8")).paper;       // [[from, to]]: a voice line
const SFX = "sample:sfx-top5/";
const has = (text, n = 1, after = 0) => { try { find(text, n, after); return true; } catch { return false; } };
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

// ── THE PICTURES (one on its words, something new every 3 to 6 s) ──────────────────────────────────────────────
// the paper under every voice line: a cutaway, whatever the style
// THE VISUAL HOOK (the first seconds, before the words): HOOK=title|panel|both (project.json hook), both by default
const HOOK = process.env.HOOK || P.hook || "title", HOOK_END = endOf("message.") + 0.25;
if (HOOK !== "panel") add(hookTitle({ until: HOOK_END, frame, lines: [[{ text: "NOBODY", size: 170 }], [{ text: "REPLIES?", hot: true, size: 200 }]],
  glitch: { t: 0.17, dur: 0.22, words: ["REPLIES?"] } }));
if (HOOK !== "panel") EXTRA_CUES.push({ t: 0.17, kind: SFX + "glitch.wav", gain: -17, align: 0.15 });
// the mood: a few pictures of the subject out from behind the head, for the hook's seconds (Ihsane, 2026-10-14)
add(moodOpen({ until: HOOK_END, items: [
  { src: "assets/mood/inbox.png", x: 0.17, y: 0.33, size: 0.29, rot: -8 },
  { src: "assets/mood/target.png", x: 0.83, y: 0.32, size: 0.26, rot: 7 },
  { src: "assets/mood/linkedin.png", x: 0.22, y: 0.465, size: 0.13, rot: -10 },
  { src: "assets/mood/gmail.png", x: 0.78, y: 0.465, size: 0.13, rot: 9 },
  { src: "assets/mood/cards.png", x: 0.16, y: 0.585, size: 0.29, rot: 6 },
  { src: "assets/mood/magnifier.png", x: 0.83, y: 0.59, size: 0.27, rot: -6 },
] }));
if (HOOK !== "title") add(hookPanel({ until: HOOK_END, tag: "Cold outreach", title: [{ text: "IT'S" }, { text: "YOUR" }, { text: "LIST", hot: true }], sub: "Not your message. Here's why.", y: 0.70 }));

// THE PICTURES, each on its words (only the words this cut has)
gif("thinking", "assets/media/thinking", find("Maybe", 2) - 0.05, find("But") - 0.12, null);
gif("facepalm", "assets/media/facepalm", find("badly") - 0.05, Math.min(find("badly") + 2.2, PAPER[0]?.[0] ?? 1e9) - 0.06, null);
for (const [a, b] of PAPER) add(cutaway({ id: `vo-${a}`, src: "assets/media/sdr-team", at: a, until: b }));
if (has("waste")) gif("waiting", "assets/media/skeleton-wait", find("waste") - 0.05, find("waste") + 2.4, null);
shot("overwhelmed", "assets/media/overwhelmed", find("live") - 0.1, endOf("day.") + 0.1);
if (has("SDR")) shot("sdr", "assets/media/sdr-team", find("SDR") - 0.1, find("SDR") + 2.6);
if (false) shot("salesteam", "assets/media/salesteam", find("charge") - 0.1, find("charge") + 2.6);
if (has("selling")) shot("email2", "assets/media/email", find("selling") - 0.1, find("selling") + 2.4);
if (has("CMO")) shot("call", "assets/media/call", find("CMO") - 0.1, find("CMO") + 2.4);
if (has("overwhelmed")) shot("night", "assets/media/night", find("overwhelmed") - 0.1, find("overwhelmed") + 2.4);
if (has("signals.")) shot("social", "assets/media/social", find("signals.") - 0.1, find("signals.") + 2.6);
if (has("changed")) gif("thinking2", "assets/media/thinking", find("changed") - 0.05, find("changed") + 2.0, null);
if (false) shot("hiring", "assets/media/hiring", find("hiring") - 0.1, find("hiring") + 2.6);


// ── THE WHITE PAGES (round 5, 2026-10-14): the long video's V-page move, in white, to set an explanation down as a small
// schema; three in this 1 min 40, no more
// each page's content is drawn by the long video's engine (docpage.mjs: doc/<page>-story.js → assets/media/doc-<page>/)
const P1 = [find("There", 1, 40) - 0.45, endOf("decision.") + 0.3];
// round 8 (« pas assez vivant… teste plein de variations »): PAGEV picks how this page lives (A as it was)
const PAGEV = process.env.PAGEV || P.pageVariant || "G";
const T_CH = find("charge,"), T_BUY = find("buy"), T_INF = find("influence");
const pv = {
  A: { children: [docLayer({ id: "doc-deciders", src: "assets/media/doc-deciders", y: 0.18 })] },
  B: { hole: { x: 0.5, y: 0.475, w: 0.50, h: 0.24, at: P1[0] + 0.55, rot: -2 }, children: [docLayer({ id: "doc-deciders-b", src: "assets/media/doc-deciders-b", y: 0.17 })] },
  C: { children: [docLayer({ id: "doc-deciders-c", src: "assets/media/doc-deciders-c", y: 0.17 })] },
  D: { children: [docLayer({ id: "doc-deciders-d", src: "assets/media/doc-deciders-d", y: 0.17 })] },
  E: { children: [screen({ id: "page-shot", src: "assets/media/salesteam", at: P1[0] + 0.35, until: P1[1], x: 0.5, y: 0.29, w: 0.86, rot: -1.5 }),
    docLayer({ id: "doc-deciders", src: "assets/media/doc-deciders", y: 0.42, w: 0.56 })] },
  G: { children: [docLayer({ id: "doc-tree", src: "assets/media/doc-tree", y: 0.215 })] },
  F: { alive: { pulses: [T_CH, T_BUY, T_INF] }, children: [docLayer({ id: "doc-deciders", src: "assets/media/doc-deciders", y: 0.18 })] },
}[PAGEV];
// round 10 (« très osées… style After Effects »): a MOTION PAGE over the whole frame (motionpage.mjs), its variant by env
const MP = (page, v) => { const src = `assets/media/mp-${page}-${v}`; return { src, meta: JSON.parse(fs.readFileSync(src + "/meta.json", "utf8")), layer: docLayer({ id: `mp-${page}`, src, y: 0, w: 1 }) }; };
const MP_TREE = process.env.MP_TREE ?? "tree-b", MP_RADAR = process.env.MP_RADAR ?? "radar-d", MP_RECAP = process.env.MP_RECAP ?? "recap-b";   // round 10: Ihsane chose B and B
add(whitePage({ id: "page-deciders", at: P1[0], until: P1[1], seed: 5, ...(MP_TREE ? { children: [MP("tree", MP_TREE).layer] } : pv) }));
const P2 = [find("For", 1, 77) - 0.45, endOf("field.") + 0.25];
add(whitePage({ id: "page-signal", at: P2[0], until: P2[1], seed: 7, children: [MP_RADAR ? MP("radar", MP_RADAR).layer : docLayer({ id: "doc-radar", src: "assets/media/doc-radar", y: 0.20 })] }));
const P3 = [find("these", 1, 88) - 0.45, endOf("market.") + 0.4];
// the number takes the whole width, then is knocked out of the paper, the page leaving through it (round 7)
const RECAP = MP_RECAP && MP("recap", MP_RECAP);
if (RECAP) add(whitePage({ id: "page-recap", at: P3[0], until: P3[1], seed: 9, handoff: RECAP.meta.handoff != null ? RECAP.meta.from + RECAP.meta.handoff : null, children: [RECAP.layer] }));
else add(whitePage({ id: "page-recap", at: P3[0], until: P3[1], seed: 9, children: [docLayer({ id: "doc-funnel", src: "assets/media/doc-funnel", y: 0.19 })],
  knockout: { text: "95%", count: { to: 95, at: find("ninety-five") - 0.05, dur: 0.8 }, at: find("market.") - 0.35, y: 0.43 } }));

// ── THE CAMERA: the opening de-zoom, the jump cuts wide / close, a punch on a payoff word ───────────────────────
const PUNCH = [find("qualified"), find("ninety-five")];
const STEPS0 = openingSteps(SHOTS.joins.filter(j => !PAPER.some(([a, b]) => j > a - 0.05 && j < b + 0.05)), PUNCH);
// the knocked-out number shows the face: the camera pushes in on it while the letters are windows, and pulls back as
// the page leaves through them (round 7)
const KO_AT = find("market.") - 0.35, KO_END = endOf("market.") + 0.4;
const KO_STEPS = RECAP ? (RECAP.meta.camera || []).map(([t, ...r]) => [RECAP.meta.from + t, ...r]) : [[KO_AT, 1.9, 0.5, 0.5, "out"], [KO_END + 0.05, 1.0, 0.6, 0.5, "out"]];
export const STEPS = [...STEPS0.filter(st => !(st[0] > KO_AT - 0.1 && st[0] < KO_END + 0.7)), ...KO_STEPS].sort((a, b) => a[0] - b[0]);
EXTRA_CUES.push({ t: find("ninety-five"), kind: SFX + "riser.wav", gain: -14, align: 1.765 });   // ends ON the payoff

// ── THE WORDS, drawn last ─────────────────────────────────────────────────────────────────────────────────────
const HOT = ["message", "list", "qualified", "three", "decide", "timing", "ninety-five", "percent"], SCRIPT = ["wonder", "market"];
// AT THE TOP, BEHIND YOU (Dynamic text's place; Ihsane, 2026-10-14: « au-dessus de moi, un peu derrière moi »): the zoom
// leaves the wall above the head for them (P.zoom > 1); the top of the room in shadow so the white reads on a light wall
const TOP = (P.zoom ?? 1) > 1;
if (TOP) BEATS.unshift(shade({ id: "shade", from: 0, to: END, frame, bottom: 0.40, alpha: 0.55 }));   // first: under everything
const QUIET = TOP ? [] : BEATS.filter(b => b.kind === "print").map(b => b.held ?? [b.from, b.to]);
const words = dtHeadlines({ words: WORDS, skip: [[0, HOOK_END]], glitchFirst: false, hot: HOT, script: SCRIPT, quiet: QUIET, frame, end: END, place: TOP ? "top" : "low",
  front: [...BEATS.filter(b => b.kind === "cutaway").map(b => [b.from, b.to]), [KO_END - 0.3, KO_END + 1.0]],   // the camera still close after the number: the words in front
  paper: BEATS.filter(b => b.kind === "page").map(b => b.held) });
add(words);
EXTRA_CUES.push(...words.extraCues);
