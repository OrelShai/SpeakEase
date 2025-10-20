# Performance_Analyzer/performance_analyzer.py
# --------------------------------------------
# Single, slim entry point for running analyzers on a local video file path.
# No base64 support here. Orchestrator + configs live together.
# --------------------------------------------

from typing import List, Dict, Optional
import os
import json

from Performance_Analyzer.analyzers.registry import build_analyzers
from Performance_Analyzer.schemas import MetricResult
from Performance_Analyzer.analyzers.facial_expression import _make_json_serializable
from Performance_Analyzer.utils import transcript_cache


# --- Per-metric configs (edit as needed) ---

from pathlib import Path  # אם עדיין לא יובא למעלה

MODEL_DIR = Path(__file__).resolve().parents[1] / "tools" / "train_models"

GRAMMAR_ML_CONFIG = {
    "language": "en-US",
    "use_whisper_fallback": False,
    "whisper_model": "tiny",
    "model_path": str(MODEL_DIR / "grammar_quality_lr.joblib"),
    "score_floor": 40.0, "score_ceil": 100.0,
    "heur_err_penalty_per_100": 4.0,
    "heur_filler_penalty_per_100": 0.7,
    "heur_ttr_bonus": 12.0,
    "heur_short_text_threshold": 30,
    "heur_short_text_penalty": 4.0,
    "heur_err_cap_per_100": 40.0,
    "heur_bias": 0.0,
}

SPEECH_TO_TEXT_CONFIG = {
    "grammar_tool": "en-US",
    "whisper_model": "small",
}

EYE_CONTACT_CONFIG = {
    "frame_stride": 5,
    # Offsets: forward if merged_offset <= effective_threshold
    "forward_thresh": 0.38,
    # Horizontal-heavy weighting (penalize sideways more than up/down)
    "vertical_weight": 0.55,   # lower than 0.7 → more tolerance for looking down
    "require_both_eyes": True,
    "max_eye_width_ratio": 1.6,
    "dynamic_thresh": True,    # stricter when head is turned
    "smooth_window": 5,
    "min_detection_confidence": 0.5,
    "min_tracking_confidence":  0.5,
}

HEAD_POSE_CONFIG = {
    "frame_stride": 3,
    "yaw_thresh": 16.0,
    "pitch_thresh": 30.0,
    "smooth_window": 7,
    "soft_margin": 0.30,
    "yaw_bias": 0.0,
    "pitch_bias": 0.0,
    "score_mode": "soft",
    "min_detection_confidence": 0.5,
    "min_tracking_confidence": 0.5,
}

TONE_CONFIG = {
    "sample_rate": 22050,     # audio sample rate (Hz)
    "hop_length": 512,        # frame hop for features
    "fmin": 75.0,
    "fmax": 450.0,
    "voicing_thresh": 0.10,   # voiced threshold (0..1)
    "min_duration_sec": 3.0,  
}

FACIAL_EXPRESSION_CONFIG = {
        "frame_stride": 10,  # Process every 10th frame for faster analysis
        "confidence_threshold": 0.3,  # Lower threshold to catch more emotions
        "face_detection_scale": 1.1,  # Scale factor for face detection
        "min_neighbors": 3  
            # Notes for min_duration_sec:
                # Lower values (1-3):
                # - More sensitive detection
                # - Catches more faces (including weak detections)
                # - Higher chance of false positives (detecting non-faces as faces)
                # Higher values (4-8):
                # - More strict detection
                # - Only keeps very confident face detections
                # - Lower chance of false positives but might miss some real faces
    }

SPEECH_STYLE_CONFIG = {
    "transcript_key": "transcript",
    "model_path": "",

    "badwords_path": "Tools/data/badwords_custom.txt",
    "weak_words_path": "Tools/data/weak_words.txt",
    "good_words_path": "Tools/data/good_words.txt",

    # penalties
    "penalty_bad_single": 20.0,
    "penalty_bad_max": None,

    # weak penalty
    "weak_penalty_mode": "density",
    "penalty_weak_per_10pct": 5.0,
    "penalty_weak_per2": 1.0,
    "penalty_weak_per10": 5.0,
    "penalty_weak_max": 19.0,
    "min_text_tokens": 1,

    # polite bonus
    "bonus_polite_per_10pct": 5.0,
    "bonus_polite_max": 10.0,

    # polite label thresholds
    "polite_min_score": 96.0,
    "polite_min_rate": 2.0,
    "polite_max_weak_rate": 3.0
}


# NEW: Content Answer Evaluator Config
CONTENT_ANSWER_EVALUATOR_CONFIG = {
    "whisper_model": "small",  # For transcription
    "language": "en",
    "sample_rate": 16000,
    "question": "Tell me about yourself briefly (up to one minute).",
}

ENABLED_METRICS: List[str] = [
    "eye_contact",
    "head_pose",
    "tone",
    "speech_to_text",
    "grammar_ml",
    "facial_expression",
    "speech_style",
    "content_answer_quality",  
]



CONFIG_BY_METRIC: Dict[str, Dict] = {
    "eye_contact": EYE_CONTACT_CONFIG,
    "head_pose": HEAD_POSE_CONFIG,
    "tone": TONE_CONFIG,
    "speech_to_text": SPEECH_TO_TEXT_CONFIG,
    "facial_expression": FACIAL_EXPRESSION_CONFIG,
    "grammar_ml": GRAMMAR_ML_CONFIG,  
    "speech_style": SPEECH_STYLE_CONFIG,
    "content_answer_quality": CONTENT_ANSWER_EVALUATOR_CONFIG, 
}



class PerformanceAnalyzer:
    """
    Orchestrator that:
      - builds analyzers from the registry based on ENABLED_METRICS
      - runs each analyzer on the same video_path
      - returns a combined dict of metric -> result (dict form)
    """

    def __init__(self,
                 enabled_metrics: Optional[List[str]] = None,
                 config_by_metric: Optional[Dict] = None) -> None:
        self.analyzers = build_analyzers(
            enabled=enabled_metrics or ENABLED_METRICS,
            config_by_metric=config_by_metric or CONFIG_BY_METRIC
        )

    def analyze_video(self, video_path: str, question: str = None) -> Dict[str, Dict]:
        """
        Run all analyzers on the given video file path.
        Returns:
          { metric_name: MetricResult.to_dict() }
        """
        results: Dict[str, Dict] = {}
        try:
            for analyzer in self.analyzers:
                # Check if this is the content answer analyzer that needs the question
                if hasattr(analyzer, 'metric') and analyzer.metric == "content_answer_quality":
                    # Pass both video_path and question to content analyzer
                    res: MetricResult = analyzer.analyze(video_path, question)
                else:
                    # Regular analyzers only need video_path
                    res: MetricResult = analyzer.analyze(video_path)
                results[res.metric] = res.to_dict()
            return results
        finally:
            transcript_cache.clear(video_path)


# Create a single orchestrator instance (reuse across requests)
_ORCH = PerformanceAnalyzer(
    enabled_metrics=ENABLED_METRICS,
    config_by_metric=CONFIG_BY_METRIC
)


def analyze_performance_from_path(video_path: str, scenario_id: str = None, question: str = None) -> dict:
    """
    Public entry for routes/services:
      - Validates the local path
      - Calls the orchestrator
      - Wraps the response with scenario_id
    """
    if not video_path or not os.path.exists(video_path):
        return {"error": f"Video path not found: {video_path}"}
        
    results = _ORCH.analyze_video(video_path, question)
    return {"scenario_id": scenario_id, "results": results}



