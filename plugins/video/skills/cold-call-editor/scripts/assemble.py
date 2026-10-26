"""The assembly: the hook, the ringing, then the call — source/assembly.mov.

    py.sh assemble.py                  # glitch hook, the whole call; repoints project.json
    py.sh assemble.py --fx plain       # the hook untouched (to compare, or if asked)
    py.sh assemble.py --tail 1.9 --out variants/x.mov   # only the opening + 1.9 s of the call

project.json `assembly` (raw seconds; call.mjs explains each key):
  the hook's VOICE   raw [hookFrom, hookTo], faded out over its last 35 ms
  its PICTURE        raw [hookFrom, hookVideoTo], then its last frame held under the ringing
                     sheet; the picture of a cold call has nothing to do with its sound, so
                     the footage at the same time as the line is as good as any
  the ringing        `gap` seconds of silence (the sheet, the ringback tone: plan.mjs, edl.mjs)
  the call           raw [resume, end], untouched, faded in over 15 ms

THE GLITCH (the hook effect picked in review over a thriller grade, a crash zoom, Super 8
and VHS): the hook's frames inside the bursts of assets/hookfx.json (OUTPUT seconds, on the
stressed words) are broken up — the red and blue channels pulled apart, bands torn
sideways, blocks copied out of place (some posterised), bright scan lines, a frame held now
and then, one frame in five left clean so it flickers — seeded per frame, so the same
assembly twice is the same. Every frame between the bursts, and the whole call, keeps the
source's pixels: the frames that go through numpy are converted with the source's own
matrix and range both ways, and the encode keeps its bit depth and colour tags (never a
regrade).

After it: rm voice.wav is done here; run levels.py and the engine's matte.mjs --force
(the timeline moved), then build.
"""
import argparse, json, os, subprocess, sys
import numpy as np
from common import project, save_project, raw_source

ap = argparse.ArgumentParser()
ap.add_argument("--fx", default="glitch", choices=["glitch", "plain"])
ap.add_argument("--out", default="source/assembly.mov")
ap.add_argument("--tail", type=float, default=None, help="only this many seconds of the call (a comparison)")
a = ap.parse_args()

P = project()
RAW = raw_source(P)
if "assembly" not in P:
    sys.exit("project.json has no `assembly`: choose the hook first (SKILL.md § 4)")
A = P["assembly"]
SP = P.get("speed", 1) or 1

pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=width,height,r_frame_rate,pix_fmt,color_range,color_space,color_transfer,color_primaries:stream_side_data=rotation:format=duration",
    "-of", "json", RAW], capture_output=True, text=True, check=True).stdout)
st = pr["streams"][0]
W, H = int(st["width"]), int(st["height"])
rot = next((int(sd["rotation"]) for sd in st.get("side_data_list", []) if "rotation" in sd), 0)
if abs(rot) % 180 == 90:
    W, H = H, W                                          # ffmpeg rotates on decode
num, den = (st["r_frame_rate"].split("/") + ["1"])[:2]
FPS_R, FPS = f"{num}/{den}", float(num) / float(den)
DUR = float(pr["format"]["duration"])
PIX = st.get("pix_fmt", "yuv420p")
TEN = "10" in PIX or "12" in PIX
RANGE = st.get("color_range") or ("pc" if PIX.startswith("yuvj") else "tv")
SPACE = st.get("color_space") or "bt709"
TRC = st.get("color_transfer") or "bt709"
PRI = st.get("color_primaries") or "bt709"
MATRIX = {"bt2020nc": "bt2020", "bt2020c": "bt2020", "smpte170m": "smpte170m", "bt470bg": "bt470", "fcc": "fcc",
          "smpte240m": "smpte240m"}.get(SPACE, "bt709")

hook_from, hook_to = A["hookFrom"], A["hookTo"]
hook_vto = A.get("hookVideoTo") or hook_to
hook_len, gap, resume = hook_to - hook_from, A["gap"], A["resume"]
end = A.get("end") or DUR
if not (0 <= hook_from < hook_to <= DUR and hook_vto >= hook_to and 0 <= resume < end):
    sys.exit(f"assembly out of the take ({DUR:.2f} s): {A}")
