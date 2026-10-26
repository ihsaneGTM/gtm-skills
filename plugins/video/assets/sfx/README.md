# The effect shelf

Three sounds supplied on 2026-09-04, kept here so a later video does not have to re-find them,
and, more to the point, so the **measurements** below are not lost. They look like library assets
(BOOM Library, Adam Pietruszko, a film-burn transition).

**The three files are committed**: their licence was attested when they were added (2026-09-04).
Check it yourself before publishing. The table below is the part that cost the work: the role, the
file length, where the audio actually ends, and the transient offset.

Prepare each one into a project's `assets/` as 48 kHz 16-bit PCM (the `.aac` files must be decoded,
`sfx.mjs` reads WAV only):

```sh
ffmpeg -y -i "assets/sfx/<file>" -ar 48000 -ac 2 -c:a pcm_s16le assets/<short>.wav
```

| file | project name | role in the cut | file length | **audio ends** | **transient (`align`)** |
|---|---|---|---|---|---|
| `BOOM Library - Transitions - Impact Metallic Thundering Title.aac` | `hit.wav` | the payoff word (NOTHING, ZERO) | 3.20 s | — | **0.30 s** |
| `Adam Pietruszko  - Extreme Impulse - Gritty Cymbal Riser.aac` | `riser.wav` | tension into a payoff | 4.693 s | **3.99 s** | **3.92 s** (its own end) |
| `Film Burn Transition 2.wav` | `burn.wav` | the cut out of the intro; sliced `0.55:1.7` when a block leaves | 4.455 s | — | **1.00 s** |

Two things that are easy to get wrong and were:

- **`align` is not optional.** Each of these has pre-roll, so placed on its first sample it lands
  late by 0.3–3.9 s. `sfx.mjs` shifts a cue back by `align`.
- **The riser's file is 0.7 s longer than its sound.** "Keep the last two seconds" is `1.99:2.70`:
  from 1.99 s, running to the file end so the slice's own fade-out falls in the trailing
  silence instead of on the crash.

**Three files do not cover five roles.** A block arriving (11 times in the intro) and a yellow word
landing (10 times) stay synthesised: a 4.5 s film burn eleven times is a wash, not an edit. To
replace those too, the shelf is missing **a short whoosh of 0.3–0.5 s** and **a brief impact with
low end**.

## The Top 5 pack: the vertical short's sound design (2026-09-29)

Five sounds from a creator's free "Top 5 SFX" mini pack, supplied on 2026-09-29 with the short
video that says how to use them. Its rules, transcribed (`--lang en`): *"use the click for when
things pop up on the screen · the flash for quick cuts · the whoosh when you want to transition from
scene to scene · the glitch whenever you want text to pop up · the riser when you want to build
tension"*. The reviewer asked for them on the GTM OS short (the camera flash on the change of shot,
the whoosh to bring in the paper page because it is a transition, the clicks for elements that
appear) and, after hearing the result, for the skill to use them by default.

**Licence: not stated by the pack's author** (a free giveaway to creators, for their edits). Use
them in your own videos; do not redistribute the files on their own.

