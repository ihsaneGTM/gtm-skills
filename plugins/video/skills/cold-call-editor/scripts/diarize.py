"""Who speaks when, MEASURED: the two voices of the call told apart by their timbre.

    py.sh diarize.py --auto                       # proposes training stretches, labels nothing
    py.sh diarize.py --seed A:5.0-12.6,25.4-33.9,45.5-61.0 --seed B:15.3-23.2,35.2-43.3,65.0-83.3
    py.sh diarize.py --channels --left A          # a recorder that put each voice on its own channel

A is the CALLER (the user's side: yellow on screen), B the person called (white).

The method that held on the reference call (98-100 % on 300 ms windows, held out):
25 ms frames, 10 ms hop, 26 mel bands 250-3600 Hz (the phone band), 13 MFCCs (c0
dropped: it is the level, not the voice) with cepstral mean normalisation over the call,
plus deltas; one 8-component diagonal Gaussian mixture per voice, trained on stretches
whose speaker is CERTAIN FROM THE CONTENT. Read the transcript to pick them: who
introduces themself, who asks "who is this?", who explains the product. Two or three
stretches a voice, 5-15 s each, away from the turn changes. Every voiced frame then gets
a log-likelihood ratio (> 0: A), every word the mean ratio of its voiced frames.

--auto groups the breath groups (speech between two real pauses) into two clusters by
their mean timbre and prints them with their words: it PROPOSES stretches, it does not
decide which voice is the caller. That is read, then passed back with --seed.

Writes tmp/speakers.json (one entry per word of words.json; onsets.py reads it) and
tmp/llr.npy (t, E, llr, smoothed llr, voiced).
"""
import argparse, json, os, subprocess, wave, sys
import numpy as np
from common import project, raw_source, asr16k, words as load_words

ap = argparse.ArgumentParser()
ap.add_argument("--seed", action="append", default=[], help="A:a-b,c-d (raw seconds)")
ap.add_argument("--auto", action="store_true")
ap.add_argument("--channels", action="store_true", help="label each word by the louder channel")
ap.add_argument("--left", default="A", choices=["A", "B"], help="with --channels: who is on the left channel")
ap.add_argument("--words", action="store_true", help="print every word, not only the turns")
a = ap.parse_args()

P = project()
W = load_words()
x, sr = asr16k(P)
rng = np.random.default_rng(0)

# --- is it two channels with a voice each? ------------------------------------------------
def stereo_check():
    ch = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels",
                         "-of", "csv=p=0", raw_source(P)], capture_output=True, text=True).stdout.strip()
    if ch != "2":
        return None
    out = "tmp/stereo16k.wav"
    if not os.path.exists(out):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw_source(P), "-map", "0:a:0", "-ar", "16000",
                        "-c:a", "pcm_s16le", out], check=True)
    w = wave.open(out, "rb")
    s = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32).reshape(-1, 2) / 32768
    return s

ST = stereo_check()
if ST is not None:
    corr = float(np.corrcoef(ST[:, 0], ST[:, 1])[0, 1])
    print(f"stereo source: L/R correlation {corr:.3f}" + (
        "  → the channels differ: the recorder may have put one voice on each; try --channels" if corr < 0.9 else
        "  (the same sound on both channels: the timbre decides)"))

def word_span(q):
    return q["s"], max(q["e"], q["s"] + 0.12)

# --- --channels: the louder channel says who ------------------------------------------------
if a.channels:
    if ST is None:
        sys.exit("--channels needs a stereo source")
    right = "B" if a.left == "A" else "A"
    out = []
    for i, q in enumerate(W):
        s0, s1 = word_span(q)
        seg = ST[int(s0 * 16000):int(s1 * 16000)]
        if len(seg) < 160:
            out.append({"i": i, "w": q["w"], "s": q["s"], "e": q["e"], "who": None, "score": 0.0, "sure": False}); continue
        lv = 20 * np.log10(np.sqrt((seg ** 2).mean(0)) + 1e-9)
        d = float(lv[0] - lv[1])
        out.append({"i": i, "w": q["w"], "s": q["s"], "e": q["e"], "who": a.left if d > 0 else right,
                    "score": round(d, 2), "sure": abs(d) > 3})
    method, acc = "channels", {}
    T = E = llr = sm = voiced = None
