---
name: voiceover-video
description: "YouTube video editor (/video-youtube-editor; this folder keeps its first name, voiceover-video): a complete edit of a horizontal YouTube video (16:9, often long), three ways, the same skill. FACECAM: the user filmed the whole video talking to the camera; their real voice runs all along, cut tight (retakes, fillers and dead air cut out), illustrated in motion design with their dressed face shots in between. AI VOICE: no filming; the whole video in motion design, said by their voice clone, an ElevenLabs voice or Ihsane's once shared, from a script, an idea or an article. HYBRID: they film only the intro (and a few cutbacks), their cloned voice says the rest. The style « Document » settled over twelve reviews on 2026-10-12/13 (real homepages at the full viewport and real logos, LinkedIn-style cards of fictional people, editorial lines with a yellow marker, numbers that count, charts one per metric under their app icon, the yellow V chapter pages, the method list), real stock shots in a frame on the paper and GIFs as pinned prints; face shots dressed (graded, at their speed, cut out, lockups behind the head, punches); junctions on the same frame, no dead air; ONE music; -14 LUFS; a 1080p draft and a 720p preview, the 4K only when the user asks. Trigger on: edit my YouTube video, YouTube video editor, horizontal video, long video, facecam, no facecam, AI voice video, I only filmed the intro, use my voice for the rest, cloned voice video, voiceover video, monte ma vidéo YouTube, vidéo horizontale, sans facecam, j'ai filmé que l'intro, fais la suite avec ma voix clonée."
user-invokable: true
---

# YouTube video editor: three versions

The user sees the three modes by these names (the app, the messages to them); the ids stay `facecam`, `ai`, `hybrid`:
**Facecam + Motion design** (`facecam`, their real voice, no AI voice), **Motion design + AI voice** (`ai`, nothing to
film), **Facecam + Motion design + AI voice** (`hybrid`, the intro and a few shots filmed, an AI voice says the rest).

