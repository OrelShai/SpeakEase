# SPEAKEASE-BACKEND/Performance_Analyzer/analyzer_routes.py
# ---------------------------------------------------------
# Expose the analyzer pipeline as HTTP endpoints.
# Supports:
#   - DEV:  JSON with "video_path" (run on local file)
#   - PROD: JSON with "video_url" (file uploaded via /api/upload/session-video)
# ---------------------------------------------------------

import os
import warnings
# Suppress TensorFlow and related warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['PYTHONWARNINGS'] = 'ignore'
warnings.filterwarnings('ignore', category=UserWarning, module='google.protobuf')

from pathlib import Path
from urllib.parse import urlparse, unquote

from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity

from datetime import datetime, timezone
from typing import Optional

from Data_Model_Logic.repositories.session_items_repo import SessionItemsRepo
from Data_Model_Logic.repositories.completed_sessions_repo import CompletedSessionsRepo
from Video_Meeting_Controller.meeting_controller import MeetingController
from Performance_Analyzer.Config.weights import DEFAULT_WEIGHTS
from Data_Model_Logic.models.session_item_models import AnalyzerResult

from Performance_Analyzer.performance_analyzer import analyze_performance_from_path

from Video_Meeting_Controller.summary_and_convesation_AI import SummaryAndConversationAI

performance_analyzer_bp = Blueprint("performance_analyzer_bp", __name__)

# Global list to collect scenario answers for session summary
full_scenario_answers_review = []


def _get_aggregator() -> MeetingController:
    """Build a MeetingController wired to Mongo repositories and the configured weights."""
    db = current_app.config["MONGO_DB"]
    return MeetingController(
        sessions_repo=CompletedSessionsRepo(db),
        items_repo=SessionItemsRepo(db),
        weights=DEFAULT_WEIGHTS,
    )


def _get_uploads_dir() -> Path:
    """Resolve the uploads directory from app config; fallback to repository-relative path."""
    cfg = current_app.config.get("UPLOADS_DIR")
    if cfg:
        return Path(cfg)
    # Fallback relative to this repository layout (adjust if your structure changes)
    return Path(__file__).resolve().parents[1] / "Video_Meeting_Controller" / "uploaded_videos"


def _url_to_local_path(video_url: str) -> Optional[Path]:
    """Map an uploaded file URL to the local path inside UPLOADS_DIR."""
    p = urlparse(video_url)
    uploads_dir = _get_uploads_dir()
    for marker in ("/api/uploaded_videos/", "/uploaded_videos/"):
        if marker in p.path:
            filename = unquote(p.path.split(marker, 1)[1])
            return uploads_dir / filename
    return None


@performance_analyzer_bp.post("/performance/analyze-item")
@cross_origin()
@jwt_required()
def analyze_item_combined():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
    data = request.get_json() or {}

    required = ["session_id", "scenario_name", "idx", "question"]
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    session_id = str(data["session_id"]).strip()
    scenario_name = str(data["scenario_name"]).strip()
    try:
        idx = int(data["idx"])
    except Exception:
        return jsonify({"error": "idx must be an integer"}), 400

    video_url = data.get("video_url")
    video_path = data.get("video_path")
    question = data.get("question")

    local_path: Optional[Path] = None
    if video_url:
        local_path = _url_to_local_path(video_url)
        if not local_path or not local_path.exists():
            return jsonify({
                "error": "Uploaded file not found",
                "video_url": video_url,
                "resolved_path": str(local_path) if local_path else None
            }), 400
    elif video_path:
        if not os.path.exists(video_path):
            return jsonify({"error": f"File not found: {video_path}"}), 400
        local_path = Path(video_path)
        video_url = video_path
    else:
        return jsonify({"error": "Expected 'video_url' or 'video_path'."}), 400

    out = analyze_performance_from_path(str(local_path), scenario_name, question)
    if not isinstance(out, dict) or "error" in out:
        return jsonify(out if isinstance(out, dict) else {"error": "analysis failed"}), 400

    raw = out.get("results") if "results" in out else out
    if not isinstance(raw, dict):
        return jsonify({"error": "Analyzer output is not a valid dict"}), 400

    validated_analyzers = {}
    try:
        for k, v in raw.items():
            validated_analyzers[k] = AnalyzerResult(**v).dict()
    except Exception as e:
        return jsonify({"error": f"Invalid analyzers payload: {e}"}), 400

    username = get_jwt_identity()
    agg = _get_aggregator()
    agg.add_item(
        session_id=session_id,
        username=username,
        scenario_id=scenario_name,
        idx=idx,
        video_url=video_url,
        analyzers=validated_analyzers,
        timestamp=datetime.now(timezone.utc),
    )
    full_scenario_answers_review.append(raw)

    return jsonify({
        "ok": True,
        "stored": True,
        "session_id": session_id,
        "idx": idx,
        "analyzers": validated_analyzers,
        "details": raw
    }), 200


@performance_analyzer_bp.post("/performance/finalize-session")
@cross_origin()
@jwt_required()
def finalize_session():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
    data = request.get_json() or {}

    required = ["session_id", "scenario_name"]
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    username = get_jwt_identity()
    agg = _get_aggregator()
    completed_id, completed_doc = agg.finalize_session(
        username=username,
        scenario_id=str(data["scenario_name"]).strip(),
        session_id=str(data["session_id"]).strip(),
        video_url=data.get("video_url", ""),
        timestamp=datetime.now(timezone.utc),
        pipeline_version=data.get("pipeline_version", "2025.09.05"),
    )

    # Generate AI summary from collected answers
    summary_and_conversation_ai = SummaryAndConversationAI()
    sessionAiSummary = summary_and_conversation_ai.generate_summary(
        full_scenario_answers_review, 
        data["scenario_name"], 
        completed_id
    )
    
    # Clear the list for next session
    full_scenario_answers_review.clear()
    
    return jsonify({
        "completed_id": completed_id, 
        "completed": completed_doc, 
        "sessionAiSummary": sessionAiSummary  
    }), 201
