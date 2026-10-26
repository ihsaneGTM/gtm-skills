---
name: short-editor
description: "Edit a raw vertical (9:16) take into a finished short in the Pipecorn VERTICAL LANGUAGE: the speaker's own words as big headlines at the TOP of the frame (Impact capitals with one Sacramento script accent) passing BEHIND them where their head rises into them (person matte), the real logos and product coming out from behind them, full-frame paper plates whose elements move in stop-motion under discreet subtitles, a music bed from the shelf, a sound design from the SFX pack (a camera flash on a change of shot, a click on what appears, a whoosh into the paper, a glitch on one text pop, a riser into the payoff), and audio finished at the -14 LUFS platform standard, verified numerically before delivery. An OLD-RADIO HOOK (the voice through an old radio set, the picture in an old CRT TV, on the first seconds only: around 7 s, never past 10 s) is a BONUS offered in the first question every time, never applied by default. Also assembles a RUSH (a long take where the speaker restarts each sentence) into one clean take first, and cuts the intro of a 16:9 video in landscape mode. Use when the user hands over a video file and asks to edit it, add headlines, subtitles, animations or sound effects, a radio voice or an old-TV look on the hook, cut the dead air, keep the good takes, fix the volume, or says montage, monte cette vidéo, edit this short."
user-invokable: true
---

# short-editor: a raw take becomes a finished short

The user hands over **one video file**. This skill does the rest: transcribes it, decides what to
illustrate, puts the speaker's words on screen, builds the graphics from the user's **real**
brand and product, cuts a camera rhythm, writes the sound, finishes the audio to the platform
loudness standard, and verifies the result numerically before handing it over.

**What a short looks like is settled: § The vertical language** (below the pipeline). Every rule
in it was a verdict from a review of a real short, over several passes. Do not re-open them, and
start every new short from them (`init.sh` scaffolds it).

**Read before the first cut, every run:**
- [`../../references/motion-language.md`](../../references/motion-language.md): the rhythm (zooms, transitions, when a graphic earns its place)
- [`../../references/beat-catalog.md`](../../references/beat-catalog.md): the figures available, and what each one is for
- [`../../references/pitfalls.md`](../../references/pitfalls.md), the sections a plan is written with: § Layout,
  § Transcription and captions, § Working method, § Text BEHIND the speaker, § More from the vertical pass,
  § The SFX pack, the flash, the radio hook. Every trap there cost an hour the first time.

**Read when the step needs it** (the engine's tools already follow the rest, which is about commands
written by hand):
- [`../../references/audio-spec.md`](../../references/audio-spec.md): at the sound (§ 3): the bed, the pack, the
  levels; `bed.mjs` and `measure.mjs` make the measures it describes
- [`../../references/brand-kit.md`](../../references/brand-kit.md): when the edit shows the user's brand, logos,
  product or numbers (their brand is set once in `workspace/brand/`, § Your brand, set once)
- `pitfalls.md`'s other sections: § Assembling a rush with a rush (§ 0.7), § The source file with an HDR take,
  § Audio before measuring a sound by hand, § ffmpeg and § The shell before writing a command of your own
- **The engine's figures: `node $S/api.mjs`** lists the modules; `node $S/api.mjs <module> [figure]`
  gives each figure's options, their defaults and the comment above it; `--find <word>` searches them.
  Never read the engine's sources to learn a signature (a figure's source is 10 to 60 KB; its entry,
  a few lines), and `$S/example/plan.mjs` shows them in use.

> **I cannot watch the video or listen to it.** Every claim I make about a cut comes from a
> measurement. `scripts/verify.mjs` is the only thing standing between "it's ready" and a silent,
> drifting or half-rendered file. Never skip it.

All paths below are relative to the root of the GTM by Pipecorn folder. `$S` means
`plugins/video/skills/short-editor/scripts`.

## Prerequisites (preflight: check before any work)

**Required, and not installable from here:** `ffmpeg` + `ffprobe` on PATH (`brew install ffmpeg`),
and `python3` (Xcode Command Line Tools: `xcode-select --install`). If one is missing, stop, tell
the user the exact command, and continue once it is there. The GTM by Pipecorn Connectors page shows the
same status.

**Everything else provisions itself.** `$S/bootstrap.mjs` runs at the top of `init.sh`,
`transcribe.sh` and `build.sh`: it installs the node packages into the skill folder, creates the
speech-to-text venv (faster-whisper, plus mlx-whisper for the GPU of an Apple Silicon Mac; about a minute, once per machine) and downloads the four Mixkit tracks of the music
shelf. Do not ask the user to run an install. The whisper weights (~1.5 GB) download on the first
transcription and cache in `~/.cache/huggingface`, so the very first run takes a few minutes longer.

