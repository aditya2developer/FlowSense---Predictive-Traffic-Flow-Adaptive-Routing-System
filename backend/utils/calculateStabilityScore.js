function calculateStabilityScore({
  currentTime,
  predictedTime,
  highCongestionPercentage,
  averageSpeed,
  speedVariability
}) {

  const delayPercentage =
    currentTime > 0
      ? ((predictedTime - currentTime) / currentTime) * 100
      : 0;

  const delayPenalty =
    Math.min(
      Math.max(delayPercentage, 0),
      100
    );


  const congestionPenalty =
    Math.min(
      Math.max(highCongestionPercentage, 0),
      100
    );


  const variabilityPercentage =
    averageSpeed > 0
      ? (speedVariability / averageSpeed) * 100
      : 0;

  const variabilityPenalty =
    Math.min(
      variabilityPercentage * 2,
      100
    );


  const score =
    100 -
    (
      delayPenalty * 0.40 +
      congestionPenalty * 0.40 +
      variabilityPenalty * 0.20
    );


  return Math.round(
    Math.min(
      Math.max(score, 0),
      100
    )
  );
}


module.exports = calculateStabilityScore;