"""The words, each on its measured onset and with its speaker: assets/words-fixed.json.

    py.sh onsets.py

Whisper put words of the reference call up to 0.9 s early, inside a silence. A word whose
onset falls in a silence (its level 17.5 dB under the call's median speech level) is moved
to the first syllable attack after it on the 10 ms envelope (a rise of 8 dB out of the
local dip, at least 3 dB in one frame), never past the next word + 0.3 s. Every other
onset is the transcript's. The speaker of each word comes from diarize.py
(tmp/speakers.json); the turns are the runs of words of one speaker.

What this cannot fix — a word whisper dated inside another word, a burst it merged —
is found by realign.py and read on the envelope with envelope.py; the onset is then pinned
in project.json `onsetFix` ({"14": 4.40}: raw seconds), applied here, so the record, the
turns, the voice levels and the glitch bursts all hang on the same onset. Note the
measurement beside it in project.json `onsetNotes` (what was heard, on which burst).

The voice of a word is the model's, unless project.json `speakerFix` says otherwise
({"85": "A", "234": "A"}): a word the model flipped inside a sentence of the other voice
(diarize.py marks such a turn with "!"), and above all a word said OVER the other voice —
"Absolutely." said by the caller under the prospect's sentence scores as the louder voice.
Those are read in the transcript, never guessed, and the fix stays in project.json so a new
run of diarize.py does not lose it.
"""
import json, os, sys
import numpy as np
from common import project, asr16k, envelope_db, words as load_words

P = project()
W = load_words()
if not os.path.exists("tmp/speakers.json"):
    sys.exit("tmp/speakers.json missing: run diarize.py first (who speaks when)")
S = json.load(open("tmp/speakers.json"))["words"]
if len(S) != len(W):
    sys.exit("tmp/speakers.json does not match words.json (re-transcribed since?): run diarize.py again")

x, sr = asr16k(P)
db = envelope_db(x, sr)
n = len(db)
T = lambda f: f * 0.010
Fr = lambda s: int(round(s / 0.010))
floor = np.percentile(db, 5)
speech = float(np.percentile(db[db > floor + 10], 50))
QUIET, ATTACK = speech - 17.5, speech - 21.5          # -40 / -44 dB on the reference call

def attack_after(s, limit):
    for f in range(max(3, Fr(s)), min(n - 1, Fr(limit))):
        loc = db[max(0, f - 15):f].min()
        if db[f] > ATTACK and db[f] - loc > 8 and db[f] > db[f - 1] + 3:
            return T(f)
    return None

FIXW = {int(k): v for k, v in (P.get("speakerFix") or {}).items()}
for k, v in FIXW.items():
    if v not in ("A", "B") or not 0 <= k < len(W):
        sys.exit(f"speakerFix {k}: {v} — a word index of words.json and A or B")
ONSET = {int(k): v for k, v in (P.get("onsetFix") or {}).items()}
# a pinned word is scored again on where it really is: the model scored the transcript's span
LLR = np.load("tmp/llr.npy") if os.path.exists("tmp/llr.npy") else None
def rescore(a, e):
    t, llr, voiced = LLR[0], LLR[2], LLR[4] > 0
    m = (t >= a) & (t < max(e, a + 0.15)) & voiced
    v = float(llr[m].mean()) if m.any() else 0.0
    return ("A" if v > 0 else "B") if abs(v) > 0.5 else None
out = []
for i, q in enumerate(W):
    s = q["s"]
    nxt = W[i + 1]["s"] if i + 1 < len(W) else s + 1
    lvl = db[Fr(s):Fr(s) + 3].max() if Fr(s) + 3 < n else -120
    a = s
    if lvl < QUIET:                                    # the transcript put it in a silence
        hit = attack_after(s, min(nxt + 0.3, s + 1.6))
        if hit is not None:
            a = hit
    o = {"i": i, "w": q["w"], "s": s, "e": q["e"], "a": round(a, 3), "who": S[i]["who"]}
    if i in ONSET:
        o["a"], o["pinned"] = round(float(ONSET[i]), 3), True
        if LLR is not None:
            o["who"] = rescore(o["a"], q["e"]) or o["who"]
    if i in FIXW:
        o["who"] = FIXW[i]
    out.append(o)

turns = []
for o in out:
    if turns and turns[-1][0] == o["who"]:
        turns[-1][2] = round(max(turns[-1][2], o["e"]), 3)
    else:
        turns.append([o["who"], o["a"], round(o["e"], 3)])

os.makedirs("assets", exist_ok=True)
json.dump({"speed": P.get("speed", 1), "speech": round(speech, 1), "turns": turns, "words": out},
          open("assets/words-fixed.json", "w"), indent=0)
if FIXW:
    print("speakerFix (read, not measured): " + " · ".join(f"{W[k]['w']}({k})→{v}" for k, v in sorted(FIXW.items())))
moved = [o for o in out if abs(o["a"] - o["s"]) > 0.06 and not o.get("pinned")]
print(f"assets/words-fixed.json: {len(out)} words · speech median {speech:.1f} dB · {len(turns)} turns · "
      f"{len(ONSET)} onset(s) pinned (onsetFix) · {len(moved)} moved out of a silence:")
for o in moved:
    print(f"  {o['i']:4d} {o['w']:<14} {o['s']:7.2f} → {o['a']:7.2f}  ({o['who']})")
