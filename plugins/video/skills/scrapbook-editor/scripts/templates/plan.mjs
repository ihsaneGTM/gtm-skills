// THE PLAN — a short in THE SCRAPBOOK LANGUAGE (scrapbook-editor/SKILL.md § The scrapbook language).
//
// The take is cut tight (tighten.py: every pause gone, the joins are jump cuts) and the frame
// becomes a scrapbook the speaker talks through, cut as in After Effects. The look was VALIDATED by
// the user on 2026-10-05 (the development cut: ../example/plan.mjs in the skill): reproduce it, the
// same figures at the same sizes, places, motion and sounds.
//   · THE HOOK: the reference's three lines in TWO FACES — a white line, THE word in yellow Fraunces
//     with white words beside it, a line on paper — landing one after the other from the first frame
//   · STICKERS around the head: die-cut emoji with a thick white border, slapped on one per word,
//     its tag under it on one ruled scrap in the marker hand
//   · POLAROIDS: a real reaction GIF (GIPHY: gif.mjs sheet → get) as a print (border, tape, its
//     caption on the chin in the marker hand), 0.80 of the width, ALWAYS AT THE SAME PLACE (F.slot():
//     the middle of the screen, under the face's centre), dropped on with a shutter, flicked away
//   · PAPER (the reference's: a collage of small ruled notebook scraps, flat, the words on it in a
//     MARKER HAND: project.json `paperFont`, Gochi Hand by default; hands.mjs the others) ONLY for the titles and
//     two or three very important phrases (the captions already say the words); every paper travels
//     in, lands and unfolds, breathes (two poses, 4 a second), folds back up; a real paper sound on
//     each. The RED MARKER draws on it as it is said: a word struck out, a line under, a circle
//   · THE KEY IDEA of a sentence in the two faces (a white word, the important one in colour), no paper
//   · A LIST said in passing, the asides: stickers, one per word
//   · SECTIONS: the name on the scraps swinging in, its second line on scraps under it, the marker
//     underlining it (a number on a ruled tile; a list video: each item a section, 1 to 5); the
//     camera punches in
//   · PROOF: the real screens, screenshots and recordings, on the face, red boxes and arrows
//   · THE CAMERA: every jump cut alternates the frame wide / close; the opening frame settles
//   · THE CAPTIONS: low, word by word, three words at most, the word being said in the accent
// Everything casts a soft shadow; everything that moves is motion-blurred. A music bed under it all
// (music.mjs: Hip Hop 02 by default, 15 LU under the voice, dropping on a change of scene):
//   node __SKILL__/music.mjs plugins/video/assets/music/mixkit-hip-hop-02-738.mp3 --start 0 --under 15 [--drop <SCENE>]
//
// Every time is a word ONSET of words.json (the tightened take, tighten.py): on(i) / at(s) put it on
// the output. Look at it with the engine's preview.mjs, then build.sh --slice, before building.
import fs from "node:fs";
const E = "__ENGINE__/";      // the short-editor engine: the timeline, the build, the checks
const S = "__SKILL__/";       // this skill's figures
const { srcToOut } = await import(E + "cuts.mjs");
const { captions } = await import(S + "captions.mjs");
const { label, title, hookTitle, header, sweep } = await import(S + "paper.mjs");
const { card, loadCards } = await import(S + "cards.mjs");
const { connect, sticker, waveform, voiceLevels, loadBits } = await import(S + "bits.mjs");
const { mark } = await import(S + "marker.mjs");
const { faces } = await import(S + "face.mjs");
const { cue, camera, punches } = await import(S + "book.mjs");

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const frame = { w: P.width, h: P.height, fps: P.fps };
const END = P.duration;
// a second of the tightened take (words.json, source/tight.mov) → the OUTPUT second (the speed)
export const at = s => +srcToOut(s, P).toFixed(3);
const W = JSON.parse(fs.readFileSync("words.json", "utf8"));
// word i of words.json: its onset (on) and its end (off) on the output
export const on = i => at(W[i].s);
export const off = i => at(W[i].e);
const WORDS = W.map(w => ({ w: w.w, s: at(w.s), e: at(w.e) }));
const SHOTS = fs.existsSync("shots.json") ? JSON.parse(fs.readFileSync("shots.json", "utf8")) : { shots: [[0, END]], joins: [] };
// the jump cut at or just after t (within 0.35 s), else t
export const cutAfter = (t, within = 0.35) => SHOTS.joins.find(j => j >= t - 0.02 && j <= t + within) ?? t;
// the next jump cut after t, else t + d
export const nextCut = (t, d = 1.2) => SHOTS.joins.find(j => j > t + 0.3) ?? Math.min(END, t + d);

