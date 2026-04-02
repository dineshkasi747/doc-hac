import os
import joblib
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import numpy as np

load_dotenv()

# ─── DATABASE ───────────────────────────────────────────

MONGO_URL = os.getenv("MONGO_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "orphancure")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DATABASE_NAME]

# Collections
users_col = db["users"]
cases_col = db["cases"]
bookings_col = db["bookings"]
diseases_col = db["diseases"]
doctors_col = db["doctors"]
trials_col = db["trials"]
aid_col = db["aid"]
applications_col = db["applications"]
community_col = db["community"]

# ─── JWT ────────────────────────────────────────────────

JWT_SECRET = os.getenv("JWT_SECRET", "orphancure_secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 10080))

# ─── MODEL PATHS ────────────────────────────────────────

XGB_MODEL_PATH = "models_saved/xgb_model.pkl"
LABEL_ENCODER_PATH = "models_saved/label_encoder.pkl"
SYMPTOM_COLUMNS_PATH = "models_saved/symptom_columns.pkl"
BIOBERT_PATH = "models_saved/biobert_finetuned"
FACE_MODEL_PATH = "models_saved/face_model.tflite"

# ─── LOAD AI MODELS ─────────────────────────────────────

xgb_model = None
label_encoder = None
symptom_columns = None
biobert_pipeline = None
face_interpreter = None

def load_models():
    global xgb_model, label_encoder, symptom_columns
    global biobert_pipeline, face_interpreter

    # Load XGBoost
    try:
        xgb_model = joblib.load(XGB_MODEL_PATH)
        label_encoder = joblib.load(LABEL_ENCODER_PATH)
        symptom_columns = joblib.load(SYMPTOM_COLUMNS_PATH)
        print("XGBoost model loaded successfully")
    except Exception as e:
        print(f"XGBoost load failed: {e}")

    # Load BioBERT
    try:
        from transformers import pipeline
        biobert_pipeline = pipeline(
            "text-classification",
            model=BIOBERT_PATH,
            top_k=3
        )
        print("BioBERT model loaded successfully")
    except Exception as e:
        print(f"BioBERT load failed: {e}")

    # Load MobileNet TFLite
    try:
        import tensorflow as tf
        face_interpreter = tf.lite.Interpreter(model_path=FACE_MODEL_PATH)
        face_interpreter.allocate_tensors()
        print("Face model loaded successfully")
    except Exception as e:
        print(f"Face model load failed: {e}")

# Load Whisper separately (heavy, load on first use)
whisper_model = None

def get_whisper():
    global whisper_model
    if whisper_model is None:
        try:
            import whisper
            whisper_model = whisper.load_model("base")
            print("Whisper model loaded successfully")
        except Exception as e:
            print(f"Whisper load failed: {e}")
    return whisper_model