---
name: explainer-editor
description: "Edit a raw vertical (9:16) take of someone talking to the camera into a finished short in the Pipecorn EXPLAINER LANGUAGE, with the motion of an After Effects edit: the speaker in a frame with round top corners at the BOTTOM of a dark stage lit like a set (charcoal lit from the middle, a vignette, a light on each scene carried by the camera, a red glow in a corner, dust floating, a grid of dots), their head (and hands) rising out of the frame (person matte); ABOVE them, the stage EXPLAINS what they say as they say it, in SCENES joined by CAMERA MOVES (whip pans with a light streak, rises, push-throughs), everything with real MOTION BLUR, springs and expo curves, never still (a slow drift and push, parallax on the dots and the dust), every figure casting a soft SHADOW on the ground and GLOWING in its colour (glossy rims, a sheen across the cards, a flash of light behind what pops in): a two-line title per section (Inter ExtraBold with one Instrument Serif italic accent, a red box or a red underline), then a new figure every second or so on the word that names it: numbered bars with a red edge whose labels are blurred until said, pills, trees wired on with a spark, a phone, image cards and the speaker's own frames, logos, pictograms, an arrow, an equation, a VS with a camera shake, a prompt typed letter by letter, document pages, counters, marks drawn round things; between the stage and the speaker, the speaker's words ONE AT A TIME; a few times a minute a hard cut to FULL SCREEN with a camera flash; the SOUND of the motion: the two base skills' pack on the big moves (the whoosh on every scene change, the glitch on a hit, the riser into a payoff, the flash on the cut) and a light sound of the Motionix pack on everything that appears (a pop, a swish, a tick, a select, a check's confirm, a shutter on a frame of the take, the typing of a prompt, the data of a scan), set on the take's voice and measured as heard; a music bed that goes silent on the breather that lands the point; audio finished at -14 LUFS and verified numerically before delivery. Any take: a close one gets a narrower frame (the head at the reference's size), a take of several shots is framed shot by shot; the whole stage exists in a DARK version (the reference) and a LIGHT one (`--theme light`), the same elements. Use when the user hands over a talking-head take and asks for a split-screen explainer, a breakdown, motion graphics explaining what is said, the speaker at the bottom with animations above, a guide or a tutorial short, or says explainer, split screen, moi en bas et les animations en haut, montage explicatif, style breakdown, motion design."
user-invokable: true
---

# explainer-editor: a take explained on a stage above the speaker

The user hands over **one vertical take of themself talking to the camera**. This skill puts them
in a frame at the bottom of a dark stage lit like a set, their head rising out of it, and draws what
they explain **above them, as they say it**, with the motion and the light of an After Effects edit:
scenes that a camera travels between, figures that fly, rise and pop in with motion blur, each with
its shadow and its glow, a new thing on the stage every second or so, a sound on every move. Their words run between the stage and them,
one at a time. A few times a minute a camera flash cuts to them full screen.

**What a short looks like is settled: § The explainer language** (below the pipeline). It was
measured frame by frame on a short the user edited for a client (108 s, a guide to text hooks), then
reviewed on a first edit (2026-10-05: "not After Effects at all, not motion design, too few things
on screen, it's boring, the whooshes are missing"), then on the second ("much better; not enough
little shadows and glows behind the elements, the all-black ground does not set them off; here is a
pack for many more very light sounds"): every row of both verdicts is now a rule. Start every new
take from it (`init.sh` scaffolds it); do not re-open it.

**This skill runs on the engine of the short-editor skill.** Its render, mix, person matte,
previews, build and verification are the engine's files, as written in
[`../short-editor/SKILL.md`](../short-editor/SKILL.md) § Prerequisites, § Where things live and
§ 4 to § 6; this file says what differs. This skill's own: the **layout** (`layout.mjs`: the
speaker's frame and the full-screen breathers, run by the engine's `build.sh` and `preview.mjs` in
place of their zoom), the **stage** (`stage.mjs`: the camera, the scenes, the motion blur, the
figures, the captions, the sounds of the motion), the **bed** (`bed.mjs`), the **stills**
(`stills.mjs`) and the **measurements** (`measure.mjs`). Read before the first cut, every run:
- [`../../references/pitfalls.md`](../../references/pitfalls.md) § Transcription and captions, § Working method: the traps an edit is written with (its other sections when their step comes: § Audio before a sound measured by hand, § ffmpeg and § The shell before a command of your own; the engine's tools follow the rest)
- [`../../references/brand-kit.md`](../../references/brand-kit.md), when the edit shows them: the user's real logos, screens and numbers, never invented ones, and their brand set once in `workspace/brand/` (§ Your brand, set once)
- `$X/example/`: the reference project, every file of a delivered edit (`stage.theme: "light"` for
  its light version); `$X/example-2/`: the skill run from scratch on another take (two shots, a
  quiet recording, no breather), and what that run changed

Read when the step needs it: [`../../references/audio-spec.md`](../../references/audio-spec.md) at the levels (the loudness standard, how a level is measured as heard). The engine's figures: `node plugins/video/skills/short-editor/scripts/api.mjs <module> [figure]`, never their sources.

> **I cannot watch the video or listen to it.** Where the head is, where a word starts, how loud
> a whoosh is heard: each one is a measurement. `verify.mjs` stands between "it's ready" and a
> broken file; `measure.mjs` says whether the sound design is heard. Never skip them.

All paths below are relative to the root of the GTM by Pipecorn folder. `$X` means
`plugins/video/skills/explainer-editor/scripts` (this skill), `$E` means
`plugins/video/skills/short-editor/scripts` (the engine). Run both by their absolute path.

## Prerequisites (preflight: check before any work)

The engine's: `ffmpeg` + `ffprobe` on PATH (`brew install ffmpeg`) and `python3` (Xcode Command
Line Tools) are required and not installable from here; stop and say the command if one is missing.
Everything else provisions itself: the engine's `bootstrap.mjs` (node packages, the speech-to-text
venv, the music shelf) runs inside `init.sh`, `transcribe.sh` and `build.sh`, and `init.sh` fetches
the faces: **Inter** (ExtraBold, Bold, SemiBold, Medium; SIL Open Font License, from the npm package
`inter-ui` through jsDelivr) and **Instrument Serif Italic** (Google Fonts, OFL) into the project's
`assets/fonts/`. Nothing is installed system-wide. **`swiftc`** builds the person matte: without it
the head does not rise out of the frame (the frame simply crops the speaker) and the stage is drawn
on the over layer; say so.