**The fonts provision themselves too.** Impact is a macOS system font. The script accent,
**Sacramento** (Google Fonts, SIL Open Font License), is fetched by `$S/fonts.mjs` (`init.sh` runs
it) into the project's `assets/fonts/`, which the engine searches first: nothing is installed
system-wide and no font is committed. Without it the headlines fall back to Snell Roundhand, and
the render says so.

**Optional, per video**
- `swiftc` (Xcode Command Line Tools): builds the person matte with Apple Vision, which is what
  lets the headlines pass behind the speaker. macOS only. Without it there is no "behind".
- `GEMINI_API_KEY`: only if a beat needs a generated picture. Most edits need none.
- A wallpaper image, if the video uses the macOS product demo. Ask the user for one; the fallback
  gradient looks like a mockup, which defeats the point.

## Where things live

- One working directory per video: `workspace/projects/<slug>/` (the slug is a short name for the
  video). Everything for a cut lives there; the skill's `scripts/` stays read-only. **Never the
  scratchpad**: a reboot empties it, and it once cost a whole project.
- The finished file: `workspace/videos/<slug>.mp4`.
- **One edit, one project.** Every run starts a working directory of its own, with a slug no other
  project or video has, even for a video already edited. It never opens, copies or reuses another
  project's files (plan, words, matte, renders) or a video already delivered: two edits of the same
  take, even at the same time, never see each other, and a choice made for one short is never
  carried into the next. The skill, its references and `$S/example/` are the only references.
  Temporary files go inside the project (its `tmp/`), never in `/tmp`, where another edit may be
  writing at the same moment.
- `workspace/` is ignored by git, so updating GTM by Pipecorn never touches the user's videos.
- A real reference project, every figure used for real: `$S/example/` (`plan.mjs`, `edl.mjs`).
- The figures with the explainer's light (`$S/figures.mjs`), the end on paper (`$S/paperend.mjs`),
  their tools (`$S/pro.mjs`), and the Pipecorn generic (`$S/generic.mjs`): validated on the
  Pipecorn sales-calls intro (2026-10-05, v6); `templates/plan.mjs` shows each one in use.

## The pipeline

### 0. Set up the working directory

```bash
$S/init.sh workspace/projects/<slug> <source.mp4> workspace/videos/<slug>.mp4
```

Creates `project.json` (format and duration read from the file), `edl.mjs` and `plan.mjs`, both
scaffolded in **the vertical language** and commented, with a headline screen and a paper plate
ready to uncomment; `subs.config.json`, `cut.mjs`, and `assets/` with Sacramento in
`assets/fonts/` and the SFX pack in `assets/sfx-top5/`. Run every later command from inside that
directory.

### 0.2. Ask first, in ONE question

These belong to the user and cannot be guessed, so batch them into a single `AskUserQuestion`
before the first render:
- **The music.** The shelf is `plugins/video/assets/music/` (its README gives each track's style,
  length, loudness and licence). Four Mixkit tracks (Mixkit licence) and two the user added
  (Convergence, "do i clench my fists?" by ridgeclub): not Mixkit, fine in a video but they can block its
  monetisation, so say it once.
  A track shorter than the short has to be looped; say which ones are.
- **The pace**, when a published version of the same take exists: a derush may not run at the
  pace that was published (on the reference short it was 10 % slower). Measure it against the
  published file rather than asking (§ The recipe); ask only if there is nothing to measure against.
- **The old-radio hook: a BONUS, asked EVERY time, never on by default.** Four options:
  **No** · **Radio voice + CRT TV** · **Radio voice only** · **Let me compare**. On a yes,
  project.json gets `voiceFx: [{ "from": 0, "to": <CUT>, "preset": "am" }]` and, for the picture,
  `look: { "from": 0, "to": <CUT>, "preset": "crt" }`. **The hook is short: `<CUT>` comes around
  7 s, never past 10 s.** End both in the silence after the hook sentence, with the flash there; a
  change of shot inside that window is the cut, the flash hiding the switch back to today. A first
  change of shot later than that is not waited for: on a 50 s take the radio once ran to the first
  change of shot at 14.9 s, and it was far too long. The one exception, rare: a very clear change of
  shot right after the intro; then the hook ends on it, under the flash. On "let me compare", render
  the comparison reels (§ The recipe) and let the user pick (from the GTM by Pipecorn page, the options
  as separate files instead: § The recipe, the comparison).
- **The Pipecorn generic: a BONUS of every style, asked EVERY time, never on by default**
  (`plugins/video/references/pipecorn-generic.md`): about 6 s at the very end, Pipecorn, then its
  values replacing one another in one slot, then Pipecorn again, no music. **No** · **Yes**, with
  which values (1 to 4; `node $S/generic.mjs --list`; by default phone coverage, connect rate,
  pipeline).
