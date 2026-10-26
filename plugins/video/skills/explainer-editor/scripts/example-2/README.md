# Worked example 2: another take, from scratch

The skill run end to end on a take it had never seen (2026-10-05), to prove the level holds on any
take: another speaker, seated and framed wider, a quiet recording (−31.8 LUFS), 24 s, **two shots**
(a close one with a laptop for 4.5 s, then the seated one), on a Go-To-Market OS. Nothing of the
first example was reused but its method. It passes `verify.mjs`:

```
container   1080x1920 · 30 fps · 715 frames · 23.833 s
effects     33 cues · 33 audible in the bed
loudness    -14.0 LUFS · LRA 3.4 LU · true peak -1.4 dBTP
picture     1 source cut(s) · 0 on the right frame · 1 under a full-frame plate
```

(the source cut at 4.50 s happens inside the speaker's frame, a small part of the picture, so
`verify.mjs` does not see it in the whole frame; measured in the frame itself, it lands on 4.50 s
exactly) and `measure.mjs` (programme median −14.2 LUFS): the bed (Convergence) 15.9 LU under the
voice; whoosh 9.1-9.4 LU under, glitch 10.7, whoosh_out 12.9; pops 15.8-18.1, swishes 16.4-16.7,
the UI sounds 14.3-19.4.

What the run found, now in the skill:

- **two shots**: the frame was set on the median of both, so in the close shot the head rose
  300 px out of the frame, into the caption. `layout.mjs --measure` now frames each shot
  (`stage.shots`), the camera switches on the cut, the frame stays (782 px: the head of the
  longest shot at 226 px);
- **a relative source path** left the sounds uncalibrated (`init.sh` now resolves it); **a second
  `init.sh`** set the master back to the source's 540x960 (now kept at 1080x1920);
- **a quiet take** hears its sounds and its bed about 2 dB lower after the loudness pass: the
  formulas now add 0.13 dB (sounds) and 0.18 dB (bed) per dB under −20.5 LUFS;
- **a scene that arrived empty** for a second after its move: the personas and the channels now
  ride in with the camera, in the dark or out of focus, and each lights up on its word.

What each file shows:

- **`plan.mjs`**: four scenes, no breather (a 24 s take):
  A. the title "We've Built A / *Go-To-Market* OS", a rocket on "OS" with rings, "What it is" and
     "How it works" rising with an arrow each;
  B. a **whip** to three personas riding in dark, each lit on its word (Founder, Marketer, GTM
     guy), a red frame and a red arrow down to the speaker on "like me";
  C. a **rise** to five channels riding in out of focus, each sharp on its name (YouTube, TikTok,
     Instagram, SEO, Signups), then all blurred under a red "A LOT" with the glitch and a shake;
  D. a **whip** to four bars, each revealed with its verdict (running ✓, attention ⚠, clients $,
     not ✕).
  The channels are pictograms and names: their logos were not supplied (say so on delivery).
- **`project.json`**: two shots in `stage.shots`, `sfxMasterDb` −15.0 and `bedDb` −18.4 (what the
  corrected formulas give for −31.8 LUFS), Convergence from 18.29 s, no drop.
