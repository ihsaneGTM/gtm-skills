# Worked example: the reference cold call

The complete edit of a real 93 s cold call (Kyle, the caller, and a prospect, over a picture of
someone at a table), the call the call language was built on over seven versions in review
(2026-10-02/03). Kept as the reference for what a finished project of this skill looks like.
Rebuilt from scratch with this skill's tools on the same take, it reproduced the delivered short:
the same transcript word for word, the same assembly frame for frame (5 700 frames, the 29 glitched
ones included), the same voice file, the same 20 sound cues at the same times and levels; of the
4 750 frames of the short, 2 868 came out bit-identical and the others at 40 dB PSNR or more (the
wave line's shape around the turn edges, which the tools now take from the words where the review
set them by hand). It passes `verify.mjs`:

```
container   1080x1920 · 60 fps · 4750 frames · 79.167 s
encoding    residual 36.1 dB below the mix
effects     20 cues · 20 audible in the bed
loudness    -14.3 LUFS · LRA 5.3 LU · true peak -1.5 dBTP
blur        0 window(s) · 9 floating beat(s), 0 opaque
overlay     empty on 0/0 probes outside beats
picture     0 source cut(s) · 0 on the right frame
```

What each file shows:

- **`project.json`**: the decisions that are READ, not measured, and where they are kept:
  - `speakerFix` with `speakerNotes`: the five words whose voice was set by reading (a word flipped
    inside the other voice's sentence, "my" on a fragment of the other voice, the caller's
    "Absolutely." said over the prospect), and the training stretches of the voice model;
  - `onsetFix` with `onsetNotes`: the 48 onsets pinned on the envelope, with what was heard;
  - `assembly`: this source already opened on a copy of its hook line ("Where did you get my
    number? I mean, my number is not listed."), so the hook is that head (`hookFrom` 0, `hookTo`
    4.08, after the "-ted" of "listed", measured) and the call starts at `resume` 4.366667;
  - the levels of the call language: `bedDb` −20.9 (16.8 LU under the voice as heard),
    `cueGains.hookBed` −15, `cueGains.ring` −13.5, on `sfxMasterDb` 2.
- **`dialogue.json`**: the record as typed, punctuation mended by reading. Verbatim but for 11
  hesitations and 6 false starts. The delivered short also left out "well", "and" and "you know"
  (a leftover of its first version, in headlines); they are restored here, as the rule says.
- **`hookfx.json`**: the glitch on WHERE, NUMBER?, NUMBER (lighter), NOT, then the break into the
  sheet.
- **`plan.mjs`**: the picks: the glitch sound on NUMBER?, the hook's riser ending on NOT, four
  punches (SALES call, WATERFALL, CONFERENCE call, COLD calls), the payoff "doing my JOB.", a phone
  on "my NUMBER" and a mail on "my EMAIL" coming out from behind the person (he sits on the right:
  the chips go left).
- **`edl.mjs`**: the sound, untouched from the template.

The prospect's name is never said in the call, and it would not be on screen if it were: the
other person stays PROSPECT. Do **not** reuse these files for another call: every time in them hangs
on this take's words. They are here to show the shape.
