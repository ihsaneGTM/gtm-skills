// THE PLAN — what is drawn, and when. THE VERTICAL LANGUAGE (2026-09-29), built and
// corrected in four passes on a real short; scripts/example/plan.mjs is that reference
// plan, every figure used for real
//
// The rules, each one a verdict (short-editor/SKILL.md, "The vertical language"):
//   · the speaker's words at the TOP of the frame, big — Impact capitals, ONE script accent per
//     screen (Sacramento) written across a yellow word — on the UNDER layer, so where
//     their head rises into them it covers them. occlusion.mjs is the gate (18 % / 30 %).
//   · a word with no room outside their head is dropped from the screen, never changed.
//   · never a capture over a shot where they already SHOW the screen.
//   · on an illustrated plate (the paper sheet) no Impact + script: discreet subtitles,
//     Impact only, in ink; what is ON the paper moves in stop-motion (8 poses a second).
//   · no bullet lists; every number on screen is a claim; the real logos, the real product.
//   · the sound of what is drawn comes WITH it: the flash on a hard cut, the click of the SFX
//     pack when a logo appears or a sticker lands (edl.mjs has the rest of the sound).
//   · the OLD-RADIO HOOK is a bonus, asked every time: project.json `look` (and `voiceFx`
//     for the voice) — lookBeats() below draws nothing without it.
//   · THE EXPLAINER'S LIGHT AND MOTION on what is over the speaker (validated 2026-10-05,
//     figures.mjs): every headline word with a shadow in two layers, the yellow ones glowing, a
//     short blur on the pop, a real exit that ends on the next screen's first word (never two
//     screens in the same place); the stickers' shadow lifts with them; a logo out from behind
//     the speaker is motion-blurred, lit, with a swish of the Motionix pack. The paper keeps its
//     stop-motion: only the shadows change there.
//   · an END on paper (paperend.mjs): a countdown on scraps stuck on the jacket, the next video
//     taped on a sheet with its sticker; never a dark stage. The Pipecorn generic, when the brief
//     asks it, is added after the render (generic.mjs, plugins/video/references/pipecorn-generic.md).
//
// Every `t` is a word onset of words.json (the SOURCE); at() makes it an output time.
import fs from "node:fs";
const S = "__SCRIPTS__/";
const { headlines, shade, imp, scr, line, layoutHeadline } = await import(S + "headline.mjs");
const { proHeadlines, proStickers, proChips } = await import(S + "figures.mjs");
const { paperCountdown, tapedClip, labelSticker } = await import(S + "paperend.mjs");
const { cover } = await import(S + "illustrate.mjs");
const { stickers, strokes, INK } = await import(S + "hand.mjs");
const { speaker } = await import(S + "speaker.mjs");
const { C, createCanvas } = await import(S + "scene.mjs");
const { drawBrand } = await import(S + "brand.mjs");
const { flash } = await import(S + "titles.mjs");
const { currentLook, lookBeats } = await import(S + "looks.mjs");
const SFX = "sample:sfx-top5/";     // the SFX pack, copied into assets/ by init.sh

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const frame = { w: P.width, h: P.height };
export const at = t => +(t / (P.speed ?? 1)).toFixed(3);
const END = P.duration;
// the hard cuts, from the source's scene score (a cut is where a flash goes):
// ffmpeg -i <source> -vf "scale=160:-2,select='gt(scene,0.30)',showinfo" -f null - 2>&1 | grep pts_time
// export const CUT = at(4.4833);

