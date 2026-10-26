# Prepares the Motionix pack for the engine (sfx.mjs reads 16-bit PCM WAV at 48 kHz): every sound
# decoded, resampled with ffmpeg's own resampler, trimmed to its sound, split when one file holds
# several, normalised to the same short-term loudness (K-weighted, 400 ms) with a -1 dBFS peak
# ceiling, dithered to 16 bits; kit.json says what each one is and where its transient sits.
import numpy as np, subprocess, os, json, wave, sys
from scipy.signal import lfilter
# python3 prepare.py "<the pack folder, as downloaded>" <out folder>
ROOT = sys.argv[1].rstrip("/") + "/"
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
SR = 48000
W = "Whooshes /"; U = "Ui Sound Effects /"
PACK = [
  ("Pop/Normal Pop.wav", "normal-pop", "pop", "split"),
  ("Pop/Premium And Smooth Pop.wav", "premium-pop", "pop", "split"),
  ("Pop/Meadia Pop.wav", "media-pop", "pop", None),
  ("Pop/Slow And Smooth Pop.wav", "slow-pop", "pop", None),
  ("Pop/Smooth Pop.wav", "smooth-pop", "pop", None),
  ("Pop/Sweet UI Open.wav", "sweet-ui-open", "pop", None),
  ("Clicks/Cinematic Click.wav", "cinematic-click", "click", None),
  ("Clicks/Click  (1).wav", "thump-click", "click", None),
  ("Clicks/Click 2.wav", "double-click", "click", None),
  ("Clicks/High Click.wav", "high-click", "click", None),
  ("Clicks/mouse-click-198485.wav", "mouse-click", "click", "split:0,1,2"),
  ("Camera Shutters/Camera Shutter.wav", "camera-shutter", "shutter", None),
  ("Camera Shutters/Little Bit Hard Cammera Shutter.wav", "hard-camera-shutter", "shutter", None),
  ("Camera Shutters/Smooth Cammera Shutter.wav", "smooth-camera-shutter", "shutter", None),
  ("Data Collect /Data Collect.wav", "data-collect", "data", None),
  ("Data Collect /Data Collect.mp3", "data-collect-2", "data", None),
  ("Data Collect /Cinematic Data Collect 2.wav", "cinematic-data-collect", "data", None),
  ("Data Collect / Cinematic data.wav", "cinematic-data", "data", None),
  ("Data Collect /MA_Tuttkile_Stopwatch_3.wav", "stopwatch", "data", None),
  ("Gear/Fast Gear.wav", "fast-gear", "gear", None),
  ("Gear/Fast Gear 2.mp3", "fast-gear-2", "gear", None),
  ("Gear/Smooth And Premium Gear.wav", "premium-gear", "gear", None),
  ("Gear/Soft Gear 1.wav", "soft-gear", "gear", None),
  ("Gear/Soft Gear 2.wav", "soft-gear-2", "gear", None),
  ("Gear/long speed gear.wav", "speed-gear", "gear", None),
  ("Gear/middle gear.wav", "middle-gear", "gear", None),
  ("Money /Cinematic Money 1.wav", "cinematic-money", "money", None),
  ("Money /Cinematic Money 2.wav", "cinematic-money-2", "money", None),
  ("Money /High Volume Money.wav", "money", "money", None),
  ("Money /Mediam Volume Mone.wav", "money-2", "money", None),
  ("Risers/Riser.wav", "riser", "riser", None),
  ("Risers/Riser 2.wav", "riser-2", "riser", None),
  ("Risers/Premium Riser.wav", "premium-riser", "riser", None),
  ("Risers/RJD Riser.wav", "rjd-riser", "riser", None),
  ("Risers/Smooth Riser.wav", "smooth-riser", "riser", None),
  (U + "Ui Open.wav", "ui-open", "ui", None),
  (U + "UI Premium Open.wav", "ui-premium-open", "ui", None),
  (U + "UI Beatbox Click 01.wav", "ui-beatbox-click", "ui", None),
  (U + "Uu Click Digital 01.wav", "ui-digital-click-1", "ui", None),
  (U + "Ui Click Digital 03.wav", "ui-digital-click-3", "ui", None),
  (U + "Ui Click Digital 04.wav", "ui-digital-click-4", "ui", None),
  (U + "Ui Digital Click.wav", "ui-digital-click", "ui", None),
  (U + "Ui Click.wma", "ui-click", "ui", None),
  (U + "Ui stretch.wav", "ui-stretch", "ui", None),
  (U + "Ui Enter.wav", "ui-enter", "ui", None),
  (U + "Ui Glitch Click.wav", "ui-glitch-click", "ui", None),
  (U + "Ui button.wav", "ui-button", "ui", None),
  (U + "Ui.wav", "ui", "ui", None),
  (U + "Ui Glitch, Flicker, Text  (2).wav", "ui-glitch-flicker", "ui", None),
  (U + "Ui Granular, Button, Select   (9).wav", "ui-select-2", "ui", None),
  (U + "Ui Granular, Button, Select.wav", "ui-select", "ui", None),
  (U + "Ui BackSpace.wav", "ui-backspace", "ui", None),
  (U + "v4) type & delete (2).wav", "ui-key", "ui", None),
  (U + "Ui Typing.wma", "ui-typing-short", "typing", None),
  (U + " Ui Typing.wma", "ui-typing", "typing", None),
  (W + " Cinematic Low Whoosh.wav", "cinematic-low-whoosh-2", "whoosh", None),
  (W + "Cinematic Low Whoosh.wav", "cinematic-low-whoosh", "whoosh", None),
  (W + "Cinematic Fast Normal Whoosh.wav", "cinematic-fast-normal-whoosh", "whoosh", None),
  (W + "Cinematic Fast Whoosh.wav", "cinematic-fast-whoosh", "whoosh", None),
  (W + "Cinematic Long Whoosh.wav", "cinematic-long-whoosh", "whoosh", "split"),
  (W + "Cinematic Mediam Whoosh.wav", "cinematic-medium-whoosh", "whoosh", None),
  (W + "Data_Whoosh.wav", "data-whoosh", "whoosh", None),
  (W + "Fast Whoosh .wav", "fast-whoosh-2", "whoosh", None),
  (W + "Fast Whoosh.wav", "fast-whoosh", "whoosh", None),
  (W + "High And Fast Whoosh.wav", "high-fast-whoosh", "whoosh", None),
  (W + "High And Fast Woosh.wav", "high-fast-whoosh-2", "whoosh", None),
  (W + "Long Whoosh.wav", "long-whoosh", "whoosh", None),
  (W + "Simple Whoosh 2.wav", "simple-whoosh-2", "whoosh", None),
  (W + "Simple Whoosh.wav", "simple-whoosh", "whoosh", None),
  (W + "Slow And Smooth Whoosh .wav", "smooth-whoosh", "whoosh", None),
  (W + "Smooth And Fast Whoosh.wav", "smooth-fast-whoosh", "whoosh", None),
  (W + "Whoosh Deep Light 2.wav", "deep-light-whoosh", "whoosh", None),
  (W + "Whoosh Deep Short.wav", "deep-short-whoosh", "whoosh", None),
  (W + "epic-fast-whoosh-345469.mp3", "epic-fast-whoosh", "whoosh", None),
]
TEXTURE = {"cinematic-data-collect", "cinematic-data", "stopwatch", "fast-gear", "fast-gear-2", "ui-typing", "ui-typing-short", "ui-premium-open", "ui-open"}

