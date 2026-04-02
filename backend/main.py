import os
import json
import shutil
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, List
from bson import ObjectId

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from passlib.context import CryptContext
from jose import JWTError, jwt

from config import (
    users_col, cases_col, bookings_col, diseases_col,
    doctors_col, trials_col, aid_col, applications_col,
    community_col, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES,
    xgb_model, label_encoder, symptom_columns,
    biobert_pipeline, face_interpreter, load_models, get_whisper
)

from models import (
    UserRegister, UserLogin, TokenResponse,
    CaseCreate, CaseUpdate, CaseResponse,
    PredictRequest, PredictResponse, PredictionResult,
    VoiceResponse, ReportResponse, ReportFinding, FaceResponse,
    MatchResult, DoctorMatch, PatientMatch, TrialMatch, AidMatch,
    BookingCreate, BookingResponse, BookingFullReport,
    DoctorNotes, DiagnosisConfirm, DoctorAnalytics,
    AidApplication, AidApproval,
    CommunityPost, CommunityResponse,
    JourneyUpdate, JourneyResponse
)

# ─── APP SETUP ──────────────────────────────────────────

app = FastAPI(title="OrphanCure API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ─── STARTUP ────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    load_models()
    print("OrphanCure API started")

# ─── HELPERS ────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "role": role, "exp": expire},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

def str_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        role = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── AUTH ROUTES ────────────────────────────────────────

@app.post("/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    existing = await users_col.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(user.password)

    user_doc = {
        "name": user.name,
        "email": user.email,
        "password": hashed,
        "role": user.role,
        "age": user.age,
        "gender": user.gender,
        "location": user.location,
        "phone": user.phone,
        "created_at": datetime.utcnow().isoformat()
    }

    if user.role == "doctor":
        user_doc["specialization"] = user.specialization
        user_doc["diseases_treated"] = user.diseases_treated
        user_doc["hospital"] = user.hospital
        user_doc["cases_treated"] = 0
        user_doc["success_rate"] = 0.0
        user_doc["available_for_teleconsult"] = True

    if user.role == "ngo":
        user_doc["ngo_name"] = user.ngo_name
        user_doc["ngo_focus"] = user.ngo_focus

    result = await users_col.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = create_token(user_id, user.role)

    return TokenResponse(
        access_token=token,
        user_id=user_id,
        role=user.role,
        name=user.name
    )


@app.post("/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    db_user = await users_col.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Wrong password")

    user_id = str(db_user["_id"])
    token = create_token(user_id, db_user["role"])

    return TokenResponse(
        access_token=token,
        user_id=user_id,
        role=db_user["role"],
        name=db_user["name"]
    )


@app.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    user = await users_col.find_one(
        {"_id": ObjectId(current_user["user_id"])}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user = str_id(user)
    user.pop("password", None)
    return user

# ─── CASE ROUTES ────────────────────────────────────────

@app.post("/case/create")
async def create_case(data: CaseCreate):
    case_doc = {
        "patient_id": data.patient_id,
        "symptoms": data.symptoms,
        "age": data.age,
        "gender": data.gender,
        "location": data.location,
        "voice_transcript": None,
        "report_findings": [],
        "face_markers": [],
        "predictions": [],
        "status": "in_progress",
        "created_at": datetime.utcnow().isoformat()
    }
    result = await cases_col.insert_one(case_doc)
    return {"case_id": str(result.inserted_id), "status": "created"}


@app.get("/case/{case_id}")
async def get_case(case_id: str):
    case = await cases_col.find_one({"_id": ObjectId(case_id)})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return str_id(case)


@app.patch("/case/{case_id}")
async def update_case(case_id: str, data: CaseUpdate):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    await cases_col.update_one(
        {"_id": ObjectId(case_id)},
        {"$set": update_data}
    )
    return {"status": "updated"}

# ─── AI — VOICE ROUTE ───────────────────────────────────

@app.post("/ai/voice")
async def analyze_voice(
    case_id: str = Form(...),
    audio_file: UploadFile = File(...)
):
    temp_path = f"temp_{audio_file.filename}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(audio_file.file, f)

    try:
        whisper = get_whisper()
        if whisper is None:
            raise HTTPException(
                status_code=503,
                detail="Whisper model not available"
            )

        result = whisper.transcribe(temp_path)
        transcript = result["text"]
        language = result.get("language", "unknown")

        symptoms = extract_symptoms_from_text(transcript)

        await cases_col.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": {
                "voice_transcript": transcript,
                "symptoms": symptoms
            }}
        )

        return VoiceResponse(
            transcript=transcript,
            symptoms=symptoms,
            language_detected=language,
            case_id=case_id
        )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def extract_symptoms_from_text(text: str) -> List[str]:
    text_lower = text.lower()

    symptom_keywords = [
        "tremor", "shaking", "liver", "fatigue", "pain",
        "swelling", "rash", "vision", "hearing", "muscle",
        "weakness", "breathing", "heart", "kidney", "joint",
        "bone", "skin", "eye", "speech", "walking", "memory",
        "seizure", "fever", "nausea", "vomiting", "bleeding",
        "bruising", "yellowing", "jaundice", "spleen", "anemia",
        "numbness", "tingling", "balance", "coordination",
        "swallowing", "weight loss", "growth", "developmental"
    ]

    found = []
    for symptom in symptom_keywords:
        if symptom in text_lower:
            found.append(symptom)

    return found

