from datetime import datetime, timezone
from pathlib import Path
import os
import joblib

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from .ml import infer, MODELS, FEATURES
from .database import save_record, get_history


load_dotenv()

app = FastAPI(
    title="SupplyChain AI API",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# -----------------------------------------
# EXISTING SPOILAGE PREDICTION INPUT
# -----------------------------------------

class PredictionInput(BaseModel):
    product: str = Field(default="Mango", min_length=1, max_length=60)

    temperature_c: float = Field(ge=-30, le=60)
    humidity_pct: float = Field(ge=0, le=100)
    co2_ppm: float = Field(ge=0, le=100000)

    days_in_storage: float = Field(ge=0, le=365)

    initial_shelf_life_days: float = Field(
        default=14,
        ge=0.1,
        le=365
    )

    transport_hours: float = Field(ge=0, le=1000)


# -----------------------------------------
# NEW SENTIMENT ANALYSIS INPUT
# -----------------------------------------

class ReviewInput(BaseModel):
    review: str = Field(
        min_length=3,
        max_length=10000
    )


# -----------------------------------------
# LOAD TRAINED NLP MODELS
# -----------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

SENTIMENT_MODEL_DIR = (
    BASE_DIR / "models" / "sentiment"
)

SENTIMENT_MODELS = {
    "Naive Bayes": "naive_bayes.joblib",
    "Logistic Regression": "logistic_regression.joblib",
    "SVM": "svm.joblib"
}


def load_sentiment_models():

    loaded_models = {}

    for name, filename in SENTIMENT_MODELS.items():

        model_path = SENTIMENT_MODEL_DIR / filename

        if model_path.exists():

            loaded_models[name] = joblib.load(model_path)

    return loaded_models


# Load models once when the backend starts
sentiment_models = load_sentiment_models()


# -----------------------------------------
# HEALTH CHECK
# -----------------------------------------

@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "service": "SupplyChain AI",
        "time": datetime.now(timezone.utc).isoformat()
    }


# -----------------------------------------
# EXISTING MODEL INFORMATION
# -----------------------------------------

@app.get("/api/model-info")
def model_info():

    return {
        "algorithms": list(MODELS.keys()),
        "features": FEATURES,
        "training_data": "synthetic demonstration data",
        "validated_for_food_safety": False
    }


# -----------------------------------------
# EXISTING SPOILAGE PREDICTION
# -----------------------------------------

@app.post("/api/predict")
def predict(data: PredictionInput):

    values = data.model_dump()

    result = infer(values)

    record = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "product": data.product,
        **values,
        **result
    }

    storage = save_record(record)

    return {
        **result,
        "product": data.product,
        "storage": storage,
        "notice": (
            "Demonstration estimate only; "
            "not validated for food-safety decisions."
        )
    }


# -----------------------------------------
# NEW TEXT SENTIMENT ANALYSIS
# -----------------------------------------

@app.post("/api/sentiment/analyze")
def analyze_sentiment(data: ReviewInput):

    if not sentiment_models:

        raise HTTPException(
            status_code=503,
            detail=(
                "Sentiment models not found. "
                "Run train_sentiment.py first."
            )
        )

    review = data.review.strip()

    if not review:

        raise HTTPException(
            status_code=400,
            detail="Review cannot be empty."
        )

    predictions = {}

    for name, model in sentiment_models.items():

        prediction = model.predict([review])[0]

        confidence = None

        # Naive Bayes and Logistic Regression
        if hasattr(model, "predict_proba"):

            probabilities = model.predict_proba([review])[0]

            confidence = round(
                float(max(probabilities)) * 100,
                2
            )

        predictions[name] = {
            "sentiment": str(prediction),
            "confidence": confidence
        }

    # Majority voting
    votes = [
        result["sentiment"]
        for result in predictions.values()
    ]

    from collections import Counter

    counts = Counter(votes)

    final_sentiment = counts.most_common(1)[0][0]

    return {
        "review": review,
        "final_sentiment": final_sentiment,
        "predictions": predictions,
        "models_loaded": len(sentiment_models),
        "notice": (
            "Sentiment analysis represents customer feedback. "
            "It does not establish actual food spoilage."
        )
    }


# -----------------------------------------
# EXISTING HISTORY
# -----------------------------------------

@app.get("/api/history")
def history():

    return {
        "items": get_history()
    }