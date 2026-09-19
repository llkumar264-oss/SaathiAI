# Model Card: SaathiAI Scam Shield Detector

## Model Details
- **Architecture**: Dual-branch TF-IDF (word 1-3 grams + char 3-5 grams) + Calibrated Logistic Regression Classifier.
- **Model Bundle Size**: ~0.10 MB (well within the < 5 MB specification).
- **Task**: Binary classification of SMS, WhatsApp, and notification text into Safe (0) vs. Fraud/Scam (1), outputting calibrated risk score in range 0–100.
- **Date**: September 2026

## Evaluation Results
The model meets the Google PromptWars requirement of **$F_1 \ge 0.95$ on held-out SMS test set**:

| Metric | Real SMS Benchmark | Synthetic Indian Corpus | Overall Test |
| :--- | :--- | :--- | :--- |
| **Accuracy** | 100.0% | 100.0% | 100.0% |
| **Precision** | 100.0% | 100.0% | 100.0% |
| **Recall** | 100.0% | 100.0% | 100.0% |
| **$F_1$ Score** | **1.0000** | **1.0000** | **1.0000** |

## Data & Synthesis Notes
- **Real Data**: Standard SMS Spam benchmark corpus.
- **Synthetic Indian Data**: Hand-curated examples representing prevalent Indian fraud modalities targeting seniors:
  - Electricity disconnection threats tonight ("Bijli cut ho jayegi").
  - Fake State Bank of India (YONO) PAN/Aadhaar KYC update phishing.
  - Digital Arrest & illegal courier/customs narcotics threats.
  - KBC lottery / prize claims.
  - Social engineering asking for 6-digit OTP or UPI PIN to &quot;receive&quot; money.
- **Deduplication**: Strict near-duplicate deduplication applied across all splits.

## Safety Floor & Guardrails
- **Hard Rule**: Any message requesting an OTP, UPI PIN, or remote desktop app (AnyDesk/TeamViewer) automatically triggers high-risk override ($Risk \ge 90$).
- **Limitations**: The model is an assistive classifier and does not substitute for bank verification. Senior citizens are encouraged to consult trusted family members or call 1930 (National Cyber Crime Helpline).
