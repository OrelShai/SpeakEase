# analyzers/base.py
# ----------------------------
# Purpose:
#   Declare a uniform analyzer interface so the orchestrator can call any
#   analyzer in the same way. Subclasses must implement analyze(video_path).
#
# Why:
#   A consistent abstract base class prevents coupling between the orchestrator
#   and specific analyzers. Adding/removing analyzers becomes trivial.
# ----------------------------

from abc import ABC, abstractmethod
from typing import Optional, Dict
from Performance_Analyzer.schemas import MetricResult

class BaseAnalyzer(ABC):
    """
    Base class for all analyzers. Each analyzer:
      - defines: metric, model, version (class attributes)
      - implements: analyze(video_path) -> MetricResult
      - can receive an optional config dict for thresholds, sampling, etc.
    """
    metric: str = "unknown"
    model: str = "unknown"
    version: str = "0.0.0"

    def __init__(self, config: Optional[Dict] = None):
        # Per-analyzer configuration (e.g., thresholds, frame stride, etc.)
        self.config = config or {}

    @abstractmethod
    def analyze(self, video_path: str, question) -> MetricResult:
        """
        Run the analysis on the given video file path and return a normalized MetricResult.
        Subclasses MUST implement this method.
        """
        raise NotImplementedError
