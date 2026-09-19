"""Dataset preparation and stratified splitting."""

from pathlib import Path
import re
import pandas as pd
from sklearn.model_selection import train_test_split

DATA_DIR = Path(__file__).parent / "data"


def normalize_text(text: str) -> str:
    """Normalize text for consistent feature extraction."""
    if not isinstance(text, str):
        return ""
    text = text.lower().strip()
    # Normalize URLs
    text = re.sub(r"https?://\S+|www\.\S+", " http_url ", text)
    # Normalize phone numbers
    text = re.sub(r"\b[6-9]\d{9}\b", " phone_number ", text)
    # Normalize monetary values
    text = re.sub(r"[₹$£]\s?\d+[\d,]*", " money_amount ", text)
    # Normalize extra whitespaces
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def prepare_and_split_data():
    """Load, normalize, deduplicate, and perform stratified train/val/test split."""
    raw_path = DATA_DIR / "scam_corpus.csv"
    if not raw_path.exists():
        from ml.download_data import generate_benchmark_and_indian_scam_dataset
        generate_benchmark_and_indian_scam_dataset()

    df = pd.read_csv(raw_path)
    print(f"Loaded {len(df)} rows from {raw_path}")

    # Normalize
    df["clean_text"] = df["text"].apply(normalize_text)

    # Near-duplicate deduplication across splits
    df = df.drop_duplicates(subset=["clean_text"]).reset_index(drop=True)
    print(f"After near-duplicate removal: {len(df)} rows")

    # Stratified Split by label and source combined
    df["strat_key"] = df["source"] + "_" + df["label"].astype(str)

    train_df, test_val_df = train_test_split(
        df, test_size=0.30, random_state=42, stratify=df["strat_key"]
    )
    val_df, test_df = train_test_split(
        test_val_df, test_size=0.50, random_state=42, stratify=test_val_df["strat_key"]
    )

    train_df.to_csv(DATA_DIR / "train.csv", index=False)
    val_df.to_csv(DATA_DIR / "val.csv", index=False)
    test_df.to_csv(DATA_DIR / "test.csv", index=False)

    print(f"Saved splits -> Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")


if __name__ == "__main__":
    prepare_and_split_data()
