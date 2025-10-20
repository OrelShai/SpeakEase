import time
import json
import os
from typing import Optional, Dict, List

from Performance_Analyzer.utils import transcript_cache
from Performance_Analyzer.analyzers.base import BaseAnalyzer
from Performance_Analyzer.schemas import MetricResult

# Handle both relative and absolute imports for testing compatibility
try:
    from .AI_Model_api import AnswerEvaluator
except ImportError:
    # Fallback for when running tests directly
    from AI_Model_api import AnswerEvaluator


class ContentAnswerEvaluator(BaseAnalyzer):
    """
    Analyzer for evaluating the content quality of answers in videos.
    Uses Google Gemini AI to analyze transcribed speech and provide feedback.
    The analyzer gets the question from config and extracts the answer from video transcription.
    The analyzer returns a score (0-100) and detailed feedback on strengths and weaknesses.
    """
    
    metric = "content_answer_quality"
    model = "gemini-2.5-flash"
    version = "1.0.0"

    def __init__(self, config: Optional[Dict] = None):
        super().__init__(config)
        # HARD-CODED API KEY do not change it until deployment
        self.cfg = {
            "question": (self.config or {}).get("question", "Please provide a comprehensive answer to the given topic."),
            "api_key": "AIzaSyDuB_NYDn-UdjDDEx6YVHGmXQBojt_uO4E",
            "fallback_score": 0.0,
        }
        
        # Initialize AI evaluator if API key is available
        if self.cfg["api_key"]:
            try:
                self.evaluator = AnswerEvaluator(self.cfg["api_key"])
            except Exception as e:
                self.evaluator = None
        else:
            self.evaluator = None

    def analyze(self, video_path: str, question=None) -> MetricResult:
        # Direct assignment with config fallback
        question = question or self.cfg["question"]
        
        t0 = time.time()
        errors: List[str] = []
        details: Dict = {}
        score = self.cfg["fallback_score"]

        try:
            # Get transcript from cache (set by language_quality analyzer)
            transcript = transcript_cache.get(video_path)
            
            if not transcript or transcript.strip() == "":
                errors.append("No transcript available from cache")
                details = {
                    "transcript": "",
                    "question": question,
                    "evaluation": None,
                    "reason": "No transcript found"
                }
            else:
                # Evaluate answer using AI model
                if self.evaluator:
                    try:
                        evaluation_response = self.evaluator.evaluate_answer(
                            question=question,
                            answer=transcript.strip()
                        )
                        
                        # Parse the JSON response
                        if isinstance(evaluation_response, str):
                            evaluation = json.loads(evaluation_response)
                        else:
                            evaluation = evaluation_response
                        
                        # Validate required fields in response
                        if not isinstance(evaluation, dict) or "score" not in evaluation:
                            raise ValueError("Invalid evaluation response format")
                        
                        # Extract score and ensure it's within 0-100 range
                        score = float(evaluation.get("score", self.cfg["fallback_score"]))
                        score = max(0.0, min(100.0, score))
                        
                        details = {
                            "transcript": transcript,
                            "question": question,
                            "evaluation": {
                                "score": score,
                                "good_points": evaluation.get("good_points", []),
                                "bad_points": evaluation.get("bad_points", [])
                            },
                            "word_count": len(transcript.split()),
                            "config_used": {k: v for k, v in self.cfg.items() if k != "api_key"}
                        }
                        
                    except json.JSONDecodeError as e:
                        errors.append(f"Failed to parse AI response: {e}")
                        details = self._create_fallback_details(transcript, question, "Invalid AI response format")
                    except Exception as e:
                        errors.append(f"AI evaluation failed: {e}")
                        details = self._create_fallback_details(transcript, question, str(e))
                else:
                    errors.append("AI evaluator not available (missing API key)")
                    details = self._create_fallback_details(transcript, question, "AI evaluator not initialized")

        except Exception as e:
            errors.append(f"{type(e).__name__}: {e}")
            details = self._create_fallback_details("", question, str(e))

        duration_ms = int((time.time() - t0) * 1000)
        confidence = 0.9 if score > 0 and not errors else 0.0
        
        return MetricResult(
            metric=self.metric,
            score=score,
            confidence=confidence,
            model=self.model,
            version=self.version,
            duration_ms=duration_ms,
            details=details or None,
            errors=errors or None,
        )

    def _create_fallback_details(self, transcript: str, question: str, reason: str) -> Dict:
        """Create fallback details when evaluation fails"""
        return {
            "transcript": transcript,
            "question": question,
            "evaluation": {
                "score": self.cfg["fallback_score"],
                "good_points": [],
                "bad_points": [f"Evaluation failed: {reason}"]
            },
            "word_count": len(transcript.split()) if transcript else 0,
            "config_used": {k: v for k, v in self.cfg.items() if k != "api_key"}
        }
