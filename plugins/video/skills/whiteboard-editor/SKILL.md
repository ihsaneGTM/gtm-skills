---
name: whiteboard-editor
description: "Whiteboard, the first style of the Short video editor (/video-whiteboard-editor): one raw vertical take of you talking to the camera in, one finished short out, edited in exactly the look of Long video to shorts: your face from the first frame, a visual hook (the problem as a title, a few pictures of the subject), your words in Dynamic text, the pictures sliding out from behind you (or pinned over the frame, or as cutaways), white pages that draw the idea as a moving schema, one music 19 LU under the voice, -14 LUFS, the feed's safe zones, checked. The take keeps its own order (its retakes and dead air cut); no long-video analysis, no end card unless you ask. Heard on your Mac (Whisper), no key needed. Trigger on: whiteboard, whiteboard style, edit this short like my long-video shorts, the shorts' look on one take, white pages, monte cette vidéo en Whiteboard, le style des shorts sur ma prise."
user-invokable: true
---

# Whiteboard: one take, in the look of Long video to shorts

One raw vertical take in (9:16, you talking to the camera), one finished short out (1080 × 1920, 30 fps). The look is
**exactly** the one of `/video-long-to-shorts` (Ihsane, 2026-10-15: « le style qu'on a sur Long video to shorts doit être
également un style de montage qu'on peut retrouver dans le Short video editor… le style principal, vu que c'est mon
préféré avec Dynamic text »). What Long video to shorts adds on top (the whole long video heard and read, its moments
found and put in a new order, three lengths a subject, a cloned line where the take has none, the end card to the long
video) is not this style: here the take is the short, in its own order.

**One place for the look.** This skill has no figure, no template and no engine of its own: it runs the shorts' code
(`plugins/video/skills/shorts/`), so a change of the look there changes both styles the same day.
- the look and its decisions: `plugins/video/skills/shorts/references/look.md` (read **Decisions** first, do not reopen them)
- the white pages: `plugins/video/skills/shorts/references/motion-pages.md` (the bar, the chosen pages, how)
- the techniques (never one marked refused): `plugins/video/skills/shorts/techniques.json`, this skill's own
  `techniques.json` (what only a single take needs), the shared `plugins/video/techniques.json`
- the scripts: `$S` = `plugins/video/skills/shorts/scripts` (new, listen, cut, motionpage, dt/doc), `$E` =
  `plugins/video/skills/short-editor/scripts` (the vertical engine: matte, preview, build, verify), `$B` =
  `plugins/video/skills/scrapbook-editor/scripts` (face, music, media frames, measure), `$V` =
  `plugins/video/skills/voiceover-video/scripts` (hear, media: stock and GIFs). Shorthands for this page: **type the full
  path**, one command per Bash call.

The name « Whiteboard » is said in one place for the app: `catalog.json` › this skill › `style.name` (and its `title`).

> **I cannot watch the video or listen to it.** Every claim comes from a still I look at (`preview.mjs --sheet`), a
> check (`verify.mjs`, `measure.mjs`), or what `hear.mjs` hears on the delivered file. Never skip them.

## Prerequisites

