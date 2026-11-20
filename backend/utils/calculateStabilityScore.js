function calculateStabilityScore({
  currentTime,
  predictedTime,
  highCongestionPercentage,
  averageSpeed,
  speedVariability,
  incidentPenalty = 0,
  weatherPenalty = 0,
  incidents = [],
  weather = null
}) {
  const current = Number(currentTime);
  const predicted = Number(predictedTime);
  const highCongestion = Number(highCongestionPercentage);
  const speed = Number(averageSpeed);
  const variability = Number(speedVariability);

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(predicted) ||
    current <= 0 ||
    predicted < 0
  ) {
    return null;
  }

  const safeCongestion = Number.isFinite(highCongestion)
    ? Math.min(Math.max(highCongestion, 0), 100)
    : 0;

  const safeSpeed = Number.isFinite(speed) ? speed : 0;
  const safeVariability = Number.isFinite(variability)
    ? Math.max(variability, 0)
    : 0;

  // Penalty 1: Delay penalty (up to 100)
  const delayPercentage = ((predicted - current) / current) * 100;
  const delayPenalty = Math.min(Math.max(delayPercentage, 0), 100);

  // Penalty 2: Historical congestion percentage (0 - 100)
  const congestionPenalty = safeCongestion;

  // Penalty 3: Speed variability (0 - 100)
  const variabilityPercentage =
    safeSpeed > 0 ? (safeVariability / safeSpeed) * 100 : 0;
  const computedVariabilityPenalty = Math.min(variabilityPercentage * 2, 100);

  // Penalty 4: Incident impact calculated from active incidents if provided
  let computedIncidentPenalty = Number(incidentPenalty) || 0;
  if (Array.isArray(incidents) && incidents.length > 0) {
    let incidentPoints = 0;
    for (const inc of incidents) {
      if (inc.severity === "HIGH") incidentPoints += 30;
      else if (inc.severity === "MEDIUM") incidentPoints += 15;
      else incidentPoints += 5;
    }
    computedIncidentPenalty = Math.min(Math.max(incidentPoints, computedIncidentPenalty), 100);
  }

  // Penalty 5: Weather penalty if weather object is provided
  let computedWeatherPenalty = Number(weatherPenalty) || 0;
  if (weather && weather.condition) {
    const condition = String(weather.condition).toLowerCase();
    if (condition.includes("heavy rain") || condition.includes("thunderstorm") || condition.includes("storm")) {
      computedWeatherPenalty = Math.max(computedWeatherPenalty, 25);
    } else if (condition.includes("rain") || condition.includes("fog") || condition.includes("flood")) {
      computedWeatherPenalty = Math.max(computedWeatherPenalty, 15);
    } else if (condition.includes("drizzle") || condition.includes("cloudy")) {
      computedWeatherPenalty = Math.max(computedWeatherPenalty, 5);
    }
  }

  // Master Plan weights:
  // Base model considers delay (30%), congestion (30%), variability (15%), incidents (15%), weather (10%)
  const totalPenalty =
    delayPenalty * 0.30 +
    congestionPenalty * 0.30 +
    computedVariabilityPenalty * 0.15 +
    computedIncidentPenalty * 0.15 +
    computedWeatherPenalty * 0.10;

  const score = 100 - totalPenalty;
  const finalScore = Math.round(Math.min(Math.max(score, 0), 100));

  return finalScore;
}

module.exports = calculateStabilityScore;
