"""
FlowSense Traffic Dataset Generator
Generates realistic historical traffic readings for training the ML Prediction Model.
Features:
- road_id (categorical: RD001..RD005)
- day_of_week (categorical: Monday..Sunday)
- hour (0..23)
- weather_condition (Clear, Cloudy, Rain, Fog, Storm)
- rainfall_mm (float)
- temperature_c (float)
- active_incidents (int 0..3)
- vehicle_count (target 1: regression)
- average_speed_kmh (target 2: regression)
- congestion_level (target 3: classification LOW, MEDIUM, HIGH)
"""

import csv
import random
import os

ROADS = [
    ("RD001", "GT Road", "HIGHWAY", 50),
    ("RD002", "Nakodar Road", "MAIN_ROAD", 45),
    ("RD003", "Phagwara Road", "MAIN_ROAD", 45),
    ("RD004", "Jalandhar-Amritsar Highway", "HIGHWAY", 60),
    ("RD005", "Bus Stand Road", "LOCAL_ROAD", 35)
]

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WEATHER_CONDITIONS = ["Clear", "Cloudy", "Rain", "Fog", "Thunderstorm"]

def generate_sample(road, day, hour):
    road_id, road_name, road_type, speed_limit = road
    is_weekend = day in ["Saturday", "Sunday"]
    is_rush_hour = (7 <= hour <= 10) or (17 <= hour <= 20)

    # Weather simulation
    weather = random.choices(WEATHER_CONDITIONS, weights=[0.55, 0.25, 0.12, 0.05, 0.03])[0]
    temp = round(random.uniform(18, 38) if not (hour < 6 or hour > 21) else random.uniform(12, 24), 1)
    rainfall = round(random.uniform(1.0, 15.0), 1) if weather in ["Rain", "Thunderstorm"] else 0.0

    # Base vehicle count
    if is_rush_hour:
        base_count = random.randint(180, 320) if not is_weekend else random.randint(110, 220)
    elif 11 <= hour <= 16:
        base_count = random.randint(90, 180)
    elif 21 <= hour <= 23:
        base_count = random.randint(40, 100)
    else: # late night 0-6
        base_count = random.randint(10, 45)

    # Road capacity impact
    if road_type == "HIGHWAY":
        base_count = int(base_count * 1.3)
    elif road_type == "LOCAL_ROAD":
        base_count = int(base_count * 0.75)

    # Active incidents
    incident_prob = 0.12 if is_rush_hour or rainfall > 5 else 0.04
    active_incidents = random.choices([0, 1, 2], weights=[1 - incident_prob, incident_prob * 0.85, incident_prob * 0.15])[0]

    # Calculate average speed
    speed = speed_limit
    congestion_ratio = min(base_count / 260.0, 1.0)
    speed -= (speed_limit * 0.55 * congestion_ratio)

    if rainfall > 5.0:
        speed -= random.uniform(5, 12)
    elif weather == "Fog":
        speed -= random.uniform(8, 15)

    if active_incidents > 0:
        speed -= (active_incidents * random.uniform(8, 18))

    speed = max(8.0, round(speed + random.gauss(0, 2.5), 1))

    # Congestion classification
    if speed < speed_limit * 0.45 or base_count > 200 or active_incidents >= 2:
        congestion = "HIGH"
    elif speed < speed_limit * 0.72 or base_count > 120:
        congestion = "MEDIUM"
    else:
        congestion = "LOW"

    return {
        "road_id": road_id,
        "road_name": road_name,
        "road_type": road_type,
        "day_of_week": day,
        "hour": hour,
        "weather_condition": weather,
        "temperature_c": temp,
        "rainfall_mm": rainfall,
        "active_incidents": active_incidents,
        "vehicle_count": base_count,
        "average_speed_kmh": speed,
        "congestion_level": congestion
    }

def generate_csv(output_path, num_samples=5000):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    samples = []
    for _ in range(num_samples):
        road = random.choice(ROADS)
        day = random.choice(DAYS)
        hour = random.randint(0, 23)
        samples.append(generate_sample(road, day, hour))

    keys = list(samples[0].keys())
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(samples)

    print(f"Dataset generated with {num_samples} records at: {output_path}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, "traffic_dataset.csv")
    generate_csv(csv_path, num_samples=5000)
