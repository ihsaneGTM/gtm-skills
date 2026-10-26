# Motion language

How a vertical short moves. Every number below was measured on a real cut and held up in
review. Treat them as defaults you change only with a reason.

> **Since 2026-09-29 a vertical short is cut in THE VERTICAL LANGUAGE** (short-editor `SKILL.md`,
> § The vertical language, the reviewer's verdicts). Where it differs from the sections below, it wins:
> - **The frame**: the speaker's words are headlines at the TOP, on the under layer, passing behind
>   the speaker's head. There is no protected speaker zone and **no bottom caption line** (the
>   reviewer found bottom subtitles too timid); on a paper plate, discreet Impact subtitles above
>   the illustration.
> - **No progressive blur**: `blurBand: 0`, and `shade()` darkens the top of the room behind
>   the speaker instead.
> - **The camera**: an opening de-zoom 1.30 → 1.00 in 0.62 s (with its whoosh), then a punch
>   only on a word that carries the argument (1.12–1.14 in ~0.1 s), released on the next phrase,
>   not a running list of levels, one per sentence; `anchorY` on the speaker's eyes (≈ 0.27).
> - **Stop-motion on paper**: what is ON a plate moves at 8 poses a second.
>
> The rest of this file is the language of the first cuts (the subtitle layout, 2026-09-03) and
> the landscape intro. It stays true for them, and for the engine lessons it records.

## The frame

1080 x 1920, 60 fps. Three horizontal zones:

| Zone | Rows | What lives there |
|---|---|---|
| Graphics band | 0 to 700 | every overlay; this band gets the progressive blur |
| The speaker | 700 to 1400 | never covered |
| Captions | about 1500 | subtitles, above the platform's own UI |

The band is 700 px because the speaker's head top sat around 31 % of the frame height and the band
has to clear it at **maximum zoom**, not at rest. Re-measure on every new framing: find the head
top at peak zoom, then set `blurBand` in `project.json`.

## The camera

A running list of zoom levels, the way an editor cuts between a wide and a tight framing.
`cameraSteps()` in `edl.mjs` returns `[time, zoom, ramp_seconds]` steps; `zexpr.mjs` turns them
into the ffmpeg expression.

- **About one move per sentence**, one extra on a punchline. A reference cut had 42 steps over 131 s.
- **Amplitude 1.03 to 1.16.** Past 1.16 a move reads as a mistake rather than as energy.
- **Ramps 0.12 to 0.50 s.** Short ramps read as a snap, which is the point. Ramps are linear.
- **Anchor near the top of the head** (`anchorY: 0.34`), not the frame centre. A centre anchor
  pushes the head up into the graphics band as the zoom tightens. On the reference framing the head
  top stayed at 586 to 590 px at peak zoom, with the graphics ending at 562.
- `anchorX` defaults to 0.42. A step may carry a 4th value, an anchor x for that step, and the frame
  then drifts by `(zoom - 1) * (0.5 - ax)`. It ramps with the zoom and never jumps.
- Camera moves are silent. A sound cue belongs to a graphic event, never to the camera.

Implemented with `zoompan`, never `crop` (see pitfalls, Tooling).

## Progressive blur, never a plate

A graphic needs separation from a bright background. A black plate behind it reads as a slide and
was rejected every time. The house answer, built in `build.sh`:

1. crop the top band, `gblur sigma=17`, then `eq brightness=-0.07:saturation=0.92`
2. alphamerge with a mask that is a **vertical gradient** (full at the top, gone by the band's
   bottom) **times a time gate**
3. overlay it back

The gradient is what makes it read as depth instead of a rectangle. The 7 % dim stops a white
overlay from vanishing into a bright wall.

**One blur window per beat.** A single wide window over the whole intro blurs the frame where
nothing is drawn, and reviewers notice. `BLUR_WINDOWS` in `edl.mjs` lists `[start, end]` pairs;
`gate.mjs` builds the ffmpeg gate from that list (0.35 s fade in, 0.45 s fade out), so the filter and
the beats cannot drift apart. `verify.mjs` **fails** the build on a window with no graphic in it and
warns on a floating beat with no window behind it.

Thin strokes still need help. Give them a dark underlay stroke 3.5 px wider (`branch()` does this),
not a ground.

## Timing

- Every cue is a **word onset** from `words.json`. Never a round number picked by feel.
- A graphic lands **on** the word, not after it. 40 ms early is invisible; 120 ms late reads as
  lag. Transcripts misdate word starts by up to half a second around pauses, so for a beat that
  must land on one word, check the onset against the audio envelope (see pitfalls, Transcription).
- Entrances use `spring()` (one overshoot, then settle) over 0.5 to 0.7 s. Exits use
  `easeInOutCubic` over 0.4 to 0.5 s. Exits are faster because nobody watches a graphic leave.
- Sequenced elements sit 0.16 s apart. Below 0.10 they read as simultaneous; above 0.25 the
  sequence drags.

The easing helpers (`spring`, `easeOutCubic`, `easeInOutCubic`, `easeOutQuint`, `easeOutBack`,
`easeOutExpo`, `seg`, `lerp`, `clamp01`) are exported by `scene.mjs`. Use them rather than writing
new curves, so every beat moves with the same physics.

## Between beats

A leaving beat and the next one overlap by nothing. The blur window closes, the next one opens. If
you build a transition that morphs one graphic into another, keep the two rectangles similar (one
is the other at a uniform scale) so the move is a rectangle interpolation and nothing re-lays out
mid-travel.

## What earns a graphic

- **One graphic per 15 to 25 s** of talking head. Denser than that and it stops being editing. A
  first cut with eight beats lost three in review.
- **No bullet lists, ever.** A list on screen is a slide. Use a figure from the catalog, or draw
  nothing and let the captions carry the sentence.
- A graphic that only restates the sentence is worse than nothing. The captions already did it.
- **Every number on screen is a claim.** It is real and supplied by the user, or the beat does not
  ship. A placeholder number is not a placeholder to the viewer.
- When the speaker names their own product, show the real one (a screenshot they supply), never a
  drawn impression of it. See `brand-kit.md`.
- A stretch with no graphic is allowed. Say in the delivery message that it is deliberate.

## Captions

Subtitles on every vertical short: most feeds autoplay muted, so the captions carry the opening.
`SUB_STYLE` in `edl.mjs` picks the style from `subs.mjs`:

| Style | Look | Use |
|---|---|---|
| `clean` | white, weight 800, 66 px, yellow hot word, 9 px black outline | the default; won every review |
| `karaoke` | word-by-word yellow box | exists, rejected as noisy on a talking head |
| `hero` | the phrase fills the lower area in 2 to 3 lines, hot words at 2x, each word pops on its onset, glow | a design choice for a caption-led edit |
| `yt-outline` | display sans, outline plus one wide soft shadow | for a bright caption band (white shirt, bright wall) when a display face is installed |

Geometry for a vertical short is centred at x 540, baseline 1500, max width 950 px. A long chunk
shrinks to fit rather than running off frame. Hot words come from `subs.config.json` (`hot`), and
ASR corrections are word patterns in the same file (see pitfalls).

The captions are the speaker's own words in the language they speak, built from `words.json`.
Never translate them and never paraphrase them.
