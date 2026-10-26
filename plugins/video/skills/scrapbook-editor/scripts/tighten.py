#!/usr/bin/env python3
"""THE JUMP CUT of the scrapbook language: every pause of the take goes.

    py.sh tighten.py                 # measure, cut, write source/tight.mov; project.json and words repointed
    py.sh tighten.py --dry-run       # print what it would cut, change nothing
    py.sh tighten.py --keep 0.10     # leave 0.10 s of silence at each join (default 0.10)
    py.sh tighten.py --min-pause 0.16

On the reference edit, the longest silence left between two phrases is 0.32 s and most joins keep
under 0.12 s: the speaker never breathes on screen. Each join is a JUMP CUT (the picture jumps,
nothing hides it): that is the style, not a flaw to cover.

How it is measured (the engine's rule: where speech stops is MEASURED, never read off whisper):
a 10 ms RMS envelope of the take; the room tone is its 10th percentile; speech is confirmed at
room + 12 dB and its edges walked out to room + 5 dB (hysteresis, so a soft attack is not
clipped). A pause is a gap between two speech regions of at least --min-pause; it is cut down to
--keep seconds: 0.06 s after the last sound, 0.04 s before the next one (a breath of room tone on
each side, never a clipped word). Whisper is a guard, not a judge: an onset it puts inside a
measured silence is kept out of the cut only when a soft sound is under it (see below).

WHY AN ASSEMBLY, NOT project.json `cuts`. The engine can cut a take on the fly (cuts.mjs), but a
project with cuts cannot be rendered by slices (build.sh --slice refuses to cross them), and the
slices are how a moment is looked at in motion and how options are compared from the GTM by
Pipecorn page. So the kept stretches are written once into source/tight.mov, WHOLE FRAMES ONLY
(the picture and the voice of each stretch last exactly as long: unsnapped, 13 joins once put the
lips 2 frames behind the voice), the picture at the source's bit depth with its colour tags (never
a regrade), the sound as PCM. Then, as the engine's rough-cut.mjs --adopt does:
  project.json   source → the assembly, rawSource → the take, duration, cuts removed, `tightened`
  words.json     the words on the assembly's clock (exact: mapped through the kept stretches);
                 the take's transcript stays in words.raw.json
  shots.json     the shots of the output, between two joins (plan.mjs lands its pictures on them)
It always starts again from the TAKE (rawSource, words.raw.json): running it twice is safe.
Manual cuts: project.json `manualCuts`, seconds of the take.
"""
import argparse, json, math, os, shutil, subprocess, sys
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("--min-pause", type=float, default=0.16, help="a gap shorter than this is not touched (s)")
ap.add_argument("--keep", type=float, default=0.10, help="silence left at each join (s): 60 %% after, 40 %% before")
ap.add_argument("--hi", type=float, default=12.0, help="speech confirmed at room + hi dB")
ap.add_argument("--lo", type=float, default=5.0, help="speech edges walked out to room + lo dB")
ap.add_argument("--out", default="source/tight.mov")
ap.add_argument("--dry-run", action="store_true")
a = ap.parse_args()

P = json.load(open("project.json"))
RAW = P.get("rawSource") or P["source"]
if not os.path.exists(RAW):
    sys.exit(f"the take is not there: {RAW}")
# the take's transcript: words.raw.json once tightened, words.json before
WFILE = "words.raw.json" if os.path.exists("words.raw.json") else "words.json"
words = json.load(open(WFILE)) if os.path.exists(WFILE) else []

pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=r_frame_rate,pix_fmt,color_range,color_space,color_transfer,color_primaries:format=duration",
    "-of", "json", RAW], capture_output=True, text=True, check=True).stdout)
st = pr["streams"][0]
num, den = (st["r_frame_rate"].split("/") + ["1"])[:2]
FPS_R, fps = f"{num}/{den}", float(num) / float(den)
src_dur = float(pr["format"]["duration"])

SR, HOP = 16000, 0.010
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", RAW, "-map", "0:a:0", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
if not len(x):
    sys.exit("could not read the take's sound")
w = int(SR * HOP)
n = len(x) // w
db = 10 * np.log10((x[:n * w].reshape(n, w) ** 2).mean(1) + 1e-12)
room = float(np.percentile(db, 10))
HI, LO = room + a.hi, room + a.lo

# speech regions with hysteresis
regions, i = [], 0
while i < n:
    if db[i] <= HI:
        i += 1; continue
    s = i
    while s > 0 and db[s - 1] > LO: s -= 1
    e = i
    while e < n and db[e] > LO: e += 1
    if regions and s <= regions[-1][1]:
        regions[-1][1] = max(regions[-1][1], e)
    else:
        regions.append([s, e])
    i = e
regions = [(s * HOP, e * HOP) for s, e in regions]
if not regions:
    sys.exit("no speech measured in the take")
