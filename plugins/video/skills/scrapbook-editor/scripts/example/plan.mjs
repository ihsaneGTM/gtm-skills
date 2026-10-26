// THE PLAN — "sales calls for Pipecorn", in THE SCRAPBOOK LANGUAGE (scrapbook-editor/SKILL.md).
// v3 (2026-10-05), after the second review (« pas qualitatif: les polices, les couleurs, pas
// dynamique, aucune ombre, les GIFs placés au hasard », « inspire-toi d'After Effects »): Archivo,
// shadows under everything, the camera punching on the jump cuts, polaroids always in the same
// place, die-cut stickers, the red marker drawing as it is said, the Motionix pack beside the paper.
// v3.1, after the third (« les petits papiers de mon exemple de référence en eux-mêmes », « pas de
// dégradé sur le papier », « une musique de fond »): the reference's ruled scraps and torn newsprint,
// flat and white; Convergence under it all, 15 LU under the voice, dropping into the teaser
// (node music.mjs …/convergence.mp3 --start 16.6 --under 15 --drop 43.3).
// v3.2, after the fourth (« le papier de Pipecorn, c'est pas le bon », « deux polices: un mot important
// en couleur, une très belle police », « l'effet papier que pour les titres et les mots très
// importants »): one paper (the ruled scraps) for the hook's paper line, the sections, two punch
// phrases and the ask; the reference's two faces (white Archivo, THE word in yellow Fraunces); the
// lists and the asides as stickers.
// v3.4, with the GIPHY key: the four polaroids are real reaction GIFs, found by the meme's own
// name (gif.mjs search "pepe silvia" / "key and peele sweating" / "buddy the elf phone" / "michael buffer",
// then gif.mjs get <id> --name pepe --width 0.80 …), credited in assets/media/credits.json.
// v3.5 (« les gifs un peu trop petits: plus gros, un peu plus bas »): the polaroids 0.80 of the width
// at F.slot() (now 0.08 under the face's centre); what is written over the face stays on F.faceLine().
// VALIDATED by the user on 2026-10-05 (« ce style de montage est validé »), with Hip Hop 02 under it
// (node music.mjs …/mixkit-hip-hop-02-738.mp3 --start 0 --under 15 --drop 43.3): the look the skill reproduces.
import fs from "node:fs";
const E = "__ENGINE__/";
const S = "__SKILL__/";
const { srcToOut } = await import(E + "cuts.mjs");
const { captions } = await import(S + "captions.mjs");
const { label, title, hookTitle, header, sweep } = await import(S + "paper.mjs");
const { card, loadCards } = await import(S + "cards.mjs");
const { connect, sticker, loadBits } = await import(S + "bits.mjs");
const { faces } = await import(S + "face.mjs");
const { cue, camera, punches } = await import(S + "book.mjs");

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const frame = { w: P.width, h: P.height, fps: P.fps };
const END = P.duration;
export const at = s => +srcToOut(s, P).toFixed(3);
const W = JSON.parse(fs.readFileSync("words.json", "utf8"));
export const on = i => at(W[i].s);
export const off = i => at(W[i].e);
const WORDS = W.map(w => ({ w: w.w, s: at(w.s), e: at(w.e) }));
const SHOTS = fs.existsSync("shots.json") ? JSON.parse(fs.readFileSync("shots.json", "utf8")) : { shots: [[0, END]], joins: [] };
const TEASER = 43.3;                                   // the change of scene (measured: the frame's light jumps there)

// ── THE CAMERA — v3: it punches (book.mjs punches()): the opening frame settles from tight, every
// jump cut alternates wide (1.0) and close (1.08), the two sections punch in, the teaser pushes in
export const STEPS = punches({ joins: SHOTS.joins, sections: [on(28), on(96)], scene: TEASER, end: END });
const cam = camera(STEPS, P);
const F = faces(P, cam);

export async function load({ layer }) { if (layer === "over") { await loadCards(); await loadBits(); } }
export const BEATS = [];
const add = (...b) => BEATS.push(...b.flat());
export const EXTRA_CUES = [];
const KW = 0.093, PUNCH = 0.112;                    // a keyword's face, a punch phrase's
const SLOT = F.slot();                               // where every polaroid lands (v3.4: bigger, lower)
const FACE = F.faceLine();                           // the face's line: what is written over the face

