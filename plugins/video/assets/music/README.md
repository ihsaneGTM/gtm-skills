# Music

Four tracks from [Mixkit](https://mixkit.co/free-stock-music/), fetched into this folder on first
run. They are not stored in the repository.

**Licence.** The [Mixkit License](https://mixkit.co/license/) allows use in videos, including
commercial ones, with no attribution required. It does not allow redistributing the files as
standalone music, which is why they are downloaded rather than committed. Check the licence page
yourself before publishing; it is the source of truth, not this file.

| file | track | artist | length | style | LUFS | cue gain for a -14 LUFS programme |
|---|---|---|---|---|---|---|
| `mixkit-complicated-281.mp3` | Complicated | not credited | 1:49 | hip-hop / trap, serious, tension | -17.2 | **-18.8** |
| `mixkit-hip-hop-02-738.mp3` | Hip Hop 02 | Lily J | 1:55 | hip-hop / R&B, relaxed, positive | -11.5 | **-24.5** |
| `mixkit-deep-urban-623.mp3` | Deep Urban | Eugenio Mininni | 4:49 | house / tech house, hypnotic, driving | -10.0 | **-26.0** |
| `mixkit-gimme-that-groove-872.mp3` | Gimme that Groove! | Michael Ramir C. | 1:28 | funk, insistent, positive | -14.8 | -21.2 by arithmetic, not yet measured on a cut |

Two more the user added himself on 2026-09-29, kept in this folder (they are not downloaded):

| file | track | artist | length | LUFS | true peak | cue gain for a -14 LUFS programme |
|---|---|---|---|---|---|---|
| `convergence.mp3` | Convergence | not in the file | 2:45 | -14.1 (LRA 10.0) | -0.2 dBFS | -21.9 by arithmetic, not yet measured on a cut |
| `ridgeclub-do-i-clench-my-fists.mp3` | do i clench my fists? | ridgeclub | 2:33 | -14.2 (LRA 3.1) | 0.0 dBFS | -21.8 by arithmetic, not yet measured on a cut |
| `ta1ls-fatigue.mp3` | FATIGUE | TA1LS | 3:01 | -11.7 (LRA 2.1) | -0.3 dBFS | -24.3 by arithmetic |
| `alvedon-retire.mp3` | retire (final) | alvedon | 3:35 | -13.5 (LRA 4.8) | -1.0 dBFS | -22.5 by arithmetic |

The last two were added by Ihsane on 2026-10-15 for the chapters of a long video (one track per chapter); no tag in the
files.

- **Not Mixkit: allowed in a video, but they can block its monetisation** (Ihsane, 2026-10-15): Convergence,
  ridgeclub, FATIGUE and retire may be claimed by Content ID. Using them is not forbidden. When one of them is picked,
  say so to the user once, in one line, before the render; the Mixkit tracks carry no such risk.
- **They stay on this Mac**: they are not part of what ships (only the Mixkit tracks are fetched on a user's Mac, and
  the sound pack holds the SFX only). Sending them to other users is redistributing them, a right nobody confirmed.
- `ridgeclub-do-i-clench-my-fists.mp3` opens on 0.43 s of silence: start the bed at **0.43 s**
  (`-ss 0.43`) so it is there on the first frame. `convergence.mp3` starts on its first note.
- Convergence moves a lot (loudness range 10 LU against 3.1 for ridgeclub): under a voice its quiet
  and loud passages will not sit at the same distance. Render it under the real voice before
  choosing.

The cue gains land each bed about 13 LU under the voice (12.9, 13.6 and 14.0 LU measured on the
three calibrated tracks), so swapping tracks compares the music and not the volume. A constant gain
shifts loudness by exactly that many dB, so `LUFS + gain` should be the same number for every bed
at the same level (-36.0 here). What that does not settle is how much a track competes with the
voice: a busy midrange track at the same LUFS feels louder. Render two versions and let the user
listen.

## Using a track

1. Prepare it with the engine's `bed.mjs` (trim, alignment on a beat, stepped low-pass, fade into
   the cut, its level): `node <engine>/bed.mjs --map <track>`, then
   `node <engine>/bed.mjs --track <track> --align <s>@<t>`. Output: `<work-dir>/assets/music.wav`,
   48 kHz 16-bit stereo, and `bed` / `bedDb` in project.json.
2. Add it as one cue at t = 0 in `sfxCues()` in `edl.mjs`, with the gain from the table:
   `add(0, "sample:music.wav", -18.8)`.
3. Check the level as heard with the engine's `measure.mjs` (by subtraction, audio-spec.md), then
   `build.sh --audio-only`.

Changing the track on a finished video costs no picture render: `build.sh --audio-only` rebuilds
the audio and leaves the video track bit-identical.

## Your own track

Drop a track you are licensed to use into the work directory's `assets/`, prepare it the same way,
and calibrate its gain once by the difference method. Two cautions:

- A commercial release will very likely trigger a Content ID claim on YouTube, even with a licence;
  the licence only gives you grounds to dispute it. Say this once, then it is the user's call.
- Some free libraries mark tracks as AI-generated or as registered with Content ID. Read the
  track's page before using it.

Never download music from a streaming platform or a video site on the user's behalf.
