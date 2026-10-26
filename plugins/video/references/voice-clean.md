# The voice made better: a bonus of every video skill

A take filmed in a room carries the room: a little echo and some noise behind every word. ElevenLabs'
voice isolator removes both, leaving just the voice. Ihsane heard five versions of his own take side by
side (2026-10-15): the plain isolated voice won. The light ffmpeg clean-up, the home-made anti-echo
and the isolator with a studio treatment on top all lost to it.

## When to offer it

- **Every skill where the user's real voice is heard** (the short, cold call, scrapbook and
  explainer editors, the YouTube video editor, Long video to shorts, the derush): it is asked
  **with the other bonuses of the brief, every time, never on by default**. **No** · **Yes, make my
  voice better**.
- It needs **the ElevenLabs connector** (`ELEVENLABS_API_KEY`). Without one, say in one line that the
  option exists and where to add the key (in the app: Settings › Connectors › Add key), then carry on
  without it: never block a run on it.
- A voice made by ElevenLabs (a clone, a voice-over) is clean already: nothing to do there.
- A call recorded on a phone line is also helped (the line's hiss); say so when you offer it.

## How it runs

```bash
node plugins/video/motion/voice.mjs clean <the take>        # → <the take>-voice.<ext> beside it
```

- **Run it on the take before anything else reads its sound** (the transcription, the cut, the
  derush), then point the run at the new file: the skill's `source` / `video` field. The take itself
  is never changed, and the `-voice` file keeps the picture stream as it is (copied, no re-encode).
- The new sound has **the take's length to the sample**: word times, cuts and the picture stay in place.
  A run already cut can still swap its voice afterwards, span by span. Check by envelope, not by
  waveform: the isolator changes the waveform, so it correlates poorly with the original even when
  its timing is exact.
- ElevenLabs bills it per minute of sound (the whole take is sent: a 12-minute take took 21 s).
  Say that once when you offer it. `<file>.voice.json` notes when it was done.
- Then the skill runs as usual, and its own mix and loudness steps apply to the isolated voice.
  Measure the voice again before the mix: an isolated voice can come out a little quieter
  (-29.4 LUFS against -28.7 on the reference take).
