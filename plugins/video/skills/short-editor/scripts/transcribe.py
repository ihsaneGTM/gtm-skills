#!/usr/bin/env python3
"""Word-level timestamps from the source video -> words.json.

    python3 transcribe.py [--model large-v3] [--lang en]

Every cue in the edit hangs off a word onset from this file. Placing graphics by
ear or by guess is what makes an edit feel half a beat late.

Runs through asr.py: MLX-Whisper on an Apple Silicon Mac's GPU, else faster-whisper.
bootstrap.mjs installs both. By hand, macOS ships a PEP 668 Python, so install it in a venv:

    python3 -m venv ~/.venv/whisper
    ~/.venv/whisper/bin/pip install faster-whisper mlx-whisper
    ~/.venv/whisper/bin/python transcribe.py

VERBATIM, never translated. Auto-detection once answered the wrong language for
a take and whisper TRANSLATED it, so every timestamp downstream was hung on
words the speaker never said. If the language is ambiguous, pass --lang.
"""
import argparse, json, os, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument("--model", default="large-v3")
ap.add_argument("--lang", default=None, help="ISO code; omit to auto-detect")
ap.add_argument("--out", default="words.json")
ap.add_argument("--source", default=None,
                help="file to transcribe; defaults to project.json[source]. "
                     "Needed after --adopt, when project.json points at the "
                     "assembly but the rush's transcript has to be (re)made.")
ap.add_argument("--meta", default=None, help="also write what was transcribed (prep.mjs)")
a = ap.parse_args()

try:
    from asr import WhisperModel  # the Mac's GPU when it has one (asr.py)
except ImportError:
    sys.exit("faster-whisper missing; see this file's header to install it in a venv")

# --source alone must be enough: a transcript cache may run this from its own
# directory, where no project.json exists and none is needed.
SRC = a.source or json.load(open("project.json"))["source"]
SRC_DUR = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
                               "-of","csv=p=0",SRC], capture_output=True, text=True).stdout or 0)
def ident(p):
    st = os.stat(p)
    return {"path": os.path.realpath(p), "size": st.st_size, "mtimeMs": round(st.st_mtime * 1000)}

def report(words, language, prob):
    print(f"{a.out} — {len(words)} words · detected language {language} (confidence {prob:.2f})")
    if words:
        print(f"  {words[0]['s']:.2f}s  {' '.join(x['w'] for x in words[:14])} …")
        print(f"  coverage {words[0]['s']:.1f}-{words[-1]['e']:.1f}s of {SRC_DUR:.1f}s of source")
    if a.lang is None and prob < 0.85:
        print("  ⚠ language uncertain; re-run with --lang rather than trusting this")

# What GTM by Pipecorn transcribed when the video arrived (prep.mjs, in .prep/): taken when it is
# this very source, this model, and the language asked for (if any) is the one it detected. Still
# being made from this source: waited for, never made a second time at once.
if (a.source or not os.path.exists("voice.wav")) and os.path.isdir(".prep"):
    import time
    def alive(pid):
        try: os.kill(pid, 0); return True
        except Exception: return False
    try: job = json.load(open(".prep/words.lock"))
    except Exception: job = {}
    pid = int(job.get("pid") or 0)
    if pid and alive(pid) and job.get("path") == os.path.realpath(SRC) \
            and job.get("size") == os.stat(SRC).st_size and job.get("model") == a.model:
        print("the words are being transcribed since the video arrived: waiting for them…", flush=True)
        while os.path.exists(".prep/words.lock") and alive(pid): time.sleep(0.5)
    try:
        meta = json.load(open(".prep/words.meta.json"))
        if meta["source"] == ident(SRC) and meta["model"] == a.model and a.lang in (None, meta["language"]):
            words = json.load(open(".prep/words.json"))
            json.dump(words, open(a.out, "w"), ensure_ascii=False, indent=0)
            report(words, meta["language"], meta["prob"])
            print("  (transcribed when the video arrived)")
            sys.exit(0)
    except (OSError, ValueError, KeyError):
        pass

if a.source or not os.path.exists("voice.wav"):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-map", "0:a",
                    "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", ".asr.wav"], check=True)
    src = ".asr.wav"
else:
    src = "voice.wav"

m = WhisperModel(a.model, device="cpu", compute_type="int8")
segs, info = m.transcribe(src, language=a.lang, word_timestamps=True, vad_filter=False,
                          beam_size=5, condition_on_previous_text=False)
words = []
for s in segs:
    for w in (s.words or []):
        words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})

json.dump(words, open(a.out, "w"), ensure_ascii=False, indent=0)
report(words, info.language, info.language_probability)
if a.meta and src == ".asr.wav":
    json.dump({"source": ident(SRC), "model": a.model, "language": info.language,
               "prob": round(info.language_probability, 4), "words": len(words)}, open(a.meta, "w"))
if os.path.exists(".asr.wav"): os.remove(".asr.wav")
