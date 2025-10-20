# SPEAKEASE-BACKEND/Video_Meeting_Controller/Uploads/uploads_bp.py
from uuid import uuid4
from pathlib import Path
from flask import Blueprint, request, jsonify, send_from_directory, current_app, url_for
from werkzeug.utils import secure_filename

uploads_bp = Blueprint("uploads_bp", __name__)
ALLOWED_EXT = {".webm", ".mp4", ".mov", ".mkv"}

def get_upload_dir() -> Path:
    p = Path(current_app.config["UPLOADS_DIR"])
    p.mkdir(parents=True, exist_ok=True)
    return p

@uploads_bp.post("/upload/session-video")
def upload_session_video():
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "file is required"}), 400

    safe_name = secure_filename(f.filename or "session.webm")
    ext = Path(safe_name).suffix.lower() or ".webm"
    if ext not in ALLOWED_EXT:
        return jsonify({"error": f"file type {ext} not allowed"}), 400

    filename = f"{uuid4().hex}{ext}"
    save_path = get_upload_dir() / filename
    f.save(save_path)

    # חשוב: ה-URL משתמש בנתיב /uploaded_videos/... שתואם לשם התיקייה
    video_url = url_for("uploads_bp.serve_uploaded_video", filename=filename, _external=True)
    return jsonify({"video_url": video_url}), 200

@uploads_bp.get("/uploaded_videos/<path:filename>")
def serve_uploaded_video(filename: str):
    return send_from_directory(get_upload_dir(), filename, as_attachment=False)
