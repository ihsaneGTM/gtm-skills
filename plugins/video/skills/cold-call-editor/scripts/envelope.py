"""Read the sound where the transcript is in doubt.

    py.sh envelope.py 39.6 41.4            # the 20 ms envelope, the words marked on it
    py.sh envelope.py --say 39.92 40.24 40.22 40.96    # what is said in each window, alone
    py.sh envelope.py --end 3.36           # where the phrase going on at 3.36 s stops

Raw seconds, on the clock of words.json. The envelope is how every onset of the reference
call was settled: syllables are bursts between dips, and a word whisper dated 0.7 s early
shows as a mark sitting in a hole. --say transcribes a window ALONE (padded with 0.3 s of
silence), which is how a burst is identified. --end is the measure of where speech stops
(the level back within 10 dB of the call's floor for 140 ms, the rule of the engine's
rough-cut.mjs): the hook's voice must run to it, or its last syllable is clipped ("list-"
instead of "listed" cost a review round).
"""
import argparse, os, sys
import numpy as np
from common import project, asr16k, envelope_db, words as load_words, fixed_words

ap = argparse.ArgumentParser()
ap.add_argument("span", nargs="*", type=float)
ap.add_argument("--say", action="store_true")
ap.add_argument("--end", type=float, default=None)
ap.add_argument("--lang", default=None)
a = ap.parse_args()

P = project()
x, sr = asr16k(P)

if a.end is not None:
    db = envelope_db(x, sr, 0.010)
    floor = np.percentile(db, 5)
    quiet = db < floor + 10
    f0, run = int(a.end / 0.010), 0
    for f in range(f0, len(db)):
        run = run + 1 if quiet[f] else 0
        if run == 14:
            end = (f - 13) * 0.010
            print(f"the phrase going on at {a.end:.2f} s stops at {end:.2f} s (floor {floor:.0f} dB, quiet = under {floor + 10:.0f} dB for 140 ms)")
            print(f"  hookTo ≈ {end + 0.04:.2f}  (its end + 40 ms of breath)")
            sys.exit(0)
    sys.exit("no pause found after that time")

if a.say:
    if len(a.span) % 2:
        sys.exit("--say takes pairs: a b [a b …]")
    import os as _o, sys as _s; _s.path.insert(0, _o.path.join(_o.path.dirname(_o.path.abspath(__file__)), "..", "..", "short-editor", "scripts"))
    from asr import WhisperModel  # the Mac's GPU when it has one (asr.py)
    m = WhisperModel("large-v3", device="cpu", compute_type="int8")
    lang = a.lang or P.get("lang")
    pad = np.zeros(int(0.3 * sr), np.float32)
    for k in range(0, len(a.span), 2):
        s0, s1 = a.span[k], a.span[k + 1]
        seg = np.concatenate([pad, x[int(s0 * sr):int(s1 * sr)], pad])
        segs, _ = m.transcribe(seg, language=lang, word_timestamps=True, beam_size=5, condition_on_previous_text=False)
        ws = [(q.word.strip(), round(s0 - 0.3 + q.start, 2), round(s0 - 0.3 + q.end, 2)) for s in segs for q in (s.words or [])]
        print(f"{s0:7.2f}-{s1:7.2f}: {' '.join(w for w, _, _ in ws) or '(nothing)'}   {ws}")
    sys.exit(0)

if len(a.span) != 2:
    sys.exit("give a window: envelope.py <from> <to>   (raw seconds)")
s0, s1 = a.span
W = load_words()
FW = fixed_words()
fixed = FW["words"] if FW else None
H = int(0.020 * sr)
rows = []
for t in np.arange(s0, s1, 0.02):
    seg = x[int(t * sr):int(t * sr) + H]
    d = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9) if len(seg) else -120
    bar = "#" * max(0, int((d + 60) / 3))
    m1 = [q["w"] for q in W if t <= q["s"] < t + 0.02]
    m2 = [f"{q['w']}·{q['who']}" for q in fixed if t <= q["a"] < t + 0.02] if fixed else []
    tag = ("w:" + ",".join(m1) + " " if m1 else "") + ("a:" + ",".join(m2) if m2 else "")
    rows.append(f"{t:7.2f}{d:5.0f} {bar:<20}{tag:<22}")
print("time   dB  level              w: transcript onset · a: measured onset·speaker")
for i in range(0, len(rows), 3):
    print(" | ".join(rows[i:i + 3]))