# ─── AI — REPORT ROUTE ──────────────────────────────────

@app.post("/ai/report")
async def analyze_report(
    case_id: str = Form(...),
    report_file: UploadFile = File(...)
):
    temp_path = f"temp_{report_file.filename}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(report_file.file, f)

    try:
        text = extract_text_from_file(temp_path, report_file.filename)

        findings = []
        flagged_values = []
        disease_signals = []

        medical_rules = {
            "ceruloplasmin": ("low", "Wilson's Disease"),
            "copper": ("high", "Wilson's Disease"),
            "glucocerebrosidase": ("low", "Gaucher Disease"),
            "beta glucosidase": ("low", "Gaucher Disease"),
            "ferritin": ("high", "Gaucher Disease"),
            "alpha galactosidase": ("low", "Fabry Disease"),
            "acid maltase": ("low", "Pompe Disease"),
            "ammonia": ("high", "Urea Cycle Disorder"),
            "phenylalanine": ("high", "Phenylketonuria"),
            "tsh": ("abnormal", "Thyroid Disorder"),
            "hemoglobin": ("low", "Anemia related rare disease"),
            "creatinine": ("high", "Kidney related rare disease"),
            "ldh": ("high", "Gaucher Disease"),
            "alkaline phosphatase": ("high", "Wilson's Disease"),
        }

        text_lower = text.lower()

        for marker, (status, signal) in medical_rules.items():
            if marker in text_lower:
                finding = ReportFinding(
                    finding=marker,
                    status=status,
                    signal=signal
                )
                findings.append(finding)
                flagged_values.append(f"{marker} — {status}")
                if signal not in disease_signals:
                    disease_signals.append(signal)

        if biobert_pipeline:
            try:
                bio_result = biobert_pipeline(
                    text[:512],
                    top_k=3
                )
                for r in bio_result:
                    label_idx = int(r["label"].split("_")[-1])
                    disease_name = label_encoder.classes_[label_idx]
                    if disease_name not in disease_signals:
                        disease_signals.append(disease_name)
            except Exception as e:
                print(f"BioBERT inference error: {e}")

        await cases_col.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": {
                "report_findings": [f.dict() for f in findings],
                "disease_signals_from_report": disease_signals
            }}
        )

        return ReportResponse(
            findings=findings,
            flagged_values=flagged_values,
            disease_signals=disease_signals,
            case_id=case_id
        )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def extract_text_from_file(filepath: str, filename: str) -> str:
    text = ""
    try:
        if filename.lower().endswith(".pdf"):
            try:
                import pdfplumber
                with pdfplumber.open(filepath) as pdf:
                    for page in pdf.pages:
                        text += page.extract_text() or ""
            except ImportError:
                try:
                    import fitz
                    doc = fitz.open(filepath)
                    for page in doc:
                        text += page.get_text()
                except ImportError:
                    text = "PDF text extraction library not available"
        else:
            try:
                import pytesseract
                from PIL import Image
                img = Image.open(filepath)
                text = pytesseract.image_to_string(img)
            except Exception:
                text = "Image text extraction not available"
    except Exception as e:
        text = f"Could not extract text: {e}"

    return text

