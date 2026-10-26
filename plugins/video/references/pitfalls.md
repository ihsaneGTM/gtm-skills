# Pitfalls

Traps already hit, each with the symptom first, because that is how you will meet it again. Read
this before the first cut. Every one of these cost at least an hour the first time.

## ffmpeg

**`crop` will not animate.** ffmpeg 8 removed `eval=frame` from `crop`, and `crop` cannot animate
its output size at all; it fails at configure time because `t` does not exist yet. Use `zoompan`.

**`zoompan`'s time variable is `it`, not `t`.** The error reads `Unknown function in 't-1.70)...'`,
which points at the wrong thing. `it` is the input timestamp.

**`nullsrc=d=N` sets the output duration.** A mask source declared one second too long added 52
frames of frozen picture with no audio. Always pass `-t <duration>` on the output.

**Compositing filters run until their LONGEST input ends.** `overlay` and `alphamerge` repeat the
last frame of the shorter input. A mask sequence left over from an earlier, longer edit once froze
the picture for 2.2 s and put everything after it 2.2 s behind the voice, while the frame count
still matched because the end was truncated. Every input to a framesync filter must be exactly the
edited length; `build.sh` trims the matte stream for this reason. Ask "how long is this stream
really" of PNG sequences and FIFOs alike.

**A frozen frame does not look frozen after x264.** Identical input frames come out of a CRF 14
encode with different checksums, so hashing frames finds nothing. Find a freeze by matching content:
output frames at different times that all best-match the same source frame.

**Homebrew's ffmpeg lacks some filters.** No `drawtext` (label preview tiles another way), no
`zscale`/libzimg and no `libplacebo` (so no `zscale=t=linear,tonemap` chain). Check with
`ffmpeg -filters` before building on one.

**`hstack` inputs need the `[0:v]` form.** Bare `[0]` fails with "does not contain any stream".

**`acrossover=split=` takes `|`, not `:`.** `split=315:1500` is parsed as an option list.

**`ffprobe -of csv=p=0` appends a trailing separator** when the stream carries side data:
`color_primaries` comes back as `bt2020,`, and dropped into `setparams=` it kills the filterchain
with a bare `Invalid argument`. Use `-of default=nw=1:nk=1`.

**Guard expressions against a NaN `t`.** A `volume` expression got an undefined `t` on the first
frame: `Invalid value NaN for volume`. Wrap it: `if(isnan(t),1,...)`.

**Parse ebur128's SUMMARY, not its first match.** `ebur128` prints a line per frame, so the first
`I:` match is the loudness of the silence at 0.4 s (-70 LUFS). A loop built on that ran the gain
to +336 dB. Split on `Summary:` and read the tail, and sanity-clamp any correction: a loop asking
for +300 dB means the measurement is wrong.

## The shell (build.sh is zsh)

**A glob with no match aborts the whole command** before it runs: `rm -f frame_*.png` dies when
there is nothing to delete. `setopt NULL_GLOB` first.

**zsh does not word-split `$var`.** `set -- $r` hands `$1` the whole string. Use `set -- ${=r}`.

**`$var:h` is a modifier.** `crop=w=$W:h=$H` expands `$W:h` to the dirname of `$W`, and ffmpeg
fails inside a loop that keeps printing success. Brace every variable in a filtergraph: `${W}`.

**A word starting with `=` triggers equals-expansion.** `echo ====` fails with `=== not found`.
Use `----`.

**Never kill a render by matching the project path.** `pkill -f "<project>"` matches the ffmpeg
child but not the parent `build.sh`, so the script survives, the next render starts, and two
ffmpegs race on the same `.part` file (`Unable to re-open ... for shifting data`). Kill `build.sh`
first, then its children, or let it finish. A dying process also keeps writing to the old log, so
check whether the `.part` file is growing before believing the log.

## The source file