onsets = [wd["s"] for wd in words]

after, before = a.keep * 0.6, a.keep * 0.4
cuts, kept_gaps, early = [], [], {}
for (s0, e0), (s1, e1) in zip(regions, regions[1:]):
    if s1 - e0 < a.min_pause:
        continue
    c0, c1 = e0 + after, s1 - before
    # Whisper is often EARLY (it hangs a word's start on the end of the previous one): an onset in
    # a stretch the envelope measures as room tone is whisper's error, and the pause is cut. Only an
    # onset with a soft sound under it is guarded: room + 9 dB (the engine's "quiet" line) within
    # 0.25 s after it, away from the decay of the word before (measured on the first test take:
    # "Pipecorn. They" and "number? I mean" both had whisper's onset 0.36 s early, in room tone).
    # The cut then stops 50 ms before it, if what is left is still worth cutting.
    def soft_sound(t):
        i0 = max(0, int(max(t - 0.03, e0 + 0.06) / HOP))
        i1 = min(n, int(min(t + 0.25, s1 - 0.02) / HOP) + 1)
        return i1 > i0 and float(db[i0:i1].max()) > room + 9
    inside = [t for t in onsets if e0 + 0.03 < t < s1 - 0.03 and soft_sound(t)]
    # an onset in room tone is whisper being early: the word starts where the speech does
    for k, t in enumerate(onsets):
        if e0 + 0.03 < t < s1 - 0.03 and not soft_sound(t):
            early[k] = s1
    if inside:
        c1b = inside[0] - 0.05
        kept_gaps.append((round(e0, 3), round(s1, 3), inside[0], c1b - c0 >= 0.10))
        if c1b - c0 < 0.10:
            continue
        c1 = c1b
    cuts.append([c0, c1])
cuts += [[float(p), float(q)] for p, q in P.get("manualCuts", [])]

# what is KEPT, in whole frames: from the first syllable (less `before`) to 0.35 s after the last
# sound, minus the cuts. A kept stretch ends on the frame after its last sound and starts on the
# frame before its first: rounding always keeps a little more room tone, never less speech.
start = max(0.0, regions[0][0] - before)
end = min(src_dur, regions[-1][1] + 0.35)
keep, t = [], start
for c0, c1 in sorted(cuts):
    if c1 <= t or c0 >= end:
        continue
    if c0 > t:
        keep.append([t, c0])
    t = max(t, c1)
if end > t:
    keep.append([t, end])
NF = int(math.floor(src_dur * fps + 1e-6))
fk = []
for s, e in keep:
    f0, f1 = int(math.floor(s * fps + 1e-6)), min(NF, int(math.ceil(e * fps - 1e-6)))
    if fk and f0 <= fk[-1][1]:
        fk[-1][1] = max(fk[-1][1], f1)          # two stretches touching after rounding are one
    elif f1 - f0 >= 2:
        fk.append([f0, f1])
total_f = sum(f1 - f0 for f0, f1 in fk)
speed = float(P.get("speed", 1) or 1)
out_dur = round(total_f / fps / speed, 3)

# the take's clock → the assembly's (a second inside a cut lands on the join)
def to_tight(t):
    acc = 0.0
    for f0, f1 in fk:
        s, e = f0 / fps, f1 / fps
        if t < s:
            return acc
        if t <= e:
            return acc + (t - s)
        acc += e - s
    return acc
joins = []
acc = 0
for f0, f1 in fk[:-1]:
    acc += f1 - f0
    joins.append(round(acc / fps / speed, 3))
shots, t0 = [], 0.0
for b in joins:
    shots.append([round(t0, 3), b]); t0 = b
shots.append([round(t0, 3), out_dur])

removed = src_dur - total_f / fps
short = [s for s in shots if s[1] - s[0] < 0.35]
print(f"room tone {room:.1f} dBFS · speech at {HI:.1f} / edges {LO:.1f} · {len(regions)} speech regions")
print(f"{len(fk)} stretches kept, {len(joins)} jump cuts · {removed:.2f} s removed of {src_dur:.2f} s → {out_dur:.2f} s"
      + (f" (at ×{speed:g})" if speed != 1 else ""))
gaps = [s1 - e0 for (s0, e0), (s1, e1) in zip(regions, regions[1:])]
if gaps:
    print(f"pauses in the take: median {np.median(gaps):.2f} s, longest {max(gaps):.2f} s · left at each join: {a.keep:.2f} s")
for e0, s1, tw, part in kept_gaps:
    print(f"  · {'cut short' if part else 'kept'} {e0:.2f}-{s1:.2f}: a soft sound under whisper's word at {tw:.2f} "
          f"(read it with the engine's onset check if it matters)")