// ── THE CAMERA — every jump cut alternates the frame wide (1.0) / close (1.08), on the cut; the
// opening frame settles from tight; a section punches in (give its times); a change of SCENE (a
// teaser shot at the end: find it in the frame's light, not in shots.json) pushes in slowly.
const SCENE = null;                      // e.g. 43.3, the frame where another scene starts
export const STEPS = punches({ joins: SHOTS.joins, sections: [/* on(28), on(96) */], scene: SCENE, end: END });
const cam = camera(STEPS, P);
const F = faces(P, cam);                 // assets/faces.json (face.mjs), through the camera
const SLOT = F.slot();                   // where EVERY polaroid of the video lands
const FACE = F.faceLine();               // the face's own line: key ideas and punch phrases over the face

export async function load({ layer }) { if (layer === "over") { await loadCards(); await loadBits(); } }
export const BEATS = [];
const add = (...b) => BEATS.push(...b.flat());
// sounds the plan places itself: the riser climbing into a payoff or a change of scene, money said
// EXTRA_CUES.push(cue("rise", on(57)));          // its crest ON that moment
export const EXTRA_CUES = [];
const KW = 0.093, PUNCH = 0.112;    // a keyword's face, a punch phrase's (fractions of the width)

// ── 1. THE HOOK (0 → the end of the hook sentence): the reference's three lines, above the eyebrows
// const fy = F.over(0, on(24)).y, y3 = Math.min(0.278, fy - 0.035), y2 = y3 - 0.071, y1 = y2 - 0.059;
// add(hookTitle({ at: 0, until: on(24), frame, y: [y1, y2, y3], pulseAt: on(12),
//   rows: [{ runs: [{ text: "I'm now doing", kind: "sans", size: 0.075 }] },
//     { runs: [{ text: "sales calls", kind: "serif", size: 0.135 }, { text: "as a", kind: "sans", size: 0.066 }] },
//     { runs: [{ text: "service", kind: "paper", size: 0.089 }] }] }));
// BEATS.push({ id: "hook-mute", from: on(8), to: off(16), layer: "over", mutesCaptions: true, draw() {} });   // the title says it
// EXTRA_CUES.push(cue("swish", 0.12, { lu: 24 }));                         // the opening frame settling

// ── 2. STICKERS around the head, one per word of what the hook lists (x 0.13 / 0.87, clear of the hair)
// add(sticker({ emoji: "☎️", text: "cold calls", x: 0.135, y: 0.36, at: on(13), until: on(24) - 0.09, size: 0.15, rot: -9, frame }));
// add(sticker({ emoji: "🔍", text: "prospects", x: 0.865, y: 0.38, at: on(16), until: on(24) - 0.06, size: 0.15, rot: 8, frame }));

// ── 3. A POLAROID — a real GIF by the meme's own name: node __SKILL__/gif.mjs sheet "pepe silvia" "…"
// (look at tmp/gif-….jpg), then gif.mjs get <id> --name pepe (or media.mjs for a GIF the user drops in)
// add(card({ id: "search", src: "assets/media/pepe", style: "meme", at: on(40), until: on(48) - 0.04, ...SLOT, caption: { text: "thousands of platforms" }, frame }));

