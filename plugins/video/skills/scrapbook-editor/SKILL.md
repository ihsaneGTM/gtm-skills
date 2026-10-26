---
name: scrapbook-editor
description: "Edit a raw vertical (9:16) take into a finished short in the SCRAPBOOK STYLE, as validated by the user (2026-10-05), reproduced exactly on any take: every pause cut out (jump cuts, the frame alternating wide and close on each one); captions low, three words at a time, the word being said in yellow; the hook in the reference's TWO FACES (white Archivo words, THE important word in Fraunces in yellow) with a line on PAPER; the paper only for the titles and two or three very important phrases: the reference's collage of small ruled notebook scraps, flat, written in a marker hand (Gochi Hand), landing and unfolding, breathing, folding away, the red marker drawing on it as it is said (a word struck out, an underline); die-cut emoji stickers with white outlines round the head for what the speaker lists; real reaction GIFs from GIPHY as polaroids, big (0.80 of the width) in the middle of the screen, always at the same place, dropped on and flicked away; sections on the same scraps swinging in with the camera punching; app icons joined by a marker arrow; real screens annotated in red; a paper sweep into a change of scene; the ask on paper to the end. Two shadows under everything, motion blur, After Effects style. Hip Hop 02 as the music bed 15 LU under the voice, a real paper sound on every paper and the Motionix pack, -14 LUFS, every sound measured as heard. Use when the user asks for this style, a scrapbook / meme / GIF / paper-label / collage edit, a list or tools video (« 7 skills », « top 5 tools »), jump cuts, or says monte cette vidéo en style scrapbook, mèmes, GIFs, étiquettes papier, style liste, style TikTok éducatif."
user-invokable: true
---

# scrapbook-editor: a raw take becomes a scrapbook short

The user hands over **one vertical take of themself talking**. This skill cuts every pause out of
it, then turns the frame into a scrapbook the speaker talks through, cut the way a motion designer
would in After Effects: the reference's title in two faces (white words, the important one in a
beautiful serif in colour, a line on paper) and stickers on the hook, the reaction memes of the
internet dropped on their face as polaroids, paper scraps for the titles and the very important
words only, the red marker drawing as they speak, stickers for what they list, the real screens
they name, captions low in the frame word by word, a music bed, and a sound for each thing that lands.

**The style is VALIDATED (the user, 2026-10-05): reproduce it exactly.** § The scrapbook language
(below the pipeline) is the look of the validated cut (`workspace/videos/scrapbook-dev-sales.mp4`, its
plan: [`example/plan.mjs`](scripts/example/plan.mjs)): the same figures, at the same sizes and places,
with the same faces, paper, motion, sounds and levels, on any take. It started as the MEASUREMENT of
a real edit (a 72.7 s list video, « 7 Claude skills », edited by the user for a client:
[`example/README.md`](scripts/example/README.md) is its full anatomy) and took six reviews to settle
(§ The user's decisions). `init.sh` scaffolds it; never invent another look, never vary one the user
did not ask to vary.

**This skill runs on the engine of the short-editor skill.** Its transcription, render, mix,
previews, build and verification are the same files: read
[`../short-editor/SKILL.md`](../short-editor/SKILL.md) § Prerequisites, § Where things live and
§ 4 to § 6 once; they apply here as written, and this file says only what differs. Read before the
first cut, every run:
- [`scripts/example/README.md`](scripts/example/README.md): the reference edit, beat by beat, and the development cut
- [`../../references/pitfalls.md`](../../references/pitfalls.md) § Transcription and captions, § Working method: the traps an edit is written with (its other sections when their step comes: § Audio before a sound measured by hand, § ffmpeg and § The shell before a command of your own; the engine's tools follow the rest)

Read when the step needs it: [`../../references/audio-spec.md`](../../references/audio-spec.md) at the levels (the loudness standard, how a level is measured as heard). The engine's figures: `node plugins/video/skills/short-editor/scripts/api.mjs <module> [figure]`, never their sources.

> **I cannot watch the video or listen to it.** Where a pause is, where the face is, how loud a
> sound lands: each one is a measurement (`tighten.py`, `face.mjs`, `measure.mjs`), then a look at
> composited frames (`preview.mjs`) and at a moment in motion frame by frame (`build.sh --slice`).
> `verify.mjs` stands between "it's ready" and a broken file. Never skip it.

All paths below are relative to the root of the GTM by Pipecorn folder. `$K` means
`plugins/video/skills/scrapbook-editor/scripts` (this skill), `$E` means
`plugins/video/skills/short-editor/scripts` (the engine). Run both by their absolute path.

## Prerequisites (preflight: check before any work)

The engine's: `ffmpeg` + `ffprobe` on PATH (`brew install ffmpeg`) and `python3` (Xcode Command
Line Tools) are required and not installable from here; stop and say the command if one is missing.
Everything else provisions itself: `$K/py.sh` runs the engine's `bootstrap.mjs` (node packages, the
speech-to-text venv with numpy); `init.sh` fetches the three faces (Archivo, Fraunces and the
marker hand of the paper, Gochi Hand by default: Google Fonts, OFL) into the project's `assets/fonts/`
(or finds them in `~/Library/Fonts`), and `sounds.mjs` the paper sounds
(eight Mixkit recordings, once per machine, into `plugins/video/assets/sfx/paper/`, never committed:
the Mixkit License allows them in videos, not their redistribution), prepared and measured into the
project's `assets/sfx-paper/`, and copies the Motionix pack from the shelf
(`plugins/video/assets/sfx/motionix/`, prepared by the explainer style; licence not stated in the
pack: see its README before any publishing) into `assets/sfx-motionix/`. Nothing is installed
system-wide.

