# Beat catalog

The figures in `scripts/beats.mjs`. Each factory returns `{ id, from, to, draw(ctx, t) }` and is
instantiated in the project's `plan.mjs`, inside `BEATS`. All of them float on the progressive
blur in the graphics band (rows 0 to 700), so each one needs its own entry in `BLUR_WINDOWS`.

Every time you pass is a word onset from `words.json`.

Adding a figure means adding a factory and a section here. The catalog is the vocabulary.

---

## `juggle`: too many channels to keep up with

Platform marks orbiting the frame, then crowding together with a shake as the speaker gets to the
problem.

```js
juggle({
  from: 7.70, to: 15.05, panicFrom: 13.7, panicTo: 14.9,
  items: [{ brand: "youtube", t: 8.66 }, { brand: "tiktok", t: 9.68 }, { brand: "instagram", t: 10.52 }],
})
```

Each mark drops in on the word that names it. `panicFrom` / `panicTo` tighten the orbit and add
the shake. `size` defaults to 118. Marks are drawn as vectors by `brand.mjs` `drawBrand()`:
`youtube`, `tiktok`, `instagram`, `linkedin`, `seo`, `signups`.

**It survived every review round of the first short untouched.** But on 2026-09-29 the same idea in
the vertical language, logos going round the speaker's head (`orbit()`), was rejected as looking like
generic AI filler, and a wall of big logos in its place was refused too. Do not propose circling
logos for this beat again without asking the user first.

## `counters`: which channel actually works

One column per channel, a number spinning up under each. One column can be a `dud` that turns red,
goes grey and gets kicked out of frame at `kickAt`.

```js
counters({ from: 15.3, to: 22.1, kickAt: 21.4, label: "SIGNUPS",
  cols: [{ brand: "youtube", n: 47, t: 15.95 }, { brand: "instagram", n: 2, t: 20.96, dud: true }] })
```

**Every figure here is a claim.** The numbers must be the user's real numbers. A reference cut lost
this beat entirely because the figures were placeholders. Real numbers, or no beat.

## `crowd`: you would need a team, and you do not have one

N black silhouettes in a grid, a running count in a pill, and a red strike through the block.

```js
crowd({ from: 22.15, to: 25.30, n: 10, cols: 5, appearFrom: 22.30,
        strikeAt: 23.82, label: "a team of {n}" })
```

`{n}` in the label counts up as the silhouettes land (0.055 s apart). Plain black silhouettes, not
a mascot repeated: they read as "people" without naming anyone.

## `lockup`: naming the thing

A mark lands in a yellow disc, the name appears under it, a yellow underline draws itself, and a
subline types in with a cursor.

```js
lockup({ from: 28.3, to: 34.7, at: 28.4, title: "Acme", sub: "one line that says what it does", subAt: 32.3 })
```

Use it once, when the speaker names the product. The mark drawn in the disc is a vector in the
code; to show the partner's own logo instead, see `brand-kit.md`.

## `hats`: one person wearing several roles

One portrait in a disc, one variant per role, each wiped in from the top, with a pill label under
it. `hot: true` makes the label yellow.

```js
// plan.mjs
export async function load() {
  await loadBeatImage("seller", "assets/role-seller.png");
  await loadBeatImage("marketer", "assets/role-marketer.png");
}
hats({ from: 4.58, to: 7.62, roles: [
  { key: "seller", label: "Seller", t: 4.70 },
  { key: "marketer", label: "Marketer", t: 6.50, hot: true }] })
```

The images are square busts the user supplies. **They must be variants of ONE base image**: same
pose, framing and crop, with only the hat or prop changed. Independent images drift and read as
different people, which kills the gag. It is a figure that has to earn its place; one reference cut
dropped it as one visual too many.

---

## Shared primitives

Exported from `beats.mjs` for custom figures:

| Function | What it draws |
|---|---|
| `acts` | when the card is on screen; `build: true` plays the branch-by-branch assembly |
| `focus` | push into one brick and dim the rest, on the word that names it |
| `badges` | a yellow chip under a brick — a claim, so make it true |
| `pulseFrom/To` | data flowing back to the hub. Use once, on the line about measurement — not as constant decoration |
| `boom` | the whole map flares at once. Once per video, on the payoff |

## Set-piece: the skills panel + Claude Code terminal

A panel slides in beside the map (the map shifts left and pulls back to make room), one skill is
picked, and it expands into a terminal that runs it.

