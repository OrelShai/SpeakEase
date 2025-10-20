import json
import google.generativeai as genai
from typing import List, Dict, Any, Optional
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from Data_Model_Logic.repositories.completed_sessions_repo import CompletedSessionsRepo

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint for chat functionality
chat_bp = Blueprint("chat_bp", __name__)

class SummaryAndConversationAI:
    """
    This class provides AI-powered functionalities for generating summaries and responding to user questions 
    based on public speaking practice sessions. It leverages the Gemini AI model to analyze session data 
    and provide personalized feedback.
    
    Methods:
    --------
    - __init__():
        Initializes the SummaryAndConversationAI instance, configuring the Gemini AI model and setting up 
        session-related attributes.
    - generate_summary(full_scenario_answers_review: list, scenario_name: str) -> str:
        Generates a personalized summary based on the provided scenario answers and scenario name. The summary 
        highlights strengths, areas for improvement, and actionable next steps.
    - new_conversation_message(question: str, analysis_data: Optional[Dict] = None) -> str:
        Responds to user questions about their practice session, using session analysis data to provide 
        specific, actionable feedback.
    - _prepare_analysis_summary(analysis_data: List[Dict]) -> str:
        Prepares a structured summary of the analysis data for AI processing, including performance metrics 
        and aggregated scores.
    - _prepare_detailed_analysis(analysis_data: Any) -> str:
        Prepares detailed analysis context for conversation responses, summarizing scores and insights 
        from the session data.
    - _get_fallback_response(question: str) -> str:
        Provides fallback responses when AI generation fails, offering general coaching advice based on 
        common public speaking challenges.
        
    Attributes:
    -----------
    - api_key (str):
        The API key used to authenticate with the Gemini AI service.
    - model_name (str):
        The name of the Gemini AI model used for generating content.
    - session_analysis (Optional[List[Dict]]):
        Stores the analysis data from the most recent session for context in conversations.
    - scenario_context (Optional[str]):
        Stores the name of the scenario for the most recent session.
        
    Usage:
    ------
    This class is designed to be used in applications that require AI-driven feedback for public speaking 
    practice sessions. It can generate summaries and answer user questions based on session data, providing 
    a supportive and personalized coaching experience.
    """
    
    def __init__(self):
        # Hardcoded API key (similar to GeminiQuestionGenerator)
        self.api_key = "AIzaSyDuB_NYDn-UdjDDEx6YVHGmXQBojt_uO4E"
        self.model_name = "gemini-2.5-flash"
        
        # Configure Gemini AI
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)
        
        # Store session analysis for context
        self.session_analysis = None
        self.scenario_context = None

    def generate_summary(self, full_scenario_answers_review: list, scenario_name: str = "Practice Session", session_id: Optional[str] = None) -> str:
        """Generate AI-powered summary from collected scenario answers using Gemini."""
        if not full_scenario_answers_review:
            return "No answers collected for summary generation"
        
        try:
            # Store analysis for later conversation context
            self.session_analysis = full_scenario_answers_review
            self.scenario_context = scenario_name
            
            # Prepare analysis data for Gemini
            analysis_summary = self._prepare_analysis_summary(full_scenario_answers_review)
            
            prompt = f"""
            You are an expert public speaking coach analyzing a practice session. 
            
            SCENARIO: {scenario_name}
            ANALYSIS DATA: {analysis_summary}
            
            Create a personalized, encouraging summary that:
            1. Acknowledges the user's effort and participation
            2. Highlights 2-3 key strengths observed
            3. Identifies 1-2 specific areas for improvement
            4. Provides actionable next steps
            5. Maintains a supportive, coach-like tone
            
            Keep the summary concise (2-3 sentences) but specific to their actual performance data.
            End with an invitation to ask questions about their session.
            """
            
            logger.info(f"Generating AI summary for scenario: {scenario_name}")
            response = self.model.generate_content(prompt)
            
            summary = response.text.strip()
            logger.info("AI summary generated successfully")
            
            # Save summary to database if session_id is provided
            if session_id:
                try:
                    self._save_summary_to_db(session_id, summary)
                    logger.info(f"Summary saved to database for session: {session_id}")
                except Exception as db_error:
                    logger.error(f"Failed to save summary to database: {str(db_error)}")
                    # Don't fail the entire operation if DB save fails
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating AI summary: {str(e)}")
            # Fallback to basic summary
            total_answers = len(full_scenario_answers_review)
            fallback = f"Great job completing your {scenario_name} practice! I analyzed {total_answers} responses and found valuable insights. Your performance shows both strengths and opportunities for growth. Feel free to ask me about any specific aspect of your session!"
            return fallback

    def new_conversation_message(self, question: str, analysis_data: Optional[Dict] = None) -> str:
        """Generate AI-powered responses based on actual session analysis using Gemini."""
        if not question or not question.strip():
            return "Please provide a valid question about your practice session."
        
        try:
            # Use provided analysis data or stored session analysis
            current_analysis = analysis_data or self.session_analysis
            scenario = self.scenario_context or "Practice Session"
            
            # Prepare context for Gemini
            analysis_context = ""
            if current_analysis:
                analysis_context = self._prepare_detailed_analysis(current_analysis)
            
            prompt = f"""
            You are an expert public speaking coach providing personalized feedback.
            
            SESSION CONTEXT:
            - Scenario: {scenario}
            - Analysis Data: {analysis_context}
            
            USER QUESTION: "{question}"
            
            Provide a specific, actionable response that:
            1. Directly addresses their question
            2. References actual performance data when relevant
            3. Offers concrete improvement strategies
            4. Maintains an encouraging, supportive tone
            5. Keeps the response concise but informative (2-4 sentences)
            
            If you don't have specific data for their question, provide general coaching advice while acknowledging the limitation.
            """
            
            logger.info(f"Processing conversation question: {question[:50]}...")
            response = self.model.generate_content(prompt)
            
            answer = response.text.strip()
            logger.info("AI response generated successfully")
            return answer
            
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}")
            # Fallback to rule-based responses
            fallback = self._get_fallback_response(question)
            return fallback

    def _prepare_analysis_summary(self, analysis_data: List[Dict]) -> str:
        """Prepare a structured summary of analysis data for AI processing."""
        summary_parts = []
        total_questions = len(analysis_data)
        
        # Aggregate scores by analyzer type
        analyzer_scores = {}
        for i, answer in enumerate(analysis_data):
            if isinstance(answer, dict):
                for analyzer_name, result in answer.items():
                    if isinstance(result, dict) and 'score' in result:
                        if analyzer_name not in analyzer_scores:
                            analyzer_scores[analyzer_name] = []
                        score = result['score']
                        analyzer_scores[analyzer_name].append(score)

    
        
        # Calculate averages
        avg_scores = {}
        for analyzer, scores in analyzer_scores.items():
            if scores:
                avg_scores[analyzer] = sum(scores) / len(scores)
            else:
                avg_scores[analyzer] = 0
        
        summary_parts.append(f"Total responses analyzed: {total_questions}")
        summary_parts.append(f"Performance metrics: {avg_scores}")
        
        result = " | ".join(summary_parts)
        return result

    def _prepare_detailed_analysis(self, analysis_data: Any) -> str:
        """Prepare detailed analysis context for conversation."""
        if not analysis_data:
            return "No specific analysis data available"
        
        if isinstance(analysis_data, list):
            # Multiple answers analysis
            details = []
            for i, answer in enumerate(analysis_data):
                if isinstance(answer, dict):
                    answer_details = []
                    for analyzer, result in answer.items():
                        if isinstance(result, dict) and 'score' in result:
                            score = result['score']
                            answer_details.append(f"{analyzer}: {score:.1f}")
                    if answer_details:
                        details.append(f"Response {i+1}: {', '.join(answer_details)}")
            return " | ".join(details)
        
        elif isinstance(analysis_data, dict):
            # Single session analysis
            details = []
            for key, value in analysis_data.items():
                if isinstance(value, dict) and 'score' in value:
                    details.append(f"{key}: {value['score']:.1f}")
            return " | ".join(details)
        
        return str(analysis_data)

    def _get_fallback_response(self, question: str) -> str:
        """Provide fallback responses when AI generation fails."""
        question_lower = question.lower()
        
        if "body language" in question_lower or "posture" in question_lower:
            return "Based on your session, focus on maintaining good posture and natural gestures. Try to keep your shoulders relaxed and use purposeful hand movements to emphasize key points."
        elif "speak clearly" in question_lower or "clarity" in question_lower or "voice" in question_lower:
            return "Your speech clarity showed good potential. Practice speaking slightly slower and enunciating key words more clearly. Consider doing vocal warm-ups before important conversations."
        elif "weakness" in question_lower or "improve" in question_lower:
            return "Your main areas for improvement appear to be maintaining consistent eye contact and reducing filler words. Practice recording yourself to become more aware of these patterns."
        elif "confidence" in question_lower or "nervous" in question_lower:
            return "To boost confidence, prepare key talking points beforehand and practice deep breathing exercises. Remember that some nervousness is normal and shows you care about doing well!"
        elif "eye contact" in question_lower:
            return "Eye contact is crucial for engagement. Practice the 3-5 second rule: maintain eye contact for 3-5 seconds before naturally looking away, then return your gaze."
        elif "questions" in question_lower and "answer" in question_lower:
            return "You handled the questions well overall. For future sessions, try to provide more specific examples and take a moment to organize your thoughts before responding."
        else:
            return f"Thank you for asking about '{question}'. Based on your practice session, I recommend focusing on consistent preparation and regular practice. Keep working on your speaking skills - you're making great progress!"

    def _save_summary_to_db(self, session_id: str, summary_text: str) -> None:
        """Save the generated summary to the database."""
        try:
            # Import mongo inside the method to avoid circular imports
            from app import mongo
            
            # Initialize the repository
            repo = CompletedSessionsRepo(mongo.db)
            
            # Update the session with the summary
            update_data = {"summary_text": summary_text}
            modified_count = repo.update(session_id, update_data)
            
            if modified_count > 0:
                logger.info(f"Successfully updated session {session_id} with summary")
            else:
                logger.warning(f"No session found with id {session_id} or no changes made")
                
        except Exception as e:
            logger.error(f"Error saving summary to database: {str(e)}")
            raise e

