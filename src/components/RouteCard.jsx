import { Sparkles, AlertTriangle, Lightbulb, Compass } from "lucide-react";

function RouteCard({ route, isSelected = false, onSelect = null }) {
  const congestion = route.congestion?.toUpperCase() || "UNKNOWN";

  const congestionClass = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    UNKNOWN: "unknown"
  }[congestion] || "unknown";

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
      ? "#10b981"
      : route.stabilityScore >= 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <article
      className={`route-card cyber-route-card ${route.recommended ? "recommended-glow" : ""} ${
        isSelected ? "selected-route-glow" : ""
      }`}
      onClick={() => onSelect && onSelect(route.id)}
    >
      {/* GLOWING AMBIENT TOP BORDER */}
      <div className={`route-glow-edge ${route.recommended ? "glow-edge-emerald" : isSelected ? "glow-edge-cyan" : ""}`} />

      <div className="route-header">
        <div className="route-title-wrap">
          <div className="route-name-row">
            {route.recommended && <Sparkles size={16} className="text-emerald sparkle-anim" />}
            <h3>{route.name || "Route"}</h3>
          </div>
          {route.roadName && <p className="road-name">Via {route.roadName}</p>}
        </div>

        <div className="badge-group">
          {route.recommended && (
            <span className="recommended-badge cyber-rec-badge">
              <span className="rec-dot-pulse" />
              <span>AI Recommended</span>
            </span>
          )}
          {route.activeIncidents && route.activeIncidents.length > 0 && (
            <span
              className="incident-alert-badge"
              title={`${route.activeIncidents.length} active incident(s) reported along corridor`}
            >
              <AlertTriangle size={12} />
              <span>{route.activeIncidents.length} Hazard</span>
            </span>
          )}
        </div>
      </div>

      <div className="route-details">
        <div className="detail-stat-card">
          <span className="detail-label">Distance</span>
          <strong className="detail-val">
            {Number.isFinite(route.distance) ? `${route.distance.toFixed(1)} km` : "—"}
          </strong>
        </div>

        <div className="detail-stat-card">
          <span className="detail-label">Current Est.</span>
          <strong className="detail-val">
            {hasCurrentTime ? `${route.currentTime} min` : "—"}
          </strong>
        </div>

        <div className="detail-stat-card">
          <span className="detail-label">Predicted</span>
          <strong className="detail-val">
            {hasPredictedTime ? `${route.predictedTime} min` : "—"}
          </strong>
          {timeDifference !== null && (
            <small
              className={`time-diff-badge ${
                timeDifference > 0
                  ? "time-increase"
                  : timeDifference < 0
                  ? "time-decrease"
                  : "time-unchanged"
              }`}
            >
              {timeDifference > 0
                ? `+${timeDifference}m delay`
                : timeDifference < 0
                ? `${timeDifference}m faster`
                : "Steady"}
            </small>
          )}
        </div>

        <div className="detail-stat-card">
          <span className="detail-label">Congestion</span>
          <strong className={`congestion-badge ${congestionClass}`}>
            {congestion}
          </strong>
        </div>

        <div className="detail-stat-card stability-stat-card">
          <span className="detail-label">Stability Score</span>
          <strong className="detail-val" style={{ color: stabilityColor }}>
            {hasStabilityScore ? `${route.stabilityScore}/100` : "N/A"}
          </strong>
          {hasStabilityScore && (
            <div
              className="stability-track cyber-track"
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
                  backgroundColor: stabilityColor,
                  boxShadow: `0 0 8px ${stabilityColor}`
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* RATIONALE & EXPLANATION */}
      {route.explanation && (
        <div className="route-explanation">
          <Lightbulb size={15} className="exp-icon text-amber" />
          <p>{route.explanation}</p>
        </div>
      )}

      {/* WHAT YOU SHOULD DO - ACTIONABLE COMMUTER GUIDANCE */}
      <div className="commuter-action-recommendation">
        <Compass size={16} className="rec-bulb text-cyan" />
        <div>
          <strong>Actionable Traffic Police Guidance:</strong>
          <p>
            {route.activeIncidents &&
            route.activeIncidents.length > 0 &&
            route.activeIncidents[0].recommendation
              ? route.activeIncidents[0].recommendation
              : congestion === "HIGH"
              ? "High congestion risk detected along this corridor. Maintain safe braking distance; consider delaying departure by 25 mins or taking an alternate bypass."
              : route.stabilityScore >= 75
              ? "Optimal high-stability corridor. Historical flow is steady with minimal speed volatility. Recommended for time-critical arrival."
              : "Moderate traffic flow. Watch for merging friction at highway interchanges and follow posted lane signs."}
          </p>
        </div>
      </div>

      {/* HISTORICAL TRAFFIC DETAILS ACCORDION */}
      {prediction && (
        <details className="traffic-summary-accordion">
          <summary>View Historical Corridor &amp; Traffic Telemetry</summary>
          <div className="traffic-summary-content">
            {Number.isFinite(prediction.predictedVehicleCount) && (
              <p>
                Average vehicle volume:{" "}
                <strong>{prediction.predictedVehicleCount} vehicles/hr</strong>
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
                Telemetry observations analyzed:{" "}
                <strong>{prediction.historicalRecords} time-series records</strong>
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
