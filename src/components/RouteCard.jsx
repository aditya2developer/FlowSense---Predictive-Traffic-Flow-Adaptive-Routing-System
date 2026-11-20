function RouteCard({ route, isSelected = false, onSelect = null }) {
  const congestion = route.congestion?.toUpperCase() || "UNKNOWN";

  const congestionClass = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    UNKNOWN: "unknown"
  }[congestion];

  const hasPredictedTime = Number.isFinite(route.predictedTime);
  const hasCurrentTime = Number.isFinite(route.currentTime);
  const hasStabilityScore = Number.isFinite(route.stabilityScore);

  const timeDifference =
    hasPredictedTime && hasCurrentTime
      ? route.predictedTime - route.currentTime
      : null;

  const prediction = route.trafficPrediction;
  const predictionSource = prediction?.predictionSource || null;

  const sourceLabels = {
    EXACT_DAY_AND_HOUR: "Exact day and hour",
    SAME_HOUR_ANY_DAY: "Same hour, other days",
    NEARBY_HOURS_SAME_DAY: "Nearby hours, same day",
    ROAD_HISTORY_FALLBACK: "General road history"
  };

  const stabilityColor =
    !hasStabilityScore
      ? "#94a3b8"
      : route.stabilityScore >= 75
      ? "#16a34a"
      : route.stabilityScore >= 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <article
      className={`route-card ${route.recommended ? "recommended" : ""} ${
        isSelected ? "selected-route" : ""
      }`}
      onClick={() => onSelect && onSelect(route.id)}
    >
      <div className="route-header">
        <div>
          <h3>
            {route.recommended && "⭐ "}
            {route.name || "Route"}
          </h3>
          {route.roadName && <p className="road-name">Via {route.roadName}</p>}
        </div>

        <div className="badge-group">
          {route.recommended && (
            <span className="recommended-badge">Recommended</span>
          )}
          {route.activeIncidents && route.activeIncidents.length > 0 && (
            <span className="incident-alert-badge" title={`${route.activeIncidents.length} active incident(s) reported`}>
              ⚠️ {route.activeIncidents.length} Incident
            </span>
          )}
        </div>
      </div>

      <div className="route-details">
        <div>
          <span>Distance</span>
          <strong>
            {Number.isFinite(route.distance)
              ? `${route.distance.toFixed(2)} km`
              : "—"}
          </strong>
        </div>

        <div>
          <span>Current Est.</span>
          <strong>
            {hasCurrentTime ? `${route.currentTime} min` : "—"}
          </strong>
        </div>

        <div>
          <span>Predicted</span>
          <strong>
            {hasPredictedTime ? `${route.predictedTime} min` : "—"}
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
                ? `+${timeDifference} min delay`
                : timeDifference < 0
                ? `${timeDifference} min faster`
                : "Consistent"}
            </small>
          )}
        </div>

        <div>
          <span>Congestion Risk</span>
          <strong className={`congestion-badge ${congestionClass}`}>
            {congestion}
          </strong>
        </div>

        <div>
          <span>Stability Score</span>
          <strong style={{ color: stabilityColor }}>
            {hasStabilityScore ? `${route.stabilityScore}/100` : "N/A"}
          </strong>
          {hasStabilityScore && (
            <div
              className="stability-track"
              role="progressbar"
              aria-label="Route stability"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={route.stabilityScore}
            >
              <div
                className="stability-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, route.stabilityScore))}%`,
                  backgroundColor: stabilityColor
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* RATIONALE & EXPLANATION */}
      {route.explanation && (
        <div className="route-explanation">
          <span className="exp-icon">💡</span>
          <p>{route.explanation}</p>
        </div>
      )}

      {/* WHAT YOU SHOULD DO - ACTIONABLE COMMUTER GUIDANCE */}
      <div className="commuter-action-recommendation">
        <span className="rec-bulb">🧭</span>
        <div>
          <strong>What You Should Do (Recommended Action):</strong>
          <p>
            {route.activeIncidents && route.activeIncidents.length > 0 && route.activeIncidents[0].recommendation
              ? route.activeIncidents[0].recommendation
              : congestion === "HIGH"
              ? "High congestion risk detected along this corridor. Maintain safe braking distance; consider delaying departure by 25 mins or taking an alternate bypass."
              : route.stabilityScore >= 75
              ? "Optimal high-stability corridor. Historical flow is steady with minimal speed volatility. Recommended for time-critical arrival."
              : "Moderate traffic flow. Watch for merging friction at highway interchanges and follow posted lane signs."}
          </p>
        </div>
      </div>

      {/* HISTORICAL TRAFFIC DETAILS */}
      {prediction && (
        <details className="traffic-summary-accordion">
          <summary>View Historical Traffic Details</summary>
          <div className="traffic-summary-content">
            {Number.isFinite(prediction.predictedVehicleCount) && (
              <p>
                Average vehicle count:{" "}
                <strong>{prediction.predictedVehicleCount} vehicles</strong>
              </p>
            )}
            {Number.isFinite(prediction.predictedSpeed) && (
              <p>
                Historical average speed:{" "}
                <strong>{prediction.predictedSpeed} km/h</strong>
              </p>
            )}
            {Number.isFinite(prediction.historicalRecords) && (
              <p>
                Records analyzed:{" "}
                <strong>{prediction.historicalRecords} observations</strong>
              </p>
            )}
            {predictionSource && (
              <p>
                Prediction source:{" "}
                <strong>{sourceLabels[predictionSource] || predictionSource}</strong>
              </p>
            )}
            {prediction.dataQuality && (
              <p>
                Data quality confidence:{" "}
                <span className={`confidence-pill conf-${prediction.dataQuality.toLowerCase()}`}>
                  {prediction.dataQuality}
                </span>
              </p>
            )}
          </div>
        </details>
      )}

      {route.message && <div className="route-message">{route.message}</div>}
    </article>
  );
}

export default RouteCard;
