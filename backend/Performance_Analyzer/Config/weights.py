# Performance_Analyzer/config/weights.py
DEFAULT_WEIGHTS = {
    "overall":    { "verbal": 0.2, "body_language": 0.3, "interaction": 0.5 },
    "categories": {
        "verbal":        { "language_quality": 0.0, "speech_style": 0.5, "grammar_ml": 0.5 },
        "body_language": { "eye_contact": 0.34, "head_pose": 0.33, "facial_expression": 0.33 },
        "interaction":   { "tone": 0.2, "content_answer_quality": 0.8 }
    }
}
