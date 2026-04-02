## Flutter App Setup

### 1. Navigate to frontend folder
```bash
cd hackathon/frontend
```

### 2. Install Flutter dependencies
```bash
flutter pub get
```

### 3. Set your backend URL

Open lib/core/api_config.dart and set your laptop IP:
```dart
const String baseUrl = "http://192.168.1.100:8000";
```

To find your laptop IP run this in terminal:
```bash
ipconfig    # Windows
ifconfig    # Mac/Linux
```

Make sure your phone and laptop are on the same WiFi network.

### 4. Add TFLite model to assets

Copy face_model.tflite from backend/models_saved/ to frontend/assets/

Then add to pubspec.yaml:
```yaml
flutter:
  assets:
    - assets/face_model.tflite
    - assets/diseases_local.json
```

### 5. Run the app
```bash
flutter run
```

---

## Flutter App Screens

| Screen | Purpose | Endpoint Called |
|---|---|---|
| Splash | Check token, route to home or onboarding | None |
| Onboarding | 3 intro slides, first time only | None |
| Register | Patient registration form | POST /auth/register |
| Login | Email and password login | POST /auth/login |
| Home | Dashboard, creates new case | POST /case/create |
| Voice Input | Record symptoms in any language | POST /ai/voice |
| Report Upload | Upload PDF or photo of report | POST /ai/report |
| Face Scan | Camera scan with TFLite offline | POST /ai/face |
| AI Results | Show top 3 disease predictions | POST /ai/predict |
| Match | Doctors, patients, trials, aid tabs | GET /match/all/{case_id} |
| Book Consultation | Pick slot and book doctor | POST /booking/create |
| My Bookings | All bookings with status | GET /booking/patient/{id} |
| Community | Posts filtered by disease | GET /community/all |
| My Journey | Timeline of patient milestones | GET /journey/{patient_id} |

---

## Flutter Offline Support

| Feature | Online | Offline |
|---|---|---|
| Voice recording | Whisper on server | Records locally, syncs later |
| Report upload | BioBERT on server | Saves file locally, syncs later |
| Face scan | MobileNet on server | TFLite runs on device |
| AI results | Full XGBoost prediction | Shows last saved results |
| My bookings | Live from server | Shows cached bookings |
| Community | Live posts | Shows cached posts |

When internet returns, offline_sync.dart automatically sends all queued actions to the server.

---

## Flutter File Details

### core/api_config.dart
Stores base URL and provides headers with JWT token for every API call.

### core/auth_service.dart
Handles saving and retrieving JWT token, user_id, name, role, case_id using Hive local storage.

### core/connectivity_service.dart
Listens to internet connection changes. Shows offline banner when disconnected. Triggers offline_sync when reconnected.

### core/offline_sync.dart
Saves failed API calls to a queue in Hive. When internet returns, replays all queued calls in order.

### services/tflite_service.dart
Loads face_model.tflite from assets. Preprocesses camera image to 224x224. Runs TFLite interpreter. Returns predicted skin condition and confidence.

### services/ai_api.dart
All AI endpoint calls. Handles multipart form data for file uploads (voice, report, image).

---

## Doctor Dashboard Setup

### 1. Navigate to dashboard folder
```bash
cd hackathon/doctor_dashboard
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set backend URL

Create .env file:
```
VITE_API_URL=http://localhost:8000
```

### 4. Run dashboard
```bash
npm run dev
```

Dashboard runs at: http://localhost:5173

### 5. Doctor login

Doctor registers via the Flutter app or directly via POST /auth/register with role set to "doctor". Then logs into the React dashboard with same email and password.

---

## Doctor Dashboard Pages

| Page | Purpose | Endpoint Called |
|---|---|---|
| Login | Doctor email and password login | POST /auth/login |
| Dashboard | All pending bookings list | GET /booking/doctor/{id} |
| Booking Detail | Full patient AI report | GET /booking/{id}/full-report |
| Confirm Diagnosis | Confirm or override AI prediction | POST /doctor/confirm |
| Add Notes | Treatment plan and follow up | POST /doctor/notes |
| Analytics | Cases treated, AI accuracy rate | GET /doctor/analytics/{id} |

---

## Complete Patient Flow
```
1. Patient opens app
         ↓
2. Registers with email and password
         ↓
3. Home screen creates a new case automatically
         ↓
4. Patient speaks symptoms in Hindi or Telugu
   → Whisper converts to text
   → Symptoms extracted
         ↓
5. Patient uploads blood test or MRI report
   → BioBERT reads report
   → Abnormal values flagged
         ↓