`ffmpeg`, `ffprobe`, Node 22+, `swiftc` (Apple Vision: the face, the matte), Python 3 — Prepare your Mac (/setup).
The take is heard **on this Mac** (Whisper large-v3 on its GPU, installed once by the engine's `bootstrap.mjs`): free, no
key, nothing sent; a take dropped in the app was heard as it arrived (`.prep/`), and `listen.mjs` takes those words.
Optional keys (never printed): **ElevenLabs** only for the bonus « Your voice made better » (or a voice line the user asks
for, with their clone); **GEMINI** for the hook's mood stickers (Nano Banana 2, ~$0.07 each); **GIPHY** and **PEXELS** for
searching GIFs and stock shots (Mixkit's free clips need no key). Once per Mac: `node plugins/video/motion/bootstrap.mjs`.

## What the short is (the rules that do not move)

1. **Your face from frame 0**, never an intro screen; the first ~3 s carry the **visual hook**: the problem in a few words
   above the head (`hookTitle`, the glitch on its yellow word) and four to six pictures of the subject out from behind the
   head (`moodOpen`: the real icons of the tools named, or stickers made with `plugins/video/motion/sticker.mjs`); the
   words begin after it.
2. **The take in its own order.** The user's real words, as said: the retakes left out (the last good one kept), the
   fillers and dead air cut (a pause over 0.30 s), never reordered, never rewritten. No voice line unless the user asks
   for one in their notes **and** has an ElevenLabs key and a clone (then `$S/cut.mjs` says it; never a fact, a number or
   a name they did not say; always under a cutaway).
3. **The words on screen all along**, verbatim, in Dynamic text (`dtHeadlines`): above the head when the take leaves the
   room (`project.json › headroom` ≥ 0.20: the template decides), below it in front otherwise; never one or two words
   alone; the payoff in yellow, one Sacramento accent.
4. **The pictures** (something new every 3 to 6 s besides the words, true only): **Behind you** by default (the screens
   and prints slide out from behind your head and shoulders: the matte); the user's notes may ask **Prints** (pinned over
   the top of the frame) or **Cutaways** (stock shots over the whole frame): `project.json › shortsStyle` (styles.json).
5. **The white pages, the style's name**: the idea set down as a moving schema over the whole frame, a **motion page** at
   After Effects level (`references/motion-pages.md` of the shorts: the bar, the references, never the refused simple
   pages): **one** in a short under ~45 s, **two or three** in a 1 min+ one; a different concept each time; labels only,
   never the sentence written out.
6. **The sound**: one music under the whole short, **19 LU under the voice** (the brief's track; `music.mjs … --under 19`),
   the figures' own sounds from the packs (never synthesised), nothing per word; -14 LUFS, true peak ≤ -1 dBTP.
7. **The feed's safe zones** (`plugins/video/references/safe-zones.md`): every figure clamps itself; check the sheet.
8. **An end card only when asked** (« end on a card to my long video »): it needs the long video's thumbnail and length
   (`$S/motionpage.mjs <project> --page cta …`, then `$S/endcard.mjs`, as the shorts' SKILL.md § 6 says); the channel is
   Your brand's, never another brand's name.
9. **Nothing published; never delete the user's files.** Free commercial licences for stock (Mixkit Free, Pexels);
   GIFs organic use only, said at the delivery; credits in the project's README (`$V/media.mjs <project> credits`).

## The run, in order (all paths from the root of the GTM by Pipecorn folder)

From the app, the first message is the brief (style, music, pace, bonuses, notes): it answers every question; decide by
these rules and never ask (nobody answers live). `<project>` is `workspace/projects/<slug>`.

### 1. The project (`setup`)
```bash
plugins/video/skills/whiteboard-editor/scripts/init.sh workspace/projects/<slug> <the take> workspace/videos/<slug>.mp4
```
It writes `run.json` (one take, its file, `out`), `README.md` and the folders the pictures need. **Your voice made better**
(a bonus, the brief says Yes or No): before anything hears the take, `node plugins/video/motion/voice.mjs clean <the take>`,
then `run.json › video` is the `-voice` file it writes (here, not project.json: the cut reads run.json).

### 2. The take, heard (`listen`)
```bash
node plugins/video/skills/shorts/scripts/listen.mjs workspace/projects/<slug> --lang <en|fr|…>
```
Always `--lang` (the language of the voice: `.prep/take.md` says what the app heard). It prints every sentence numbered
with its marks (`~` a filler or a restart): `take/moments.md`.

### 3. The take in its order (`rush`): `shorts.json`
Read `take/moments.md` whole. One short: every sentence in order, the restarts dropped (when a sentence is said twice,
keep the last good one), a sentence cut in two keeps whole words (`"words": [a, b]`):
```json
{ "shorts": [ { "slug": "", "title": "What it is about, in a few words",
    "blocks": [ { "take": "#0-#12" } ], "drop": [3, 7], "why": "#3 and #7 were restarts of #4 and #8" } ] }
```
Say in one line what was dropped and why.

### 4. The cut (`tighten`)
```bash
node plugins/video/skills/shorts/scripts/cut.mjs workspace/projects/<slug> --one --speed <the brief's pace: 1, 1.1 or 1.2>
```
The take graded once (the long videos' grade), its pieces joined at whole frames, ~0.18 s of air at each cut, at the
pace; the project becomes the edit of the vertical engine (`source/take-cut.mov`, `words.json` on the short's clock,
`shots.json`, `blocks.json`, `project.json` with `headroom` and the camera's anchor on the eyes, `plan.mjs` scaffolded).

### 5. The edit (`pictures`, `write`, `matte`, `look`), from inside `workspace/projects/<slug>/`
```bash
node <root>/plugins/video/skills/scrapbook-editor/scripts/face.mjs
node <root>/plugins/video/skills/scrapbook-editor/scripts/music.mjs <root>/plugins/video/assets/music/<the brief's track> --under 19
node <root>/plugins/video/skills/short-editor/scripts/matte.mjs
```
(`--start` on the track's swell when it has one; no music when the brief says none.) **The pictures**, planned first (one
line each: the words, the picture, its source), then fetched:
```bash
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> stock search "<what it shows>"
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> stock get <page> --name <name> --from 1 --to 5
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> gif get <id | giphy link> --name <name>
```
Look at each sheet. Then, from the project, their frames: `node …/scrapbook-editor/scripts/media.mjs assets/clips/<name>.mp4
--name <name> --width 0.84 --fps 30` (a GIF: `assets/gifs/<name>.mp4 --width 0.62 --fps 15`). The mood pictures:
`assets/mood/*.png` (a tool's real icon from `plugins/video/assets/logos/`, cut out with `sticker.mjs from`, or a sticker
made with `sticker.mjs make` then `pick`).

**The white page(s)**: `node plugins/video/skills/shorts/scripts/motionpage.mjs workspace/projects/<slug> --page <name>
--from <s> --to <s> --seed <n>`, write `motion/<name>/<v>.html` (the shorts' `motion-kit/kit.js` says the contract; the
references in `shorts/references/pages/motion/`), look with `--variant <v> --sheet`, render with `--variant <v>`.

**`plan.mjs`** (scaffolded; the reference: `plugins/video/skills/shorts/references/example-plan.mjs`): the hook
(`hookTitle`, `moodOpen`), the pictures on their words with `shot()` and `gif()`, the white page(s) with `whitePage` +
`docLayer`, the camera (`openingSteps`: the de-zoom, the jump cuts, a punch on a payoff word), the riser on the payoff,
then the words (`dtHeadlines` with `HOT` and one `SCRIPT` word; `skip` the hook's span; `paper` the pages' spans). Then:
```bash
node <root>/plugins/video/skills/short-editor/scripts/preview.mjs 1.5 4 8 12 16 20 --out preview/ --width 540 --sheet
```
**Look at the sheet**: two figures in one zone, a word alone, a line under the feed's buttons, a picture with a mark. Fix,
look again.

### 6. Render and check (`render`, `verify`), from the project
```bash
<root>/plugins/video/skills/short-editor/scripts/build.sh
node <root>/plugins/video/skills/short-editor/scripts/verify.mjs
node <root>/plugins/video/skills/scrapbook-editor/scripts/measure.mjs
node <root>/plugins/video/skills/voiceover-video/scripts/hear.mjs <root>/workspace/videos/<slug>.mp4 --lang <lang>
```
`verify.mjs` non-zero = do not ship; a sound off its aim is a `cueGains` line and `build.sh --audio-only`; every word
whole at the joins (what `hear.mjs` heard). The file: `workspace/videos/<slug>.mp4`.

### 7. Deliver
In the user's language, a few lines: the file, its length, what was dropped, the pictures and their licences (GIFs organic
only), the white page(s) and what they draw, the numbers of the checks, what the edit cost (keys used). `node
plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> credits` writes the README's credits.
Nothing is published. Then « Your turn »: `/video-publish` plans it in the week.

## When the user asks for a change
- **One picture, one word, a page**: `plan.mjs` (or the page's html, then its render), `build.sh` again (only the changed
  segments are drawn).
- **Another cut** (a sentence back, another dropped): `shorts.json`, then `cut.mjs --one` again, `face.mjs`, `music.mjs`,
  `matte.mjs`, the build.
- **The look itself, for every take** (their colours, their habits): their own version of this style (Customize, or Make
  this style yours in the editor: AGENTS.md § Your own skills), never `plugins/` for one user.
- **The techniques referential**: a technique added, validated or refused goes into the techniques.json of the skill that
  owns it in the same change: the look's into the shorts' `techniques.json`, what only a single take needs into this one's.

## Traps already met
- **The shorts' traps hold here** (their SKILL.md › Traps already met): a word alone on a screen, white captions on a white
  T-shirt, Mixkit « Restricted », a quiet take's room noise lifted by the master.
- **A tight vertical take** (the head near the top) has no room above the head: the words go below it, in front; do not
  force them to the top (a third line sank behind the head on the long video's shorts).
- **The cut never writes over the user's file**: `source/take-cut.mov` beside it.