**A phone take is often HDR, and nothing downstream knows it.** Typical: Dolby Vision 8.4, HEVC
10-bit, BT.2020 primaries, `arib-std-b67` (HLG) transfer. `format=yuv420p` does not convert that,
it re-tags it, and the picture comes out milky with lifted blacks. It never errors. Probe every
source:

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=pix_fmt,color_space,color_transfer,color_primaries -of default <source>
```

**But do not convert it.** An HDR to SDR conversion is a grading decision: it moves contrast,
saturation and skin tone on someone else's footage, and it was rejected immediately the one time
it shipped unasked. `rough-cut.mjs` passes pixels, bit depth, codec family (HEVC Main 10 in, HEVC
Main 10 out, which Apple decodes in hardware) and all three colour tags through unchanged.
`--tonemap` is opt-in. What a re-encode cannot keep is the Dolby Vision RPU; the HLG base layer
survives. Say so rather than letting it be discovered.

When a tone map is asked for, `hdr-lut.mjs` bakes it into a `.cube` for `lut3d`. Standard curves
(Hable, Reinhard) land diffuse white at 0.39 to 0.52, too dark for a face lit by a window, so the
house curve is identity below 0.75 and a `tanh` roll-off above it.

**x264 does not carry the source's colour tags, and output options alone do not fix it.**
`-color_primaries/-color_trc/-colorspace` are partly dropped behind a filtergraph, because the
encoder writes what the frame it receives says, and an overlay chain fed by rawvideo hands over a
frame with those unset. `build.sh` stamps them on the frame with `setparams` at the end of the
chain and keeps the output options for the audio-only remux. `setparams` rejects `unspecified`;
the keyword is `unknown`. Verify on a `--slice`, where the failure reproduces exactly.

## Rendering

**Gate the publish on ffmpeg's exit code, never on a later check.** A disk-full render left a
truncated file, and a cleanup that tested whether `ls` succeeded deleted the good previous version.
`build.sh` writes to a `.part` file and moves it only after ffmpeg returns 0. An audio-only remux
also needs room for a second copy of the master; it checks free space first.

**Never import the renderer without `--png` while exploring.** It starts streaming gigabytes of
raw frames to stdout.

**`@napi-rs/canvas` returns PREMULTIPLIED RGBA.** Fed to ffmpeg as straight `rgba`, every soft
edge darkens, first visible as a muddy shadow. `render.mjs` undoes it with a reciprocal lookup
table, not a per-pixel divide.

**`Image.src = buffer` decodes synchronously and draws nothing.** It reports the right size and
`complete === true`, and `drawImage` then writes transparent pixels. Only the async `loadImage`
gives a drawable image, so frames must be preloaded in `load()`. That is why `loadClip()` exists,
and why clip frames are extracted at the width they will be drawn at: 138 frames at 1216 px held
about 450 MB of memory.

**`load()` runs once per layer.** A project with an under layer runs `render.mjs` twice. The hook
receives `{ layer }`; an asset used by one layer only should return early for the other.

**skia reads a non-standard font weight as a size.** Weight `650` produced 650 px letterforms.
Every font string goes through `scene.mjs` `F()`, which throws on anything not a multiple of 100.

**A font may lack a glyph.** A check mark `✓` in a mono face rendered as an empty box. Draw
symbols as vector strokes (`checkMark()`).

**An effect computed as `max(a, b)` dies silently when `a` moves.** A flash built as
`max(seg(first), seg(second))` stopped drawing once `first` shifted earlier: its term saturated at
1 and the `< 1` test never fired again. Make each effect depend only on its own trigger.

**A beat's `from` / `to` are its time bounds.** Reusing those names for geometry in a factory's
options silently overwrites the times; the figure never draws, with no error. Name points `a`/`b`.

**`--slice` seeks the input.** Absolute-time expressions (camera `it`, blur gate `T`) must be
offset by the slice start, or a preview of beat 3 plays the zoom of beat 1. `build.sh` substitutes
them. A slice carries the real mix (effects, bed, loudness), because a review file that differs
from the deliverable reports problems that are not there and hides the ones that are. It costs
about 50 s more.

**A mask stream that ends early loses the person layer silently.** When the edit runs past the
last matte frame, the image2 demuxer logs one line and ends the stream. `build.sh` pads `matte/`
with empty masks to the edited length.

## Layout

**Anchor the zoom near the head, not the frame centre.** Otherwise tightening the zoom pushes the
speaker up into the graphics band.

**Equal angles on an ellipse are not equal spacing.** On a 372 x 168 ellipse with 8 items,
neighbour distances came out 161 to 268 px. Distribute by arc length (207 to 219 px), and solve
from the start angle: arc length is not rotation-invariant.

**Compute margins from the content extent, labels included**, not from node positions.

**A placement at rest says nothing about peak zoom.** Check the graphics band against the head
top at the largest zoom inside the beat's window, not at its onset.

## Assembling a rush

A rush is a long take with restarts. The transcript locates the takes; it does not attest to them.

**The unit of editing is the breath, not the sentence.** A speaker reading from a phone pauses
150 to 300 ms inside sentences and not at all between some of them, so "one segment per sentence"
cuts into words. A breath group, a run of speech between two real pauses, is the smallest thing
that can be cut on both sides. `rough-cut.mjs --bursts` prints them as ready-to-paste
`{ fromExact, toExact, note }` lines. A hesitation inside one breath cannot be removed; tell the user
which ones remain.

**Never cut anywhere but in measured silence.** Fixed padding after the transcript's word end
clipped 23 of 40 segments; cutting at the deepest dip near the word break clipped 17 of 39. A
10 dB dip mid-word is ordinary on any stop consonant, so no single threshold separates "between
words" from "inside a word".

**Edges need hysteresis.** Confirm speech at room + 9 dB, then walk outward to room + 3 dB to find
where the sound really starts and stops. At room + 9 alone, soft first words ("This", "Okay") are
already below the threshold and every group starts late.

**The room tone is the MEDIAN of the envelope, not its 5th percentile.** A threshold from the 5th
percentile lands below the room itself, "120 ms of silence" is never found, and a 4 s segment grows
to 31 s.

**`silencedetect` does not say where the sound stops.** It reports the moment the level crosses
the threshold, and a final fricative or vowel decay sits under -35 dB while still audible.
whisper's word `end` is early too, and doubles as the next word's onset. Build a 10 ms RMS
envelope, and call speech over when it stays within 10 dB of the floor for 140 ms. Then add real
breath: **200 ms, not 100**.

**Padding is breath, and breath only exists in a pause.** Padding a boundary inside continuous
speech imports the false start next door. If the phrase's attack is within 350 ms of the target
word there is a pause; otherwise cut tight.

**Where a phrase runs straight on, do not clip the word.** Cut at the local minimum of the
envelope between the two words and fade out over **110 ms** (15 ms on a live vowel is a chop). If
the leftover word breaks the sentence, start the following segment after it instead.

**whisper invents words in long silences.** In a 3.9 s pause it repeated a recent word, and the
word was a negation. `rough-cut.mjs` flags any kept word whose onset sits more than 0.5 s from both
edges of a measured silence (the first word of each segment is skipped, since a soft attack always
looks inside the pause). A flag mid-phrase is the dangerous one.

**Onsets drift by more than a second around a pause**, and a word followed by a pause gets an
`end` that swallows the pause. Decide segment membership on the **onset**, and measure the end of
speech separately. Using `end` once silently dropped the last word of eight segments.

**Verify a boundary by re-transcribing the candidate window**, never by measuring the level at the
cut point (a cut placed at a dip is quiet by construction, so that check is circular). A clipped
word changes what the model hears: "you cannot" becomes "you can". It costs seconds per boundary:

```bash
ffmpeg -v error -y -ss 520.92 -to 521.62 -i <rush> -map 0:a -ac 1 -ar 16000 c.wav
# then transcribe c.wav alone with the same model and --lang
```

Pin a measured boundary with `fromExact` / `toExact` and put the measurement in `note`.

**Snap cut points with `floor`, never `round`.** When one word ends at 248.080 and the next starts
there, `round(248.080 * 60) / 60` puts 3 ms of the removed word back.

**Comparing against `undefined` passes silently.** Entries with a pinned `toExact` carry no `to`,
and `filter(s => s.to > s.from)` dropped all of them, 30 s of video, with no error.

**`find(([s0]) => s0 >= t)` misses on a float.** `353.54 + 0.02` is `353.56000000000002`, the
lookup falls through to the next silence, and a segment ends on a second of dead air. Compare with
an epsilon.

**A second `--adopt` must not overwrite the rush's transcript.** `--adopt` rotates `words.json` to
`words.raw.json` the first time only; on a later pass `words.json` is the transcript of the
assembly, and overwriting the reference makes every unpinned boundary resolve blind. `rough-cut.mjs`
refuses to run when the reference does not reach the end of the rush. Rebuild it explicitly:
`transcribe.sh --lang <code> --source <rush> --out words.raw.json`.

**Read the assembly back before and after rendering.** `--dry-run` rebuilds the transcript of the
cut; reading it catches a dropped word or a doubled "so". Then transcribe the rendered file: that
is the ground truth. A segment under about 0.35 s reads as a glitch. Every join is a jump cut; say
how many there are.

**Remove a leftover retake at the source.** A graphic can cover the picture, never the voice.
`cuts` in `project.json` (source seconds, applied before `speed`) removes a stretch from picture and
voice together and keeps one output timeline. Place the points on the envelope, not on the
transcript's word times.

## Transcription and captions

**Always pass `--lang`.** Auto-detection answered the wrong language with confidence 1.00 and
translated the whole take. The output was fluent and grammatical, so nothing looked broken; the
only tell was that product names came out localised and idioms came out as their equivalents.
Every caption shipped that translation for several rounds. Check a few words of the transcript
against the audio before going further.

**Captions and on-screen words come from `words.json`.** The speaker's own words, in the language
they speak, never translated or paraphrased. A caption written by hand is a caption you can get
wrong.

**Corrections are patterns, never indices.** An index-based fix rots the moment the transcript
shifts by one word (`[25, ["Acme"]]` landed on "a"). `subs.config.json` `corrections` are matched
as word patterns, longest first, and `build_subs.mjs` reports any pattern that finds no match.

**The ASR mangles exactly the words that matter**: product names, acronyms, jargon. None of them
can be deduced from the transcript. Check the picture (a frame of their screen, a slide) or ask the
user, and add a correction.

**Word starts drift by up to half a second.** A beat that must land on one word needs its onset
checked against the audio envelope: an attack is energy jumping 8 dB or more out of the local floor
on a 10 ms RMS envelope. A word inside a continuously voiced group has no attack; read the envelope
by hand and count syllable nuclei. Early is what the eye catches.

**Subtitles are mandatory on a vertical short.** Most feeds autoplay muted.

## Audio

**Sample peak is not true peak.** A -1.0 dBFS sample ceiling measured +0.5 dBTP. Limit on true
peak, and aim 0.6 dB under the ceiling to leave room for the AAC encode (see audio-spec).

**A waveshaper stops being transparent around 0.2 % of the material.** At +6 dB it touched 82 ms
of a 131 s video, inaudible. At +14.6 dB it touched a full second of loud syllables and turned them
into harmonics. Use a limiter.

**Do not verify a limited mix with a linear un-mix.** `final - voice * scale` assumes a linear
sum; the limiter's time-varying gain breaks it and the residual reports a broken bed on a good file.
Compare the encoded file against `mix.wav` (what `verify.mjs` does) and check the bed cue by cue in
`sfx.json`.

**Do not compare the finished mix to the raw source.** The AAC re-encode sits around -30 dBFS of
difference and drowns quiet cues: that method reported 45 missing effects that were all present.

**Downmix before you index.** A stereo file read as a flat array reports times at half the real
position.

**A slow-attack sound is not a missing sound.** A probe looking for energy in the 120 ms after a
cue always reports `riser` silent. `sfx.mjs` records what it rendered (`sfx.json`); check that.

**A slice from the middle of a sound clicks.** Its first sample is not zero. `sfx.mjs` fades a
slice in over 40 ms when it does not start at 0.

**A continuous cue cannot be levelled inside the bed.** With music present, the window's gated
loudness read -46.3 LUFS with the cue muted and -46.4 with it up. Render the sound alone at its cue
gain and compare it to the voice in that window.

**A meter under-rates a click texture.** A scroll riffle set by measurement to 12 LU under the
voice came back as far too loud; it shipped at 22 LU under. Dense transients are more salient than
K-weighted loudness suggests. For anything click-like, the meter gives a starting bracket and the
ear decides.

**Check a sample's tail before trimming it.** An envelope correlation once suggested a 2.35 s
phrase was 1.1 s plus reverb; harmonicity 0.32 and spectral flatness 0.013 proved it was still
speech.

**`sfxMasterDb` moves the music too.** The bed is a cue. Master first, then the bed's own gain.

**Retiming belongs in the one encode.** `speed` in `project.json` retimes the picture with
`setpts=PTS/S,fps=F` and the voice with `atempo=S`, which keeps pitch (`asetrate` does not). Every
time in `edl.mjs` and `plan.mjs` is then an OUTPUT time: author against `words.json` and divide once
(`const at = t => t / speed`).

## Verification

**Opaque beats need no blur behind them.** Only floating beats do. The reverse rule, a blur window
with nothing in it, is the one that matters, and `verify.mjs` fails on it.

**A coverage check that filters overlapping ranges lies.** Excluding ranges that start inside
another range once dropped a long one and reported half the video as uncovered. Use full ranges.

**Count the cues before sending anything.** Read the bed level on `sfx.wav` and the number of cues
in `sfx.json`. A count far below what the plan implies means a beat is silent.

**A check that is wrong in either direction gets ignored**, which is worse than no check. When a
gate flags something that is visibly fine, fix the gate's model before trusting it again.

## Files and projects

**Never keep a video project in a temp directory.** A reboot wiped one: the matte, the transcript
and the plan were gone and only the delivered render survived. Projects live in
`workspace/projects/<slug>/`, finished files in `workspace/videos/`.

**`project.json` carries `out` as an absolute path.** Moving the folder is not enough; repoint
`out`, or the next render recreates the old tree. Before moving gigabytes, check both paths are on
the same volume (`stat -f %d`): then `mv` is an instant rename, not a copy that can fail half-way on
a full disk.

## Working method

**Measure, do not assert.** You cannot watch or listen. Every statement about a cut (sync, levels,
coverage, loudness) comes from a number, and `verify.mjs` produces them. When a measurement
contradicts what you expected, it is usually right; when the method is wrong, say so and re-measure
rather than re-running until the answer looks nice.

**A PNG answers most review notes.** `render.mjs --png <t>` is instant; a full render is minutes.

**What reviewers consistently reject**, and it generalises:

- **A two-word chunk that means nothing is a chunk to delete.**
- **A line that intrudes 200 px into the silhouette does not SHRINK, it SWITCHES SIDES.** `fit.mjs`
  refused "YOUR OWN" on the right (-207 px): the speaker gestures to the right during that window.
  Shrinking it would have made it smaller than its own label above. Moved to the left it was -1 px,
  then compliant after dropping 3 px. The side is a parameter; the typographic hierarchy is not.
- **The ASR gets the words that matter wrong, and the PICTURE settles it.** "the three **series**",
  "the **funeral**", "build **females**" were the three **C's**, the **funnel**, the **funnels**.
  None of them can be deduced from the transcript. All of them were written **on the speaker's own
  screen**: `Customer → Channel → Content` at 61.6 s, a funnel at ~140 s. Extracting a frame beats
  reasoning about text, and it is the same rule as everywhere here: *the transcript LOCATES, it
  never attests*.

---

## Layers streamed LIVE through FIFOs: the picture runs ahead of the layers

A vertical 4K 60 fps take at x1.1. `build.sh` had `render.mjs` draw both layers straight into two
FIFOs read by the final encode. Clean render, clean log, `verify.mjs` green, and yet **from 3.92 s
on, the picture was ten frames ahead of the layers**: its own hard cut (laptop to seated, source
4.4833 s, so output 4.083 s) landed at **3.917 s**, two frames came out with NO layer at all, and
the speaker's lips led the voice by 167 ms to the end.

Two causes, found one at a time:

1. **ffmpeg decodes the source much faster than `render.mjs` draws** (~5 frames/s), and it queues
   the decoded frames while it waits: **5.3 GB of RSS for six seconds**, then the process is killed
   (137). Measured with `/usr/bin/time -l`. The same graph fed from FILES: 1.2 GB, and the cut at
   exactly 4.083.
   → `build.sh` now draws each layer first into a lossless FFV1 file (`draw_layers`, both in
   parallel; a transparent layer weighs almost nothing), then composites in one pass. The picture
   is still encoded ONCE. Side effect: the full render went from 273 s to 145 s, because nothing
   waits on anything any more.
2. **A mask repainted as RGB in the middle of a grey sequence** (see the next section) makes ffmpeg
   REINITIALISE the whole filter graph at that frame: the layers vanish for a few frames.
   `-reinit_filter 0` on the mask input.

And the missing check: **`verify.mjs` now checks that every hard cut in the source lands on ITS
correct frame in the render** (scene > 0.30 in the source, mapped through `cuts` and `speed`,
searched ±0.3 s in the render). The negative test: a copy shifted by 10 frames is found at -11
frames. The audio check could not see any of this: the voice is `mix.wav`, placed by timestamp. It
was the PICTURE that drifted.

Two traps along the way. A test run in Claude's terminal gets killed by its memory limit (137)
where the same test run as a normal process passes: reproduce it the way the real render runs. And a
contact sheet sampled with `fps=1.1` does not land on the times you think: to check timing, extract
by frame NUMBER (`select=eq(n\,N)`).

## What the speaker holds is not the speaker: `matteHoles`

Vision segments a PERSON, and what a person holds counts as part of them. In the opening of the
short the speaker holds a laptop: the mask kept it at 50-90 % opacity (5,141 non-zero px out of
22,500 in the measurement window, up to 235/255). A window meant to come out from behind the torso
OVER that laptop therefore showed the laptop through it, because the person layer is composited
above the under layer. A threshold does not fix that (the laptop is not faint, it is half-certain);
a hole in the area where the body is not, does:

```json
"matteHoles": [ { "from": 0, "to": 4.076, "rect": [0.0, 0.49, 0.61, 0.79] } ]
```

Times are OUTPUT seconds, the rectangle is in fractions of the frame BEFORE the camera. `matte.mjs`
applies them at the end, and `node matte-holes.mjs` re-applies them on its own. Place the edge flush
with the body by READING it in `matte/edges.json` (the left edge: 0.62-0.67 between 0.50 and 0.65 of
the height here), never by eye.

**And the hole must stay GREY.** `drawbox` outputs an RGB frame and the PNG muxer then writes
rgb24: the first version produced 246 rgb24 masks followed by grey masks, and that format change
mid-sequence is what made the graph reinitialise (previous section). `matte-holes.mjs` forces
`format=gray` and `-pix_fmt gray`; `build.sh` warns if `matte/` mixes formats.

## Text BEHIND the speaker: measure it, do not look at it

The big vertical headlines (`headline.mjs`) sit on the under layer: where the speaker's head rises
into the text, it hides it. That is an effect while the word still reads, and a typo once it does
not: an Impact L whose foot passes behind the hair reads as "I". On a still frame you do not see it
coming: the speaker moves, and the camera punches in. `occlusion.mjs` places each word exactly as
`headline.mjs` draws it and measures, 15 times per second through the SAME camera as the picture,
the share of its pixels the mask covers. On the first pass: "like" 40 % hidden, "to" 100 %, "deal"
70 %, "BETWEEN" cut to "…VEEN", all invisible on randomly chosen previews. Thresholds: 18 % (look
at it), 30 % (rejected). "juggle" at 15 % (the loops of the g's behind the hair) is the intended
effect.

Three rules it left behind:
- **A script font does not go white on white.** Snell Roundhand across a white Impact word
  disappears; across a YELLOW word it reads, as in the reviewer's reference (white on red). The
  crossed word is yellow, or the script gets its own line.
- **The top of these shots is a white window and ceiling.** White Impact did not hold there:
  `shade()` darkens the top of the ROOM on the under layer (an edgeless gradient, zero at 0.47 of
  the height). The room falls into shadow, the speaker does not.
- **Removing a word that carries nothing beats hiding it.** "between", "to deal with": the logos
  and "A LOT" already say the sentence, and there was no room outside the speaker's head.

## More from the vertical pass: fonts, levels, sounds, tools

- **A script font's size is not its size.** At 200 px, Sacramento's lowercase is 32 % smaller than
  Snell's, and Lobster's 37 % larger: comparing three fonts at the same size compares sizes, not
  designs. `headline.mjs` measures the x-height from the font (at 256 px, where the canvas rounds to
  the pixel; above that it rounds to 1/64 of the size) and draws every script at Snell's x-height:
  Sacramento x1.48.
- **A script word reserves room for ITS letters, not for the font's longest descenders.** Under
  "and that's" (no descenders), Sacramento's reserve (0.53 of the size) pushed "A LOT" into the
  speaker's hair: 29 % hidden, 5 % once measured on the word.
- **A music level does not carry over from one edit to another.** On a quiet take (+13.9 dB of
  gain) `loudnorm` switches to dynamic mode and lifts the quiet passages, the bed with them: the
  arithmetic said -45.5 LUFS, the master carried -38.3. And the level approved for the landscape
  intro (33 LU under the voice) was "not loud enough" on a short. Measure by subtraction
  (audio-spec.md), on every edit.
- **A band-pass alone leaves white noise its whole top octave.** The first felt-pen sound, meant to
  be soft, measured brighter than the rejected marker (centre 3.9 kHz, 7.6 % above 6 kHz); two
  low-pass filters at 2.6 kHz behind it and it lost 10 dB, its marker went from -29 to -19. **A
  click is measured at its peak**: in a 100 ms window, a 7 ms tick reads -30 dB because the window
  is mostly the tail of the previous sound.
- **`render.mjs --png` draws the OVER layer by default**: a headline on the under layer is
  invisible there (the image is 8 KB). Use `--layer under`, or `scripts/preview.mjs`, which
  composites camera + layers + mask and works on a vertical project.
- **Homebrew's ffmpeg has no `drawtext`** (no libfreetype): label a comparison sheet with the
  engine's canvas (`@napi-rs/canvas`), not with ffmpeg.
- **A plan template imports the engine by ABSOLUTE path.** The old one imported
  `../scripts/beats.mjs`, which resolves to nothing from `workspace/projects/<slug>/`; `init.sh` now
  replaces `__SCRIPTS__` with the real path.

## The SFX pack, the flash, the radio hook

- **A supplied sound is not ready to use.** The pack arrived as MP3 disguised as `.wav`, as float
  44.1 kHz, as 24-bit 96 kHz: `sfx.mjs` reads only 16-bit PCM (and only warns if the sample rate
  differs, in which case it would play too fast). Prepare it once, at 48 kHz 16-bit, 4 dB lower
  (resampling a file that touches -0.1 dBFS creates inter-sample peaks that 16 bits would clip).
  This ffmpeg has NO soxr: `aresample=48000:filter_size=64:phase_shift=10:cutoff=0.97`.
- **Placed on its first sample, a sound lands late by its own rise time**: the flash by 0.255 s,
  the whoosh by 0.94 s, the riser by 1.765 s (the riser is aligned on its END). Measure the attack
  on a 5 ms envelope and pass it as `align`. And the click is double (0.005 and 0.060 s).
- **whisper's word onsets are not the sound's attack**: "If", reported at 4.00 s, started at 4.21 s
  on the envelope. To place a sound or a switch in a silence, read the envelope of voice.wav, not
  words.json.
- **The flash made verify.mjs fail on a perfectly synced picture**: the cut detector found the rise
  to white, two frames before the cut hidden under it. A flash is a blend towards white, which a
  per-frame black/white normalisation cancels (`normalize=smoothing=0`): verify.mjs searches for the
  cut that way when the first search misses, and accepts it only within one frame. Found again at
  4.083 s, the exact frame of the earlier version without the flash.
- **Full-frame noise does not compress**: the VHS hook weighed 152 MB for 5.3 s at CRF 14. Noise at
  the tape's resolution (before upscaling), 30 fps instead of 60, a ripple that advances only 12
  times per second: 58 MB. A ripple that changed every line on every frame made the whole picture
  new on every frame.
- **Sepia kills yellow**: "WORKS." turned khaki in the film look. A washed-out colour (saturation
  0.40 + the `vintage` curve) keeps a trace of the words' yellow.
- **A compressed voice lifts the room between words** (+4 dB in `am`, +9 in `walkie`): the radio
  zone ends in a silence, under the flash, never in the middle of a sentence.
- **In a zsh command, `-map [v]` is read as a file glob** ("no matches found"): write
  `-map '[v]'`. And `render.mjs --png t` writes `frame_<t>.png` into the folder (no `--out`);
  `ebur128`'s per-frame log only appears with `-v verbose`.
