# tools/train_models/train_grammar_quality.py
# --------------------------------------------------
# מאמן מודל ML ל-grammar_ml על בסיס הפיצ'רים של GrammarMLAnalyzer.
# תומך בשני מצבים:
#  - quick mode (לסט קטן): אימון על כל הדאטה ללא CV/פיצול
#  - full mode (לסט סביר): פיצול טסט+GridSearchCV
# שמירה ל-joblib כך שה-grammar_ml יטען את המודל בפרודקשן.
# --------------------------------------------------

import os, csv, json, argparse
from collections import Counter

import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix

import joblib

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from Performance_Analyzer.analyzers.grammar_ml import GrammarMLAnalyzer

def read_dataset(csv_path):
    rows = []
    with open(csv_path, newline='', encoding='utf-8') as f:
        r = csv.DictReader(f)
        for row in r:
            text = (row.get("text") or "").strip()
            lab  = row.get("label")
            if text and lab is not None and str(lab) != "":
                rows.append((text, int(lab)))
    return rows


def compute_features_for_text(text, lang="en-US"):
    """מחשב *בדיוק* את הפיצ'רים של GrammarMLAnalyzer (בלי CoLA)."""
    tmp = GrammarMLAnalyzer(config={
        "language": lang,
        "use_cola_transformer": False,    # לא בשימוש בגרסה הנוכחית
        "use_whisper_fallback": False,    # לא צריך לאימון מהטקסטים
    })
    errs  = tmp._grammar_errors(text)
    feats = tmp._compute_features(text, errs)   # ← שונה: אין cola
    return feats


def has_enough_data(y):
    """בודק אם יש מספיק דוגמאות לכל מחלקה כדי להריץ פיצול+CV בצורה יציבה."""
    c = Counter(y)
    # צריך לפחות 2 לכל מחלקה לפיצול, ועדיף 3+ לכל מחלקה ל-CV
    return len(c) == 2 and min(c.values()) >= 3 and len(y) >= 12


def train_quick(X_dicts, y):
    """אימון מהיר ללא פיצול/CV (לסט קטן)"""
    pipe = Pipeline([
        ("vec", DictVectorizer(sparse=False)),
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(max_iter=500, class_weight="balanced"))
    ])
    pipe.fit(X_dicts, y)
    return pipe, None, None  # אין מטריקות טסט


def train_full(X_dicts, y):
    """אימון מלא עם פיצול טסט ו-GridSearchCV."""
    X_train, X_test, y_train, y_test = train_test_split(
        X_dicts, y, test_size=0.2, random_state=42, stratify=y
    )

    pipe = Pipeline([
        ("vec", DictVectorizer(sparse=False)),
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(max_iter=500, class_weight="balanced"))
    ])

    # CV שמרני (3 קפלים) כדי להימנע מקריסות בסט קטן יחסית
    grid = {"lr__C": [0.1, 0.5, 1.0, 2.0, 5.0]}
    gs = GridSearchCV(pipe, grid, scoring="roc_auc", cv=3, n_jobs=-1, verbose=1)
    gs.fit(X_train, y_train)
    best = gs.best_estimator_

    proba = best.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, proba)
    y_pred = (proba >= 0.5).astype(int)

    report = classification_report(y_test, y_pred, digits=3)
    cm = confusion_matrix(y_test, y_pred)

    print("Best params:", gs.best_params_)
    print("AUC:", round(auc, 4))
    print("Confusion matrix:\n", cm)
    print("Classification report:\n", report)

    metrics = {
        "auc": float(auc),
        "confusion_matrix": cm.tolist(),
        "report": report,
        "best_params": gs.best_params_,
    }
    return best, metrics, X_test


def main(args):
    print("Reading dataset...")
    data = read_dataset(args.csv)
    if not data:
        raise SystemExit(f"No data found in {args.csv}")

    print(f"Loaded {len(data)} samples from {args.csv}")

    # תכונות
    X_dicts, y = [], []
    print("Extracting features for each sample...")
    for i, (text, lab) in enumerate(data):
        print(f"  [{i+1}/{len(data)}] Extracting features for: {text[:40]}...")
        X_dicts.append(compute_features_for_text(text, lang=args.language))
        y.append(lab)
    y = np.array(y)
    print("Feature extraction complete.")

    # בחירת מצב אימון
    if has_enough_data(y):
        print("Training mode: FULL (train/test split + CV)")
        model, metrics, _ = train_full(X_dicts, y)
    else:
        print("Training mode: QUICK (no split/CV) — dataset is small")
        model, metrics, _ = train_quick(X_dicts, y)

    print("Saving model...")
    os.makedirs(os.path.dirname(args.model_out), exist_ok=True)
    joblib.dump(model, args.model_out)
    print("Saved model →", args.model_out)

    print("Saving meta-data...")
    meta = {
        "language": args.language,
        "feature_keys": list(X_dicts[0].keys()),
        "version": "1.0.1",
        "train_csv": os.path.abspath(args.csv),
        "mode": "full" if metrics else "quick",
    }
    if metrics:
        meta.update(metrics)

    with open(args.model_out + ".meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print("Saved meta →", args.model_out + ".meta.json")
    print("Training finished successfully.")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--csv", default="tools/data/grammar_quality_labeled.csv")
    p.add_argument("--model_out", default="tools/train_models/grammar_quality_lr.joblib")
    p.add_argument("--language", default="en-US")  # אפשר להחליף ל-he-IL לעברית
    args = p.parse_args()
    main(args)
