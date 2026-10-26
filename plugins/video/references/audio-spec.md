# Sound and loudness

## Effects are synthesised

`scripts/sfx.mjs` generates the whole effect bed from primitives: resonant-filtered noise sweeps
for whooshes, pitch-dropping sines for pops, a low sine plus a noise transient for impacts. It costs
nothing and it never puts a copyright claim on the user's video. There is no sample library in this
edition.

Cues live in `sfxCues()` in `edl.mjs`, as `{ t, kind, gain }` with an optional `align`. Gains are
**dB relative to the speaking voice**.

| kind | what it is for | typical gain |
|---|---|---|
| `swoosh_in` / `swoosh_out` | a graphic arriving / leaving (short, 0.34 s) | −16 … −22 |
| `whoosh_in` / `whoosh_out` | a whole section turning over (0.62 s) | −18 … −22 |
| `tap` | one element landing, no low end | −20 … −22 |
| `pop` | one element landing, with body | −14 … −18 |
| `tick0…3` | a counter stepping, four pitches | −17 … −22 |
| `blip` | a badge, a data point | −17 … −24 |
| `type` | one keystroke | −16 … −20 |
| `chime` | something completed | −21 |
| `impact_soft` | a card landing | −14 … −19 |
| `impact_big` | the payoff | −13 |
| `riser` | 1.25 s of tension before an impact | −18 … −20 |
| `rattle` | a messy cluster; things going wrong | −16 |
| `buzz` | a short descending "wrong" | −21 |
| `air_in` | a block arriving as moving air — wide band, panned left → right (stereo) | −19 … −20 |
| `flick` | a card flicked onto the table: one transient and a breath of paper | −20 … −23 |
| `thump` | the yellow word as weight: a sub 95 → 42 Hz, a 180 Hz knock so a phone hears it | −13 … −15 |
| `shutter` | a camera shutter: two clicks 28 ms apart | −16 … −19 |
| `glass` | a bright metallic ping in a short room | −18 … −21 |
| `hit_tail` | the payoff as a cinematic hit with 1.4 s of room | −13 … −14 |
| `bass_drop` | a pitched drop 220 → 28 Hz with grit | −14 |
| `riser_tonal` | 1.5 s of tension WITH pitch (a chord climbing an octave), cut dead at the top | −20 |
| `rev_whoosh` | a section leaving as a reversed whoosh — swells, stops on the cut | −19 … −22 |
| `mallet:<Hz>` | a sticker landing in stop-motion: a muted marimba bar, pitched (hand.mjs `ARP`) | −24 |
| `ptick:<0-3>` | one pose of a stop-motion settle: a fingertip nudging a card, 7 ms | −20 (then −3 a pose) |
| `felt:<s>` | one stop-motion mark, as one glide: a soft brush swish (air rising and falling with the stroke, no grain), as long as the mark takes to draw, 7 dB under the felt tip it replaced | −19 |
| `sample:name.wav` | a file the **user** supplied, from `assets/` | as measured |
| `sample:name.wav:START:LEN` | a slice of one — faded in over 40 ms when START > 0, out over 180 ms | as measured |
| `scroll:profile.json` | a list scrolled fast: one click per row crossing the edge, at the rate MEASURED off the clip's own frames, over band-passed noise that follows the speed | −15 |

`scripts/audition.mjs --out <dir> [kinds…]` renders every sound to a WAV at the same peak so a
human can audition them: the reviewer asked to hear several options, and Claude cannot listen.
Offer the alternatives per ROLE (a block arriving · the yellow word · the payoff · the riser · a
block leaving), current design first, then let the user pick a set.

Everything is tuned for a **phone speaker**: the low end is doubled at 2-3× the fundamental so
the weight survives a device that cannot reproduce 80 Hz.

## A music bed: synthesised here, and say so

`scripts/music.mjs --style boombap|funk|pulse|synth --out assets/music.wav --end <cut>
[--bars N] [--drop B] [--break A B] [--fade 1.6]` writes a STEREO bed composed **in that file**,
note by note: no library, no download, no sample. That is the honest answer when the user asks
where the music comes from, and it is also the ceiling: a produced track will always sound like a
record next to it. Two synth beds were rejected in review (a lo-fi loop of sines, called
ridiculous; a supersaw EDM bed, still disliked), so **a cut ships without a bed until the user has chosen one**
from a listening board that puts the synth registers next to real free-library candidates.

