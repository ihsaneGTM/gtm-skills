---
name: shorts
description: "Long video to shorts (/video-long-to-shorts, formerly /video-shorts): your long video, filmed talking to the camera (often derushed already, horizontal or vertical; the same file the YouTube video editor edits, at the same time if you like), in; several vertical shorts out. Its key moments found and REORGANISED (the strongest line moved first as the hook, the rest in the order that makes a short), each subject in about 30 s, 1 min and 1 min 30, the retakes and dead air cut, your real voice wherever you said it, and where a short needs a line you never said (a hook, a bridge), your cloned voice says it, in your words, if you add an ElevenLabs key (the take itself is heard on your Mac, no key). Your face from the first frame, the words in Dynamic text (the short editor's vertical language), the long video's pictures with its effects, white pages that draw the idea, three ways: Behind you (default), Prints, Cutaways; an end card to the long video on YouTube, with your brand's channel, if you want one; one music; -14 LUFS; checked. Trigger on: long video to shorts, make shorts from my video, cut my long video into shorts, clips from my YouTube video, find the best moments, repurpose my video, fais des shorts de ma vidéo, découpe ma vidéo longue en shorts, les meilleurs moments, des reels à partir de ma vidéo YouTube."
user-invokable: true
---

# Long video to shorts

One long video in, several vertical shorts out (1080 × 1920, 30 fps). The same input as `/video-youtube-editor` (a facecam
take, often after `/video-derush`), so both can run at once on the same file: the long video and its shorts, one series.
Its look is the long video's (« Document », `plugins/video/skills/voiceover-video/references/look.md`) folded into the
feed: [`references/look.md`](references/look.md) says how, figure by figure. Built on 2026-10-14 on Ihsane's take
« Trouvez plus de leads qualifiés » (`workspace/projects/shorts-leads`: one short in the three styles, for review).

> **I cannot watch the video or listen to it.** Every claim comes from a still I look at (`preview.mjs --sheet`), a
> check (`verify.mjs`, `measure.mjs`), or what `hear.mjs` hears on the delivered file. Never skip them.

All paths are relative to the root of the GTM by Pipecorn folder. `$S` means `plugins/video/skills/shorts/scripts`,
`$E` `plugins/video/skills/short-editor/scripts` (the vertical engine), `$B` `plugins/video/skills/scrapbook-editor/scripts`
(the scrapbook's figures), `$V` `plugins/video/skills/voiceover-video/scripts` (the YouTube editor's tools; its `grade.mjs` is the colour grade's engine, copied there). They are
shorthands for this page: **type the full path**, one command per Bash call, from the folder's root (a short's own
commands run from inside `workspace/projects/<slug>/shorts/<n>/`: the engine reads its `project.json` there).

## Prerequisites