## Where things live

As the engine says, and only this way: one working directory per edit,
`workspace/projects/<slug>/`, a slug no other project has; the finished file
`workspace/videos/<slug>.mp4`; never another project's files, even of the same take; temporary
files in the project's `tmp/`, never `/tmp`. The skill's `scripts/` stays read-only. The user's
pictures (screenshots, logos, frames of their videos) go in the project's `assets/`.

## The pipeline

### 0. Set up the working directory

```bash
$X/init.sh workspace/projects/<slug> <source.mp4> workspace/videos/<slug>.mp4 [--theme light]
```

The engine's scaffold (project.json read from the file, the SFX pack in `assets/sfx-top5/`), then
this skill's `plan.mjs` and `edl.mjs`, the keys of the explainer language in project.json (`style:
"explainer"`, `layout`: the path of `$X/layout.mjs`, `blurBand 0`), **`sfxMasterDb` set on the
take's voice** (its loudness + 15.3 dB, + 0.13 dB per dB under −20.5 LUFS: the house sounds heard
as in the base skills, whatever the take's level), the faces, a 1080x1920 master for a smaller
portrait take (kept on a second run), and **the theme** (`stage.theme`: `dark`, the reference, or
`light`; `--theme light` sets it; a project already set keeps its own). Run every later command from
that directory.

### 0.2. Ask first, in ONE question

The theme (dark, the reference, or light: the same stage, white glass, dark words, softer
shadows), the music (the shelf, `plugins/video/assets/music/`; Convergence by default; say the
tracks that are not Mixkit can block the video's monetisation), the pace (×1 by default; a slow delivery reads better at ×1.1), and **the pictures the
user can give**: screenshots of their product, frames of the videos they talk about, their logo,
the real numbers. What the user does not supply is drawn with their words and the house's
pictograms, never with invented screens or numbers. Run from the GTM by Pipecorn page, the brief of
the first message answers it (the theme from its notes: "light" there means the light theme):
decide by the rules below and do not ask again.

**The Pipecorn generic: a BONUS of every style, asked EVERY time, never on by default**
(`plugins/video/references/pipecorn-generic.md`): about 6 s at the very end, Pipecorn, then its
values replacing one another in one slot, then Pipecorn again, no music. **No** · **Yes**, with
which values (1 to 4; `node $E/generic.mjs --list`; by default phone coverage, connect rate,
pipeline).

**Your voice made better: a BONUS, asked EVERY time, never on by default**
(`plugins/video/references/voice-clean.md`): ElevenLabs' voice isolator takes the room's echo and the noise
out of the take. **No** · **Yes, make my voice better**. It needs the ElevenLabs connector: without a key, say
in one line that it exists (Settings › Connectors › Add key) and go on. On a yes, before step 1:
`node plugins/video/motion/voice.mjs clean <source>`, then project.json › `source` is `<…>-voice.<ext>`
(the same length, the picture untouched).

### 1. Transcribe, verbatim

```bash
$E/transcribe.sh --lang en      # the language actually SPOKEN; then project.json "lang"
```

`words.json`, on the clock of the raw take. Never translated. A take full of restarts is assembled
first with the engine's `rough-cut.mjs` (short-editor/SKILL.md § 0.7), then transcribed again. Then `node $E/words.mjs` (the engine's): `words-fixed.json`, every word's onset
moved out of a silence onto the voice and its real end before a pause, the doubtful ones listed;
`words.mjs env|end|say` to read one (short-editor/SKILL.md § 1). Never a script of your own for it.

### 2. The matte and the frame

```bash
node $E/matte.mjs                          # the person matte (needs swiftc), ~1 min a minute
node $X/layout.mjs --measure --write       # where the head is → project.json stage
node $X/layout.mjs --print                 # the frame, the caption, the breathers
```

`--measure` finds the take's shots (its source cuts, as `verify.mjs` finds them) and reads the
head on the matte in each (32 frames a shot): the frame's width puts the head of the longest shot at
the reference's size (226 px wide; a close take gets a narrower frame, centred, so its shoulders and
chest come in: 598 px on the worked example, whose head is 38 % of the take's width, 782 on the
second take; `--keep-frame` keeps the reference's 942 and warns that the frame will show mostly the
face); in each shot the frame's top edge passes 88 px under the head's usual top (the reference), so
the head rises out of it; the caption goes up by how much higher the head usually rises (at most 90
px) and stays 20 px above it; the full screen makes the head 45 % of the width. A take of several
shots gets `stage.shots` (each shot's crop, caption and full framing; the camera switches on the
cut, the frame stays). Check it on a preview (§ 5). In this style a source cut happens inside the
speaker's frame, a small part of the picture: `verify.mjs` may report it "under a full-frame plate"
(the second take); check that it lands on its frame by the frame's own differences, not by eye.

### 3. Read the transcript, write the storyboard

This is the judgment step, and it is the whole job. Read the transcript end to end and write the
storyboard as a list before any code: the scenes, and in each, what appears on which word.

- **Scenes, joined by camera moves.** A scene is one idea (the promise, the product, a process,
  the steps, the list, a comparison): 4 to 8 seconds, then the camera moves to the next one. The
  default move is the **whip** (a pan to the right: the old scene leaves left in a blur, a light
  streak crosses, the new one arrives); a **rise** when the next idea goes deeper (the old scene
  leaves upward); a **push** through the old scene when the new one answers it (a "why", a reveal);
  a **cut** only behind a breather. Never two of the same in a row when it can be helped.
- **A scene arrives composed.** What is placed at the scene's own time travels in WITH the camera
  (it is already there when the move ends: the reference never shows an empty stage after a move);
  what comes later enters on its word. When the scene's things are named one after the other, place
  them all at the scene's time, in the dark or out of focus (`dim: 0.6`, `blur: 10`), and light each
  on its word (`.blurTo(on(i), 0).lit(on(i))` and its sound): the stage is full from the first frame
  and still moves on every word (the second take's personas and channels, 2026-10-05).
- **Something new every second or so.** Each phrase that names a thing, a number, a step, a claim
  gets a figure or a move on its word: a figure entering, a label revealed, a mark drawn round
  something, a thing lit, a scene moving. More than 2 seconds with nothing new on the stage reads
  as boring: it was the verdict on the first edit (2026-10-05).
- **The title** names the section in two short lines, its key word in the serif (`*Killer* Text
  Hooks`), a red box on the line with a count or a claim (`3 Winning Types Of`). It changes with the
  section, the old one rising out before the new words rise in.
- **Which figure for what:**

  | what is said | the figure |
  |---|---|
  | a list of N things, steps, rules | `S.list`: bars flying in from the left, labels blurred until each is said (`reveal`), the one explained lit (`focus`), its verdict popping at its end (`glyph: "check"`, `"cross"`…); `header` turns a bar into the section's header |
  | a name, a term, a definition | `S.pill` (a pictogram in it: `glyph`), `S.arrow` from what it names, `S.ping` (`ring: true`) round the thing, `S.mark` (a circle, a frame, an underline) drawn on the word that stresses it |
  | a thing made of parts, a cause and its effects, a chain | `S.tree` (children dropping in, each wired on with a spark), `S.wires` between any two |
  | a combination, a comparison | `S.equation` (`+`, `=`), a `VS` sign with `S.shake` and the glitch |
  | a product, a tool, a platform | the user's logo (`S.icon`, its glow, `ring` to make a phone ring), their screenshot in `S.card` or `S.phone`, `S.prompt` typed when it is used |
  | examples, videos, a series | `S.cards` of their pictures, or frames of the take itself (`stills.mjs`) with `player` cards |
  | a search, many sources, a crowd | a grid of `S.cards` with `glyph`s, lit one after the other (a scan) |
  | a number | `S.count` climbing to it, or coloured words (`{g:22 Days}` green, `{r:A Few Weeks}` red) |
  | good / bad, yes / no | `S.glyph` (`check` on a green tile, `cross` on a red one), the verdict of a bar |
  | a call to action | a title (`Comment "X"`, `To Get The *Skill*`), `S.file` for what they send |

- **The breathers** (`FULL`): a hard cut to the speaker full screen (the camera flash on the way
  in, a whoosh on the way out), nothing drawn but the captions. On a confession, a punchline, a
  strong opinion; 2 to 6 s; never in the first 15 s. A shot that is not the talking head (b-roll, a
  wide shot) goes full screen whole: `[from, to, { zoom: 1 }]`. The scene after a breather opens
  behind it (`S.scene(<breather end> - 0.45, "push")`), so it is there when the breather ends.
- **Real names and real numbers only** (brand-kit.md): a figure that would need a screen or a
  number the user did not give is drawn with their words and the house's pictograms, or cut.
- **Captions are verbatim**: `fix` mends a word the transcript spells wrong, nothing is rewritten
  (a transcript without capitals: `fix` the names, `{ os: "OS", youtube: "YouTube" }`).
- **Colours by name in plan.mjs** (`"white"`, `"red"`, `"green"`, `"yellow"`, `fill: "tile"`), never
  a hex that only works on one theme: `white` is the neutral (the ink on the light stage), `tile` the
  theme's tile.

In a conversation, propose the storyboard in plain language before building (it is far cheaper
than a render). Run from the GTM by Pipecorn page, decide, and say in the delivery message what each
scene shows.

### 4. Write plan.mjs, then the sound

`plan.mjs` is scaffolded and commented; `$X/example/plan.mjs` is a whole delivered edit (seven
scenes, 70 sounds in 50 s). Every time is an output second: `on(i)` is the onset of word `i`.

```js
export const FULL = [[on(75), on(90) - 0.06], [46.233, END, { zoom: 1 }]];
const S = await stage({ project: P, full: FULL, fix: { klesos: "Klesos" } });
S.title(on(0), ["I'm Now Doing", "*Sales Calls* As A Service"]);
const card = S.card(on(6), { player: true, x: 0.5, y: 0.37, w: 270, h: 460, enter: "drop", caption: "Last video" });
card.move(on(8), { x: 0.27 }, 0.55);
S.scene(on(19), "whip");
const logo = S.icon(on(19), { img: "assets/logos/pipecorn.png", x: 0.5, y: 0.31, w: 270, h: 270 });   // rides in
S.ping(on(22), logo, { ring: true });
export const BEATS = S.beats;  export async function load() { await S.load(); }
```

Every figure makes its own light sound (the Motionix pack, `assets/sfx-motionix`): a swish when it
flies or rises in, a pop when it pops, a tick as each bar of a list lands, a select when a label is
said, a confirm or a deny with a check or a cross, a stretch when a line is drawn, a shutter for a
frame of the take, the typing of a prompt, a gear while a counter climbs; every scene change the
house pack's whoosh, every cut to full screen its camera flash. Give a figure another sound with
`sfx: "<role>"` (`.sound(t, role)` on a node, `S.sound(t, role)` alone): a scan `"data"`, a landing
`"thump"`, a logo lit `"ping"`, a price `"money"`. Add a riser ending on the payoff
(`S.riser(on(i))`). Keep the figures inside `S.area` (under the title, above the caption: `S.mid`,
`S.span`).

Frames of the take, for a video card or a phone's screen: `node $X/stills.mjs 9.5 16.5` →
`assets/shots/s_9.50.jpg` (output seconds).

The bed from the shelf, silent on the breather that lands the point:

```bash
node $X/bed.mjs --track plugins/video/assets/music/<track>.mp3 --drops <from>-<to>
```

It sets `bedDb` from the voice, the track and the master (about 16 LU under the voice as heard). No
music asked: project.json `bed` set to null, and no `bed.mjs`.

### 5. Look at it before rendering it

```bash
node $E/preview.mjs 2.6 11.6 22.0 --out preview/ --width 540   # the composite at instants
$E/build.sh --slice 3.4 5.2                                    # a camera move in motion, with its sound
```

Motion is the point of this style: look at every scene change and at the busiest moments IN
MOTION (a slice, tiled at 15 frames a second), never only at stills. Check: the face whole in the
frame, the head under the caption, no figure over the caption, no empty stage after a move, the old
title gone before the new one rises.

### 6. Render, measure, verify, deliver

```bash
$E/build.sh                # the whole short; again after a change, only the segments that changed
node $X/measure.mjs        # every family of sound as heard, by subtraction
node $E/verify.mjs         # non-zero exit: do not ship
```

The targets as heard (`measure.mjs`, momentary loudness against the programme's median): the bed
about 16 LU under the voice; the whoosh 9 to 11 LU under the programme, the flash 9 to 11, the
riser about 10, the glitch about 11 (the base skills: whoosh 9, flash 9, riser 10, glitch 13); the
light sounds 15 to 20 (`measure.mjs fine` role by role). Off by more than 2: `sfxMasterDb` (all of
them), a name in `cueGains` (a house name or a role), or `bedDb`, then `build.sh --audio-only`. Then deliver (`SendUserFile`,
or the GTM by Pipecorn page plays it): the file, the numbers, the scenes and what each shows, and
what the edit cost.

**The Pipecorn generic, when the brief asks for it**: last, on the delivered file, once the
verify above passed (`plugins/video/references/pipecorn-generic.md`), from the project:
`node $E/generic.mjs workspace/videos/<slug>.mp4 --values <ids>`. It keeps the file without it
in `tmp/without-generic.mp4` and redoes it from there when it is run again; after any new render,
run it again. Give its numbers at delivery (the new length, the loudness, the generic's level),
and say once that its numbers are Pipecorn's claims, to confirm before publishing.

## The explainer language: how an explainer looks

Measured on the reference (a 720x1280, 24 fps export of 108 s; every number at 1080x1920) on
2026-10-04, rebuilt on a real take of the user's, reviewed on 2026-10-05 and rebuilt again.

### What it is: do not re-open

**The techniques referential**: a technique added, validated or refused (a scene, a transition, a block, a sound, a rule) goes into this skill's `techniques.json` in the same change: its status, its date, Ihsane's reason, where it lives in the code and its doc. Never use a technique marked refused there.

| What the reference does, what was said | The rule |
|---|---|
| The speaker in a frame at the bottom, their cap and their hands coming out of it; then "je ne vois que sa tête, pas son buste, c'est le cadrage du tout qui ne va pas" (2026-10-05, on a close take) | The frame: top at 1404, running past the bottom edge, top corners of radius 48; the take fills its width, and its width puts the head at the reference's size (226 px: 942 on the reference, narrower and centred for a close take, 598 on the worked example: the shoulders and the chest come in). The person matte puts the head (and the hands) over the frame's edge, 88 px out. Nothing else of the room shows outside it. |
| A black stage with a faint grid of dots; then "le fond complètement noir ne met pas en valeur le truc, il faut un peu de petits effets" (2026-10-05) | Not black: charcoal lit from the middle of the stage (`#272729` → `#0D0D0E`), a vignette, a light on each scene carried by the camera, a red glow drifting in the top right corner, dust floating at three depths; the dots (radius 1.5 every 18 px, `rgba(255,255,255,0.075)`) at a quarter of the camera's speed. Nothing of the stage reaches into the frame: its own layer, cut 2 px above it, faded out over 70 px; the frame casts its shadow and has a lit rim. |
| "Tu n'utilises pas assez de petites ombres… des petits glows derrière les éléments" (2026-10-05) | Every figure casts a soft shadow on the ground (a tight contact shade and a wide soft one, falling down), glows in its colour (faint white, red on red, green on green, brighter when lit), and has a gloss on its upper half and a rim lit from above; a flash of light behind what pops in, a sheen across a card as it lands; lines drawn with their shade and a glow; words with their shade. |
| The words one at a time | One word per caption, two when a short one goes with the next; from its onset until the next; Inter ExtraBold, white, a soft shadow; 58 px 20 px above the head, 66 px at 1235 on a breather. Verbatim. |
| A title, two lines, one word in an elegant italic | Inter ExtraBold 55.7 px, baselines 166 and 222; the accent in Instrument Serif Italic at 1.12x; a red box swept behind a line or a red rule drawn under the last; the words rise one after the other out of a blur (60 ms apart), then the light flickers; the old title rises out first. |
| Scenes that a camera travels between (whip pans with a streak, moves into the next idea) | `S.scene`: whip, right, rise, drop (the camera moves 1.25 widths or 0.95 heights in 0.46-0.5 s, inOutQuint), push, pull (the scenes cross on the spot), cut; the pack's whoosh at the move's middle; a light streak across a whip. |
| Never still | Inside a scene the content drifts up 6.5 px a second and grows 0.6 % a second (up to 32 px and 3 %); every figure floats 3 px; the bars' sheen crosses them every 3 s; pictures push in slowly. |
| Motion blur on everything that moves | Each frame averages up to 16 sub-frames over half a frame (a 180° shutter), as a camera does; a still figure is painted once. |
| "Pas du tout After Effects, pas du tout motion design" (2026-10-05) | Entrances on expo curves and springs: fly in from a side (760 px), rise or drop (130 px), up from below (620 px), pop (a spring overshooting ~12 %), zoom out of the camera (1.75x), flip, wipe, drawn on, typed, words; exits the same way. |
| "Trop peu d'éléments, on s'ennuie" (2026-10-05) | Something new on the stage every second or so, a scene every 4-8 s, a scene arrives composed (what is placed at its time rides in with the camera); about 45 figures and moves in 50 s on the reference take. |
| "Il manque les petits whoosh" (2026-10-05); "reprends les SFX des deux skills de base" | The base skills' sounds on the big moves: the pack's whoosh on a scene change, the glitch on a hit, the riser into the payoff, the camera flash on the cut to full screen; set on the take's voice (`sfxMasterDb` = voice LUFS + 15.3) and measured as heard. |
| "Un nouveau pack de SFX… beaucoup plus de petits sons très légers pour l'apparition des éléments" (2026-10-05) | Everything that appears has a light sound of its own from the Motionix pack (a role per kind of appearance, its files in turn): 15 to 20 LU under the programme, never on top of a big one or of each other; 70 sounds in 50 s on the reference take. |
| The speaker full screen now and then; then "un petit effet sur les passages en plein écran" (2026-10-05) | 2 to 6 s, the head 45 % of the width, the stage gone, a b-roll shot whole; the cut dressed by `stage.breath`: **`flash`** (a hard cut under a white flash, 0.82, 0.215 s: the reference, kept on 2026-10-05 over five proposals); the alternatives: `expand` (the frame grows to the whole screen and back), `punch` (a zoom punch with a zoom blur, a chromatic split and a light flash), `glitch`, `leak` (a warm light leak, the film burn), `whip` (a vertical whip pan). |
| A music bed, cut on a punchline | The bed under the whole short, about 16 LU under the voice, silent on the breather that lands the point, back with the next section. |
| "À la fin ce n'est pas un bout de vidéo, c'est une preview de la prochaine vidéo: elle n'est pas en plein écran, elle est dans un cadre" (2026-10-05) | An end that is not the talk but a glimpse of the next video is a PREVIEW window, `preview(a, b, style, { name, title })` in `FULL`: the clip in a frame of its own on the ground, its own entrance and sounds, no flash. **The card** (picked 2026-10-05, "mais retire le stay tuned, ça fait trop"): the clip framed square on its useful part, rising in on a spring with a big swish, an "Up next" badge popping on its corner, the title above, a red progress bar under it running to the end, nothing else. Kept as alternatives, not the default: `phone` (the next short on a phone, a feed's chrome, a like), `upnext` (full screen on the cut, shrinking into an autoplay card with a countdown ring), `film` (a strip of film, grain, flicker, "Coming soon"). |

**Validated as a whole** on 2026-10-05 ("c'est validé", after the light version and the second take):
everything above and below as delivered, including what was first kept without being asked (the
music drop on a breather, the light streak, the camera shake on a VS, the verdict pictograms on
the bars, the player cards, the pictograms standing for what the user did not supply), the ground's
lights, the strength of the shadows and glows, the light sounds and their levels, the burst of
shutters, the narrower frame of a close take, Convergence, the flash on the breathers, the card for
the preview of the next video, the light theme, and the method on another take (each shot framed,
each scene arriving composed). Change it only on the user's word.

### The recipe: the numbers

- **The frame** (`geometry.mjs`, `layout.mjs`): `stage.boxW` = min(942, 226 / the head's width as a
  fraction of the take's), centred (`stage.boxX`; `--keep-frame` keeps 942); the take scaled to it;
  `stage.crop` from the head's usual top + 88 px; `stage.captionY` lifted by the head's motion (15th percentile, at most
  90 px); `stage.full`: zoom 0.45 / head width (1 to 2.2), the head top at 11 % of the frame. The
  full windows are snapped to frames and switched on the same frame in the picture and the drawing.
- **The breathers** (`stage.mjs`, project.json `stage.breath`, `EXPLAINER_BREATH=<name>` to compare
  with `build.sh --slice`): the ones that move the picture draw the take's own frames on the over
  layer (`tmp/breath/`, extracted once, with the person matte); `expand`: 0.5 s inOutCubic before the
  cut and after it, the stage under a veil to 0.62, the frame's rim lit and its shadow while it
  moves, a 108° shutter, the caption sliding to its full-screen place, a big swish and a thump (back:
  a swish and a soft pop); `punch`: 1.24 → 1 in 0.38 s (outExpo) from the face, a zoom blur of 8
  copies, a chromatic split of 16 px over 0.11 s, a flash 0.55 → 0, the house flash and a thump; back,
  the stage from 1.08 with a 9 px blur, a flash 0.4; `glitch`: 9 frames (a chromatic split of 22 px,
  torn slices, scanlines, a band of noise) after two frames of tears, the house glitch; `leak`: a warm
  wash and three flares crossing in 0.75 s, white at the cut, the shelf's film burn (assets/
  sfx-burn.wav, made from it); `whip`: 0.36 s inOutQuint, the split frozen on its last frame, 16
  sub-frames, the house whoosh.
- **The camera** (`stage.mjs`): scene origins 1.25 W apart (whip) or 0.95 H (rise); the move
  inOutQuint, 0.46 s (0.5 for a rise); push: the old scene 1 → 2.3x in 0.32 s (inExpo) fading, the
  new one 0.7 → 1 in 0.46 s from +0.14 s; drift 6.5 px/s up (max 32), zoom +0.6 %/s (max 3 %); the
  dots at 0.25 of the camera; a shake 16 px decaying over 0.32 s.
- **Motion blur**: a 180° shutter (half a frame), N = clamp(displacement / 3 px, 1, 16) sub-frames,
  painted one by one and summed ('lighter', alpha 1/N), then composited.
- **Light and shade** (blurred silhouettes computed once per shape and size, reused every frame):
  the shadow in two layers [blur, drop, opacity]: low [4, 3, 0.5] + [18, 10, 0.45] (a small thing),
  mid [6, 5, 0.55] + [30, 18, 0.55] (a pill, a bar, a logo, a tile), high [8, 7, 0.6] + [48, 30, 0.62]
  (a card over 260 px, a phone, a prompt); the glow: white 0.12-0.24 at 26-40 px (a logo 0.24), red
  or green 0.42-0.5, +0.34 when lit, +0.55 decaying over 0.42 s as it pops in; the gloss: white 0.15
  → 0 over the upper 58 %; the rim: white 0.8 at the top → 0.3 at the bottom; a sheen across a card
  0.12-0.87 s after it lands; a bar's red edge bleeds red light (0.42, lit 0.8); lines and marks:
  a shade (black 0.55, blur 8, drop 4) then a glow of their colour (0.4-0.55, blur 10-12); words:
  black 0.6, blur 16, drop 6 (the captions 0.7, 18, 4); the VS and a counter glow in their colour.
- **The light theme** (`stage.theme: "light"`, stage.mjs THEMES): the same stage, every colour
  that is not a brand's read from the theme: the ground `#E6E6E9` lit to `#FDFDFE`, a vignette of
  0.13, the dots `rgba(20,20,30,0.085)`, the dust dark at 0.32, the red glow at 0.08; glass and metal
  white (`#FFFFFF → #EDEDF0`), their rims white on top and ink 0.16 at the bottom; the ink `#121216`
  (the words, the lines, the "white" of a plan); shadows tinted `rgb(28,28,44)` at 0.42 of the dark
  stage's; no white glow (it would not show), the colour glows at 0.6; the red pills and the title's
  red box keep their white words; the yellow darkens to `#D99A00`; the captions dark with a white
  halo on the stage, white over the take (full screen); the light streak a dark speed line; the
  breathers' veil white. The phone, the player and the film stay dark (objects, not the stage).
- **The ground**: `#0D0D0E`, lit by a radial `#272729` over 0.62 H centred 4 % of H above the
  stage's middle, a vignette to black 0.55 from 0.3 to 0.85 H, dithered once (±1.5 levels: the 8-bit
  encode does not band it); a light per scene (white 0.075 → 0 over 560 px) carried by the camera;
  a red glow (`rgba(214,24,24,0.15)` over 480 px) drifting in the top right corner; the dots; 30
  motes of dust at three depths [parallax, rise px/s, opacity, size px]: [0.12, 7, 0.24, 3.2],
  [0.25, 12, 0.15, 7], [0.5, 19, 0.075, 30] (blurred 0.6, 2.2, 7 px); the frame's shadow (blur 34,
  0.9, drop 12) and rim (white 0.3 → 0.06 over 220 px, 2 px).
