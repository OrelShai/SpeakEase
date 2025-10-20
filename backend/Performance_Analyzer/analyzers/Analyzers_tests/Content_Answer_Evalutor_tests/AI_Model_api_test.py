import sys
import os
import json
import inspect

# Add the correct path to sys.path to import the AnswerEvaluator
current_dir = os.path.dirname(os.path.abspath(__file__))
content_evaluator_path = os.path.join(current_dir, '..', '..', 'Content_Answer_Evaluator')
content_evaluator_path = os.path.abspath(content_evaluator_path)

# Add to sys.path if not already there
if content_evaluator_path not in sys.path:
    sys.path.insert(0, content_evaluator_path)

print(f"🔍 Looking for AI_Model_api.py in: {content_evaluator_path}")
print(f"📁 File exists: {os.path.exists(os.path.join(content_evaluator_path, 'AI_Model_api.py'))}")

try:
    from AI_Model_api import AnswerEvaluator
    print("✅ Successfully imported AnswerEvaluator")
    
    # Debug: Print the class and its __init__ signature
    print(f"🔍 AnswerEvaluator class: {AnswerEvaluator}")
    print(f"🔍 AnswerEvaluator __init__ signature: {inspect.signature(AnswerEvaluator.__init__)}")
    print(f"🔍 AnswerEvaluator module: {AnswerEvaluator.__module__}")
    print(f"🔍 AnswerEvaluator file: {inspect.getfile(AnswerEvaluator)}")
    
except ImportError as e:
    print(f"❌ Import Error: {e}")
    sys.exit(1)

def test_answer_evaluator():
    """Test the AnswerEvaluator with a sample question and answer"""
    
    print("🚀 Starting Answer Evaluator Test")
    print("=" * 50)
    
    try:
        # Initialize the evaluator
        print("📝 Initializing AnswerEvaluator...")
        
        # Use the real API key
        api_key = "AIzaSyDuB_NYDn-UdjDDEx6YVHGmXQBojt_uO4E"
        evaluator = AnswerEvaluator(api_key=api_key)
            
        print("✅ AnswerEvaluator initialized successfully")
        
        # Test question and answer
        question = "What is artificial intelligence and how does it work?"
        answer = """Artificial intelligence (AI) is a branch of computer science that aims to create machines 
        that can perform tasks that typically require human intelligence. AI works by using algorithms and 
        mathematical models to process data, learn patterns, and make decisions. Common techniques include 
        machine learning, where systems improve through experience, and neural networks that mimic how 
        the human brain processes information."""
        
        print("📝 Test Question:")
        print(f"   {question}")
        print()
        
        print("💬 Test Answer:")
        print(f"   {answer}")
        print()
        
        print("🔍 Evaluating answer...")
        print("-" * 30)
        
        # Get evaluation result
        result = evaluator.evaluate_answer(question, answer)
        print(f"🔄 Raw result type: {type(result)}")
        
        # Try to parse JSON if it's a string
        if isinstance(result, str):
            try:
                # Clean up the response text
                response_text = result.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:-3].strip()
                elif response_text.startswith("```"):
                    response_text = response_text[3:-3].strip()
                
                result = json.loads(response_text)
            except json.JSONDecodeError:
                print("❌ Failed to parse JSON response")
                print(f"Raw response: {result}")
                return
        
        # Display results with emojis
        print("📊 EVALUATION RESULTS")
        print("=" * 50)
        
        # Display score with emoji based on performance
        score = result.get('score', 0)
        if score >= 80:
            score_emoji = "🏆"
        elif score >= 60:
            score_emoji = "👍"
        elif score >= 40:
            score_emoji = "👌"
        else:
            score_emoji = "❌"
        
        print(f"{score_emoji} Overall Score: {score}/100")
        print()
        
        # Display good points
        good_points = result.get('good_points', [])
        if good_points:
            print("✅ What was GOOD about the answer:")
            for i, point in enumerate(good_points, 1):
                print(f"   {i}. {point}")
            print()
        
        # Display bad points
        bad_points = result.get('bad_points', [])
        if bad_points:
            print("❌ What could be IMPROVED:")
            for i, point in enumerate(bad_points, 1):
                print(f"   {i}. {point}")
            print()
        
        # Final summary
        print("🎯 Summary:")
        if score >= 80:
            print("   Excellent answer! 🌟")
        elif score >= 60:
            print("   Good answer with room for improvement! 📈")
        elif score >= 40:
            print("   Average answer, needs significant improvement 📚")
        else:
            print("   Poor answer, requires major revision 🔧")
        
        print("=" * 50)
        print("✨ Test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during evaluation: {str(e)}")
        print("Check that the API key is valid and the service is accessible.")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_answer_evaluator()