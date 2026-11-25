import { useEffect, useState } from "react";
import TrafficAnalytics from "../components/TrafficAnalytics";
import { fetchIncidents, resolveIncident, fetchWeather, fetchRoadSegments } from "../api";
import { RefreshCw, CloudSun, AlertCircle, Shield, Activity, Route, ThumbsUp, Camera } from "lucide-react";

const WEATHER_CITIES = [
  "Delhi", "Mumbai", "Bengaluru", "Chennai", "Hyderabad", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Jalandhar",
  "Surat", "Kochi", "Visakhapatnam", "Bhopal", "Indore", "Patna",
  "Bhubaneswar", "Guwahati", "Dehradun", "Amritsar", "Vadodara"
];

function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [weather, setWeather] = useState(null);
  const [roadCount, setRoadCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [weatherCity, setWeatherCity] = useState("Delhi");
  const [weatherLoading, setWeatherLoading] = useState(false);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [incData, weatherData, segData] = await Promise.all([
        fetchIncidents().catch(() => ({ success: false, data: [] })),
        fetchWeather(weatherCity).catch(() => ({ success: false, data: null })),
        fetchRoadSegments().catch(() => ({ success: false, data: [] }))
      ]);
      if (incData.success) setIncidents(incData.data || []);
      if (weatherData.success) setWeather(weatherData.data || null);
      if (segData.success && Array.isArray(segData.data)) setRoadCount(segData.data.length);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboardData(); }, []);

  async function handleWeatherCityChange(city) {
    setWeatherCity(city);
    setWeatherLoading(true);
    try {
      const res = await fetchWeather(city);
      if (res.success) setWeather(res.data);
    } catch { /* quiet */ } finally { setWeatherLoading(false); }
  }

  async function handleResolve(id) {
    try {
      const res = await resolveIncident(id);
      if (res.success) setIncidents((prev) => prev.filter((inc) => inc._id !== id));
    } catch (err) {
      console.error("Failed to resolve incident:", err);
    }
  }

  const activeCount = incidents.filter((i) => i.status === "ACTIVE").length;
  const criticalCount = incidents.filter((i) => i.severity === "CRITICAL").length;

  return (
    <div className="page-container dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-inner">
          <div>
            <h1>Traffic Analytics &amp; Control Center</h1>
            <p>
              Real-time telemetry, active road incident dispatch, and historical pattern intelligence stored across MongoDB collections. Pan-India coverage across all 28 States &amp; 8 UTs.
            </p>
          </div>
          <button className="refresh-btn-hero" onClick={loadDashboardData} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>

        {/* ENHANCED METRICS STRIP */}
        <div className="metrics-strip">
          <div className="metric-chip metric-chip-blue">
            <Route size={18} className="metric-icon" />
            <span className="metric-num">{roadCount}</span>
            <span className="metric-label">Monitored Corridors</span>
          </div>
          <div className="metric-chip metric-chip-purple">
            <Activity size={18} className="metric-icon" />
            <span className="metric-num">9,240+</span>
            <span className="metric-label">Traffic Memory Records</span>
          </div>
          <div className="metric-chip metric-chip-amber">
            <AlertCircle size={18} className="metric-icon" />
            <span className="metric-num metric-alert">{activeCount}</span>
            <span className="metric-label">Active Incidents</span>
          </div>
          <div className="metric-chip metric-chip-red">
            <Shield size={18} className="metric-icon" />
            <span className="metric-num metric-alert">{criticalCount}</span>
            <span className="metric-label">Critical Severity</span>
          </div>
          {weather && (
            <div className="metric-chip metric-chip-cyan">
              <CloudSun size={18} className="metric-icon" />
              <span className="metric-num">{weather.temperature}°C</span>
              <span className="metric-label">{weather.condition} — {weather.city}</span>
            </div>
          )}
        </div>
      </section>

      {/* LIVE WEATHER CITY SWITCHER */}
      <section className="dashboard-weather-switcher-section">
        <div className="weather-switcher-card">
          <div className="weather-switcher-header">
            <CloudSun size={18} className="text-cyan" />
            <h3>Live Weather Monitor — Select City</h3>
            {weather && <span className="live-pulse-badge">Open-Meteo API Live</span>}
          </div>
          <div className="weather-city-pills">
            {WEATHER_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`weather-city-pill ${weatherCity === c ? "weather-pill-active" : ""}`}
                onClick={() => handleWeatherCityChange(c)}
                disabled={weatherLoading}
              >
                {c}
              </button>
            ))}
          </div>
          {weather && !weatherLoading && (
            <div className="weather-detail-row">
              <div className="weather-detail-item">
                <span>City</span>
                <strong>{weather.city || weatherCity}</strong>
              </div>
              <div className="weather-detail-item">
                <span>Temperature</span>
                <strong>{weather.temperature}°C</strong>
              </div>
              <div className="weather-detail-item">
                <span>Condition</span>
                <strong>{weather.condition}</strong>
              </div>
              <div className="weather-detail-item">
                <span>Wind Speed</span>
                <strong>{weather.windSpeed || "N/A"} km/h</strong>
              </div>
              <div className="weather-detail-item">
                <span>Humidity</span>
                <strong>{weather.humidity || "N/A"}%</strong>
              </div>
              <div className="weather-detail-item">
                <span>Precipitation</span>
                <strong>{weather.rainfall ?? weather.precipitation ?? 0} mm</strong>
              </div>
              {weather.aqi && (
                <div className="weather-detail-item">
                  <span>Live AQI (PM2.5)</span>
                  <strong style={{ color: weather.aqi.color }}>
                    {weather.aqi.usAqi} • {weather.aqi.label} ({weather.aqi.pm25} µg/m³)
                  </strong>
                </div>
              )}
              <div className="weather-detail-item">
                <span>Road Safety</span>
                <strong className={
                  ((weather.rainfall || weather.precipitation || 0) > 10 || weather.condition?.toLowerCase().includes("rain") || weather.condition?.toLowerCase().includes("fog"))
                    ? "text-rose"
                    : "text-emerald"
                }>
                  {((weather.rainfall || weather.precipitation || 0) > 10 || weather.condition?.toLowerCase().includes("rain") || weather.condition?.toLowerCase().includes("fog"))
                    ? "Caution — Reduce Speed"
                    : "Normal Conditions"}
                </strong>
              </div>
            </div>
          )}
          {weatherLoading && <div className="weather-loading-row">Fetching live weather for {weatherCity}...</div>}
        </div>
      </section>

      {/* ACTIVE INCIDENTS */}
      <section className="incidents-section-card">
        <div className="incidents-card-header">
          <div>
            <h2>🚨 Active Road Hazards &amp; Incidents</h2>
            <p>Reported incidents dynamically degrade route stability scores in real time. Click Resolve to clear a hazard from the system.</p>
          </div>
          <button className="refresh-btn-sm" onClick={loadDashboardData} disabled={loading}>
            {loading ? "..." : "🔄 Refresh"}
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
                  <th>City</th>
                  <th>Description</th>
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
                    <td><strong>{inc.type?.replace(/_/g, " ")}</strong></td>
                    <td>{inc.roadName || inc.roadId}</td>
                    <td>{inc.city || "—"}</td>
                    <td style={{ maxWidth: 220, fontSize: "0.82rem" }}>
                      <div>{inc.description || "No description provided"}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: "0.74rem", color: "#94a3b8" }}>
                        <span><ThumbsUp size={11} /> {inc.upvotes || 1}</span>
                        {Array.isArray(inc.images) && inc.images.length > 0 && (
                          <span style={{ color: "#38bdf8" }}><Camera size={11} /> {inc.images.length} photo(s)</span>
                        )}
                      </div>
                    </td>
                    <td>{new Date(inc.reportedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td>
                      <button className="resolve-btn" onClick={() => handleResolve(inc._id)} title="Mark hazard as cleared">
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
