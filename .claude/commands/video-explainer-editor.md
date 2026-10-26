---
description: "Edit a vertical (9:16) take of someone talking to the camera into a short in the Pipecorn explainer language, with the motion of an After Effects edit: the speaker in a frame with round corners at the bottom of a dark stage lit like a set (a light on each scene, a vignette, dust floating, a grid of dots), their head rising out of it (person matte); above them, scenes joined by camera moves (whip pans, rises, push-throughs) with real motion blur, every figure with its shadow and its glow, a new figure every second or so on the word that names it (a title in Inter with one Instrument Serif italic accent, numbered bars with a red edge, pills, trees, logos, the speaker's own frames, an equation, a VS); their words one at a time; full-screen breathers on a camera flash; the base skills' sound kit on the big moves and a light sound of the Motionix pack on everything that appears, measured as heard; -14 LUFS, verified before delivery. Any take: a close one gets a narrower frame, a take of several shots is framed shot by shot; a dark (the reference) or LIGHT theme (`--theme light`, or \"light\" in the request). Trigger on: explainer, split screen, breakdown, guide, tutorial short, motion design, light mode, moi en bas et les animations en haut, montage explicatif, version claire."
argument-hint: Path to the take, plus anything you want in it, e.g. "~/Downloads/take.mp4, the five steps as a list, my logo when I name the product"
---

# Explainer editor: one take, explained on a stage above you

Read `plugins/video/skills/explainer-editor/SKILL.md` from this folder and follow it. It runs on
the engine of the short editor (`plugins/video/skills/short-editor/scripts/`). Relative paths in
that file resolve from the skill directory `plugins/video/skills/explainer-editor/`; commands in it
are written from the root of this folder. **§ The explainer language** is how a short looks:
settled rules, measured on the reference, not suggestions.

User input: $ARGUMENTS

If no video path was given, ask for one (a path, or drag the file into the chat).

Pipeline summary:
1. **Preflight**: ffmpeg, ffprobe and python3 must exist; the engine's `bootstrap.mjs` provisions the rest, `init.sh` fetches Inter and Instrument Serif. Never ask the user to run an install.
2. **Scaffold**: `scripts/init.sh workspace/projects/<slug> <source> workspace/videos/<slug>.mp4 [--theme light]`. One edit, one project.
3. **Ask first, one question**: the theme (dark or light), the music from the shelf, the pace, and the pictures the user can give (screenshots, logos, real numbers). No old-radio bonus in this style.
4. **Transcribe** with `--lang` (the engine's `transcribe.sh`): verbatim, never translated.
5. **The frame**: the engine's `matte.mjs`, then `scripts/layout.mjs --measure --write` (shot by shot: the head at the reference's size, rising 88 px out of the frame, the caption above it).
6. **The storyboard**: scenes of 4-8 s joined by camera moves (`S.scene`: whip, rise, push), a scene arriving composed, something new on the stage every second or so, each figure on its word; 2 to 6 s breathers full screen, never in the first 15 s; real material only. Propose it before building in a conversation.
7. **plan.mjs** with the figures of `scripts/stage.mjs` (every figure makes its own sound); frames of the take with `scripts/stills.mjs`; the bed with `scripts/bed.mjs` (its drop on the breather that lands the point).
8. **Look in motion, render, measure, verify**: the engine's `preview.mjs` and `build.sh --slice` on every camera move, then `build.sh`, `scripts/measure.mjs` (the house sounds 9-11 LU under the programme, the light ones 15-20, the bed about 16 LU under the voice), `verify.mjs`: non-zero exit means do not ship. Deliver the file with the numbers and what the edit cost.

Non-negotiables: the words on screen for the whole short, verbatim, one at a time; motion always (never a still stage for more than 2 s); light and shade always (every figure its shadow and its glow, never a flat black stage); real names, screens and numbers only; nothing over the speaker's face; the breathers are hard cuts; -14 LUFS / -1.0 dBTP via two-pass loudnorm; never rip audio; never regrade the footage; say what the edit cost.
