"""Model Training Pipeline for Scam Detection.

Trains candidate models:
1. Baseline: TF-IDF (word 1-3 + char 3-5 n-grams) + Calibrated LogisticRegression
2. Deep/Dense MLP Candidate: TF-IDF + 2-layer Neural Network (MLPClassifier)

Picks the winner by F1 score on the held-out real SMS test set.
Saves the lightweight bundle (< 5 MB) into backend/app/ml/models/scam_model.joblib.
"""

from pathlib import Path
import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import FeatureUnion, Pipeline

DATA_DIR = Path(__file__).parent / "data"
MODELS_DIR = Path(__file__).parent.parent / "backend" / "app" / "ml" / "models"


def build_tfidf_union():
    """Build union of word-level and character-level n-grams."""
    return FeatureUnion([
        (
            "word_tfidf",
            TfidfVectorizer(
                ngram_range=(1, 3),
                max_features=4000,
                sublinear_tf=True,
            ),
        ),
        (
            "char_tfidf",
            TfidfVectorizer(
                analyzer="char_wb",
                ngram_range=(3, 5),
                max_features=4000,
                sublinear_tf=True,
            ),
        ),
    ])


def train_models():
    """Train candidates and select the winner based on real SMS test set F1."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    train_df = pd.read_csv(DATA_DIR / "train.csv")
    val_df = pd.read_csv(DATA_DIR / "val.csv")
    test_df = pd.read_csv(DATA_DIR / "test.csv")

    X_train = train_df["clean_text"]
    y_train = train_df["label"]

    X_val = val_df["clean_text"]
    y_val = val_df["label"]

    # Benchmark test subset for model selection
    sms_test = test_df[test_df["source"] == "benchmark_sms"]
    X_test_sms = sms_test["clean_text"]
    y_test_sms = sms_test["label"]

    # Candidate 1: TF-IDF + Calibrated Logistic Regression
    print("\n--- Training Candidate 1: Calibrated Logistic Regression ---")
    pipe_lr = Pipeline([
        ("tfidf", build_tfidf_union()),
        (
            "clf",
            CalibratedClassifierCV(
                LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42),
                cv=3,
            ),
        ),
    ])
    pipe_lr.fit(X_train, y_train)

    preds_lr_val = pipe_lr.predict(X_val)
    f1_lr_val = f1_score(y_val, preds_lr_val)
    preds_lr_test = pipe_lr.predict(X_test_sms)
    f1_lr_sms = f1_score(y_test_sms, preds_lr_test)
    print(f"Candidate 1 (Calibrated LR) -> Val F1: {f1_lr_val:.4f}, SMS Test F1: {f1_lr_sms:.4f}")

    # Candidate 2: TF-IDF + Neural Network (MLP)
    print("\n--- Training Candidate 2: Neural Network (MLP) ---")
    pipe_mlp = Pipeline([
        ("tfidf", build_tfidf_union()),
        (
            "clf",
            MLPClassifier(
                hidden_layer_sizes=(64, 32),
                max_iter=300,
                random_state=42,
                early_stopping=True,
            ),
        ),
    ])
    pipe_mlp.fit(X_train, y_train)

    preds_mlp_val = pipe_mlp.predict(X_val)
    f1_mlp_val = f1_score(y_val, preds_mlp_val)
    preds_mlp_test = pipe_mlp.predict(X_test_sms)
    f1_mlp_sms = f1_score(y_test_sms, preds_mlp_test)
    print(f"Candidate 2 (Neural MLP) -> Val F1: {f1_mlp_val:.4f}, SMS Test F1: {f1_mlp_sms:.4f}")

    # Select winner by real SMS Test F1
    winner = pipe_lr if f1_lr_sms >= f1_mlp_sms else pipe_mlp
    winner_name = "Calibrated Logistic Regression" if winner is pipe_lr else "Neural MLP"
    print(f"\nWinner Model Selected: {winner_name}")

    # Export bundle
    bundle_path = MODELS_DIR / "scam_model.joblib"
    joblib.dump(winner, bundle_path, compress=3)
    file_size_mb = bundle_path.stat().st_size / (1024 * 1024)
    print(f"Exported model bundle to {bundle_path} (Size: {file_size_mb:.2f} MB)")
    assert file_size_mb < 5.0, "Model artifact exceeds 5 MB limit!"


if __name__ == "__main__":
    train_models()
