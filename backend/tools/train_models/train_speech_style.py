# tools\train_models\train_speech_style.py
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
from pathlib import Path

DATA_PATH = Path("tools") / "data" / "speech_style_train.csv"
OUT_PATH  = Path("Performance_Analyzer") / "models" / "speech_style" / "pipeline.joblib"

def main():
    df = pd.read_csv(DATA_PATH)
    X = df["text"].astype(str).values
    y = df["label"].values  # 'polite'/'impolite'

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1,2), min_df=2, max_features=20000)),
        ("clf",   LogisticRegression(max_iter=200))
    ])
    pipe.fit(Xtr, ytr)

    print(classification_report(yte, pipe.predict(Xte)))
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, OUT_PATH)
    print(f"saved -> {OUT_PATH.resolve()}")

if __name__ == "__main__":
    main()
