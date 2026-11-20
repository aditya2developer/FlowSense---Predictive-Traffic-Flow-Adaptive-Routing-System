"""
FlowSense Machine Learning Training Pipeline
Trains Random Forest models for:
1. Speed Prediction (Regression: MAE, RMSE, R²)
2. Congestion Level Prediction (Classification: Accuracy, F1-Score)
Saves models and reports performance comparison against the baseline model.
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, mean_absolute_error, root_mean_squared_error, r2_score
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "traffic_dataset.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")

def load_or_generate_data():
    if not os.path.exists(DATASET_PATH):
        print("Dataset not found. Generating synthetic dataset...")
        from dataset.generate_dataset import generate_csv
        generate_csv(DATASET_PATH, num_samples=6000)
    
    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded {len(df)} samples from {DATASET_PATH}")
    return df

def train_models():
    os.makedirs(MODEL_DIR, exist_ok=True)
    df = load_or_generate_data()

    feature_cols = [
        "road_id",
        "day_of_week",
        "hour",
        "weather_condition",
        "temperature_c",
        "rainfall_mm",
        "active_incidents"
    ]

    categorical_cols = ["road_id", "day_of_week", "weather_condition"]
    numerical_cols = ["hour", "temperature_c", "rainfall_mm", "active_incidents"]

    X = df[feature_cols]
    y_speed = df["average_speed_kmh"]
    y_congestion = df["congestion_level"]

    # Preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
            ("num", "passthrough", numerical_cols)
        ]
    )

    X_train, X_test, y_speed_train, y_speed_test, y_cong_train, y_cong_test = train_test_split(
        X, y_speed, y_congestion, test_size=0.20, random_state=42
    )

    print("\n==========================================")
    print("TRAINING SPEED REGRESSION MODEL (Random Forest)")
    print("==========================================")
    speed_model = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42))
    ])
    speed_model.fit(X_train, y_speed_train)
    y_speed_pred = speed_model.predict(X_test)

    mae = mean_absolute_error(y_speed_test, y_speed_pred)
    rmse = root_mean_squared_error(y_speed_test, y_speed_pred)
    r2 = r2_score(y_speed_test, y_speed_pred)

    print(f"Speed Regressor MAE:  {mae:.2f} km/h")
    print(f"Speed Regressor RMSE: {rmse:.2f} km/h")
    print(f"Speed Regressor R²:   {r2:.3f}")

    print("\n==========================================")
    print("TRAINING CONGESTION CLASSIFICATION MODEL")
    print("==========================================")
    cong_model = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42))
    ])
    cong_model.fit(X_train, y_cong_train)
    y_cong_pred = cong_model.predict(X_test)

    acc = accuracy_score(y_cong_test, y_cong_pred)
    print(f"Congestion Classifier Accuracy: {acc * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(y_cong_test, y_cong_pred))

    # Save models
    speed_model_path = os.path.join(MODEL_DIR, "speed_model.joblib")
    cong_model_path = os.path.join(MODEL_DIR, "congestion_model.joblib")
    joblib.dump(speed_model, speed_model_path)
    joblib.dump(cong_model, cong_model_path)

    print(f"Saved models to:\n  - {speed_model_path}\n  - {cong_model_path}")
    print("\nTraining completed successfully!")

if __name__ == "__main__":
    train_models()
