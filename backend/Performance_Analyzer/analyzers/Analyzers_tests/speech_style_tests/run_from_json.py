# Performance_Analyzer/Analyzers_tests/run_from_json.py
# -*- coding: utf-8 -*-
import json, os
from Performance_Analyzer.analyzers.speech_style import SpeechStyleAnalyzer

CFG = {
    "badwords_path": "Tools/data/badwords_custom.txt",
    "weak_words_path": "Tools/data/weak_words.txt",
    "model_path": "",                 # dictionary-only
    "penalty_bad_single": 20.0,
    "penalty_bad_max": 60.0,
    "penalty_weak_per2": 1.0,
    "penalty_weak_max": 19.0,
    "min_text_tokens": 8
}

JSON_PATH = os.path.join(os.path.dirname(__file__), "sample_transcripts.json")

def main():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    analyzer = SpeechStyleAnalyzer(CFG)

    for i, item in enumerate(data.get("transcripts", []), 1):
        text = item.get("text", "")
        analyzer.context = {"transcript": text}
        res = analyzer.analyze("dummy.mp4")

        print(f"\n=== {i}. {item.get('id')} (hint: {item.get('label_hint')}) ===")
        print("Score:", res.score)
        print("Pred label:", res.details["pred_label"])
        print("Bad words:", res.details["flagged_words"])
        print("Weak words:", res.details["weak_counts"])
        # אם תרצה לראות אחוז מילים חלשות:
        wt, n = res.details["weak_total"], max(res.details["n_tokens"], 1)
        print(f"Weak density: {100.0*wt/n:.1f}%")

if __name__ == "__main__":
    main()
