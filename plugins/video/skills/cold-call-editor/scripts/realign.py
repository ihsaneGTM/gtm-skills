"""A second opinion on the onsets: whisper again, on short chunks, compared word by word.

    py.sh realign.py [--lang en]

On the reference call the transcript of the whole file and a pass on 27 short chunks
(cut in the measured silences, 1.5-7 s each, padded 0.25 s) disagreed by more than 80 ms
on 58 words, by up to a second. Where they disagree, neither is trusted: the word is read
on the envelope (envelope.py) and, if it opens a line or carries a sound, pinned in
plan.mjs `FIX` with the measurement in a comment. Takes a few minutes (large-v3, CPU).
Writes tmp/realign.json.
"""
import argparse, json, sys
import numpy as np
from common import project, asr16k, fixed_words

ap = argparse.ArgumentParser()
ap.add_argument("--lang", default=None)
a = ap.parse_args()
P = project()
FW = fixed_words()
if not FW:
    sys.exit("assets/words-fixed.json missing: run onsets.py first")
WF = FW["words"]
x, sr = asr16k(P)
import os as _o, sys as _s; _s.path.insert(0, _o.path.join(_o.path.dirname(_o.path.abspath(__file__)), "..", "..", "short-editor", "scripts"))
from asr import WhisperModel  # the Mac's GPU when it has one (asr.py)

HOP = 80                                                   # 5 ms
n = len(x) // HOP
fr = x[: n * HOP].reshape(n, HOP)
db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
quiet = db < FW.get("speech", -22.5) - 27.5               # -50 dB on the reference call
cuts, run = [0.0], 0
for f in range(n):
    run = run + 1 if quiet[f] else 0
    if run == 24:                                          # 120 ms of quiet: a cut in its middle
        cuts.append((f - 12) * HOP / sr)
cuts.append(len(x) / sr)
chunks, s0 = [], cuts[0]
for c in cuts[1:]:
    if c - s0 >= 1.5 or c == cuts[-1]:
        chunks.append((s0, c)); s0 = c
m = WhisperModel("large-v3", device="cpu", compute_type="int8")
lang = a.lang or P.get("lang")
alt = []
for c0, c1 in chunks:
    t0, t1 = max(0, c0 - 0.25), min(len(x) / sr, c1 + 0.25)
    segs, _ = m.transcribe(x[int(t0 * sr):int(t1 * sr)], language=lang, word_timestamps=True, beam_size=5,
                           condition_on_previous_text=False, vad_filter=False)
    for s in segs:
        for q in (s.words or []):
            alt.append({"w": q.word.strip().lower().strip(".,?!"), "s": round(t0 + q.start, 3)})
print(f"{len(chunks)} chunks · {len(alt)} words in the second pass (first pass {len(WF)})")
norm = lambda s: "".join(ch for ch in s.lower() if ch.isalnum())
A = [norm(q["w"]) for q in WF]; B = [norm(q["w"]) for q in alt]
na, nb = len(A), len(B)
dp = np.zeros((na + 1, nb + 1), int); dp[:, 0] = np.arange(na + 1); dp[0, :] = np.arange(nb + 1)
for i in range(1, na + 1):
    for j in range(1, nb + 1):
        dp[i, j] = min(dp[i - 1, j] + 1, dp[i, j - 1] + 1, dp[i - 1, j - 1] + (0 if A[i - 1] == B[j - 1] else 1))
i, j, pair = na, nb, {}
while i > 0 and j > 0:
    if dp[i, j] == dp[i - 1, j - 1] + (0 if A[i - 1] == B[j - 1] else 1):
        if A[i - 1] == B[j - 1]: pair[i - 1] = j - 1
        i, j = i - 1, j - 1
    elif dp[i, j] == dp[i - 1, j] + 1: i -= 1
    else: j -= 1
out = [{"i": k, "w": q["w"], "a1": q["a"], "a2": alt[pair[k]]["s"] if k in pair else None} for k, q in enumerate(WF)]
json.dump(out, open("tmp/realign.json", "w"), indent=0)
dis = [o for o in out if o["a2"] is not None and abs(o["a2"] - o["a1"]) > 0.08]
print(f"matched {len(pair)} · disagree by more than 80 ms: {len(dis)} (read them on the envelope before trusting either)")
for o in dis:
    print(f"  {o['i']:4d} {o['w']:<14} pass 1 {o['a1']:7.2f}  pass 2 {o['a2']:7.2f}  ({o['a2'] - o['a1']:+.2f})")