# ─── AI — FACE ROUTE ────────────────────────────────────

@app.post("/ai/face")
async def analyze_face(
    case_id: str = Form(...),
    image_file: UploadFile = File(...)
):
    temp_path = f"temp_{image_file.filename}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(image_file.file, f)

    try:
        from PIL import Image
        import json

        img = Image.open(temp_path).resize((224, 224))
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0).astype(np.float32)

        condition = "Unknown"
        confidence = 0.0
        disease_signal = "No signal detected"

        if face_interpreter is not None:
            input_details = face_interpreter.get_input_details()
            output_details = face_interpreter.get_output_details()

            face_interpreter.set_tensor(
                input_details[0]["index"], img_array
            )
            face_interpreter.invoke()

            output = face_interpreter.get_tensor(
                output_details[0]["index"]
            )[0]

            predicted_idx = int(np.argmax(output))
            confidence = round(float(output[predicted_idx]) * 100, 2)

            try:
                with open("models_saved/face_class_labels.json") as f:
                    class_labels = json.load(f)
                condition = class_labels.get(str(predicted_idx), "Unknown")
            except Exception:
                condition = f"Class_{predicted_idx}"

            skin_to_rare = {
                "mel": "Possible Melanoma — check for rare skin conditions",
                "bkl": "Benign Keratosis — monitor for rare dermatological conditions",
                "bcc": "Basal Cell Carcinoma signal detected",
                "akiec": "Actinic Keratosis — possible rare skin disorder",
                "vasc": "Vascular Lesion — possible rare vascular disorder",
                "df": "Dermatofibroma detected",
                "nv": "Melanocytic Nevi — low risk signal"
            }
            disease_signal = skin_to_rare.get(
                condition.lower(),
                "Unclassified skin marker detected"
            )

        markers = [condition] if condition != "Unknown" else []

        await cases_col.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": {
                "face_markers": markers,
                "face_condition": condition,
                "face_confidence": confidence
            }}
        )

        return FaceResponse(
            condition=condition,
            confidence=confidence,
            disease_signal=disease_signal,
            markers_detected=markers,
            case_id=case_id
        )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# ─── AI — PREDICT ROUTE ─────────────────────────────────

@app.post("/ai/predict")
async def predict_disease(data: PredictRequest):
    case = await cases_col.find_one({"_id": ObjectId(data.case_id)})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    all_symptoms = list(set(
        data.symptoms +
        case.get("symptoms", []) +
        [f["finding"] for f in case.get("report_findings", [])] +
        case.get("face_markers", [])
    ))

    predictions = []

    if xgb_model is not None and symptom_columns is not None:
        row = {s: 0 for s in symptom_columns}
        for s in all_symptoms:
            s_lower = s.lower()
            if s_lower in row:
                row[s_lower] = 1

        input_df = pd.DataFrame([row])
        probs = xgb_model.predict_proba(input_df)[0]
        top3_idx = np.argsort(probs)[-3:][::-1]

        for idx in top3_idx:
            disease_name = label_encoder.classes_[idx]
            confidence = round(float(probs[idx]) * 100, 2)

            matched = [
                s for s in all_symptoms
                if s.lower() in symptom_columns and row.get(s.lower(), 0) == 1
            ]

            predictions.append(PredictionResult(
                disease=disease_name,
                confidence=confidence,
                matched_symptoms=matched,
                orpha_code=None
            ))
    else:
        predictions.append(PredictionResult(
            disease="Model not loaded — run notebooks first",
            confidence=0.0,
            matched_symptoms=[],
            orpha_code=None
        ))

    top_disease = predictions[0].disease if predictions else "Unknown"

    await cases_col.update_one(
        {"_id": ObjectId(data.case_id)},
        {"$set": {
            "predictions": [p.dict() for p in predictions],
            "top_disease": top_disease,
            "status": "predicted"
        }}
    )

    return PredictResponse(
        predictions=predictions,
        top_disease=top_disease,
        case_id=data.case_id,
        all_inputs_used={
            "voice_used": case.get("voice_transcript") is not None,
            "report_used": len(case.get("report_findings", [])) > 0,
            "face_used": len(case.get("face_markers", [])) > 0,
            "manual_symptoms": len(data.symptoms)
        }
    )