```js
export const SKILLS = { in: 61.75, skills: ["/linkedin-weekly-prod", …], pick: 0, … };
```

- **Skill names must be real names from this repo.** A viewer can check.
- The map's retreat (`zoom 0.71`, `+222 px`) was computed from the **content extent including
  labels** (82-918 px), not node-to-node. That is what leaves the left-most brick a real margin
  instead of pinning it to the edge.
- Geist Mono has no check glyph. The ticks are drawn as vector strokes; a `✓` renders as a box.

---

## The vertical language (2026-09-29): how to cut a short

Built on the first 21.7 seconds of the GTM OS short (the reference plan, see
`scripts/example/`) at the reviewer's request: big text at the top of the screen instead of timid
subtitles, sometimes passing behind the speaker; Impact combined with a second face; playing with
the speaker's own matte; and the paper plate from landscape mode. It was corrected four times the
same day, and **each correction is a verdict**: the table is in short-editor `SKILL.md`
(§ The vertical language), and `init.sh` puts these figures into every new project. Still open:
the reviewer's opinion on the paper plate's sounds (v4) and on the music level.

### `headline()` / `headlines()`: the speaker's words, at the top (`scripts/headline.mjs`)

Replaces the bottom subtitle: each sentence becomes a screen of 1 to 3 lines at the top of the
frame, word by word on their onsets, Impact capitals for the words, and a script face for ONE
accent per screen, written across the line above it (`overlap`, `dx`, `rot`). **One face per line**: the
accent is a line of its own, stacked above or below the Impact line, never beside Impact words on
the same line (« of using MY PLATFORM. » side by side was refused: it reads left to right, the rest
of the short reads top to bottom). The script face is
**Sacramento** (the reviewer liked it, after rejecting Snell Roundhand Black as the secondary face
and comparing Lobster; `project.json` `script` / `scriptBlack`). A `scr()` size is a SNELL size:
another face is drawn at the same x-height, measured on the font (Sacramento ×1.48, Lobster ×0.73),
and each script word reserves room for ITS OWN letters, not for the font's longest ascenders and
descenders. Sacramento rises very high above its x-height: a word placed just above the speaker's
head ("juggle") moves up into the line above (`overlap: 0.25`) instead of coming down onto them.

**On an illustrated plate, no combination**: with an illustrated screen, doing both was too much,
so the plate goes back to discreet subtitles in a single face. The speaker's words as subtitles,
Impact only, 66 px, in ink, word by word on their onsets with no pop
(`headline({ pop: 1, color: INK.graphite, shadow: 0, dim: 0, gap: 0.20 })`), above the elements
of the sheet.

```js
add(...headlines([
  { x: 0.5, y: 0.172, align: "center", maxW: 0.90, layer: "under", lines: [
    line(at(6.36), w("OR", 118, 6.36), w("JUST", 118, 6.60), w("A", 118, 6.80)),
    line(at(6.98), w("GTM", 272, 6.98, { hot: true }), w("GUY", 272, 7.36, { hot: true })),
    line(at(7.52), s("like", 165, 7.52), s("me,", 165, 7.86), { overlap: 0.46, dx: 0.235, rot: -6 }),
  ] },
], { frame, end: END }));
```

Sizes are in px at 1080 wide; a line wider than `maxW` shrinks. `slam: true` drops a payoff word
from 1.9× to 1×. On a paper sheet it is the same figure in ink
(`color: INK.graphite, shadow: 0, dim: 0`). **`occlusion.mjs` is the gate** for every title on the
under layer.

### `shade()`: the shadow at the top of the room (`scripts/headline.mjs`)

An edgeless gradient on the under layer, behind the speaker: the ceiling and the window fall into
shadow, the speaker does not. Without it, Impact's white does not hold on these shots.

### `orbit()`: REJECTED on 2026-09-29, logos circling the speaker (`scripts/behind.mjs`)

Rejected as looking like generic AI filler. The wall of big logos tried in its place (in front of
the speaker, then behind, landing one after another) was refused too. Do not propose it again; the
description stays for the record.


Each element is born behind the speaker's head on the word that names it, then orbits: the back
half of the ellipse is behind them (under layer), the front half in front of them, and the switch
from one layer to the other happens at the two ends of the ellipse, beside them. `panic` speeds up
and tightens, `fling` throws everything out of frame. The centre follows the head (the matte at
mid-head through `speaker.mjs`, smoothed), offset from the head if it is not centred in the frame,
and low enough that the front of the orbit passes in front of the neck, not the mouth.

