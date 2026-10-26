# Landscape mode: the intro of a LONG video (short-editor)

All paths are relative to the root of the GTM by Pipecorn folder; `$S` means
`plugins/video/skills/short-editor/scripts` (SKILL.md).

The same pipeline cuts a 16:9 YouTube intro: the first minute of a face-cam video, before it
switches to the screen layout. Validated on a real French video, over five review rounds (the music,
the fonts, too many zooms, captions that read translated, the pace, one block early). What changes,
and only this:

- **`speed` in `project.json`** when the delivery is slow (1.2 on that video). `build.sh` prepends
  `setpts=PTS/S,fps=F` to the picture and extracts the voice through `atempo=S`, which preserves
  pitch, all inside the one encode. Everything downstream is an **output** time (`duration`,
  `editEnd`, the camera steps, the beats, the cues). Author the plan against `words.json` and divide
  once with a local `at = t => t / speed`. Two traps: `--slice A B` is output time, and a run-level
  `t` inside a title row is not touched by the `row()` helper: divide it by hand. At 1.2× also
  shorten the block animations (`enter 0.34`, `exit 0.28`).
- **`project.json`**: `width 2560 · height 1440 · fps 30`, a 1440p master (`init.sh` caps at 1080
  wide: set it by hand), so YouTube serves VP9. Sizes are written at 1080p and scaled
  (`K = width/1920`). **`editEnd`** = the cut: the camera and overlay run up to it and the rest passes
  through in the same encode. `blurBand 0`, `anchorX/anchorY` on the **face**, `subsY` scaled.
- **Encode at the master's quality** (`build.sh` does: the Mac's media engine at q 87, measured at
  least x264 medium CRF 14; x264 CRF 14 on a Mac without it) and **cut review excerpts with `-c copy`**: a
  second-generation excerpt at CRF 23 once looked like jagged glyphs (`pitfalls.md` has the SSIM
  numbers). Iterate on a 64 s project and render the full file once the cut is validated.
- **Find the cut by measurement**: `select='gt(scene,0.25)'` to locate it, then per-frame
  `signalstats` YAVG to pin the frame. **Transcribe only the edited stretch** (`--source` on a wav of
  the first ~80 s), then `build_subs.mjs --until <editEnd>`.
- **The figures are `title()` and `stamp()`** (`titles.mjs`): a stacked lockup of three to five SHORT
  lines, Satoshi Black for the sans, a serif accent (`serif` in project.json, `SERIF_FACE` to compare;
  `ttc-face.py` splits a macOS font collection into `assets/fonts/`), the payoff word in yellow,
  placed left or right of the head (x 0.055 / 0.945, y ≈ 0.12-0.15), never over it; on the UNDER
  layer once there is a matte, so the block's dim and shadow go behind the speaker. Faces are
  registered **from their files** (`scene.mjs` `FACE`): a family name alone silently falls back.
  Report the width cost of every serif candidate, rendered on the same frame of the real film.
- **Calibrate big, then let `fit.mjs` say no**: small lines 70-92 px, serif 100-130, the yellow word
  150-230 (1080p), one or two words a line; `fit.mjs` checks every row against the speaker's
  silhouette at peak zoom, and `silhouette.mjs --write` calibrates that silhouette on the real
  matte. The fix is a smaller size or a higher block, never a guess.
- **Check every onset against the AUDIO ENVELOPE** (`words-fixed.json` has them measured;
  `onset.mjs` checks the plan, `--hot` for yellow words): whisper
  once put a word 0.4 s early and the reviewer saw it in one pass. 40 ms early is invisible, 120 ms
  late reads as lag, and early is what the eye catches. Check the speaker's position over the whole
  block window, not one frame.
- **The on-screen language is the user's call**, not the audio's. For English text over French
  speech, write each caption as a natural phrase of the target language (3-6 words) **anchored on
  the onset of the source word where it starts being said**; translating the source's word chunks
  one by one reads translated. Caption style `yt`: Satoshi Black 66 px, one wide soft shadow.
- **The camera**: a punch on the yellow word of the FIVE beats that carry the argument, nothing
  else (WIDE 1.00, TIGHT 1.20, PEAK 1.24, IN 0.09 s, OUT 0.12 s when the block leaves); one block on
  screen at a time, alternating sides; the constant-zoom LATERAL SLIDE (only the anchor travels,
  0.34 s) is a figure of its own and was asked for more. What was rejected three times is movement
  on the ZOOM axis, not movement. Camera moves are silent.
- **Other figures**: `count` on a run (a number that climbs, constant character count, ticks on the
  same easing inverted); `screen()` behind the speaker with a recording (`loadClip`), cropped for
  legibility; `hero()`, one enormous glyph rising from behind them; `chips()`, the real logos
  (`plugins/video/assets/logos/`, a normalised set) coming out from behind them, one per thing said,
  no labels, no grid; the scroll HEARD (`scroll:profile.json`, one click per row crossing the edge);
  `voiceChain` in project.json for the room in the voice (measure it first; harder is worse).
- **Music and effects**: the shelf first (`plugins/video/assets/music/`, `.../sfx/`, each with its
  measured loudness and transient `align`); `music.mjs` synthesises beds when nothing fits; **one
  library sound per beat**; a sample's file is often longer than its sound. `audition.mjs --out
  <dir>` renders every sound for a listening board.
