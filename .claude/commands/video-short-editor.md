---
description: "Edit a raw vertical (9:16) take into a finished short in the Pipecorn vertical language: your words as big headlines at the top (Impact + one Sacramento accent) passing behind you, your real logos and product coming out from behind you, paper plates in stop-motion with discreet subtitles, a music bed from the shelf, the SFX pack (flash on a change of shot, click on what appears, whoosh into the paper, glitch on one text pop, riser into the payoff), audio at -14 LUFS, verified before delivery. Bonus, asked every time: an old-radio hook (radio voice + old CRT TV on the first seconds only: around 7 s, never past 10 s). Also cleans up a rush full of restarts. Trigger on: monte cette vidéo, edit this short, montage, add headlines, add sound effects, radio effect on the hook, cut the dead air, the sound is too quiet."
argument-hint: Path to the source video, plus anything you want in it, e.g. "~/Downloads/take.mp4, show my product when I explain how it works"
---

# Short editor: one raw take, one finished short

Read `plugins/video/skills/short-editor/SKILL.md` from this folder and follow it. Relative paths
in that file resolve from the skill directory `plugins/video/skills/short-editor/`; commands in it
are written from the root of this folder. **§ The vertical language** is how a short looks: settled
rules, not suggestions.

User input: $ARGUMENTS

If no video path was given, ask for one (a path, or drag the file into the chat).

Pipeline summary:
1. **Preflight**: ffmpeg, ffprobe and python3 must exist; `scripts/bootstrap.mjs` provisions the rest, `scripts/fonts.mjs` fetches Sacramento, `init.sh` copies the SFX pack. Never ask the user to run an install.
2. **Scaffold**: `scripts/init.sh workspace/projects/<slug> <source> workspace/videos/<slug>.mp4`; plan.mjs and edl.mjs come in the vertical language. One edit, one project: a new working directory with a slug of its own for every edit, never another project's files.
3. **Ask first, one question**: the music from the shelf (`plugins/video/assets/music/`); the pace, measured against the published version when there is one; and the BONUS old-radio hook, every time (No · Radio voice + CRT TV · Radio voice only · Let me compare), never on by default.
4. **If it is a rush**: read `rush.md`: transcribe, pick breath groups with `rough-cut.mjs --bursts`, propose the keep list, `--adopt`.
5. **Transcribe** with `--lang`: verbatim, never translated. The app has prepared `.prep/take.md` and `.prep/sheet.jpg` (the take at a glance): read them first. Then `scripts/words.mjs`: every word's onset and end measured on the voice (`words-fixed.json`).
6. **Decide the pictures**: the words are the headlines anyway; propose the pictures in plain language BEFORE building. No lists, no invented numbers, never a capture over a screen already shown.
7. **Write `plan.mjs` + `edl.mjs`**: every time is a measured word onset (`words-fixed.json`); headlines laid out on the room the head leaves (`scripts/room.mjs --phrases`), on the under layer, gated by `scripts/occlusion.mjs`; plates in stop-motion; the flash on the change of shot; the sound is the short list, already in the templates; the bed from `scripts/bed.mjs` (`--map`, then `--track … --align`). A figure's options: `scripts/api.mjs <module>`, never its source.
8. **Preview** with `scripts/preview.mjs t … --width 1080 --sheet` (the composite with the matte, one sheet), `scripts/check.mjs` (every check before a render, only its problems), then `scripts/build.sh` once per version (a later build redoes only what changed).
9. **`scripts/verify.mjs`**: non-zero exit means do not ship. `scripts/measure.mjs`: every sound as heard against its aim. Deliver the file with the numbers.

Non-negotiables: the speaker's words on screen the whole short, verbatim (a word dropped for room is said); Impact + Sacramento; never a copy of a screen already shown; the sound is the short list, nothing else; the old-radio hook is asked, never applied by default, and short (around 7 s, never past 10 s); -14 LUFS / -1.0 dBTP via two-pass loudnorm, never a bare `volume=+NdB`; never rip audio; only real names, logos and numbers on screen; never regrade the footage; say what the edit cost.