H0 = round(hook_from * FPS)                              # the hook's first frame
HOOK_V = round((hook_vto - hook_from) * FPS)             # its frames: the picture runs on past the voice
PRE = round((hook_len + gap) * FPS)                      # the opening, ringing included
GAP_N = PRE - HOOK_V
if GAP_N < 0:
    sys.exit("hookVideoTo runs past the ringing: shorten it")
B0 = round(resume * FPS)
B1 = B0 + round(a.tail * FPS) if a.tail else round(end * FPS)
CALL_N = B1 - B0

if TEN:
    venc = ["-c:v", "libx265", "-preset", "fast", "-crf", "14", "-pix_fmt", "yuv420p10le", "-tag:v", "hvc1"]
    pix_out = "yuv420p10le"
else:
    pix_out = "yuvj420p" if PIX.startswith("yuvj") else "yuv420p"
    venc = ["-c:v", "libx264", "-preset", "fast", "-crf", "12", "-pix_fmt", pix_out]
tags = ["-color_range", RANGE, "-colorspace", SPACE, "-color_trc", TRC, "-color_primaries", PRI]
enc_tail = ["-map", "[v]", "-map", "[a]", *venc, "-g", str(round(FPS)), *tags, "-r", FPS_R,
            "-c:a", "pcm_s16le", a.out]
a_end = f":end={resume + a.tail:.6f}" if a.tail else (f":end={end:.6f}" if A.get("end") else "")
audio = (f"[1:a]asplit=2[aa0][ab0];"
         f"[aa0]atrim=start={hook_from:.6f}:end={hook_to:.6f},asetpts=PTS-STARTPTS,afade=t=out:st={hook_len - 0.035:.6f}:d=0.035,"
         f"apad=pad_dur={gap:.6f}[aa];"
         f"[ab0]atrim=start={resume:.6f}{a_end},asetpts=PTS-STARTPTS,afade=t=in:d=0.015[ab];[aa][ab]concat=n=2:v=0:a=1[a]")
vb = f"[1:v]trim=start_frame={B0}:end_frame={B1},setpts=PTS-STARTPTS,format={pix_out}[vb]"
os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)

if a.fx == "plain":
    graph = (f"[0:v]trim=start_frame={H0}:end_frame={H0 + HOOK_V},setpts=PTS-STARTPTS,format={pix_out},"
             f"tpad=stop_mode=clone:stop={GAP_N}[va];{vb};[va][vb]concat=n=2:v=1:a=0[v];{audio}")
    rc = subprocess.run(["ffmpeg", "-hide_banner", "-v", "error", "-y", "-i", RAW, "-i", RAW, "-filter_complex", graph, *enc_tail]).returncode
    touched = 0