# ─── MATCH ROUTES ───────────────────────────────────────

@app.get("/match/all/{case_id}")
async def get_all_matches(case_id: str):
    case = await cases_col.find_one({"_id": ObjectId(case_id)})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    top_disease = case.get("top_disease", "")

    # Match doctors
    doctor_cursor = users_col.find({
        "role": "doctor",
        "diseases_treated": {
            "$regex": top_disease[:10],
            "$options": "i"
        }
    }).limit(5)
    doctors_raw = await doctor_cursor.to_list(length=5)

    if not doctors_raw:
        doctor_cursor = users_col.find({"role": "doctor"}).limit(5)
        doctors_raw = await doctor_cursor.to_list(length=5)

    doctors = [
        DoctorMatch(
            doctor_id=str(d["_id"]),
            name=d.get("name", ""),
            specialization=d.get("specialization", "General"),
            hospital=d.get("hospital", ""),
            cases_treated=d.get("cases_treated", 0),
            success_rate=d.get("success_rate", 0.0),
            location=d.get("location", ""),
            available_for_teleconsult=d.get(
                "available_for_teleconsult", True
            )
        )
        for d in doctors_raw
    ]

    # Match patients
    patient_cursor = cases_col.find({
        "top_disease": top_disease,
        "_id": {"$ne": ObjectId(case_id)}
    }).limit(5)
    patients_raw = await patient_cursor.to_list(length=5)

    patients = []
    for p in patients_raw:
        patient_user = await users_col.find_one(
            {"_id": ObjectId(p["patient_id"])}
        )
        if patient_user:
            patients.append(PatientMatch(
                patient_id=p["patient_id"],
                name=patient_user.get("name", "Anonymous"),
                disease=top_disease,
                location=patient_user.get("location", ""),
                willing_to_connect=True
            ))

    # Match trials
    trial_cursor = trials_col.find({
        "$or": [
            {"disease": {"$regex": top_disease[:10], "$options": "i"}},
            {"disease": "All rare diseases"}
        ]
    }).limit(3)
    trials_raw = await trial_cursor.to_list(length=3)

    trials = [
        TrialMatch(
            trial_id=t.get("trial_id", str(t["_id"])),
            title=t.get("title", ""),
            disease=t.get("disease", ""),
            location=t.get("location", ""),
            eligibility=t.get("eligibility", ""),
            benefit=t.get("benefit", ""),
            contact=t.get("contact", ""),
            status=t.get("status", "active")
        )
        for t in trials_raw
    ]

    # Match aid
    aid_cursor = aid_col.find({
        "$or": [
            {"covers": {"$regex": top_disease[:10], "$options": "i"}},
            {"covers": "All rare diseases"}
        ]
    }).limit(4)
    aid_raw = await aid_cursor.to_list(length=4)

    aid = [
        AidMatch(
            aid_id=a.get("aid_id", str(a["_id"])),
            name=a.get("name", ""),
            covers=a.get("covers", []),
            max_amount=a.get("max_amount", ""),
            eligibility=a.get("eligibility", ""),
            contact=a.get("contact", ""),
            type=a.get("type", "")
        )
        for a in aid_raw
    ]

    return MatchResult(
        doctors=doctors,
        patients=patients,
        trials=trials,
        aid=aid,
        disease_matched=top_disease,
        case_id=case_id
    )

# ─── BOOKING ROUTES ─────────────────────────────────────