- **Entrances** (outExpo unless said): rise / drop 130 px, 0.6 s, alpha in 0.35 s, scale 0.88 → 1;
  left / right 760 px, 0.62 s; up 620 px, 0.7 s; pop: spring 1 − e^(−6.2u)·cos(7.6u) over 0.52 s with
  a −9° settle; zoom 1.75 → 1 with a 12 px blur, 0.5 s; flip: outBack on the width, 0.5 s; words:
  each word 0.34 s, 0.06 s apart; draw (lines): inOutCubic 0.42 s with a spark on the tip.
  **Exits**: blur 0.24 s, up / sink 140 px 0.32 s (inExpo), left / right 900 px 0.38 s, pop, zoom.
- **The title**: 55.7 px, line spacing 55.5, red box padding 14 px swept in 0.5 s; the underline
  3 px drawn in 0.4 s; a new title's words start 0.16 s after the old one starts rising out.
- **The list**: bars 570 x 143, 43 apart, centred in the area and scaled to fit it, flying in 0.07 s
  apart; the red edge 14 px (+10 when lit), the metal `#2B2B2B → #4D4C4B`, a sheen every 3 s; the
  number Inter ExtraBold 60 px, the label at 0.92 of it (smaller to fit), blurred 13 px until said;
  focus: the bar 1.045x (outBack) with a red glow, the others dimmed to 0.45; a verdict pictogram
  springs in at the bar's end when it is said; a header is the bar at 0.55, at (0.32, 0.125).