def dec(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-af", "aresample=48000:filter_size=64:phase_shift=10:cutoff=0.97",
                          "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
def envdb(m, hop):
    n = len(m) // hop
    e = np.sqrt((m[:n * hop].reshape(n, hop) ** 2).mean(axis=1)) + 1e-12
    return 20 * np.log10(e / e.max()), e
def events(m, on=-24, gap=0.2):
    hop = 48; db, _ = envdb(m, hop); n = len(db)
    runs = []; i = 0
    while i < n:
        if db[i] > on:
            j = i
            while j < n and db[j] > on: j += 1
            runs.append([i, j]); i = j
        else: i += 1
    merged = []
    for r in runs:
        if merged and (r[0] - merged[-1][1]) * hop / SR < gap: merged[-1][1] = r[1]
        else: merged.append(r)
    return [(a * hop / SR, b * hop / SR) for a, b in merged]
def kweight(x):
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)
def momentary_max(x):
    k = kweight(np.pad(x, ((int(0.4 * SR), int(0.4 * SR)), (0, 0))))
    p = (k ** 2).sum(axis=1)                       # channel sum (stereo, weights 1)
    c = np.cumsum(np.concatenate([[0], p])); w = int(0.4 * SR); hop = int(0.01 * SR)
    ms = [(c[i + w] - c[i]) / w for i in range(0, len(p) - w, hop)]
    return -0.691 + 10 * np.log10(max(ms) + 1e-15)
