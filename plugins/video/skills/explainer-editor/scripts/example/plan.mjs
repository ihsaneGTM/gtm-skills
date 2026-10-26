// THE PLAN — a take in THE EXPLAINER LANGUAGE (explainer-editor/SKILL.md § The explainer language).
//
// The take: sales calls as a service for Pipecorn (waterfall enrichment), Klesos, the series,
// Pipecorn against the other data providers; it ends on a wide shot of a real call.
// Seven scenes joined by camera moves, something new on the stage every second or so, each
// with its light sound (the Motionix pack; the house pack's whoosh on every scene change).
// Every time is an OUTPUT second: on(i) is the onset of word i of words.json.
import fs from "node:fs";
const SK = "__SKILL__/";
const { stage, words, preview } = await import(SK + "stage.mjs");

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const W = words(P);
export const on = i => W[i].s;
export const end = i => W[i].e;
const END = P.duration;

// ── THE BREATHERS: the confession full screen; then the end, a glimpse of the NEXT video (the call
//    itself, a wide shot), shown in a frame of its own
export const FULL = [
  [on(75), on(90) - 0.06],                 // "full disclosure, I'm not like the best. I'm not an expert SDR or sales rep,"
  preview(46.233, END, "card", { name: "Other data providers vs Pipecorn", title: ["Next Video", "*Who Has* The Better Data?"], src: { x: 0, y: 0.4375, w: 1, h: 0.5625 } }),   // the next video: a call (the source changes shot at 46.233 s)
];

const S = await stage({ project: P, full: FULL, fix: { klesos: "Klesos", sdr: "SDR" } });
const LOGO = { pipecorn: "assets/logos/pipecorn.png", mail: "assets/logos/gmail.png", phone: "assets/logos/phone.png" };
const SHOT = t => `assets/shots/s_${t.toFixed(2)}.jpg`;

// ── A. "So as I mentioned in my last video, I am now doing sales calls as a service"
S.title(on(0), ["I'm Now Doing", "*Sales Calls* As A Service"]);
const last = S.card(on(6), { player: true, fill: "#151515", x: 0.5, y: 0.37, w: 270, h: 460, enter: "drop", caption: "Last video", captionSize: 30 });     // "last video"
last.move(on(8), { x: 0.27 }, 0.55);                                                                                                   // "I am now…"
const ring = S.icon(on(12), { img: LOGO.phone, x: 0.72, y: 0.31, w: 190, h: 190, ring: [on(12) + 0.1, on(14)] });                       // "sales calls"
S.ping(on(12) + 0.05, ring, { ring: true });
S.pill(on(14), "As a service", { x: 0.72, y: 0.47, w: 330, h: 92, size: 38, enter: "right" });                                          // "as a service"

// ── B. "and I'm working for a startup here in Station F called Pipecorn. They are the data providers."
S.scene(on(19), "whip");
const logo = S.icon(on(19), { img: LOGO.pipecorn, x: 0.5, y: 0.31, w: 270, h: 270 });                                                 // rides in with the camera
logo.set(on(22), { hi: 1, s: 1.07 }, 0.3, "outBack").set(on(22) + 0.45, { hi: 0, s: 1 }, 0.4).sound(on(22), "ping");                // "startup"
S.ping(on(22) + 0.05, logo, { ring: true });
S.pill(on(25), "Station F", { x: 0.79, y: 0.2, w: 290, h: 88, size: 40, enter: "right" });                                              // "Station F"
S.arrow(on(25) + 0.1, [0.64, 0.27], [0.72, 0.235], { bend: 0.4 });
S.text(on(27), "Pipecorn", { x: 0.5, y: 0.445, w: 700, size: 70 });                                                                     // "called Pipecorn."
S.mark(on(28) + 0.1, logo, { kind: "circle", color: "white", width: 4 });
const provider = S.pill(on(32), "The data provider", { x: 0.5, y: 0.56, w: 470, h: 100, size: 38, glyph: "database", enter: "rise" });   // "data providers"
S.mark(on(33), provider, { kind: "underline", color: "red", h: 128, w: 420 });