- **A pill**: black glass (`#2E2E31 → #08080A`), its gloss and its lit rim 1.6 px, radius 18,
  glow 28 px (`pulse` breathes it); text Inter ExtraBold 30 px (a hero pill 40-62), a pictogram at
  its left (`glyph`); `serif: true` for an italic label; `fill: "green"` for the one picked.
- **A phone**: 470 x 960, radius 16 % of its width, a metal rim lit from the top left 2.4 px, a high
  shadow, glow 40 (the light of its screen); screens sliding up into it
  (0.42 s, inOutExpo, blurred mid-way): a hook band, a picture, a grid of icons, an incoming call.
- **Cards**: radius 6, a thin rim, a label above or a caption below, a slow push in the picture;
  `player` for a video card (a play button, a progress bar running); marks: a dashed red box whose
  dashes run, a green label wiped in.
- **The sound** (on `sfxMasterDb` = voice LUFS + 15.3: −5.2 on the reference take): the house
  pack's whoosh −9.5 (align 0.94), glitch −15 (0.15), riser −14 (1.765, its end on the word), flash
  −7 (0.255), the engine's whoosh_out −18 (a title, the way back from a breather); click −9 (0.005)
  and swoosh_in −20 / swoosh_out −22 only stand in for the light ones without the Motionix pack;
  two of a kind closer than 60 ms make one. Measured as heard on the reference take: whoosh 8.9-10.4 LU under the programme
  median, flash 9.0-11.3, riser 10.1, glitch 11.0, the bed 15.9 LU under the voice (`bedDb` −22.8
  for Mixkit's Hip Hop 02: voice − track − master − 19). **The light ones** (`stage.mjs` MX, the
  Motionix pack at −20 LUFS momentary, the gain corrected by −20 − `lm`; heard about 1.5 − gain LU
  under the median): pop −14.5 (as heard 15.4-16.8), swish −15 (16.0-17.0), tick −20 (16.4-21.1),
  select −15 (15.9-16.4), confirm −14.5 (15.5-15.8), deny −15 (16.3), thump −15.5 (16.9), stretch
  −16.5 (17.4-18.2), ping −15.5 (17.3), flicker −17.5 (18.5-19.6), shutter −18 (a burst of four:
  14.0), data −15.5 (16.7-16.8), typing −16 (18.9), popSmall −15.5, swishBig −13.5, gear −15, money
  −14; a light one within 0.15 s of a whoosh, the flash or the glitch, or 70 ms of another light
  one, is dropped. The roles and their files: `plugins/video/assets/sfx/README.md`.

