import { useEffect, useState } from "react";
import TrafficAnalytics from "../components/TrafficAnalytics";
import { fetchIncidents, resolveIncident, fetchWeather, fetchRoadSegments } from "../api";

function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [weather, setWeather] = useState(null);
  const [roadCount, setRoadCount] = useState(5);
  const [loading, setLoading] = useState(true);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [incData, weatherData, segData] = await Promise.all([
        fetchIncidents().catch(() => ({ success: false, data: [] })),
        fetchWeather("Jalandhar").catch(() => ({ success: false, data: null })),
        fetchRoadSegments().catch(() => ({ success: false, data: [] }))
      ]);

      if (incData.success) setIncidents(incData.data || []);
      if (weatherData.success) setWeather(weatherData.data || null);
      if (segData.success && Array.isArray(segData.data)) {
        setRoadCount(segData.data.length);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function handleResolve(id) {
    try {
      const res = await resolveIncident(id);
      if (res.success) {
        setIncidents((prev) => prev.filter((inc) => inc._id !== id));
      }
    } catch (err) {
      console.error("Failed to resolve incident:", err);
    }
  }

  return (
    <div className="page-container dashboard-page">
      <section className="dashboard-hero">
        <h1>Traffic Analytics &amp; Control Center</h1>
        <p>
          Real-time telemetry, active road incident dispatch, and historical pattern intelligence stored across MongoDB collections.
        </p>

        {/* METRICS OVERVIEW CARDS */}
        <div className="metrics-strip">
          <div className="metric-chip">
            <span className="metric-num">{roadCount}</span>
            <span className="metric-label">Monitored Roads</span>
          </div>

          <div className="metric-chip">
            <span className="metric-num">3,080+</span>
            <span className="metric-label">Memory Records</span>
          </div>

          <div className="metric-chip">
            <span className="metric-num metric-alert">{incidents.length}</span>
            <span className="metric-label">Active Incidents</span>
          </div>

          {weather && (
            <div className="metric-chip">
              <span className="metric-num">{weather.temperature}°C</span>
              <span className="metric-label">{weather.condition} ({weather.city})</span>
            </div>
          )}
        </div>
      </section>

      {/* ACTIVE INCIDENTS ROW */}
      <section className="incidents-section-card">
        <div className="incidents-card-header">
          <div>
            <h2>🚨 Active Road Hazards &amp; Incidents</h2>
            <p>Reported incidents dynamically degrade route stability scores in real time.</p>
          </div>
          <button className="refresh-btn-sm" onClick={loadDashboardData} disabled={loading}>
            {loading ? "..." : "🔄 Refresh Incidents"}
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="no-incidents-notice">
            <span>✅</span>
            <p>All monitored road corridors are currently clear of active incidents.</p>
          </div>
        ) : (
          <div className="incidents-table-wrapper">
            <table className="incidents-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Road Corridor</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Reported</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc._id}>
                    <td>
                      <span className={`severity-tag sev-${(inc.severity || "medium").toLowerCase()}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td><strong>{inc.type}</strong></td>
                    <td>{inc.roadName || inc.roadId}</td>
                    <td>{inc.description || "No description provided"}</td>
                    <td>📍 {inc.location || "On segment"}</td>
                    <td>{new Date(inc.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <button
                        className="resolve-btn"
                        onClick={() => handleResolve(inc._id)}
                        title="Mark hazard as cleared"
                      >
                        ✓ Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* TRAFFIC MEMORY ANALYTICS COMPONENT */}
      <TrafficAnalytics />
    </div>
  );
}

export default Dashboard;
