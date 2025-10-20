import unittest
import sys
import os
import time
import json
from unittest.mock import patch, MagicMock

# Add the project root to sys.path for Performance_Analyzer imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
sys.path.insert(0, project_root)

# Mock google.generativeai before any imports that might use it
sys.modules['google.generativeai'] = MagicMock()

# Add the Content_Answer_Evaluator directory to sys.path
content_evaluator_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Content_Answer_Evaluator')
sys.path.append(content_evaluator_path)

# Now import the modules
from Content_Answer_Evaluator import ContentAnswerEvaluator
from Performance_Analyzer.schemas import MetricResult


class TestContentAnswerEvaluator(unittest.TestCase):
    """🧪 Test suite for ContentAnswerEvaluator with fun emojis and colorful output! 🎨"""
    
    def setUp(self):
        """🔧 Set up test fixtures"""
        print("\n" + "="*60)
        print("🚀 SPEAKEASE CONTENT EVALUATOR TEST SUITE 🚀")
        print("="*60)
        
        # Mock API key
        self.test_config = {
            "api_key": "test_api_key_123",
            "question": "Default test question",
            "fallback_score": 0.0
        }
    
    def print_test_header(self, test_name, emoji="🧪"):
        """Print a fun test header"""
        print(f"\n{emoji} {test_name} {emoji}")
        print("-" * 50)
    
    def print_result_summary(self, result, test_scenario):
        """Print colorful result summary with emojis"""
        print(f"\n📊 RESULTS FOR {test_scenario}")
        print("🎯 " + "="*40)
        
        # Score emoji based on performance
        score = result.score
        if score >= 90:
            score_emoji = "🏆"
            performance = "OUTSTANDING!"
        elif score >= 80:
            score_emoji = "🌟"
            performance = "EXCELLENT!"
        elif score >= 70:
            score_emoji = "👍"
            performance = "GOOD!"
        elif score >= 60:
            score_emoji = "👌"
            performance = "DECENT!"
        elif score >= 40:
            score_emoji = "⚠️"
            performance = "NEEDS WORK"
        else:
            score_emoji = "❌"
            performance = "POOR"
        
        print(f"{score_emoji} Score: {score:.1f}/100 - {performance}")
        print(f"🎯 Confidence: {result.confidence:.1f}")
        print(f"⏱️  Duration: {result.duration_ms}ms")
        print(f"🤖 Model: {result.model} v{result.version}")
        
        if result.errors:
            print(f"⚠️  Errors: {len(result.errors)}")
            for error in result.errors:
                print(f"   • {error}")
        else:
            print("✅ No errors!")
        
        print("🎯 " + "="*40)

    def create_mock_evaluator(self, config, transcript_text, ai_response):
        """Create a properly mocked ContentAnswerEvaluator"""
        
        # Create evaluator instance
        evaluator = ContentAnswerEvaluator(config)
        
        # Ensure the config is properly set
        evaluator.cfg = config
        
        # Create a mock AI evaluator that returns our desired response
        mock_ai_evaluator = MagicMock()
        mock_ai_evaluator.evaluate_answer.return_value = ai_response
        
        # Force the evaluator to use our mock
        evaluator.evaluator = mock_ai_evaluator
        
        return evaluator
    
    @patch('Content_Answer_Evaluator.transcript_cache')
    def test_excellent_technical_answer(self, mock_transcript_cache):
        """🏆 Test Case 1: Excellent technical answer about AI"""
        
        self.print_test_header("EXCELLENT TECHNICAL ANSWER TEST", "🏆")
        
        question = "What is artificial intelligence and how does it impact modern society?"
        excellent_answer = """
        Artificial intelligence is a field of computer science that focuses on creating systems
        capable of performing tasks that typically require human intelligence. This includes
        machine learning, natural language processing, computer vision, and reasoning.
        
        AI impacts modern society in numerous ways: it enhances healthcare through diagnostic
        tools, improves transportation with autonomous vehicles, revolutionizes finance through
        algorithmic trading, and transforms education with personalized learning platforms.
        
        However, AI also presents challenges including job displacement, privacy concerns,
        algorithmic bias, and the need for ethical frameworks to guide its development and deployment.
        """
        
        # Mock the transcript cache
        mock_transcript_cache.get.return_value = excellent_answer
        
        # Create evaluator config
        config = {
            "question": question, 
            "api_key": "test_key",
            "fallback_score": 0.0
        }
        
        # AI response for excellent answer
        ai_response = {
            "score": 92,
            "good_points": [
                "Comprehensive definition of AI",
                "Clear examples of real-world applications", 
                "Acknowledges both benefits and challenges",
                "Well-structured response"
            ],
            "bad_points": [
                "Could include more specific technical details"
            ]
        }
        
        evaluator = self.create_mock_evaluator(config, excellent_answer, ai_response)
        result = evaluator.analyze("test_video.mp4")
        
        # Assertions
        self.assertEqual(result.metric, "content_answer_quality")
        self.assertGreaterEqual(result.score, 90)
        self.assertLessEqual(result.score, 100)
        self.assertGreater(result.confidence, 0.8)
        self.assertEqual(result.model, "gemini-2.5-flash")
        self.assertIsNone(result.errors)
        
        # Check details
        self.assertIn("evaluation", result.details)
        self.assertIn("good_points", result.details["evaluation"])
        self.assertGreater(len(result.details["evaluation"]["good_points"]), 0)
        
        self.print_result_summary(result, "EXCELLENT TECHNICAL ANSWER")
        print("✅ Test passed! AI correctly identified high-quality technical answer")
    
    @patch('Content_Answer_Evaluator.transcript_cache')
    def test_average_personal_answer(self, mock_transcript_cache):
        """👌 Test Case 2: Average personal answer"""
        
        self.print_test_header("AVERAGE PERSONAL ANSWER TEST", "👌")
        
        question = "Tell me about yourself and your career goals."
        average_answer = """
        Well, I'm a person who likes technology and I want to work in tech.
        I studied computer science in college and I think I'm good at programming.
        My goal is to get a good job and maybe work at a big company someday.
        """
        
        mock_transcript_cache.get.return_value = average_answer
        
        config = {
            "question": question, 
            "api_key": "test_key",
            "fallback_score": 0.0
        }
        
        ai_response = {
            "score": 65,
            "good_points": [
                "Mentions relevant background in computer science",
                "Shows interest in technology field"
            ],
            "bad_points": [
                "Lacks specific examples and achievements",
                "Goals are too vague and generic", 
                "Could be more enthusiastic and detailed"
            ]
        }
        
        evaluator = self.create_mock_evaluator(config, average_answer, ai_response)
        result = evaluator.analyze("test_video.mp4")
        
        # Assertions for average performance
        self.assertEqual(result.metric, "content_answer_quality")
        self.assertGreaterEqual(result.score, 60)
        self.assertLessEqual(result.score, 75)
        self.assertGreater(result.confidence, 0.8)
        self.assertIsNone(result.errors)
        
        self.print_result_summary(result, "AVERAGE PERSONAL ANSWER")
        print("✅ Test passed! AI correctly identified average-quality answer")
    
    @patch('Content_Answer_Evaluator.transcript_cache')
    def test_no_transcript_fallback(self, mock_transcript_cache):
        """❌ Test Case 3: No transcript available (fallback behavior)"""
        
        self.print_test_header("NO TRANSCRIPT FALLBACK TEST", "❌")
        
        # Mock empty transcript
        mock_transcript_cache.get.return_value = ""
        
        config = {
            "question": "Any question", 
            "api_key": "test_key", 
            "fallback_score": 15.0
        }
        
        # For empty transcript, evaluator won't be called
        evaluator = self.create_mock_evaluator(config, "", {})
        result = evaluator.analyze("test_video.mp4")
        
        # Assertions for fallback behavior
        self.assertEqual(result.metric, "content_answer_quality")
        self.assertEqual(result.score, 15.0)  # Should use fallback score
        self.assertEqual(result.confidence, 0.0)  # Low confidence due to error
        self.assertIsNotNone(result.errors)
        self.assertIn("No transcript available from cache", result.errors)
        
        # Check fallback details
        self.assertIn("reason", result.details)
        self.assertEqual(result.details["reason"], "No transcript found")
        
        self.print_result_summary(result, "NO TRANSCRIPT FALLBACK")
        print("✅ Test passed! Properly handled missing transcript")
    
    @patch('Content_Answer_Evaluator.transcript_cache')
    def test_poor_answer_performance(self, mock_transcript_cache):
        """⚠️ Test Case 4: Poor answer performance"""
        
        self.print_test_header("POOR ANSWER PERFORMANCE TEST", "⚠️")
        
        question = "Explain quantum computing and its applications in cybersecurity."
        poor_answer = "Umm, quantum is like, really fast computers or something. I don't know much about it."
        
        mock_transcript_cache.get.return_value = poor_answer
        
        config = {
            "question": question, 
            "api_key": "test_key",
            "fallback_score": 0.0
        }
        
        ai_response = {
            "score": 25,
            "good_points": [
                "Attempted to answer the question"
            ],
            "bad_points": [
                "Extremely vague and uninformative",
                "No demonstration of knowledge about quantum computing",
                "No mention of cybersecurity applications", 
                "Lacks confidence and preparation",
                "Too brief and superficial"
            ]
        }
        
        evaluator = self.create_mock_evaluator(config, poor_answer, ai_response)
        result = evaluator.analyze("test_video.mp4")
        
        # Assertions for poor performance
        self.assertEqual(result.metric, "content_answer_quality")
        self.assertLessEqual(result.score, 30)
        self.assertGreaterEqual(result.score, 0)
        self.assertGreater(result.confidence, 0.8)  # Still confident in the low score
        self.assertIsNone(result.errors)
        
        # Check that bad_points outnumber good_points
        bad_points = result.details["evaluation"]["bad_points"]
        good_points = result.details["evaluation"]["good_points"]
        self.assertGreater(len(bad_points), len(good_points))
        
        self.print_result_summary(result, "POOR ANSWER PERFORMANCE")
        print("✅ Test passed! AI correctly identified poor-quality answer")


