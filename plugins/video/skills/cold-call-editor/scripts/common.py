"""What the Python tools of this skill share: the project, the raw take's sound, its
envelope, and the three clocks (raw, assembly, output; call.mjs says the same in JS)."""
import json, os, subprocess, wave
import numpy as np


def project(path="project.json"):
    return json.load(open(path))


def save_project(P, path="project.json"):
    with open(path, "w") as f:
        json.dump(P, f, indent=2, ensure_ascii=False)
        f.write("\n")


def raw_source(P):
    """The take as shot. project.json `source` becomes the assembly once assemble.py has
    run; the take stays in `rawSource`."""
    return P.get("rawSource") or P["source"]


def probe(path, entries):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", entries,
                          "-of", "json", path], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def asr16k(P, out="tmp/asr16k.wav"):
    """The RAW take's sound, mono 16 kHz: the clock of words.json. Made once."""
    if not os.path.exists(out):
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw_source(P), "-map", "0:a:0", "-ac", "1",
                        "-ar", "16000", "-c:a", "pcm_s16le", out], check=True)
    w = wave.open(out, "rb")
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return x, sr


def envelope_db(x, sr, hop_s=0.010):
    """RMS level in dB on frames of `hop_s` seconds."""
    hop = int(round(sr * hop_s))
    n = len(x) // hop
    fr = x[: n * hop].reshape(n, hop)
    return 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)


def words(path="words.json"):
    return json.load(open(path))


def fixed_words(path="assets/words-fixed.json"):
    return json.load(open(path)) if os.path.exists(path) else None


class Clocks:
    """raw take → assembly → output, the map of project.json `assembly` (call.mjs timeline())."""

    def __init__(self, P):
        A = P["assembly"]
        self.A, self.SP = A, P.get("speed", 1) or 1
        self.hook_from, self.hook_to = A["hookFrom"], A["hookTo"]
        self.hook_len = self.hook_to - self.hook_from
        self.gap, self.resume = A["gap"], A["resume"]
        self.end = A.get("end")

    def raw_of_asm(self, a):
        """None inside the ringing, or past the end of the call."""
        if a < self.hook_len:
            return self.hook_from + a
        if a < self.hook_len + self.gap:
            return None
        r = self.resume + (a - self.hook_len - self.gap)
        return None if (self.end is not None and r >= self.end) else r

    def out_hook(self, r):
        return (r - self.hook_from) / self.SP

    def out_call(self, r):
        return (r - self.resume + self.hook_len + self.gap) / self.SP

    @property
    def hook_end_out(self):
        return self.hook_len / self.SP

    @property
    def c0(self):
        return (self.hook_len + self.gap) / self.SP
