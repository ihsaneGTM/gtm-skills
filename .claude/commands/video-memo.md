---
description: "Turn a voice memo into shorts you can record: the memo transcribed (any language), the several videos it holds cut apart, three versions of each in the language of your videos, each read aloud (ElevenLabs), two or three feedbacks at most, the lead magnet checked in every version. Trigger on: mémo vocal, vocal, voice memo, transforme mon vocal en vidéos, fais-moi les scripts de ce vocal, plusieurs vidéos dans ce vocal, turn my voice note into shorts."
argument-hint: Path to the voice memo, or the slug of a memo of workspace/memos/, e.g. "~/Downloads/Nouvel enregistrement 28.m4a"
---

# Voice memo → shorts

Read `plugins/video/skills/memo/SKILL.md` from this folder and follow it. Relative paths in that
file resolve from the skill directory `plugins/video/skills/memo/`; commands in it are written
from the root of this folder.

User input: $ARGUMENTS

If no memo was given, list the memos waiting (`ls workspace/memos/`) and ask which one, or for a
path (drag the file into the chat).

Pipeline summary:
1. **The memo**: `workspace/memos/<slug>/source/<the recording>`, then `scripts/prepare.mjs` (every word, the sentences).
2. **Profile and pace**: `scripts/memo.mjs profile`.
3. **Read it all**: `scripts/memo.mjs read`; the shorts inside it (`references/split.md`).
4. **Write**: three versions of each (`references/versions.md`), two or three feedbacks (`references/feedback.md`, `scripts/memo.mjs past`), `memo.json`.
5. **Check**: `scripts/memo.mjs check` until it passes; then `scripts/voice.mjs` reads every version aloud.