def run_tests_with_style():
    """🎭 Run all tests with beautiful formatting"""
    print("\n" + "🎊" * 20)
    print("🎯 SPEAKEASE CONTENT EVALUATOR UNITTEST SUITE 🎯")
    print("🎊" * 20)
    
    # Create test suite
    suite = unittest.TestSuite()
    
    # Add test methods
    suite.addTest(TestContentAnswerEvaluator('test_excellent_technical_answer'))
    suite.addTest(TestContentAnswerEvaluator('test_average_personal_answer'))
    suite.addTest(TestContentAnswerEvaluator('test_no_transcript_fallback'))
    suite.addTest(TestContentAnswerEvaluator('test_poor_answer_performance'))
    
    # Run tests with custom result formatting
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Final summary
    print("\n" + "🏁" * 20)
    print("🎉 TEST SUITE COMPLETE! 🎉")
    print("🏁" * 20)
    
    if result.wasSuccessful():
        print("✅ ALL TESTS PASSED! 🎊")
        print("🚀 ContentAnswerEvaluator is working perfectly!")
    else:
        print(f"❌ {len(result.failures)} FAILURES, {len(result.errors)} ERRORS")
        print("🔧 Check the logs above for details")
    
    print("\n📊 FINAL STATS:")
    print(f"   🧪 Tests Run: {result.testsRun}")
    print(f"   ✅ Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"   ❌ Failures: {len(result.failures)}")
    print(f"   🚨 Errors: {len(result.errors)}")
    
    return result.wasSuccessful()

if __name__ == "__main__":
    success = run_tests_with_style()
    sys.exit(0 if success else 1)

