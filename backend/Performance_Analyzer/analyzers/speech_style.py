# -*- coding: utf-8 -*-
# Performance_Analyzer/analyzers/speech_style.py
"""
SpeechStyleAnalyzer (EN-only, dictionary-first)

Scoring:
  - Start from 100.
  - Bad words:    -20 per occurrence (cap controlled by penalty_bad_max; None = no cap).
  - Weak words:   density-based (preferred) or count-based penalties, capped by penalty_weak_max.
  - Good words:   density-based bonus; does NOT apply if any bad word exists; and can at most
                  offset the weak penalty (never increases logical score above base-weak).
  - Final score is clamped to [0, 100].

Labels:
  - 'polite' : bad_count == 0, score >= polite_min_score, weak_rate <= polite_max_weak_rate,
               good_rate >= polite_min_rate
  - 'good'   : 91..100
  - 'casual' : 81..90
  - 'inappropriate' : <=80 & bad_count in {1,2}
  - 'toxic'  : <=80 & bad_count >= 3
  - 'unknown': empty transcript
"""

import os, re, joblib
from typing import Optional, Dict, Any, List, Tuple
from Performance_Analyzer.analyzers.base import BaseAnalyzer
from Performance_Analyzer.schemas import MetricResult
from Performance_Analyzer.utils import transcript_cache


# ---------------------------- Helpers ----------------------------

def _normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()

def _tokenize_words(s: str) -> List[str]:
    # English-oriented tokenizer: keep letters/digits/apostrophes
    toks = re.split(r"[^0-9A-Za-z']+", s or "")
    return [t for t in toks if t]

def _load_wordset(path: Optional[str]) -> List[str]:
    if not path or not os.path.exists(path):
        return []
    out: List[str] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            w = line.strip()
            if w and not w.startswith("#"):
                out.append(w.lower())
    return out

def _prepare_wordlist(path: Optional[str]) -> Tuple[set, List[Tuple[str, ...]]]:
    """
    Load a file of words/phrases and split into:
      - exact single-token words (set)
      - multi-token phrases (list of token tuples)
    """
    exact: set = set()
    phrases: List[Tuple[str, ...]] = []
    for w in _load_wordset(path):
        if " " in w:
            phrases.append(tuple(_tokenize_words(w)))
        else:
            exact.add(w)
    return exact, phrases

def count_words_from_list(
    text: str,
    toks: List[str],
    exact_words: set,
    phrases: Optional[List[Tuple[str, ...]]] = None,
    regex_patterns: Optional[List[re.Pattern]] = None,
) -> Tuple[int, Dict[str, int]]:
    """
    Generic counter for single words, multi-word phrases, and optional regex patterns.
    Returns (total_count, dict[item -> count]).
    """
    counts: Dict[str, int] = {}

    # Single-token exact matches
    if exact_words:
        for t in toks:
            tt = t.lower()
            if tt in exact_words:
                counts[tt] = counts.get(tt, 0) + 1

    # Multi-token phrases
    if phrases:
        ltoks = [t.lower() for t in toks]
        n = len(ltoks)
        for phrase in phrases:
            m = len(phrase)
            if m == 0 or n < m:
                continue
            for i in range(n - m + 1):
                if tuple(ltoks[i:i+m]) == phrase:
                    key = " ".join(phrase)
                    counts[key] = counts.get(key, 0) + 1

    # Regex patterns (e.g., ummm, uhhh...)
    if regex_patterns:
        for rgx in regex_patterns:
            for m in rgx.finditer(text):
                key = m.group(0).lower()
                counts[key] = counts.get(key, 0) + 1

    total = sum(counts.values())
    return total, counts


# ---------------------------- Analyzer ----------------------------

