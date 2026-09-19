# SaathiAI (साथी AI) - Gemini & YouTube API Integration Guide 🚀
*सम्पूर्ण गाइड: Gemini और YouTube APIs को जोड़ें और साथी AI को नेक्स्ट-लेवल बनाएं*

---

## 📖 विषय सूची (Table of Contents)
1. [Gemini API Key कहाँ और कैसे लगाएं (Where & How to configure Gemini API Key)](#1-gemini-api-key-कहाँ-और-कैसे-लगाएं)
2. [Gemini API से आपका Solution "Next-Level" कैसे बनता है? (Why Gemini Takes SaathiAI to the Next Level)](#2-gemini-api-से-आपका-solution-next-level-कैसे-बनता-है)
3. [YouTube API Key कहाँ और कैसे लगाएं (Where & How to configure YouTube API Key)](#3-youtube-api-key-कहाँ-और-कैसे-लगाएं)
4. [YouTube भजन एवं सुकून हब (Bhajan & Devotional Hub Features)](#4-youtube-भजन-एवं-सुकून-हब)
5. [Local Development (.env) Configuration](#5-local-development-env-configuration)
6. [Cloud Deployment (Google Cloud Run / Secrets Manager)](#6-cloud-deployment)
7. [Testing & Verification (जांच और सत्यापन)](#7-testing--verification)

---

## 1. Gemini API Key कहाँ और कैसे लगाएं

### 🔑 Step 1: Free Gemini API Key प्राप्त करें
1. अपने ब्राउज़र में [Google AI Studio](https://aistudio.google.com/) खोलें।
2. अपने Google Account से साइन इन करें।
3. **"Get API key"** बटन पर क्लिक करें।
4. **"Create API key in new project"** चुनें और अपनी Key कॉपी कर लें (उदाहरण: `AIzaSy...`).

---

### 📂 Step 2: Localhost पर Key कहाँ लगाएं (Local Setup)
प्रोजेक्ट की रूट डायरेक्टरी में स्थित `.env` फ़ाइल खोलें:
**फ़ाइल पाथ:** `C:\Users\Admin\.gemini\antigravity-ide\scratch\saathi-ai\.env` (या आपके प्रोजेक्ट का `.env`)

फ़ाइल के अंदर इन दो वेरिएबल्स को अपडेट करें:

```ini
# -------------------------------------------------------------
# GOOGLE GEMINI CONFIGURATION
# -------------------------------------------------------------
GEMINI_API_KEY=AIzaSyBYourActualGeminiApiKeyGoesHere123456789
GEMINI_MOCK=false
GEMINI_MODEL=gemini-2.5-flash
```

> ⚠️ **महत्वपूर्ण (Important):** 
> जब तक `GEMINI_MOCK=true` रहेगा, बैकएंड टेस्ट और डेमो मोड के लिए स्थानीय मॉक उत्तर लौटाएगा। 
> असली AI का जादू देखने के लिए **`GEMINI_MOCK=false`** करें और अपना असली `GEMINI_API_KEY` डालें।

---

## 2. Gemini API से आपका Solution "Next-Level" कैसे बनता है?

जब आप असली **Gemini 2.5 Flash** जोड़ते हैं, तो SaathiAI एक साधारण चैटबॉट से बदलकर एक असली **24/7 जीवित पारिवारिक साथी** बन जाता है:

| फ़ीचर (Feature) | Mock Mode (बिना Key के) | Next-Level with Gemini 2.5 Flash 🌟 |
|---|---|---|
| **डॉक्टर का पर्चा पढ़ना (Prescription Vision)** | केवल पहले से लोड किया गया सैंपल पर्चा पड़ता है। | किसी भी असली हाथ से लिखे डॉक्टर के पर्चे (OCR + Vision) की फ़ोटो खींचकर दवा का नाम, खुराक (Dose), और समय तुरंत निकालता है। |
| **सरकारी व बिजली बिल समझना (Document Simplifier)** | केवल डेमो बिजली बिल समझता है। | किसी भी जटिल 10-पेज के पेंशन दस्तावेज, बैंक नोटिस, या अस्पताल की रसीद को 4 सरल बुलेट पॉइंट्स में बुजुर्गों की सरल हिंदी में समझाता है। |
| **Google Search Grounding** | स्थानीय ज्ञान तक सीमित। | ताज़ा मौसम, आज की सरकारी योजनाएं (उदा. आयुष्मान भारत 70+ कवरेज), और डॉक्टरों के सुझाव लाइव Google Search से वेरिफ़ाई करके बताता है। |
| **आवाज़ और भावना की समझ (Voice & Empathy)** | सामान्य उत्तर। | अकेलेपन के समय एक सच्चे मित्र की तरह आदर और स्नेह भरी ठेठ हिंदी/हिंग्लिश में बात करता है। |
| **Autonomous Tool Calling** | केवल प्री-प्रोग्राम्ड नियम। | जब बुजुर्ग कहते हैं *"बेटा, जरा हनुमान चालीसा चला दो"* या *"मेरी बीपी 140/90 दर्ज कर लो"*, तो Gemini खुद `play_youtube_video` या `log_vitals` टूल चलाकर काम पूरा करता है। |

---

## 3. YouTube API Key कहाँ और कैसे लगाएं

SaathiAI में भजन और कोई भी गाना बजाने के लिए **2-Tier Architecture** बनाया गया है:
1. **Curated Senior Catalog (Zero-Config Fallback):** बिना किसी API Key के भी 8+ सबसे लोकप्रिय भजन (हनुमान चालीसा, गायत्री मंत्र, कृष्ण गोविंद, शिव तांडव, लता जी के सदाबहार गीत) 1-टैप में बिना विज्ञापन के बजते हैं।
2. **Dynamic YouTube Data API v3:** जब आप API Key डालते हैं, तो बुजुर्ग **बोलकर या लिखकर YouTube का कोई भी वीडियो, भजन, कथा, या प्रवचन** तुरंत खोज और सुन सकते हैं!

### 🔑 YouTube API Key प्राप्त करने का तरीका:
1. [Google Cloud Console](https://console.cloud.google.com/) में जाएं।
2. **APIs & Services > Library** में जाएं।
3. **"YouTube Data API v3"** सर्च करें और **Enable** पर क्लिक करें।
4. **Credentials > Create Credentials > API Key** पर क्लिक करें।
5. अपनी Key कॉपी करें।

### 📂 `.env` में Key जोड़ें:
प्रोजेक्ट की `.env` फ़ाइल में:

```ini
# -------------------------------------------------------------
# YOUTUBE DATA API CONFIGURATION (OPTIONAL BUT RECOMMENDED)
# -------------------------------------------------------------
YOUTUBE_API_KEY=AIzaSyYourYouTubeDataApiKeyHere987654321
```

इसके बाद बैकएंड सर्वर को रीस्टार्ट करें:
```bash
# Backend auto-reloads if running, or run:
uvicorn backend.app.main:app --host 127.0.0.1 --port 8080 --reload
```

---

## 4. YouTube भजन एवं सुकून हब (Bhajan & Devotional Hub)

SaathiAI के डैशबोर्ड पर **🪔 भजन एवं सत्संग (Bhajans & Devotion)** का विशेष टाइल जोड़ा गया है:

### ✨ प्रमुख विशेषताएं:
1. **1-टैप प्लेबैक (One-Tap Playback):**
   - बड़े और स्पष्ट बटन्स, जिन्हें 60-80 साल के बुजुर्ग आसानी से बिना चश्मे के भी दबा सकते हैं।
2. **YouTube No-Cookie Privacy Player:**
   - `https://www.youtube-nocookie.com/embed/{id}?autoplay=1&rel=0` का इस्तेमाल किया गया है ताकि बुजुर्गों को कोई अनावश्यक ट्रैकर्स या परेशान करने वाले विज्ञापन न दिखें।
3. **बोलकर खोजें (Voice Search - Web Speech API):**
   - माइक बटन दबाकर बोलें: *"गायत्री मंत्र"* या *"लता मंगेशकर के गाने"* — ऐप स्वतः खोजकर वीडियो पेश कर देता है।
4. **श्रेणियां (Categories):**
   - 🌸 सभी (All)
   - 🚩 हनुमान जी (Hanuman)
   - 🦚 कृष्ण भजन (Krishna)
   - 🔱 शिव वंदना (Shiva)
   - 🪔 मंत्र व आरती (Aarti)
   - 🏹 श्री राम (Shri Ram)
   - 📻 सदाबहार गीत (Old Classics)

---

## 5. Local Development (.env) Template

आपकी पूरी `.env` फ़ाइल इस प्रकार दिखनी चाहिए:

```ini
# -----------------------------------------------------------------------------
# SaathiAI Complete Environment Configuration
# -----------------------------------------------------------------------------
ENVIRONMENT=dev
PORT=8080
LOG_LEVEL=INFO

# Gemini AI (Google AI Studio)
GEMINI_API_KEY=AIzaSyYourActualGeminiApiKeyGoesHere
GEMINI_MOCK=false
GEMINI_MODEL=gemini-2.5-flash

# YouTube Data API v3
YOUTUBE_API_KEY=AIzaSyYourYouTubeApiKeyGoesHere

# Firebase Auth & Storage (Optional for Dev / Dev-Token enabled in dev)
FIREBASE_PROJECT_ID=saathiai-prod
FIREBASE_PRIVATE_KEY_ID=mock-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@saathiai-prod.iam.gserviceaccount.com

# OpenWeatherMap (Free API for senior weather/health advisory)
WEATHER_API_KEY=
```

---

## 6. Cloud Deployment (Google Cloud Run)

जब आप SaathiAI को Google Cloud Run पर प्रोडक्शन में डिप्लॉय करें, तो कभी भी API Keys को कोड में हार्डकोड न करें। Google Cloud Secret Manager का उपयोग करें:

```bash
# 1. Gemini Secret बनाएं
echo -n "AIzaSyYourGeminiApiKey" | gcloud secrets create GEMINI_API_KEY --data-file=-

# 2. YouTube Secret बनाएं
echo -n "AIzaSyYourYouTubeApiKey" | gcloud secrets create YOUTUBE_API_KEY --data-file=-

# 3. Cloud Run Service को Secrets असाइन करें
gcloud run deploy saathiai-backend \
  --image gcr.io/$PROJECT_ID/saathiai-backend:latest \
  --platform managed \
  --region asia-south1 \
  --set-env-vars ENVIRONMENT=prod,GEMINI_MOCK=false \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,YOUTUBE_API_KEY=YOUTUBE_API_KEY:latest
```

---

## 7. Testing & Verification (जांच और सत्यापन)

### Localhost पर चलाकर देखें:
1. **Frontend:** [http://localhost:5173](http://localhost:5173)
2. **Backend API Docs:** [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)
3. **YouTube Endpoints:**
   - `GET /api/youtube/curated` -> 8 चयनित भक्ति एवं सदाबहार गीत।
   - `GET /api/youtube/search?q=hanuman` -> YouTube API या सुरक्षित क्यूरेटेड रिज़ल्ट्स।
   - `POST /api/youtube/play` -> वीडियो प्लेबैक मेटाडेटा।

### ऑटोमेटेड टेस्ट चलाएं:
```bash
# Backend pytest (56 tests with >86% coverage)
.\venv\Scripts\pytest backend/tests/test_youtube.py -v

# Frontend vitest (26 tests with >79% coverage)
cd frontend
npm test -- src/tests/BhajanHub.test.tsx
```

---
*SaathiAI — बुजुर्गों का सच्चा डिजिटल साथी ❤️*
