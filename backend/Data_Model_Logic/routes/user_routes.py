from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import ValidationError

from ..services.users_service import UsersService
from ..models.user_models import UserCreate, UserLogin, UserUpdate

user_routes = Blueprint("user_routes", __name__)

def get_users_service():
    """Get users service instance - SpeakEase cross-module import pattern"""
    from app import mongo
    return UsersService(mongo.db)

@user_routes.route('/users/register', methods=['POST'])
def register():
    """Register new user endpoint"""
    try:
        user_data = UserCreate(**request.json)
        service = get_users_service()
        result = service.register_user(user_data)
        return jsonify(result), 201
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500

@user_routes.route('/users/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        login_data = UserLogin(**request.json)
        service = get_users_service()
        result = service.authenticate_user(login_data)
        return jsonify(result), 200
    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500

@user_routes.route('/users/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user details - SpeakEase PyMongo pattern"""
    try:
        current_username = get_jwt_identity()
        service = get_users_service()
        user_data = service.get_user_by_username(current_username)
        
        if not user_data:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "username": user_data["username"],
            "email": user_data["email"]
        }), 200
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500

@user_routes.route('/users/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    """Update current user's profile - SpeakEase REST pattern"""
    try:
        current_username = get_jwt_identity()
        
        # SpeakEase error handling: Safe JSON parsing
        request_data = request.get_json()
        if not request_data:
            return jsonify({"error": "Request body is required"}), 400
        
        # Clean and validate data following SpeakEase patterns
        clean_data = {}
        for key in ['username', 'email', 'password']:
            if key in request_data:
                value = request_data[key]
                if isinstance(value, str) and value.strip():
                    clean_data[key] = value.strip()
        
        if not clean_data:
            return jsonify({"error": "No valid fields provided for update"}), 400
        
        # Validate with Pydantic models
        update_data = UserUpdate(**clean_data)
        
        # SpeakEase service layer delegation
        service = get_users_service()
        
        # Check user exists before update
        existing_user = service.get_user_by_username(current_username)
        if not existing_user:
            return jsonify({"error": "User not found"}), 404
        
        # Perform update
        result = service.update_user(current_username, current_username, update_data)
        
        return jsonify(result), 200

    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except ValueError as e:
        error_code = 409 if "already" in str(e).lower() else 400
        return jsonify({"error": str(e)}), error_code
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500

@user_routes.route('/users/<username>', methods=['DELETE'])
@jwt_required()
def delete_user(username):
    """Delete user endpoint - SpeakEase authorization pattern"""
    try:
        current_username = get_jwt_identity()
        
        if current_username != username:
            return jsonify({"error": "Unauthorized action"}), 403
        
        service = get_users_service()
        result = service.delete_user(username)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500