`top5/` holds them **already prepared**: 48 kHz, 16-bit, stereo, 4 dB below the originals (the
originals were an MP3 in a `.wav`, 44.1 kHz float, 96 kHz 24-bit: `sfx.mjs` reads 16-bit PCM only,
and resampling a file that peaks at −0.1 dBFS makes inter-sample overs that 16 bits would clip).
`init.sh` copies them into every new project as `assets/sfx-top5/`, so a cue reads
`sample:sfx-top5/<file>`. Converted with ffmpeg's own resampler (`aresample=48000:filter_size=64:
phase_shift=10:cutoff=0.97`; this ffmpeg has no soxr).

| file | role (the pack's rule) | where it went on the GTM OS short | **`align`** (transient in the file) | cue gain | as heard (subtraction) |
|---|---|---|---|---|---|
| `camera-flash.wav` | a hard CUT | the speaker's cut laptop → seated, with the picture's `flash()` | **0.255 s** | −7 | 9 LU under the programme |
| `click.wav` | what APPEARS | each sticker landing on the paper (`stickers({ land })`); on v5 also each logo clearing the speaker's head, +0.15 s after its birth (the orbit, refused since) | **0.005 s** (a second click 55 ms later, down/up) | −11 | 12–16 LU under |
| `whoosh.wav` | a scene TRANSITION | the paper plate arriving: its crest when the sheet covers the frame (+0.01 s after the plate's `at`) | **0.94 s** (the crest; it builds from 0.40) | −9.5 | 9 LU under |
| `glitch.wav` | TEXT popping up | ONE word: "OS.", the first yellow word of the hook | **0.15 s** (a blip at 0.00 announces it) | −17 | 13 LU under |
| `riser.wav` | TENSION | "and that's…" while the logos panic, ENDING on "A LOT": its dead stop is the accent | **1.765 s** (its end; the file runs to 2.79 s) | −14 | 10 LU under at its top |

The gains are on top of project.json `sfxMasterDb` −15, measured on that cut by subtraction
(`NO_CUES=<regex>` in the edl template renders the mix without them; audio-spec.md). **Re-measure
on a new cut**: the bed and the voice move them.

Two things the files do that you cannot see:
- **The riser is wider than it is deep**: its side channel carries twice its mid (S/M 1.96) and it
  loses **7 dB more than a normal sound in a mono fold-down** (the click and the glitch 3 dB, the
  flash none). On a phone held vertically it is quieter than on headphones; nothing to fix, but
  do not push it up to compensate on headphones.
- **The click is a double click** (0.005 and 0.060 s). Four stickers landing a pose apart
  (125 ms) make eight transients: that is the stop-motion rattle the reviewer kept.

## The Motionix pack: the light sounds of what appears (2026-10-05)

A folder of 77 files, "Sound Effects By Motionix", supplied on 2026-10-05 with the review of the
explainer's second version ("a new pack that will let you add many more very light little sounds
for the elements appearing"), and asked for in the GTM OS references. Ten families as delivered:
pops, clicks, camera shutters, UI sounds, whooshes, risers, gears, money, data, typing.

**Licence: not stated in the pack** (a free creator pack; two files carry Pixabay's naming,
`epic-fast-whoosh-345469` and `mouse-click-198485`, whose licence allows them in your videos but
not their redistribution as files on their own). Check it before publishing the app with it.

`motionix/` holds them **prepared** (`motionix/prepare.py "<the pack folder>" <out>` redoes it):

- decoded and resampled to 48 kHz with ffmpeg's own resampler (`aresample=48000:filter_size=64:
  phase_shift=10:cutoff=0.97`, as the Top 5), 16-bit with a TPDF dither; mono when the file is
  (side under 3 % of mid), stereo otherwise;
- **trimmed to their sound** (from 12 ms before the onset to where it falls 52 dB under its
  loudest; a whoosh or a riser 45 dB, and a whoosh never longer than 1.8 s after its crest);
- **split when one file holds several**: Normal Pop → `normal-pop-1…5`, Premium And Smooth Pop →
  `premium-pop-1…4`, the mouse clicks → `mouse-click-1…3` (the first three, single clicks; the
  rest are runs), Cinematic Long Whoosh → `cinematic-long-whoosh-1…2`;
- **normalised to the same short-term loudness**: −20 LUFS momentary (K-weighted, 400 ms) at
  their loudest, under a −1 dBFS peak ceiling (a few very short clicks stop at the ceiling first:
  `kit.json` `lm` says where each one landed);
- left out: `Ui All In One.wma` (a reel of the UI sounds), `project 1.xml` (an Alight Motion
  project), and two exact duplicates (`Clicks/Click_2` = `Camera Shutter`, `Smooth Like A Butter
  Whoosh` = `Slow And Smooth Whoosh`).

84 sounds, 18 MB. **`kit.json`** gives each one its `role` (the family), `from` (the original
file), `dur`, **`align`** (where it lands: a whoosh or a riser on its crest, a texture on its
onset, the rest on the first transient within 6 dB of the loudest), `lm`, `peak` and `ch`. The
explainer's `init.sh` copies the folder into a project as `assets/sfx-motionix/`; a cue reads
`sample:sfx-motionix/<file>`, `sample:sfx-motionix/ui-typing.wav:0:<seconds>` for a slice.

How the explainer uses them (`stage.mjs` MX: a role per kind of appearance, its files taken in
turn so a run never repeats one, the gain corrected by `−20 − lm`), measured as heard on the
worked example (sfxMasterDb −5.2 from a −20.5 LUFS voice; programme median −15.0 LUFS; at these
levels a sound is heard about `1.5 − gain` LU under the median):

| role | files | what makes it | gain | as heard |
|---|---|---|---|---|
| pop | `normal-pop-1…5` | a pill, a logo, a tile, a sign popping in | −14.5 | 15–17 LU under |
| popSmall | `smooth-pop`, `sweet-ui-open` | a bare pictogram, a verdict on a bar | −15.5 | |
| swish | `epic-fast-whoosh`, `cinematic-fast-normal-whoosh`, `high-fast-whoosh`, `smooth-fast-whoosh` | what flies or rises in; a screen sliding into a phone | −15 | 16–17 |
| swishBig | `deep-short-whoosh`, `cinematic-fast-whoosh` | a phone rising from far below | −13.5 | |
| tick | `ui-digital-click-4`, `ui-key`, `high-click` | each bar of a list landing, a card of a grid, words appearing | −20 | 16–21 |
| select | `ui-select`, `ui-select-2`, `ui-glitch-click` | a blurred label said (a list, a tree), a page lit | −15 | 16 |
| confirm · deny | `ui-enter` · `ui-backspace` | a check · a cross popping on a bar; a prompt sent | −14.5 · −15 | 16 |
| thump | `thump-click` | a bar lit on its own, a trophy landing | −15.5 | 17 |
| stretch | `ui-stretch`, `ui-digital-click` | a line drawn: a wire, an arrow, a circle, an underline | −16.5 | 17–18 |
| flicker | `ui-glitch-flicker` | the flicker of light at the end of a title | −17.5 | 19–20 |
| ping | `ui-digital-click-1` | a logo lit with rings | −15.5 | 17 |
| shutter | `smooth-camera-shutter`, `camera-shutter`, `hard-camera-shutter` | a frame of the take appearing or lit (a burst of four: 14) | −18 | 14 |
| data | `data-collect` | a grid of providers scanned | −15.5 | 17 |
| typing | `ui-typing` (a slice as long as the typing) | a prompt typed | −16 | 19 |
| gear · money | `speed-gear`, `middle-gear` · `cinematic-money-2` | a counter climbing · landing on a price | −15 · −14 | |

The big moves keep the Top 5 (whoosh, flash, glitch, riser: 9–11 LU under). A light sound within
0.15 s of one of them, or 70 ms of another light one, is dropped: the bigger one carries it.
Not used yet: the risers (the Top 5's is kept), the long whooshes, `stopwatch`, `fast-gear*`,
`ui-premium-open`, `ui-open`, the money files but one.
