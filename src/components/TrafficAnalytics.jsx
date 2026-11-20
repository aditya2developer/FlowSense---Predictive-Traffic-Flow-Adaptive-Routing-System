import { useEffect, useState } from "react";
import TrafficChart from "./TrafficChart";
import TrafficHeatmap from "./TrafficHeatmap";
import { fetchAnalytics as apiFetchAnalytics } from "../api";

const ROAD_OPTIONS = [
  { id: "RD001", name: "GT Road (RD001)" },
  { id: "RD002", name: "Nakodar Road (RD002)" },
  { id: "RD003", name: "Phagwara Road (RD003)" },
  { id: "RD004", name: "Jalandhar-Amritsar Highway (RD004)" },
  { id: "RD005", name: "Bus Stand Road (RD005)" }
];

function TrafficAnalytics() {
  const [roadId, setRoadId] = useState("RD001");
  const [analytics, setAnalytics] = useState([]);
  const [selectedDay, setSelectedDay] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAnalytics(targetRoadId = roadId) {
    const trimmedRoadId = (targetRoadId || "").trim();

    if (!trimmedRoadId) {
      setError("Please enter or select a valid Road ID.");
      setAnalytics([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await apiFetchAnalytics(trimmedRoadId);

      if (!data.success) {
        throw new Error(data.message || "Failed to load traffic analytics.");
      }

      setAnalytics(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "Unable to connect to the backend.");
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }

  // Filter analytics by the selected day
  const filteredAnalytics =
    selectedDay === "ALL"
      ? analytics
      : analytics.filter((item) => item.dayOfWeek === selectedDay);

  // Load analytics when the component mounts
  useEffect(() => {
    loadAnalytics("RD001");
  }, []);

  return (
    <section className="traffic-analytics-container">
      <div className="analytics-header">
        <div>
          <h2>📊 Traffic Memory Engine Analytics</h2>
          <p>
            Aggregated historical traffic patterns, speed variations, and congestion profiles stored in MongoDB.
          </p>
        </div>
      </div>

      {/* SEARCH / FILTER CONTROLS */}
      <div className="analytics-controls-bar">
        <div className="control-item">
          <label htmlFor="roadSelect">Select Road Segment:</label>
          <select
            id="roadSelect"
            value={roadId}
            onChange={(e) => {
              setRoadId(e.target.value);
              loadAnalytics(e.target.value);
            }}
          >
            {ROAD_OPTIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-item">
          <label htmlFor="dayFilter">Filter by Day:</label>
          <select
            id="dayFilter"
            value={selectedDay}
            onChange={(event) => setSelectedDay(event.target.value)}
          >
            <option value="ALL">All Days of the Week</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </select>
        </div>

        <button
          type="button"
          className="refresh-analytics-btn"
          onClick={() => loadAnalytics(roadId)}
          disabled={loading || !roadId.trim()}
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="analytics-status-msg">
          <span className="btn-spinner" /> Loading traffic analytics...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="analytics-error-banner" role="alert">
          {error}
        </div>
      )}

      {/* Empty database result */}
      {!loading && !error && analytics.length === 0 && (
        <div className="analytics-empty-state">
          <p>No historical traffic data found for this road. Run <code>node backend/seedData.js</code> to populate data.</p>
        </div>
      )}

      {/* Traffic chart */}
      {!loading && !error && filteredAnalytics.length > 0 && (
        <TrafficChart analytics={filteredAnalytics} />
      )}

      {/* Heatmap */}
      {!loading && !error && analytics.length > 0 && (
        <TrafficHeatmap analytics={analytics} />
      )}

      {/* Traffic analytics table */}
      {!loading && !error && filteredAnalytics.length > 0 && (
        <div className="analytics-table-section">
          <h3>Historical Hourly Observations</h3>
          <div className="analytics-table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Hour</th>
                  <th>Avg. Vehicles</th>
                  <th>Avg. Speed</th>
                  <th>High Congestion %</th>
                  <th>Total Readings</th>
                </tr>
              </thead>

              <tbody>
                {filteredAnalytics.map((item) => (
                  <tr key={`${item.dayOfWeek}-${item.hour}`}>
                    <td>{item.dayOfWeek}</td>
                    <td>{String(item.hour).padStart(2, "0")}:00</td>
                    <td><strong>{item.averageVehicleCount}</strong></td>
                    <td>{item.averageSpeed} km/h</td>
                    <td>
                      <span
                        className={`congestion-indicator ${
                          item.highCongestionPercentage >= 70
                            ? "congestion-high"
                            : item.highCongestionPercentage >= 30
                            ? "congestion-medium"
                            : "congestion-low"
                        }`}
                      >
                        {item.highCongestionPercentage}%
                      </span>
                    </td>
                    <td>{item.totalRecords}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default TrafficAnalytics;