else:
    # --- MFCC + deltas ----------------------------------------------------------------------
    xp = np.append(x[0], x[1:] - 0.97 * x[:-1])
    N, HOP, NFFT = 400, 160, 512
    nf = (len(xp) - N) // HOP
    idx = np.arange(N)[None, :] + HOP * np.arange(nf)[:, None]
    fr = xp[idx] * np.hamming(N)
    Pw = np.abs(np.fft.rfft(fr, NFFT)) ** 2
    E = 10 * np.log10(Pw.sum(1) / NFFT + 1e-12)
    mel = lambda f: 2595 * np.log10(1 + f / 700)
    imel = lambda m: 700 * (10 ** (m / 2595) - 1)
    pts = imel(np.linspace(mel(250), mel(3600), 28))
    bins = np.floor((NFFT + 1) * pts / sr).astype(int)
    fb = np.zeros((26, NFFT // 2 + 1))
    for j in range(26):
        b0, b1, b2 = bins[j], bins[j + 1], bins[j + 2]
        fb[j, b0:b1] = (np.arange(b0, b1) - b0) / max(1, b1 - b0)
        fb[j, b1:b2] = (b2 - np.arange(b1, b2)) / max(1, b2 - b1)
    L = np.log(Pw @ fb.T + 1e-10)
    n = np.arange(26)
    dct = np.cos(np.pi * np.arange(14)[:, None] * (2 * n[None, :] + 1) / 52)
    C = (L @ dct.T)[:, 1:14]
    C -= C.mean(0)                           # the same line for both voices: normalise it away
    D = np.zeros_like(C); D[2:-2] = (C[4:] - C[:-4] + 2 * (C[3:-1] - C[1:-3])) / 10
    F = np.hstack([C, D])
    T = (np.arange(nf) * HOP + N / 2) / sr
    voiced = E > np.percentile(E, 30)

    def mask(spans):
        m = np.zeros(nf, bool)
        for s0, s1 in spans:
            m |= (T >= s0) & (T < s1)
        return m & voiced

    if a.auto:
        # breath groups: speech between pauses of >= 140 ms within 10 dB of the floor
        floor = np.percentile(E, 5)
        quiet = E < floor + 10
        groups, start, q = [], None, 0
        for k in range(nf):
            if quiet[k]:
                q += 1
                if q == 14 and start is not None:
                    groups.append((start, k - 14)); start = None
            else:
                if start is None: start = k
                q = 0
        if start is not None: groups.append((start, nf - 1))
        G = []
        for g0, g1 in groups:
            t0, t1 = T[g0], T[g1]
            m = np.zeros(nf, bool); m[g0:g1 + 1] = True; m &= voiced
            if t1 - t0 < 0.6 or m.sum() < 30: continue
            G.append((t0, t1, C[m].mean(0)))
        if len(G) < 4:
            sys.exit("too little speech to propose anything: pick the stretches by reading the transcript")
        X = np.array([g[2] for g in G]); X = (X - X.mean(0)) / (X.std(0) + 1e-6)
        d = ((X[:, None, :] - X[None, :, :]) ** 2).sum(2)
        i0, i1 = np.unravel_index(np.argmax(d), d.shape)
        cen = X[[i0, i1]].copy()
        for _ in range(30):
            lab = ((X[:, None, :] - cen[None]) ** 2).sum(2).argmin(1)
            for k in (0, 1):
                if (lab == k).any(): cen[k] = X[lab == k].mean(0)
        print(f"\n{len(G)} breath groups of 0.6 s or more, in two clusters of timbre:")
        for k in (0, 1):
            sel = [g for g, l in zip(G, lab) if l == k]
            tot = sum(g[1] - g[0] for g in sel)
            print(f"\n── cluster {k + 1}: {len(sel)} groups, {tot:.0f} s of speech")
            for t0, t1, _ in sel:
                ws = [q["w"] for q in W if t0 - 0.1 <= q["s"] < t1]
                print(f"  {t0:6.2f}-{t1:6.2f}  {' '.join(ws[:16])}{' …' if len(ws) > 16 else ''}")
        print("\nproposed stretches (the three longest groups of each cluster):")
        for k in (0, 1):
            sel = sorted([g for g, l in zip(G, lab) if l == k], key=lambda g: g[0] - g[1])[:3]
            sel.sort(key=lambda g: g[0])
            print(f"  cluster {k + 1}:  " + ",".join(f"{g[0]:.1f}-{g[1]:.1f}" for g in sel))
        print("\nREAD them: which cluster is the caller (A)? A cluster can mix both voices; keep only")
        print("stretches whose speaker is certain from what is said, then run --seed A:… --seed B:…")
        sys.exit(0)

    seeds = {}
    for s in a.seed:
        who, spans = s.split(":", 1)
        seeds[who.strip().upper()] = [tuple(float(v) for v in p.split("-")) for p in spans.split(",") if p.strip()]
    if set(seeds) != {"A", "B"}:
        sys.exit("give both voices: --seed A:a-b,… --seed B:a-b,…  (or --auto to get a proposal)")

    def gmm(X, k=8, it=25):
        mu = X[rng.choice(len(X), k, replace=False)]
        var = np.tile(X.var(0), (k, 1)); pi = np.ones(k) / k
        for _ in range(it):
            lp = -0.5 * (((X[:, None, :] - mu) ** 2 / var).sum(2) + np.log(var).sum(1)) + np.log(pi)
            m = lp.max(1, keepdims=True); r = np.exp(lp - m); r /= r.sum(1, keepdims=True)
            nk = r.sum(0) + 1e-6
            mu = (r.T @ X) / nk[:, None]
            var = (r.T @ (X ** 2)) / nk[:, None] - mu ** 2 + 1e-3
            pi = nk / nk.sum()
        return mu, var, pi

    def score(g, X):
        mu, var, pi = g
        lp = -0.5 * (((X[:, None, :] - mu) ** 2 / var).sum(2) + np.log(var).sum(1)) + np.log(pi)
        m = lp.max(1)
        return m + np.log(np.exp(lp - m[:, None]).sum(1))

    mA, mB = mask(seeds["A"]), mask(seeds["B"])
    if mA.sum() < 200 or mB.sum() < 200:
        sys.exit(f"too few voiced frames to train ({mA.sum()} A, {mB.sum()} B): give longer stretches")
    gA, gB = gmm(F[mA]), gmm(F[mB])
    llr = score(gA, F) - score(gB, F)
    llr[~voiced] = 0
    k = 30
    num = np.convolve(llr, np.ones(k), "same"); den = np.convolve(voiced.astype(float), np.ones(k), "same")
    sm = np.where(den > 3, num / np.maximum(den, 1), 0)
    acc = {"frameA": float(np.mean(llr[mA] > 0)), "frameB": float(np.mean(llr[mB] < 0)),
           "win300A": float(np.mean(sm[mA] > 0)), "win300B": float(np.mean(sm[mB] < 0))}
    print(f"frame accuracy   A {acc['frameA'] * 100:.0f} % · B {acc['frameB'] * 100:.0f} %")
    print(f"300 ms accuracy  A {acc['win300A'] * 100:.0f} % · B {acc['win300B'] * 100:.0f} %")
    # held out: trained without the last stretch of each voice, tested on it
    if len(seeds["A"]) >= 2 and len(seeds["B"]) >= 2:
        gA2, gB2 = gmm(F[mask(seeds["A"][:-1])]), gmm(F[mask(seeds["B"][:-1])])
        l2 = score(gA2, F) - score(gB2, F); l2[~voiced] = 0
        n2 = np.convolve(l2, np.ones(k), "same"); s2 = np.where(den > 3, n2 / np.maximum(den, 1), 0)
        hA, hB = float(np.mean(s2[mask(seeds["A"][-1:])] > 0)), float(np.mean(s2[mask(seeds["B"][-1:])] < 0))
        acc.update(heldA=hA, heldB=hB)
        print(f"held-out 300 ms  A {hA * 100:.0f} % · B {hB * 100:.0f} %" +
              ("" if min(hA, hB) >= 0.9 else "   ⚠ under 90 %: the stretches are not clean, or the voices are close; read the turns below"))
    out = []
    for i, q in enumerate(W):
        s0, s1 = word_span(q)
        m = (T >= s0) & (T < s1) & voiced
        v = float(llr[m].mean()) if m.any() else 0.0
        out.append({"i": i, "w": q["w"], "s": q["s"], "e": q["e"], "who": "A" if v > 0 else "B" if v < 0 else None,
                    "score": round(v, 2), "sure": abs(v) > 0.5})
    method = "mfcc-gmm"

# an unsure word takes the side of the nearest sure one (the turn it sits in)
sure = [o for o in out if o["sure"] and o["who"]]
for o in out:
    if not o["sure"] or not o["who"]:
        if sure:
            near = min(sure, key=lambda s: abs(s["s"] - o["s"]))
            o["who"] = near["who"]

# the turns, for reading
turns, cur = [], None
for o in out:
    if cur and cur["who"] == o["who"]:
        cur["words"].append(o)
    else:
        cur = {"who": o["who"], "words": [o]}; turns.append(cur)
print(f"\n{len(turns)} turns ({method}); '?' marks a word the model was unsure of, '!' a turn to check:")
for tn in turns:
    ws = tn["words"]
    flag = "!" if len(ws) <= 2 and max(abs(o["score"]) for o in ws) < 1.5 else " "
    txt = " ".join(o["w"] + ("?" if not o["sure"] else "") for o in ws)
    print(f"{flag} {tn['who']}  {ws[0]['s']:6.2f}-{ws[-1]['e']:6.2f}  [{ws[0]['i']}-{ws[-1]['i']}]  {txt[:150]}{' …' if len(txt) > 150 else ''}")
if a.words:
    for o in out:
        print(f"{o['i']:4d} {o['s']:7.2f} {o['w']:<16} {o['who']} {o['score']:+6.2f}{'' if o['sure'] else '  ?'}")

os.makedirs("tmp", exist_ok=True)
json.dump({"method": method, "seeds": None if a.channels else seeds, "accuracy": acc, "words": out},
          open("tmp/speakers.json", "w"), indent=0)
if not a.channels:
    np.save("tmp/llr.npy", np.stack([T, E, llr, sm, voiced.astype(float)]))
print(f"\ntmp/speakers.json: {sum(o['who'] == 'A' for o in out)} words A · {sum(o['who'] == 'B' for o in out)} words B"
      f" · {sum(not o['sure'] for o in out)} unsure. Next: py.sh onsets.py")