// ── THE CAMERA — [t, zoom, ramp, anchorX, ease] (ease "out" | "inout"; anchorY is in
// project.json, on the eyes, so a zoom grows the head DOWN, away from the headlines).
// The opening de-zoom carries a whoosh (edl.mjs); after it, a punch only on a word
// that carries the argument, released on the next phrase.
export const STEPS = [
  [0.00, 1.30, 0.00, P.anchorX ?? 0.5],
  [0.00, 1.00, 0.62, P.anchorX ?? 0.5, "out"],
  // [at(6.98), 1.12, 0.10, 0.40],             // a punch on a payoff word (a swoosh_in)
  // [at(8.10), 1.00, 0.34, 0.40, "out"],      // released on the next phrase
];
// the person matte through this camera, for a figure that follows the head
// (needs matte.mjs first): const SPK = await speaker(process.cwd(), { steps: STEPS });

// ── THE IMAGES — the real app icons, drawn by brand.mjs, never generic glyphs
const LOGO = {};
export async function load() {
  for (const k of ["youtube", "tiktok", "instagram", "seo"]) {
    const c = createCanvas(512, 512);
    drawBrand(c.getContext("2d"), k, 256, 256, 512, { shadow: false });
    LOGO[k] = c;
  }
}

export const BEATS = [];
const add = (...b) => BEATS.push(...b);
const w = (text, size, src, extra = {}) => imp(text, size, { t: at(src), ...extra });
const s = (text, size, src, extra = {}) => scr(text, size, { t: at(src), ...extra });

// the top of the room in shadow, BEHIND the speaker: white Impact does not hold on a bright
// ceiling or window without it, and a script word disappears outright
add(shade({ id: "shade", from: 0, to: END, frame, bottom: 0.47, alpha: 0.55 }));

// ── THE SPEAKER'S WORDS, AT THE TOP (proHeadlines: the engine's layout, the explainer's light;
// `glitch: { t, dur, words }` draws the pack's glitch on the one word it sounds on) — one screen
// per phrase, each word on its own onset, the
// payoff word yellow (`hot`), one script run crossing the line above it (`overlap`,
// `dx`, `rot`). Sizes are px at 1080 wide; a script size is a SNELL size, drawn at
// the x-height that matches it. Where the speaker holds something in the lower half, the block
// goes top-left (x 0.055, align left, maxW 0.50) and its right edge slides behind them.
// The feed's safe zones (plugins/video/references/safe-zones.md): the block stays inside x 0.095–0.905,
// y 0.128–0.774 (layoutHeadline keeps it there, occlusion.mjs fails a line under the feed's interface).
// A TIGHT SHOT whose head fills the top of the safe area: the words BELOW the head, in front of them:
//   const LOW = { x: 0.5, y: 0.765, anchor: "bottom", align: "center", maxW: 0.80, layer: "over" };
const TOP = { x: 0.5, y: 0.172, align: "center", maxW: 0.81, layer: "under" };
add(...proHeadlines([
  // { ...TOP, id: "h1", glitch: { t: at(6.98), dur: 0.22, words: ["GTM"] }, lines: [
  //   line(at(6.36), w("OR", 118, 6.36), w("JUST", 118, 6.60), w("A", 118, 6.80)),
  //   line(at(6.98), w("GTM", 272, 6.98, { hot: true }), w("GUY", 272, 7.36, { hot: true })),
  //   line(at(7.52), s("like", 165, 7.52), s("me,", 165, 7.86), { overlap: 0.46, dx: 0.235, rot: -6 }),
  // ] },
], { frame, end: END }));