if short:
    print(f"  ⚠ {len(short)} shot(s) under 0.35 s read as a glitch: {', '.join(f'{x0:.2f}-{x1:.2f}' for x0, x1 in short[:6])}")
if a.dry_run:
    sys.exit(0)

# ── the assembly ──────────────────────────────────────────────────────────────────────────────
PIX = st.get("pix_fmt", "yuv420p")
TEN = "10" in PIX or "12" in PIX
RANGE = st.get("color_range") or ("pc" if PIX.startswith("yuvj") else "tv")
tags = ["-color_range", RANGE]
for k, opt in (("color_space", "-colorspace"), ("color_transfer", "-color_trc"), ("color_primaries", "-color_primaries")):
    if st.get(k) and st[k] != "unknown":
        tags += [opt, st[k]]
if TEN:
    venc = ["-c:v", "libx265", "-preset", "fast", "-crf", "14", "-pix_fmt", "yuv420p10le", "-tag:v", "hvc1"]
else:
    venc = ["-c:v", "libx264", "-preset", "fast", "-crf", "12", "-pix_fmt", "yuvj420p" if PIX.startswith("yuvj") else "yuv420p"]
N = len(fk)
fade = 0.006
g = [f"[0:v]split={N}" + "".join(f"[vs{i}]" for i in range(N)) + ";", f"[0:a]asplit={N}" + "".join(f"[as{i}]" for i in range(N)) + ";"]
for i, (f0, f1) in enumerate(fk):
    s, e = f0 / fps, f1 / fps
    g.append(f"[vs{i}]trim=start_frame={f0}:end_frame={f1},setpts=PTS-STARTPTS[v{i}];")
    # a 6 ms fade at each join: a hard splice in a voice clicks
    g.append(f"[as{i}]atrim=start={s:.6f}:end={e:.6f},asetpts=PTS-STARTPTS,"
             f"afade=t=in:d={fade},afade=t=out:st={max(0, e - s - fade):.6f}:d={fade}[a{i}];")
g.append("".join(f"[v{i}][a{i}]" for i in range(N)) + f"concat=n={N}:v=1:a=1[v][a]")
os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
tmp = a.out + ".part.mov"
os.makedirs("tmp", exist_ok=True)
open("tmp/tighten.fc.txt", "w").write("\n".join(g))
rc = subprocess.run(["ffmpeg", "-hide_banner", "-v", "error", "-y", "-i", RAW, "-filter_complex_script", "tmp/tighten.fc.txt",
                     "-map", "[v]", "-map", "[a]", *venc, "-g", str(round(fps)), *tags, "-r", FPS_R,
                     "-c:a", "pcm_s16le", "-ar", "48000", tmp]).returncode
if rc != 0:
    sys.exit(f"ffmpeg failed ({rc}); the project is unchanged")
got = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", tmp],
                           capture_output=True, text=True).stdout or 0)
if abs(got - total_f / fps) > 1.5 / fps:
    os.remove(tmp)
    sys.exit(f"the assembly lasts {got:.3f} s instead of {total_f / fps:.3f} s; the project is unchanged")
shutil.move(tmp, a.out)

# ── the project, repointed ─────────────────────────────────────────────────────────────────────
if WFILE == "words.json" and words:
    shutil.copy("words.json", "words.raw.json")
if words:
    tw = []
    for k, wd in enumerate(words):
        s0 = early.get(k, wd["s"])
        s, e = to_tight(s0), to_tight(max(wd["e"], s0 + 0.05))
        tw.append({**wd, "s": round(s, 3), "e": round(max(s, e), 3)})
    json.dump(tw, open("words.json", "w"), ensure_ascii=False, indent=0)
    if early:
        print(f"  · {len(early)} onset(s) whisper put in a measured silence moved to where the speech starts: "
              + ", ".join(f"« {words[k]['w']} » {words[k]['s']:.2f} → {v:.2f}" for k, v in list(early.items())[:5]))
P["rawSource"] = RAW
P["source"] = os.path.abspath(a.out)
P["duration"] = out_dur
P.pop("cuts", None)
P["tightened"] = {"room": round(room, 1), "minPause": a.min_pause, "keep": a.keep, "fps": fps,
                  "kept": fk, "joins": len(joins), "removed": round(removed, 3), "takeDuration": round(src_dur, 3)}
json.dump(P, open("project.json", "w"), indent=2)
json.dump({"shots": shots, "joins": joins}, open("shots.json", "w"), indent=1)
for f in ("voice.wav", "assets/levels.json", "assets/faces.json"):
    if os.path.exists(f): os.remove(f)          # stale: the timeline moved
print(f"{a.out} — {total_f} frames ({got:.2f} s); project.json, words.json (the take's: words.raw.json) and shots.json repointed")
print("next: node face.mjs (the face on the new timeline), then the plan")
