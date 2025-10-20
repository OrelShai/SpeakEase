from flask import Blueprint, jsonify, request, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from datetime import datetime
from Data_Model_Logic.models.completed_session import CompletedSession
from Data_Model_Logic.repositories.users_repo import UsersRepository  # זה השינוי היחיד שנדרש
from Data_Model_Logic.models.custom_scenario import CustomScenario

completed_sessions_bp = Blueprint("completed_sessions_bp", __name__)


# Helper Function: Validate User and Scenario Existence
def validate_references(username, scenario_id):
    """Validate user and scenario existence using repository pattern"""
    from app import mongo
    
    users_repo = UsersRepository(mongo.db)
    if not users_repo.find_by_username(username):
        abort(400, description="Invalid username: User does not exist.")

    # Convert scenario_id to ObjectId (if it's not already an ObjectId)
    if not ObjectId.is_valid(scenario_id):
        abort(400, description="Invalid scenario_id format. Must be a valid ObjectId.")

    scenario_id = ObjectId(scenario_id)  # Convert after validation

    # Check if scenario exists in either `default_scenarios` or `user_custom_scenarios`
    scenario_exists = CustomScenario.collection().count_documents({"_id": scenario_id}) > 0

    if not scenario_exists:
        abort(400, description="Invalid scenario_id: Scenario not found in default or custom scenarios.")


# 📌 CREATE Completed Session (POST)
@completed_sessions_bp.route("/completed-sessions", methods=["POST"])
@jwt_required()
def create_completed_session():
    username = get_jwt_identity()  # Extract username from JWT
    data = request.json

    # Required fields validation
    if "scenario_id" not in data or "ratings" not in data or "video_url" not in data:
        abort(400, description="scenario_id, ratings, and video_url are required.")

    validate_references(username, data["scenario_id"])

    # Check if the session with the same video_url already exists
    existing_session = CompletedSession.collection().find_one({"video_url": data["video_url"]})

    if existing_session:
        return jsonify({"message": "Session already exists", "id": str(existing_session["_id"])}), 200

    new_session = {
        "username": username,
        "scenario_id": data["scenario_id"],
        "timestamp": datetime.utcnow(),
        "ratings": data["ratings"],
        "video_url": data["video_url"]
    }

    # Insert into MongoDB
    result = CompletedSession.collection().insert_one(new_session)

    return jsonify({"message": "Session recorded successfully", "id": str(result.inserted_id)}), 201


# 📌 READ All Completed Sessions for a User (GET)
@completed_sessions_bp.route("/completed-sessions", methods=["GET"])
@jwt_required()
def get_all_completed_sessions():
    username = get_jwt_identity()
    sessions = list(CompletedSession.collection().find({"username": username}))

    for session in sessions:
        session["_id"] = str(session["_id"])  # Convert ObjectId to string

    return jsonify(sessions), 200


# 📌 READ Specific Completed Session by ID (GET)
@completed_sessions_bp.route("/completed-sessions/<string:session_id>", methods=["GET"])
@jwt_required()
def get_completed_session(session_id):
    username = get_jwt_identity()
    session = CompletedSession.collection().find_one({"_id": ObjectId(session_id), "username": username})

    if not session:
        abort(404, description="Session not found or access denied.")

    session["_id"] = str(session["_id"])
    return jsonify(session), 200


# 📌 UPDATE Completed Session (PUT)
@completed_sessions_bp.route("/completed-sessions/<string:session_id>", methods=["PUT"])
@jwt_required()
def update_completed_session(session_id):
    username = get_jwt_identity()
    data = request.json

    session = CompletedSession.collection().find_one({"_id": ObjectId(session_id), "username": username})
    if not session:
        abort(404, description="Session not found or access denied.")

    CompletedSession.collection().update_one({"_id": ObjectId(session_id)}, {"$set": data})

    return jsonify({"message": "Session updated successfully"}), 200


# 📌 DELETE Completed Session (DELETE)
@completed_sessions_bp.route("/completed-sessions/<string:session_id>", methods=["DELETE"])
@jwt_required()
def delete_completed_session(session_id):
    username = get_jwt_identity()

    result = CompletedSession.collection().delete_one({"_id": ObjectId(session_id), "username": username})

    if result.deleted_count == 0:
        abort(404, description="Session not found or access denied.")

    return jsonify({"message": "Session deleted successfully"}), 200