A complete edit of a horizontal YouTube video, often long, to the level of the reference Ihsane called « quasiment
parfait » (2026-10-13, `workspace/videos/waterfall-complete-2d.mp4`, 3:45, made the hybrid way). **Three ways, the same
skill** (Ihsane, 2026-10-14); `run.json` › `mode` says which (the app's window asks it first, Claude Code asks once):

| `mode` | What the user gives | The video |
|---|---|---|
| **`facecam`** | the whole video, filmed talking to the camera | their REAL voice all along, cut tight; face shots (dressed like the intro) and motion parts in that same voice, alternating |
| **`ai`** | no filming: a script, an idea or an article | motion parts only, said by an AI voice (their clone, an ElevenLabs voice, or Ihsane's once shared) |
| **`hybrid`** | the intro filmed (and the lines to cut back to) | the dressed intro, then their cloned voice in motion parts, a dressed cutback at each change of part |

```
facecam  face (the intro) → part 1 (real voice) → face → part 2 (real voice) → … (the video may end on a face shot)
ai       part 1 (AI voice) → part 2 → … → end card                                (no junction: the parts follow)
hybrid   the intro (filmed) → part 1 (the clone) → cutback 1 (filmed) → part 2 (the clone) → … → end card
```
- **The face shots** (facecam's, the hybrid's intro and cutbacks) are **dressed**: graded, played at the user's speed,
  the user cut out on every frame, the landscape editor's lockups beside their head on their own words, the tools as app
  icons out from behind their shoulders, a window behind them, punches, the music from the first frame.
- **The motion parts**, one story per part: every sentence shows what it says, with real stock shots in a frame and GIFs
  as pinned prints. Facecam: the voice is the take's own (`facecam.mjs`: the retakes the user restarted, the fillers and
  the dead air cut out, the words moved, never transcribed again). AI and hybrid: a take of the voice the user picked
  (`clone.mjs`, `voice.mjs take`), their own words cleaned or the script written WITH them where they stop.

**Which steps each mode takes** (the run, in order, below):

| Step | facecam | ai | hybrid |
|---|---|---|---|
| 0 the folder (`new.mjs --mode …`) | ✓ | ✓ (no `--video`) | ✓ |
| 1 the take, heard (`take.mjs`) | ✓ | — | ✓ |
| 2 the cut | `facecam.mjs` (face shots + parts in the real voice) | — | `cut.mjs` |
| 3 the grade, 4 the clips' material | ✓ (every face shot) | — | ✓ |
| 5 the script | the take's words (Claude picks the retakes to drop) | ✓ (from the script, idea or article, with the user) | ✓ |
| 6 the voice | — (`prep.mjs` only) | ✓ | ✓ |
| 7–12 material, media, stories, render, assembly, checks | ✓ | ✓ (no `intro.mjs --render`) | ✓ |

**The format is settled.** Every rule comes from a precise review: [`references/look.md`](references/look.md) (the rules,
which block for which sentence, the clips, the sound, the material), [`references/decisions.md`](references/decisions.md)
(each review with its reason and Ihsane's words: read it whole before a first video), [`references/media.md`](references/media.md)
(stock shots and GIFs). The reference code: [`example-intro-story.js`](references/example-intro-story.js),
[`example-story-part1.js`](references/example-story-part1.js), [`example-cutback-story.js`](references/example-cutback-story.js),
[`example-story-part2.js`](references/example-story-part2.js). Do not reinvent it: apply it.

**Styles.** A style is a film template, its look and its examples (`styles.json`). One today: **« Document »**
(`template/document/`). A new style goes beside it, never changes it.

**The engine** is a film page drawn as a pure function of time (`engine.js` F.*, `fx.js`, `blocs.js` B.*, `framed.js`,
`theme.css`, [`references/engine.md`](references/engine.md)), copied into each video; Chrome draws it frame by frame. Per
video are written only the stories: `film/intro-story.js`, `film/cutback-<n>-story.js`, `film/story-<n>.js`, timed on
the WORDS (the clips' own, the clone's takes), from the template's skeletons (their helpers are the reference's).

> **I cannot watch the video or listen to it.** What shows when, whether two frames join, whether a word is said
> right: each one is a still I look at, a check `verify.mjs` makes, or a transcript (`hear.mjs` on this Mac, or Scribe for an
> AI voice's take). Never skip them.

All paths are relative to the root of the GTM by Pipecorn folder. `$V` means
`plugins/video/skills/voiceover-video/scripts`, `$M` means `plugins/video/motion`. They are shorthands for this page
only: **type the full path** (`node plugins/video/motion/bootstrap.mjs`, never `node $M/bootstrap.mjs`), one command per
Bash call, from the folder's root: no `cd`, no `&&`, no pipe, no `VAR=… node`. A session started from the app runs
nothing else (`node`, `ffmpeg`, `ffprobe`, simple file commands). A render runs in the foreground with the Bash tool's
timeout at `1800000` (30 minutes).

## Prerequisites (check first)

- `ffmpeg` and `ffprobe`, Node 22 or later, the Xcode command line tools (the Vision cut-out): Prepare your Mac (/setup).
- `node plugins/video/motion/bootstrap.mjs`: the fonts, a Chrome, the shelf's music and sounds. Idempotent: at the start.
  **Google Chrome** (`/Applications/Google Chrome.app`) draws the films when it is there (the same look at 1080p and 4K);
  it is required for the 4K (the headless shell stalls at ×2).
- **The take is heard on this Mac**: Whisper large-v3 on its GPU (`scripts/hear.mjs`, the short editors' engine; Python 3,
  installed once by `plugins/video/skills/short-editor/scripts/bootstrap.mjs`, which `take.mjs` runs when it is missing).
  Free, no key, nothing sent (Ihsane, 2026-10-15: « ElevenLabs devrait vraiment être que pour ceux qui veulent une voix
  off en IA »).
- **ElevenLabs** (`ELEVENLABS_API_KEY` in `.env.local`, Settings › Connectors): **only for an AI voice**, so required for
  `ai` and `hybrid` (the clone, the voice; instant cloning needs Starter or above; below Creator the voice is 128 kbps),
  never for `facecam`. With a key, Scribe hears the take instead only when the user asks (`take.mjs --asr scribe`, or
  `run.json › asr: "scribe"`). **Gemini** (`GEMINI_API_KEY` or
  `NANO_BANANA_API_KEY`): optional, the fictional people drawn in your brand's hand (about $0.07 each). **GIPHY** (`GIPHY_API_KEY`): optional, the
  GIF search (a giphy.com link works without). **Pexels** (`PEXELS_API_KEY`): optional, the Pexels search (a Pexels link
  works without; Mixkit's search needs no key). Never print a key, never write one anywhere but `.env.local`.

## Where things live

`workspace/projects/<slug>/` is the video (the app's Activity lists it). The finished files: `workspace/videos/<slug>.mp4`
(1080p draft), `<slug>-preview.mp4` (720p, to send in a chat), `<slug>-4k.mp4` (on request); `exports/` holds hard links.

| | |
|---|---|
| `run.json` | `video` (the take), `script`, `language`, `subject`, `style`, `notes`; `cut` (`cut.mjs`: the intro, its `speed`, the cutbacks); `assembly` (`assemble.mjs`) |
| `progress.json` | the steps the app draws: `node plugins/video/motion/progress.mjs <run> <step> running\|done\|failed "line"` (steps: take, intro, script, voice, material, media, story, render, assemble, checks) |
| `take/` | the take heard: `audio.mp3` (the clone's source too), `transcript.json` (who heard it, the words as heard), `scribe.json` (Scribe only), `words.json` (every word's onset and end measured on the voice), `sentences.json` |
| `real/` | `intro.mp4` (the cut), `intro-graded.mp4` + `.cube` (`scripts/grade.mjs`), `intro-speed.mp4`; `cutback-<n>.mp4`, `-graded.mp4` (the intro's LUT), `-speed.mp4` |
| `film/intro*`, `film/cutback-<n>*` | each clip's page, words, story (THE files to write), frames and masks (`film/media/<clip>/`, `<clip>-mask/`) |
| `vo/part-<n>/` | each motion part's voice: `vo.json` (the prefix + the text, `say`, `pauses`), `voix/prise.wav`, `words.json` |
| `film/part-<n>.html`, `words-<n>.js`, `story-<n>.js` | each motion part's page, timing (prep.mjs) and story (THE file to write) |
| `film/img/` | the junction frames, `people/`, `logos/` (+ `-icon` app icons), `pages/` (`<key>-vp.jpg`), `photos/`, the brand's logo |
| `assets/` | `raw/` (captures), `clips/` + `gifs/` (the media, each with its `.source.json`), `stock/` (search sheets) |
| `film/media/<name>/`, `film/media4k/<name>/` | the media's frames (media.mjs) |
| `build/` | `intro.mp4`, `cutback-<n>.mp4`, `part-<n>.mp4` + their `.json`; `junctions/1080|4k/`; `4k/` (on request) |
| `stills/`, `verify.json`, `README.md` | what was looked at; the checks; the run's notes (the cut, the text, what is made up, the media credits) |
| `run.json` › long videos | `chapters` [{ title, short, part \| clip, at }], `tracker` { theme (white by default), kicker, mascot, hold }, `music.sections` [{ chapter, name, offset }], `junction` (`"chapters"` default: the sheet only into a chapter page · `"sweep-all"` · `"cut"`) |
| `build/tracker/`, `build/sweep/` | the progress marker of each chapter (`tracker.mjs`), the yellow sheets of the cuts (`sweep.mjs`): transparent overlays the assembly lays |
| `workspace/motion/profile.json` | the user's settings for every video: `voiceClone` { id, name, model, language, prefix, stability, similarity }; `voiceover` { introSpeed, music, cta { say, card }, channelStage } |

## The rules that do not move

1. **Structure**: intro (filmed, dressed) → part 1 → cutback 1 (dressed) → part 2 → … → the last part's end card. 1920 ×
   1080, 30 fps. One story per motion part; the clone reads the agenda right after the hook, then the rest.
2. **The intro is cut right after the hook** (the end of the sentence that names the subject or the promise, within
   ~30 s): min(the next word's start - 0.05 s, its last word's end + 0.3 s). **A cutback** is cut 0.08 s before the user
   speaks and ends 0.13 s after their last word. Decide by rule; say it in the final message.
3. **The clips are dressed** (`look.md` § The filmed clips): graded (`scripts/grade.mjs` on the intro, its LUT on every
   cutback), at the user's speed (Ihsane ×1.1), the footage never through Chrome, lockups beside the head, the user's
   mask on top, punches by `perspective`, the music from the hook.
4. **Junctions of 0.3 to 0.4 s on the same frame**: each part starts on the previous clip's last frame (a pinned print
   that LEAVES within 1 to 2 s and never comes back, everything after re-laid without it) and ends on the next clip's
   first frame; the voice at 0.25 s; no dead air; the junction frames stripped of colour chunks; PSNR ≥ 40 dB.
5. **The voice is the user's clone**, made ONCE and kept (`profile.json › voiceClone`); `eleven_v4`, stability 0.5,
   similarity 0.85, seed 7; the prefix (`[French accent] ` for Ihsane) is personal, empty unless asked. Pauses between
   sentences when a scene needs time (`vo.json › pauses`), never a stretched voice.
6. **The script is the user's own words** (the take after the hook, cleaned: simple spoken English,
   `plugins/video/references/how-you-talk.md`, checked against `plugins/video/references/plain-english.json`), or their script. **When the take
   stops early, the rest is written WITH the user**: every fact you cannot know (a number, a name, a benchmark, a
   result) is asked, never invented. A recap before the brand's segment works. The end (the call) comes from
   `profile.json › voiceover.cta`.
7. **True only**: on screen, only what the voice says at that moment; no number the voice does not say; a real
   number carries its source line on screen (`look.md` rule 10), one the user marked illustrative « Illustrative figures »,
   one with no source is left out; fictional people and companies (never « Acme »), phones in fiction ranges;
   real tools = real logos and homepages; generic providers inside a competitor.
8. **The look** (`look.md`): no stamps; words out of their masks; counters; editorial lines with the yellow marker; the
   yellow V page with its light whoosh; one chart per metric under its app icon, bars from zero; the method sliding down;
   homepages at the full viewport in a browser frame; no 3D dives; something changes every 1 to 2 s; no subtitles.
9. **The media** (`media.md`): 8 to 12 stock shots per 4 minutes in the frame on the paper (free commercial licences
   only: Pexels, Mixkit Free; never Mixkit Restricted), 3 to 5 GIFs as pinned prints (organic use only), on their words.
10. **The sound**: only the shelf's music and sounds; ONE music from the intro to the end card (the parts rendered
    without it), or one per section of a long video (rule 11); -14 LUFS, true peak ≤ -2 dBTP.
11. **A long video is cut into chapters** (its big parts only, usually 3 to 5, never an ending: the list confirmed by
    the user before the stories): each opens on the yellow V page HELD 1 to 2 s with no voice and a riser, then the progress
    marker for about 4.5 s (the brand's mascot, the next chapter pixelated, out on mechanical sounds); the music changes
    at EVERY chapter, a calmer track in another register each time, about 6 dB lower than the intro's; a plain cut between the face and a
    drawn screen, the yellow sheet only on the cut into a chapter's page (`look.md` § Long videos: chapters, the marker, the music).
12. **The 1080p draft for review (+ a 720p preview); the 4K only when the user says so.** Nothing is published. Never
    delete the user's files without asking.

## The run, in order

```bash
node plugins/video/motion/bootstrap.mjs
```

### 0. The video's folder
From the app, `workspace/projects/<slug>/run.json` is there: use it. Otherwise make the slug from the subject; a pasted
script goes to `workspace/projects/<slug>/script.md` first. Then:
```bash
node plugins/video/skills/voiceover-video/scripts/new.mjs workspace/projects/<slug> --video <the take> [--script <file>] [--subject "Waterfall enrichers"] [--language en] [--brand brand.json]
```
It copies the template, writes the brand's colours and faces, puts the clone in `vo/part-1/vo.json` when the profile has
one, and prints the user's settings (speed, music, their end).

### 1. The take, heard (`take`)
**Your voice made better: a bonus, asked with the brief every time, never on by default**
(`plugins/video/references/voice-clean.md`): ElevenLabs' voice isolator takes the room's echo and the noise out of
the filmed take (Ihsane's pick on acquisition-b2b, 2026-10-15). On a yes, before `take.mjs`:
`node plugins/video/motion/voice.mjs clean <the take>`, then run.json › `video` is `<…>-voice.<ext>` (the same length,
the picture untouched). It needs the ElevenLabs connector, there anyway for the clone. A clone's parts need nothing.
```bash
node plugins/video/skills/voiceover-video/scripts/take.mjs workspace/projects/<slug> --lang en
```
Always `--lang`: a model guesses French on an English take said with a French accent (and Whisper then translates it).
Whisper hears it on this Mac (about 70 s for a 7.6-min take on an M-series GPU); every word's onset and end are then
measured on the voice (`hear.mjs`: the pauses Whisper runs together put back, the words of a phrase laid on its measured
span), so the cuts never trust a model's end of word. Read what it heard, whole: Whisper may mishear a brand name
(« Pycorn » for Pipecorn) or write a number in digits; a word in the story's `A()` is the word as heard. `--asr scribe`
(a key, and the user asked) sends the take to ElevenLabs instead; `--transcript <take/transcript.json>` reuses one.

### 2. The cut (`intro`)
Pick the hook's last sentence by rule 2, and the cutbacks: a short line (≤ 12 words) that opens a part, best a question;
at most one per change of part; none when the take has none. Then:
```bash
node plugins/video/skills/voiceover-video/scripts/cut.mjs workspace/projects/<slug> --intro "#3" --cutback "#14"
```
(`#n`: a sentence of `take/sentences.json`; seconds by hand: `--cutback 94.8-97.93`.) An HLG take is tone-mapped to SDR.

### 2 bis. Facecam: the face shots and the parts in the real voice (`intro`)
Read `take/sentences.json` whole: pick the face shots (the hook first, then a short real line at each change of idea,
5 to 20 s each: the user's face carries the moments that need it) and the motion parts (what is best shown), and the
sentences to leave out (a false start, a sentence said twice: keep the last good one). Then:
```bash
node plugins/video/skills/voiceover-video/scripts/facecam.mjs workspace/projects/<slug> --face "#1-#2" --motion "#3-#6" --face "#7" --motion "#8" --face "#9" [--drop "#5"]
```
It cuts the face shots (`cut.mjs`, the hybrid's rule), and writes each part's voice from the take: the kept sentences
end to end, the fillers (« uh », « um ») and the pauses over 0.5 s cut out, about 0.26 s of air between two pieces, at
the video's speed (×1.1 by default, as the face shots); each part's words are the take's own, moved (`vo/part-<n>/`,
`vo.json › real: true`). `--parts-only` redoes the parts without cutting the face shots again (their grade and masks
stay). Check a part's sound once on this Mac (`node plugins/video/skills/voiceover-video/scripts/hear.mjs
workspace/projects/<slug>/vo/part-<n>/voix/prise.wav --lang en`): every word of the part heard, none clipped.
Then steps 3 and 4 for every face shot (`intro.mjs`, `intro.mjs --cutback <n>`), step 5 skipped (the words are said),
step 6: `prep.mjs` only, never `voice.mjs take`.

### 3. The grade (`intro`)
The intro's picture with the colour grade's engine, carried by this skill (`scripts/grade.mjs`, the same as
`/video-color-grade`'s: less exposure, the burnt whites back, a touch of contrast and vibrance; an iPhone HDR take stays
HDR). It writes the picture and its LUT:
```bash
node plugins/video/skills/voiceover-video/scripts/grade.mjs workspace/projects/<slug>/real/intro.mp4 --out workspace/projects/<slug>/real/intro-graded.mp4
```
Every cutback takes this LUT (`real/intro-graded.mp4.cube`) in the next step.

### 4. The clips' material (`intro`)
```bash
node plugins/video/skills/voiceover-video/scripts/intro.mjs workspace/projects/<slug> --speed 1.1
node plugins/video/skills/voiceover-video/scripts/intro.mjs workspace/projects/<slug> --cutback 1
```
`--speed` from `profile.json › voiceover.introSpeed` (Ihsane 1.1; ×1.2 was too fast); a cutback plays at the intro's
speed. Each writes the clip at its speed, its frames, the user's mask on each (Apple Vision: about 25 s for 22 s of
intro), its words, its page and its story's skeleton. Once per cutback.

### 5. The script (`script`, with the user)
`node plugins/video/motion/progress.mjs workspace/projects/<slug> script running "The script"`. The rest of the take after
the hook, cleaned by rule 6, split into parts at each cutback (the cutback's own words are NOT in the clone's text):
part 1 opens on the agenda (the video's plan as the user said it), the last part closes on the user's end
(`profile.json › voiceover.cta.say`; the first time, write it with them and save it there). **Where the take stops,
write the rest with the user**: draft it in their words, mark every fact you cannot know, and ask them (a benchmark, a
number, a name, what their tool does); a session started from the app, where nobody answers live, leaves such a
sentence out and says so in its final message. Numbers the user gives as illustrative are marked so (on screen and in
the README). Show the whole script (`script.md`, `[FILMED]` / `[CLONE]` per part, like
`workspace/projects/waterfall-shared/script-complet.md`). `… script done "<n> parts, <n> words"`.

**A long video (from about 5 minutes): the chapters, with the user.** From the plan the voice says, propose the
chapters (its big parts only: usually 3 to 5, never the intro or the ending), each with its time on the take,
its short label (the marker's) and where its page goes (a drawn screen, never a face shot), and the music's sections
(the intro's track to the first chapter, then a calmer one, lower). Ask the user to confirm the list (AskUserQuestion;
from the app, decide by the rule and say it); write `run.json › chapters`, `tracker`, `music.sections`. Each chapter's
page needs its pause in the voice (`vo.json › pauses`, about 1.6 s after the title's last word).

**The AI voice mode** has no take: the script comes from the user's script, idea or article (`run.json › scriptText`,
`script`, `notes`), written in their words (`plugins/video/references/how-you-talk.md`), every fact asked, never invented.
Long videos: one part per idea of the plan (2 to 4 minutes each), each opening on its first idea (no junction) and
ending 0.3 s after its last word; a yellow V chapter page carries a change of part; the last part ends on the end card.

### 6. The voice (`voice`)
`node plugins/video/motion/progress.mjs workspace/projects/<slug> voice running "Your voice"`.

**Which voice: the user's choice, on their first video** (`clone.mjs --choices` lists what they can pick and the one
kept; a voice kept is used from then on, nothing asked). From the app it is `run.json` › `voice`; in Claude Code, ask
once with AskUserQuestion:
- **`clone`, their own voice, cloned from their take** (the default): an Instant Voice Clone, made once and kept in
  `workspace/motion/profile.json` › `voiceClone` (theirs, on their Mac, never shipped). Their ElevenLabs plan must allow
  Instant Voice Cloning (Starter or above): say so before; a refusal says it, and the other choices stay.
  ```bash
  node plugins/video/skills/voiceover-video/scripts/clone.mjs workspace/projects/<slug>
  ```
  (3 minutes of speech in the take; `--use <voice_id> --name "<name>"` for a clone they already have; `--prefix` only
  on request.)
- **`premade`, a voice of ElevenLabs** (any plan): audition three of the account's default voices on the hook, as
  `/video-article` does (`voice.mjs voices` → category `premade`; `voice.mjs audition workspace/projects/<slug>/vo/audition
  "<the hook>" Brian=<id> …`, Scribe each, leave out one that changes a word); in Claude Code the user picks, from the
  app the page offers them (« Pick the voice ») and the closest to 2.7 words/s goes first. Then
  `clone.mjs workspace/projects/<slug> --premade <voice_id> --name "<name>"`.
- **`pipecorn`, Ihsane's voice** (« Ihsane · Pipecorn »), offered only when `--choices` lists it: `clone.mjs
  workspace/projects/<slug> --pipecorn` adds the voice Ihsane shares to the user's own account (their key; a paid plan),
  with its prefix « [French accent] » and its settings. Never offered while `voices.json` has no ids.
For each part, write `vo/part-<n>/vo.json` (`new.mjs` made part 1's; copy it for the next): `text` = the prefix + the
part's script, `say` (« Kaspr » → « Casper », « SDR » → « S D R »), `pauses` ([["word", 0.8]] where a scene needs air).
Then, one part after the other (ElevenLabs takes 3 requests at a time: never in parallel):
```bash
node plugins/video/motion/voice.mjs take workspace/projects/<slug>/vo/part-1/vo.json
node plugins/video/skills/voiceover-video/scripts/prep.mjs workspace/projects/<slug>
```
**Read what Scribe heard**, word for word: a word said wrong is fixed with `say`, then `take` again (or `voice.mjs patch`).
`prep.mjs` writes each part's timing, page and story skeleton, and says which real frames it joins.
`… voice done "<n> parts, <duration> s"`.

### 7. The material (`material`, `look.md` § The material)
For every real tool the script names: its homepage at the full viewport (`node plugins/video/skills/voiceover-video/scripts/capture.mjs <url> workspace/projects/<slug>/assets/raw/<key>.png`,
looked at, then `film/img/pages/<key>-vp.jpg`), its logo (`film/img/logos/<key>.png`) and, for the clips, its app icon
(`<key>-icon.png`); a logo the site draws in SVG or text is cut out on a transparent ground with
`capture.mjs <url> <out.png> --logo "<css selector>"` (`--color "#hex"` to recolour it), looked at. A study the voice
cites: its page, captured the same way. For every person the voice needs: a fictional person DRAWN in the brand's illustration hand (`node plugins/video/skills/voiceover-video/scripts/people.mjs workspace/projects/<slug> <key> "<who, the prop of their role>"`,
looked at; never an AI photo), a fictional name and company. The user's print (`film/img/photos/<name>.jpg`, from the intro's frames).
A site that refuses the capture (Salesforce: « Access Denied »; Pipedrive came without its styles): its logo from
Wikimedia Commons (`https://commons.wikimedia.org/wiki/Special:FilePath/<File>.svg?width=512`, a PNG on a transparent
ground), looked at; the homepage left out. **A screen recording of the same take** (the user's slides, shared at the
same time): the reference for the diagrams, never on screen: every schema rebuilt in the look, node for node (its
coordinates read on full-size frames), and explained on the words (the camera into the part spoken of, the next
pieces appearing on their words, the rest pixelated or dimmed), as on `workspace/projects/acquisition-b2b/film/kit.js`.
Each one in the README. `… material done "<n> pages, <n> logos, <n> people"`.

### 8. The media (`media`, `media.md`)
Plan them first (the moments, the words, why, the source), then for each:
```bash
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> stock search "<what the picture shows>"
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> stock get <page> --name <name> --from <s> --to <s> --author "<author>"
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> gif search "<the meme's name>"
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> gif get <id> --name <name> --caption "<short>"
```
Most of Mixkit's business clips are « Restricted » (refused): without a Pexels key, find Pexels pages by a web search
(« pexels video <what it shows> », the site pexels.com) and give them to `stock get`.
Look at each sheet; then `media.mjs <run> sheet` (one series) and `media.mjs <run> credits` (the README).
`… media done "<n> stock shots, <n> GIFs"`.

### 9. The scenarios (`story`)
`node plugins/video/motion/progress.mjs workspace/projects/<slug> story running "Writing the scenes"`.
- **The intro**: `film/intro-story.js` from its skeleton and `example-intro-story.js`, on the intro's words; then
  `node plugins/video/skills/voiceover-video/scripts/intro.mjs workspace/projects/<slug> --stills 1.75,5,13.6,21.9` and
  look (a text cut by the head at a punch's peak, a card over the laptop: fix it there).
- **Each cutback**: `film/cutback-<n>-story.js` from `example-cutback-story.js` (one lockup, the payoff on the marker, ≤ 1
  punch); `intro.mjs <run> --cutback <n> --stills 0,1.6,2.8`.
- **Each part**: `film/story-<n>.js` from its skeleton (its helpers are the reference's) and the examples: one screen per
  idea, each card on its word (`A('word')`, `Z('word')`; `node plugins/video/motion/voice.mjs anchors workspace/projects/<slug>/vo/part-<n>`
  lists them), the print leaving within 2 s and everything after centred, the V page for a new part, the stock shots and
  GIFs on their words, `junctionOut()` at the end. **A chapter's page** (a long video): `B.chapter(sA, sB, { t0: <the
  title's first word> - 0.5, t2: t0 + 2.2, style: 'V', over: '<kicker> · chapter n of N', title: '<short title>',
  photos: B.ph(…) })`, the voice paused under it; its `at` in `run.json › chapters` is the page's end (`t2` + 0.5 s,
  in the piece's own time), and the screen after it keeps its text under y 260 for 5 s (the marker). **The motion
  scenes** (a long video, `references/motion-scenes.md`): 2–3 key ideas told as an After Effects scene (the 3D floor, the
  type tree, the elevator…), each a screen of its own laid with `F.motionPage`, never the same scene twice for one concept;
  set up, written (designer agents in parallel) and rendered with `scripts/motionscene.mjs` before the part. After each scene:
  ```bash
  node plugins/video/skills/voiceover-video/scripts/render.mjs workspace/projects/<slug> --part 1 --stills 0.2,6,14.5
  ```
  **Look at every still** (`stills/part-<n>-<t>.jpg`): overlaps, cut texts, an empty screen, something half off screen.
  Read the render's `[film] ⚠` lines and fix each. `… story done "<n> screens"`.

### 10. The render (`render`)
The clips first (their last and first frames are the parts' junctions), the motion scenes (`motionscene.mjs <run> <scene>
--variant <v>`), then each part (the sounds' level follows the voice's loudness: `--fx-offset` only to force it):
```bash
node plugins/video/skills/voiceover-video/scripts/intro.mjs workspace/projects/<slug> --render
node plugins/video/skills/voiceover-video/scripts/intro.mjs workspace/projects/<slug> --cutback 1 --render
node plugins/video/skills/voiceover-video/scripts/render.mjs workspace/projects/<slug> --part 1
node plugins/video/skills/voiceover-video/scripts/render.mjs workspace/projects/<slug> --part 2
```
A long video, then (transparent overlays, a few seconds each; they are laid by the assembly):
```bash
node plugins/video/skills/voiceover-video/scripts/tracker.mjs workspace/projects/<slug>
node plugins/video/skills/voiceover-video/scripts/sweep.mjs workspace/projects/<slug>
```
(`tracker.mjs --theme yellow|dark` to try another theme than the white; `sweep.mjs` for the cuts into the chapter pages.)
Measured on the waterfall video (M2 Pro, 1080p): the intro about 50 s, a cutback about 12 s, a part about 1.7 minutes per
minute of film (part 2, 2:26: about 4 minutes); the assembly about 3 minutes, the checks about 20 s. A clip rendered again
means the parts around it rendered again.
- **A part is drawn in pieces**: 4 Chromes at once, each a run of consecutive frames into its own file, joined without
  re-encoding (`--pieces <n>`; 1 = one pass). A slice to look at in motion: `--slice 20:30` (seconds), seconds instead of
  the whole part. The intro and the cutbacks are composed in 2 pieces.
- **The 1080p draft is encoded at x264 `medium`** (the same picture after the assembly's encode: measured), **the 4K at
  `slow`**, in one pass (`--preset` to change it).
- **Every face the page declares is loaded before the first frame**: a piece starts on a fresh page. A word drawn in a
  fallback face on one frame is a face missing from the film's fonts: say it, never hide it.
- **Never two renders at once** on the same Mac: they share the cores, and the pieces stop paying.

### 11. The assembly and the checks (`assemble`, `checks`)
```bash
node plugins/video/skills/voiceover-video/scripts/assemble.mjs workspace/projects/<slug>
node plugins/video/skills/voiceover-video/scripts/verify.mjs workspace/projects/<slug>
```
The assembly joins the clips and parts, lays the music (one bed, or one per section of a long video), the markers
after each chapter page and their sounds, the riser into each page, the yellow sheets on the cuts, masters at -14 LUFS (measured on the sound alone), encodes
once, and writes the 720p preview. `verify.mjs`: every ✗ fixed, every ⚠ explained; look at `stills/junction-<k>-a.jpg`
and `-b.jpg` (each join: the same picture).

### 12. Deliver
In the user's language, in a few lines: where the intro was cut and why, the cutbacks, the voice (the clone; the script
cleaned how, what was written with them), what was checked (length, loudness, junctions), what is made up on screen
(people, companies, numbers; where each number comes from, and that naming competitors with numbers is comparative
advertising: check before publishing), the media (their licences; the GIFs organic use only), the files (the draft, the preview to
send) and **that the 4K is made when they say so**. Nothing is published.
Write `publication.md` beside the run: the YouTube description in the user's voice (3 to 5 simple lines), the brand's
link FIRST when the end says « the first link in the description », the study's link when figures come from one, a
disclosure line when the tester is a customer of the brand (« Hyperline is a Pipecorn customer »), the chapters read on
the final cut (`scripts/chapters.mjs <run> "intro=…" "1@So=…" "cutback-1=…" "2@And#4=…"`: 0:00 first, each 10 s or
more), optional courtesy credits (Pexels and Mixkit need none; GIFs organic only), then notes for the user.

### On request only: the 4K
When the user validated the draft and asks for the 4K: every clip composed again from the 4K take, the media's 4K frames,
each part drawn natively at 4K, the 4K assembly and its checks (Google Chrome required; check `df -h /`: about 2.2 GB for
3:45, plus the parts). First the media's 4K frames and a short trial, looked at (12 frames of the intro at 4K, a 4K
still of part 1):
```bash
node plugins/video/skills/voiceover-video/scripts/media.mjs workspace/projects/<slug> frames --all --4k
node plugins/video/skills/voiceover-video/scripts/intro.mjs workspace/projects/<slug> --4k --trial 12
node plugins/video/skills/voiceover-video/scripts/render.mjs workspace/projects/<slug> --part 1 --4k --stills 5
```
Then the whole:
```bash
node plugins/video/skills/voiceover-video/scripts/intro.mjs workspace/projects/<slug> --4k
node plugins/video/skills/voiceover-video/scripts/intro.mjs workspace/projects/<slug> --cutback 1 --4k
node plugins/video/skills/voiceover-video/scripts/render.mjs workspace/projects/<slug> --part 1 --4k
node plugins/video/skills/voiceover-video/scripts/render.mjs workspace/projects/<slug> --part 2 --4k
node plugins/video/skills/voiceover-video/scripts/assemble.mjs workspace/projects/<slug> --4k
node plugins/video/skills/voiceover-video/scripts/verify.mjs workspace/projects/<slug> --4k
```

## When the user asks for a change
- **The techniques referential**: a technique added, validated or refused (a scene, a transition, a block, a sound, a rule) goes into this skill's `techniques.json` in the same change: its status, its date, Ihsane's reason, where it lives in the code and its doc. Never use a technique marked refused there.
- **For this video**: in the story concerned, a part's `vo.json` (a passage: `voice.mjs patch <run>/vo/part-<n>/vo.json
  @word#n @word#m "new text"`), a clip's story, or the cut; then the stills, the render of what changed (a clip changed:
  the parts around it too), the assembly, the checks.
  - **A voice patch** (round 13): the new text starts with the clone's prefix (`[French accent] `) as every sentence of
    the take; read what Scribe heard; `prep.mjs` again (everything after shifts); then re-anchor the story: a word the
    new text adds may now come EARLIER than the one an `A('and')` meant (« and a number only counted » stole the next
    « And »): give those lookups their `after`. Check the stills of the passage every 0.5 s.
  - **A new figure or a source**: update the shared benchmark (`status`, `source`, `date`, values with no source
    removed), the chart's source line, and the README; a test made by a customer of the brand is said in the
    description.
  - **Keep the old outputs**: `assemble.mjs --name <new name>` writes a new file beside them.
- **For every video** (their speed, their music, their end, their prefix): `workspace/motion/profile.json`, or their own
  version of this skill (Customize: AGENTS.md § Your own skills); never edit `plugins/` for one user.
- **Another clone**: only when the user asks (`clone.mjs` sends nothing while one is kept).

## Traps already met
- **The model guesses the language** from the accent: always `--lang`.
- **Whisper runs words together** and dates them early (0.24 s in the median against Scribe on a real take): never cut
  on `take/transcript.json`, always on `take/words.json` (measured on the voice by `take.mjs`).
- **The part 1 example's take was made in two** (the agenda, then the explanation from 19.0 s): its `AA()` and `B0`. A new
  part has one take: `A()` and `Z()` alone.
- **A word not found** (`word not in the voice: …`): `A()` compares the WHOLE word; the n-th (`A('one', 3)`) or after an
  instant (`A('you', 1, t.info)`).
- **A junction that jumps** (PSNR under 40 dB): a junction frame from an older render of the clip (render the clip, then
  the parts), or a PNG with its colour chunks (a cICP chunk made Chrome draw it ~4 % darker: `png.mjs` strips them).
- **A cutback that shows the next sentence's mouth**: its end past +0.13 s after its last word.
- **Mixkit's « Restricted » licence** (720p, personal use): refused by `media.mjs`; pick another clip.
- **A GIF with a channel's mark**: `--crop` or `--blur` it.
- **4K**: the headless shell stalls on the second 4K frame (Google Chrome only); a JPEG frame over ~4 MB hangs the CDP
  link (quality 95, lowered if needed); measuring the loudness on the whole 4K file took 1 h 45 (the sound is measured
  alone).
- **Disk** (measured on the skill test of the reference): a 1080p part about 4.4 MB a second (252 MB for 57 s, 635 MB for 143 s), the
  draft 713 MB for 3:45 (its 720p preview 34 MB), the 4K about 2.2 GB, the intro's frames and masks about 110 MB: `df -h /`,
  keep 3 GB free; delete `build/part-*.mp4` once the draft is validated, never the user's files without asking.
- **ElevenLabs** takes 3 requests at a time: never run takes in parallel.
- **A cut lost one frame** (`cut.mjs`: n = round((to - from) × 30), then `-t` dropped it): 33 ms of the take skipped at that
  join; harmless in the silence between two sentences (the cut's place), never inside a word.
- **The marker over a face shot** sits on the head: a chapter opens on a drawn screen.
- **A silence made with ffmpeg's `anullsrc`** is 8-bit (u8): concatenated with a voice, it drags the whole join to u8 and
  the voice comes out with a loud broadband hiss (-60 dBFS on every word: « le son fait n'importe quoi » after the
  chapter pages, 2026-10-15). Give every input of a concat `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo`.
