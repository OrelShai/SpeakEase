import unittest
import sys
import os
from colorama import init, Fore, Style

# Initialize colorama
init()

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from Video_Meeting_Controller.gemini_question_generator import GeminiQuestionGenerator


class TestGeminiQuestionGenerator(unittest.TestCase):
    
    def setUp(self):
        print(f"{Fore.BLUE}🔧 Setting up test...{Style.RESET_ALL}")
        self.generator = GeminiQuestionGenerator()
    
    def test_real_ai_generation(self):
        """🤖 Test REAL AI generation - no mocks!"""
        print(f"{Fore.CYAN}🤖 Testing REAL AI generation...{Style.RESET_ALL}")
        
        # Real AI call
        questions = self.generator.generate_questions(
            scenario_name="Quick Test",
            scenario_notes="Simple conversation test",
            duration=5,
            language="English"
        )
        
        print(f"   {Fore.GREEN}✅ Generated {len(questions)} questions{Style.RESET_ALL}")
        
        if questions:
            for i, q in enumerate(questions, 1):
                print(f"   {Fore.YELLOW}📝 Q{i}: {q['question_text']}{Style.RESET_ALL}")
                print(f"   {Fore.CYAN}⏱️  Duration: {q['expected_duration']} minutes{Style.RESET_ALL}")
            
            # Check if it's AI or fallback
            fallback_indicators = [
                "Can you introduce yourself",
                "What are your main strengths", 
                "Describe a typical day",
                "Tell me about a time you faced a challenging"
            ]
            
            is_fallback = any(any(indicator in q['question_text'] for indicator in fallback_indicators) 
                            for q in questions)
            
            if is_fallback:
                print(f"   {Fore.YELLOW}🔄 RESULT: Using FALLBACK questions (AI failed){Style.RESET_ALL}")
            else:
                print(f"   {Fore.GREEN}🤖 RESULT: Using REAL AI questions! 🎉{Style.RESET_ALL}")
        else:
            print(f"   {Fore.RED}❌ No questions generated!{Style.RESET_ALL}")


if __name__ == '__main__':
    print(f"{Fore.MAGENTA}🚀 Testing REAL AI Generation... 🚀{Style.RESET_ALL}\n")
    unittest.main(verbosity=2)