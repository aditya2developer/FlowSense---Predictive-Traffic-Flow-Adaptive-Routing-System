function RouteCard({ route }) {
  const congestion = route.congestion?.toUpperCase() || "UNKNOWN";

  const congestionClass = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    UNKNOWN: "unknown"
  }[congestion];

  const hasPredictedTime =
    Number.isFinite(route.predictedTime);

  const hasCurrentTime =
    Number.isFinite(route.currentTime);

  const hasStabilityScore =
    Number.isFinite(route.stabilityScore);

  const timeDifference =
    hasPredictedTime && hasCurrentTime
      ? route.predictedTime - route.currentTime
      : null;

  const prediction = route.trafficPrediction;

  const predictionSource =
    prediction?.predictionSource || null;

  const sourceLabels = {
    EXACT_DAY_AND_HOUR: "Exact day and hour",
    SAME_HOUR_ANY_DAY: "Same hour, other days",
    NEARBY_HOURS_SAME_DAY: "Nearby hours, same day",
    ROAD_HISTORY_FALLBACK: "General road history"
  };

  return (
    <div
      className={`route-card ${
        route.recommended ? "recommended" : ""
      }`}
    >
      <div className="route-header">
        <div>
          <h3>
            {route.recommended && "⭐ "}
            {route.name || "Route"}
          </h3>

          {route.roadName && (
            <p className="road-name">
              {route.roadName}
            </p>
          )}
        </div>

        {route.recommended && (
          <span className="recommended-badge">
            Recommended
          </span>
        )}
      </div>

      <div className="route-details">
        <div>
          <span>Distance</span>
          <strong>
            {Number.isFinite(route.distance)
              ? `${route.distance.toFixed(2)} km`
              : "Unavailable"}
          </strong>
        </div>

        <div>
          <span>Current estimate</span>
          <strong>
            {hasCurrentTime
              ? `${route.currentTime} min`
              : "Unavailable"}
          </strong>
        </div>

        <div>
          <span>Predicted estimate</span>
          <strong>
            {hasPredictedTime
              ? `${route.predictedTime} min`
              : "Unavailable"}
          </strong>

          {timeDifference !== null && (
            <small
              className={
                timeDifference > 0
                  ? "time-increase"
                  : timeDifference < 0
                  ? "time-decrease"
                  : "time-unchanged"
              }
            >
              {timeDifference > 0
                ? `+${timeDifference} min`
                : timeDifference < 0
                ? `${timeDifference} min`
                : "No change"}
            </small>
          )}
        </div>

        <div>
          <span>Congestion</span>
          <strong
            className={`congestion-badge ${congestionClass}`}
          >
            {congestion}
          </strong>
        </div>

        <div>
          <span>Stability</span>
          <strong>
            {hasStabilityScore
              ? `${route.stabilityScore}/100`
              : "Unavailable"}
          </strong>

          {hasStabilityScore && (
            <div
              className="stability-track"
              role="progressbar"
              aria-label="Route stability"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(
                100,
                Math.max(0, route.stabilityScore)
              )}
            >
              <div
                className="stability-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, route.stabilityScore)
                  )}%`
                }}
              />
            </div>
          )}
        </div>
      </div>

      {prediction && (
        <div className="traffic-summary">
          <h4>Historical traffic summary</h4>

          {Number.isFinite(prediction.predictedVehicleCount) && (
            <p>
              Average vehicle count:{" "}
              <strong>
                {prediction.predictedVehicleCount}
              </strong>
            </p>
          )}

          {Number.isFinite(prediction.predictedSpeed) && (
            <p>
              Historical average speed:{" "}
              <strong>
                {prediction.predictedSpeed}
              </strong>
            </p>
          )}

          {Number.isFinite(prediction.historicalRecords) && (
            <p>
              Records used:{" "}
              <strong>
                {prediction.historicalRecords}
              </strong>
            </p>
          )}

          {predictionSource && (
            <p>
              Prediction source:{" "}
              <strong>
                {sourceLabels[predictionSource] ||
                  predictionSource}
              </strong>
            </p>
          )}

          {prediction.dataQuality && (
            <p>
              Data quality:{" "}
              <strong>
                {prediction.dataQuality}
              </strong>
            </p>
          )}

          {prediction.historicalRecords < 5 && (
            <p className="data-warning">
              Limited historical data. Treat this estimate
              as experimental.
            </p>
          )}
        </div>
      )}

      {route.message && (
        <div className="route-message">
          {route.message}
        </div>
      )}
    </div>
  );
}

export default RouteCard;