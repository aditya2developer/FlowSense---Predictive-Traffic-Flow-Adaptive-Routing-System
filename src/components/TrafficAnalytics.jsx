import { useEffect, useState } from "react";
import TrafficChart from "./TrafficChart";
import TrafficHeatmap from "./TrafficHeatMap";
function TrafficAnalytics() {
  const [roadId, setRoadId] = useState("RD001");
  const [analytics, setAnalytics] = useState([]);
  const [selectedDay, setSelectedDay] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch analytics data from the backend
  async function fetchAnalytics() {
    const trimmedRoadId = roadId.trim();

    if (!trimmedRoadId) {
      setError("Please enter a valid Road ID.");
      setAnalytics([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/routes/analytics/${encodeURIComponent(
          trimmedRoadId
        )}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load traffic analytics."
        );
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
      : analytics.filter(
          (item) => item.dayOfWeek === selectedDay
        );

  // Load analytics when the component first appears
  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <section className="traffic-analytics">
      <h2>Traffic Memory Analytics</h2>

      <p>
        Explore historical traffic patterns stored in the FlowSense database.
      </p>

      {/* Search controls */}
      <div className="analytics-controls">
        <label htmlFor="roadId">Road ID</label>

        <input
          id="roadId"
          type="text"
          value={roadId}
          onChange={(event) => setRoadId(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              fetchAnalytics();
            }
          }}
          placeholder="Enter road ID"
        />

        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={loading || !roadId.trim()}
        >
          {loading ? "Loading..." : "Load Analytics"}
        </button>

        <label htmlFor="dayFilter">Day</label>

        <select
          id="dayFilter"
          value={selectedDay}
          onChange={(event) => setSelectedDay(event.target.value)}
        >
          <option value="ALL">All Days</option>
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
          <option value="Saturday">Saturday</option>
          <option value="Sunday">Sunday</option>
        </select>
      </div>

      {/* Loading state */}
      {loading && (
        <p className="analytics-loading">
          Loading traffic analytics...
        </p>
      )}

      {/* Error state */}
      {error && (
        <p className="analytics-error" role="alert">
          {error}
        </p>
      )}

      {/* Empty database result */}
      {!loading && !error && analytics.length === 0 && (
        <p>
          No historical traffic data available for this road.
        </p>
      )}

      {/* No records for the selected day */}
      {!loading &&
        !error &&
        analytics.length > 0 &&
        filteredAnalytics.length === 0 && (
          <p>
            No traffic records found for {selectedDay}.
            Try selecting another day.
          </p>
        )}

      {/* Traffic chart */}
      {!loading &&
        !error &&
        filteredAnalytics.length > 0 && (
          <TrafficChart analytics={filteredAnalytics} />
        )}

        {!loading &&
            !error &&
            filteredAnalytics.length > 0 && (
        <TrafficHeatmap analytics={filteredAnalytics} />
        )}

      {/* Traffic analytics table */}
      {!loading &&
        !error &&
        filteredAnalytics.length > 0 && (
          <div className="analytics-table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Hour</th>
                  <th>Avg. Vehicles</th>
                  <th>Avg. Speed</th>
                  <th>High Congestion</th>
                  <th>Records</th>
                </tr>
              </thead>

              <tbody>
                {filteredAnalytics.map((item) => (
                  <tr
                    key={`${item.dayOfWeek}-${item.hour}`}
                  >
                    <td>{item.dayOfWeek}</td>

                    <td>
                      {String(item.hour).padStart(2, "0")}:00
                    </td>

                    <td>{item.averageVehicleCount}</td>

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
        )}
    </section>
  );
}

export default TrafficAnalytics;