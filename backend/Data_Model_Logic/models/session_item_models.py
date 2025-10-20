from pydantic import BaseModel, Field, conint, confloat, validator
from typing import Dict, Optional
from datetime import datetime, timezone

# Represents a single analyzer result for a given video segment
class AnalyzerResult(BaseModel):
    score: confloat(ge=0, le=100)        # Score must be in range 0..100
    confidence: confloat(ge=0, le=1) = 1 # Confidence must be in range 0..1
    version: Optional[str] = None

class SessionItemCreate(BaseModel):
    session_id: str                      # Logical identifier of the session
    username: str                        # For now using username, can be replaced with user_id later
    scenario_id: str
    idx: conint(ge=0)                    # Index of the item within the session
    video_url: str
    analyzers: Dict[str, AnalyzerResult] # Example: {"tone": {...}, "eye_contact": {...}}
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validator("video_url")
    def non_empty_video(cls, v):
        if not v.strip():
            raise ValueError("video_url cannot be empty")
        return v
