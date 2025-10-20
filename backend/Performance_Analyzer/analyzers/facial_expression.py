# analyzers/facial_expression.py
# ----------------------------
# Purpose:
#   Analyze facial expressions in video using a CNN model.
#   Detects and classifies emotions: angry, disgust, fear, happy, sad, surprise, neutral
#
# Integration:
#   - Uses existing BaseAnalyzer interface
#   - Returns MetricResult for consistency with other analyzers
#   - Configurable through PerformanceAnalyzer.py
#   - Compatible with Python 3.10
# ----------------------------

import os
# Suppress TensorFlow warnings and info messages
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
import json
from pathlib import Path
import time

# Import TensorFlow/Keras with Python 3.10 compatibility
try:
    import tensorflow as tf
    # Additional TensorFlow logging suppression
    tf.get_logger().setLevel('ERROR')
    from tensorflow.keras.models import model_from_json
    from tensorflow.keras.preprocessing import image
    tf_available = True
except ImportError:
    print("⚠️ WARNING: TensorFlow not available. Facial expression analysis will be disabled.")
    tf_available = False

from Performance_Analyzer.analyzers.base import BaseAnalyzer
from Performance_Analyzer.schemas import MetricResult


def _make_json_serializable(obj: Any) -> Any:
    """
    Recursively convert numpy types and other non-serializable objects to Python native types for JSON serialization.
    Enhanced version to handle more data types.
    """
    if obj is None:
        return None
    elif isinstance(obj, (bool, str)):
        return obj
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, (int, float)):
        return obj
    elif isinstance(obj, dict):
        return {str(key): _make_json_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_make_json_serializable(item) for item in obj]
    elif isinstance(obj, set):
        return list(_make_json_serializable(item) for item in obj)
    # Add support for Decimal, datetime, and other common types
    elif hasattr(obj, 'isoformat'):  # datetime objects
        return obj.isoformat()
    elif hasattr(obj, '__float__'):  # Decimal, etc.
        return float(obj)
    elif hasattr(obj, '__dict__'):
        # Handle custom objects by converting to dict
        return _make_json_serializable(obj.__dict__)
    else:
        # Try to convert to string as last resort
        try:
            return str(obj)
        except Exception:
            return None