- **Your voice made better: a BONUS, asked EVERY time, never on by default**
  (`plugins/video/references/voice-clean.md`): ElevenLabs' voice isolator takes the room's echo and the noise
  out of the take. **No** · **Yes, make my voice better**. It needs the ElevenLabs connector: without a key, say
  in one line that it exists (Settings › Connectors › Add key) and go on. On a yes, before step 1:
  `node plugins/video/motion/voice.mjs clean <source>`, then project.json › `source` is `<…>-voice.<ext>`
  (the same length, the picture untouched).

### 0.5. Probe the source, and leave its colour alone

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=pix_fmt,color_space,color_transfer,color_primaries -of default <source>
```

A phone take is often HDR (HLG or Dolby Vision): 10-bit, BT.2020, `color_transfer=arib-std-b67`.
Know it, and **do not convert it**. An HDR to SDR conversion is a grading decision: it moves
contrast, saturation and skin tone on someone else's footage, and the first assembly that shipped
one unasked came straight back. `rough-cut.mjs` passes pixels, bit depth, codec family and all
three colour tags through unchanged; `--tonemap` is opt-in and only on request. Re-encoding drops
a Dolby Vision RPU (the HLG base layer survives): say so rather than letting it be discovered.
Details, and the tone curve `--tonemap` uses: `pitfalls.md` § The source file.

### 0.7. If the source is a rush, assemble it first

A rush is a long take with restarts (the same sentence attempted several times, dead air): it is
assembled into one clean take before anything else. **Read [`rush.md`](rush.md)** then, and only then:
the whole procedure (`rough-cut.mjs`, the keep list, the checks) is there.

### 1. Transcribe, word by word

```bash
$S/transcribe.sh --lang en      # or --lang fr, the language actually SPOKEN
```

Writes `words.json`. **Verbatim, never translated**: the first run of this pipeline came back in
French for an English take and every cue hung on words the speaker never said. Check the detected
language against what you read. Every time in `edl.mjs` and `plan.mjs` is a real word onset from
this file, never a round number picked by feel.

```bash
node $S/words.mjs              # words-fixed.json: every word on the voice, the doubtful ones listed
```

The transcript's times are a by-product of its decoding: it puts a word in the silence before it
is said, and ends a phrase before its last syllable ("listed." 0.34 s early on the reference take,
a review round). `words-fixed.json` gives every word its onset `a` (moved out of a silence onto the
voice's attack) and, before a pause, its real end `z`, measured on the envelope; write the plan on
`a` and `z` (output time = source time / speed). For a doubtful word: `words.mjs env <a> <b>` (the
envelope with the words on it), `words.mjs end <t>` (where the phrase going on at t stops),
`words.mjs say <a> <b>` (what is said there, transcribed alone). Never a script of your own for it.

### 2. Read the transcript and decide the pictures

This is the judgment step, and it is the whole job. Read the transcript end to end and ask, per
sentence: **does this sentence need a picture, and is there an honest one?**

- **The words are not a beat, they are the text layer**: every phrase gets its headline screen at
  the top (§ The vertical language). What you decide here is the PICTURES.
- A beat exists because a sentence needs it, never to fill silence: roughly one graphic per 15-25 s
  of talking head. The first cut had eight and three were cut in review.
- **No bullet lists.** A list on screen is a slide; every one was rejected.
- **Every number on screen is a claim.** Without the real figure, cut the beat; say it once, and if
  the user does not supply the number, the beat does not ship.
- When the speaker names their product, show the **real** one (`brand-kit.md`), **unless they are
  already showing it**: a capture slid over a shot where the speaker holds their laptop up to the
  camera made no sense and was removed. Look at the shot first.
- **Play with the matte**: what the speaker names can come out from behind them
  (`screen({ emergeFrom })`, `chips()`), because they are cut out in front of everything. **Not
  round their head**: the orbit of logos was refused as AI slop, and so was the wall of big logos
  tried in its place.
- **A full-frame illustration is a paper plate** (`cover()`), and while it is up the headline steps
  down to discreet subtitles: an illustrated screen plus big headlines is too much at once.

Propose the picture list to the user in plain language before building it. It is far cheaper than a
render. Everything shown must be the user's real material: their logo, colours, product screens and
numbers go in the project's `assets/` (`brand-kit.md` says what to ask for). Two set-pieces exist in
the engine for a product demo: **the macOS demo** (`MAC` in edl.mjs, `macos.mjs`: the screen wakes,
the dock icon bounces, the app opens and the product builds inside it, then the window is pushed
forward until it IS the full-frame card) and **the map** (`MAP` in edl.mjs, `gtmos.mjs`, reading a
`gtmos-nodes.json` the project provides; `$S/example/gtmos-nodes.json` shows its shape). Both take
the user's own data; never draw them with invented content.

### 3. Write `plan.mjs` and `edl.mjs`

`plan.mjs` is what is drawn and, in the vertical language, the camera too (`STEPS`, which
`speaker.mjs` reads to follow the head through the camera). `edl.mjs` is the sound, plus the hooks
of the two set-pieces when a video uses them. Both are scaffolded and commented; `$S/example/` is
the reference. The rules broken most often:

- **The sound is a short list**: the music bed; a whoosh on a camera move (`whoosh_out`,
  `swoosh_in`); **the SFX pack**, one role each (`plugins/video/assets/sfx/README.md`): the
  **flash** on a change of shot (`flash()` in `titles.mjs`, the picture blowing out and the sound
  together, on a change of framing, not on every jump cut), the **click** on what appears (a sticker
  landing, `stickers({ land })`; anything else that pops, one cue), the **whoosh** on a transition
  into a paper plate, the **glitch** on ONE text pop (the first yellow word of the hook), the
  **riser** ending dead on the payoff word; a `uipop` when a screen appears; and the paper's own
  sounds (`sheet_in` under the whoosh, `ptick`, `felt`). Nothing else: no sound per headline word,
  no hit after the riser, none of the old synthesised taps, shutter or pens. The templates carry
  each of them, commented where it needs a time.
- **No blur band** (`blurBand: 0`): `shade()` darkens the top of the room behind the speaker
  instead. The progressive blur and its one-window-per-beat rule belong to the older subtitle layout.
- **Lay the headlines out on the room the head leaves**, measured, not guessed: `node $S/room.mjs
  --phrases` (after matte.mjs, before the plan) gives, phrase by phrase through the camera, the
  highest the head goes and the part of each height it takes; `node $S/room.mjs` does it for the
  plan's own headline windows. Then:
- **Every headline on the under layer goes through `node $S/occlusion.mjs`** before the render:
  18 % of a word hidden warns, 30 % refuses. The fix is a block moved or lifted, a word crossing the
  line above (`overlap`), or the word dropped from the screen, never a smaller word nobody can read.
- **The music bed comes from `bed.mjs`, never from an ffmpeg chain written by hand.**
  `node $S/bed.mjs --map <track>` gives the track's shape in a few lines: tempo and beat grid,
  sections, drops, first note, measured once per track. Then
  `node $S/bed.mjs --track <track> --align <track s>@<video s>` (a downbeat or a drop on a word;
  `--from s` otherwise; `--muffle a[-b]` under a call, `--drops a-b` for a breather) writes
  `assets/music.wav` with the house end (low-pass sweep + exponential fade INTO the cut), and
  `bed`, `bedDb` (~15 LU under the voice by arithmetic) in project.json. It prints where the beats
  fall in the video.
- Name the chosen bed in **project.json** (`bed` / `bedDb`, which `bed.mjs` writes), not only in the
  `BED=` env override: `verify.mjs` re-imports `edl.mjs` and otherwise reports the music as a
  missing cue.

### 4. Look at it before rendering it

```bash
node $S/matte.mjs                                # the person matte (needs swiftc), once
node $S/preview.mjs 2.5 16.9 30.2 --out preview/ --width 1080 --sheet
                                                 # the COMPOSITE: camera + under + speaker + over, under
                                                 # a second a frame, four at once; --sheet: ONE picture,
                                                 # preview/sheet.jpg, each instant's time written on it
