# -*- coding: utf-8 -*-
"""
Run SpeechStyleAnalyzer on multiple sample texts (inline list).
"""

from Performance_Analyzer.analyzers.speech_style import SpeechStyleAnalyzer

# ---------- Inline Config ----------
ANALYZER_CFG = {
    "badwords_path": "Tools/data/badwords_custom.txt",
    "weak_words_path": "Tools/data/weak_words.txt",
    "model_path": "",

    "penalty_bad_single": 20.0,
    "penalty_bad_max": 60.0,

    # normalization mode
    "weak_penalty_mode": "density",
    "penalty_weak_per_10pct": 5.0,
    "penalty_weak_max": 19.0,

    "min_text_tokens": 1,
}

# List of texts to analyze
TEXTS = [
    "Thank you, this is really great and helpful.",
    "Well, umm, I think this is fine but you are an asshole.",
    "So yeah, like, I guess it's okay, you know?",
    "Maybe we could sort of try again, I feel like it might work.",
    "Whatever, this stuff is literally useless.",
    "Uhhhh... well, to be honest, I dunno.",
    "You idiot, you asshole, such a loser, shit fuck.",
    "Actually, basically, it's kind of like, you know, pretty much done.",
    "Great job! Honestly, I think you nailed it.",
]

def main():
    analyzer = SpeechStyleAnalyzer(ANALYZER_CFG)

    for i, text in enumerate(TEXTS, 1):
        analyzer.context = {"transcript": text}
        res = analyzer.analyze("dummy.mp4")

        print(f"\n=== Test {i} ===")
        print("Transcript:", text)
        print("Score:", res.score)
        print("Pred label:", res.details['pred_label'])
        print("Bad words:", res.details['flagged_words'])
        print("Weak words:", res.details['weak_counts'])

if __name__ == "__main__":
    main()