`ffmpeg`, `ffprobe`, Node 22+, `swiftc` (Apple Vision: the face, the matte) — Prepare your Mac (/setup).
Python 3: the take is heard **on this Mac** (Whisper large-v3 on its GPU, `$V/hear.mjs`, installed once by the short
editor's `bootstrap.mjs`): free, no key, nothing sent. **ElevenLabs** (`ELEVENLABS_API_KEY`) is **optional**, only for the
voice lines (the user's clone: `workspace/motion/profile.json › voiceClone`, made once by `$V/clone.mjs`), or for Scribe
when the user asks for it (`listen.mjs --asr scribe`). **Without a key or without a clone, no voice line**: every short is
built from the take's real lines only (its hook is a line the user said), and the report says so; `cut.mjs` refuses a
`vo` block then. **GIPHY** and
**PEXELS** keys are optional (a giphy.com or pexels.com link works without). Never print a key.

## What a short is (the rules that do not move)

0. **Three lengths of each subject** (Ihsane, 2026-10-14): ~30 s, ~1 min and ~1 min 30 (shorts.json `"length"`, one
   entry each, the same hook), the longer ones explaining further with more of the take; fewer when the take does not
   hold them. The first ~3 s carry the **visual hook** (`hookTitle` above the head, `hookPanel` on the chest: the
   problem in words, read first when someone scrolls; Ihsane picked the title, 2026-10-14) with the **mood**: four to six
   pictures of the subject (objects made as stickers with Nano Banana 2, `motion/sticker.mjs`, about $0.07 each; the
   real icons of the tools it names) out from behind the head (`moodOpen`), and the words begin after it.
1. **One idea, standing alone.** A viewer who never saw the long video understands it. It opens on its
   **hook** (the strongest line: a turn, a strong claim, a number, a question; moved from anywhere in the take), then
   what proves it, then a payoff (a number, a rule, a punchline); no « as I said », no reference to the long video.
2. **Reorganised, never rewritten**: the user's real words, in the order that makes the short; a sentence cut in two
   keeps whole words (`"words": [a, b]`). Retakes left out (the last good one kept), fillers and dead air cut (a pause
   over 0.30 s, ~0.18 s of air kept at each cut), at the take's speed (`profile.json › voiceover.introSpeed`, ×1.1).
3. **A voice line only where the take has none, and only with an ElevenLabs key and the user's clone** (a hook that is
   not in the take, a bridge between two moments; without them, none: pick a hook and bridges the user said), in the
   user's words (simple spoken English, `plugins/video/references/how-you-talk.md`), short (≤ 15 words), said by their
   clone; **never a fact, a number, a name or a result they did not say.** The picture under it is the desk (the paper),
   always covered by a figure. One or two lines a short at most.
4. **The look** (`references/look.md`, read its Decisions first): your face from frame 0 (never an intro screen), the
   words in Dynamic text, the long video's pictures with their effects; a voice line always under a cutaway.
5. **The words on screen all along** (the feed plays muted), verbatim (`dtHeadlines`); the style places the pictures:
   Prints, Behind you (needs the matte), Cutaways (styles.json).
6. **Something new every 3 to 6 s** besides the words: a picture on its words (a stock shot, a GIF, a logo, a number,
   a page). True only: a number on screen is one the voice says. In a long version (1 min+), **2 or 3 white pages**: an
   idea set down as an animated schema, a **motion page** at After Effects level over the whole frame, varied from one
   short to the next, written from the references and, when subagents exist, by designer agents in parallel:
   [`references/motion-pages.md`](references/motion-pages.md) (the bar Ihsane set, the chosen pages, how). Never the old
   simple pages (cards in a grid, balls in a funnel, a schema cropped in a column: refused, round 9).
   **Option, the end card to the long video** (references/look.md, rounds 11–12): not every short has one, but a short
   cut from a long video usually should send to it. **Offer it** at the start of every run (AskUserQuestion, with the
   other choices): « End each short on a card to the long video on YouTube? » If yes, ask for the long video's
   thumbnail (a file) and its length. **The channel is Your brand's** name and logo (`workspace/brand/brand.json`, set
   once in the app, Settings › Your brand; `new.mjs` copies it into the run's `brand/theme.json`); when Your brand has
   no name, ask for the channel's name and logo in the same question, and pass them (`--channel "<name>" --channel-logo
   <file>`); without a name the card has no channel row. Never another brand's name. The card: the screen turns off, the
   phone falls onto the paper desk and wakes on the thumbnail in a YouTube player with the channel row under it, a tilted
   YouTube logo, « Watch the entire video », a cursor clicking play (`references/pages/motion/cta-b.html`, Ihsane's
   choice; a and c kept as other ways). Per short: `motionpage.mjs <short> --page cta --from <end> --to <end+4.2>
   [--channel … --channel-logo …]` (it writes `channel.js` and `img/channel.png` from Your brand), img/last.png (the
   short's last frame) and its untagged copy img/last-plain.png, img/thumb.jpg, the card's html + cta-lib.js copied,
   `--variant cta-b`, then `node scripts/endcard.mjs <short> --variant cta-b` →
   `<the short>-cta-b.mp4` (the music powers down with the screen).
7. **The feed's safe zones** (`plugins/video/references/safe-zones.md`): every figure clamps itself; check the sheet.
8. **The sound**: one music under the whole short, 19 LU under the voice (Ihsane, 2026-10-14: 15 was too loud;
   `music.mjs … --under 19`) (the long video's track by default:
   `profile.json › voiceover.music`, « Gimme That Groove » from 1.95 s), the figures' own sounds from the packs, nothing
   per word; -14 LUFS, true peak ≤ -1 dBTP (the engine's master).
9. **Nothing published; never delete the user's files.** Free commercial licences for stock (Pexels, Mixkit Free —
   never Mixkit Restricted, `$V/media.mjs` refuses it); GIFs organic use only, said at the delivery.

## The run, in order

### 0. The run's folder
First, once per Mac (the fonts, the Mac's own tools built from their Swift source, a Chrome): `node plugins/video/motion/bootstrap.mjs`.
From the app, `workspace/projects/<slug>/run.json` is there. Otherwise:
```bash
node plugins/video/skills/shorts/scripts/new.mjs workspace/projects/<slug> --video <the long take> [--count 3] [--style behind|prints|cuts] [--language en]
```
The style is asked once with the count and the end card (AskUserQuestion), unless given: **Behind you** by default
(styles.json; Ihsane's pick, references/look.md round 3). From the app, decide
by `run.json` and never ask (nobody answers live).

### 1. The take, heard (`take`)
**Your voice made better: a bonus, asked with the count and the end card, never on by default**
(`plugins/video/references/voice-clean.md`): ElevenLabs' voice isolator takes the room's echo and the noise out of
the long take. On a yes, before `listen.mjs`: `node plugins/video/motion/voice.mjs clean <the long take>`, then
run.json › `video` is `<…>-voice.<ext>`; when the YouTube editor runs on the same take, use its `-voice` file (one
pass, paid once). From the app, decide by `run.json`. Without the ElevenLabs connector, one line and go on.
```bash
node plugins/video/skills/shorts/scripts/listen.mjs workspace/projects/<slug> --lang en
```
Always `--lang`. It reuses the transcript of any run that heard the same file (the YouTube editor's, started at the
same time: ~2 s instead of ~70 s of Whisper for a 7.6-min take; an older run's Scribe transcript too), every word's
onset and end measured on the voice (`take/words.json`), then prints every sentence numbered with its marks (`?` question, `#`
number, `!` strong claim, `«` story, `>` turn, `~` filler or restart): `take/moments.md`.