// ── C. "They do waterfall enrichment, meaning they search through thousands of different data
//       provider platforms and get emails and phone numbers, which is good."
S.scene(on(34), "rise");
S.title(on(36), ["They Do", "*Waterfall* Enrichment"]);
const search = S.prompt(on(34), { text: "Find the email and the phone number…", glyph: "search", x: 0.5, y: 0.3, w: 860, h: 170, size: 32, typeFrom: on(38), typeTo: on(42) });   // rides in, types on "meaning they search"
search.move(on(42), { y: 0.215, s: 0.82 }, 0.5);
const tiles = S.cards(on(42), Array.from({ length: 12 }, (_, i) => ({ glyph: "database", fill: "tile", glyphColor: i % 5 === 2 ? "green" : undefined })),
  { rows: [4, 4, 4], w: 130, h: 130, gapX: 34, gapY: 30, y: 0.43, stagger: 0.045, card: { r: 22 } });                                    // "thousands of different data provider platforms"
tiles.forEach((c, i) => c.set(on(44) + i * 0.09, { hi: 1 }, 0.12).set(on(44) + i * 0.09 + 0.22, { hi: 0 }, 0.25));                     // the search runs through them
S.sound(on(44), "data");                                                                                                                 // …with the sound of data
tiles.forEach((c, i) => c.out(on(48) + 0.02 * i, "sink"));
search.out(on(49), "up");
const mail = S.icon(on(50), { img: LOGO.mail, x: 0.3, y: 0.34, w: 190, h: 190, label: "Emails", size: 34 });                             // "emails"
const tel = S.icon(on(52), { img: LOGO.phone, x: 0.7, y: 0.34, w: 190, h: 190, label: "Phone numbers", size: 34 });                      // "phone numbers"
S.glyph(on(56), "check", { x: 0.5, y: 0.555, w: 130, tile: "green", round: true, sfx: "confirm" });                                                    // "which is good."

// ── D. "It's like the step one step ahead of using my platform. I'm using my platform to call"
S.scene(on(57), "whip");
S.title(on(57), ["Step One,", "Then *My Platform*"]);
const steps = S.list(on(58), [{ label: "Pipecorn: the data", glyph: "database" }, { label: "My platform: the call", glyph: "phone" }], { y: 0.36, w: 760 });
steps.reveal(0, on(60)); steps.focus(0, on(60));                                                                                       // "step one"
S.arrow(on(63), [0.86, 0.33], [0.86, 0.43], { bend: -0.6, head: 22 });                                                                  // "step ahead"
steps.reveal(1, on(66)); steps.focus(1, on(66));                                                                                       // "my platform"
const calling = S.icon(on(73), { img: LOGO.phone, x: 0.5, y: 0.555, w: 150, h: 150, ring: [on(73) + 0.1, on(75)] });                    // "to call"
S.ping(on(73) + 0.05, calling, { ring: true });

// ── (the confession, full screen: FULL[0], the flash on the way in; the music silent there)

// ── E. "which is exactly why I built Klesos, to help beginners in sales just like me know how to get
//       through a call and what to say on a call."
S.scene(on(90) - 0.45, "push");                                                                                                        // opens behind the breather
S.title(on(90), ["Why I Built", "*Klesos*"], { red: 0 });
const klesos = S.pill(on(90) - 0.45, "Klesos", { x: 0.5, y: 0.27, w: 440, h: 132, size: 62, pulse: true, blur: 16 });                           // rides in, blurred
klesos.blurTo(on(96), 0, 0.3).set(on(96), { s: 1.1 }, 0.18, "outCubic").set(on(96) + 0.18, { s: 1 }, 0.35, "outBack").sound(on(96), "select");   // "Klesos"
S.ping(on(96), klesos, { ring: true });
const beginners = S.pill(on(98), "For beginners in sales", { serif: true, x: 0.5, y: 0.39, w: 500, h: 86, size: 42, enter: "drop" });   // "help beginners in sales"
S.wires(on(98) + 0.05, klesos, [beginners]);
S.mark(on(103), beginners, { kind: "frame", color: "red", width: 4, w: 528, h: 112 });                                                 // "just like me"
S.tree(on(109), beginners, [{ text: "Get through a call", glyph: "phone" }, { text: "What to say on a call", glyph: "question" }],
  { y: 0.55, w: 430, h: 112, gap: 36, size: 31, at: [on(109), on(114)] });                                                             // "get through a call", "what to say"

