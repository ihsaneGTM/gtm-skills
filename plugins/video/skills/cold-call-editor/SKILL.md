---
name: cold-call-editor
description: "Edit a vertical (9:16) video whose SOUND is a recorded phone call (a cold call: the caller and the person called) over footage that has nothing to do with it, into a finished short in the Pipecorn CALL LANGUAGE: the most suspenseful line of the call as the hook, up front, glitched on its stressed words (picture and lettering); a paper sheet where the call is placed (the caller's microphone and the other side's handset land in stop-motion, a dotted line, the handset shakes, a synthesised ringback tone); bam (a camera flash, a de-zoom, the music on its first big hit); then the call typed out as a record at the bottom of the frame (Geist Mono, the speaker's name in a column, letter by letter on each measured word onset) with the voice as one thin line of wave above it, in the colour of the voice talking. Who speaks when is MEASURED (a timbre model per voice), the onsets are read on the audio envelope, the music sits about 17 LU under the voice, the audio is finished at -14 LUFS and verified numerically before delivery. Use when the user hands over a cold call, a sales call, a phone call recording, a call with a prospect, and asks to edit it, make a short of it, transcribe it on screen, show the two voices, or says monte cet appel, cold call, appel à froid, transcription de l'appel, style cold call."
user-invokable: true
---

# cold-call-editor: a recorded call becomes a short

