---
description: "Edit a horizontal YouTube video (16:9, often long) end to end, three ways: FACECAM (you filmed the whole video talking to the camera: your real voice all along, cut tight, illustrated in motion design with your dressed face shots in between), AI VOICE (no filming: the whole video in motion design, said by your voice clone or an ElevenLabs voice, from a script, an idea or an article), or HYBRID (you film the intro and a few cutbacks, your cloned voice says the rest). The style « Document »: real homepages and logos, LinkedIn-style cards of fictional people, editorial lines with a yellow marker, numbers that count, charts under their app icon, the yellow chapter pages, real stock shots in a frame and GIFs as pinned prints; one music; -14 LUFS; a 1080p draft and a 720p preview, the 4K when you ask. Trigger on: edit my YouTube video, YouTube video editor, horizontal video, long video, I filmed the whole video, facecam, no facecam, AI voice video, I only filmed the intro, use my cloned voice for the rest, voiceover video, monte ma vidéo YouTube, vidéo horizontale, j'ai filmé que l'intro, sans facecam, avec ma voix clonée."
argument-hint: Your filmed take (a path) or your script / idea / article, plus the way (facecam, ai, hybrid) if you know it, e.g. "~/Movies/take.mp4, facecam"
---

# YouTube video editor: Facecam + Motion design, Motion design + AI voice, or Facecam + Motion design + AI voice

(Their ids in run.json: `facecam`, `ai`, `hybrid`. Say them to the user by their names.)

Read `plugins/video/skills/voiceover-video/SKILL.md` from this folder and follow it. Relative paths in that file resolve
from the root of this folder. **§ The rules that do not move** are settled: apply them, never reopen them. Before a first
video, read `references/decisions.md` whole.

User input: $ARGUMENTS

If the input is `run workspace/projects/<slug>`, the app started this video: its `run.json` has the mode (`facecam`, `ai`,
`hybrid`), the take, the script, the voice choice, the language and the notes; do the steps of that mode in order, keep
`progress.json` up to date, and decide by the skill's rules without asking (nobody can answer live; the user talks to you
after, in the app): a fact you cannot know is left out and said in your final message, never invented. Otherwise, ask
for the mode once (AskUserQuestion) when it is not clear from the input, then for the take (facecam, hybrid) or the
script, idea or article (ai). If the input asks for the 4K of a video already made, do only § On request only: the 4K.

Pipeline summary (SKILL.md § The three modes says which steps each one takes):
1. **Preflight**: `node plugins/video/motion/bootstrap.mjs`; the ElevenLabs key must be set for ai and hybrid (the AI
   voice) only: facecam needs no key.
2. **The folder**: `scripts/new.mjs workspace/projects/<slug> --mode facecam|ai|hybrid [--video …]`.
3. **Facecam / hybrid: the take, the cut**: `take.mjs --lang en` (Whisper on this Mac, every word measured on the voice; Scribe only if asked); facecam: `facecam.mjs` (face shots and motion
   parts in your real voice, retakes and dead air cut out); hybrid: `cut.mjs --intro "#n" --cutback "#m"`.
4. **The clips**: the intro graded (`scripts/grade.mjs`), then `intro.mjs --speed 1.1` and `intro.mjs --cutback n`.
5. **The script** (ai, hybrid): the user's words, cleaned, or written from their idea or article, with them; never an
   invented fact.
6. **The voice** (ai, hybrid): the voice the user picked (`clone.mjs`: their clone, an ElevenLabs voice, or Ihsane's once
   shared); one take per part (`voice.mjs take`), `prep.mjs`; read what Scribe heard. Facecam: `prep.mjs` only.
7. **The material, the media, the scenarios**: homepages and logos, stock shots and GIFs (`media.mjs`), the stories timed
   on the words; stills looked at.
8. **Render, assemble, check**: `intro.mjs --render` (facecam, hybrid), `render.mjs --part n`, `assemble.mjs` (one music,
   -14 LUFS, the 720p preview), `verify.mjs`. Deliver the draft; the 4K only when the user says so.

Non-negotiables: the footage never through Chrome; one chart per metric; no stamps; no 3D dives; facts only what the voice
says, never an invented number; free commercial licences for the stock shots, GIFs organic use only; only the shelf's
sounds; one music; -14 LUFS; nothing published; never delete the user's files without asking.
