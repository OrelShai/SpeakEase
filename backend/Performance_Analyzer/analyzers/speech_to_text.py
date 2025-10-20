import os
import tempfile
import time
import subprocess
from typing import Optional, Dict, List
from Performance_Analyzer.utils import transcript_cache

from moviepy.editor import VideoFileClip
import whisper

try:
    import language_tool_python
    _HAS_LT = True
except Exception:
    language_tool_python = None
    _HAS_LT = False

from Performance_Analyzer.analyzers.base import BaseAnalyzer
from Performance_Analyzer.schemas import MetricResult


class SpeechToTextAnalyzer(BaseAnalyzer):
    metric  = "language_quality"
    model   = "whisper-small + language_tool"
    version = "1.0.0"

    def __init__(self, config: Optional[Dict] = None):
        super().__init__(config)
        self.cfg = {
            "whisper_model": (self.config or {}).get("whisper_model", "small"),
            "language":      (self.config or {}).get("language", "en"),
            "sample_rate":   int((self.config or {}).get("sample_rate", 16000)),
            "use_fp16":      False,  # CPU friendly
        }
        self.whisper_model = whisper.load_model(self.cfg["whisper_model"])
        self._tool = language_tool_python.LanguageTool('en-US') if _HAS_LT else None

    def _extract_wav_moviepy(self, video_path: str, sr: int) -> str:
        out_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
        clip = VideoFileClip(video_path)
        try:
            clip.audio.write_audiofile(
                out_wav, fps=sr, codec="pcm_s16le", verbose=False, logger=None
            )
        finally:
            clip.close()
        return out_wav

    def _extract_wav_ffmpeg(self, video_path: str, sr: int) -> str:
        out_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
        # -vn for no video, single channel, 16kHz, PCM16LE
        cmd = [
            "ffmpeg", "-y", "-i", video_path, "-vn",
            "-ac", "1", "-ar", str(sr), "-c:a", "pcm_s16le", out_wav
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return out_wav

    def _extract_wav(self, video_path: str, sr: int) -> str:
        # First try MoviePy; if fails — direct ffmpeg
        try:
            return self._extract_wav_moviepy(video_path, sr)
        except Exception:
            return self._extract_wav_ffmpeg(video_path, sr)

    def analyze(self, video_path: str) -> MetricResult:
        t0 = time.time()
        errors: List[str] = []
        details: Dict = {}
        transcript = ""
        audio_path: Optional[str] = None

        try:
            # 1) Extract WAV
            audio_path = self._extract_wav(video_path, self.cfg["sample_rate"])
            if not (audio_path and os.path.exists(audio_path) and os.path.getsize(audio_path) > 0):
                raise OSError("Audio extraction failed: WAV not created or empty.")

            # 2) Whisper transcription on the **WAV** (not on webm!)
            result = self.whisper_model.transcribe(
                audio_path, language=self.cfg["language"], fp16=self.cfg["use_fp16"]
            )
            transcript = (result.get("text") or "").strip()

            # save transcript in cache for other analyzers using transcript
            transcript_cache.put(video_path, transcript)

            # 3) Grammar check (if available)
            grammar_errors = []
            if self._tool and transcript:
                matches = self._tool.check(transcript)
                grammar_errors = [
                    {
                        "rule": m.ruleId, "message": m.message,
                        "replacements": m.replacements[:3],
                        "offset": m.offset, "error_length": m.errorLength
                    }
                    for m in matches
                ]

            # Scoring: decreases relative to number of errors per word
            num_err = len(grammar_errors)
            num_words = len(transcript.split())
            score = max(0.0, 100.0 - (num_err / max(1, num_words)) * 100.0)

            details = {
                "transcript": transcript,
                "word_count": num_words,
                "grammar_errors": grammar_errors or None,
                "config_used": self.cfg
            }

        except Exception as e:
            errors.append(f"{type(e).__name__}: {e}")
            score = 0.0

        finally:
            if audio_path and os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except OSError:
                    pass

        duration_ms = int((time.time() - t0) * 1000)
        return MetricResult(
            metric=self.metric,
            score=score,
            confidence=0.8 if transcript else 0.0,
            model=self.model,
            version=self.version,
            duration_ms=duration_ms,
            details=details or None,
            errors=errors or None,
        )