Optional, and said when missing (never a blocker):
- `swiftc` (Xcode Command Line Tools): `face.mjs` finds the face with Apple Vision, so a polaroid
  lands ON it and the stickers stand AROUND the head. Without it, read the face on a preview frame
  and set project.json `face` ({x, y, w, h}, fractions of the frame).
- `GIPHY_API_KEY` in `.env.local`: the real reaction GIFs of the validated style (`gif.mjs`). Free:
  developers.giphy.com → Create an App → **API** (not the SDK GIPHY recommends: the SDK is for apps
  showing GIPHY's own picker; `gif.mjs` calls the API), 100 calls an hour, plenty for an edit.
  Without it: a GIF the user supplies (`media.mjs`), or a generated reaction picture; say so.
- `GEMINI_API_KEY` in `.env.local`: the generated illustrations and reaction pictures
  (`picture.mjs`, Nano Banana 2, about $0.07 each at 1K).
- Google Chrome (or Chromium, Brave, Edge) in /Applications: a screenshot of a PUBLIC page the
  speaker names (`capture.mjs`), when the user has no capture of their own.

## Where things live

As the engine says, and only this way: one working directory per edit,
`workspace/projects/<slug>/`, a slug no other project has; the finished file
`workspace/videos/<slug>.mp4`; never another project's files, even of the same take; temporary
files in the project's `tmp/`, never `/tmp`. The skill's `scripts/` stays read-only. The pictures of
an edit live in its `assets/media/`.

## The pipeline

### 0. Set up the working directory

```bash
$K/init.sh workspace/projects/<slug> <source.mp4> workspace/videos/<slug>.mp4
```

The engine's scaffold (project.json read from the file, subs.config.json, cut.mjs), then this
skill's `plan.mjs` and `edl.mjs` (every figure of the language, commented, ready to fill), the keys
of the language in project.json (`style: "scrapbook"`, `accent`, `captionKeep`), the face,
and the sounds, calibrated on the voice of this source (`voiceM`, the voice's momentary median, and
`sfxMasterDb` 0: each role is then set in LU under the voice, as heard). Run every later command
from inside that directory.

### 0.2. Ask first, in ONE question

These belong to the user and cannot be guessed; batch them in one `AskUserQuestion`:
- **The music.** A bed by default (the third review: « ça mériterait de mettre une musique de fond »):
  offer **Hip Hop 02** first (Mixkit, Lily J: the validated cut's, the style's default; the Mixkit
  licence allows it in a published video), then **Convergence** (the house track of the other
  styles), the rest of the shelf (`plugins/video/assets/music/`, its README), then « No music ». To
  choose by ear, a board (the same 12 s with each track, all at the same level):
  `node $K/music-board.mjs --to 12 mixkit-hip-hop-02-738.mp3@0 convergence.mp3@16.6 …` after a build
  (it puts the project's own bed back at the end). It goes 15 LU under the voice (`$K/music.mjs`,
  § The look). Say once that the tracks that are not Mixkit (Convergence, ridgeclub) can block the video's monetisation.
- **The brand's colour** (project.json `accent`; `wordColor` for the important word if it should
  differ; the accent of Your brand when it is set, `workspace/brand/`, see
  `plugins/video/references/brand-kit.md` § Your brand, set once): THE important word in Fraunces and the caption word being said. Yellow #FFD43B by
  default (Pipecorn's). Check it on the take: it sits over hair, skin and walls (on the development
  take, coral and orange vanished in the speaker's hair and face, the yellow read everywhere).
  And the names the captions must write as they are (`captionKeep`: the brand, the product, people,
  « Station F »).
- **The real material**: screenshots or screen recordings of what they name (their product, a
  repo, a page), their logos. Without them, public pages are captured (`capture.mjs`); a private
  screen is never invented.
- **The Pipecorn generic: a BONUS of every style, asked EVERY time, never on by default**
  (`plugins/video/references/pipecorn-generic.md`): about 6 s at the very end, Pipecorn, then its
  values replacing one another in one slot, then Pipecorn again, no music. **No** · **Yes**, with
  which values (1 to 4; `node $E/generic.mjs --list`; by default phone coverage, connect rate,
  pipeline).
- **Your voice made better: a BONUS, asked EVERY time, never on by default**
  (`plugins/video/references/voice-clean.md`): ElevenLabs' voice isolator takes the room's echo and the noise
  out of the take. **No** · **Yes, make my voice better**. It needs the ElevenLabs connector: without a key, say
  in one line that it exists (Settings › Connectors › Add key) and go on. On a yes, before step 1:
  `node plugins/video/motion/voice.mjs clean <source>`, then project.json › `source` is `<…>-voice.<ext>`
  (the same length, the picture untouched).

Run from the GTM by Pipecorn page, the brief of the first message answers it; do not ask again.

### 1. Transcribe, verbatim

```bash
$E/transcribe.sh --lang en      # the language actually SPOKEN; never translated
```

`words.json`, on the clock of the RAW take. If the take is a rush (the same sentence attempted
several times), assemble it first with the engine's `rough-cut.mjs` (short-editor/SKILL.md § 0.7),
then transcribe the assembly. Then `node $E/words.mjs` (the engine's): `words-fixed.json`, every word's onset
moved out of a silence onto the voice and its real end before a pause, the doubtful ones listed;
`words.mjs env|end|say` to read one (short-editor/SKILL.md § 1). Never a script of your own for it.

### 2. Cut every pause: the jump cuts

```bash
$K/py.sh tighten.py --dry-run    # what it would cut
$K/py.sh tighten.py              # source/tight.mov; project.json, words.json, shots.json repointed
$K/py.sh tighten.py --keep 0.10 --min-pause 0.16    # the defaults, measured on the reference
```

Every silence of 0.16 s or more goes, down to 0.10 s at the join (0.06 s after the last sound, 0.04
s before the next); the leading silence and the tail too. On the reference, no pause left is longer
than 0.32 s, and a join comes roughly every 2 to 3 s: the speaker never breathes on screen. **Each
join is a jump cut**: no flash, no whoosh hides it; the camera marks it by alternating the frame
wide / close ON the cut (§ The look).

Where speech stops is MEASURED (a 10 ms envelope, hysteresis at room + 12 / room + 5 dB), never
read off whisper. Whisper's onsets are checked against it: an onset inside a measured silence with
a soft sound under it (room + 9 dB) stops the cut 50 ms before it; an onset in room tone is whisper
being early (it was, by 0.35 s, three times on the development take) and moves to where the speech
starts. It reports both.

The kept stretches are written once into **`source/tight.mov`**, in whole frames (each stretch's
picture and voice last exactly as long: unsnapped, 13 joins once put the lips two frames behind the
voice), at the source's bit depth with its colour tags (never a regrade). Then, as the engine's
`rough-cut.mjs --adopt` does, project.json points at it (`source`; the take stays in `rawSource`),
`words.json` is put on its clock (the take's transcript stays in `words.raw.json`), and
`shots.json` lists the shots between the joins. Not the engine's on-the-fly `cuts`: a project with
cuts cannot be rendered by slices, and slices are how a moment is looked at in motion. `tighten.py`
always starts again from the take, so running it twice is safe; a cut the speaker wants (a retake,
a stumble) goes in project.json `manualCuts` (seconds of the take), then `tighten.py` again.

A change of SCENE inside the take (a teaser shot at the end, another room) is not in `shots.json`:
find it where the frame's light jumps (`ffmpeg … signalstats` YAVG frame by frame) and give it to
the plan (`SCENE`): the camera goes wide there and the paper sweeps it in.

### 3. Where the face is

```bash
node $K/face.mjs      # assets/faces.json, 5 a second, on the OUTPUT timeline
```

Apple Vision, through the cuts. The plan reads it through the camera (`faces(P, camera(STEPS))`):
`F.slot()` is where EVERY polaroid of the video lands (the frame's centre line, 0.08 under the
median face's centre, 0.44-0.50: the middle of the screen), `F.faceLine()` the face's own line
(its median centre, 0.36-0.50) for the key ideas and punch phrases written over the face,
`F.top(t)` the height above the head for the keywords,
`F.around(t0, t1, n)` spots round the head, `F.over(t0, t1)` the face's box. Run it again after
every `tighten.py`.

### 4. Read the transcript and decide the pictures: the judgment step

Read the whole take and give it the reference's density: **a new thing on screen every 1-3 s**
(the reference: 50 figures in 72.7 s; the development cut: 49 in 47.1 s). Per sentence, pick the
figure that says it, from § The look:

- the **hook** (the first sentence): the title in the reference's three lines (a white line; THE
  word of the promise in colour with white words beside it; a line on paper) and stickers round the
  head if the sentence lists or implies roles, tools, a team;
- a **feeling, a cost, a failure, an exaggeration, a comparison**: a real reaction GIF as a polaroid
  (the validated cut: Pepe Silvia for « search through thousands of platforms », Key & Peele sweating
  for « full disclosure, I'm not the best », Buddy the Elf on the phone for « what to say on a call »,
  « Let's get ready to rumble » for « versus »), its caption on the chin, four or five in a short;
- a **list said in passing** (« the good, the bad, the fails… ») and the asides (a place, « a
  series », « stay tuned »): stickers, one per word (the paper is NOT on every keyword: the captions
  already say the words, « l'effet papier n'est pas utilisé tout le temps »);
- a **list that structures the video** (« 5 tools »): each item's name on paper with its number,
  as a section (1, 2, 3, 4, 5);
- the **key idea** of a sentence: the two faces (a white word, the important one in colour), no paper;
- the **punch** of a paragraph (« try these! », « no editing needed »): the phrase on paper over
  the face, line by line, a word struck out in red if the speaker negates it (two or three in a
  short, not more);
- a **new section** (« number 2 », a product named as a chapter): the header, the camera punching in;
- a **thing named that can be shown**: its real screen (screenshot, recording, phone page),
  annotated in red; two tools working together: the connect icons; a sound or a voice: the
  waveform; a price, a « free », a « who wins »: a sticker;
- a **change of scene**: the sweep, the music dropping on it; the **ask** at the end (« comment X »):
  the keyword on paper, to the end.

**Propose the picture list to the user in plain language before building**, one line per beat
(time · words · figure · picture), with where each picture comes from: it is cheaper than a render.
Run from the GTM by Pipecorn page, decide by these rules and say it in one message.

Get the pictures:

```bash
node $K/gif.mjs sheet "pepe silvia" "conspiracy board"   # GIPHY candidates on ONE contact sheet: look, pick
node $K/gif.mjs get <id> --name pepe                     # → assets/media/pepe/ (frames, 0.80 W, looped)
node $K/media.mjs ~/Downloads/rec.mov --name demo --from 2 --to 6 --width 0.76 [--audio]
node $K/capture.mjs https://github.com/<org>/<repo> --name readme --phone --tall
node $K/picture.mjs "a skeleton waiting at a desk covered in cobwebs" --name waiting --look cartoon
```

- **Reaction GIFs** come from GIPHY by their meme's own name (« pepe silvia », « key and peele
  sweating », « buddy the elf phone », « michael buffer », « this is fine », « skeleton waiting »):
  two to four searches on one `sheet` (`tmp/gif-<words>.jpg`), then the cleanest: no watermark, no
  burned-in line that contradicts the speaker, 480 px wide or more, the reaction readable in its
  first 1.5 s (a card shows 1.5-2.6 s of it). A GIF the user drops in is prepared with `media.mjs`.
- **Real screens** are the user's (asked for) or a public page captured; never a screen invented,
  never a page behind their login.
- **Illustrations** (`picture.mjs`) for what has no real picture: `clipart`, `infographic`,
  `halftone`, `cartoon` (a reaction panel when no GIF fits). Never a real product, a real logo, a
  real person or a number: those are real material or nothing.
- Every number on screen is a claim: a figure the speaker does not say is not drawn.

### 5. Write `plan.mjs` and `edl.mjs`

`plan.mjs` is scaffolded with every figure, commented, in the order they appear in a short; the
development cut (`example/plan.mjs`) uses them for real. Every time is a word onset of `words.json`
(the tightened clock) put on the output by `on(i)` (onset) and `off(i)` (end). The camera is one
line (`punches({ joins, sections, scene })`). `edl.mjs` needs no edit: the figures bring their
sounds (§ The sounds), and `EXTRA_CUES` (in plan.mjs) carries the rest: the riser climbing into a
change of scene, the opening whoosh, a demo's own sound. The bed is one command:

```bash
node $K/music.mjs plugins/video/assets/music/mixkit-hip-hop-02-738.mp3 --start 0 --under 15 --drop 43.3
```

`--start` where in the track the short begins (Hip Hop 02 from 0 s, as validated; another track:
look at its short-term loudness and put its swell on the hook's promise, Convergence from 16.6 s),
`--drop` the second of a change of scene (the bed is gone in 0.12 s on the cut, the new scene in its
own sound); without a change of scene, no `--drop` (a 1.2 s fade at the end).

**Choreograph, one move at a time** (the user reads a collision as unpolished): two figures never
share a zone at once; the one leaving has gone (its exit is 0.13-0.20 s) before the next lands in
its place (end it 0.04-0.07 s before the next one's onset); the title above the head, stickers at
the sides (x 0.13 / 0.87, clear of the hair), polaroids and punch phrases on the face, captions low.

### 6. Look at it before rendering it

```bash
node $E/preview.mjs 1.2 4.0 7.5 12.9 --out preview/ --width 720   # the composite, ~1 s a frame
$E/build.sh --slice 0 9                                            # the hook in motion (~15 s)
ffmpeg -i slice.mp4 -vf "select='between(n,0,9)',scale=240:-2,tile=5x2" -frames:v 1 hook.jpg
```

Look at every figure once on a preview (a polaroid on the FACE, the keywords above the HEAD,
nothing cut by an edge of the frame, the captions readable on the picture under them), then at each
kind of entrance frame by frame in a slice (it lands in 4-9 frames, motion-blurred, never a frame
held twice).

### 7. Render, measure, verify, deliver

```bash
$E/build.sh
node $K/measure.mjs      # every sound as heard, in LU under the voice
node $E/verify.mjs      # non-zero exit: do not ship
```

`measure.mjs` takes each role out of the effects bus (`NO_CUES`), and reads what is left against the
voice, before the loudness pass: a role more than 2 LU off its figure (§ The sounds) is a line in
project.json `cueGains` ({"paper": -2}: 2 dB quieter), then `build.sh --audio-only`. (Not by
subtracting two finished mixes: the dynamic loudnorm leaves the voice 21-24 LU under the programme,
and a click is quieter than that residue.) Then deliver (`SendUserFile`, or the GTM by Pipecorn page
plays it): the file, the numbers of verify.mjs, what the edit cost (§ Non-negotiables).

**The Pipecorn generic, when the brief asks for it**: last, on the delivered file, once the
verify above passed (`plugins/video/references/pipecorn-generic.md`), from the project:
`node $E/generic.mjs workspace/videos/<slug>.mp4 --values <ids>`. It keeps the file without it
in `tmp/without-generic.mp4` and redoes it from there when it is run again; after any new render,
run it again. Give its numbers at delivery (the new length, the loudness, the generic's level),
and say once that its numbers are Pipecorn's claims, to confirm before publishing.

## The scrapbook language: how a short looks

Sizes are fractions of the frame WIDTH, heights fractions of the frame HEIGHT, at 30 fps.

### What stays measured from the reference

| What the reference does | The rule |
|---|---|
| The speaker never breathes: no pause longer than 0.32 s, a join every 2-3 s | Every pause cut (`tighten.py`), each join a jump cut |
| No music anywhere | Taken back by the third review: a bed under the whole short (§ The look, The music); the paper sounds and the packs on top |
| Captions low in the frame, word by word, lower case, never two lines | `captions()`: 3 words at most, each on its onset, replaced (never scrolled), nothing pre-shown |
| The captions step aside when a paper phrase or a header says the same words | `mutesCaptions` on a punch phrase (and the hook); a header mutes them while its words are said (`saidUntil`) |
| A title over the first sentence, gone on its last word | `hookTitle()` |
| Reaction memes ON the face while the speaker says what they react to | real GIFs, `card({ style: "meme" })` at `F.slot()` (the middle of the screen, 0.80 W: the sixth review), 1.5-2.6 s each |
| Keywords on paper above the head, one per word said; a punch phrase over the face | `label()` — but the fourth review took it back in part: paper for the titles and two or three very important phrases only; a list said in passing → `sticker()`s, a key idea → `title()` in two faces |
| The hook's art direction: a white line, THE word in a soft heavy serif in colour beside white words, a line on paper | `hookTitle()` (`title()`), as measured |
| Each section announced, its number and name | `header()` |
| The real thing on the face: a README on a phone, a chat with a red box, a workflow | `card({ style: "shot" / "phone" / "ghost" })`, `notes` in red, a `cursor`, `scroll` |
| Two app tiles, a line from one to the other; white bars at the mouth for a voice | `connect()`, `waveform()` |
| Every paper figure BREATHES once there: two poses, 8-7-8 frames, an edge moving 0.6-1 px at 720 | `poseOf`, `twoPoses` (book.mjs), on every paper and sticker |

### The look (validated 2026-10-05: § The user's decisions)

| | The rule |
|---|---|
| **Two faces over the picture, a hand on the paper** (the reference's: « une combinaison de deux polices, un mot important en couleur, une très belle police »; « pour les textes sur le papier, une police un peu écrite à la main ») | ARCHIVO (the GTM by Pipecorn interface's), variable: white words over the picture and the captions ExtraBold 800 at 100. FRAUNCES Black, SOFT 100, opsz 72: THE important word, in colour (book.mjs `WORD`), never on paper. A MARKER HAND for every word ON PAPER (labels, a title's paper line, sections, a sticker's tag, a polaroid's caption): `hands.mjs`, project.json `paperFont` — **Gochi Hand** by default (the user's pick on the board of eight, 2026-10-05: `workspace/videos/scrapbook-planche-4-polices.jpg`), or kalam (the closest to the reference's), caveat, caveatbrush, patrick, marker (Permanent Marker), shantell, grandstander; each scaled to the same x-height (0.52 of the face size) and a thin one thickened to a marker's stroke (`fat`) |
| **Colours** | the reference's paper: white notebook scraps (251,249,249, faint rules); ink #141414 multiplied into the paper; white words held off the picture by their shadows; the red marker #E5322D; the accent (project.json `accent`, yellow #FFD43B by default) on THE important word and the caption word being said (a paper gets it only on a plan's `tone`) |
| **Light** | everything casts TWO shadows: a contact shade baked in (paper pieces shade one another: blur 0.0042 W, down 0.0016 W, 30 %) and a soft one from its silhouette (blur 0.019 W, down 0.012 W and right 0.004 W, 36 %); while a figure flies in, its shadow falls 2.6 × further, 10 % wider, half as dark, and tightens as it lands (`castShadow`, `lift`) |
| **The paper** (the reference's, measured: v3's torn pieces were taken back in the third review, the newsprint in the fourth) — ONLY for the titles (the hook's paper line, a section's name and second line, a numbered item, the ask) and two or three very important phrases | ruled — a COLLAGE of scraps of white notebook paper, one per letter or two (0.45-1.15 of the face size wide, « try these! »: 1.02 1.10 0.49 0.98 0.81 0.96), rounded corners cut by hand (0.022-0.044), each its own height (top 0.03-0.23 above the tallest letter, foot 0.28-0.36 under the baseline, one in four hanging lower), crooked ±0.6°, overlapping 0.05-0.15, the paper starting 0.30-0.42 before the first letter and ending 0.34-0.48 after the last; faint rules every 0.082 of the face size; a 2 px soft shadow along every edge; FLAT (no shading, no gradient: « j'aime pas le dégradé sur le papier »). ONE paper: no newsprint anywhere (« c'est pas le bon papier, je l'aime pas du tout »; `paper: "torn"` now draws the scraps). A phrase is one row of scraps per line, the rows overlapping a little, offset ±0.016 W and crooked the other way |
| **Arrivals** (`motion`) | `toss` (a paper): from 0.05 W below and 0.035 W to the side, 1.14 ×, ~6° off, unfolding (scale y 0.25 → 1.06 → 1 in 4 frames, the user's pick of v2; the paper stays flat while it opens) and settling a hair past, 0.24 s · `slap` (a sticker, a number's tile, the hook's promise at `amp` 0.32): 1.55 × and 17° in a damped bounce, 0.30 s · `drop` (a polaroid): from 0.07 W above, 1.22 ×, 8° off, 0.30 s · `swing` (a section's name): from 0.78 W to the side, overshooting, 0.26 s · `rise` (a caption word): 0.86 → 1, up 0.15 of its size, 0.10 s |
| **Exits** | `fold` (a paper folds back up: scale y → 0.12, 0.13 s) · `flick` (a polaroid, off the side turning, 0.20 s) · `popout` (a sticker: 1.12 × then gone, 0.16 s) · `swingout` (a section's name, on its way, 0.20 s); a multi-line phrase lands and folds line by line (2 frames apart) |
| **Motion blur** | while a figure moves, 6 instants over half a frame (a 180° shutter) averaged (`drawMoving`); `project.json motionBlur: false` turns it off |
| **The marker** | drawn ON as it is said (eased, 0.20-0.30 s): `strike` across a word, `underline` (under the descenders, curling up at its end), `circle` (once round and a bit past), `burst` (three strokes beside a word), `arrow` (curved, its head drawn back); a felt tip (a tapered core, a lighter second pass); on the picture (an arrow, a burst) a white halo under it so it reads on hair or a red jacket; the scribble heard, cut to the stroke |
| **The camera** (`punches`) | the opening frame starts at 1.14 and settles to 1.0 in 0.6 s (ease-out); every jump cut alternates wide 1.0 / close 1.08 ON the cut; a section punches to 1.10 in 0.22 s and the next cut takes it back wide; a change of scene goes wide and pushes in to 1.07 over the rest. Figures set by the face go through it (`faces(P, camera(STEPS))`) |
| **Captions** | Archivo ExtraBold 0.060 W, centred at y 0.765, white held off the picture by a soft shadow (0.22 of the size, 55 %) and a dark hairline (0.07 of the size); the word being said in the accent colour until 0.12 s after its end; each word rising in |
| **The hook** (`hookTitle` → `title`) | the reference's three lines, measured: centres 0.059 and 0.071 of the height apart, the last just above the eyebrows (≤ 0.278): white Archivo (0.075 W) · THE word in Fraunces in colour (0.135 W) with white words beside it (0.066 W) · a line on paper (0.089 W); the runs land one after the other from the first frame (0.07 s apart: the white words rise, the coloured word is slapped on, the paper tosses in); the coloured word beats when said (1 → 1.045 → 1 in 0.2 s); white and coloured words leave as the reference's (squashed, then up in a blur), the paper folds; the captions step aside while it says the same words |
| **Two faces elsewhere** (`title`) | the key idea of a sentence: a white word and the important one in colour, over the face or above the head, no paper (« waterfall / enrichment », « better data »); a white sprite with a tight shadow baked in and the soft shadow under it |
| **Stickers** (`sticker`) | an emoji (or a transparent picture) about 0.15 W, a white border 0.09 of its size grown round its outline (die-cut), a hairline of shade on the white edge, a vinyl sheen; slapped on, breathing, popped out; its label under it on one ruled scrap (`text`, the marker hand 0.05 W); round the head at x 0.13 / 0.87 (a fifth above the head), one per word: what the hook implies, a list said in passing, the asides (the user: « j'aime bien les petits stickers avec les contours blancs ») |
| **Polaroids** (`card` meme / picture) | the picture 0.80 W (0.78 for a picture; a tall one narrower, never taller than 0.30 H, so the chin clears the captions), a flat white border 0.055 of it (the chin 0.15, 0.20 with a caption written on it in the marker hand), a hairline round the picture, flat tape across the top; ALWAYS at `F.slot()`; tilted 3.2°, the other way each time; dropped on, flicked away |
| **Sections** (`header`) | the name on the scraps (the marker hand, 0.098 W) swinging in from the side (`dir`), the second line on smaller scraps under it (0.058 W) landing on its word, a number on a ruled tile (0.12 W) as tall as the block at its left, slapped on first; the red underline drawn 0.30 s after the name, between it and the second line; the camera punching in. A video that is a list (« 5 tools »): each item is a section with its number |
| **Connect** | two icons as die-cut stickers, 0.22 W, 0.06 W apart, slapped on one after the other, the marker's arrow from the second over to the first |
| **The sweep** | a sheet of the same ruled paper 1.35 W wide (rules 0.034 W apart) swept across the whole frame (right to left, 0.44 s, ease in-out), covering it on the frame of a change of scene; the captions off under it, the music dropping on it |
| **The music** (`music.mjs`) | a bed under the whole short, its momentary median 15 LU under the voice's (style 01's house level, validated: « even the louder version was not enough »), Hip Hop 02 by default from 0 s (the validated cut's; another track started where its swell lands on the hook's promise), faded in over 0.25 s, gone in 0.12 s on a change of scene |

### The sounds

One role each (`book.mjs SOUNDS`), its level in **LU under the voice, as heard** (the loudest
momentary loudness of the sound against the voice's momentary median, `measure.mjs`); the
development cut lands each within 0.5 LU of its figure:

| role | when | sound | LU under the voice |
|---|---|---|---|
| `paper` | a paper lands: a title's paper line, a punch phrase (once per phrase), a numbered item, the ask | Mixkit « Paper slide » (the user's pick on the boards, 2026-10-05) | 19 |
| `section` | a section's name, UNDER its swoosh; the sweep | « Big paper page turn » | 22 |
| `name` | a section's second line | « Paper quick slice » | 23 |
| `mark` | the marker draws: a strike, an underline, a circle, an arrow (not a burst) | « Writing scribble on paper », cut to the stroke | 23 |
| `pop` | a sticker slapped on, a number's tile, THE word in colour landing | Motionix premium pops 1-4 in turn | 20 |
| `shutter` | a polaroid landing | Motionix smooth camera shutter | 20 |
| `swish` | a polaroid flicked away; the opening frame settling (24) | Motionix smooth / high fast whooshes in turn | 23 |
| `swoosh` | a section's name swinging in; the sweep | Motionix cinematic fast whoosh | 19 |
| `bed` | the music, under the whole short (its momentary MEDIAN, not a peak) | Hip Hop 02 (the shelf) | 15 |
| `thump` | a beat a plan asks for | Motionix thump click | 22 |
| `rise` | climbing into a change of scene, its crest on the cut | Motionix smooth riser | 20 |
| `money` | money said or won (optional) | Motionix cinematic money 2 | 21 |
| `click` · `whoosh` · `glitch` · `flash` · `riser` · `type` | the house pack of style 01 and the pencil, for a plan that asks | as style 01 | 25.3 · 18.6 · 21.9 · 18.5 · 19.9 · 25 |

The pack's figures are the house levels (the same take cut in style 01, measured this way). The
paper is the signature of the style, heard clearly; 19 was kept as heard (« bien comme ça »).
Nothing on the jump cuts (the camera's punch is silent), nothing per caption word, nothing on a
paper folding away, no sound on the breath. A role repeated within 80 ms is one sound (`edl.mjs`).

### The user's decisions (validated 2026-10-05: do not revisit)

**The techniques referential**: a technique added, validated or refused (a scene, a transition, a block, a sound, a rule) goes into this skill's `techniques.json` in the same change: its status, its date, Ihsane's reason, where it lives in the code and its doc. Never use a technique marked refused there.

Six reviews settled the look; each line is the user's word and holds on every short:

- **The paper is the reference's own**: its small ruled scraps, flat and white. Never torn pieces,
  fibre, crease or tape (« je préférerais les petits papiers de mon exemple de référence en
  eux-mêmes »), never a gradient (« j'aime pas le dégradé sur le papier »), never the newsprint
  (« c'est pas le bon papier, je l'aime pas du tout, fais attention à ne pas mettre ça »). It
  unfolds as it lands (board B of v2) and « Paper slide » is its sound, 19 LU under the voice.
- **The paper is punctuation**: the titles (the hook's paper line, sections, each numbered item, the
  ask) and two or three very important phrases, never every keyword (« les sous-titres sont déjà en
  bas, donc on ne met pas l'effet papier à chaque mot »).
- **Two faces over the picture**: white Archivo, THE important word in Fraunces in colour (« une
  combinaison de deux polices, un mot important en couleur, une très belle police »), yellow by
  default (coral and orange vanished in the speaker's hair and face).
- **A marker hand on the paper**: Gochi Hand, the user's pick on a board of eight (« prends la police
  gochi hand »), letter-spaced so its « rn » never reads « m ».
- **After Effects polish**: a shadow behind every text and element (« aucune ombre derrière, niveau
  contraste, ça ne passe pas »), entrances that travel and land, exits, motion blur, the camera
  punching on the cuts (« j'aime beaucoup la motion, les animations »); die-cut stickers with white
  outlines (« j'aime bien les petits stickers avec les contours blancs »).
- **The GIFs**: real reaction GIFs (« go, avec des vrais GIF »), never placed at random (« placés de
  manière beaucoup trop aléatoire, ils n'ont pas une belle animation d'entrée »): one place, one size,
  one entrance; big, in the middle of the screen (« un peu trop petits… plus gros, un peu plus bas
  dans l'écran, pour qu'on les voie bien »).
- **The sound**: music under every short (« ça mériterait de mettre une musique de fond »), Hip Hop 02
  by default (the user's pick on the music board, then the style's default); the paper heard on each
  paper; the Motionix pack for the light sounds (« des petits sons très légers »).

The whole story, version by version, with what each one taught: [`example/README.md`](scripts/example/README.md)
§ The reviews.

### Options, run from the GTM by Pipecorn page

As the engine says (`GTM_OS_FROM_UI=1`): never a reel; each option its own short file in
`variants/` with `variants/variants.json`, cut with `$E/build.sh --slice A B` around the moment
that changes (a meme against another, a picture against a GIF, music against none).

## Non-negotiables

**The feed's safe zones** (`plugins/video/references/safe-zones.md`, 2026-10-05). Captions, polaroids, stickers, titles and labels stay inside x 0.095–0.905, y 0.128–0.774. Never in the bottom band (y ≥ 0.79) or under the buttons (x ≥ 0.84 from y 0.425). `captions()`, `card()`, `sticker()` and `title()` keep them there (the polaroid is narrowed and centred on x 0.4675). Check a frame with `$E/safezones.mjs --overlay`.

**Reproduce the validated look.** The figures, sizes, places, faces, paper, motion, sounds and levels
of § The scrapbook language, on every take. A variation only when the user asks for it: for one run,
their instructions with the command; for good, their own copy of the skill (AGENTS.md § Your own
skills), never an edit of this one.

**Every pause goes, every join stays a jump cut.** Measured, never by ear; never a word clipped.
No flash, no whoosh over a join; the camera's alternation is the only thing on it.

**The speaker's words on screen the whole short**, verbatim, low, three at a time (they step aside
only for a header, the hook's title or a phrase on paper that says them). A name keeps its spelling.

**One move at a time.** Two figures never share a zone at once, the one leaving is gone before the
next lands, the depth order stays (polaroids and paper under the captions, the marker on its paper).

**Real material for real things.** A product, a repo, a price, a logo on screen is the real one
(the user's capture, or a public page captured); a generated picture is only an illustration or a
reaction, never a product screen, a logo, a person or a number. Every number on screen is said.

**A meme belongs to whoever made it.** GIFs from GIPHY carry their credit in
`assets/media/credits.json` (say « GIFs via GIPHY » in the post); a paid ad never ships a meme.

**The sound is the music, the paper and the packs**, one role each, at their levels, measured
(`measure.mjs`); the bed 15 LU under the voice unless the user asks for none.

**Loudness to standard**: −14 LUFS, true peak −1.0 dBTP, two-pass loudnorm. Never a bare
`volume=+NdB`. **Never rip audio**: the paper is Mixkit's recordings under their licence, the packs
the shelf's; a demo's own sound comes with a file the user supplied.

**Never regrade the footage.** The colour is the speaker's.

**Say what the edit cost**: the seconds of pauses removed and the number of jump cuts, a word
whisper and the envelope disagree on, the pictures generated (and what they cost), the GIFs and
their credit, a screen that could not be shown for lack of the real one, what the limiter did.

## Iteration cost

| Change | Command | Time |
|---|---|---|
| A figure, a time, a placement | edit plan.mjs, `preview.mjs t …` | ~1 s a frame |
| One moment in motion, frame by frame | `build.sh --slice a b`, then ffmpeg `select` + `tile` | ~15 s |
| A sound's level or file | project.json `cueGains` / `sounds`, `build.sh --audio-only`, `measure.mjs` | ~10 s + ~15 s |
| The music (track, start, level, drop) | `music.mjs <track> --start --under --drop`, `build.sh --audio-only` | ~10 s + ~25 s |
| A music board (the same excerpt with each track) | `music-board.mjs --to 12 <track>@<start> …` | ~30 s a track |
| The hand on the paper | project.json `paperFont` (hands.mjs), `fonts.mjs`, `build.sh` | ~1 min |
| The pauses (keep, a manual cut) | `tighten.py`, `face.mjs`, then a build | ~30 s + the build |
| A picture | `picture.mjs` / `gif.mjs get` / `media.mjs` | 5-20 s |
| Everything, final (once per version: after a change, only the segments of the picture that changed are composited again) | `build.sh` then `verify.mjs` | ~1 min for 47 s at 720p |