// ── 1. THE HOOK, 0 → "in" (Station F next): the reference's three lines — white words, THE word in
// yellow Fraunces, a line on paper (« how to turn / Claude into your / creative studio »), above the
// eyebrows (the reference's spacing: 0.059 and 0.071 of the height between the lines)
const T_END = on(24);
const fy = F.over(0, T_END).y;
const y3 = Math.min(0.278, fy - 0.035), y2 = y3 - 0.071, y1 = y2 - 0.059;
add(hookTitle({ at: 0, until: T_END, frame, y: [y1, y2, y3], pulseAt: on(12),
  rows: [{ runs: [{ text: "I'm now doing", kind: "sans", size: 0.075 }] },
    { runs: [{ text: "sales calls", kind: "serif", size: 0.135 }, { text: "as a", kind: "sans", size: 0.066 }] },
    { runs: [{ text: "service", kind: "paper", size: 0.089 }] }] }));
// the title says it: the captions step aside from "I am now doing" to "service"
BEATS.push({ id: "hook-mute", from: on(8) - 0.05, to: off(16), layer: "over", mutesCaptions: true, draw() {} });
// the opening frame settles from tight with a light whoosh
EXTRA_CUES.push(cue("swish", 0.12, { lu: 24 }));

// ── 2. WHAT THE SERVICE IS, around the head: four stickers, one a word
add(sticker({ emoji: "☎️", text: "cold calls", x: 0.135, y: 0.36, at: on(13), until: T_END - 0.09, size: 0.15, rot: -9, frame }));
add(sticker({ emoji: "🔍", text: "prospects", x: 0.865, y: 0.38, at: on(16), until: T_END - 0.06, size: 0.15, rot: 8, frame }));
add(sticker({ emoji: "📊", text: "data", x: 0.13, y: 0.58, at: on(19), until: T_END - 0.03, size: 0.145, rot: 7, frame }));
add(sticker({ emoji: "📅", text: "booked calls", x: 0.86, y: 0.60, at: on(22), until: T_END, size: 0.145, rot: -7, frame }));

// ── 3. "here in Station F" — an aside: a sticker by the head (the paper is for titles)
add(sticker({ emoji: "📍", text: "Station F", x: 0.86, y: 0.40, at: on(25), until: on(28) - 0.07, size: 0.14, rot: 8, frame }));

// ── 4. "called Pipecorn. They are the data providers." — a section (no number)
add(header({ id: "pipecorn", name: "Pipecorn", sub: "data providers", at: on(28), subAt: on(32), until: on(34), saidUntil: off(33),
  frame, y: 0.135 }).beats);

// ── 5. "They do waterfall enrichment" — the key idea in the two faces, over the face: a white word,
// the important one in yellow Fraunces
add(title({ id: "waterfall", at: on(36), until: on(38), frame, y: [FACE.y - 0.045, FACE.y + 0.03], mutesCaptions: true,
  rows: [{ runs: [{ text: "waterfall", kind: "sans", size: 0.095 }] }, { runs: [{ text: "enrichment", kind: "serif", size: 0.15 }] }] }));

// ── 6. "search through thousands of … platforms" — the polaroid: Pepe Silvia (GIPHY)
add(card({ id: "search", src: "assets/media/pepe", style: "meme", at: on(40), until: on(48) - 0.04, ...SLOT,
  caption: { text: "thousands of platforms" }, frame }));

// ── 7. "and get emails and phone numbers" — the two real icons as stickers, the marker's arrow
add(connect({ a: { src: "assets/media/gmail.png", bg: "#FFFFFF" }, b: { src: "assets/media/phone.png" }, at: on(50), bAt: on(52), until: on(54) + 0.25,
  x: 0.5, y: FACE.y + 0.02, size: 0.22, frame }));

// ── 8. "It's like the step one, step ahead … I'm using my platform to call" — a sticker as he says "call"
const fc = F.over(on(73), on(75));
add(sticker({ emoji: "📲", x: Math.min(0.84, fc.x + fc.w + 0.13), y: fc.y + fc.h * 0.5, at: on(73), until: off(74) + 0.3, size: 0.17, rot: 12, frame }));