@app.post("/booking/create")
async def create_booking(data: BookingCreate):
    existing = await bookings_col.find_one({
        "doctor_id": data.doctor_id,
        "slot": data.slot,
        "status": "pending"
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This slot is already booked"
        )

    booking_doc = {
        "patient_id": data.patient_id,
        "doctor_id": data.doctor_id,
        "case_id": data.case_id,
        "slot": data.slot,
        "notes": data.notes,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }

    result = await bookings_col.insert_one(booking_doc)
    booking_id = str(result.inserted_id)

    return BookingResponse(
        booking_id=booking_id,
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        case_id=data.case_id,
        slot=data.slot,
        status="pending",
        created_at=datetime.utcnow().isoformat()
    )


@app.get("/booking/patient/{patient_id}")
async def get_patient_bookings(patient_id: str):
    cursor = bookings_col.find({"patient_id": patient_id})
    bookings = await cursor.to_list(length=50)
    return [str_id(b) for b in bookings]


@app.get("/booking/doctor/{doctor_id}")
async def get_doctor_bookings(doctor_id: str):
    cursor = bookings_col.find({"doctor_id": doctor_id})
    bookings = await cursor.to_list(length=50)
    result = []
    for b in bookings:
        patient = await users_col.find_one(
            {"_id": ObjectId(b["patient_id"])}
        )
        b["patient_name"] = patient.get("name", "") if patient else ""
        b["patient_age"] = patient.get("age", "") if patient else ""
        result.append(str_id(b))
    return result


@app.get("/booking/{booking_id}/full-report")
async def get_full_report(booking_id: str):
    booking = await bookings_col.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    case = await cases_col.find_one(
        {"_id": ObjectId(booking["case_id"])}
    )
    patient = await users_col.find_one(
        {"_id": ObjectId(booking["patient_id"])}
    )

    if patient:
        patient.pop("password", None)

    return {
        "booking": str_id(booking),
        "patient": str_id(patient) if patient else {},
        "case": str_id(case) if case else {}
    }

# ─── DOCTOR ROUTES ──────────────────────────────────────

@app.post("/doctor/confirm")
async def confirm_diagnosis(data: DiagnosisConfirm):
    booking = await bookings_col.find_one(
        {"_id": ObjectId(data.booking_id)}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    await bookings_col.update_one(
        {"_id": ObjectId(data.booking_id)},
        {"$set": {
            "status": "confirmed",
            "confirmed_disease": data.confirmed_disease,
            "ai_was_correct": data.ai_was_correct,
            "confidence_in_diagnosis": data.confidence_in_diagnosis,
            "doctor_notes": data.notes,
            "confirmed_at": datetime.utcnow().isoformat()
        }}
    )

    await cases_col.update_one(
        {"_id": ObjectId(booking["case_id"])},
        {"$set": {
            "confirmed_disease": data.confirmed_disease,
            "doctor_confirmed": True,
            "status": "confirmed"
        }}
    )

    await users_col.update_one(
        {"_id": ObjectId(booking["doctor_id"])},
        {"$inc": {"cases_treated": 1}}
    )

    return {"status": "confirmed", "disease": data.confirmed_disease}


@app.post("/doctor/notes")
async def add_doctor_notes(data: DoctorNotes):
    await bookings_col.update_one(
        {"_id": ObjectId(data.booking_id)},
        {"$set": {
            "treatment_plan": data.treatment_plan,
            "follow_up_date": data.follow_up_date,
            "clinical_notes": data.clinical_notes,
            "medications": data.medications,
            "notes_added_at": datetime.utcnow().isoformat()
        }}
    )
    return {"status": "notes saved"}


@app.get("/doctor/analytics/{doctor_id}")
async def get_doctor_analytics(doctor_id: str):
    total = await bookings_col.count_documents({"doctor_id": doctor_id})
    confirmed = await bookings_col.count_documents({
        "doctor_id": doctor_id,
        "status": "confirmed"
    })
    ai_correct = await bookings_col.count_documents({
        "doctor_id": doctor_id,
        "ai_was_correct": True
    })

    cursor = bookings_col.find({
        "doctor_id": doctor_id,
        "confirmed_disease": {"$exists": True}
    })
    bookings = await cursor.to_list(length=100)
    diseases = list(set([
        b.get("confirmed_disease", "")
        for b in bookings
        if b.get("confirmed_disease")
    ]))

    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1).isoformat()
    this_month = await bookings_col.count_documents({
        "doctor_id": doctor_id,
        "created_at": {"$gte": month_start}
    })

    ai_accuracy = round((ai_correct / confirmed * 100), 2) if confirmed > 0 else 0.0

    return DoctorAnalytics(
        doctor_id=doctor_id,
        total_cases=total,
        confirmed_correct=confirmed,
        ai_accuracy_rate=ai_accuracy,
        diseases_treated=diseases,
        cases_this_month=this_month
    )

# ─── NGO ROUTES ─────────────────────────────────────────

@app.post("/ngo/apply")
async def apply_for_aid(data: AidApplication):
    application_doc = {
        "patient_id": data.patient_id,
        "aid_id": data.aid_id,
        "disease": data.disease,
        "confirmed_by_doctor": data.confirmed_by_doctor,
        "monthly_income": data.monthly_income,
        "message": data.message,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }
    result = await applications_col.insert_one(application_doc)
    return {"application_id": str(result.inserted_id), "status": "pending"}


@app.get("/ngo/applications")
async def get_all_applications():
    cursor = applications_col.find({})
    applications = await cursor.to_list(length=100)
    result = []
    for app in applications:
        patient = await users_col.find_one(
            {"_id": ObjectId(app["patient_id"])}
        )
        app["patient_name"] = patient.get("name", "") if patient else ""
        result.append(str_id(app))
    return result


@app.patch("/ngo/approve/{application_id}")
async def approve_aid(application_id: str, data: AidApproval):
    await applications_col.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": {
            "status": data.status,
            "amount_approved": data.amount_approved,
            "notes": data.notes,
            "next_steps": data.next_steps,
            "reviewed_at": datetime.utcnow().isoformat()
        }}
    )
    return {"status": data.status}