### 2. The moments (`moments`): the judgment step
`node plugins/video/motion/progress.mjs workspace/projects/<slug> moments running "Finding the moments"`.
Read `take/moments.md` whole. Pick `count` shorts (fewer when the take does not hold them: say so): for each, its hook
(rule 1), the blocks that prove it, its payoff; the retakes to drop. Write `workspace/projects/<slug>/shorts.json`:
```json
{ "shorts": [ { "slug": "not-the-message", "title": "It's not your message, it's your list", "style": "behind",
    "why": "the take's strongest turn (#27), then the three things, closed on the 95 % line",
    "blocks": [ { "vo": "Nobody replies to your cold messages? It's not the message." },
                { "take": "#24", "words": [13, 19] }, { "take": "#24", "words": [30, 35] },
                { "take": "#25-#26" }, { "take": "#27" }, { "take": "#9-#10" } ],
    "drop": [] } ] }
```
`"#n"`, `"#a-#b"` (sentences), `"12.4-19.8"` (seconds of the take); `"words": [a, b]` keeps those words of the block
(0-based); a `vo` block is a voice line (rule 3). Show the list in plain words (one line a short: its hook, its length,
why) before cutting; from the app, decide and say it. `… moments done "<n> shorts"`.

### 3. The cut (`cut`)
```bash
node plugins/video/skills/shorts/scripts/cut.mjs workspace/projects/<slug> [--short <n>]
```
The take graded once (the long video's grade: `$V/grade.mjs` on 12 s, `take/grade.cube`), each short's pieces cut from
it, reframed to 9:16 on the face, ×1.25 wider than 9:16 with the wall prolonged above the head (`--zoom`; Apple Vision; a vertical take is kept whole; the Desk style crops a print around the
face instead), at the take's speed, the voice lines said once for the whole run (`vo/`, cached by their text) and laid
at the take's loudness. Each short becomes an edit of the vertical engine in `shorts/<n>/` (`init.sh`): `source/take.mov`,
`words.json` (the short's own clock), `shots.json` (the jump cuts), `blocks.json` (each stretch; `paper`: the voice lines),
the scrapbook's sounds calibrated, the long video's faces in `assets/fonts/`. Measured: a 35 s short in 40 to 65 s (the
first one also grades and says its voice line).

### 4. Each short's edit (`edit`), from inside `shorts/<n>/`
```bash
node plugins/video/skills/scrapbook-editor/scripts/face.mjs
node plugins/video/skills/scrapbook-editor/scripts/music.mjs plugins/video/assets/music/mixkit-gimme-that-groove-872.mp3 --start 1.95 --under 15
```
(both by full path from the short's folder). `matte.mjs` (`$E`) for the « Behind you » style (the pictures behind the head) or
words placed above the head; a landscape take reframed has its head at the top of the frame, and the words go below
it, in front (Dynamic text's tight-shot rule).

**The pictures**, planned first (one line each: the words, the picture, its source), then fetched on the RUN:
```bash
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> stock search "<what it shows>"
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> stock get <page> --name <name> --from 1 --to 5
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> gif search "<the meme's name>"
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> gif get <id> --name <name> --caption "…"
```
Look at each sheet. A clip already fetched for the user's long video (`workspace/projects/*/assets/clips/` with its
`.source.json`) is reused: copy both. Then, from the short's folder, its frames (`$B/media.mjs`):
`node …/scrapbook-editor/scripts/media.mjs ../../assets/clips/<name>.mp4 --name <name> --width 0.84 --fps 30`
(a GIF: `../../assets/gifs/<name>.mp4 --width 0.62 --fps 15`; a mark in a corner: `--crop W:H:X:Y`).

**`plan.mjs`** (scaffolded; the reference: `references/example-plan.mjs`, round 2's review short, one plan for the
three styles): the pictures on their words with `shot()` and `gif()` (the style places them; `find("word", n, after)`),
a `cutaway` under every voice line, the camera (`openingSteps`: the de-zoom, the jump cuts, the punches), the riser on
the payoff, then the words: `dtHeadlines()` does the phrases by itself (give it `HOT`, the payoff words in yellow, and
`SCRIPT`, one Sacramento accent word). Then:
```bash
node plugins/video/skills/short-editor/scripts/preview.mjs 1.5 4 9 14 19 24 29 33 --out preview/ --width 540 --sheet
```
**Look at the sheet**: two figures in one zone, a word alone on its screen, a line under the feed's buttons, a
picture with a mark. Fix, look again. `… edit done`.

### 5. Render and check (`render`, `checks`), from the short's folder
```bash
plugins/video/skills/short-editor/scripts/build.sh
node plugins/video/skills/short-editor/scripts/verify.mjs
node plugins/video/skills/scrapbook-editor/scripts/measure.mjs
```
(full paths). 100 to 140 s for a 33 s short (the screen effect is drawn on every frame; a change redraws only its segments); `verify.mjs` non-zero = do not ship; a sound off its aim is a `cueGains` line and
`build.sh --audio-only`. Then hear the delivered file once (`node plugins/video/skills/voiceover-video/scripts/hear.mjs
<the short's file> --lang en`): every word whole at the joins. The file: `workspace/videos/<slug>-<n>-<short-slug>.mp4`.

### 6. Deliver
```bash
node plugins/video/skills/shorts/scripts/deliver.mjs workspace/projects/<slug>
```
It links each finished short of the run into its `exports/` (a hard link: no second copy on the disk), so the app's
page of the run plays them, and marks the checks done. In the user's language, a few lines per short: its hook and why, its length, the voice lines said by the clone (word
for word), what was dropped, the pictures and their licences (GIFs organic only), the numbers of the checks. Write
`publication.md` in the run: per short, a caption for each feed (simple spoken English) and its title. Nothing is
published. Then « Your turn »: `/video-publish` plans them in the week.

## When the user asks for a change
- **The look is shared**: the Short video editor's Whiteboard style (`/video-whiteboard-editor`, its first style since
  2026-10-15) runs this skill's code on one raw take (`new.mjs --one`, `cut.mjs --one`, the same `dt.mjs`, `doc.mjs`,
  `motionpage.mjs` and `templates/plan.mjs`). A change of the look here changes both; keep the `--one` paths working.
