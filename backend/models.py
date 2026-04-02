from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ─── AUTH ───────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # "patient", "doctor", "ngo"
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None        # doctors only
    diseases_treated: Optional[List[str]] = []  # doctors only
    hospital: Optional[str] = None              # doctors only
    ngo_name: Optional[str] = None              # ngo only
    ngo_focus: Optional[List[str]] = []         # ngo only


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    user_id: str
    role: str
    name: str


# ─── CASE ───────────────────────────────────────────────

class CaseCreate(BaseModel):
    patient_id: str
    symptoms: Optional[List[str]] = []
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[str] = None


class CaseUpdate(BaseModel):
    symptoms: Optional[List[str]] = None
    voice_transcript: Optional[str] = None
    report_findings: Optional[List[dict]] = None
    face_markers: Optional[List[str]] = None
    predictions: Optional[List[dict]] = None


class CaseResponse(BaseModel):
    case_id: str
    patient_id: str
    status: str
    created_at: str


# ─── AI — VOICE ─────────────────────────────────────────

class VoiceResponse(BaseModel):
    transcript: str
    symptoms: List[str]
    language_detected: str
    case_id: str


# ─── AI — REPORT ────────────────────────────────────────

class ReportFinding(BaseModel):
    finding: str
    value: Optional[str] = None
    status: str   # "normal", "low", "high", "abnormal"
    signal: Optional[str] = None


class ReportResponse(BaseModel):
    findings: List[ReportFinding]
    flagged_values: List[str]
    disease_signals: List[str]
    case_id: str


# ─── AI — FACE ──────────────────────────────────────────

class FaceResponse(BaseModel):
    condition: str
    confidence: float
    disease_signal: str
    markers_detected: List[str]
    case_id: str


# ─── AI — PREDICT ───────────────────────────────────────

class PredictRequest(BaseModel):
    case_id: str
    symptoms: Optional[List[str]] = []


class PredictionResult(BaseModel):
    disease: str
    confidence: float
    matched_symptoms: List[str]
    orpha_code: Optional[str] = None


class PredictResponse(BaseModel):
    predictions: List[PredictionResult]
    top_disease: str
    case_id: str
    all_inputs_used: dict   # shows voice + report + face were used


# ─── MATCH ──────────────────────────────────────────────

class DoctorMatch(BaseModel):
    doctor_id: str
    name: str
    specialization: str
    hospital: str
    cases_treated: int
    success_rate: float
    location: str
    available_for_teleconsult: bool


class PatientMatch(BaseModel):
    patient_id: str
    name: str
    disease: str
    location: str
    willing_to_connect: bool


class TrialMatch(BaseModel):
    trial_id: str
    title: str
    disease: str
    location: str
    eligibility: str
    benefit: str
    contact: str
    status: str


class AidMatch(BaseModel):
    aid_id: str
    name: str
    covers: List[str]
    max_amount: str
    eligibility: str
    contact: str
    type: str


class MatchResult(BaseModel):
    doctors: List[DoctorMatch]
    patients: List[PatientMatch]
    trials: List[TrialMatch]
    aid: List[AidMatch]
    disease_matched: str
    case_id: str


# ─── BOOKING ────────────────────────────────────────────

class BookingCreate(BaseModel):
    patient_id: str
    doctor_id: str
    case_id: str
    slot: str
    notes: Optional[str] = None


class BookingResponse(BaseModel):
    booking_id: str
    patient_id: str
    doctor_id: str
    case_id: str
    slot: str
    status: str
    created_at: str


class BookingFullReport(BaseModel):
    booking: dict
    patient: dict
    case: dict


# ─── DOCTOR ─────────────────────────────────────────────

class DoctorNotes(BaseModel):
    booking_id: str
    confirmed_disease: str
    treatment_plan: str
    follow_up_date: Optional[str] = None
    clinical_notes: Optional[str] = None
    medications: Optional[List[str]] = []


class DiagnosisConfirm(BaseModel):
    booking_id: str
    confirmed_disease: str
    ai_was_correct: bool
    confidence_in_diagnosis: Optional[str] = None  # "high", "medium", "low"
    notes: Optional[str] = None


class DoctorAnalytics(BaseModel):
    doctor_id: str
    total_cases: int
    confirmed_correct: int
    ai_accuracy_rate: float
    diseases_treated: List[str]
    cases_this_month: int


# ─── NGO ────────────────────────────────────────────────

class AidApplication(BaseModel):
    patient_id: str
    aid_id: str
    disease: str
    confirmed_by_doctor: Optional[str] = None   # doctor_id
    monthly_income: Optional[str] = None
    message: Optional[str] = None


class AidApproval(BaseModel):
    application_id: str
    status: str   # "approved", "rejected", "pending_docs"
    amount_approved: Optional[str] = None
    notes: Optional[str] = None
    next_steps: Optional[str] = None


# ─── COMMUNITY ──────────────────────────────────────────

class CommunityPost(BaseModel):
    patient_id: str
    disease: str
    title: str
    content: str
    willing_to_connect: bool = True


class CommunityResponse(BaseModel):
    post_id: str
    patient_id: str
    disease: str
    title: str
    content: str
    created_at: str
    responses: Optional[List[dict]] = []


# ─── JOURNEY ────────────────────────────────────────────

class JourneyUpdate(BaseModel):
    patient_id: str
    milestone: str   # "case_created", "diagnosed", "doctor_matched",
                     # "trial_enrolled", "treatment_started", "improved"
    note: Optional[str] = None
    date: Optional[str] = None


class JourneyResponse(BaseModel):
    patient_id: str
    milestones: List[dict]
    current_stage: str
    days_since_start: int