function calculateStabilityScore({
  currentTime,
  predictedTime,
  highCongestionPercentage,
  averageSpeed,
  speedVariability
}) {
  // Validate inputs and use safe defaults.
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

  // Penalty 1: Additional travel time compared with current estimate.
  const delayPercentage =
    ((predicted - current) / current) * 100;

  const delayPenalty = Math.min(
    Math.max(delayPercentage, 0),
    100
  );

  // Penalty 2: Historical proportion of HIGH congestion records.
  const congestionPenalty = safeCongestion;

  // Penalty 3: Variation in recorded speeds.
  const variabilityPercentage =
    safeSpeed > 0
      ? (safeVariability / safeSpeed) * 100
      : 0;

  const variabilityPenalty = Math.min(
    variabilityPercentage * 2,
    100
  );

  // Project-defined weights: delay 40%, congestion 40%, variability 20%.
  const totalPenalty =
    delayPenalty * 0.4 +
    congestionPenalty * 0.4 +
    variabilityPenalty * 0.2;

  const score = 100 - totalPenalty;

  return Math.round(
    Math.min(Math.max(score, 0), 100)
  );
}

module.exports = calculateStabilityScore;
