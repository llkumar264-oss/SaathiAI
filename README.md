# साथी AI (SaathiAI) - Digital Companion for Senior Citizens

[![CI & Quality Gates](https://github.com/google-promptwars/saathi-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/google-promptwars/saathi-ai)
[![Backend Coverage](https://img.shields.io/badge/backend%20coverage-86%25-brightgreen)](backend/tests)
[![Frontend Coverage](https://img.shields.io/badge/frontend%20coverage-79%25-brightgreen)](frontend/src/tests)
[![Security Bandit](https://img.shields.io/badge/security-bandit%20passed-blue)](backend/app)
[![Accessibility WCAG 2.2 AA](https://img.shields.io/badge/accessibility-WCAG%202.2%20AA-orange)](frontend/src)

**SaathiAI** is an empathetic, voice-first, AI-powered daily companion web application crafted specifically for senior citizens (60–80 years old) in India. Built for the Google PromptWars "Build with AI" challenge, SaathiAI bridges the digital divide with large touch targets, bilingual English/Hindi voice interaction, proactive health tracking, smart scam shielding, document simplification, tech tutoring, and an instant 3-second SOS emergency beacon.

---

## 🌟 Key Features & Connected Workflows

### 1. 🎙️ Saathi Voice Companion (Multimodal AI)
- **Conversational & Respectful**: Addresses users with honorifics (*"शर्मा जी"*), speaks Hindi, Hinglish, and English with adjustable speech rate.
- **Intelligent Query Router**: Automatically distinguishes factual inquiries (routed to **Google Search Grounding** with real citations) from action requests (routed to **Gemini Function Calling** with user confirmation cards).
- **Proactive Context**: Automatically aware of today's schedule, pending doses, latest vitals, and family contacts.

### 2. 💊 Medicine Manager & Vision Scanner
- **Prescription Scanner**: Extract medicine names, dosages, and schedules directly from doctor prescription photos via Gemini Vision.
- **7-Day Adherence Tracking**: Dose logging (Taken / Skipped) with visual adherence percentage and missed-dose indicators.
- **Offline PWA Support**: Today's medicines cached offline in `localStorage` and service worker cache.
- **Browser Push Reminders**: Service Worker + Notification API with fallback in-app "Due Now" list.

### 3. 🛡️ Scam Shield (Local ML + Generative AI)
- **Local Calibrated ML Classifier**: Sub-millisecond scam risk scoring ($F_1 = 1.00$, bundle size $< 0.10$ MB) based on TF-IDF + Logistic Regression trained on Indian scam archetypes (electricity disconnection, fake lottery, bank APKs, KYC freeze).
- **Hard Safety Floor**: Any message requesting UPI PIN or OTP immediately receives a $0.99$ scam risk floor regardless of phrasing.
- **Generative Plain-Language Explanations**: Empathetic explanations in Hindi/English explaining exactly why a message is dangerous.
- **Automatic Family Alerts**: High-risk messages prompt immediate automated dispatch of alerts to family members.

### 4. 💓 Health & Vitals Tracker (JNC-8 4-Tier & Anomaly Detection)
- **4-Tier Evaluation**: Replaces single thresholds with clinical tiers:
  - **सामान्य (Normal)**: Systolic $<140$, Diastolic $<90$ (JNC-8 target for seniors $60+$).
  - **हल्का बढ़ा हुआ (Elevated)**: Systolic $140$–$159$ or Diastolic $90$–$99$.
  - **उच्च (High)**: Systolic $160$–$179$ or Diastolic $100$–$119$.
  - **अति उच्च / आपातकाल (Urgent)**: Systolic $\ge 180$ or Diastolic $\ge 120$, or Blood Sugar $<70$ or $>300$ mg/dL.
- **Emergency Action**: Urgent readings trigger instant advisory: *"तुरंत डॉक्टर से संपर्क करें या 112 पर कॉल करें" (Contact a doctor now / call 112)*.
- **Voice Entry**: Seniors can log readings by speaking naturally (*"मेरा बीपी 135 और 85 है"*).
- **ML Anomaly Detection**: `IsolationForest` unsupervised model detects atypical physiological patterns.

### 5. 📄 Document Simplifier
- **4-Section Plain Summary**: Simplifies complex Indian utility bills, pension notices, and hospital discharges into:
  1. यह क्या है? (What is this?)
  2. आपको क्या करना है? (What do you need to do?)
  3. कितना भुगतान करना है? (How much to pay?)
  4. अंतिम तारीख (Due Date)
- **1-Tap Reminder**: Turns extracted due dates into scheduled calendar alerts with one click.
- **Grounded Q&A**: Lets seniors ask questions strictly grounded in the uploaded document.

### 6. 📱 Digital Guru (Tech Tutor)
- **Step-by-Step Interactive Guides**: WhatsApp video calling, sending money via UPI, booking IRCTC train tickets, viewing DigiLocker Aadhaar, paying electricity bills, and Google Maps.
- **"I'm Stuck" Voice Assistant**: Seniors tap a single button when confused; Saathi explains the exact next button to press.
- **Dynamic AI Lessons**: Generates customized senior-friendly guides for any application or technology.

### 7. 👨‍👩‍👦 Family Circle & 3-Second SOS
- **Trusted Contacts CRUD**: Stores son, daughter, or caregiver contacts.
- **3-Second Hold SOS**: High-contrast button requires continuous 3-second hold with SVG circular progress ring to prevent accidental triggers.
- **Emergency Dispatch**: Dispatches alert with real-time GPS coordinates and a Google Maps navigation link.
- **Caregiver Consent View**: Read-only family dashboard displaying vitals, adherence, and active alerts.

### 8. ☀️ Morning Brief
- **Daily Holistic Snapshot**: Integrates live Open-Meteo weather with senior health advice (heat wave, hydration, rain slip warnings).
- **Cached Once Daily**: Reduces cognitive load and API latency by caching the briefing for the day.
- **Audio Read-Aloud**: Full speech synthesis audio playback with one tap.

---

## 🏗️ Architecture & Technology Stack

```
                     +---------------------------------------------+
                     |             Senior Citizen User             |
                     |   (Voice Input / High Contrast / Touch)     |
                     +---------------------------------------------+
                                            │
                                            ▼
                     +---------------------------------------------+
                     |         Frontend PWA (React 18 + Vite)      |
                     |   TailwindCSS | Lucide | Recharts | i18n    |
                     |   WCAG 2.2 AA | Service Worker Notifications|
                     +---------------------------------------------+
                                            │  HTTP / SSE
                                            ▼
                     +---------------------------------------------+
                     |           Backend API (FastAPI)             |
                     |   Python 3.11 | SlowAPI Rate Limiter        |
                     +---------------------------------------------+
                            │                 │              │
         ┌──────────────────┘                 │              └──────────────────┐
         ▼                                    ▼                                 ▼
+───────────────────+             +──────────────────────+             +───────────────────+
|   Gemini 2.5 Flash|             |   Local ML Engines   |             |   External APIs   |
|   Multimodal Vision|            | Calibrated Logistic  |             | Open-Meteo Weather|
|   Function Calling|             | Regression (Scam)    |             | Firebase Admin    |
|   Search Grounding|             | IsolationForest      |             | Secret Manager    |
+───────────────────+             +──────────────────────+             +───────────────────+
```

---

## 🔒 Security & Quality Gates Compliance

All 11 approved challenge criteria have been implemented and verified:

| Requirement | Description | Status | Verification |
|-------------|-------------|--------|--------------|
| **1. Guest Mode** | "Try as Guest" seeded demo mode with daily isolation | ✅ Implemented | Tested in `test_guest.py` & Playwright |
| **2. Auth Suite** | Google Sign-In (primary), Email link (backup), Phone OTP | ✅ Implemented | Firebase Admin SDK + dev tokens |
| **3. Prod Dev Tokens** | Strictly rejected in `ENVIRONMENT=prod`; app startup refused | ✅ Implemented | Tested in `test_auth_security.py` |
| **4. Scam ML** | Source labeled, deduplicated, calibrated LR $F_1 = 1.0$ | ✅ Implemented | Documented in `ml/MODEL_CARD.md` |
| **5. Vitals Tiers** | Normal / Elevated / High / Urgent with 112 alert & JNC-8 | ✅ Implemented | All boundaries tested in `test_vitals_tiers.py` |
| **6. PWA & Reminders**| SW + Notification API, offline today's meds view | ✅ Implemented | Manifest & SW registered in `main.tsx` |
| **7. Grounding Router**| Dedicated router separating Search Grounding and Tools | ✅ Implemented | Tested in `test_chat.py` |
| **8. CI Quality Gates**| Bandit, Pip-Audit, NPM Audit, Gitleaks, Coverage, Lighthouse | ✅ Implemented | `.github/workflows/ci.yml` |
| **9. Deterministic Mock**| `GEMINI_MOCK=true` mode for CI and Playwright | ✅ Implemented | Used across all test suites |
| **10. Incremental Build**| Steps (a) through (j) with verified tests | ✅ Implemented | All 53 backend + 24 frontend tests pass |
| **11. Cloud Run Config**| `--max-instances 10` and rate limiter documentation | ✅ Implemented | Documented below and in `deploy.sh` |

---

## 🚀 Deployment to Google Cloud Run

SaathiAI packages both the FastAPI backend and built React frontend into a unified, secure single-container deployment.

### Cloud Run Deployment Command
```bash
gcloud run deploy saathi-ai \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars ENVIRONMENT=prod,ALLOW_DEV_TOKENS=false,GEMINI_MODEL=gemini-2.5-flash \
  --min-instances 1 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 1 \
  --port 8080
```

### ⚠️ Architecture Note: Cloud Run `--max-instances 10` & Rate Limiting
- **In-Memory Limiter Limitation**: SaathiAI implements rate limiting via SlowAPI with a token bucket in process memory. Each Cloud Run instance maintains its own local counter.
- **Instance Cap**: Setting `--max-instances 10` prevents runaway billing and limits concurrency while ensuring smooth scaling for Indian traffic spikes.
- **Production Redis Integration**: For cross-instance distributed rate limiting across horizontal autoscaling events, configure Google Cloud Memorystore (Redis) and supply the `REDIS_URL` environment variable.

---

## 🧪 Local Development & Running Tests

### 1. Prerequisites
- Python 3.11+
- Node.js 20+

### 2. Backend Setup & Tests
```bash
# Setup virtual environment
python -m venv venv
.\venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r backend/requirements.txt

# Run all 53 unit & integration tests with coverage (>= 85%)
python -m pytest backend/tests --cov=backend/app --cov-report=term-missing --cov-fail-under=85

# Run Bandit security audit
bandit -r backend/app -ll
```

### 3. Frontend Setup & Tests
```bash
cd frontend

# Install dependencies
npm install

# Run unit tests with coverage (>= 75%)
npm test -- --coverage

# Run Playwright senior workflow tests
npx playwright test
```

### 4. Running the Dev Server
```bash
# Terminal 1: Backend
python -m uvicorn backend.app.main:app --port 8080 --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173` and click **"तुरंत शुरू करें (बिना पासवर्ड)"** to explore the complete guest demo!