6. Patient takes face/skin photo
   → MobileNet analyzes condition
   → Skin markers detected
         ↓
7. AI Results screen
   → XGBoost combines all 3 inputs
   → Top 3 diseases shown with confidence %
         ↓
8. Match screen
   → Matched doctors shown
   → Clinical trials shown
   → Financial aid shown
         ↓
9. Patient books consultation with matched doctor
         ↓
10. Doctor opens React dashboard
    → Sees booking with full AI report
    → Voice transcript visible
    → Report findings visible
    → Face markers visible
    → AI predictions visible
         ↓
11. Doctor confirms or overrides diagnosis
    → Adds treatment plan
    → Sets follow up date
         ↓
12. Patient sees confirmed diagnosis in My Bookings
         ↓
13. Journey screen shows all milestones completed
```

---

## Complete Doctor Flow
```
1. Doctor registers via Flutter app with role "doctor"
         ↓
2. Doctor opens React dashboard on browser
         ↓
3. Logs in with email and password
         ↓
4. Dashboard shows all pending bookings
         ↓
5. Doctor clicks one booking
         ↓
6. Full AI report loads:
   - Patient name, age, gender, location
   - Voice transcript of symptoms
   - Report findings with flagged values
   - Face scan results
   - Top 3 AI disease predictions with confidence
         ↓
7. Doctor reviews everything and confirms diagnosis
         ↓
8. Doctor adds treatment plan and medications
         ↓
9. Patient notified in app
         ↓
10. Analytics page updates with new case
```

---

## Environment Variables

### Backend .env
```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/orphancure
JWT_SECRET=your_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
DATABASE_NAME=orphancure
```

### Doctor Dashboard .env
```
VITE_API_URL=http://localhost:8000
```

---

## Models Saved Files

After running all 3 notebooks these files will exist in models_saved/:

| File | Created by | Used by |
|---|---|---|
| xgb_model.pkl | train_xgboost.ipynb | config.py at startup |
| label_encoder.pkl | train_xgboost.ipynb | config.py at startup |
| symptom_columns.pkl | train_xgboost.ipynb | config.py at startup |
| biobert_finetuned/ | finetune_biobert.ipynb | config.py at startup |
| biobert_label_encoder.pkl | finetune_biobert.ipynb | config.py at startup |
| face_model.tflite | train_mobilenet.ipynb | Flutter assets + config.py |
| face_class_labels.json | train_mobilenet.ipynb | main.py face route |
| face_model_keras/ | train_mobilenet.ipynb | intermediate, not used in app |

---

## Hackathon Demo Script

### Step 1 — Setup before demo
```bash
# Terminal 1 — start backend
cd backend
venv\Scripts\activate
python main.py

# Terminal 2 — start doctor dashboard
cd doctor_dashboard
npm run dev

# Phone — open Flutter app on same WiFi
```

### Step 2 — Demo flow in 4.5 minutes

1. Open app on phone — show splash and home screen (20 seconds)
2. Tap voice input — speak symptoms in Telugu (30 seconds)
3. Upload a sample blood test report (30 seconds)
4. Take face scan (20 seconds)
5. Show AI Results screen with disease predictions (30 seconds)
6. Show Match screen with doctors and trials (30 seconds)
7. Book consultation (20 seconds)
8. Switch to laptop — open React dashboard (20 seconds)
9. Show doctor seeing full AI report (30 seconds)
10. Doctor confirms diagnosis (20 seconds)
11. Show patient receiving confirmed diagnosis on phone (20 seconds)

Total: approximately 4.5 minutes

---

## Pitch Line

> "7000 rare diseases. 300 million patients. Average diagnosis: 4.5 years and 6 doctors.
> OrphanCure uses 5 AI models to analyze voice, reports and face simultaneously.
> What takes 4.5 years — we do in 4.5 minutes."

---

## Team

| Member | Role |
|---|---|
| Member 1 | Flutter app development |
| Member 2 | FastAPI backend development |
| Member 3 | XGBoost + BioBERT + Recommendation system |
| Member 4 | Whisper + MobileNet + TFLite integration |

---

## References

- Orphanet Database: orphadata.com
- BioBERT: huggingface.co/dmis-lab/biobert-base-cased-v1.2
- OpenAI Whisper: github.com/openai/whisper
- HAM10000 Dataset: Kaggle
- MobileNetV2: TensorFlow Keras Applications
- MediaPipe: developers.google.com/mediapipe

---

*Built for rare disease patients across India.
Because every life deserves an answer.*