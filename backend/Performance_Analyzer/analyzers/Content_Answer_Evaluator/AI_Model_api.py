import google.generativeai as genai
import json
from typing import Dict, Any

class AnswerEvaluator:
    def __init__(self, api_key: str):
        """Initialize the Gemini API client with provided API key"""
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
    
    def evaluate_answer(self, question: str, answer: str) -> Dict[str, Any]: 
        """
        Evaluate an answer based on a question using Gemini API
        
        Args:
            question (str): The original question
            answer (str): The answer to evaluate
            
        Returns:
            Dict containing good_points, bad_points, and score
        """
        try:
            prompt = f"""
            You are a supportive interview coach helping someone practice their communication skills.
            
            Use a generous, encouraging grading scale:
            - 80-100: Any reasonable attempt that addresses the question with clear communication
            - 60-79: Partial attempts or brief but relevant answers that show understanding
            - 40-59: Minimal effort but shows some understanding and communication attempt
            - 20-39: Off-topic but demonstrates basic communication skills
            - 0-19: Only for completely incoherent or inappropriate responses
            
            Question: {question}
            Answer: {answer}
            
            Remember: This is practice, so be encouraging while providing constructive feedback.
            
            Analyze the answer and provide:
            1. "good_points": A list of what was good about the answer (specific strengths)
            2. "bad_points": A list of what could be improved (frame constructively)  
            3. "score": A numerical score from 0-100 based on the generous scale above
            
            Response format:
            {{
                "good_points": ["point 1", "point 2", ...],
                "bad_points": ["point 1", "point 2", ...],
                "score": 85
            }}
            """
            
            # Generate content with standard configuration
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    top_p=0.8,
                    top_k=40,
                    max_output_tokens=1024,
                )
            )
            
            if not response or not hasattr(response, 'text'):
                return self._fallback_response("No response from API")
            
            response_text = response.text.strip()
            if not response_text:
                return self._fallback_response("Empty response text")
            
            # Extract JSON from markdown code blocks if present
            cleaned_text = self._extract_json_from_markdown(response_text)
            
            # Parse and validate the JSON
            try:
                result = json.loads(cleaned_text)
                return self._validate_response(result)
            except json.JSONDecodeError as e:
                return self._fallback_response(f"JSON parsing error: {str(e)}")
            
        except Exception as e:
            return self._fallback_response(f"API error: {str(e)}")
    
    def _extract_json_from_markdown(self, text: str) -> str:
        """Extract JSON content from markdown code blocks"""
        # Remove markdown code block markers
        if text.startswith('```json'):
            text = text[7:]
        elif text.startswith('```'):
            text = text[3:]
        
        if text.endswith('```'):
            text = text[:-3]
        
        # Find JSON object boundaries
        text = text.strip()
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            return text[start_idx:end_idx+1]
        
        return text
    
    def _validate_response(self, result: Dict) -> Dict[str, Any]:
        """Validate and normalize the AI response"""
        if not isinstance(result, dict):
            raise ValueError(f"Expected dict, got {type(result)}")
        
        if "score" not in result:
            raise ValueError("Missing 'score' field in response")
        
        # Normalize score to 0-100 range
        try:
            score = float(result["score"])
            score = max(0, min(100, score))
        except (ValueError, TypeError):
            raise ValueError(f"Invalid score value: {result['score']}")
        
        # Ensure good_points and bad_points are lists
        good_points = result.get("good_points", [])
        bad_points = result.get("bad_points", [])
        
        if not isinstance(good_points, list):
            good_points = []
        if not isinstance(bad_points, list):
            bad_points = []
        
        return {
            "score": score,
            "good_points": good_points,
            "bad_points": bad_points
        }
    
    def _fallback_response(self, error_msg: str) -> Dict[str, Any]:
        """Provide fallback response when API fails"""
        return {
            "good_points": ["Unable to analyze - API error occurred"],
            "bad_points": [f"Error: {error_msg}"],
            "score": 60
        }