- **The techniques referential**: a technique added, validated or refused (a scene, a transition, a block, a sound, a rule) goes into this skill's `techniques.json` in the same change: its status, its date, Ihsane's reason, where it lives in the code and its doc. Never use a technique marked refused there.
- **One short**: its `plan.mjs` (a picture, a word on the marker), `build.sh` again (only the changed segments are
  drawn); a block of `shorts.json` (another moment, a line): `cut.mjs --short <n>`, then `face.mjs`, `music.mjs`, the build.
- **A voice line**: its text in `shorts.json` (a new take is said; the old one stays in `vo/`).
- **For every short** (their speed, their music, their style): `workspace/motion/profile.json`, or their own version of
  this skill (Customize: AGENTS.md § Your own skills); never `plugins/` for one user.

## Traps already met
- **Round 1 (an intro screen for the hook, a new type system) was refused**: references/look.md › Decisions.
- **The engine's `layout` key** is a script path: this skill's is `shortsLayout`.
- **A phrase cut at its 7th word left « things. » alone on a screen**, entering while the last one left: `headlines()`
  never leaves one or two words of a sentence alone, and a phrase leaves before the next one lands.
- **White captions on a white T-shirt** were unreadable: the caption line is the long video's white pill.
- **A figure's exit counted as « said »** left 0.5 s with no words: figures carry `said` (their held span), used by `skip`.
- **Mixkit « Restricted »** clips are refused: pick another, or reuse a Pexels clip of the long video.
- **A quiet take** (-36 LUFS) is lifted ~21 dB by the master: its room noise comes up in the pauses (`build.sh` says
  it); the long video's take has the same, say it once.