// ── F. "Through this experiment, I'm gonna do a series of videos where I showcase the good things,
//       the bad things, the fails, the accomplishments, the booked calls. Stay tuned for the series."
S.scene(on(120), "whip");
S.title(on(120), ["A Series Of Videos", "On *This Experiment*"]);
const reel = S.cards(on(120), [SHOT(9.5), SHOT(16.5), SHOT(26.5), SHOT(35.0)], { rows: [4], w: 200, h: 356, gapX: 34, y: 0.38, stagger: 0, card: { state: { shade: 0.55 } } });   // rides in, dim
reel.forEach((c, i) => c.set(on(127) + 0.11 * i, { shade: 0, hi: 1 }, 0.2).set(on(127) + 0.11 * i + 0.3, { hi: 0 }, 0.3).sound(on(127) + 0.11 * i, "shutter"));   // "series of videos": a burst of shutters
S.glyph(on(129) + 0.1, "play", { x: 0.5, y: 0.38, w: 120, tile: true, round: true, z: 3, until: on(132) });
reel.forEach((c, i) => c.out(on(132) + 0.04 * i, "up"));
const series = S.list(on(132) + 0.12, [
  { label: "Good things", glyph: "check", glyphColor: "green" },
  { label: "Bad things", glyph: "cross", glyphColor: "red" },
  { label: "Fails", glyph: "cross", glyphColor: "red" },
  { label: "Accomplishments", glyph: "trophy", glyphColor: "yellow" },
  { label: "Booked calls", glyph: "calendar", glyphColor: "green" },
], { w: 680 });
[[0, 134], [1, 137], [2, 140], [3, 142], [4, 144]].forEach(([i, w]) => { series.reveal(i, on(w)); series.focus(i, on(w), 0.55); });
series.unfocus(on(146));                                                                                                               // "Stay tuned…"
S.riser(on(150));                                                                                                                      // …ending on "series."

// ── G. "We're gonna be comparing other data providers versus Pipecorn and see who wins, who's got the better data."
S.scene(on(151), "whip");
S.title(on(151), ["Other Data Providers", "*Versus* Pipecorn"]);
const others = S.cards(on(151), [0, 1, 2, 3].map(() => ({ glyph: "database", fill: "tile" })), { rows: [2, 2], w: 118, h: 118, gapX: 22, gapY: 22, x: 0.24, y: 0.33, card: { r: 22 } });   // rides in
S.text(on(151), "Other data providers", { x: 0.24, y: 0.445, w: 420, size: 34 });
others.forEach((c, i) => c.set(on(155) + 0.06 * i, { hi: 1, s: 1.08 }, 0.15).set(on(155) + 0.06 * i + 0.2, { hi: 0, s: 1 }, 0.3));
others[0].sound(on(155), "data");                                                                                                     // "other data providers"
S.sign(on(158), "VS", { x: 0.5, y: 0.34, size: 110, sfx: "glitch", color: "red", glow: true });                                         // "versus"
S.shake(on(158) + 0.05, 16);
const pc = S.icon(on(159), { img: LOGO.pipecorn, x: 0.76, y: 0.33, w: 230, h: 230, enter: "right", label: "Pipecorn", size: 34 });    // "Pipecorn"
S.glyph(on(162), "trophy", { x: 0.5, y: 0.205, w: 130, tile: false, color: "yellow", enter: "drop", width: 2.4, sfx: "thump" });                     // "who wins"
S.pill(on(164), "Who has the better data?", { serif: true, x: 0.5, y: 0.53, w: 600, h: 96, size: 46, enter: "rise" });               // "who's got the better data"
others.forEach((c, i) => c.set(on(165) + 0.03 * i, { hi: 1 }, 0.15).set(on(166) + 0.03 * i, { hi: 0 }, 0.2));
pc.set(on(167), { hi: 1, s: 1.08 }, 0.25, "outBack").sound(on(167), "ping");

// THE BEATS: the ground, the stage, the captions, the flashes
export const BEATS = S.beats;
export const STEPS = [];
export async function load(o) { await S.load(o); }    // o.layer: the frames of the breathers only where they are drawn
