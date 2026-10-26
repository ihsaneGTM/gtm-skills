# The Pipecorn generic: a bonus of every style

About six seconds added at the very end of a finished short, in any style (1 Dynamic text, 2 Cold
call, 3 Scrapbook, 4 Split explainer): Pipecorn, its values, Pipecorn again. Nico asked for it as
"a reminder of our value" that changes from video to video. Ihsane validated it on 2026-10-05,
after three refused versions:
- a dark stage was too far from the style it ended;
- a static "everything on one page" layout was not dynamic;
- a version with numbers first did not say what they measured.

The script is `plugins/video/skills/short-editor/scripts/generic.mjs` (the engine's), with
`generic/sting.mjs` (the picture and its sounds) and `generic/values.json` (the values). The
assets are in `plugins/video/assets/brand/pipecorn/` (the wordmark, the Outfit font) and
`plugins/video/assets/sfx/` (Motionix, the house whoosh).

## What it is (validated: do not re-open)

1. **Pipecorn first**, so the viewer knows the video is over:
   - the sparkle flies in over the video's last 0.4 s;
   - it bursts into Pipecorn yellow (#FFD90D) on the video's last frame;
   - the real wordmark is revealed.
2. **One slot, words replacing words**, on the same screen:
   - Pipecorn is replaced by the first value's words, those by the next value's, and so on;
   - each change is a roll: what is in the slot leaves upwards letter by letter, and the next one
     rises into it from below, clipped to a window, so the two are never in the same place;
   - each value holds for 1.3 s.
3. **The words before the number.** The number comes 0.5 s after its words, in a black pill under
   the window. The pill stays from the first value to the last: its number rolls in the same way
   and its width follows. Never a number alone, and never a count-up.
4. **Pipecorn again** at the end: it rolls back into the slot with a sheen and its little sparkle.
5. **Inside the feed's safe zones** (`safe-zones.md`): the slot sits at y 0.385, so its words end
   above y 0.425, where the feed's buttons start on the right; the wordmark is 720 px wide.
6. **The explainer's light** on the yellow:
   - brown shadows in two layers, motion blur like a camera shutter, springs and expo curves;
   - Outfit, the face of pipecorn.com;
   - never a script face.
7. **No music under it**: the effects only.
   - The video's own sound stops like a tape over its last 0.4 s (the "relance").
   - Then the Motionix pack: a whoosh on the burst, a swish on each roll, a pop when the pill
     arrives, a stretch when its number rolls, a tick when the words settle, a thump when Pipecorn
     comes back.
   - These sounds are set to −24.5 LUFS integrated, the level validated in a −14 LUFS short. The
     short's own loudness is untouched.

## The values

`node $E/generic.mjs --list` prints them. Pick 1 to 4, in order, by id:

| id | words | in the pill |
|---|---|---|
| `phone-coverage` (default) | Phone coverage | 95% |
| `connect-rate` (default) | Connect rate | ×3 |
| `pipeline` (default) | Pipeline | +50% |
| `sales-improving` | Sales improving our data | +2000 |
| `best-gtm-data` | The best GTM data | worldwide |

- **Values of your own** are passed as JSON:
  `GENERIC_VALUES='[{"label":"…","n":"…","glyph":"phone|users|chart|globe|bolt"}]'`.
- **Keep the words short**: one line, fitted to 920 px. Past about 20 characters the type gets
  small.
- **These are Pipecorn's claims.** Say once, at delivery, that a number has to be confirmed before
  publishing.

## When and how

- **It is a bonus.**
  - Ask it every time with the skill's first question: **No** · **Yes** (and which values).
  - Never turn it on by default.
  - In GTM by Pipecorn the brief answers it ("Pipecorn generic: …").
- **It runs last.**
  - Run it on the delivered file, after the skill's render and its `verify.mjs`: verify checks the
    edit against its own project, which does not know about the generic.
  - Run it from the project folder:

```bash
node $E/generic.mjs workspace/videos/<slug>.mp4 --values phone-coverage,connect-rate,pipeline
```

- **Files**
  - It works in place, and keeps the video without the generic in `tmp/without-generic.mp4`.
  - Run it again and it starts from that copy: generics are never stacked.
  - After another render of the edit, run it again: the new file has no generic.
- **What it prints**: the values, the new length, the whole file's loudness and true peak, the
  generic's loudness. It warns if the true peak gets worse than the video's own. Give those numbers
  at delivery.
- **Cost**: about 10 s of rendering, plus one re-encode of the short (x264 CRF 15, colour tags
  kept).
- **A comparison**, from the GTM by Pipecorn page:
  - render each option on a copy;
  - cut it as a short clip that starts 3 s before the end of the video and runs to the end of the
    generic;
  - put the clips in `variants/`.
