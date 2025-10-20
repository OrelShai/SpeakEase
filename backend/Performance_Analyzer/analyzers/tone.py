# Performance_Analyzer/analyzers/tone.py
import os
import time
import tempfile
import subprocess
from typing import Dict, Optional, List

import numpy as np
import librosa
import shutil

from Performance_Analyzer.analyzers.base import BaseAnalyzer
from Performance_Analyzer.schemas import MetricResult

# --- Resolve ffmpeg inside the venv (prefer imageio-ffmpeg) ---
FFMPEG_BIN = os.environ.get("FFMPEG_BIN")  # Allows manual override if desired
if not FFMPEG_BIN:
    try:
        import imageio_ffmpeg  # type: ignore
        FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        FFMPEG_BIN = shutil.which("ffmpeg")  # Fall back to PATH if exists

if not FFMPEG_BIN:
    # Stop early with clear message instead of WinError 2
    raise RuntimeError(
        "FFmpeg not found. Install 'imageio-ffmpeg' in the venv or set FFMPEG_BIN env var."
    )

def _r2(x):
    """Round numerics to 2 decimals (keeps None/others as-is)."""
    try:
        return None if x is None else float(f"{float(x):.2f}")
    except Exception:
        return x
        
class ToneAnalyzer(BaseAnalyzer):
    """
    Analyzes prosody (intonation) from video audio:
    Calculates variability score (0..100) based on f0 range and energy range (RMS),
    with details (mean/std/range) and friendly error returns.
    """

    metric = "tone"
    model = "librosa-pyin+rms"
    version = "1.0.0"

    def __init__(self, config: Optional[Dict] = None):
        super().__init__(config)
        self.sr = self.config.get("sample_rate", 22050)
        self.hop_length = self.config.get("hop_length", 512)
        self.fmin = self.config.get("fmin", 75.0)
        self.fmax = self.config.get("fmax", 450.0)
        self.voicing_thresh = self.config.get("voicing_thresh", 0.10)
        self.min_duration_sec = self.config.get("min_duration_sec", 3.0)

    def _extract_wav(self, video_path: str) -> str:
        """
        Convert the input video to a temporary mono WAV via ffmpeg (sr=self.sr).
        Uses the ffmpeg binary resolved for the venv.
        """
        tmp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
        cmd = [
            FFMPEG_BIN, "-y",
            "-i", video_path,
            "-vn",
            "-ac", "1",
            "-ar", str(self.sr),
            "-f", "wav",
            tmp_wav
        ]
        # Don't throw away the output; save it so we can debug in case of failure
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if proc.returncode != 0:
            # Convert to error that will be caught by except subprocess.CalledProcessError below
            raise subprocess.CalledProcessError(proc.returncode, cmd, output=proc.stdout, stderr=proc.stderr)
        return tmp_wav
        

    def analyze(self, video_path: str) -> MetricResult:
        t0 = time.perf_counter()
        tmp_wav = None
        errors: List[str] = []
        details: Dict = {}

        try:
            # 1) Audio extraction and loading
            tmp_wav = self._extract_wav(video_path)
            y, sr = librosa.load(tmp_wav, sr=self.sr, mono=True)

            duration = len(y) / sr
            if duration < self.min_duration_sec:
                duration_ms = int((time.perf_counter() - t0) * 1000)
                return MetricResult(
                    metric=self.metric,
                    score=0.0,                 # 0..100
                    confidence=0.0,
                    model=self.model,
                    version=self.version,
                    duration_ms=duration_ms,
                    details={"error": "audio_too_short", "duration_sec": duration},
                    errors=["audio_too_short"],
                )

            # 2) Features: RMS (energy)
            rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=self.hop_length).flatten()
            rms_mean = float(np.mean(rms))
            rms_std  = float(np.std(rms))
            rms_range = float(np.max(rms) - np.min(rms))

            # 3) Features: f0 with PYIN
            f0, voiced_flag, voiced_prob = librosa.pyin(
                y, fmin=self.fmin, fmax=self.fmax, sr=sr, hop_length=self.hop_length
            )
            mask = (~np.isnan(f0)) & (voiced_prob >= self.voicing_thresh)
            voiced_f0 = f0[mask]
            voiced_ratio = float(np.mean(mask)) if mask.size else 0.0

            if voiced_f0.size == 0:
                duration_ms = int((time.perf_counter() - t0) * 1000)
                return MetricResult(
                    metric=self.metric,
                    score=0.0,
                    confidence=0.0,
                    model=self.model,
                    version=self.version,
                    duration_ms=duration_ms,
                    details={"error": "no_voiced_segments", "voicing_thresh": self.voicing_thresh},
                    errors=["no_voiced_segments"],
                )

            f0_mean = float(np.mean(voiced_f0))
            f0_std  = float(np.std(voiced_f0))
            # Use percentiles to be robust to extremes
            f0_range = float(np.percentile(voiced_f0, 95) - np.percentile(voiced_f0, 5))

            # 4) Variability scoring (0..1) then normalization to 0..100
            def _sigmoid(x, k=0.02, x0=100.0):
                return 1.0 / (1.0 + np.exp(-k * (x - x0)))

            f0_component  = _sigmoid(f0_range, k=0.03, x0=80.0)
            rms_component = _sigmoid(rms_range * 1000.0, k=0.5, x0=15.0)
            score01 = float(0.6 * f0_component + 0.4 * rms_component)
            score = float(max(0.0, min(1.0, score01)) * 100.0)   # 0..100

            # Simple confidence: weights voicing ratio and duration (capped at 1.0)
            confidence = float(min(1.0, 0.5 * voiced_ratio + 0.5 * min(1.0, duration / 10.0)))

            duration_ms = int((time.perf_counter() - t0) * 1000)
            return MetricResult(
                metric=self.metric,
                score= _r2(score),
                confidence=_r2(confidence),
                model=self.model,
                version=self.version,
                duration_ms=duration_ms,
                details={
                    "duration_sec": duration,
                    "rms": {"mean": rms_mean, "std": rms_std, "range": rms_range},
                    "f0": {"mean": f0_mean, "std": f0_std, "range": f0_range},
                    "voiced_ratio": voiced_ratio,
                    "config_used": {
                        "sr": self.sr,
                        "hop_length": self.hop_length,
                        "fmin": self.fmin,
                        "fmax": self.fmax,
                        "voicing_thresh": self.voicing_thresh,
                        "min_duration_sec": self.min_duration_sec,
                    },
                },
                errors=None,
            )

        except subprocess.CalledProcessError as e:
            errors.append("ffmpeg_failed")
            # Save a piece of stderr to understand why it failed (codec, no audio, etc.)
            details = {
                "error": "ffmpeg_failed",
                "stderr_tail": (e.stderr or "")[-600:]  # Truncate to avoid flooding response
            }
        except Exception as e:
            errors.append(f"{type(e).__name__}: {e}")
            details = {"error": f"{type(e).__name__}: {e}"}
        finally:
            if tmp_wav and os.path.exists(tmp_wav):
                try:
                    os.remove(tmp_wav)
                except OSError:
                    pass

        # In case of error – return schema-compliant object with score=0
        duration_ms = int((time.perf_counter() - t0) * 1000)
        return MetricResult(
            metric=self.metric,
            score=0.0,
            confidence=0.0,
            model=self.model,
            version=self.version,
            duration_ms=duration_ms,
            details=details,
            errors=errors or ["unknown_error"],
        )


