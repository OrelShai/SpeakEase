from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_pymongo import PyMongo
from flask_cors import CORS
from datetime import timedelta
from Data_Model_Logic.routes.user_routes import user_routes
from Data_Model_Logic.routes.user_custom_scenarios_routes import user_custom_scenarios_bp
from Data_Model_Logic.routes.completed_sessions_routes import completed_sessions_bp
from Video_Meeting_Controller.Uploads import uploads_bp
from Performance_Analyzer.analyzer_routes import performance_analyzer_bp
from Video_Meeting_Controller.summary_and_convesation_AI import chat_bp

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Enable CORS for all routes

# Configure MongoDB
app.config["MONGO_URI"] = \
    "mongodb+srv://SpeakEase:2025@cluster0.g1lgp.mongodb.net/SpeakEaseDB?retryWrites=true&w=majority&appName=Cluster0"
mongo = PyMongo(app)  # initialize MongoDB
db = mongo.db
app.config["MONGO_DB"] = db

# JWT Configuration
app.config["JWT_SECRET_KEY"] = "supersecretkey"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=2)
jwt = JWTManager(app)

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # app.py folder
UPLOADS_DIR = os.path.join(BASE_DIR, "Video_Meeting_Controller", "uploaded_videos")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.config["UPLOADS_DIR"] = UPLOADS_DIR
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024


# Register API Routes
app.register_blueprint(user_routes, url_prefix="/api")
app.register_blueprint(user_custom_scenarios_bp, url_prefix="/api")
app.register_blueprint(completed_sessions_bp, url_prefix="/api")
app.register_blueprint(performance_analyzer_bp, url_prefix="/api")
app.register_blueprint(uploads_bp, url_prefix="/api")
app.register_blueprint(chat_bp, url_prefix="/api")


# GLOBAL ERROR HANDLER - Always return JSON instead of HTML
from werkzeug.exceptions import HTTPException

@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return jsonify({"error": e.description}), e.code
    return jsonify({"error": "Internal Server Error", "details": str(e)}), 500


@app.route('/')
def home():
    return jsonify({"message": "Welcome to the Improve Performance API"}), 200


if __name__ == '__main__':
    app.run(debug=True)