### `screen({ emergeFrom, exitMode: "slide" })`: the real capture comes out from behind the speaker

The window starts INSIDE the speaker's silhouette and slides to its place, then goes back where it
came from. With a laptop held in hand, run `matteHoles` first (pitfalls.md). **Never on a shot where
the speaker is already showing the screen**: in the GTM OS short the speaker held the real GTM OS up
to the camera, and the capture on top of it was removed because it made no sense.

### STOP-MOTION on the paper: `stickers({ stepFps })`, `strokes({ stepFps })` (`scripts/hand.mjs`)

The reviewer wanted the elements on the paper to move a little as they enter, but not smoothly: at
a low frame rate. What is ON the sheet is sampled on a shared clock (`stepFps` poses per second, 8
in the GTM OS short): each pose is held, none dissolves, and they all change on the same frames,
like paper cut-outs moved between two exposures. A sticker drops, overshoots once and settles in
`settle` seconds (0.62), each pose a little off by hand; a felt-tip mark grows in chunks, so give it
a longer `dur` (0.42 to 0.56 s) so it gets enough poses. The paper itself and the subtitles stay
smooth. **Every pose MAKES A SOUND**, with sounds made for it (the reviewer asked for satisfying
sounds): a logo arriving is a `mallet` tuned to the music (the logos of one gesture climb an
arpeggio), and **since v5, the click from the SFX pack** (`stickers({ land })`, the pack's rule of
clicks for elements that appear); each pose of its settle is a fading `ptick`. A mark is the
exception: **a mark is ONE soft `felt` glide** (an arrow with its head, a tick, a ring), from the
pose where it starts to the pose where it ends (a chunk per pose made one arrow sound like a burst of little strokes, refused). The figures emit these themselves, on the frame where the pose changes
(audio-spec.md, "The vertical short").

### `flash()`: the flash on a change of shot (`scripts/titles.mjs`)

The camera flash marks the change of shot: that is the rule from the video that comes with the SFX
pack ("the flash for quick cuts"), with the picture AND the sound. The picture rises to white late
and fast (0.075 s), holds 0.045 s centred on the cut, and comes down in 0.095 s; the white peaks at
0.82, not 1: the curve measured frame by frame on the pack's video (mean luminance
22 → 83 → 208 → 209 → 88 → 31 at 24 fps, the cut falls UNDER the second white). On the over layer,
so above the titles, like a real flash. The sound is the pack's `camera-flash.wav`, its attack
(0.255 s into the file) placed on the cut.
`flash({ id, at: CUT, frame, sound: "sample:sfx-top5/camera-flash.wav", gain: -7, align: 0.255 })`.
**A change of shot, not every hard cut**: on a short full of jump cuts, a flash on each one would
be a strobe. It also hides what changes on the cut: the radio voice and the hook's look stop under
it.

### The "old-school" hook: a BONUS, asked every time (`scripts/looks.mjs`, `voiceFx`)

The reviewer asked for a visual old-radio effect, then preferred a cathode-ray TV, then said it is
optional, a bonus to offer every time. On the first seconds only (around 7 s, never past 10 s: see
SKILL.md § Ask first), the hook plays through an
old medium: the voice through an old radio set (`voiceFx`, audio-spec.md) and the picture through
an old TV, and the flash brings everything back to today. `project.json` `look: { from, to, preset }`:
- **`crt`, the reviewer's pick**: curved glass (black corners), a halo around bright areas, a
  colour fringe, a cold white, and on the over layer scan lines every 4 px, a bright bar rolling
  down, a rounded edge;
- `film` (compared): washed-out Super 8, 12 fps (the same hand as the paper's 8 poses), a shaking
  picture, grain, drawn dust and scratches. In pure sepia its yellow turned khaki: it keeps a
  little colour;
- `vhs` (compared): 30 fps, a soft picture, bleeding colours, a tracking band rolling up,
  "▶ PLAY 0:00:0X" at the top left, above the titles.
The filter (`looks.mjs --ffmpeg`, inserted by build.sh on the composed picture: the set, the titles
behind the speaker, the speaker) runs BEFORE the over layer, so the flash stays a clean white on
top. The look's own layers (`lookBeats`) are drawn at the end of the plan, under the flash. The
titles go through the look with everything else and stay legible.
