import json
import google.generativeai as genai
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiQuestionGenerator:
    def __init__(self):
        # Hardcoded API key (TODO: Move to config file)
        self.api_key = "AIzaSyDuB_NYDn-UdjDDEx6YVHGmXQBojt_uO4E"
        self.model_name = "gemini-2.5-flash"
        
        # Configure Gemini AI
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)
    
    def generate_questions(self, scenario_name: str, scenario_notes: str, duration: int, language: str = "English") -> List[Dict[str, Any]]:
        """
        Generate scenario-based questions using Gemini AI.
        
        Args:
            scenario_name (str): Name of the scenario
            scenario_notes (str): Detailed notes about the scenario
            duration (int): Total duration in minutes
            language (str): Language for questions (default: English)
        
        Returns:
            List[Dict[str, Any]]: List of questions with text and expected duration
        """
        try:
            prompt = self._create_prompt(scenario_name, scenario_notes, duration, language)
            
            logger.info(f"Generating questions for scenario: {scenario_name}")
            response = self.model.generate_content(prompt)
            
            questions = self._parse_response(response.text)
            logger.info(f"Generated {len(questions)} questions")
            
            return questions
            
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            return self._get_fallback_questions(duration)
    
    def _create_prompt(self, scenario_name: str, scenario_notes: str, duration: int, language: str) -> str:
        """Create a detailed prompt for Gemini AI."""
        prompt = f"""
            You are an expert conversation facilitator creating questions for a speaking practice scenario.

            SCENARIO DETAILS:
            - Name: {scenario_name}
            - Notes: {scenario_notes}
            - Total Duration: {duration} minutes
            - Language: {language}

            REQUIREMENTS:
            1. Generate questions that are relevant to the scenario context
            2. Questions should encourage natural conversation and speaking practice
            3. Allocate durations so the total adds up to approximately {duration} minutes
            4. Include a mix of question types: open-ended, specific, and follow-up questions
            5. Consider difficulty progression from easier to more complex questions

            RESPONSE FORMAT:
            Return your response as a valid JSON array with this exact structure:
            [
                {{
                    "question_text": "Your question here",
                    "expected_duration": 3
                }},
                {{
                    "question_text": "Another question here", 
                    "expected_duration": 2
                }}
            ]

            GUIDELINES:
            - Expected duration should be in minutes (integers)
            - Questions should be in {language}
            - Aim for 4-8 questions depending on the total duration
            - Each question should take 2-5 minutes to answer thoroughly
            - Make questions engaging and scenario-specific

            Generate the questions now:
            """
        return prompt
    
    def _parse_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse the Gemini AI response into structured questions."""
        try:
            # Clean the response text
            cleaned_text = response_text.strip()
            
            # Try to extract JSON from the response
            if "```json" in cleaned_text:
                # Extract JSON from code block
                start = cleaned_text.find("```json") + 7
                end = cleaned_text.find("```", start)
                json_text = cleaned_text[start:end].strip()
            elif cleaned_text.startswith('['):
                # Response is already JSON
                json_text = cleaned_text
            else:
                # Try to find JSON array in the text
                start = cleaned_text.find('[')
                end = cleaned_text.rfind(']') + 1
                if start != -1 and end > start:
                    json_text = cleaned_text[start:end]
                else:
                    raise ValueError("No valid JSON found in response")
            
            # Parse JSON
            questions = json.loads(json_text)
            
            # Validate structure
            validated_questions = []
            for question in questions:
                if isinstance(question, dict) and "question_text" in question and "expected_duration" in question:
                    validated_questions.append({
                        "question_text": str(question["question_text"]),
                        "expected_duration": int(question["expected_duration"])
                    })
            
            return validated_questions
            
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f"Error parsing response: {str(e)}")
            logger.error(f"Response text: {response_text}")
            return []
    
    def _get_fallback_questions(self, duration: int) -> List[Dict[str, Any]]:
        """Provide fallback questions if AI generation fails."""
        questions_per_duration = max(1, duration // 3)  # Roughly 3 minutes per question
        
        fallback_questions = [
            "Can you introduce yourself and tell us about your background?",
            "What are your main interests or hobbies?",
            "Describe a typical day in your life.",
            "What are your goals for the near future?",
            "Tell us about a challenge you've recently overcome.",
            "What do you enjoy most about learning new languages?",
            "Describe your ideal weekend.",
            "What advice would you give to someone in a similar situation?"
        ]
        
        # Select appropriate number of questions
        selected_questions = fallback_questions[:min(questions_per_duration, len(fallback_questions))]
        duration_per_question = duration // len(selected_questions)
        
        return [
            {
                "question_text": question,
                "expected_duration": duration_per_question
            }
            for question in selected_questions
        ]
    
    def validate_questions(self, questions: List[Dict[str, Any]], target_duration: int) -> bool:
        """Validate that questions meet duration requirements."""
        if not questions:
            return False
        
        total_duration = sum(q.get("expected_duration", 0) for q in questions)
        duration_variance = abs(total_duration - target_duration) / target_duration
        
        # Allow 20% variance in total duration
        return duration_variance <= 0.2


# Example usage and testing
if __name__ == "__main__":
    # Initialize the generator
    generator = GeminiQuestionGenerator()
    
    # Example scenario
    scenario_name = "Job Interview Practice"
    scenario_notes = "Practice for a software developer position. Focus on technical skills, problem-solving, and communication."
    duration = 15
    language = "English"
    
    # Generate questions
    questions = generator.generate_questions(
        scenario_name=scenario_name,
        scenario_notes=scenario_notes,
        duration=duration,
        language=language
    )
    
    # Display results
    print(f"\nGenerated Questions for '{scenario_name}':")
    print(f"Target Duration: {duration} minutes")
    print("-" * 50)
    
    total_duration = 0
    for i, question in enumerate(questions, 1):
        print(f"{i}. {question['question_text']}")
        print(f"   Expected Duration: {question['expected_duration']} minutes")
        print()
        total_duration += question['expected_duration']
    
    print(f"Total Duration: {total_duration} minutes")
    print(f"Validation: {'PASS' if generator.validate_questions(questions, duration) else 'FAIL'}")