# Worked example: the GTM OS short

The complete edit of a real 131 s vertical short, kept as a reference for what a
finished `edl.mjs` and `plan.mjs` actually look like. It was rendered from this
pipeline and passes `verify.mjs` clean:

```
container   1080x1920 · 60 fps · 7867 frames · 131.122 s
encoding    correlation with the mix 0.9997 · offset +0.0 ms
effects     86 cues · 86 audible in the bed
loudness    -14.1 LUFS · LRA 4.6 LU · true peak -0.8 dBTP · clipping 0
blur        3 window(s) · 3 floating beat(s), 3 opaque
overlay     empty on 5/5 probes outside beats
```

What it demonstrates, in order of usefulness:

- **42 camera steps over 131 s**: the zoom rhythm at real density, amplitudes 1.03-1.16.
- **86 sound cues**: one per event, ~0.65/s. Note how sparse it is next to the number of things
  moving on screen.
- **Three floating beats and three opaque set-pieces**, and how the blur windows track only the
  floating ones.
- **The full macOS → full-frame push** (`MAC`), and the skills panel + terminal (`SKILLS`) with
  real repo skill names.
- **Three beats that were cut in review** and are absent here: a persona changing hats, a
  "TOO MUCH" pill, and per-channel signup counters with invented numbers. The reviewer's note was
  that there were too many useless visuals. Restraint is the lesson, not the beat list.

`gtmos-nodes.json` is a snapshot of the map's nodes on the day it rendered. Do **not** reuse it
as your own data: write a file of the same shape for your own map. It is here to show the shape.