def write(path, x):
    ch = x.shape[1]
    tp = (np.random.rand(*x.shape) - np.random.rand(*x.shape))   # TPDF dither, 1 LSB
    q = np.clip(np.round(x * 32767 + tp), -32768, 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR); w.writeframes(q.tobytes())

TARGET = -20.0
kit = {}
for src, name, role, split in PACK:
    x = dec(ROOT + src); m = x.mean(axis=1)
    segs = []
    if split:
        ev = events(m)
        pick = [int(v) for v in split.split(":")[1].split(",")] if ":" in split else range(len(ev))
        for k, i in enumerate(pick):
            a, b = ev[i]
            lim = ev[i + 1][0] - 0.02 if i + 1 < len(ev) else len(m) / SR
            segs.append((f"{name}-{k + 1}", max(0, a - 0.012), lim))
    else:
        segs.append((name, 0, len(m) / SR))
    for nm, a, b in segs:
        y = x[int(a * SR):int(b * SR)].copy(); ym = y.mean(axis=1)
        db, _ = envdb(ym, 48)
        on = np.argmax(db > -42) * 48 / SR
        last = (len(db) - 1 - np.argmax(db[::-1] > (-45 if role in ("whoosh", "riser") else -48 if split else -52))) * 48 / SR
        if role == "click": last = min(last, 0.6)
        s0 = max(0, on - 0.012); s1 = min(len(ym) / SR, last + 0.03)
        y = y[int(s0 * SR):int(s1 * SR)]
        fi = int(0.002 * SR) if a + s0 > 0 else 0; fo = min(int(0.015 * SR), len(y) // 4)
        if fi: y[:fi] *= np.linspace(0, 1, fi)[:, None]
        y[-fo:] *= np.linspace(1, 0, fo)[:, None]
        S, M = (y[:, 0] - y[:, 1]) / 2, (y[:, 0] + y[:, 1]) / 2
        sm = float(np.sqrt((S ** 2).mean()) / (np.sqrt((M ** 2).mean()) + 1e-12))
        if sm < 0.03: y = M[:, None]
        L = momentary_max(y if y.shape[1] == 2 else np.repeat(y, 2, axis=1) / np.sqrt(2) * np.sqrt(2))
        g = 10 ** ((TARGET - L) / 20)
        pk = np.abs(y).max() * g
        if pk > 10 ** (-1 / 20): g *= 10 ** (-1 / 20) / pk
        y = y * g
        Lf = momentary_max(y if y.shape[1] == 2 else np.repeat(y, 2, axis=1))
        yy = y.mean(axis=1)
        # where it lands: a whoosh or a riser on its crest, a texture on its onset, the rest on
        # its first transient (the first ms within 6 dB of the loudest)
        if role in ("whoosh", "riser") and nm != "rjd-riser":
            d30, _ = envdb(yy, int(0.03 * SR)); al = (np.argmax(d30) + 0.5) * 0.03
        elif nm in TEXTURE:
            d5, _ = envdb(yy, 240); al = np.argmax(d5 > -24) * 240 / SR
        else:
            d1, _ = envdb(yy, 48); al = np.argmax(d1 > -6) * 48 / SR
        # a whoosh is over 1.8 s after its crest: a long noise tail is inaudible in a mix, and heavy
        if role == "whoosh" and len(y) > int((al + 1.8) * SR):
            y = y[:int((al + 1.8) * SR)].copy(); fo2 = int(0.3 * SR); y[-fo2:] *= np.linspace(1, 0, fo2)[:, None]
        f = f"{nm}.wav"
        write(os.path.join(OUT, f), y)
        kit[nm] = {"file": f, "role": role, "from": src.replace(" /", "/").strip(), "dur": round(len(y) / SR, 3), "align": round(float(al), 3),
                   "lm": round(float(Lf), 1), "peak": round(float(20 * np.log10(np.abs(y).max() + 1e-12)), 1), "ch": y.shape[1]}
        print(f"{nm:30s} {role:8s} dur {len(y)/SR:6.3f} align {al:6.3f} M {Lf:6.1f} pk {20*np.log10(np.abs(y).max()):5.1f} ch {y.shape[1]}")
json.dump(kit, open(os.path.join(OUT, "kit.json"), "w"), indent=1)
tot = sum(os.path.getsize(os.path.join(OUT, v["file"])) for v in kit.values())
print(len(kit), "sounds", round(tot / 1e6, 1), "MB")
