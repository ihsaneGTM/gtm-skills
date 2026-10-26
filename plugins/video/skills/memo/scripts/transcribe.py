"""(A copy of plugins/video/skills/derush/scripts/transcribe.py, so the memo runs without the derush: a change there is
copied here.)

Every word of the take, with its onset and end -> words.json (large-v3; on the Mac's GPU when it has one, asr.py).

    ~/.venv/whisper/bin/python transcribe.py <source> <out.json> [--lang en]

VERBATIM, never translated: without --lang the language is detected from the voice. Forcing a
language that is not the one spoken makes whisper TRANSLATE (an English take forced to French came
back in French), so pass --lang only when you know it.

--segments: the sentences whisper hears, each with its start and end, without each word's own time
(one entry a sentence, the same shape: {"w": text, "s", "e"}). About twice as fast on a long
recording: the voice memo uses it, it never needs a word's time (measured 2026-10-09, a 10-min memo
on the GPU: 43 s with every word, 23 s by sentence).

Prints `progress <seconds transcribed> <duration>` as it goes: the editor's bar is that number,
measured, never a guess.
"""
import argparse, json, os, re, subprocess, sys, tempfile

ap = argparse.ArgumentParser()
ap.add_argument("source")
ap.add_argument("out")
ap.add_argument("--lang", default=None)
ap.add_argument("--model", default="large-v3")
ap.add_argument("--segments", action="store_true")
a = ap.parse_args()

import os as _o, sys as _s; _s.path.insert(0, _o.path.join(_o.path.dirname(_o.path.abspath(__file__)), "..", "..", "short-editor", "scripts"))
from asr import WhisperModel  # the Mac's GPU when it has one (asr.py)

dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.source],
                           capture_output=True, text=True).stdout or 0)
wav = os.path.join(os.path.dirname(os.path.abspath(a.out)), ".asr.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.source, "-map", "0:a:0", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav], check=True)

m = WhisperModel(a.model, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4)
segs, info = m.transcribe(wav, language=a.lang, word_timestamps=not a.segments, vad_filter=False, beam_size=5,
                          condition_on_previous_text=False,
                          progress=lambda t: print(f"progress {min(t, dur):.1f} {dur:.1f}", flush=True))
print(f"language {info.language} {info.language_probability:.2f}", flush=True)
words = []
for s in segs:
    if a.segments:
        # a block of whisper (up to 30 s) cut at its full stops, each piece timed by its share of the letters
        parts = [p.strip() for p in re.split(r"(?<=[.!?…])\s+", s.text.strip()) if p.strip()]
        n, t = sum(len(p) for p in parts) or 1, s.start
        for p in parts:
            e = t + (s.end - s.start) * len(p) / n
            words.append({"w": p, "s": round(t, 3), "e": round(e, 3)})
            t = e
        continue
    for w in (s.words or []):
        words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})

tmp = a.out + ".tmp"
json.dump(words, open(tmp, "w"), ensure_ascii=False, indent=0)
os.replace(tmp, a.out)
os.remove(wav)
print(f"{a.out}: {len(words)} {'sentences' if a.segments else 'words'}, language {info.language} ({info.language_probability:.2f})", flush=True)
if a.lang is None and info.language_probability < 0.85:
    print("warning: language uncertain; run again with --lang", flush=True)
