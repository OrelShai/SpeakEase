from pydantic import BaseModel, Field, confloat, conint, validator
from typing import Dict, Optional
from datetime import datetime, timezone

# Final score object for the whole session
class OverallScore(BaseModel):
    score: confloat(ge=0, le=100)
    confidence: confloat(ge=0, le=1) = 1

# Category-level score (verbal, body language, interaction)
class CategoryScore(BaseModel):
    score: Optional[confloat(ge=0, le=100)] = None

# Final aggregated analyzer result
class AnalyzerResultFinal(BaseModel):
    score: confloat(ge=0, le=100)
    confidence: confloat(ge=0, le=1) = 1
    version: Optional[str] = None

# Configuration of weights used for aggregation
class WeightsConfig(BaseModel):
    overall: Dict[str, confloat(ge=0, le=1)]
    categories: Dict[str, Dict[str, confloat(ge=0, le=1)]]

# Metadata block for completed sessions
class MetaInfo(BaseModel):
    schema_version: conint(ge=1) = 2
    pipeline_version: str
    weights: WeightsConfig
    num_items: conint(ge=1)

class CompletedSessionCreate(BaseModel):
    username: str
    scenario_id: str
    session_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    video_url: Optional[str] = ""

    overall: OverallScore
    categories: Dict[str, CategoryScore]
    analyzers: Dict[str, AnalyzerResultFinal]

    summary_text: Optional[str] = ""
    meta: MetaInfo

class CompletedSessionOut(BaseModel):
    id: str = Field(alias="_id")
    username: str
    scenario_id: str
    session_id: Optional[str] = ""
    timestamp: datetime
    video_url: str
    overall: OverallScore
    categories: Dict[str, CategoryScore]
    analyzers: Dict[str, AnalyzerResultFinal]
    summary_text: str
    meta: MetaInfo
