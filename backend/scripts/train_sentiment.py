import os
import re
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline

from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

# ------------------------------------------------
# PATHS
# ------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_PATH = os.path.join(BASE_DIR, "data", "Reviews_Sample.xlsx")

MODEL_DIR = os.path.join(BASE_DIR, "models", "sentiment")

os.makedirs(MODEL_DIR, exist_ok=True)


# ------------------------------------------------
# LOAD DATASET
# ------------------------------------------------

print("\nLoading Amazon Fine Food Reviews dataset...")

df = pd.read_excel(DATA_PATH)

print("Dataset loaded successfully!")
print("Total records:", len(df))


# ------------------------------------------------
# DATA CLEANING
# ------------------------------------------------

df = df.dropna(subset=["Score", "Text"]).copy()

df["Summary"] = df["Summary"].fillna("")

df["Score"] = pd.to_numeric(df["Score"], errors="coerce")

df = df.dropna(subset=["Score"])

df = df[df["Score"].isin([1, 2, 3, 4, 5])]

# Combine review summary and full text
df["review"] = df["Summary"].astype(str) + " " + df["Text"].astype(str)

# Convert ratings into sentiment categories
def get_sentiment(score):
    if score <= 2:
        return "Negative"
    elif score == 3:
        return "Neutral"
    else:
        return "Positive"

df["sentiment"] = df["Score"].apply(get_sentiment)

# Remove empty reviews
df = df[df["review"].str.strip() != ""]

print("\nSentiment distribution:")
print(df["sentiment"].value_counts())


# ------------------------------------------------
# FEATURES AND TARGET
# ------------------------------------------------

X = df["review"]
y = df["sentiment"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nTraining records:", len(X_train))
print("Testing records:", len(X_test))


# ------------------------------------------------
# DEFINE THREE ALGORITHMS
# ------------------------------------------------

models = {
    "Naive Bayes": MultinomialNB(),

    "Logistic Regression": LogisticRegression(
        max_iter=1000,
        class_weight="balanced"
    ),

    "SVM": LinearSVC(
        class_weight="balanced",
        max_iter=3000
    )
}


# ------------------------------------------------
# TRAIN AND EVALUATE
# ------------------------------------------------

results = []

for name, algorithm in models.items():

    print("\n===================================")
    print("Training:", name)
    print("===================================")

    pipeline = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                max_features=20000,
                ngram_range=(1, 2),
                stop_words="english",
                min_df=2
            )
        ),
        ("classifier", algorithm)
    ])

    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    print("\nAccuracy:", round(accuracy * 100, 2), "%")

    print("\nClassification Report:")
    print(classification_report(
        y_test,
        predictions,
        zero_division=0
    ))

    print("\nConfusion Matrix:")
    print(confusion_matrix(
        y_test,
        predictions,
        labels=["Negative", "Neutral", "Positive"]
    ))

    # Save trained model
    filename = name.lower().replace(" ", "_") + ".joblib"

    model_path = os.path.join(MODEL_DIR, filename)

    joblib.dump(pipeline, model_path)

    print("\nModel saved:", model_path)

    results.append({
        "Algorithm": name,
        "Accuracy": round(accuracy * 100, 2)
    })


# ------------------------------------------------
# SAVE COMPARISON
# ------------------------------------------------

results_df = pd.DataFrame(results)

results_df.to_csv(
    os.path.join(MODEL_DIR, "model_comparison.csv"),
    index=False
)

print("\n===================================")
print("MODEL PERFORMANCE COMPARISON")
print("===================================")

print(results_df.to_string(index=False))

print("\nAll three models trained successfully!")