The registers, each rendered solo and under the real voice for the board:

| style | tempo | what it is |
|---|---|---|
| `boombap` | 91.6 bpm (24 bars in 62.9 s) | swung hats, kick/snare, a 2-op FM electric piano (Rhodes-like), sub bass, vinyl crackle |
| `funk` | 122.1 bpm (32 bars) | Karplus-Strong plucked "guitar" riffs on C · G · Am · F, claps, shaker, a plucked bass |
| `pulse` | 122.1 bpm (32 bars) | an 8th-note filtered pluck pulse over a drone, sparse four-on-the-floor, side-chained pads |
| `synth` | 122.1 bpm (32 bars) | v2: supersaw chords pumped by a sidechain, off-beat bass, kick 4/4 (kept for reference) |

`--bars` sets the tempo so the bar grid lands exactly on the cut; the defaults put the drop on
the word at ~7.9 s and the break under 39.3–43 s; the last `--fade` seconds sweep a low-pass down
and fade INTO the cut. Timbre first (plucked strings and FM tines, never bare sines), then space
(ping-pong delay + reverb on a send bus), then the groove. The fade ratio is clamped: at
`t == END` it once rounded past 1 and `Math.pow(1 − u, 1.3)` went NaN through the filter state.

**The shelf, kept.** Four tracks that passed a listening session are listed in
`plugins/video/assets/music/` with their measured LUFS and the cue gain that lands each one at
~13 LU under the voice: see that folder's README. Offer those first on the next video: the search
and the listening session are already paid for. *Complicated* was the one chosen for the first
long video's intro (2026-09-04).