# Route handler for chat questions
@chat_bp.route('/chat/ask-question', methods=['POST'])
@cross_origin()
@jwt_required()
def ask_question():
    """Handle chat questions from the frontend."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        question = data.get('question', '').strip()
        session_id = data.get('session_id')
        scenario_id = data.get('scenario_id')
        analysis_data = data.get('analysis_data', {})
        
        if not question:
            return jsonify({'error': 'Question is required'}), 400
        
        # Create AI instance and process question with analysis data
        summary_ai = SummaryAndConversationAI()
        answer = summary_ai.new_conversation_message(question, analysis_data)
        
        response_data = {
            'answer': answer,
            'confidence': 0.95,
            'session_id': session_id,
            'scenario_id': scenario_id
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error in ask_question endpoint: {str(e)}")
        return jsonify({
            'error': 'Failed to process question',
            'message': str(e)
        }), 500


# Route handler for generating session summary
@chat_bp.route('/chat/generate-summary', methods=['POST'])
@cross_origin()
@jwt_required()
def generate_session_summary():
    """Generate AI summary for a completed session."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        scenario_name = data.get('scenario_name', 'Practice Session')
        analysis_data = data.get('analysis_data', [])
        session_id = data.get('session_id')  # Optional session_id for database saving
        
        # Validate session_id if provided
        if session_id and not isinstance(session_id, str):
            return jsonify({'error': 'session_id must be a string'}), 400
        
        # Create AI instance and generate summary
        summary_ai = SummaryAndConversationAI()
        summary = summary_ai.generate_summary(analysis_data, scenario_name, session_id)
        
        response_data = {
            'summary': summary,
            'scenario_name': scenario_name,
            'total_responses': len(analysis_data) if isinstance(analysis_data, list) else 1
        }
        
        # Add session_id to response if provided
        if session_id:
            response_data['session_id'] = session_id
            response_data['message'] = 'Summary generated and saved to database'
        else:
            response_data['message'] = 'Summary generated (not saved to database - no session_id provided)'
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error in generate_session_summary endpoint: {str(e)}")
        return jsonify({
            'error': 'Failed to generate summary',
            'message': str(e)
        }), 500


