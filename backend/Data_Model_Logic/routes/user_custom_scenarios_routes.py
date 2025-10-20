from flask import Blueprint, jsonify, request, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from Data_Model_Logic.models.custom_scenario import CustomScenario
from Video_Meeting_Controller.gemini_question_generator import GeminiQuestionGenerator

user_custom_scenarios_bp = Blueprint("user_custom_scenarios_bp", __name__)

# ---------------------------------------------
# CREATE (new) – simplified schema for sessions
# POST /api/scenarios/create-scenario
# Body: { scenarioId, scenarioName, durationMin, notes? }
# ---------------------------------------------
@user_custom_scenarios_bp.route("/scenarios/create-scenario", methods=["POST"])
@jwt_required()
def create_simple_scenario():
    username = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    # Validate required fields
    required = ["scenarioName", "durationMin"]
    missing = [f for f in required if f not in data]
    if missing:
        abort(400, description=f"Missing fields: {', '.join(missing)}")

    # durationMin must be int
    try:
        duration_min = int(data["durationMin"])
    except Exception:
        abort(400, description="durationMin must be an integer")

    # notes optional, max 500
    notes = (data.get("notes") or "").strip()
    if len(notes) > 500:
        abort(400, description="notes must be at most 500 characters")

    # Generate questions using Gemini
    try:
        question_generator = GeminiQuestionGenerator()
        questions = question_generator.generate_questions(
            str(data["scenarioName"]),
            duration_min,
            notes,
        )
    except Exception as e:
        abort(500, description=f"Failed to generate questions: {str(e)}")

    # Build doc (no partner/language/voice/vocab)
    doc = {
        "username": username,
        "scenarioName": str(data["scenarioName"]),
        "durationMin": duration_min,
        "notes": notes,
        "questions": questions,  # Include questions in the document
    }

    result = CustomScenario.collection().insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    return jsonify(doc), 201


# -------------------------------
# READ ALL
# GET /api/user-custom-scenarios
# -------------------------------
@user_custom_scenarios_bp.route("/user-custom-scenarios", methods=["GET"])
@jwt_required()
def get_all_custom_scenarios():
    username = get_jwt_identity()
    scenarios = list(CustomScenario.collection().find({"username": username}))
    for s in scenarios:
        s["_id"] = str(s["_id"])
    return jsonify(scenarios), 200


# -------------------------------
# READ ONE
# GET /api/user-custom-scenarios/<id>
# -------------------------------
@user_custom_scenarios_bp.route("/user-custom-scenarios/<string:scenario_id>", methods=["GET"])
@jwt_required()
def get_custom_scenario(scenario_id):
    username = get_jwt_identity()
    try:
        oid = ObjectId(scenario_id)
    except Exception:
        abort(400, description="Invalid scenario_id")
    s = CustomScenario.collection().find_one({"_id": oid, "username": username})
    if not s:
        abort(404, description="Custom scenario not found or access denied.")
    s["_id"] = str(s["_id"])
    return jsonify(s), 200


# -------------------------------
# UPDATE (only simplified fields)
# PUT /api/user-custom-scenarios/<id>
# -------------------------------
@user_custom_scenarios_bp.route("/user-custom-scenarios/<string:scenario_id>", methods=["PUT"])
@jwt_required()
def update_custom_scenario(scenario_id):
    username = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    try:
        oid = ObjectId(scenario_id)
    except Exception:
        abort(400, description="Invalid scenario_id")

    s = CustomScenario.collection().find_one({"_id": oid, "username": username})
    if not s:
        abort(404, description="Custom scenario not found or access denied.")

    allowed = {"scenarioName", "durationMin", "notes"}
    update_data = {k: v for k, v in data.items() if k in allowed}

    if "durationMin" in update_data:
        try:
            update_data["durationMin"] = int(update_data["durationMin"])
        except Exception:
            abort(400, description="durationMin must be an integer")

    if "notes" in update_data:
        nv = (update_data.get("notes") or "").strip()
        if len(nv) > 500:
            abort(400, description="notes must be at most 500 characters")
        update_data["notes"] = nv

    if not update_data:
        return jsonify({"message": "Nothing to update"}), 200

    CustomScenario.collection().update_one({"_id": oid}, {"$set": update_data})
    return jsonify({"message": "Custom scenario updated"}), 200


# -------------------------------
# DELETE
# DELETE /api/user-custom-scenarios/<id>
# -------------------------------
@user_custom_scenarios_bp.route("/user-custom-scenarios/<string:scenario_id>", methods=["DELETE"])
@jwt_required()
def delete_custom_scenario(scenario_id):
    username = get_jwt_identity()
    try:
        oid = ObjectId(scenario_id)
    except Exception:
        abort(400, description="Invalid scenario_id")
    result = CustomScenario.collection().delete_one({"_id": oid, "username": username})
    if result.deleted_count == 0:
        abort(404, description="Custom scenario not found or access denied.")
    return jsonify({"message": "Custom scenario deleted"}), 200