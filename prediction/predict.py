"""
FlowSense Traffic Prediction Inference
Loads trained models and predicts speed and congestion level for any road, time, and weather scenario.
"""

import os
import argparse
import pandas as pd
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
SPEED_MODEL_PATH = os.path.join(MODEL_DIR, "speed_model.joblib")
CONG_MODEL_PATH = os.path.join(MODEL_DIR, "congestion_model.joblib")

def predict(road_id="RD001", day="Friday", hour=18, weather="Clear", temp=28.0, rainfall=0.0, incidents=0):
    if not os.path.exists(SPEED_MODEL_PATH) or not os.path.exists(CONG_MODEL_PATH):
        raise FileNotFoundError("Trained models not found. Please run train.py first.")

    speed_model = joblib.load(SPEED_MODEL_PATH)
    cong_model = joblib.load(CONG_MODEL_PATH)

    input_df = pd.DataFrame([{
        "road_id": road_id,
        "day_of_week": day,
        "hour": int(hour),
        "weather_condition": weather,
        "temperature_c": float(temp),
        "rainfall_mm": float(rainfall),
        "active_incidents": int(incidents)
    }])

    pred_speed = speed_model.predict(input_df)[0]
    pred_cong = cong_model.predict(input_df)[0]
    probabilities = cong_model.predict_proba(input_df)[0]
    classes = cong_model.classes_

    prob_dict = {cls: round(prob * 100, 1) for cls, prob in zip(classes, probabilities)}

    return {
        "road_id": road_id,
        "day_of_week": day,
        "hour": int(hour),
        "weather": weather,
        "active_incidents": int(incidents),
        "predicted_speed_kmh": round(pred_speed, 1),
        "predicted_congestion": pred_cong,
        "probabilities": prob_dict
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FlowSense Traffic Predictor")
    parser.add_argument("--road", default="RD001", help="Road ID (e.g. RD001)")
    parser.add_argument("--day", default="Friday", help="Day of week")
    parser.add_argument("--hour", type=int, default=18, help="Hour (0-23)")
    parser.add_argument("--weather", default="Clear", help="Weather condition")
    parser.add_argument("--rainfall", type=float, default=0.0, help="Rainfall in mm")
    parser.add_argument("--incidents", type=int, default=0, help="Number of active incidents")

    args = parser.parse_args()
    res = predict(
        road_id=args.road,
        day=args.day,
        hour=args.hour,
        weather=args.weather,
        rainfall=args.rainfall,
        incidents=args.incidents
    )

    print("\n========== FLOWSENSE ML PREDICTION ==========")
    print(f"Road Segment:        {res['road_id']}")
    print(f"Time Context:        {res['day_of_week']} at {res['hour']:02d}:00")
    print(f"Weather Condition:   {res['weather']}")
    print(f"Active Incidents:    {res['active_incidents']}")
    print("----------------------------------------------")
    print(f"Predicted Speed:     {res['predicted_speed_kmh']} km/h")
    print(f"Congestion Level:    {res['predicted_congestion']}")
    print(f"Class Probabilities: {res['probabilities']}")
    print("==============================================\n")
