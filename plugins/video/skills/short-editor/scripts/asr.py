"""Speech to text for every skill: the Mac's GPU when it has one, its CPU otherwise.

    from asr import WhisperModel          # instead of: from faster_whisper import WhisperModel

The same calls as faster-whisper (WhisperModel(...).transcribe(...) -> segments, info; each
segment's .words with .word .start .end), so a script changes one import and nothing else.

On an Apple Silicon Mac it runs MLX-Whisper on the GPU: measured 2026-10-08 on an M2 Pro, a
10-minute memo in 45 s instead of 225 s (turbo), a 60 s take in 10 s instead of 120 s (large-v3),
the same words (96 % identical, fewer mistakes) at the same times (median gap 0 ms, p90 60 ms).
Elsewhere, or when mlx-whisper is missing, or with GTM_ASR=cpu, faster-whisper on the CPU as before.

MLX decodes greedily (no beam search): beam_size is accepted and ignored there. transcribe() also
takes progress=callable(seconds done), called as it goes, on both engines.
"""
import os, platform, sys
from types import SimpleNamespace

os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")   # logs stay readable

MLX_REPOS = {
    "large-v3": "mlx-community/whisper-large-v3-mlx",
    "large-v3-turbo": "mlx-community/whisper-large-v3-turbo",
    "turbo": "mlx-community/whisper-large-v3-turbo",
    "mobiuslabsgmbh/faster-whisper-large-v3-turbo": "mlx-community/whisper-large-v3-turbo",
}
CPU_MODELS = {"turbo": "mobiuslabsgmbh/faster-whisper-large-v3-turbo",
              "large-v3-turbo": "mobiuslabsgmbh/faster-whisper-large-v3-turbo"}


def _mlx_ok():
    if os.environ.get("GTM_ASR") == "cpu" or sys.platform != "darwin" or platform.machine() != "arm64":
        return False
    try:
        import mlx_whisper  # noqa: F401
        return True
    except Exception:
        return False


ENGINE = "mlx" if _mlx_ok() else "cpu"


class _Mlx:
    def __init__(self, model):
        self.repo = MLX_REPOS.get(model, model if "/" in model and "mlx" in model else MLX_REPOS["large-v3"])

    def transcribe(self, audio, language=None, word_timestamps=True, condition_on_previous_text=False,
                   progress=None, **_ignored):
        import numpy as np
        import mlx.core as mx
        import importlib
        import mlx_whisper
        T = importlib.import_module("mlx_whisper.transcribe")   # the module: the package's name is the function
        from mlx_whisper.audio import load_audio, log_mel_spectrogram, pad_or_trim, N_FRAMES, N_SAMPLES

        if isinstance(audio, str):
            audio = load_audio(audio)
        audio = np.asarray(audio)
        audio = audio.astype(np.float32) / 32768.0 if audio.dtype.kind in "iu" else audio.astype(np.float32)
        prob = 1.0
        if language is None:
            # detected here, not inside transcribe(), to give its confidence back like faster-whisper
            model = T.ModelHolder.get_model(self.repo, mx.float16)
            mel = log_mel_spectrogram(audio, n_mels=model.dims.n_mels, padding=N_SAMPLES)
            _, probs = model.detect_language(pad_or_trim(mel, N_FRAMES, axis=-2).astype(mx.float16))
            language = max(probs, key=probs.get)
            prob = float(probs[language])

        tq = T.tqdm.tqdm
        if progress:
            class Bar:  # mlx-whisper counts frames of 10 ms through tqdm: turned into seconds done
                def __init__(self, *a, **k): self.n = 0
                def __enter__(self): return self
                def __exit__(self, *a): return False
                def update(self, n): self.n += n; progress(self.n / 100.0)
            T.tqdm.tqdm = Bar
        try:
            r = mlx_whisper.transcribe(audio, path_or_hf_repo=self.repo, language=language,
                                       word_timestamps=word_timestamps, verbose=None,
                                       condition_on_previous_text=condition_on_previous_text)
        finally:
            T.tqdm.tqdm = tq
        segs = [SimpleNamespace(start=s["start"], end=s["end"], text=s["text"],
                                words=[SimpleNamespace(word=w["word"], start=w["start"], end=w["end"],
                                                       probability=w.get("probability", 1.0))
                                       for w in s.get("words", [])])
                for s in r["segments"]]
        return iter(segs), SimpleNamespace(language=r.get("language", language), language_probability=prob)


class _Cpu:
    def __init__(self, model, **kw):
        from faster_whisper import WhisperModel as FW
        kw.setdefault("device", "cpu"); kw.setdefault("compute_type", "int8")
        kw.setdefault("cpu_threads", os.cpu_count() or 4)
        self.m = FW(CPU_MODELS.get(model, model), **kw)

    def transcribe(self, audio, progress=None, **kw):
        segs, info = self.m.transcribe(audio, **kw)
        if not progress:
            return segs, info
        def each():
            for s in segs:
                progress(s.end)
                yield s
        return each(), info


def WhisperModel(model="large-v3", **kw):
    return _Mlx(model) if ENGINE == "mlx" else _Cpu(model, **kw)