// ── A PAPER PLATE — the frame becomes a sheet; it is a scene TRANSITION, so the pack's
// whoosh carries it (edl.mjs) and its own `sheet_in` stays under it. On it: the words as
// DISCREET subtitles (Impact 66 px, ink, no pop), the real logos as stickers and marker
// strokes in STOP-MOTION — they sound on their poses: the pack's click when a sticker
// lands (`land`), a ptick while it settles, a felt on each stroke of a mark.
// const STOP = 8;
// const SUBT = { color: INK.graphite, hot: INK.graphite, shadow: 0, dim: 0, pop: 1, layer: "over",
//   mutesCaptions: false, x: 0.5, y: 0.215, align: "center", maxW: 0.86, gap: 0.20 };
// const subtitles = headlines([
//   { ...SUBT, id: "p-sub1", lines: [
//     line(at(16.58), w("YOU", 66, 16.58), w("HAVE", 66, 16.90), w("TO", 66, 17.08), w("KNOW", 66, 17.22)),
//   ] },
// ], { frame, end: END + 1 });
// const stick = proStickers({ id: "p-logos", from: 14.86, to: END + 1, frame, layer: "over", size: 360, stepFps: STOP,
//   land: { kind: SFX + "click.wav", gain: -11, align: 0.005 },
//   items: [{ img: () => LOGO.youtube, x: 0.285, y: 0.470, rot: -6, t: at(17.40) }] });
// const marks = strokes({ id: "p-marks", from: 14.86, to: END + 1, frame, layer: "over", stepFps: STOP, items: [
//   { t: at(18.16), kind: "check", center: [0.405, 0.528], size: 250, style: "marker", color: C.green, width: 24, dur: 0.42 },
// ] });
// const plate = cover({ id: "c-plate", from: 14.86, to: END + 1, at: 14.86, frame, stencil: null,
//   enter: "drop", enterDur: 0.26, exit: "tear", exitDur: 0.40, doSketch: false, doRim: false, grid: "quad",
//   children: [...subtitles, stick, marks], mutesCaptions: false });
// add(...plate.beats);

// (Logos going ROUND the head — behind.mjs orbit() — were refused in review as AI slop, and a
// wall of big logos tried in their place too. What the speaker names comes out from BEHIND
// them: screen({ emergeFrom }), proChips(): blurred as it flies, lit, a swish.)
// add(proChips({ id: "logo-hook", from: at(5.78), to: at(6.67), frame, size: 400, exit: 0.05,
//   items: [{ img: () => LOGO.youtube, x: 0.115, y: 0.335, fromX: 0.40, rot: -8, t: at(5.81) }] }));

// ── THE END ON PAPER, when the take ends on a next video (the reference: the sales-calls intro,
// SKILL.md "What was decided"). The COUNTDOWN on paper scraps stuck on the jacket, one a beat of
// the music, the riser (edl.mjs) ending dead on the cut; then the next video TAPED on a sheet
// that drops over the cut, a sticker on it, its words as the plate's subtitles.
// add(paperCountdown({ id: "countdown", labelAt: at(41.2), digits: [41.65, 42.1, 42.56, 43.01, 43.47].map(at), end: CUT + 0.1, frame, label: "STITCH INCOMING" }));
// const NEXT = [];                                  // its frames: one image per output frame (loadImage)
// const taped = tapedClip({ at: CUT + 0.13, frame, x: 0.5, y: 0.565, w: 740, rot: -2.5, frames: () => NEXT, clipFrom: CUT });
// const label = labelSticker({ at: CUT + 0.72, frame, text: "NEXT EPISODE", x: 0.31, y: 0.752, rot: -5 });
// const nextPlate = cover({ id: "c-next", from: CUT - 0.05, to: END + 1, at: CUT - 0.05, frame, stencil: null,
//   enter: "drop", enterDur: 0.26, exit: "fade", exitDur: 0.3, doSketch: false, doRim: false, grid: "quad",
//   children: [taped, label], mutesCaptions: false });
// add(...nextPlate.beats);

// ── THE FINISH, drawn last so it covers everything above ─────────────────────────
// the bonus look's own layer (CRT glass, film dust, the VHS "PLAY") — nothing unless
// project.json has a `look` — then the FLASH on the hard cut over it: the frame blows out
// to white, the cut passes under the white (titles.mjs flash, measured on the pack's
// video), and the pack's camera flash lands on the cut. A look ends on that cut.
add(...lookBeats(currentLook(P), { frame }));
// add(flash({ id: "flash-cut", at: CUT, frame, sound: SFX + "camera-flash.wav", gain: -7, align: 0.255 }));
