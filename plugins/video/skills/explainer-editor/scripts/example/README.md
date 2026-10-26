# Worked example: a take in the explainer language

The complete edit of a real 50 s vertical take (the speaker on doing sales calls as a service for
Pipecorn, its waterfall enrichment, the step before his platform, why he built Klesos, a series of
videos, Pipecorn against the other data providers; it ends on a wide shot of a real call). First
edited on 2026-10-04, reviewed on 2026-10-05 ("not After Effects at all, too few things on screen,
the whooshes are missing"), rebuilt with the camera, the motion blur and the base skills' sound kit,
reviewed again ("much better; not enough little shadows and glows, the black ground does not set
them off; here is a pack of light sounds") and rebuilt with light and shade, a lit ground and the
Motionix pack, then (third review) reframed (the frame narrowed to show the speaker down to the
chest), set to Convergence, and its end shown as what it is, a preview of the next video, in a card
(the flash kept on the confession). Kept to show what a finished project of this skill looks like. It
passes `verify.mjs`:

```
container   1080x1920 · 30 fps · 1511 frames · 50.367 s
encoding    residual 32.0 dB below the mix
effects     71 cues · 71 audible in the bed
loudness    -14.1 LUFS · LRA 3.6 LU · true peak -1.4 dBTP
blur        0 window(s) · 5 floating beat(s), 0 opaque
overlay     empty on 0/0 probes outside beats
picture     1 source cut(s) · 1 on the right frame
```

and `measure.mjs` (as heard, momentary loudness against the programme median of −15.0 LUFS): the
bed (Convergence) 16.0 LU under the voice; the house pack: whoosh 8.9-10.2 LU under, flash 9.0,
riser 10.1, glitch 10.8, whoosh_out 10.4-13.0 (the way back from the confession, 10.4); the light
ones (Motionix): pops 15.4-22.8, swishes 16.0-17.1, the UI sounds 13.1-19.5 together (`measure.mjs fine`, before the change of
music: select 15.9-16.4, confirm 15.5-15.8, deny 16.3, thump 16.9, stretch 17.4-18.2, ping 17.3,
flicker 18.5-19.6, ticks 16.4-21.1), the burst of shutters 14.2, data 16.7-16.8, typing 18.9.

What each file shows:

- **`plan.mjs`**: seven scenes, 70 sounds in 50 s (every figure its own light sound, the house
  pack's whoosh on every scene change):
  A. the title, a video card dropping in ("last video") then sliding aside, a phone ringing with
     rings on "sales calls", a pill flying in on "as a service";
  B. a **whip** to the Pipecorn logo (it rides in with the camera), lit with rings on "startup", a
     Station F pill and an arrow, the name rising word by word, a circle drawn round the logo, a
     "data provider" pill underlined;
  C. a **rise** to a search prompt typed on "meaning they search" (the keys, then the send),
     twelve provider tiles dropping in (a tick each) and scanned one after the other (the sound of
     data), the Gmail and phone icons on "emails" and "phone numbers", a green check on "good";
  D. a **whip** to two numbered bars (each revealed and lit on its words, a pictogram at its end),
     an arrow between them, the phone ringing on "call";
  E. the confession **full screen** (the camera flash on the way in, the music silent), then a
     **push** opened behind it: "Why I Built" on a red box, Klesos blurred until said, a chain
     Klesos → for beginners (framed in red on "like me") → two children wired on;
  F. a **whip** to four frames of the take lighting up on "series of videos" (a burst of camera
     shutters), then five bars, each revealed with its verdict (a select, then a check's confirm,
     a cross's deny, a pop for the trophy and the calendar), a riser ending on "series.";
  G. a **whip** to the providers versus the logo: a red VS with the glitch and a camera shake, a
     trophy dropping on "who wins", the question in the serif; then the end, a glimpse of the next
     video (a real call: "Where did you get my number?"), shown as a preview in a card
     (`preview(46.233, END, "card", { name })`): it rises in on a spring with a big swish, an "Up
     next" badge pops on its corner, the title "Next Video / *Who Has* The Better Data?" above, a
     red progress bar under it running to the end.
- **`project.json`**: `stage` measured on the matte (the head's usual top 14.8 % of the height,
  11.0 % at its highest, 37.8 % of the width: a close take, so the frame narrowed to 598 px at
  x 241 to put the head at the reference's 226 px), `sfxMasterDb` −5.2 from the voice (−20.5 LUFS
  + 15.3), `bedDb` −19.0 for Convergence from 18.29 s (its build lands on the first frame), silent
  on the confession (`musicDrops` 20.67-24.13); the take is 720x1280, the master 1080x1920.
  `stage.breath` is not set: the breathers keep the flash until a proposal is picked.
- **`edl.mjs`**: the sound, untouched from the template (every move's sound comes from the stage:
  the house pack in `assets/sfx-top5/`, the Motionix pack in `assets/sfx-motionix/`).

Every time in these files hangs on this take's words: do **not** reuse them for another take. They
are here to show the shape. The logos are the user's (`plugins/video/assets/logos/`), copied into
the project's `assets/logos/`; the four frames are the take's own (`stills.mjs`).

Its **light version** is the same project with `stage.theme: "light"` in project.json (nothing else
changes; rendered as `workspace/videos/explainer-demo-089c-light.mp4`, it passes `verify.mjs` with the
same numbers).