class FacialExpressionAnalyzer(BaseAnalyzer):
    """
    Facial Expression Analyzer using CNN for emotion detection.
    """
    
    metric = "facial_expression"
    model_name = "CNN_FER2013"
    version = "1.0.0"
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the Facial Expression Analyzer."""
        super().__init__(config)

        # Model path to the new location
        current_dir = Path(__file__).parent
        self.model_dir = current_dir / "Models" / "Facial_expression_CNN_model"

        # Get configuration parameters
        self.frame_stride = self.config.get("frame_stride")
        self.confidence_threshold = self.config.get("confidence_threshold")
        self.face_detection_scale = self.config.get("face_detection_scale")
        self.min_neighbors = self.config.get("min_neighbors")  
        
        # Set Emotion labels 
        self.emotions = ('angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral')
        
        # Defensive Programming Pattern: Setting these attributes to None initially serves as a defensive programming practice. 
        # It allows the class to handle cases where model loading fails gracefully - the code can check if these variables are None before attempting to use them for analysis.
        
        self.cnn_model = None
        self.face_cascade = None
        
        # Load the model and face detector
        self._load_model()
        
    def _load_model(self):
        """Load the trained CNN model and Haar cascade face detector."""
        if not tf_available:
            raise ImportError("TensorFlow not available. Please install: pip install tensorflow>=2.12,<2.21")
            
        try:
            # Use the model directory path defined in __init__
            model_dir = str(self.model_dir)
            
            # Custom model path from config or default
            if "model_path" in self.config:
                model_dir = self.config["model_path"]
            
            # Load model architecture
            json_path = os.path.join(model_dir, "Facial Expression Recognition.json")
            weights_path = os.path.join(model_dir, "fer.h5")
            cascade_path = os.path.join(model_dir, "haarcascade_frontalface_default.xml")         
            
            if not all(os.path.exists(p) for p in [json_path, weights_path, cascade_path]):
                # Show what files actually exist in the directory
                if os.path.exists(model_dir):
                    actual_files = os.listdir(model_dir)
                raise FileNotFoundError(f"Model files not found in {model_dir}")
            
            # Try modern loading method first
            try:
                # Modern approach: load the complete model
                model_path = os.path.join(model_dir, "complete_model.h5")
                if os.path.exists(model_path):
                    self.cnn_model = tf.keras.models.load_model(model_path)
                else:
                    raise FileNotFoundError("Complete model file not found, trying legacy method")
                    
            except Exception as e:
                print(f"Modern loading failed: {e}, trying legacy method...")
                
                # Legacy approach: load architecture + weights separately
                with open(json_path, 'r') as json_file:
                    model_json = json_file.read()
                
                # Add custom objects for compatibility
                custom_objects = {
                    'Sequential': tf.keras.Sequential,
                    'Conv2D': tf.keras.layers.Conv2D,
                    'BatchNormalization': tf.keras.layers.BatchNormalization,
                    'Activation': tf.keras.layers.Activation,
                    'Dropout': tf.keras.layers.Dropout,
                    'MaxPooling2D': tf.keras.layers.MaxPooling2D,
                    'Flatten': tf.keras.layers.Flatten,
                    'Dense': tf.keras.layers.Dense
                }
                
                self.cnn_model = model_from_json(model_json, custom_objects=custom_objects)
                self.cnn_model.load_weights(weights_path)
            
            # Load face detector
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            
        except Exception as e:
            print(f"❌ Failed to load facial expression model: {e}")
            # Don't raise exception, just disable the analyzer
            self.cnn_model = None
            self.face_cascade = None
            print("⚠️  Facial expression analysis will be disabled for this session")
    
    def _detect_faces(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detect faces in a video frame.
        
        Args:
            frame: Input video frame as numpy array
            
        Returns:
            List of face bounding boxes as (x, y, width, height) tuples
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=self.face_detection_scale,
            minNeighbors=self.min_neighbors
        )
        return faces
    
    def _predict_emotion(self, face_roi: np.ndarray) -> Tuple[str, float]:
        """Predict emotion for a detected face region."""
        # Resize face to model input size (48x48)
        face_resized = cv2.resize(face_roi, (48, 48))
        
        # Preprocess for model input
        img_pixels = image.img_to_array(face_resized)
        img_pixels = np.expand_dims(img_pixels, axis=0)
        img_pixels = img_pixels / 255.0  # Normalize to [0,1]
        
        # Make prediction
        predictions = self.cnn_model.predict(img_pixels, verbose=0)  
        
        # Get the emotion with highest confidence
        max_index = np.argmax(predictions[0])
        confidence = float(predictions[0][max_index])
        predicted_emotion = self.emotions[max_index]
        
        return predicted_emotion, confidence
    
    def _analyze_frame(self, frame: np.ndarray) -> List[Dict]:
        """
        Analyze a single frame for facial expressions.
        
        Args:
            frame: Input video frame
            
        Returns:
            List of detection results for each face found
        """
        results = []
        faces = self._detect_faces(frame)
        
        for (x, y, w, h) in faces:
            # Extract face region
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            face_roi = gray[y:y+h, x:x+w]
            
            # Predict emotion
            emotion, confidence = self._predict_emotion(face_roi)
            
            # Only include predictions above confidence threshold
            if confidence >= self.confidence_threshold:
                results.append({
                    "emotion": emotion,
                    "confidence": confidence,
                    "bbox": (x, y, w, h)
                })
        
        return results
    
    def _calculate_emotion_score(self, emotion_distribution: Dict[str, float]) -> float:
        """
        Calculate overall positivity score from emotion distribution.
        Updated to be less biased toward neutral.
        """
        # Define emotion weights (positive vs negative vs neutral)
        emotion_weights = {
            'happy': 2.3,      # Very positive
            'surprise': 1.0,   # Mildly positive
            'neutral': 0.1,    # Reduced weight for neutral
            'fear': -1.5,      # Mildly negative
            'sad': -0.9,       # Negative
            'angry': -2.4,     # Very negative
            'disgust': -2.7    # Very negative
        }
        
        # Calculate weighted score
        total_weight = 0
        weighted_sum = 0
        
        for emotion, percentage in emotion_distribution.items():
            if emotion in emotion_weights:
                weight = emotion_weights[emotion]
                weighted_sum += (percentage / 100.0) * weight
                total_weight += percentage / 100.0
        
        # Normalize to 0-100 scale
        if total_weight > 0:
            normalized_score = (weighted_sum / total_weight + 1) / 2
            return max(0.0, min(1.0, normalized_score)) * 100
        
        return 0  
    
    def analyze(self, video_path: str) -> MetricResult:
        """Analyze facial expressions in a video."""
        start_time = time.time()
        
        # Check if model is loaded
        if self.cnn_model is None or self.face_cascade is None:
            print("⚠️ WARNING: Facial expression model not loaded, returning default result")
            return MetricResult(
                metric=self.metric,
                model=self.model_name,
                version=self.version,
                score=50.0,  # Default neutral score (50 out of 100)
                confidence=0.0,
                duration_ms=0,
                details={"error": "Facial expression model not loaded properly"}
            )
        
        if not os.path.exists(video_path):
            return MetricResult(
                metric=self.metric,
                model=self.model_name,
                version=self.version,
                score=0.0,
                confidence=0.0,
                duration_ms=0,
                details={"error": f"Video file not found: {video_path}"}
            )
        
        try:
            # Open video file
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                return MetricResult(
                    metric=self.metric,
                    model=self.model_name,
                    version=self.version,
                    score=0.0,
                    confidence=0.0,
                    duration_ms=0,
                    details={"error": f"Could not open video file: {video_path}"}
                )
            
            # Video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps if fps > 0 else 0
            
            all_detections = []
            processed_frames = 0
            frame_number = 0
            
            # Process video frames
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process every nth frame based on frame_stride
                if frame_number % self.frame_stride == 0:
                    timestamp = frame_number / fps if fps > 0 else 0
                    frame_detections = self._analyze_frame(frame)
                    
                    # Add timestamp to detections
                    for detection in frame_detections:
                        detection["timestamp"] = timestamp
                        detection["frame"] = frame_number
                        # Only include detections above confidence threshold
                        if detection["confidence"] >= self.confidence_threshold:
                            all_detections.append(detection)
                    
                    processed_frames += 1
                
                frame_number += 1
            
            cap.release()
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            if not all_detections:
                return MetricResult(
                    metric=self.metric,
                    model=self.model_name,
                    version=self.version,
                    score=0.0,
                    confidence=0.0,
                    duration_ms=int(duration * 1000) if duration > 0 else 0,
                    details={
                        "message": "No confident faces detected in video",
                        "processed_frames": processed_frames,
                        "total_frames": total_frames,
                        "duration": duration,
                        "confidence_threshold": self.confidence_threshold
                    }
                )
            
            # Calculate emotion distribution
            emotion_counts = {}
            confidence_sum = {}
            confidence_count = {}
            
            for detection in all_detections:
                emotion = detection["emotion"]
                confidence = detection["confidence"]
                
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
                confidence_sum[emotion] = confidence_sum.get(emotion, 0) + confidence
                confidence_count[emotion] = confidence_count.get(emotion, 0) + 1
            
            total_detections = len(all_detections)
            
            # Calculate percentages and average confidence
            emotion_distribution = {}
            avg_confidence_by_emotion = {}
            
            for emotion in self.emotions:
                count = emotion_counts.get(emotion, 0)
                percentage = (count / total_detections) * 100 if total_detections > 0 else 0
                emotion_distribution[emotion] = round(percentage, 1)
                
                if emotion in confidence_sum and confidence_count[emotion] > 0:
                    avg_confidence_by_emotion[emotion] = confidence_sum[emotion] / confidence_count[emotion]
            
            # Find dominant emotion with reduced neutral weight
            weighted_emotion_distribution = emotion_distribution.copy()
            weighted_emotion_distribution['neutral'] = emotion_distribution['neutral'] / 3
            
            dominant_emotion = max(weighted_emotion_distribution.items(), key=lambda x: x[1])
            dominant_emotion_name = dominant_emotion[0]
            # Use original percentage for display, not the weighted one
            dominant_percentage = emotion_distribution[dominant_emotion_name]
            
            # Calculate overall score using improved method
            overall_score = self._calculate_emotion_score(emotion_distribution)
            
            # Calculate average confidence (weighted by emotion frequency)
            total_confidence_weight = 0
            weighted_confidence_sum = 0
            
            for emotion, percentage in emotion_distribution.items():
                if emotion in avg_confidence_by_emotion and percentage > 0:
                    weight = percentage / 100.0
                    confidence = avg_confidence_by_emotion[emotion]
                    weighted_confidence_sum += confidence * weight
                    total_confidence_weight += weight
            
            avg_confidence = weighted_confidence_sum / total_confidence_weight if total_confidence_weight > 0 else 0.0
            
            # Calculate positivity/negativity breakdown
            positive_emotions = ['happy', 'surprise']
            negative_emotions = ['angry', 'disgust', 'fear', 'sad']
            
            positivity_score = sum(emotion_distribution.get(e, 0) for e in positive_emotions)
            negativity_score = sum(emotion_distribution.get(e, 0) for e in negative_emotions)
            neutral_score = emotion_distribution.get('neutral', 0)
            
            # Before creating analysis_details, ensure all values are serializable
            emotion_distribution = {k: float(v) for k, v in emotion_distribution.items()}
            avg_confidence_by_emotion = {k: float(v) for k, v in avg_confidence_by_emotion.items()}
            
            # Create analysis details with explicit type conversion
            analysis_details = {
                "processed_frames": int(processed_frames),
                "total_detections": int(total_detections),
                "dominant_emotion": str(dominant_emotion_name),
                "dominant_percentage": float(dominant_percentage),
                "emotion_distribution": emotion_distribution
            }
            
            # Return MetricResult with properly typed values
            return MetricResult(
                metric=self.metric,
                model=self.model_name,
                version=self.version,
                score=float(overall_score),  
                confidence=float(avg_confidence),  
                duration_ms=int(duration * 1000) if duration > 0 else 0,
                details=analysis_details
            )
            
        except Exception as e:
            return MetricResult(
                metric=self.metric,
                model=self.model_name,
                version=self.version,
                score=0.0,
                confidence=0.0,
                duration_ms=0,
                details={"error": f"Analysis failed: {str(e)}"}
            )
        except Exception as e:
            return MetricResult(
                metric=self.metric,
                model=self.model_name,
                version=self.version,
                score=0.0,
                confidence=0.0,
                duration_ms=0,
                details={"error": f"Analysis failed: {str(e)}"}
            )
            
