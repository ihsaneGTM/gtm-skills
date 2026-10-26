"""The three sounds the cold-call opening needs, in assets/:

    py.sh sounds.py --track plugins/video/assets/music/<track>.mp3 [--hit 3.67] [--intro 0.43]

  ringback.wav   the calling tone while the sheet rings: 440 + 480 Hz (the North-American
                 ringback), one tone of 0.80 s, a pause, the start of a second one cut by the
                 bam (1.463 s in all), band-limited like a phone line. Synthesised here,
                 nothing recorded. It was asked for in review ("the sound of the phone
                 ringing, as if we were calling").
  music-hook.wav the track's own INTRO under the hook, muffled (two low-passes at 650 Hz, a
                 high-pass at 45 Hz): the music is in the next room. Cut where the sheet drops.
  music.wav      the bed of the call, starting on the track's first BIG HIT so the music lands
                 with the bam; to the end of the short, closed by a low-pass sweep and a 1.6 s
                 fade. Looped if the track is shorter than the call (and said).

The intro is where the track first rises above -45 dBFS; the first big hit is the
earliest low-end onset (under 160 Hz) at least 60 % as strong as the strongest one of
the first 16 s. Both are printed with the candidates: --intro / --hit override them, by
ear of the user or by reading the candidates. project.json gets `track`, `bed`, `trackHit`.
Run after assemble.py (it reads the opening's length).
"""
import argparse, json, os, subprocess, sys, wave
import numpy as np
from common import project, save_project, Clocks

ap = argparse.ArgumentParser()
ap.add_argument("--track", default=None)
ap.add_argument("--hit", type=float, default=None)
ap.add_argument("--intro", type=float, default=None)
a = ap.parse_args()
P = project()
K = Clocks(P)
track = a.track or P.get("track")
if not track or not os.path.exists(track):
    sys.exit("which music? --track plugins/video/assets/music/<file> (the shelf: plugins/video/assets/music/README.md)")
track = os.path.abspath(track)
os.makedirs("assets", exist_ok=True); os.makedirs("tmp", exist_ok=True)
ff = lambda *args: subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)
RS = "aresample=48000:filter_size=64:phase_shift=10:cutoff=0.97"

# --- 1. the ringback tone -------------------------------------------------------------------
ff("-filter_complex",
   "aevalsrc=exprs='(sin(2*PI*440*t)+sin(2*PI*480*t))*0.30*if(lt(t,0.80),min(1,min(t/0.012,(0.80-t)/0.012)),"
   "if(gte(t,1.18),min(1,min((t-1.18)/0.012,(1.4633-t)/0.006)),0))':s=48000:d=1.4633,"
   "highpass=f=300,lowpass=f=3400,asoftclip=type=tanh:threshold=0.85,aformat=channel_layouts=stereo",
   "-c:a", "pcm_s16le", "assets/ringback.wav")

# --- 2. read the track: its intro and its first big hit --------------------------------------
ff("-t", "40", "-i", track, "-ac", "1", "-ar", "22050", "-c:a", "pcm_s16le", "tmp/track40.wav")
w = wave.open("tmp/track40.wav", "rb"); sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
hop = int(sr * 0.010); n = len(x) // hop
lv = 20 * np.log10(np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
intro = a.intro if a.intro is not None else next((round(f * 0.010, 2) for f in range(n) if lv[f] > -45), 0.0)
Hh, N = 512, 2048
win = np.hanning(N)
spec = np.array([np.abs(np.fft.rfft(x[i:i + N] * win)) for i in range(0, len(x) - N, Hh)])
low = spec[:, : int(160 * N / sr)].sum(1)
flux = np.maximum(0, np.diff(np.log1p(low)))
tl = (np.arange(len(flux)) + 1) * Hh / sr
sel = (tl >= intro + 0.5) & (tl < intro + 16)
cands = sorted(np.argsort(flux[sel])[::-1][:8], key=lambda k: tl[sel][k])
peak = flux[sel].max() if sel.any() else 0
auto_hit = next((round(float(tl[sel][k]), 2) for k in cands if flux[sel][k] >= 0.6 * peak), intro)
hit = a.hit if a.hit is not None else auto_hit
print(f"track: {os.path.basename(track)} · intro at {intro:.2f} s · strongest low onsets: "
      + " ".join(f"{tl[sel][k]:.2f}{'*' if abs(tl[sel][k] - hit) < 0.02 else ''}" for k in cands)
      + f" → first big hit {hit:.2f} s")

# --- 3. the muffled intro under the hook ----------------------------------------------------
hook_out = K.hook_end_out + P["assembly"].get("breathe", 0.15)          # to the sheet
ff("-ss", f"{intro:.3f}", "-t", f"{hook_out:.3f}", "-i", track, "-af",
   f"{RS},lowpass=f=650:poles=2,lowpass=f=650:poles=2,highpass=f=45,afade=t=out:st={hook_out - 0.15:.3f}:d=0.15",
   "-ac", "2", "-c:a", "pcm_s16le", "assets/music-hook.wav")

# --- 4. the bed of the call, from the first big hit ------------------------------------------
L = round(P["duration"] - (K.c0 - 0.02) + 0.08, 2)
tdur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", track],
                            capture_output=True, text=True).stdout or 0)
loop = tdur - hit < L
sweep = ";".join(f"{L - d:.2f} lowpass f {f}" for d, f in [(1.70, 9000), (1.37, 6000), (1.07, 3600), (0.77, 2100), (0.47, 1200)])
ff(*(["-stream_loop", "-1"] if loop else []), "-ss", f"{hit:.3f}", "-t", f"{L:.2f}", "-i", track, "-af",
   f"{RS},afade=t=in:d=0.01,asendcmd=c='{sweep}',lowpass=f=20000,afade=t=out:st={L - 1.70:.2f}:d=1.6:curve=exp",
   "-ac", "2", "-c:a", "pcm_s16le", "assets/music.wav")
P.update(track=track, trackHit=hit, trackIntro=intro, bed="music.wav")
save_project(P)
print(f"assets/ringback.wav 1.46 s · assets/music-hook.wav {hook_out:.2f} s (muffled intro) · assets/music.wav {L:.2f} s from {hit:.2f} s"
      + (f" — LOOPED: the track lasts {tdur:.0f} s from its hit, the call needs {L:.0f} s; say it" if loop else ""))
