# analyzers/registry.py
# ----------------------------
# Purpose:
#   Central registry (name -> analyzer class) + factory to build analyzer instances.
#
# Why:
#   The orchestrator shouldn't import or know about specific analyzers.
#   It asks the registry to build the list of analyzers based on:
#     - enabled metric names
#     - per-metric configuration
# ----------------------------

from typing import Dict, List, Type, Optional
from Performance_Analyzer.analyzers.base import BaseAnalyzer
from Performance_Analyzer.analyzers.eye_contact import EyeContactAnalyzer
from Performance_Analyzer.analyzers.head_pose import HeadPoseAnalyzer
from Performance_Analyzer.analyzers.tone import ToneAnalyzer 
from Performance_Analyzer.analyzers.speech_to_text import SpeechToTextAnalyzer
from Performance_Analyzer.analyzers.facial_expression import FacialExpressionAnalyzer
from Performance_Analyzer.analyzers.Content_Answer_Evaluator.Content_Answer_Evaluator import ContentAnswerEvaluator 
from Performance_Analyzer.analyzers.speech_style import SpeechStyleAnalyzer
from Performance_Analyzer.analyzers.grammar_ml import GrammarMLAnalyzer



# Map: metric name -> Analyzer class
REGISTERED_ANALYZERS: Dict[str, Type[BaseAnalyzer]] = {
    "eye_contact": EyeContactAnalyzer,
    "head_pose": HeadPoseAnalyzer,
    "tone": ToneAnalyzer,  
    "speech_to_text": SpeechToTextAnalyzer,
    "facial_expression": FacialExpressionAnalyzer,
    "speech_style": SpeechStyleAnalyzer,
    "grammar_ml": GrammarMLAnalyzer,
    "content_answer_quality": ContentAnswerEvaluator,
}

def build_analyzers(enabled: Optional[List[str]] = None,
                    config_by_metric: Optional[Dict] = None) -> List[BaseAnalyzer]:
    """
    Create analyzer instances based on:
      - 'enabled': which metric names to include
      - 'config_by_metric': optional dict of per-metric config (e.g., thresholds)
    Returns a list of BaseAnalyzer subclasses, ready to be used by the orchestrator.
    """
    config_by_metric = config_by_metric or {}
    metrics = enabled or list(REGISTERED_ANALYZERS.keys())
    analyzers: List[BaseAnalyzer] = []
    for m in metrics:
        cls = REGISTERED_ANALYZERS.get(m)
        if not cls:
            # Unknown metric name: skip silently (or raise if you prefer strict behavior)
            continue
        analyzers.append(cls(config=config_by_metric.get(m)))
    return analyzers
