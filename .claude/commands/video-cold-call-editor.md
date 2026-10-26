---
description: "Edit a vertical (9:16) video whose sound is a recorded phone call (a cold call) over unrelated footage into a short in the Pipecorn call language: the call's most suspenseful line as a glitched hook, the call placed on a ringing paper sheet (stop-motion stickers, ringback tone), bam, then the conversation typed out as a record at the bottom (Geist Mono, the speaker's name in a column, word by word on the measured onsets) with the voice as one thin line of wave. Who speaks when is measured; -14 LUFS, verified before delivery. Trigger on: cold call, sales call, phone call recording, monte cet appel, appel à froid, transcription de l'appel."
argument-hint: Path to the video of the call, plus anything you want in it, e.g. "~/Downloads/call.mp4, the hook is when she asks where I got her number"
---

# Cold call editor: one recorded call, one finished short

Read `plugins/video/skills/cold-call-editor/SKILL.md` from this folder and follow it. It runs on
the engine of the short editor (`plugins/video/skills/short-editor/scripts/`). Relative paths in
that file resolve from the skill directory `plugins/video/skills/cold-call-editor/`; commands in
it are written from the root of this folder. **§ The call language** is how a short looks:
settled rules, not suggestions.

User input: $ARGUMENTS

If no video path was given, ask for one (a path, or drag the file into the chat).

Pipeline summary:
1. **Preflight**: ffmpeg, ffprobe and python3 must exist; the engine's `bootstrap.mjs` provisions the rest (through `scripts/py.sh`), `init.sh` fetches Sacramento and Geist Mono. Never ask the user to run an install.
2. **Scaffold**: `scripts/init.sh workspace/projects/<slug> <source> workspace/videos/<slug>.mp4`. One edit, one project.
3. **Ask first, one question**: the music from the shelf and the pace. No old-radio bonus in this style: the hook is the glitch.
4. **Transcribe** with `--lang` (the engine's `transcribe.sh`): verbatim, never translated.
5. **Who speaks when**: `diarize.py --auto`, read, then `--seed A:… --seed B:…` (A the caller); read the turns, fix in project.json `speakerFix`.
6. **Onsets**: `onsets.py`, `realign.py`, the words that matter read on `envelope.py`, pinned in `onsetFix`.
7. **The hook**: the most suspenseful line, its end measured (`envelope.py --end`), project.json `assembly`; `bursts.mjs`, `assemble.py`, `levels.py`, the engine's `matte.mjs --force`, `sounds.py --track`.
8. **The record**: `dialogue.mjs --draft`, read every turn, mend the punctuation, never rewrite.
9. **The picks** in plan.mjs, a preview, the engine's `build.sh`, `measure.mjs`, `verify.mjs`: non-zero exit means do not ship. Deliver the file with the numbers and what the edit cost.

Non-negotiables: who speaks is measured, then read, never guessed; the record is the call verbatim (only hesitations and false starts dropped, and counted); the other person stays PROSPECT (no name, company or number of theirs on screen); the hook's voice ends after its last syllable, measured; -14 LUFS / -1.0 dBTP via two-pass loudnorm; never rip audio; never regrade the footage; say what the edit cost.