# ─── COMMUNITY ROUTES ───────────────────────────────────

@app.post("/community/post")
async def create_post(data: CommunityPost):
    post_doc = {
        "patient_id": data.patient_id,
        "disease": data.disease,
        "title": data.title,
        "content": data.content,
        "willing_to_connect": data.willing_to_connect,
        "responses": [],
        "created_at": datetime.utcnow().isoformat()
    }
    result = await community_col.insert_one(post_doc)
    return {"post_id": str(result.inserted_id)}


@app.get("/community/disease/{disease_name}")
async def get_community_posts(disease_name: str):
    cursor = community_col.find({
        "disease": {"$regex": disease_name, "$options": "i"}
    }).limit(20)
    posts = await cursor.to_list(length=20)
    return [str_id(p) for p in posts]


@app.get("/community/all")
async def get_all_posts():
    cursor = community_col.find({}).sort(
        "created_at", -1
    ).limit(50)
    posts = await cursor.to_list(length=50)
    return [str_id(p) for p in posts]

# ─── JOURNEY ROUTES ─────────────────────────────────────

@app.post("/journey/update")
async def update_journey(data: JourneyUpdate):
    milestone_doc = {
        "milestone": data.milestone,
        "note": data.note,
        "date": data.date or datetime.utcnow().isoformat()
    }

    existing = await cases_col.find_one({"patient_id": data.patient_id})
    if not existing:
        raise HTTPException(status_code=404, detail="No case found")

    await cases_col.update_one(
        {"patient_id": data.patient_id},
        {"$push": {"journey": milestone_doc},
         "$set": {"current_stage": data.milestone}}
    )
    return {"status": "journey updated"}


@app.get("/journey/{patient_id}")
async def get_journey(patient_id: str):
    case = await cases_col.find_one({"patient_id": patient_id})
    if not case:
        raise HTTPException(status_code=404, detail="No case found")

    created_at = case.get("created_at", datetime.utcnow().isoformat())
    start = datetime.fromisoformat(created_at)
    days = (datetime.utcnow() - start).days

    return JourneyResponse(
        patient_id=patient_id,
        milestones=case.get("journey", []),
        current_stage=case.get("current_stage", "case_created"),
        days_since_start=days
    )

# ─── HEALTH CHECK ───────────────────────────────────────

@app.get("/")
async def root():
    return {
        "status": "OrphanCure API running",
        "models": {
            "xgboost": xgb_model is not None,
            "biobert": biobert_pipeline is not None,
            "face": face_interpreter is not None
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