node $S/render.mjs --png 12.5 --layer under      # one layer alone (over by default)
node $S/check.mjs                                # the checks before a render, only their problems:
                                                 # occlusion (+ safe zones), onset, sequence (every word
                                                 # said on screen, once, in order); landscape: fit, verbatim
$S/build.sh --slice 7 16                         # one beat in motion, at the master's quality
```

`preview.mjs` is the only view that shows a headline going behind the speaker. A full render is
under a minute for 50 s of 1080x1920 with a matte, about 1.5 min for 80 s at 60 fps; a preview is
under a second a frame. Look at the sheet, not at frames one by one, and never assemble a sheet
by hand (this ffmpeg has no `drawtext`; `--sheet` labels it with the engine's canvas, as
`board.mjs` does for a comparison). `check.mjs` replaces running the checks one by one through
grep and tail; each still runs alone for its full report.

### 5. Render

```bash
$S/build.sh
```

Voice, effect bed, mix at the loudness target; the two layers rendered to files, then composited
over the camera and muxed. The publish is gated on ffmpeg's **exit code**: a truncated render never
replaces a good previous file. An audio-only change (levels, a cue, the music, the loudness target):
`build.sh --audio-only` rebuilds the sound in about 25 s on a 22 s short and leaves the picture
bit-identical.

The picture is composited in segments of about four seconds, kept in `.render/`: a build after a
change draws and composites again only the segments whose picture changed (`render.mjs
--fingerprint` tells which without drawing them) and joins them to the others. Measured on a 50 s
short at 1080x1920: 33 s the first time, 13 s after a word of a headline changed (1 segment of
13), 8 s when nothing changed. So check a detail with a preview or a slice, and render the whole
short **once per version**: the render after a small fix is cheap.
Nothing to clear by hand: a segment made from anything that changed is composited again (they take
about the master's size on disk). A slice is encoded like the master, on the Mac's media engine:
what it shows is what the master will be.

### 6. Verify, then deliver

```bash
node $S/verify.mjs
```

Container, sync, effect integrity (every cue audible), loudness, true peak, clipping, whether the
overlay is empty where nothing is scheduled, and whether the source's hard cuts land on their
output frame (the check that caught the picture running ten frames ahead of the layers; a cut
hidden under a flash is looked for again on brightness-normalised frames). **Non-zero exit means do
not ship.** Then `node $S/measure.mjs`: every family of sound as heard against the voice (by
subtraction on the effects bus, `audio-spec.md`), with the house aim and ✓/⚠, in a few seconds.
A ⚠ is a gain in `edl.mjs` (or `bedDb`) and `build.sh --audio-only`, never a picture render.

Then send the file with `SendUserFile` and report the numbers: the user cannot see what I see, so
the measurements *are* the proof.

**The Pipecorn generic, when the brief asks for it**: last, on the delivered file, once the
verify above passed (`plugins/video/references/pipecorn-generic.md`), from the project:
`node $S/generic.mjs workspace/videos/<slug>.mp4 --values <ids>`. It keeps the file without it
in `tmp/without-generic.mp4` and redoes it from there when it is run again; after any new render,
run it again. Give its numbers at delivery (the new length, the loudness, the generic's level),
and say once that its numbers are Pipecorn's claims, to confirm before publishing.

## The vertical language: how a short looks

Built on the first 21.7 s of a real short (`$S/example/`), in four passes on the picture and the
sound, then the SFX pack, then the old-radio hook as a bonus. The figures: `beat-catalog.md`
§ The vertical language. The sound: `audio-spec.md` § The vertical short.

### What was decided: do not re-open

**The techniques referential**: a technique added, validated or refused (a scene, a transition, a block, a sound, a rule) goes into this skill's `techniques.json` in the same change: its status, its date, Ihsane's reason, where it lives in the code and its doc. Never use a technique marked refused there.

| Asked for | The rule |
|---|---|
| Big text at the top instead of timid subtitles, passing behind the speaker | The words as HEADLINES at the top, one screen per phrase, each word on its onset, on the under layer so the head covers what it rises into; `occlusion.mjs` keeps every word readable. No bottom subtitles. |
| Impact, in combination with a script face | Impact capitals for the words, the payoff in yellow, and ONE script accent per screen in **Sacramento**, written across the yellow word. Snell Roundhand and Lobster were compared and are out. |
| A light whoosh with a de-zoom at the start of every video | Every short opens on a de-zoom 1.30 → 1.00 in 0.62 s, eased "out", with `whoosh_out`. |
| Really play with the matte | Things come out from BEHIND the speaker (`emergeFrom`, `chips`). Logos going ROUND the head (`orbit`) are out, and so is the wall of big logos tried in their place. |
| No capture over a screen the speaker already shows | Never a capture over a shot where the screen is already in the picture. |
| The paper style, but not headlines on top of an illustration | A full-frame illustration is a PAPER PLATE; on it the headline steps down to discreet subtitles: Impact only, small, in ink. |
| Movement on the paper, not smooth, few frames a second | What is ON the paper enters in STOP-MOTION: 8 poses a second, held, never faded, each a little off. |
| No little synthesised noises; no metallic hit | The synthesised taps, shutter and impacts are out; the SFX pack replaced them. Still no hit, no sound per headline word, none of the old pens. |
| Use the pack: the flash for a change of shot, the paper as a transition, clicks for what appears | The **SFX pack**, one role each: the flash (picture + sound) on the change of shot, the click on what appears, the whoosh into the paper, the glitch on one text pop, the riser ending on the payoff. |
| Satisfying sounds when the sheet arrives and what moves on it | The sheet lands with `sheet_in` (under the pack's whoosh); what moves on it sounds ON ITS POSES: the pack's click on a landing, `ptick` while it settles; a mark is the hand, one `felt` glide. |
| One arrow heard as a burst of little pen strokes (a felt chunk per pose) | **One mark, one gesture, one sound**: a continuous `felt` glide per mark (a soft brush swish, 7 dB under the old felt tip) (an arrow with its head, a tick, a ring), from the pose where it starts to the pose where it ends. The poses are the picture's rhythm, never the pen's. |
| The music louder: even the louder version was not enough | The bed on a short sits about 15 LU under the voice as heard; the landscape intro's level (33 LU under) is far too quiet here. |
| A radio voice and an old look on the hook, as an option | The old-radio hook (the voice through the `am` set, the picture in the `crt` TV, from 0 to the cut, gone under the flash) is ASKED in the first question every time and never applied by default. |
| Script and Impact side by side on one line (« of using MY PLATFORM. ») | Never: **one face per line**. The Sacramento accent gets a line of its own, above or below the Impact line it goes with, crossing it (`overlap`), the way the rest of the short stacks its lines: top to bottom, never left to right. `line()` warns when a line mixes the two. |
| The radio lasted far too long (to a change of shot at 14.9 s) | The hook is short: it ends in the silence after the hook sentence, around 7 s, never past 10 s. Only a very clear change of shot right after the intro moves it, onto that cut. |
| (2026-10-05, the sales-calls intro, v6) The polish of style 4: shadows, glows, motion blur, "très pro, style After Effects", keeping the paper and its choppy stop-motion | **`figures.mjs`, always**: `proHeadlines` (every word with a shadow in two layers, the yellow ones glowing, a short blur on the pop, a real exit that ends on the next screen's first word: never two screens in the same place; `glitch` drawn on the one word the pack's glitch sounds on), `proStickers` (the stop-motion untouched, the shadow lifting with the sticker), `proChips` (the logo out from behind the speaker, motion-blurred like a shutter, two shadows, a yellow glow, a gloss, a pop of light, a Motionix swish). The engine's `headlines`, `stickers` and `chips` stay for the paper's subtitles only. |
| A dark stage, a black-glass countdown and a dark generic at the end: "beaucoup trop différent… on est sur un fond [papier] d'habitude" | **The end speaks the paper**, never style 4's dark stage: the COUNTDOWN on scraps of the plates' paper stuck on the jacket, one a beat of the music (`paperCountdown`: the label on a white strip, each number on a square of grid paper taped at its top, a pile that grows, the pack's click 2.5 dB lower); the next video TAPED as a print on a sheet that drops over the cut, with a yellow sticker (`tapedClip`, `labelSticker`: NEXT EPISODE), its words as the plate's subtitles, the key words underlined in red marker as they are said. The sheet stays opaque until what follows has covered it. |
| A punchy generic with Pipecorn and its values at the end (Nico) | The **Pipecorn generic**, a bonus asked every time, added AFTER the render: `generic.mjs`, `plugins/video/references/pipecorn-generic.md`. Not drawn in the plan. |

Kept through the passes without a note: the shade over the top of the room, the words passing
behind the head, the real app icons as stickers with marks in status colours (green · orange ·
yellow · red), the swoosh on a punch, the pace measured against the published version. **Kept
without a note is not validated**: the orbit went through six versions without a word and was
refused on the seventh.

### The recipe: the numbers that made it work

- **Headlines** (`headline.mjs`, px at 1080 wide): one face per line, the lines stacked top to
  bottom (an Impact line and a script line are never side by side); small lines 118-150, the payoff word 150-305, the
  script accent 112-276, a SNELL size: Sacramento is drawn ×1.48 so its lowercase matches, measured
  on the face. The crossing: `overlap` 0.25-0.46, `rot` −5/−6. Three placements, all inside the feed's safe area: SEATED, centred, y
  0.17, maxW 0.81, the last line allowed to sink behind the hair; HOLDING something in the lower
  half, top-left, x 0.10, maxW 0.50, its right edge sliding behind the head; TIGHT SHOT (the head
  filling the top of the safe area), BELOW the head: `anchor: "bottom"`, y 0.765, the over layer
  (no `shade()` then). A spring pop on each
  word (1.24 → 1), a `slam` (1.9 → 1) for the one payoff of the minute.
- **The ground**: `shade()` on the under layer, down to y 0.47, alpha 0.55: the ceiling and the
  window go into shadow, the speaker does not.
- **Occlusion**: 18 % of a word warns, 30 % refuses, sampled 15 times a second through the camera. A
  word with no room outside the head is **dropped from the screen, never changed**, and the delivery
  message says which. Sacramento climbs far above its lowercase: a script word just above the head
  climbs into the line above (`overlap: 0.25`) instead of sinking onto it.
- **The camera**: the opening de-zoom, then a punch (1.12-1.14 in 0.09-0.10 s) only on a word that
  carries the argument, released on the next phrase; `anchorY` on the eyes, so a zoom grows the head
  downwards, away from the headlines. A step can ease: `[t, zoom, ramp, anchorX, "out"]`.
- **The plate**: `cover({ enter: "drop" })`; subtitles Impact 66 px in ink at y 0.215, `pop: 1`,
  `gap: 0.20`; the real icons as 360 px stickers; marks in the status colours; `stepFps: 8` on the
  stickers (settle 0.62 s) and the marks (dur 0.42-0.56 s, the last one short enough to finish before
  the cut).
- **What the speaker holds is not them**: `matteHoles` in project.json cuts it out of the matte (a
  laptop), `matte-holes.mjs`.
- **The sound, levels measured by subtraction under voice + music**: `sheet_in` −18 (16 dB under),
  `mallet` −24 (13 dB), `felt` −19 (17 dB), `ptick` −20 (clicks peaking 6 dB under the mix RMS),
  `whoosh_out` −21, `swoosh_in` −25, the bed 15 LU under the voice (cue −18.5 on the reference cut).
  **Re-measure it on every cut**: a quiet raw take and a dynamic `loudnorm` lifted it 7 dB above the
  arithmetic.
- **The pack** (cue gain · `align` = its transient in the file · as heard, by subtraction with
  `NO_CUES=<regex>`): flash −7 · 0.255 s · 9 LU under the programme; whoosh −9.5 · 0.94 s (its crest,
  at the plate's `at` + 0.01 s, when the sheet covers the frame) · 9 LU; riser −14 · 1.765 s (its END,
  on the payoff word) · 10 LU at its top; glitch −17 · 0.15 s · 13 LU; click −11 · 0.005 s · 12-16 LU;
  `sheet_in` down to −21 under the whoosh. Measured against a programme median of −13.9 LUFS
  momentary, residual floor −65 dB; re-measure on every cut.
- **The explainer's light** (`figures.mjs`, `pro.mjs`, px at 1080 wide): the headline's shadows a
  contact one (blur 5, down 4, 0.52) and a soft one (blur 24, down 14, 0.50); the yellow words glow
  in their colour (0.30, +0.35 the moment they land, fading over 0.4 s); a blur of 6 px on the pop,
  gone in 0.09 s; the exit 0.10 s (the block lifts 12 px, grows 3 %, blurs 9 px), ending on the next
  screen's first word. The glitch drawn on its word: an RGB split and five torn slices over
  0.22 s, on the frame the pack's glitch transient lands. A sticker's shadow on the paper: warm
  (rgb 54,40,20), far and soft in the air, tight once landed. A chip: 400 px, `fromX` from behind the
  head, 0.46 s outQuint, motion blur by sub-frames (a 180° shutter, up to 16), its swish 0.02 s after it starts.
- **The Motionix pack** (`assets/sfx-motionix/`, copied by init.sh; `mx(role, t)` in pro.mjs): the
  light sounds of what moves over the speaker, 14-21 LU under the programme as heard; `thin()` in
  edl.mjs drops one within 0.15 s of a whoosh, the flash, the glitch or a riser's end, or within
  70 ms of another light one. The paper keeps the pack's click and its own sounds.
- **The countdown** (`paperCountdown`): one piece a beat of the music (beats 81-86 of Convergence on
  the reference, the riser ending on the cut), x 0.5, y 0.735 (on the jacket), the label 0.175 above
  the numbers, 330 px squares; a drop of 0.10 for the numbers (a long one carried them over the
  label), settle 0.5 s at 8 poses a second, the click −13.5 (at −11 over the drop and the riser it
  took the file to −0.7 dBTP).
- **The taped next video** (`tapedClip`): a 740 px print at y 0.565, rotated −2.5°, the clip playing
  inside at its own rate (only the print moves in stop-motion), two strips of tape at +0.24 and
  +0.36 s with the `tape` sound; the sticker (`labelSticker`) 0.6 s after, at x 0.31, y 0.752, −5°.
- **The flash** (`flash({ at: CUT })`): up 0.075 s, late and steep; white 0.045 s centred on the cut;
  down 0.095 s; peak 0.82 white, not 1.0: the curve of the pack's own video (mean luma 22 → 83 → 208
  → 209 → 88 → 31 at 24 fps: the cut hides under the second white frame).
- **The bonus, on a yes**: voice `am`, the telephone band (380-3200 Hz, 24 dB/oct), a nasal +6 dB at
  1.25 kHz, a warm drive, hiss 30 dB and crackle 33 dB under the voice, loudness-matched to the dry
  voice over the zone, crossfaded over 30 ms in the silence before the first word after the cut;
  picture `crt`, the glass bulging (`lenscorrection` k1 0.10, k2 0.03, black corners), a glow
  (screen blend 0.28 of a σ 9 blur), a colour fringe, a cool white, scanlines every 4 px, a refresh
  bar rolling down, a rounded bezel. Both end on the cut, under the flash: around 7 s, never past 10 s.
- **Options to choose from, run from the GTM by Pipecorn page** (`GTM_OS_FROM_UI=1` in the environment):
  never a reel, back-to-back clips or a contact sheet, for this comparison or any other. Each option
  is its own short file in the project's `variants/` (a.mp4, b.mp4…) with `variants/variants.json`,
  as the run's rules say: the page plays them in its conversation and the pick comes back as the
  next message. The recipe below stays the same, only the delivery changes.
- **The comparison, on "let me compare"**: two labelled reels of the hook + the flash, back to back,
  each variant at the same loudness (they land within 0.5 LU): the voice with
  `VOICE_FX=none|fm|am|walkie|am+bed node $S/mix.mjs --out <file>` (fm light, walkie the strongest,
  `+bed` puts the music through the set too), the picture with
  `LOOK=film|vhs|crt $S/build.sh --slice 0 <CUT + 1.2>` (film = Super
  8, 12 images a second, dust and scratches; vhs = 30 images a second, a tracking band, "▶ PLAY"; crt
  as above). Labels drawn with the engine's canvas.
- **The pace of a derushed file**: measure it against the published short by matching the audio
  envelopes (on the reference, 93.5 % at ×1.10 against 58 % elsewhere, so it runs at `speed: 1.1`).
  Measure before assuming ×1.

### Good to know

- The SFX pack's licence is not stated by its author (a free creator giveaway): it is here for your
  own videos; do not redistribute the files.
- A paid script face (Relation, for example) is never fetched: if the user supplies the file, it
  goes in the project's `assets/fonts/`, named by project.json `script`.

## Landscape mode: the intro of a LONG video

A 16:9 video (a YouTube intro cut from a long face-cam video) follows the same pipeline with its own
layout, titles and checks (`titles.mjs`, `fit.mjs`, `verbatim.mjs`, `editEnd`). **Read
[`landscape.md`](landscape.md)** when the source is landscape, and only then.

## Non-negotiables

**The feed's safe zones** (`plugins/video/references/safe-zones.md`, 2026-10-05). Every text and every important element stays inside x 0.095–0.905, y 0.128–0.774. Never in the bottom band (y ≥ 0.79) or under the buttons (x ≥ 0.84 from y 0.425). `layoutHeadline` keeps the headlines there, and `occlusion.mjs` fails a line in a forbidden zone. When the head fills the top of the safe area (a tight shot), the words go **below the head** (`anchor: "bottom"`, `y: 0.765`, the over layer), never squeezed against the top edge. Check a frame with `$S/safezones.mjs --overlay`.

**The speaker's words on screen for the whole short.** LinkedIn autoplays muted; the text carries
the opening. In the vertical language that is the headline at the top, and on a plate the discreet
subtitles. The bottom `clean` captions were judged timid and do not come back unless asked;
`karaoke` was rejected as noisy on a talking head. **Verbatim**: a word may be dropped from the
screen for room, never rewritten, and the delivery message says which.

**Never a copy of what the speaker is already showing.** When they hold a screen up to the camera,
the screen IS the picture.

**The sound is the short list.** Bed, whooshes on camera moves, the SFX pack in its five roles, a
`uipop` for a screen, and the paper's own sounds. Anything else needs the user's ask first.

**The old-radio hook is a bonus, and it is asked.** Every short, in the first question; never
applied because it was applied last time.

**Loudness to standard, not to taste.** Target −14 LUFS, true-peak ceiling −1.0 dBTP, via ffmpeg's
two-pass `loudnorm` (EBU R128). Never a bare `volume=+NdB`.

**Never rip audio.** The shelf, the pack and procedural effects only. If the user wants a specific
sample, they supply the file; drop it in `assets/` and reference it as `sample:name.wav`. Extracting
it from YouTube is not editing work, and I say so plainly.

**Real names and real numbers only.** Logos, product screens, skill names and figures are the
user's real ones (`brand-kit.md`). A viewer can check.

**Never regrade the footage.** The colour is the speaker's.

**Say what the edit cost.** If the limiter is working 40 % of the time, if the room tone came up
with the gain, if a word was dropped for room or a beat cut for lack of a real number, say it in the
delivery message. The user can only decide about what they are told.

## Iteration cost

| Change | Command | Time |
|---|---|---|
| A level, a cue, the music, the loudness | `build.sh --audio-only` | ~25 s on a 22 s short |
| A sound's REAL level | the mix with and without it, subtracted: `NO_CUES=<regex>` for one sound, `NO_PAPER=1` for everything the figures emit | ~30 s |
| A radio voice variant (bonus) | `VOICE_FX=<preset> node $S/mix.mjs --out <file>` | ~20 s |
| A look variant on the hook (bonus) | `LOOK=<preset> $S/build.sh --slice 0 5.3` | ~40-60 s |
| The composite at one instant (camera + matte + both layers) | `preview.mjs t … --width 1080` | under a second a frame, four at once |
| How much of each headline word the head hides | `occlusion.mjs` | ~20 s |
| One beat's look, one layer | `render.mjs --png t [--layer under]` | instant |
| One beat in motion | `build.sh --slice a b` | ~20 s |
| Anything visual, final | `build.sh` | ~35-55 s for 50 s at 1080x1920 with a matte; ~13 s after a small change (only the segments that changed are drawn) |
| The keep list of a rush | `rough-cut.mjs --dry-run` | instant |
| The assembly itself | `rough-cut.mjs` | ~25 fps out + one full decode of the rush |

Prefer the cheap one. Most review notes are answered by a PNG.
