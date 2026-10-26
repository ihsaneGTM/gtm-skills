---
description: "Whiteboard, the Short video editor's first style: one raw vertical take of you talking to the camera in, one finished short out, in exactly the look of Long video to shorts: your face from the first frame, a visual hook, your words in Dynamic text, the pictures sliding out from behind you, white pages that draw the idea as a moving schema, one music 19 LU under the voice, -14 LUFS, the feed's safe zones, checked. The take keeps its own order (its retakes and dead air cut); heard on your Mac, no key needed. Trigger on: whiteboard, whiteboard style, the shorts' look on one take, white pages, monte cette vidéo en Whiteboard, le style des shorts sur ma prise."
argument-hint: Path to the take, plus anything you want in it, e.g. "~/Downloads/take.mp4, the pictures as cutaways, end on a card to my long video"
---

# Whiteboard: one take, in the look of Long video to shorts

Read `plugins/video/skills/whiteboard-editor/SKILL.md` from this folder and follow it. It runs on the code of Long video
to shorts (`plugins/video/skills/shorts/`: its look, its white pages, its scripts) and the vertical engine of the short
editor (`plugins/video/skills/short-editor/scripts/`). Paths in that file resolve from the root of this folder.

User input: $ARGUMENTS

If no video path was given, ask for one (a path, or drag the file into the chat). Ask once (AskUserQuestion) the music
from the shelf and the pace when the input does not say them; Behind you by default for the pictures.

Pipeline summary (SKILL.md § The run):
1. **The project**: `scripts/init.sh workspace/projects/<slug> <take> workspace/videos/<slug>.mp4`.
2. **The take, heard**: the shorts' `listen.mjs --lang` (Whisper on this Mac; the app's words of the take reused).
3. **The take in its order**: `shorts.json`, one short, the restarts dropped, never reordered.
4. **The cut**: the shorts' `cut.mjs --one --speed <pace>`: graded, joined, the project becomes the edit.
5. **The edit**: the face, the music (19 LU under), the matte, the pictures, the hook, the white page(s), `plan.mjs`,
   the preview sheet looked at.
6. **Render, check, deliver**: `build.sh`, `verify.mjs`, `measure.mjs`, `hear.mjs` on the file; credits; nothing published.

Non-negotiables: your face from the first frame; your real words in their order, never rewritten; the words on screen all
along; at least one white page; the feed's safe zones; one music; -14 LUFS; free commercial stock only, GIFs organic use
only; nothing published; never delete the user's files.