Real candidates, where to look, and what to flag: **YouTube Audio Library** (Studio →
Audio Library; filter *Attribution not required*; needs the user's login, so they browse it themselves),
**Pixabay Music** (Pixabay Content License, no attribution; many tracks are marked *AI generated*
and some *Content ID registered*; say so on the board), **Mixkit** (Mixkit License, no
attribution, no Content ID). A paid catalogue (Epidemic Sound, Artlist) is what most channels
run; if the user has one, the choice is theirs and the integration is the same.

Whatever the user picks enters the mix as a `sample:music.wav` cue at t = 0 (stereo keeps its width).
Prepare the file the way `music.mjs` ends its beds: 48 kHz 16-bit stereo, trimmed to the cut, with
a stepped low-pass sweep (`asendcmd` on `lowpass`) and an exponential fade over the last ~1.6 s so
it disappears INTO the cut instead of being chopped. `scripts/bed.mjs` does exactly that (and the
alignment on a beat, the muffle, the drops, the level): use it rather than writing the chain. Chosen on 2026-09-04:
`mixkit-hip-hop-02-738.mp3` (Hip Hop 02, Lily J, Mixkit License); the user supplied the file, which is
the sanctioned path.

Level: aim **12–15 LU under the voice**, measured. Three ways (the third is the most direct):

1. **By difference**: build the mix twice, with and without the bed cue, and compare the 5th
   percentile of `ebur128`'s momentary track. −23.6 → −22.5 LUFS means the bed alone sits at
   −29.0, i.e. 14.8 LU under a −14.2 programme. This works on any cut and is the one to trust.
2. **Bed alone in a pause ≥ 0.4 s** of the finished file, only when the cut HAS one. A 1.2× cut
   does not: `silencedetect` finds nothing that long in the retimed voice, and `ebur128` reports
   −70 LUFS for a shorter window, which looks exactly like silence.

3. **By subtraction**, the most direct: keep the mix.wav WITHOUT the bed, build it WITH the bed,
   and measure `with − without` (`[1:a]volume=-1` then `amix normalize=0`, both trimmed to the
   cut). The chain is deterministic, so what is left is the bed exactly as the master carries it.
   Check that it is the bed and not the voice: project the difference onto the no-bed mix, and
   the voice's share of its energy is ~0 (0.3 % on the GTM OS short, 2026-09-29).

Arithmetic (file LUFS + cue + `sfxMasterDb` + the programme gain) under-reports the bed by
2–7 dB, because the groove runs above the file's average and dynamic `loudnorm` lifts the quiet
passages. Use it to get within a few dB, never as the verdict. The 7 was measured: on a quiet
raw (+13.9 dB of programme gain, `loudnorm` falling back to dynamic mode), arithmetic said
−45.5 LUFS and the master carried −38.3 by subtraction.

**The LANDSCAPE intro sits much lower than 12–15 LU, and that is deliberate.** `TARGET_SUM = -28.0`
in the landscape-mode defaults puts the bed at about **−46 dB mean on the effects bus**
(window with no cue, `volumedetect`) under a −14 LUFS programme, far below the shorts' figure,
because a talking head carries the whole runtime and a bed at 13 LU down competes with the speaker.
The number was bracketed by review, not chosen: at −55 the music could not be heard, −41 was a
little too loud, −46 was validated (2026-09-11). Read it on `sfx.wav`, not by arithmetic:

```
ffmpeg -ss 20 -t 6 -i sfx.wav -af volumedetect -f null -
```

(mean RMS on the bus, not LUFS on the programme: two different units, so compare it to the −46
reference value and nothing else.)

**Do not carry the landscape level over to a SHORT.** On the GTM OS short (2026-09-29) the bed
as heard at ~33 LU under the voice (the intro's level) and at 25 LU under were both sent back:
even the louder version was not loud enough. It is being retested at the shorts'
own figure, **15 LU under the voice** as heard (−29.0 LUFS under a −14 programme, measured by
subtraction, cue −18.5 dB on that cut). The reviewer's verdict is pending.

## Levels

Gains are **dB relative to the speaking voice**, and they are measured, not guessed: peak of the
effect against the local peak of the voice around it. `sfxMasterDb` (default −13) trims the whole
bed: the first pass landed the cues about 13 dB hot and read as a sound-effects reel rather than
as editing.

**A cue that lands on a DE-ZOOM is the first one to be too loud.** The block-exit slice sits on the
release, and the reviewer found the de-zoom sounds too loud across the board: it went from −20 to
−26, on top of a master that came down 4 dB, so 10 dB in total. And when a punch is cut, the sound that
marked its release goes with it: a de-zoom that no longer happens should not still be heard.

**One cue per event, not per element.** A tick on every row, every ghost and every keystroke is
what the reviewer called a few too many. Around **0.6 cues per second** of finished video
is the ceiling. The shipped cut has 86 over 131 s.

## Licensed and meme samples

### Set the bed level by measurement

Aim for the bed **12 to 15 LU under the voice**. The gains in the music README land each track at
about 13 LU under. Two ways to check, in order of preference:

1. **By difference.** Build the mix twice, with and without the bed cue, and compare the 5th
   percentile of `ebur128`'s momentary loudness. Example: -23.6 to -22.5 LUFS means the bed alone
   sits at -29.0, which is 14.8 LU under a -14.2 programme. This works on any cut.
2. **Bed alone in a pause of at least 0.4 s** of the finished file. `ebur128` needs one full
   400 ms block and reports -70 LUFS for a shorter window, which looks exactly like silence. Check
   the pause against the transcript too: a window that still holds a word's decay or a whoosh reads
   6 to 10 LU too loud.

Arithmetic (file LUFS + cue gain + `sfxMasterDb` + programme gain) under-reports the bed by 2 to
5 dB, because the groove runs hotter than the file's average and dynamic `loudnorm` lifts quiet
passages. Use it to get within a couple of dB, never as the verdict.

Swapping the track on a finished video costs no picture render: `build.sh --audio-only`.

## The room in the voice

`voiceChain` in `project.json` is an ffmpeg filter string applied to the spoken track only, before
any `atempo`. Changing it costs no picture render: `rm voice.wav && build.sh --audio-only`.

**Measure the room in the user's own track before touching it.**

1. **The decay.** `silencedetect=noise=-45dB:d=0.30` gives the pauses, but it reports the START of
   the silence, so a decay window anchored there is already in the noise floor (it once "measured"
   an RT60 of 48 s). Take the window before it, read the speech level from the 120 ms before the
   stop, and time the fall of 20 dB (T20 x 3 = RT60). Many pauses are unmeasurable when the floor
   is only 18 to 24 dB down; use the clean ones.
2. **The tail's spectrum.** Average the FFT of the 60 to 200 ms after each stop (the tail) and of
   the 140 ms before it (the direct voice), and subtract band by band.

A typical small room is not an echo: a short tail (RT60 0.3 to 0.5 s) that sits only about 9 dB
under the voice below 315 Hz and 14 to 19 dB under it above 2 kHz. That is a low-mid ring plus a
distant mic. The fix follows from the numbers: cut where the room sings, lift where it is silent
(perceived reverb is a direct-to-reverberant ratio, so 3 dB of presence removes as much room as 3 dB
off the tail), and expand downward gently with a release taken from the measured decay. A starting
point, to adjust to your own measurement:

```
highpass=f=95:p=2,
equalizer=f=200:t=q:w=1.1:g=-4,
equalizer=f=3200:t=q:w=0.9:g=2.5,
agate=threshold=0.02:ratio=1.6:attack=5:release=220:range=0.35
```

**Harder is worse.** Track a pumping proxy alongside the tail ratio: the standard deviation of the
gain the chain applies during speech. Measured on one recording:

| setting | tail vs direct, 80 to 315 Hz | 2 to 8 kHz | gain movement inside words |
|---|---|---|---|
| untreated | -8.9 dB | -14.4 dB | 0.00 dB |
| light (above) | -15.3 dB | -18.4 dB | 1.12 dB |
| medium (ratio 2.0, range 0.25) | -15.9 dB | -17.9 dB | 1.31 dB |
| hard | -12.8 dB | -14.7 dB | 2.83 dB |

The medium chain lost word endings on listening, so **about 1.1 dB of movement inside speech is the
ceiling**. The hard chain removes less room because a high threshold gates the direct sound too.
When the meter and the listener disagree about an expander, trust the listener; the next step down
is the EQ lines with no `agate` at all, which cannot eat anything. Dead ends: `afftdn` adds
artefacts exactly where the room is quietest, and per-band gating through `acrossover` moved the
ratio by under 1 dB. Put two or three strengths on a listening board, loudness-matched (for example
to -16 LUFS) so the user compares sound, not volume.

**Say what the ceiling is.** ffmpeg has no dereverberation (`arnndn` is a denoiser and needs a model
file). The real jump is a dedicated speech-enhancement tool or the shoot itself: a lavalier 20 cm
from the mouth instead of the camera mic.

## Loudness: a standard, not a taste

**Target -14 LUFS integrated, true peak -1.0 dBTP.** Platforms normalise on playback and most only
turn content down, so a quiet master stays quiet forever. Never a bare `volume=+NdB`: it clips the
couple of mic transients every take has.

`mix.mjs` sums voice and bed with `amix normalize=0` (cue gains are already relative to the voice,
so amix must not rescale them), then runs ffmpeg's **two-pass `loudnorm`**, the EBU R128 reference
implementation with a true-peak limiter:

1. **Pass one measures, pass two applies** the measured values. One pass guesses, because a
   limiter eats part of any gain you ask for.
2. **The ceiling is true peak, not sample peak.** A -1.0 dBFS sample-peak ceiling measured
   +0.5 dBTP: inter-sample peaks ride above the samples.
3. **Aim below the delivery ceiling, because the AAC encode adds peaks.** A mix exactly on -1.0 dBTP
   came out of the muxer at -0.5 on a long master and -0.8 on a short one, which is the trap: a
   short test render passes a gate the full one fails. So `mix.mjs` aims at
   `ceilingDbtp - tpHeadroom` (headroom 0.6 dB by default), and `ceilingDbtp` stays the standard
   `verify.mjs` measures against. Never "fix" a failing true peak by lowering `ceilingDbtp`: that
   moves the gate, not the mix.

A hand-rolled limiter (oversampled peak detection, look-ahead, a gain loop) landed within 0.1 dB
of `loudnorm` on the same material (-14.1 vs -14.15 LUFS, -0.8 vs -1.00 dBTP). Reach for ffmpeg's
own filters (`ebur128`, `loudnorm`, `astats`, `silencedetect`, `axcorrelate`) before writing DSP.

`project.json` fields: `lufs` (default -14), `ceilingDbtp` (default -1.0), `tpHeadroom` (default
0.6). `mix.mjs --lufs --tp --tp-headroom --out` override them for one run.

### What to tell the user

`mix.mjs` prints input and output loudness, the gain, the noise floor before and after, and
warnings. Pass them on instead of saying "louder":

- **How hard the limiter is working.** Above ~45 % of the time the dynamics are genuinely
  compressed and the LRA drops; say so.
- **Where the noise floor landed.** Gain does not change signal-to-noise, but it moves the room
  tone across the threshold of audibility. A take with 18 dB SNR pushed to −14 LUFS puts the room
  at about −29 dBFS: audible in the pauses. That is a fact about the recording, not a bug in the
  edit, and the user can only act on it if they are told.
- **What the peak is doing.** If two transients in the take are eating all the headroom, that is
  worth knowing: it is a microphone note for the next shoot, not something to fix in the mix
  forever.

## The pen on paper (`hand.mjs` cues, 2026-09-06)

| kind | what it is | level (HAND_LEVELS) |
|---|---|---|
| `pencil:<dur>[:w]` | graphite for exactly `dur` seconds — bright, dry, grainy noise whose resonance wanders (a fixed filter reads as a synth); `:w` = writing, the pen lifts between glyphs | −24 |
| `marker:<dur>` | a felt tip: lower, wetter, a squeak riding the stroke and the felt's low rub | −22 (a swipe −23) |
| `scribble:<dur>` / `eraser:<dur>` | hatching (the pencil back and forth at 9 Hz) / a dull rub | −22 / −23 |
| `paper_in` / `paper_out` | a card slid onto the desk / lifted away, the flap at the landing | −22 / −26 |
| `sheet_in` / `sheet_out` / `tear` | a full sheet swept in / pulled away / torn across (a crackle whose rate rides a sweep) | −18 / −19 |
| `tape` | a strip pulled off the roll (a buzz at ~110 Hz sliding down) and pressed | −21 |
| `tap_pencil` / `sticker` | a pencil tapped on the desk / a sticker slapped on | −21 / −20 |
| `sample:jingle-a|b|c.wav` | the series ident, composed by `jingle.mjs` (downbeat printed as `align`) | −9 |
| `graphite:<dur>[:w]` | a soft 2B, pressed less: lower resonance (1.7 kHz), more desk | −25 |
| `fineliner:<dur>[:w]` | thin and high (3.8 kHz), smooth — almost no grain | −26 |
| `crayon:<dur>` | waxy and low (900 Hz), heavy grain, more desk | −23 |
| `chalk:<dur>` | dry and wide, dusty bursts, the pen of the "Ardoise" (slate) pass | −24 |

The **illustrated intro** (2026-09-07) added the scenes' own foley (`ILL_LEVELS` in `illustrate.mjs`):

| kind | what it is | level |
|---|---|---|
| `rocket` | a doodled rocket taking off: a rising whoosh with a sputter under it | −19 |
| `thock` | an arrow landing in a board: a woody knock, the shaft's 28 Hz tremolo dying | −15 |
| `bubble` / `seen` | a message sent (two rounded notes rising) / its two read ticks 70 ms apart | −21 / −24 |
| `clock` | one tick of a wall clock, every 0.32 s while the clock turns | −27 |
| `uipop` | a window opening: a rounded pop gliding up, no low end | −22 |
| `spark` | the pen head's glow arriving at the top of the chart: a short bright shimmer | −21 |
| `stamp` / `pageflip` | a rubber stamp pressed / a page flicked over (in the library, unused so far) | −18 / −22 |
| `whoosh_in` / `swoosh_in` / `rattle` (existing) | the capture pushed forward / the arrow's flight / people pouring into the windows | −19 / −20 / −22 |

**Never the same pen twice in a row.** The reviewer's remark on the first handwritten pass: the same
pencil sound every time was extremely repetitive; either less text, or different sounds. Both: the illustrated pass has almost no text, and every drawing names its pen while every scene
brings its own foley. A cue list where `pencil:` is the only kind is a defect, whatever the picture.

Measured at unity, `pencil:0.6:w` sits at −9.3 LUFS against −20.3 for `air_in` and −15.2 for
`thump`, so at −24 it lands ~17 LU under the speaking voice: a texture that is heard, not a sound
effect. A beat's cues come from the beat itself (`cues()`), so the pencil can never outlast the
line: change the writing speed and the sound follows.

## The theatrical pass: no pen at all (2026-09-07)

Varying the pens was not the answer: the reviewer found a sound on every pencil stroke horrible,
far too many of them. The third pass removes every pen sound
(`edl.mjs` filters `pencil:|graphite:|fineliner:|crayon:|chalk:|marker:` out of the cue list
whatever a figure emits; `cover({ sketchSound: false })`, `chart({ pens: false })`,
`targetShot({ pens: false })`) and keeps the music as the ground, with ONE designed cue per gesture
(`theatre.mjs` `TH_LEVELS`): a `paper_in` slide −22, an `impact_soft` thud −19, a `pop` −20, a
`stamp` for a light coming on −23, `air_in` for the room going dark −20, `whoosh_in` for a stroke
crossing the frame −19, the `tear` −19, the `hit.wav` on the kick, the riffle on the capture, jingle
A on the ident. Roughly 45 cues in 52 s; a drawn stroke is heard as a whoosh or not at all.


## What the chosen intro actually keeps (2026-09-07, pass D "Calque", tightened)

The reviewer picked the illustrated pass, then asked for far fewer animation sounds: not one on every
event, and very discreet sound effects overall. 104 cues became 35, by four rules that are now the default for
the series:

1. **Every pen cue is dropped** (the same regex as the theatrical pass) **except the two the reviewer named
   as good**: the outline traced on the opening sheet (`graphite:0.85`, −27 dB) and the flat line
   across the empty page (`pencil:1.30`, −26 dB). Two pen sounds in 52 s, both at the bottom of the
   mix: a pen is allowed when the drawing IS the beat, never as the sound of text arriving.
2. **Only structural events keep their own cue**: a sheet landing (`sheet_in`), a page tearing
   (`tear`), a screen arriving (`paper_in`, `whoosh_in`, `sheet_out`), a sticker (`sticker`), a
   window opening (`uipop`), the ring landing (`spark`), and every one of them is **trimmed 4 dB**
   below the level of the pass the reviewer called overdone.
3. **No two effects inside 250 ms.** The filter runs on the merged list, with samples and the
   counter's ratchet exempt (a jingle under a tear is a mix, not a collision; a ratchet is one
   texture). This also kills the doubled cues a figure emits for a two-part gesture.
4. **One gesture of a repeated figure is heard, not all of them**: the first of three checks sounds,
   the other two are silent; the crowd of leads gets one soft `swoosh_in` on the ring, not six pen
   strokes. The three `sticker` thocks and the three `uipop`s stay because each is a different
   object arriving.

The counter's ratchet went from 14 taps to 7, at −32 dB. `hit.wav` on the kick stays at −16.5 dB and
jingle A on the ident at −9 dB: those two are the intro's only loud events, and both were praised.

## The neon pass (2026-09-07): nothing is drawn, so nothing scratches

The language changed and the sound followed it. There is no pen in this pass because there is no
pencil in the picture. What carries it:

| event | sound | level |
|---|---|---|
| a full-frame cutaway arrives | `flash_in` — a bright airy burst with a short bloom (new in `sfx.mjs`) | −19 dB |
| its bar of light sweeps it away | `swoosh_in` | −21 dB |
| an object lands at depth | `uipop`, **only for the first of a group** | −25 dB |
| the cascade climbs | `tick2` per step, `impact_soft` on the last one | −26 / −19 dB |
| the curve climbs to 1M | `whoosh_in`, then `spark` as the figure lands | −19 / −22 dB |
| a central punch | `air_in`, very discreet — in this style a hard change with no sound reads as a dropped frame | −27 dB |
| the ident | jingle A on the landing of the plate | −9 dB |

~33 cues in 52 s, and the 250 ms spacing rule from the previous pass still applies. Two stretches
of the second half carry no effect at all, because the reviewer cut the graphics that were there: the bed and
the punches hold them.

## The vertical short (2026-09-29): the tips video, then the reviewer's verdict

The first pass of the GTM OS short followed an SFX tips video the reviewer sent, one sound per
event: a `tap` per logo coming out from behind the speaker's head, a `shutter` on the hard cut, a
`uipop` for the window, `whoosh_out` / `swoosh_in` on the zooms, the `hit.wav` when the logos were
flung on "A LOT", the sheet landing and a marker per mark on the paper. The reviewer disliked the
small sounds, except the swoosh and the sound of the opening screen leaving: the logos appearing
sounded bad, and leaving was worse, that abrupt sound in particular felt dated, like 2012.

So on a vertical short: **the bed, a whoosh on a camera move, a `uipop` when a screen appears,
and nothing else.** No tap per element, no shutter on a cut, no metallic impact, no pen, no paper,
no sticker. The v3 of that short carries three cues in 21.7 s (the bed and two whooshes; the pop
left with the window it belonged to). The tips video is advice for someone else's taste: the reviewer's is
quieter, and the music carries what the small sounds were doing.

Then, the same day, the paper came back, with NEW sounds: the reviewer asked for the sound back on
the sheet's arrival, as in landscape mode, and also on the elements moving at low fps and on the
pen, but not the same sounds as before: satisfying ones. The v4:

| event | sound | level | measured, by subtraction, under voice + music |
|---|---|---|---|
| the sheet lands | `sheet_in`, emitted by the sheet itself: the validated landscape plate's sound | −18 | 16 dB |
| a sticker's first pose | `mallet:<Hz>` — a muted marimba bar, pitched: the four stickers climb C D G C, a sus chord that sits in the bed's key (C, major/minor ambiguous: measured by chroma over the plate) | −24 | 13 dB |
| each later pose of its settle | `ptick:<0-3>` — a fingertip nudging a card, 7 ms, −3 dB a pose | −20 | clicks peaking 6 dB under the mix RMS |
| each stop-motion mark, as ONE glide from its first pose to its last | `felt:<s>` — a soft brush swish, chosen over the felt tip and a pencil on the same arrow, 7 dB under the felt tip ("good, just a bit loud" at its level); the felt tip, centroid 2.2 kHz, 0.3 % of the energy above 6 kHz, stays as its level's reference | −19 | 17 dB |

They are emitted by `stickers()` / `strokes()` themselves when `stepFps > 0`, **on the frame each
pose changes** (half a step before the step, where `stepClock` rounds), and poses are shared, so
the edl keeps one sound per step: a landing, else a tick. A felt glide is not a pose sound: it runs
under them, never in competition (a felt chunk on every pose made one arrow a burst of little
strokes, a rhythm the video does not have: refused, 2026-10-02). At 8 poses a second
that is a ratchet, one texture, so the 180–250 ms spacing rule of the landscape passes does not
apply to it: the same exemption as the counter's ratchet.

Two lessons on the way. **A lone band-pass leaves white noise its whole top octave**: the first
`felt` measured BRIGHTER than the marker the reviewer had refused (centroid 3.9 kHz, 7.6 % above 6 kHz)
until two one-pole low-passes at 2.6 kHz went after it, and softening it cost it 10 dB, so its
cue went from −29 to −19. **Measure a click by its peak, not its RMS**: a 7 ms tick after a
mallet reads −30 dB in a 100 ms window because the window is mostly the mallet's tail; its peak
sits 6 dB under the mix RMS, which is audible as a tick.

## The SFX pack on the vertical short (2026-09-29, v5)

The same evening the reviewer sent a PACK, five files ("Top 5 SFX"), with the short video that
says how to use them (transcribed `--lang en`): *"the click for when things pop up on the screen,
the flash for quick cuts, the whoosh to transition from scene to scene, the glitch whenever you
want text to pop up, the riser to build tension"*, and asked for them: the camera flash on the
change of shot, the whoosh to bring in the paper page because it is a transition, the clicks for
elements that appear. Then the reviewer asked for the skill to be updated, above all for the sound
effects. What had been refused an hour earlier was the SYNTHESISED set (`tap`, `shutter`, the
metallic hit); the pack's files, one role each, came back in:

| role | file (`assets/sfx-top5/`) | on the GTM OS short | cue · `align` | as heard |
|---|---|---|---|---|
| a change of shot | `camera-flash.wav` | the speaker's cut laptop → seated, with the picture's `flash()` | −7 · 0.255 s | 9 LU under the programme |
| what appears | `click.wav` | each sticker landing on the paper (it replaced the `mallet`); on v5 also each logo clearing the speaker's head (the orbit, refused since as generic AI filler) | −11 · 0.005 s | 12–16 LU |
| a transition | `whoosh.wav` | the paper plate arriving: its crest when the sheet covers the frame; `sheet_in` stays under it at −21 | −9.5 · 0.94 s | 9 LU |
| text popping | `glitch.wav` | ONE word, "OS.", the first yellow word of the hook | −17 · 0.15 s | 13 LU |
| tension | `riser.wav` | "and that's…" as the logos panic, ENDING on "A LOT": its dead stop is the accent, nothing hits after it | −14 · 1.765 s (its end) | 10 LU at its top |

"As heard" is measured by subtraction against the finished mix's momentary median (−13.9 LUFS):
`NO_CUES=<regex>` in the edl renders the same mix without the matching sounds, the difference is
the sound as it plays, and the residual away from its windows came out at −65 dB (the dynamic
`loudnorm` gave the same gain to both mixes). The flash is the loudest thing in its second and
that is right: it lands in the silence before the speaker's next word, where the dynamic `loudnorm` also
lifts whatever is there.

The files, prepared once for the shelf: `plugins/video/assets/sfx/README.md` (formats, the
double click, the riser's width: it loses 7 dB more than a normal sound in a mono fold-down).

## The light sounds of what appears: the Motionix pack (2026-10-05, the explainer)

Reviewing the explainer's second version, the reviewer found it much better and sent a second
pack, "Sound Effects By Motionix", to add *many more very light little sounds for the elements
appearing*, and asked for it in the references. It sits on the shelf prepared
(`plugins/video/assets/sfx/motionix/`: 84 sounds at 48 kHz/16-bit, all at the same short-term
loudness, −20 LUFS momentary, `kit.json` with each one's role and transient), and the explainer
copies it into its projects as `assets/sfx-motionix/`.

The rule it settled: **the big moves keep the Top 5** (the whoosh of a scene change, the flash of
a cut, the glitch of a hit, the riser into a payoff: 9–11 LU under the programme), **everything
that appears gets a light sound of its own**: a pop for what pops, a swish for what flies in, a
tick as each bar of a list lands, a select when a blurred label is said, a check's confirm and a
cross's deny, a stretch for a line drawn, a shutter for a frame of the take, the typing of a
prompt, the data of a scan. A role takes its files in turn (five pops, four swishes), so a run
never repeats one. They sit **15–20 LU under the programme median**, as heard (measured by
subtraction, the skill's `measure.mjs`): heard, never in the way; and a light sound within 0.15 s
of a big one, or 70 ms of another light one, is dropped. On the worked example: 70 cues in 50 s
(the house kit alone made 47), the voice still the loudest thing in every second.

Two things the measurement corrected: a burst of four shutters 0.11 s apart sums to 4 dB over one
shutter (set 4 dB lower), and the typing, a sparse texture, is heard 1.5 LU under what its gain
predicts (set 2 dB higher). The roles, files, gains and levels: `plugins/video/assets/sfx/README.md`.

## The old-radio voice: a BONUS on the hook (2026-09-29, v5–v6)

The reviewer asked whether the voice on the hook could get a bit of a radio effect, with several
options tested on the first 4 seconds, and later said it is optional, a bonus to offer every time.
So it is asked, never assumed
(SKILL.md § 0.2). `project.json` `voiceFx: [{ from, to, preset, fade, trimDb, bed }]`, played
by `mix.mjs`:

- the voice between `from` and `to` goes through the preset, the rest stays dry, and a 30 ms
  crossfade joins them, **in a silence**: on the GTM OS short the zone ends on the speaker's cut
  (4.076 s), in the 190 ms between a breath and "If", under the flash;
- the treated voice is **loudness-matched** to the dry one over the zone (a band-passed voice
  measures several LU quieter at the same gain, and the return must not be a jump): `am` needed
  +0.4 dB after its own drive, `walkie` −4.6;
- the presets: `fm` (190 Hz–7.2 kHz, presence, a light compression: thinner, still clean), `am`
  (380–3200 Hz at 24 dB/oct, +6 dB at 1.25 kHz, an atan drive, hiss 30 dB and a sparse crackle
  33 dB under the voice: **the reviewer's pick**), `walkie` (700–2600 Hz, a hard drive, a 7-bit log crush,
  static 24 dB under); `+bed` puts the music and the cues through the same band for the zone,
  so everything opens on the cut;
- the noise is SEEDED: the same preset renders the same file twice (checked byte for byte), so a
  comparison reel and the master carry the same hiss.

A compressed voice raises the room between the words: in the treated zone the pauses sit 4 dB
(`am`) to 9 dB (`walkie`) above the dry ones. That is part of the sound, and it is why the zone
ends in a silence under the flash rather than mid-sentence. The hook's loudness across the five
variants came out within 0.5 LU (−14.0 to −14.5 LUFS), so a comparison compares the colour, not
the volume.
