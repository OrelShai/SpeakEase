# Performance_Analyzer/analyzers/grammar_ml.py
# --------------------------------------------
# GrammarMLAnalyzer: Scores language quality/fluency based on features from transcription + ML model (scikit-learn).
# If no joblib model is available, falls back to stable heuristics.
# --------------------------------------------

import os
import time
import statistics
from typing import Optional, Dict, Any, List

from Performance_Analyzer.analyzers.base import BaseAnalyzer
from Performance_Analyzer.schemas import MetricResult
from Performance_Analyzer.utils import transcript_cache

# --- Optional deps (loaded gracefully) ---
try:
    import joblib
    _HAS_JOBLIB = True
except Exception:
    joblib = None
    _HAS_JOBLIB = False

try:
    import language_tool_python
    _HAS_LT = True
except Exception:
    language_tool_python = None
    _HAS_LT = False

try:
    import whisper
    _HAS_WHISPER = True
except Exception:
    whisper = None
    _HAS_WHISPER = False


class GrammarMLAnalyzer(BaseAnalyzer):
    """
    ML-based analyzer:
      - Reuses transcription from transcript_cache (or Whisper fallback per config)
      - Extracts linguistic features (error_rate, fillers, TTR, sentence stats, ...)
      - If joblib model exists: uses it; otherwise - fallback heuristic formula
    """
    metric  = "grammar_ml"
    model   = "sklearn(logreg)+LT (fallback: heuristic)"
    version = "1.0.0"

    # Static tools to avoid reloading on each run
    _lt_tool = None
    _whisper_model = None

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        c = self.config or {}

        # Defaults
        self.cfg = {
            "language": c.get("language", "en-US"),
            "use_whisper_fallback": bool(c.get("use_whisper_fallback", False)),
            "whisper_model": c.get("whisper_model", "tiny"),
            "model_path": c.get("model_path", "Tools/models/grammar_quality_lr.joblib"),
            "min_text_tokens": int(c.get("min_text_tokens", 5)),
            "max_text_len_chars": int(c.get("max_text_len_chars", 4000)),
            "score_floor": float(c.get("score_floor", 0.0)),
            "score_ceil": float(c.get("score_ceil", 100.0)),
            "filler_words": c.get("filler_words", [
                "um", "uh", "erm", "like", "you know", "kinda", "sort of", "actually", "basically"
            ]),
        }

        # Initialize LanguageTool once
        if _HAS_LT and GrammarMLAnalyzer._lt_tool is None:
            GrammarMLAnalyzer._lt_tool = language_tool_python.LanguageTool(self.cfg["language"])

        # Initialize Whisper fallback (only if requested)
        if self.cfg["use_whisper_fallback"] and _HAS_WHISPER and GrammarMLAnalyzer._whisper_model is None:
            GrammarMLAnalyzer._whisper_model = whisper.load_model(self.cfg["whisper_model"])

        # Load trained model (joblib) if exists
        self._clf = None
        mp = self.cfg["model_path"]
        if _HAS_JOBLIB and isinstance(mp, str) and os.path.exists(mp):
            try:
                self._clf = joblib.load(mp)
            except Exception:
                self._clf = None  # Fall back to heuristics if loading failed

    # ---------- Helpers ----------

    def _get_transcript(self, video_path: str) -> str:
        """Gets transcription from cache; if not available and allowed in config, runs Whisper on video file directly."""
        txt = transcript_cache.get(video_path)
        if txt:
            return txt

        if self.cfg["use_whisper_fallback"] and _HAS_WHISPER and GrammarMLAnalyzer._whisper_model:
            res = GrammarMLAnalyzer._whisper_model.transcribe(video_path, fp16=False)
            txt = (res.get("text") or "").strip()
            if txt:
                transcript_cache.put(video_path, txt)
                return txt
        return ""

    def _grammar_errors(self, text: str) -> List[Dict[str, Any]]:
        """Grammar check via LanguageTool; returns abbreviated list of errors with important details."""
        tool = GrammarMLAnalyzer._lt_tool
        if not (_HAS_LT and tool and text):
            return []
        matches = tool.check(text)
        out = []
        for m in matches[:500]:
            out.append({
                "rule": m.ruleId,
                "message": m.message,
                "offset": m.offset,
                "error_length": m.errorLength,
                "replacements": m.replacements[:3],
            })
        return out

    def _split_sentences(self, text: str) -> List[str]:
        """Simple sentence splitting to avoid heavy dependencies."""
        for sep in ["\n", "!", "?", ";"]:
            text = text.replace(sep, ".")
        parts = [s.strip() for s in text.split(".")]
        return [p for p in parts if p]

    def _filler_density(self, text: str) -> float:
        """How many filler words per 100 words (approximately, including multi-word expressions)."""
        if not text:
            return 0.0
        words = text.lower().split()
        n = len(words)
        if n == 0:
            return 0.0
        joined = " " + " ".join(words) + " "
        cnt = 0
        for w in self.cfg["filler_words"]:
            w_l = w.lower().strip()
            if " " in w_l:
                cnt += joined.count(" " + w_l + " ")
            else:
                cnt += words.count(w_l)
        return 100.0 * cnt / max(1, n)

    def _compute_features(self, text: str, grammar_errs: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate quantitative features from text and errors."""
        text = text[: self.cfg["max_text_len_chars"]]
        wc = len(text.split())
        cc = len(text)
        uniq = len(set(w.lower() for w in text.split()))
        ttr = uniq / max(1, wc)
        avg_wlen = (sum(len(w) for w in text.split()) / max(1, wc)) if wc else 0.0
        sents = self._split_sentences(text)
        sent_lens = [len(s.split()) for s in sents] or [0]
        mean_sent = statistics.mean(sent_lens)
        stdev_sent = statistics.pstdev(sent_lens) if len(sent_lens) > 1 else 0.0
        err_rate = len(grammar_errs) / max(1, wc)
        fillers_per_100 = self._filler_density(text)

        return {
            "word_count": wc,
            "char_count": cc,
            "type_token_ratio": ttr,
            "avg_word_len": avg_wlen,
            "mean_sent_len": mean_sent,
            "stdev_sent_len": stdev_sent,
            "error_rate": err_rate,
            "fillers_per_100w": fillers_per_100,
        }

    def _heuristic_score(self, feats: Dict[str, float]) -> float:
        """Fallback score if no trained model available."""
        score = 100.0
        # Strong penalty for grammar errors relative to length (errors per 100w)
        score -= 90.0 * feats["error_rate"] * 100.0
        # Penalty for filler words
        score -= 1.0 * feats["fillers_per_100w"]
        # Light bonus for vocabulary richness
        score += 10.0 * (feats["type_token_ratio"] - 0.35)
        # Penalty for short text
        if feats["word_count"] < 30:
            score -= 8.0
        # Clamp to range
        low, high = self.cfg["score_floor"], self.cfg["score_ceil"]
        return max(low, min(high, score))

    # ---------- Engine ----------

    def analyze(self, video_path: str) -> MetricResult:
        t0 = time.time()
        errs: List[str] = []
        details: Dict[str, Any] = {}
        score = 0.0
        conf = 0.0

        try:
            text = self._get_transcript(video_path)
            if not text or len(text.split()) < self.cfg["min_text_tokens"]:
                raise ValueError("No transcript available (or too short) for GrammarMLAnalyzer.")

            # Grammar via LT
            grammar_errs = self._grammar_errors(text)
            # Features
            feats = self._compute_features(text, grammar_errs)
            details["features"] = feats
            details["grammar_errors_count"] = len(grammar_errs)
            details["grammar_errors"] = grammar_errs  

            # Top rules (for analysis)
            if grammar_errs:
                rc: Dict[str, int] = {}
                for e in grammar_errs:
                    rid = e.get("rule") or "UNK"
                    rc[rid] = rc.get(rid, 0) + 1
                details["top_rules"] = sorted(rc.items(), key=lambda x: x[1], reverse=True)[:10]

            # Prediction via sklearn model if available
            if self._clf is not None:
                try:
                    proba = self._clf.predict_proba([feats])[0]
                    # Assume column 1 = "good"
                    p_good = float(proba[1]) if len(proba) > 1 else float(proba[0])
                    low, high = self.cfg["score_floor"], self.cfg["score_ceil"]
                    score = low + p_good * (high - low)
                    conf = 0.9
                except Exception as e:
                    errs.append(f"PredictError: {e}")
                    score = self._heuristic_score(feats)
                    conf = 0.7
            else:
                # fallback heuristic
                score = self._heuristic_score(feats)
                conf = 0.7

        except Exception as e:
            errs.append(f"{type(e).__name__}: {e}")
            score = 0.0
            conf = 0.0

        dur = int((time.time() - t0) * 1000)
        return MetricResult(
            metric=self.metric,
            score=score,
            confidence=conf,
            model=self.model,
            version=self.version,
            duration_ms=dur,
            details=details or None,
            errors=errs or None,
        )
