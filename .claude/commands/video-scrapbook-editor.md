---
description: "Edit a raw vertical (9:16) take into a short in the scrapbook style the user validated, reproduced exactly: every pause cut (jump cuts, the frame alternating wide and close on each), captions low and word by word with the word being said in yellow, the hook in the reference's two faces (white words, the key word in a beautiful serif in yellow, a line on paper) with die-cut stickers around the head, real reaction GIFs from GIPHY as big polaroids in the middle of the screen (always at the same place), the paper only for titles and a few key phrases: the reference's collage of little ruled notebook scraps written in a marker hand (Gochi Hand, flat, with real shadows) that lands, breathes and folds away, the red marker drawing on it as it is said, lists said in passing as stickers, sections on the same scraps swinging in, the real screens annotated in red, motion blur, Hip Hop 02 as the music bed (15 LU under the voice), a real paper sound on every paper and the Motionix pack, -14 LUFS, verified before delivery. Trigger on: scrapbook, memes on my video, GIFs, paper labels, collage, list video, top 5 tools, jump cuts, style TikTok éducatif, monte cette vidéo avec des mèmes."
argument-hint: Path to the source video, plus anything you want in it, e.g. "~/Downloads/take.mp4, my brand colour is #FF5A1F, show my repo github.com/me/tool"
---

# Scrapbook editor: one raw take, one finished short

Read `plugins/video/skills/scrapbook-editor/SKILL.md` from this folder and follow it. It runs on the
engine of the short editor (`plugins/video/skills/short-editor/scripts/`). Relative paths in that
file resolve from the skill directory `plugins/video/skills/scrapbook-editor/`; commands in it are
written from the root of this folder. **§ The scrapbook language** is how a short looks: measured
on a real edit, settled over six reviews and VALIDATED by the user (§ The user's decisions):
reproduce it exactly, never a variation the user did not ask for.

User input: $ARGUMENTS

If no video path was given, ask for one (a path, or drag the file into the chat).

Pipeline summary:
1. **Preflight**: ffmpeg, ffprobe and python3 must exist; the engine's `bootstrap.mjs` provisions the rest (through `scripts/py.sh`), `init.sh` fetches the three faces (Archivo, Fraunces, Gochi Hand) and the paper sounds (Mixkit, once per machine), copies the Motionix pack from the shelf and calibrates them on the voice. Never ask the user to run an install. Optional: swiftc (the face), GIPHY_API_KEY (the real GIFs of the validated style: free, an API key, not the SDK), GEMINI_API_KEY (illustrations), Chrome (captures of public pages).
2. **Scaffold**: `scripts/init.sh workspace/projects/<slug> <source> workspace/videos/<slug>.mp4`. One edit, one project.
3. **Ask first, one question**: the music (Hip Hop 02 by default, then Convergence, the shelf, none), the brand's colour (THE word in colour and the caption word being said; yellow by default) and the names to keep, the real material (screens, logos).
4. **Transcribe** with `--lang` (the engine's `transcribe.sh`): verbatim, never translated.
5. **Cut every pause**: `py.sh tighten.py` (measured on the envelope, written in whole frames into `source/tight.mov`, the project repointed), then `face.mjs`; a change of scene (a teaser shot) found where the frame's light jumps.
6. **Decide the pictures** by reading, at the reference's density (something new every 1-3 s); propose the list before building; get them with `gif.mjs sheet` → `gif.mjs get` (real GIFs by the meme's own name, picked on a contact sheet), `media.mjs`, `capture.mjs`, `picture.mjs`.
7. **Write `plan.mjs`**: every time a word onset, one move at a time (the one leaving gone before the next lands in its place), the camera from `punches()`; preview with the engine's `preview.mjs`, then each entrance frame by frame in a `build.sh --slice`.
8. **Render** with the engine's `build.sh`, `measure.mjs` (each sound as heard, in LU under the voice), the engine's `verify.mjs`: non-zero exit means do not ship. Deliver the file with the numbers and what the edit cost.

Non-negotiables: the validated look, reproduced (a variation only when the user asks); every pause cut and every join a jump cut (no flash or whoosh on it: the camera's alternation only); one move at a time; the speaker's words on screen the whole short, verbatim; real material for real things (a generated picture is never a product, a logo, a person or a number); a meme keeps its credit and never ships in a paid ad; the sound is the music bed, the paper and the packs (no bed only if asked); -14 LUFS / -1.0 dBTP via two-pass loudnorm; never rip audio; never regrade the footage; say what the edit cost.
