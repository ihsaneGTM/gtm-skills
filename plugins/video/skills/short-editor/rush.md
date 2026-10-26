# A rush: assemble it before the edit (short-editor, § 0.7)

All paths are relative to the root of the GTM by Pipecorn folder; `$S` means
`plugins/video/skills/short-editor/scripts` (SKILL.md).

A rush is a long take with restarts: the same sentence attempted four times, thinking out loud,
dead air. The rest of the pipeline assumes the source **is** the take you want (every cue is a
word onset in `words.json`), so the assembly happens first and produces a real file; then the
pipeline restarts from it.

```bash
# 1. transcribe the rush (§ 1), then write the keep list in cut.mjs
node $S/rough-cut.mjs --bursts     # every breath group, ready to paste
node $S/rough-cut.mjs --dry-run    # read the list back, no render
node $S/rough-cut.mjs --adopt      # render, then repoint the project
$S/transcribe.sh                   # the transcript of the ASSEMBLY
```

`--adopt` points `project.json` at the assembly (keeping the original as `rawSource` and its
length as `rawDuration`), rotates `words.json` to `words.raw.json` and drops the stale `voice.wav`.
`rough.map.json` records every segment, so the cut stays auditable. Re-cutting is the normal case,
so `rough-cut.mjs` always reads the **rush**, never the previous assembly: its reference transcript
is `words.raw.json`, which a second `--adopt` will not overwrite. If that file is missing or stale,
rebuild it explicitly: `$S/transcribe.sh --lang en --source <rush> --out words.raw.json`.

**Picking the takes is the judgment step, and it is done by reading.** A silence threshold cannot
do it: it keeps all four attempts and deletes the breath before the good one. Read the transcript,
choose the attempt that says the thing, and **propose the list to the user before rendering**: it
is a decision about what they said. Look for the sentences that carry the argument, the attempt
where the delivery lands (not merely the last one), and whether the kept segments still form a
speech back-to-back.

`from` and `to` are **word onsets** copied from `words.json`: `to` names the last word to keep, not
the moment to cut. **The transcript locates the takes; it does not attest to them.** On one rush it
invented a word in a 3.9 s silence (`cannot`, the negation carrying half the argument) and mis-dated
two others by more than a second. Verify a boundary by re-transcribing the candidate window:

```bash
mkdir -p tmp && ffmpeg -v error -y -ss 520.92 -to 521.62 -i <rush> -map 0:a -ac 1 -ar 16000 tmp/c.wav
~/.venv/whisper/bin/python -c "import sys; sys.path.insert(0,'<this skill>/scripts'); from asr import WhisperModel; \
  print(list(WhisperModel('large-v3') \
  .transcribe('tmp/c.wav',language='en')[0])[0].text)"
```

When a measurement contradicts the transcript, pin the number with `fromExact` / `toExact` and put
the measurement in the `note`.

**Select BREATH GROUPS, not sentences.** A breath group is a run of speech between two real pauses,
found with hysteresis (confirm at room + 9 dB, edges at room + 3 dB): the smallest thing that can be
cut on both sides without touching the voice, because a speaker reading from a phone pauses *inside*
sentences. The trade this forces is the user's: a hesitation inside one breath cannot be removed;
say which ones remain. **Where the speech stops is measured, never read**: `rough-cut.mjs` builds a
10 ms RMS envelope, takes the noise floor from its own 5th percentile and calls a phrase over when
the signal stays within 10 dB of it for 140 ms (trusting `silencedetect` and whisper's word ends
clipped the last syllable of 23 of 40 segments). Its line saying whether any cut lands while the
speaker is talking is the gate, and it should read `✓`.

Rules that cost something the first time:
- **The words first.** Never clip a word to remove the syllable after it. Where a phrase runs into a
  false start with no pause, the cut goes in the local dip of the envelope and fades over 110 ms; if
  the leftover word breaks the sentence, start the FOLLOWING segment after it instead.
- **Padding is breath, and breath only exists in a pause.** The same padding inside continuous
  speech imports the false start next door.
- **A segment under ~0.35 s reads as a glitch.** `rough-cut.mjs` warns.
- **Keep whole thoughts**, and **the order is the order of the rush**: re-ordering a speech is not a
  cut; if the argument needs it, say so instead of faking it.
- **Every join is a jump cut** on a single-camera take: say how many there are.
- **Read the assembly back** (`--dry-run` rebuilds its transcript), then the transcript of the
  *rendered* file: that one is the ground truth.

The full list of ways the transcript lies: `pitfalls.md` § Assembling a rush.