### The figures (stage.mjs)

Sizes are px at 1080 wide, `x`/`y` the CENTRE as fractions of the frame (in the current scene),
times output seconds. Every figure takes `until` (it leaves then), `enter`, `exit`, `sfx` (null:
silent; or a sound: a light role, `pop`, `popSoft`, `popSmall`, `swish`, `swishBig`, `tick`,
`select`, `confirm`, `deny`, `thump`, `stretch`, `ping`, `flicker`, `shutter`, `typing`, `data`,
`gear`, `money`, `button`, or a house one, `whoosh`, `click`, `glitch`, `riser`, `flash`), `z`,
`dist` (scales the entrance distance), `float: false`, `elev` (a card's shadow: low, mid, high),
`glow: false`, `glowColor`. Every figure
returns a node: `.move(t, { x, y, s }, d)`, `.set(t, { hi, s, shade, gray, tint, reveal… }, d)`,
`.dim(t, v)`, `.lit(t)`, `.blurTo(t, px)`, `.out(t, kind)`, `.sound(t, name)`.

| call | what it draws |
|---|---|
| `S.scene(at, "whip" \| "right" \| "rise" \| "drop" \| "push" \| "pull" \| "cut")` | a new scene: the camera moves, the old scene leaves with it, the whoosh carries it |
| `S.title(at, [line1, line2], { red, underline })` | the title lockup; `*word*` in the serif, `{g:…}` `{r:…}` `{y:…}` coloured |
| `S.list(at, labels, { y, w, revealed, start })` | numbered bars (a label may be `{ label, glyph, glyphColor }`); `.reveal(i, t)`, `.focus(i, t)`, `.unfocus(t)`, `.header(i, t, { x, y, s })`, `.out(t)` |
| `S.pill(at, text, { x, y, w, h, size, serif, glyph, fill, tone, pulse })` | a pill |
| `S.text(at, text, { x, y, w, size, align })` | marked text, its words rising one after the other |
| `S.card(at, { img, x, y, w, h, gray, label, caption, marks, contain, player, glyph, fill })` / `S.cards(at, items, { rows, w, h, y, at, stagger })` | a picture of the user's, a video card, a pictogram tile; a grid of them |
| `S.icon(at, { img, x, y, w, h, label, ring: [from, to] })` | a logo or an app icon as it is, glowing (a phone that rings) |
| `S.glyph(at, kind, { x, y, w, tile: true \| false \| "green" \| "red", round, color, label })` | a pictogram: check, cross, search, trophy, calendar, users, play, star, question, bolt, chart, phone, mail, clock, eye, thumbUp, warning, plus, arrow, rocket, database, target, money |
| `S.phone(at, { x, y, w, h, screen \| screens })` | a phone rising from below; `.show(i, t)` slides screen `i` up (`{ text, img, grid, bg, call, sub, textY, size }`) |
| `S.tree(at, parent, kids, { dir, x, y, w, h, gap, at, hidden })` | children (pills, or nodes) dropping in, each wired to the parent; `.reveal(i, t)` |
| `S.wires(at, parent, children, { dir })` | connectors drawn on, a spark riding the tip |
| `S.arrow(at, [x, y], [x, y], { bend, color })` | a curved arrow drawn on |
| `S.ping(at, node, { ring })` | rings growing out of a node (or two arcs opening out of its sides) |
| `S.mark(at, node, { kind: "circle" \| "frame" \| "underline" \| "strike" \| "box", color })` | a mark drawn on a node |
| `S.equation(at, rows, { y, x, at })` | rows of nodes, texts (pills) and signs (`+`, `=`, `vs`) |
| `S.sign(at, "VS", { size, color, glow, sfx })` | a sign alone; `S.shake(t, px)` jolts the camera |
| `S.count(at, { to, from, prefix, suffix, dur, size, color, label })` | a number climbing to its value |
| `S.file(at, { img, name })` / `S.prompt(at, { text, typeFrom, typeTo, glyph })` | a file that boils; a prompt typed letter by letter |
| `S.docs(at, n, { cols, imgs })` | document pages dropping in; `.light(i, t)` tints one green |
| `S.callout(at, [x, y], [x, y], text)` / `S.wave(at, { x, y })` | a line to a small label; a voice in a red box |
| `S.riser(t)` / `S.sound(t, name)` / `S.flash(t)` | a riser ending on t; a sound alone (a light role or a house name); a white flash (the breathers have theirs) |
| `S.clear(t, kind)` | everything of the current scene leaves (the title stays) |
| `stage({ project, full, fix, breath })` | `breath`: how the cuts to full screen are dressed (`flash`, `expand`, `punch`, `glitch`, `leak`, `whip`; project.json `stage.breath` otherwise) |
| `preview(a, b, style, { name, title, src })` (in `FULL`) | the end shown as the NEXT video, in a frame: `card`, `phone`, `upnext`, `film` (`EXPLAINER_PREVIEW=<style>` to compare); `name` its name, `title` the two lines above it, `src` the part of the clip shown |

### Options, run from the GTM by Pipecorn page

As the engine says (`GTM_OS_FROM_UI=1`): never a reel; each option its own short file in
`variants/` with `variants/variants.json`, cut with `$E/build.sh --slice A B` around the change.

## Non-negotiables

**The feed's safe zones** (`plugins/video/references/safe-zones.md`, 2026-10-05). The captions, the title, the figures, the next-video frame and the speaker's FACE stay inside x 0.095–0.905, y 0.128–0.774. Never in the bottom band (y ≥ 0.79) or under the buttons (x ≥ 0.84 from y 0.425). The frame rises to y 0.64 (the body may run under the feed's caption, the face may not), the title comes down to 0.156, and a figure is moved in at rest. After any change to the frame, `layout.mjs --measure --write`. Check a frame with `$E/safezones.mjs --overlay`.

**The speaker's words on screen for the whole short, verbatim**: one at a time, a word mended
(`fix`) never rewritten; the figures carry the ideas, never a paraphrase of the captions.

**Motion, always**: scenes joined by camera moves, motion blur on what moves, something new every
second or so; a still stage for more than 2 seconds is a fault to fix before delivery.

**Real names, real screens and real numbers only** (brand-kit.md). What the user did not supply is
drawn with their words and the house's pictograms, or not drawn; the delivery message says which.

**Nothing over the speaker's face**: the stage stays above the frame, the caption above the head.

**Light and shade, always**: every figure its shadow on the ground and its glow, a ground that is
lit, never flat black (nor flat white in the light theme).

**Any take, the same level**: the frame measured on the take (a close one narrowed, several shots
each framed), the storyboard written from its transcript with the same density (a scene every 4-8 s,
something new every second, each scene arriving composed), its sounds measured as heard. Nothing of
a worked example is reused but its method.

**The sound: the house pack on the big moves, a light one on what appears, heard**: the base skills'
pack on scene changes, cuts, hits and payoffs, the Motionix pack on every appearance, measured as
heard (`measure.mjs`) before delivery; never a sound per caption word.

**Loudness to standard**: −14 LUFS, true peak −1.0 dBTP, two-pass loudnorm (the engine's mix.mjs).

**Never rip audio, never regrade the footage.** The shelf and the pack only; the take's colours.

**Say what the edit cost**: a close take (the frame mostly the face), the words mended, the
figures cut or drawn with pictograms for lack of material, the music's licence when not stated.

## Iteration cost

| Change | Command | Time |
|---|---|---|
| A figure, a title, a scene | edit `plan.mjs`, `preview.mjs t …` | ~3 s a frame |
| A move, in motion | `build.sh --slice a b`, tiled at 15 fps | ~15 s |
| The frame (crop, caption, full framing) | project.json `stage`, `layout.mjs --print`, `preview.mjs` | seconds |
| The music, its drop, its level; a sound's level | `bed.mjs`, `bedDb`, `cueGains`, `sfxMasterDb`, `build.sh --audio-only` | ~30 s |
| Every sound as heard | `measure.mjs` (one family: `measure.mjs whoosh`; the light ones role by role: `measure.mjs fine`) | ~1-2 min (5-10 s each) |
| Everything, final (once per version: after a change, only the segments of the picture that changed are composited again) | `build.sh` | ~2.5 min for 50 s with a matte |
