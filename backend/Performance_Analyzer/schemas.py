# schemas.py
# ----------------------------
# Purpose:
#   Define shared data structures used across analyzers and the orchestrator.
#   A single, consistent schema for metric results (MetricResult) keeps the
#   whole pipeline (analyzers -> orchestrator -> API -> Mongo/Frontend)
#   simple and predictable.
#
# Usage:
#   Each analyzer returns a MetricResult instance and the orchestrator converts
#   it to a dict via .to_dict() before sending to API / DB.
# ----------------------------

from dataclasses import dataclass, asdict
from typing import Optional, Dict, List

@dataclass
class MetricResult:
    """
    Uniform result for any analyzer.
    - metric:     Name of the metric (e.g., "eye_contact")
    - score:      Normalized 0..100 score (higher is better unless defined otherwise)
    - confidence: Optional 0..1 estimate of reliability (if available)
    - model:      The underlying model name used (e.g., "MediaPipeFaceMesh")
    - version:    Model/logic version (for tracking changes over time)
    - duration_ms:Runtime of the analyzer (milliseconds)
    - details:    Optional detailed info for debugging/inspection
    - errors:     Optional list of error messages if something went wrong
    """
    metric: str
    score: float
    confidence: Optional[float]
    model: str
    version: str
    duration_ms: int
    details: Optional[Dict] = None
    errors: Optional[List[str]] = None

    def to_dict(self) -> Dict:
        """
        Convert the dataclass to a plain dict that is JSON/Mongo friendly.
        """
        return asdict(self)