// ── 9. "and full disclosure, I'm not like the best" — the polaroid: Key & Peele sweating (GIPHY)
add(card({ id: "nervous", src: "assets/media/sweating", style: "meme", at: on(76), until: on(82) - 0.02, ...SLOT,
  caption: { text: "full disclosure" }, frame }));

// ── 10. "I'm not an expert SDR" — the phrase, "expert" crossed out as it is said
add(label({ lines: ["expert SDR"], at: on(83), until: on(90), x: 0.5, y: FACE.y - 0.01, size: PUNCH, rot: -1.5, mutesCaptions: true,
  strike: { word: "expert", at: on(85) + 0.12, dur: 0.2 }, frame }));

// ── 11. "why I built Klesos, to help beginners in sales" — the product, as a section
add(header({ id: "klesos", name: "Klesos", sub: "for sales beginners", at: on(96), subAt: on(99), until: on(102), saidUntil: off(101),
  frame, y: 0.135, dir: -1 }).beats);

// ── 12. "how to get through a call and what to say on a call" — the polaroid: Buddy the Elf on the phone (GIPHY)
add(card({ id: "script", src: "assets/media/elf", style: "meme", at: on(109), until: on(121), ...SLOT,
  caption: { text: "what to say" }, frame }));

// ── 13. "a series of videos" — a sticker
add(sticker({ emoji: "🎬", text: "a series", x: 0.85, y: 0.36, at: on(127), until: on(132), size: 0.15, rot: -8, frame }));

// ── 14. "the good things, the bad things, the fails, the accomplishments, the booked calls" — the
// list as stickers round the head, one per word (the paper is for titles)
const LIST_END = on(146) - 0.04;
add(sticker({ emoji: "👍", text: "the good", x: 0.14, y: 0.33, at: on(134), until: LIST_END - 0.12, size: 0.14, rot: -8, frame }));
add(sticker({ emoji: "👎", text: "the bad", x: 0.86, y: 0.35, at: on(137), until: LIST_END - 0.09, size: 0.14, rot: 8, frame }));
add(sticker({ emoji: "💥", text: "the fails", x: 0.14, y: 0.55, at: on(140), until: LIST_END - 0.06, size: 0.14, rot: 7, frame }));
add(sticker({ emoji: "🎉", text: "wins", x: 0.86, y: 0.57, at: on(142), until: LIST_END - 0.03, size: 0.14, rot: -7, frame }));
add(sticker({ emoji: "📅", text: "booked calls", x: 0.5, y: 0.13, at: on(144), until: LIST_END, size: 0.14, rot: 6, frame }));

// ── 15. "Stay tuned for the series."
add(sticker({ emoji: "👀", text: "stay tuned", x: 0.84, y: 0.42, at: on(146) + 0.06, until: on(151), size: 0.15, rot: 9, frame }));

// ── 16. "comparing other data providers versus Pipecorn and see who wins, who's got the better data"
// — the polaroid: « Let's get ready to rumble » (GIPHY)
add(card({ id: "versus", src: "assets/media/rumble", style: "meme", at: on(156), until: on(162) - 0.02, ...SLOT,
  caption: { text: "vs Pipecorn" }, frame }));
add(sticker({ emoji: "🏆", text: "who wins?", x: 0.77, y: 0.32, at: on(162), until: on(166), size: 0.17, rot: 10, frame }));
add(title({ id: "better-data", at: on(167), until: TEASER - 0.18, frame, y: [F.top(on(167), TEASER) + 0.02],
  rows: [{ runs: [{ text: "better", kind: "sans", size: 0.08 }, { text: "data", kind: "serif", size: 0.13 }] }] }));

// ── 17. The teaser: a cold call, "Where did you get my number?" — the paper sweeps the scene in,
// the riser climbing into it; the next episode announced on paper over the ceiling
add(sweep({ at: TEASER, frame }));
EXTRA_CUES.push(cue("rise", TEASER - 0.02));
add(label({ lines: ["next episode ☎️"], at: TEASER + 0.3, until: END, x: 0.5, y: 0.2, size: 0.1, rot: -1.5, frame }));

// ── THE CAPTIONS, drawn last
add(captions({ words: WORDS, frame, until: END, mutes: () => BEATS.filter(b => b.mutesCaptions) }));