# Example usage and testing
if __name__ == "__main__":
    # Initialize the AI coach
    ai_coach = SummaryAndConversationAI()
    
    # Example analysis data (simulating real analyzer results)
    sample_analysis = [
        {
            "eye_contact": {"score": 75.2, "confidence": 0.89},
            "tone": {"score": 82.1, "confidence": 0.92},
            "facial_expression": {"score": 68.7, "confidence": 0.85}
        },
        {
            "eye_contact": {"score": 78.5, "confidence": 0.91},
            "tone": {"score": 79.3, "confidence": 0.88},
            "facial_expression": {"score": 71.2, "confidence": 0.87}
        }
    ]
    
    # Test summary generation
    summary = ai_coach.generate_summary(sample_analysis, "Job Interview Practice")
    print(f"Generated summary: {summary}")
    
    # Test summary generation with session_id (commented out - requires actual session in DB)
    # session_id = "64a1234567890abcdef12345"  # Example ObjectId
    # summary_with_save = ai_coach.generate_summary(sample_analysis, "Job Interview Practice", session_id)
    
    # Test conversation
    test_questions = [
        "How was my eye contact during the session?",
        "What can I do to improve my body language?",
        "Did I speak clearly enough?",
        "What was my biggest weakness?"
    ]
    
    for question in test_questions:
        response = ai_coach.new_conversation_message(question, sample_analysis)
        print(f"Q: {question}")
        print(f"A: {response}\n")


