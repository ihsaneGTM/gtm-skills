"""The voice, per OUTPUT frame and per side: assets/call.json, what the wave line draws.

    py.sh levels.py

The level is the raw take's (tmp/asr16k.wav), a 10 ms RMS envelope mapped between the
call's floor and its loud speech (-52 and -10 dB on the reference: 29.5 dB under and
12.5 dB over the median speech level), followed like a VU meter (fast attack 0.55, slow
release 0.10 per 10 ms). Each output frame goes to the side whose turn it is (the turns of
assets/words-fixed.json: a word said over the other voice is a turn of its own); in a
pause, the last one to speak. Nothing during the ringing. Run it again after every
assemble.py: it reads the clocks of project.json `assembly`.
"""
import json, math, sys
import numpy as np
from common import project, asr16k, envelope_db, fixed_words, Clocks

P = project()
FW = fixed_words()
if not FW:
    sys.exit("assets/words-fixed.json missing: run diarize.py then onsets.py")
if "assembly" not in P:
    sys.exit("project.json has no `assembly` yet: choose the hook first (SKILL.md § 4)")
K = Clocks(P)
FPS = P.get("fps", 60)
x, sr = asr16k(P)
db = envelope_db(x, sr)
n = len(db)
speech = FW.get("speech", -22.5)
floor, top = speech - 29.5, speech + 12.5
lin = np.clip((db - floor) / (top - floor), 0, 1)
env = np.zeros(n); g = 0.0
for f in range(n):
    v = lin[f]; g = g + (v - g) * (0.55 if v > g else 0.10); env[f] = g

TURNS = FW["turns"]
def who(r):
    last = TURNS[0][0] if TURNS else "A"
    for k, s0, s1 in TURNS:
        if s0 <= r < s1: return k
        if s0 <= r: last = k
    return last

NOUT = int(math.ceil(P["duration"] * FPS)) + 2
A_ = np.zeros(NOUT); B_ = np.zeros(NOUT)
for j in range(NOUT):
    r = K.raw_of_asm(j / FPS * K.SP)
    if r is None or r < 0: continue
    f = min(n - 1, int(round(r / 0.010)))
    (A_ if who(r) == "A" else B_)[j] = env[f]

turns = []
for k, s0, s1 in TURNS:
    if K.hook_from <= s0 < K.hook_to:           # a turn of the hook: on the hook's clock, cut where it ends
        turns.append([k, round(K.out_hook(s0), 3), round(K.out_hook(min(s1, K.hook_to)), 3)])
    if s1 > K.resume and (K.end is None or s0 < K.end):
        turns.append([k, round(K.out_call(max(s0, K.resume)), 3), round(K.out_call(s1 if K.end is None else min(s1, K.end)), 3)])
turns.sort(key=lambda t: t[1])
json.dump({"fps": FPS, "speed": K.SP, "a": [round(v, 3) for v in A_], "b": [round(v, 3) for v in B_], "turns": turns},
          open("assets/call.json", "w"))
print(f"assets/call.json: {NOUT} frames · A talking {np.mean(A_ > 0.05) * 100:.0f} % · B {np.mean(B_ > 0.05) * 100:.0f} % · "
      f"{len(turns)} turns on the output clock")