else:
    bursts = json.load(open("assets/hookfx.json"))["glitch"]["bursts"]
    dt, bpp = (np.uint16, 6) if TEN else (np.uint8, 3)
    MAXV = 65535 if TEN else 255
    rgb = "rgb48le" if TEN else "rgb24"
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{hook_from:.6f}", "-i", RAW, "-frames:v", str(HOOK_V),
        "-vf", f"scale=in_color_matrix={MATRIX}:in_range={RANGE},format={rgb}", "-f", "rawvideo", "-pix_fmt", rgb, "pipe:1"],
        stdout=subprocess.PIPE)
    graph = (f"[0:v]scale=out_color_matrix={MATRIX}:out_range={RANGE},format={pix_out},setpts=PTS-STARTPTS,"
             f"tpad=stop_mode=clone:stop={GAP_N}[va];{vb};[va][vb]concat=n=2:v=1:a=0[v];{audio}")
    enc = subprocess.Popen(["ffmpeg", "-hide_banner", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", rgb,
        "-s", f"{W}x{H}", "-r", FPS_R, "-i", "pipe:0", "-i", RAW, "-filter_complex", graph, *enc_tail], stdin=subprocess.PIPE)
    sc = W / 1440                                        # the amounts were set on a 1440-wide take
    lift = 70 * MAXV // 255

    # the draws come in the same order as on the reference take: at 1440 wide and 8 bits
    # the same seed gives the same frame
    def glitch(img, R, amp):
        o = img.copy()
        dx = int((10 + R.random() * 40) * amp * sc)
        o[:, :, 0] = np.roll(img[:, :, 0], dx, axis=1)                   # red one way
        o[:, :, 2] = np.roll(img[:, :, 2], -dx, axis=1)                  # blue the other
        for _ in range(int(R.integers(3, 9))):                          # bands torn sideways
            y = int(R.integers(0, H - max(1, int(20 * sc)))); h = max(2, int(R.integers(16, 40 + int(260 * amp)) * sc))
            sh = int((R.random() - 0.5) * 2 * 300 * amp * sc)
            o[y:y + h] = np.roll(o[y:y + h], sh, axis=1)
        for _ in range(int(R.integers(1, 6))):                          # blocks copied out of place
            bw, bh = min(W - 1, max(8, int(R.integers(80, 420) * sc))), min(H - 1, max(8, int(R.integers(40, 260) * sc)))
            x, y = int(R.integers(0, W - bw)), int(R.integers(0, H - bh))
            sx = int(np.clip(x + int(R.integers(-260, 260) * sc), 0, W - bw)); sy = int(np.clip(y + int(R.integers(-160, 160) * sc), 0, H - bh))
            blk = o[sy:sy + bh, sx:sx + bw].copy()
            if R.random() < 0.4:                                         # posterised
                q = (MAXV + 1) // 4
                blk = (blk // q) * q + q // 2
            o[y:y + bh, x:x + bw] = blk
        for _ in range(int(R.integers(0, 4))):                          # bright scan lines
            y = int(R.integers(0, H - 5)); h = int(R.integers(1, 5))
            o[y:y + h] = np.clip(o[y:y + h].astype(np.int32) + lift, 0, MAXV).astype(dt)
        return o

    prev, touched = None, 0
    for i in range(HOOK_V):
        buf = dec.stdout.read(W * H * bpp)
        if len(buf) < W * H * bpp:
            enc.stdin.close(); sys.exit(f"short read at hook frame {i} of {HOOK_V}")
        img = np.frombuffer(buf, dt).reshape(H, W, 3)
        t = i / FPS / SP                                                 # OUTPUT seconds
        b = next((x for x in bursts if x[0] <= t < x[1]), None)
        out = img
        if b is not None:
            R = np.random.default_rng(1000 + i)
            if prev is not None and R.random() < 0.18: out = prev        # a dropped frame: held
            elif R.random() < 0.20: out = img                            # a clean frame: it flickers
            else:
                u = (t - b[0]) / max(1e-3, b[1] - b[0])
                out = glitch(img, R, b[2] * (0.55 + 0.45 * R.random()) * (1 - 0.35 * u)); touched += 1
        enc.stdin.write(np.ascontiguousarray(out).tobytes())
        prev = out
    enc.stdin.close(); dec.wait()
    rc = enc.wait()

if rc != 0:
    sys.exit(f"ffmpeg failed ({rc}); {a.out} is not usable")
total = PRE + CALL_N
print(f"{a.out}: hook {hook_len:.2f} s of voice ({HOOK_V} frames of picture"
      + (f", {touched} broken up by the glitch" if a.fx == "glitch" else "") + f"), {gap:.2f} s of ringing, "
      f"call {CALL_N / FPS:.2f} s · {total} frames at {FPS:g} fps · {'10' if TEN else '8'}-bit {TRC}/{PRI}, {RANGE} range")
if a.tail is None and os.path.abspath(a.out) == os.path.abspath("source/assembly.mov"):
    P.setdefault("rawSource", RAW)
    P["source"] = os.path.abspath(a.out)
    P["duration"] = round(total / FPS / SP, 3)
    P["fps"] = P.get("fps") or round(FPS)
    save_project(P)
    if os.path.exists("voice.wav"):
        os.remove("voice.wav")                                           # build.sh re-extracts it from the new assembly
    print(f"project.json → source = the assembly, duration {P['duration']} s (output, at ×{SP:g}).")
    print("next: py.sh levels.py · node <engine>/matte.mjs --force (the timeline moved) · then the plan")