class SpeechStyleAnalyzer(BaseAnalyzer):
    metric  = "speech_style"
    model   = "tfidf+logreg"
    version = "1.4.0"  # Base=100, polite bonus, generic counters

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)

        # --- Optional ML pipeline (only if model_path explicitly provided & exists) ---
        self.model_path     = (config or {}).get("model_path", None)
        self.transcript_key = (config or {}).get("transcript_key", "transcript")

        # --- Dictionaries (English only) ---
        self.badwords_path   = (config or {}).get("badwords_path", None)
        self.weak_words_path = (config or {}).get("weak_words_path", None)
        self.good_words_path = (config or {}).get("good_words_path", None)

        # --- Scoring params (tunable) ---
        self.threshold_bad       = float((config or {}).get("threshold_bad", 0.55))   # for ML if present

        # Hard/bad words
        self.penalty_bad_single  = float((config or {}).get("penalty_bad_single", 20.0))
        # allow None = no cap
        self.penalty_bad_max     = (config or {}).get("penalty_bad_max", 60.0)

        # Weak words (two modes)
        self.weak_penalty_mode   = (config or {}).get("weak_penalty_mode", "count")   # 'density' or 'count'
        self.penalty_weak_per_10pct = float((config or {}).get("penalty_weak_per_10pct", 5.0))
        self.penalty_weak_per2   = (config or {}).get("penalty_weak_per2", None)      # keep bwd-compat
        self.penalty_weak_per10  = float((config or {}).get("penalty_weak_per10", 5.0))
        self.penalty_weak_max    = float((config or {}).get("penalty_weak_max", 25.0))
        self.min_text_tokens     = int((config or {}).get("min_text_tokens", 8))

        # Good/polite words (bonus)
        self.bonus_polite_per_10pct = float((config or {}).get("bonus_polite_per_10pct", 5.0))
        self.bonus_polite_max    = float((config or {}).get("bonus_polite_max", 10.0))
        self.polite_min_score    = float((config or {}).get("polite_min_score", 96.0))
        self.polite_min_rate     = float((config or {}).get("polite_min_rate", 2.0))   # %
        self.polite_max_weak_rate= float((config or {}).get("polite_max_weak_rate", 3.0))  # %

        # Load optional ML pipeline only if path provided and exists
        self.pipe = None
        if isinstance(self.model_path, str) and self.model_path and os.path.exists(self.model_path):
            try:
                self.pipe = joblib.load(self.model_path)
            except Exception:
                self.pipe = None

        # Load dictionaries
        # Bad words: only single tokens (fast path)
        self.bad_words = set(w.lower() for w in _load_wordset(self.badwords_path))

        # Weak words: singles + phrases + regex fillers
        self.weak_words_exact, self.weak_phrases = _prepare_wordlist(self.weak_words_path)

        # Good words: singles + phrases (no regex)
        self.good_words_exact, self.good_phrases = _prepare_wordlist(self.good_words_path)

        # Regex patterns for repeated fillers (English)
        self.regex_fillers = [
            re.compile(r"\bumm+\b", re.IGNORECASE),   # umm, ummm...
            re.compile(r"\buhh+\b", re.IGNORECASE),   # uhh, uhhh...
            re.compile(r"\berm+\b", re.IGNORECASE),   # erm, ermm...
            re.compile(r"\bhmm+\b", re.IGNORECASE),   # hmm, hmmm...
        ]

    # ------------------------ I/O helpers ------------------------

    def _get_transcript(self, video_path: str) -> str:
        # 1) in-memory cache
        txt = transcript_cache.get(video_path)
        if isinstance(txt, str) and txt.strip():
            return txt
        # 2) context
        ctx = getattr(self, "context", {}) or {}
        txt = ctx.get(self.transcript_key, "")
        if isinstance(txt, str) and txt.strip():
            return txt
        # 3) sidecar file next to the media
        sidecar = f"{video_path}.transcript.txt"
        if os.path.exists(sidecar):
            with open(sidecar, "r", encoding="utf-8") as f:
                return f.read()
        return ""

    # ------------------------ Analyze ------------------------

    def analyze(self, video_path: str) -> MetricResult:
        raw = (self._get_transcript(video_path) or "")
        text = _normalize_text(raw)

        if not text:
            return MetricResult(
                metric=self.metric,
                score=0.0,
                confidence=0.0,
                model=self.model,
                version=self.version,
                duration_ms=0,
                details={
                    "pred_label": "unknown",
                    "p_bad": None,
                    "flagged_words": [],
                    "weak_counts": {},
                    "good_counts": {},
                    "transcript_used": False,
                    "model_path": self.model_path,
                    "note": "no transcript available",
                },
            )

        toks = _tokenize_words(text)
        n_tokens = max(len(toks), 1)

        # --- Count categories ---
        bad_total, bad_counts = count_words_from_list(
            text, toks, self.bad_words
        )
        weak_total, weak_counts = count_words_from_list(
            text, toks, self.weak_words_exact, self.weak_phrases, self.regex_fillers
        )
        good_total, good_counts = count_words_from_list(
            text, toks, self.good_words_exact, self.good_phrases
        )

        bad_count = bad_total  # naming for clarity

        # --- Optional ML (reference only) ---
        proba = None
        model_pred = "ok"
        if self.pipe and hasattr(self.pipe, "predict_proba"):
            classes = list(getattr(self.pipe, "classes_", []))
            idx_bad = classes.index("impolite") if "impolite" in classes else 1
            try:
                p = float(self.pipe.predict_proba([text])[0][idx_bad])
            except Exception:
                p = 0.0
            proba = p
            model_pred = "inappropriate" if p >= self.threshold_bad else "ok"
        elif self.pipe:
            try:
                y = self.pipe.predict([text])[0]
                model_pred = "inappropriate" if str(y).lower() in {"impolite", "bad", "1"} else "ok"
            except Exception:
                model_pred = "ok"

        # -------------------- Scoring --------------------
        base = 100.0

        # Weak penalty
        penalty_weak = 0.0
        if weak_total > 0:
            if str(self.weak_penalty_mode).lower() == "density":
                # Each 10% weak words => penalty_weak_per_10pct points (default 5)
                factor = 50.0 * (self.penalty_weak_per_10pct / 5.0)
                penalty_weak = (weak_total / float(n_tokens)) * factor
            else:
                # Count mode (legacy)
                if n_tokens >= self.min_text_tokens:
                    if self.penalty_weak_per2 is not None:
                        penalty_weak = (weak_total / 2.0) * float(self.penalty_weak_per2)
                    else:
                        penalty_weak = (weak_total / 10.0) * self.penalty_weak_per10
        penalty_weak = min(self.penalty_weak_max, penalty_weak)

        # Bad words penalty: -20 per occurrence; optional max (None => no cap)
        penalty_hard = bad_count * self.penalty_bad_single
        if self.penalty_bad_max is not None:
            try:
                penalty_hard = min(float(self.penalty_bad_max), penalty_hard)
            except Exception:
                # if misconfigured as non-numeric string, ignore cap
                pass

        # Polite bonus (density-based), never compensates for bad words,
        # and at most cancels the weak penalty (not more).
        bonus_polite = 0.0
        if good_total > 0:
            bonus_factor = 50.0 * (self.bonus_polite_per_10pct / 5.0)   # 10% polite => +bonus_polite_per_10pct
            raw_bonus = (good_total / float(n_tokens)) * bonus_factor
            bonus_polite = min(self.bonus_polite_max, raw_bonus)

            if bad_count > 0:
                bonus_polite = 0.0
            else:
                # cannot exceed the weak penalty logically
                bonus_polite = min(bonus_polite, penalty_weak)

        score = base - penalty_hard - penalty_weak + bonus_polite
        score = max(0.0, min(100.0, score))  # clamp

        # -------------------- Labels --------------------
        weak_rate   = 100.0 * (weak_total / float(n_tokens))
        good_rate   = 100.0 * (good_total / float(n_tokens))

        if (bad_count == 0
            and score >= self.polite_min_score
            and weak_rate <= self.polite_max_weak_rate
            and good_rate >= self.polite_min_rate):
            final_label = "polite"
        elif score > 90.0:
            final_label = "good"
        elif 81.0 <= score <= 90.0:
            final_label = "casual"
        else:
            final_label = "toxic" if bad_count >= 3 else ("inappropriate" if bad_count >= 1 else "casual")

        # -------------------- Return --------------------
        top_weak = sorted(weak_counts.items(), key=lambda kv: kv[1], reverse=True)[:50]
        top_good = sorted(good_counts.items(), key=lambda kv: kv[1], reverse=True)[:50]

        return MetricResult(
            metric=self.metric,
            score=score,
            confidence=1.0,
            model=self.model,
            version=self.version,
            duration_ms=0,
            details={
                "transcript_used": True,

                "pred_label": final_label,
                "final_label": final_label,
                "model_pred": model_pred,
                "p_bad": proba,

                "flagged_words": list(bad_counts.keys())[:100],
                "bad_count": bad_count,

                "weak_counts": dict(top_weak),
                "weak_total": weak_total,

                "good_counts": dict(top_good),
                "good_total": good_total,

                "weak_rate": round(weak_rate, 1),
                "good_rate": round(good_rate, 1),
                "bonus_polite": round(bonus_polite, 2),

                "n_tokens": n_tokens,
                "model_path": self.model_path,
                "badwords_path": self.badwords_path,
                "weak_words_path": self.weak_words_path,
                "good_words_path": self.good_words_path,

                "params": {
                    "penalty_bad_single": self.penalty_bad_single,
                    "penalty_bad_max": self.penalty_bad_max,
                    "weak_penalty_mode": self.weak_penalty_mode,
                    "penalty_weak_per_10pct": self.penalty_weak_per_10pct,
                    "penalty_weak_per2": self.penalty_weak_per2,
                    "penalty_weak_per10": self.penalty_weak_per10,
                    "penalty_weak_max": self.penalty_weak_max,
                    "bonus_polite_per_10pct": self.bonus_polite_per_10pct,
                    "bonus_polite_max": self.bonus_polite_max,
                    "polite_min_score": self.polite_min_score,
                    "polite_min_rate": self.polite_min_rate,
                    "polite_max_weak_rate": self.polite_max_weak_rate,
                    "min_text_tokens": self.min_text_tokens,
                    "threshold_bad": self.threshold_bad,
                },
            },
        )