The user hands over **one vertical video whose sound is a phone call**: two voices (the caller,
who is the user's side, and the person called) over a picture that has nothing to do with the
call (someone at a desk, eating crisps). The picture cannot say it is a call, so the frame does:
this skill transcribes the call, tells the two voices apart by measuring them, picks the line
that makes a viewer stay, opens on it, places the call on paper while it rings, then types the
whole conversation out as it is said, with the voice drawn as one line.

**What a short looks like is settled: § The call language** (below the pipeline). Every rule in
it was a verdict from the review of a real call, over seven versions. Do not re-open them; start
every new call from them (`init.sh` scaffolds it).

**This skill runs on the engine of the short-editor skill.** Its render, mix, person matte,
previews, build and verification are the same files: read
[`../short-editor/SKILL.md`](../short-editor/SKILL.md) § Prerequisites, § Where things live and
§ 4 to § 6 once; they apply here as written, and this file says only what differs. Read before
the first cut, every run:
- [`../../references/pitfalls.md`](../../references/pitfalls.md) § Transcription and captions, § Working method: the traps an edit is written with (its other sections when their step comes: § Audio before a sound measured by hand, § ffmpeg and § The shell before a command of your own; the engine's tools follow the rest)
- [`../../references/brand-kit.md`](../../references/brand-kit.md) § Your brand, set once: the user's brand in `workspace/brand/`; here its name is written as it is and its notes apply, while § The call language stays as settled (say so when a brand colour or face finds no place in it)
- `$C/example/`: the reference call, every file of the delivered edit

Read when the step needs it: [`../../references/audio-spec.md`](../../references/audio-spec.md) at the levels (the loudness standard, how a level is measured as heard). The engine's figures: `node plugins/video/skills/short-editor/scripts/api.mjs <module> [figure]`, never their sources.

> **I cannot watch the video or listen to it.** Who speaks, where a word starts, where a phrase
> ends: each one is a measurement, then a reading of the transcript. `verify.mjs` stands between
> "it's ready" and a broken file. Never skip it.

All paths below are relative to the root of the GTM by Pipecorn folder. `$C` means
`plugins/video/skills/cold-call-editor/scripts` (this skill), `$E` means
`plugins/video/skills/short-editor/scripts` (the engine). Run both by their absolute path.

## Prerequisites (preflight: check before any work)

The engine's: `ffmpeg` + `ffprobe` on PATH (`brew install ffmpeg`) and `python3` (Xcode Command
Line Tools) are required and not installable from here; stop and say the command if one is
missing. Everything else provisions itself: `$C/py.sh` runs the engine's `bootstrap.mjs` before
every Python tool (the node packages, the speech-to-text venv that also carries numpy, the music
shelf), and `init.sh` fetches the faces: Sacramento (the engine's) and **Geist Mono** (Vercel, SIL
Open Font License, the face of the record) into the project's `assets/fonts/`. Nothing is
installed system-wide. Optional: `swiftc` for the person matte (what is named comes out from
behind the person); without it the chips simply appear.

## Where things live

As the engine says, and only this way: one working directory per edit,
`workspace/projects/<slug>/`, a slug no other project has; the finished file
`workspace/videos/<slug>.mp4`; never another project's files, even of the same call; temporary
files in the project's `tmp/`, never `/tmp`. The skill's `scripts/` stays read-only.

## The pipeline

### 0. Set up the working directory

```bash
$C/init.sh workspace/projects/<slug> <source.mp4> workspace/videos/<slug>.mp4
```

The engine's scaffold (project.json read from the file, the SFX pack in `assets/sfx-top5/`),
then this skill's `plan.mjs`, `edl.mjs`, `assets/hookfx.json`, the levels of the call language
in project.json (`style: "cold-call"`, `bedDb -20.9`, `sfxMasterDb 2`, `cueGains`), and the
fonts. Run every later command from inside that directory.

### 0.2. Ask first, in ONE question

The music (the shelf, `plugins/video/assets/music/`; say once that the tracks that are not Mixkit can
block the video's monetisation) and the pace (a call reads well faster: the reference ran at ×1.2, the user's choice).
With the two bonuses below; **this style has no old-radio bonus**, its hook is the glitch, always. Run from the
GTM by Pipecorn page, the brief of the first message answers it; do not ask again.

**The Pipecorn generic: a BONUS of every style, asked EVERY time, never on by default**
(`plugins/video/references/pipecorn-generic.md`): about 6 s at the very end, Pipecorn, then its
values replacing one another in one slot, then Pipecorn again, no music. **No** · **Yes**, with
which values (1 to 4; `node $E/generic.mjs --list`; by default phone coverage, connect rate,
pipeline).

**Your voice made better: a BONUS, asked EVERY time, never on by default**
(`plugins/video/references/voice-clean.md`): ElevenLabs' voice isolator takes the room's echo and the noise
out of the take (a phone line's hiss too). **No** · **Yes, make my voice better**. It needs the ElevenLabs connector: without a key, say
in one line that it exists (Settings › Connectors › Add key) and go on. On a yes, before step 1:
`node plugins/video/motion/voice.mjs clean <the call>`, then project.json › `source` is `<…>-voice.<ext>`
(the same length, the picture untouched).

### 1. Transcribe, verbatim

```bash
$E/transcribe.sh --lang en      # the language actually SPOKEN; then project.json "lang": "en"
```

`words.json`, on the clock of the RAW take. Never translated.

### 2. Who speaks when: measured, then read

```bash
$C/py.sh diarize.py --auto                     # a proposal: two clusters of timbre, with their words
$C/py.sh diarize.py --seed A:5.0-12.6,25.4-33.9,45.5-61.0 --seed B:15.3-23.2,35.2-43.3,65.0-83.3
```

**A is the caller** (the user's side), **B the person called**. `--auto` groups the breath groups
into two timbres and prints them: read them to decide which cluster is the caller (who
introduces themself, who pitches, who asks "who is this?"), and keep only stretches whose
speaker is certain **from what is said**: a cluster can mix both voices (on the reference, the
last group held the prospect's sentence AND the caller's last words). Two or three stretches a
voice, 5-15 s each, away from the turn changes. The seeded run trains one model per voice and
prints its accuracy: **held out, both voices should be at 90 % or more** (98-100 % on the
reference). A stereo recorder that put each voice on its own channel: `--channels --left A`.

Then **read the turns it prints**. The model scores each word on its own; three things it gets
wrong, and they are found by reading, never guessed:
- a one-word turn inside the other voice's sentence ("not a SALES call" with "sales" given to the
  prospect): marked `!`;
- a word the transcript dated over the other voice ("my" of "my name is…" sat on a fragment of
  the prospect's voice);
- **a word said OVER the other voice** (the caller's "Absolutely." under the prospect's
  sentence): the model gives it to the louder voice. It is a turn of its own, and it gets its
  own line in the record.

Each fix goes in project.json `speakerFix` (`{"85": "A", "234": "A"}`) with a word on why in
`speakerNotes`: `onsets.py` (§ 3) applies it, and a new run of `diarize.py` does not lose it. Read
the record again after § 6: a one-word line in the wrong voice ("PROSPECT  My.") is one more fix.

**The names**: `speakers.A.name` is the caller's first name **when it is said in the call** (the
reference: "my name is Kyle" → KYLE), else ME. `speakers.B.name` stays PROSPECT: never the
person's name, company or number, even when said (§ Non-negotiables).

### 3. The onsets: measured, then pinned where the transcript lies

```bash
$C/py.sh onsets.py                 # assets/words-fixed.json: each word on its onset, with its voice
$C/py.sh realign.py                # a second whisper pass on short chunks: where the two disagree
$C/py.sh envelope.py 39.6 41.4     # the 20 ms envelope with the words on it
$C/py.sh envelope.py --say 39.92 40.24 40.22 40.96   # each window transcribed alone
```

On the reference, whisper put words up to 0.9 s early ("digging" 0.7 s early, "some", "kind of"),
and the two passes disagreed on 58 words. `onsets.py` already moves a word out of a silence onto
the next syllable attack. Where the passes disagree **and the word matters** (the first word of a
turn, the hook's words, a punch, the payoff, a chip, the word the riser ends on), read it on the
envelope: syllables are bursts between dips; `--say` names a burst. Pin it in project.json
`onsetFix` (`{"257": 91.47}`, raw seconds) with the measurement in `onsetNotes`, then run
`onsets.py` again: the record, the turns, the levels and the bursts all read the pinned onset.
A pinned word is scored again for its voice on where it really is.

### 4. The hook: the judgment step

Read the whole call and pick **its most suspenseful line**: the moment a viewer needs the rest of
the call to resolve. On the reference: the prospect, "Where did you get my number? I mean, my
number is not listed." One line, a complete sentence, 2.5-5 s once sped up, ideally the other
voice challenging the caller. Not the pitch, not a greeting. When the user's notes name the
moment, it is that one. In a conversation, propose the line (and the runner-up) in one short
message before assembling: it is cheap to change now and costs a new assembly later. Run from the
GTM by Pipecorn page, decide, and say in the delivery message which line and why.

Then its place, in project.json `assembly` (raw seconds; `$C/call.mjs` explains each key):
- **The voice**: `hookFrom` on its first breath, `hookTo` **after its last syllable**:
  `$C/py.sh envelope.py --end <onset of the last word>` measures where the speech stops, and
  `hookTo` is that + 40 ms. Never whisper's end of word: the reference lost "-ted" of "listed"
  twice in review that way.
- **The picture**: `hookVideoTo` = `hookTo` + 0.15 s: the footage keeps running under the last
  typed word, never a frozen frame.
- **Where the call starts**: `resume`. When the source already opens on a copy of the hook line
  (the same words twice in the transcript, at the head and in their place: the reference), the
  hook is that head, `hookFrom` 0, and `resume` is where the call itself starts (4.366667 on the
  reference). Otherwise the hook is copied from inside the call and `resume` is 0: the line comes
  back in its place, as the call is played whole.
- `gap`: the ringing, **2.18 s of output** (× `speed`: 2.62 at ×1.2): the sheet, the two
  stickers, the line, two rings. `breathe`: 0.15 s between the end of the line and the sheet.
- `end`: null, unless the call goes on past what is worth keeping (the speech's own end).

The hook is said in the delivery message, with why it is the one.

### 5. The glitch, the assembly, the levels, the matte, the sounds

```bash
node $C/bursts.mjs 1:0.8 6:1 10:0.6 12:1     # the stressed words of the hook: index:strength
$C/py.sh assemble.py                           # source/assembly.mov; project.json repointed
$C/py.sh levels.py                             # assets/call.json: the voice per frame, per side
node $E/matte.mjs --force                      # the person matte, on the new timeline
$C/py.sh sounds.py --track plugins/video/assets/music/<track>.mp3
```

- **The bursts**: one per STRESSED word of the line, 3 or 4 (the key word 1.0, a lighter one
  0.6), and the break into the sheet is added. More and the line stops reading as a line that
  breaks up.
- **The assembly** keeps the source's pixels outside the bursts and its bit depth and colour tags
  everywhere (never a regrade). It removes `voice.wav`; `build.sh` extracts it again. Every time
  the assembly changes: `levels.py`, then `matte.mjs --force`, before any render.
- **The sounds**: the ringback tone (synthesised, 440 + 480 Hz), the track's own intro muffled
  under the hook, and the bed from the track's first big hit so the music lands with the bam.
  The hit is detected and printed with the candidates; `--hit` overrides it.

### 6. The record: dialogue.json, read in full

```bash
node $C/dialogue.mjs --draft      # the turns, cleaned of hesitations and false starts
node $C/dialogue.mjs              # print it back with the onsets, to read
```

The draft drops what nobody would type ("uh", "um", "I, I'm", "me me") and sets the case; it
flags a word said twice that may be grammar ("unless you do. Do you know a Kyle?" keeps both).
**Read every turn**: the punctuation (a question takes "?": "Is that a sales call? No?"), the
commas, where the sentences end, a name the transcript spelt wrong ("Kyles"). Edit the text of a
word, never add or rewrite one; `dropped` lists what is not on screen, and the delivery message
says how many and which kind. One turn = one paragraph; a turn said over the other voice is its
own line.

### 7. The picks: plan.mjs

`PICKS`, word indices of words.json, chosen by reading:
- `hookStress`: the hook's key word: the pack's glitch sound on it.
- `hookRiserEnd`: the riser of the hook ends dead on it (the word that turns the line: NOT listed).
- `punches`: `[[word, release word], …]`, 3 to 6 over the call, where it turns (the objection,
  the reveal, the claim): a punch 1.13 in 0.10 s, released on the next phrase.
- `payoff`: the last word that lands (the reference: "doing my JOB."): the riser ends on it, the
  last punch, held to the end.
- `chips`: `[{ kind, i, until }]`, a thing NAMED comes out from behind the person on its word:
  `phone` ("my NUMBER"), `mail` ("my EMAIL"), `globe`, `linkedin`. Generic glyphs, never a brand
  that is not the user's. One per thing named, two or three per call at most.

And `project.json`: `anchorX` / `anchorY` on the person's eyes (a frame of the source: where the
camera's punches grow from; the chips start there and go to the free side). Look before
building:

```bash
node $E/preview.mjs 1.1 3.3 4.6 6.2 30 --out preview/ --width 1080    # the composite
$E/build.sh --slice 0 7                                                 # the opening in motion
```

### 8. Render, measure, verify, deliver

```bash
$E/build.sh
node $C/measure.mjs           # every sound as heard, by subtraction
node $E/verify.mjs            # non-zero exit: do not ship
```

The bed about **17 LU under the voice** during the call (the user found 15 a touch loud), the
muffled intro about 18 LU under the hook's voice: adjust `bedDb` / `cueGains.hookBed`, then
`build.sh --audio-only`. Then deliver (`SendUserFile`, or the GTM by Pipecorn page plays it): the file, the
numbers of verify.mjs, and what the edit cost (§ Non-negotiables).

**The Pipecorn generic, when the brief asks for it**: last, on the delivered file, once the
verify above passed (`plugins/video/references/pipecorn-generic.md`), from the project:
`node $E/generic.mjs workspace/videos/<slug>.mp4 --values <ids>`. It keeps the file without it
in `tmp/without-generic.mp4` and redoes it from there when it is run again; after any new render,
run it again. Give its numbers at delivery (the new length, the loudness, the generic's level),
and say once that its numbers are Pipecorn's claims, to confirm before publishing.

## The call language: how a cold-call short looks

Built on a real 93 s cold call over seven versions in review (2026-10-02/03; the reference:
`$C/example/`). Every row is a verdict.

### What was decided: do not re-open

**The techniques referential**: a technique added, validated or refused (a scene, a transition, a block, a sound, a rule) goes into this skill's `techniques.json` in the same change: its status, its date, Ihsane's reason, where it lives in the code and its doc. Never use a technique marked refused there.

| Asked for | The rule |
|---|---|
| A call is two voices over a picture that has nothing to do with them: show it is a call, show the two voices, "the little mic that moves with the decibels" | Who speaks is MEASURED (one timbre model per voice) and read; the voice is drawn from its measured level, per frame. |
| No black bubble (a Dynamic-Island capsule with an avatar per voice) | Refused. Nothing in a black capsule. |
| The two stickers with the names and the bars between them, at the top: "too AI" | Refused, then replaced by **one thin line of wave** above the record, the colour of the voice talking (caller yellow, other voice white), gone under the ringing sheet. Tested beside it and not picked: nothing, a rule under the speaker's name, a REC light. |
| Open on a highlight: the moment with the most suspense, with an effect of its own | The hook is the call's most suspenseful line, up front, with the **glitch**: on its stressed words the picture and the lettering split red and cyan, bands tear, blocks jump, a camera jolt; clean between. A thriller look (cold grade, 24 fps, grain, bars, push-in) was refused; a crash zoom, Super 8 and VHS were tested and not picked. |
| A transition where the phone rings, as if we were calling, then bam, the video starts | The **ringing sheet**: a paper sheet on the pack's whoosh, the caller's yellow microphone and the other side's handset land in stop-motion with the pack's clicks and their names in ink, a dotted felt line runs between them and marches while it rings, the handset shakes, the **ringback tone** (synthesised), no music. **Bam**: the flash, the de-zoom 1.30 → 1.00, the music on its first big hit. |
| No big dynamic Pipecorn text (Impact, bold, word after word popping, two faces) on a calm format, a call and its transcription | The **typed record**: Geist Mono at the bottom, the speaker's name in a column, each word typed letter by letter from its onset, a cursor, one paragraph per turn, older rows scrolling up and fading. Tested: a live transcription panel, a message thread (picked, then dropped for this), classic subtitles. |
| The hook's sentence was cut before its end ("…not listed" not finished, then "listed" heard as "list-") | The hook's voice runs to the **measured** end of its last syllable + 40 ms, the line stays typed 0.15 s, the picture keeps running under it. |
| The music slightly too loud | The bed about 17 LU under the voice during the call (cue −20.9 on the reference), the muffled intro about 18 LU under the hook's voice (−15). |

Kept through the passes without a note, so **not validated**: the camera punches on the words
where the call turns, the generic icons coming out from behind the person (a phone on "my
NUMBER", a mail on "my EMAIL"), the riser ending on the payoff, the light shade at the top, an
interjection on its own line.

### The recipe: the numbers that made it work

- **The record** (`typewriter.mjs`): Geist Mono 500, 37 px at 1080 wide, names in 700, the name
  column 10 characters (wider for a longer name), x 0.07, width 0.86, the last row at y 0.80, 6
  rows, line height 1.45; a letter every 12-45 ms so a word is typed before the next starts;
  the newest row eases up in 0.18 s; a scrim from y 0.44, alpha 0.55; the cursor blinks 2.2 a
  second. It starts again at the bam: the hook is typed on its own.
- **The wave** (`wave.mjs`): y 0.585, from x 0.07 to 0.93, 3 px, amplitude 34 px × the level, the
  last 1.1 s of voice from right to left, a soft shadow.
- **The levels** (`levels.py`): a 10 ms RMS envelope mapped from 29.5 dB under to 12.5 dB over the
  call's median speech level, attack 0.55, release 0.10 per 10 ms.
- **The hook**: 4.08 s of voice on the reference (3.40 s at ×1.2), bursts of 0.10-0.20 s starting
  13 ms before their word, strength 0.6-1.1; a jolt of the camera to 1.035 on each.
- **The ringing** (`ringscene.mjs`, on `cover({ enter: "drop" })`): stickers 300 px at x 0.235 /
  0.765, y 0.445, landing 0.21 s and 0.335 s after the sheet, 8 poses a second (settle 0.62 s);
  the line over 0.25 s; the ringback (1.46 s: a tone of 0.80 s, 0.38 s of silence, the start of
  the next one) ends ON the bam.
- **The sound** (cue · align, on `sfxMasterDb` 2): muffled intro −15; glitch −17 · 0.15 s on
  the hook's key word; riser −14 · 1.765 s (its END on the word); whoosh −9.5 · 0.94 s at the
  sheet + 0.01 s; ringback −13.5; flash −7 · 0.255 s; whoosh_out −21; bed −20.9 from 20 ms before
  the bam; swoosh_in −25 on each punch; click −11 when a chip clears the person; the paper's
  sheet_in −21 under the whoosh, one felt glide for the line. Measured as heard by subtraction
  on the reference: bed 16.8 LU under the voice, intro 17.9 LU, ringback 7.2 LU under the
  programme. **Re-measure on every call** (`measure.mjs`): a quiet recording moves them.
- **The chips**: 350 px at y 0.505, from where the person is to the free side, rot −6.
- **The camera**: no move in the hook but the jolts; under the flash 1.30 → 1.00 in 0.62 s; the
  punches 1.13 in 0.10 s, released in 0.34 s; the payoff 1.14, held to the end.

### Options, run from the GTM by Pipecorn page

As the engine says (`GTM_OS_FROM_UI=1`): never a reel; each option its own short file in
`variants/` with `variants/variants.json`. For this style the options are cut with
`$E/build.sh --slice A B` (the opening: `--slice 0 <C0 + 1.5>`), and a hook effect to compare is
an assembly of its own (`assemble.py --fx plain --tail 1.9 --out variants/…` for the raw hook).

## Non-negotiables

**The feed's safe zones** (`plugins/video/references/safe-zones.md`, 2026-10-05). The typed record, the voice line, the stickers and their names stay inside x 0.095–0.905, y 0.128–0.774. Never in the bottom band (y ≥ 0.79) or under the buttons (x ≥ 0.84 from y 0.425). The defaults of `record()`, `wave()` and the template's ring scene do it. Check a frame with `$E/safezones.mjs --overlay`.

**Who speaks is measured, then read.** Never guessed from the words alone, never from the
picture. A voice fix is a reading of the transcript, written in `speakerFix`, and said.

**The record is the call, verbatim.** Cleaned of hesitations and false starts only; never a word
rewritten or added; what is dropped is counted in the delivery message.

**The other person stays PROSPECT.** A private person on a recorded call: their name, company,
phone number or email never go on screen, even when said. The caller's first name goes on screen
only when it is said in the call.

**The hook ends after its last syllable**, measured on the envelope, never on whisper's end of
word.

**Loudness to standard**: −14 LUFS, true peak −1.0 dBTP, two-pass loudnorm (the engine's
mix.mjs). Never a bare `volume=+NdB`.

**The sound is the short list** above: no sound per typed word, none when the call changes side
(the voices are the change), no hit after a riser. The ringback is synthesised; nothing is ripped.

**Never regrade the footage.** The assembly keeps the source's pixels, depth and tags.

**Say what the edit cost**: the words not on screen, the voice fixes read rather than measured,
the onsets pinned by hand, the seconds the opening adds, the music's licence when it is not
stated.

## Iteration cost

| Change | Command | Time |
|---|---|---|
| A voice fix, a pinned onset | edit project.json, `onsets.py`, `levels.py`, `dialogue.mjs` | seconds |
| A word of the record | edit `dialogue.json` | seconds |
| The hook (its line, its end, the bursts) | project.json `assembly`, `bursts.mjs`, `assemble.py`, `levels.py`, `matte.mjs --force`, `sounds.py` | ~10 min for a 90 s call |
| A level, a cue, the music | `build.sh --audio-only` | ~30 s |
| A sound's real level | `measure.mjs <sound>` | ~30 s each |
| The composite at one instant | `preview.mjs t … --width 1080` | under a second a frame, four at once |
| The opening in motion | `build.sh --slice 0 7` | ~30 s |
| Everything, final (once per version: after a change, only the segments of the picture that changed are composited again) | `build.sh` | ~1.5 min for 80 s at 60 fps with a matte; ~25 s after a small change |