// ── 4. THE KEY IDEA in the two faces (no paper); A LIST said in passing, the asides: stickers ───
// add(title({ id: "waterfall", at: on(36), until: on(38), frame, y: [FACE.y - 0.045, FACE.y + 0.03], mutesCaptions: true,
//   rows: [{ runs: [{ text: "waterfall", kind: "sans", size: 0.095 }] }, { runs: [{ text: "enrichment", kind: "serif", size: 0.15 }] }] }));
// add(sticker({ emoji: "👍", text: "the good", x: 0.14, y: 0.33, at: on(134), until: on(146) - 0.16, size: 0.14, rot: -8, frame }));
// add(sticker({ emoji: "📍", text: "Station F", x: 0.86, y: 0.40, at: on(25), until: on(28) - 0.07, size: 0.14, rot: 8, frame }));

// ── 5. A PUNCH PHRASE ON PAPER OVER THE FACE (two or three in a short; it is the caption) ─────────
// add(label({ lines: ["expert SDR"], at: on(83), until: on(90), x: 0.5, y: FACE.y - 0.01, size: PUNCH, mutesCaptions: true,
//   strike: { word: "expert", at: on(85) + 0.12, dur: 0.2 }, frame }));

// ── 6. A SECTION — the name swinging in, its second line, the underline; the captions step aside ─
// (saidUntil: the end of the header's last word; put its time in `sections` above for the punch)
// add(header({ id: "pipecorn", name: "Pipecorn", sub: "data providers", at: on(28), subAt: on(32), until: on(34), saidUntil: off(33), frame, y: 0.135 }).beats);
// add(header({ id: "h2", n: 2, name: "Competitor", sub: "ads-extractor", at: on(82), nameAt: on(84), subAt: on(85), until: on(90), saidUntil: off(86), frame, dir: -1 }).beats);

// ── 7. PROOF: the real screen on the face (screenshot, recording, phone), red notes ───────────────
// add(card({ id: "chat", src: "assets/media/chat.png", style: "shot", at: on(70), until: on(79), x: 0.5, y: 0.45, w: 0.74,
//   notes: [{ kind: "box", x: 0.08, y: 0.55, w: 0.33, h: 0.12, at: on(70) }, { kind: "arrow", from: [0.18, 0.36], to: [0.18, 0.52], at: on(70) }],
//   cursor: { path: [[on(70), 0.6, 0.9], [on(72), 0.5, 0.75]] } }));
// add(connect({ a: { src: "assets/media/gmail.png", bg: "#FFFFFF" }, b: { src: "assets/media/phone.png" }, at: on(50), bAt: on(52), until: on(54) + 0.25,
//   x: 0.5, y: FACE.y + 0.02, frame }));
// add(card({ id: "readme", src: "assets/media/readme.png", style: "phone", at: on(120), until: on(131), x: 0.5, y: 0.36, w: 0.58, h: 0.42,
//   scroll: { from: 0, to: 0.8, steps: 4 } }));          // capture.mjs <url> --name readme --phone --tall
// add(waveform({ at: on(178), until: on(181), levels: voiceLevels(P, { engine: E }), x: 0.5, y: 0.5, frame }));
// a marker on the picture itself (an arrow, a circle round something in the frame)
// add(mark({ kind: "arrow", at: on(40), until: on(44), from: [0.2, 0.62], to: [0.36, 0.52], frame }));

// ── 8. A CHANGE OF SCENE — the paper sweeps it in (the riser climbing into it, the music dropping
// on it: music.mjs --drop <SCENE>), then the ask ────────────────────────────────────────────────
// add(sweep({ at: SCENE, frame }));
// EXTRA_CUES.push(cue("rise", SCENE - 0.02));
// add(label({ lines: ["next episode ☎️"], at: SCENE + 0.3, until: END, x: 0.5, y: 0.2, size: 0.1, frame }));

// ── THE CAPTIONS, drawn last: on top of everything, off while a header or a phrase says the words
add(captions({ words: WORDS, frame, until: END, mutes: () => BEATS.filter(b => b.mutesCaptions) }));
