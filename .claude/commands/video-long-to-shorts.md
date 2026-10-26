---
description: "Long video to shorts: your long video (filmed talking to the camera, 16:9 or vertical, derushed or not; the same file the YouTube video editor edits, at the same time if you like) in, several vertical shorts out. Its key moments found and put in a new order (the strongest line first as the hook), each subject in about 30 s, 1 min and 1 min 30, the retakes and dead air cut, your real voice (heard on your Mac, no key), and your cloned voice (an ElevenLabs key) only for a line the take does not have. Dynamic text from your first frame, the pictures behind you (or pinned over the frame, or as cutaways), white pages that draw the idea, an end card to the long video on YouTube if you want one; one music, -14 LUFS, checked. Trigger on: long video to shorts, make shorts from my video, cut my long video into shorts, clips from my YouTube video, find the best moments, repurpose my video, fais des shorts de ma vidéo, découpe ma vidéo longue en shorts, les meilleurs moments, des reels à partir de ma vidéo YouTube."
argument-hint: Your long video (a path), how many shorts and the style if you know them, e.g. "~/Movies/my-youtube-video.mp4, 3 shorts"
---

# Long video to shorts

Read `plugins/video/skills/shorts/SKILL.md` from this folder and follow it; then `references/look.md` of that skill.
Relative paths in that file resolve from the root of this folder.

User input: $ARGUMENTS

If the input is `run workspace/projects/<slug>`, the app started this run: its `run.json` has the take, the count, the
style, the language and the notes; do the steps in order, keep `progress.json` up to date, and decide by the skill's
rules without asking (nobody can answer live): a line you would need the user to confirm is left out and said in your
final message. Otherwise, if no long video was given, ask for it; ask once (AskUserQuestion) the count, the style and
the end card to the long video when the input does not say them (Behind you by default).

Pipeline summary (SKILL.md § The run):
1. **The folder**: `scripts/new.mjs workspace/projects/<slug> --video <take> --count <n> [--style prints|behind|cuts]`.
2. **The take, heard**: `scripts/listen.mjs` (Whisper on this Mac, no key; a transcript of the same file is reused: the
   YouTube editor's).
3. **The moments**: read `take/moments.md`, write `shorts.json` (hook first, the blocks, voice lines only where the
   take has none, never a fact the user did not say; none without an ElevenLabs key and a clone).
4. **The cut**: `scripts/cut.mjs` (graded, reframed on the face, the voice lines said once), each short an edit in `shorts/<n>/`.
5. **Each edit**: the face, the music, the pictures, the white pages, `plan.mjs`, the preview sheet looked at.
6. **Render, check, deliver**: `build.sh`, `verify.mjs`, `measure.mjs`, `hear.mjs` on the file; the end card if asked;
   `scripts/deliver.mjs`; `publication.md`.

Non-negotiables: the user's real words, reorganised, never rewritten; a voice line only where needed, in their words;
your face from the first frame; the feed's safe zones; one music; -14 LUFS; free commercial stock only, GIFs organic use
only; the channel on the end card is Your brand's; nothing published; never delete the user's files.
