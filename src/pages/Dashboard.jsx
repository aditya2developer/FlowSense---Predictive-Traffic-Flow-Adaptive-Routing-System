import { useEffect, useState } from "react";
import TrafficAnalytics from "../components/TrafficAnalytics";
import { fetchIncidents, resolveIncident, fetchWeather, fetchRoadSegments } from "../api";
import { useCity } from "../context/CityContext";
import { useAuth } from "../context/AuthContext";
import { RefreshCw, CloudSun, AlertCircle, Shield, Activity, Route, ThumbsUp, Camera, MapPin } from "lucide-react";

const WEATHER_CITIES = [
  "Delhi", "Mumbai", "Bengaluru", "Chennai", "Hyderabad", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Jalandhar",
  "Surat", "Kochi", "Visakhapatnam", "Bhopal", "Indore", "Patna",
  "Bhubaneswar", "Guwahati", "Dehradun", "Amritsar", "Vadodara", "Ranchi",
  "Shimla", "Panaji", "Srinagar", "Raipur"
];

function Dashboard() {
  const { activeCity, activeState, openCityModal } = useCity();
  const { isAuthority } = useAuth();

  const [incidents, setIncidents] = useState([]);
  const [weather, setWeather] = useState(null);
  const [roadCount, setRoadCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [scopeAllIndia, setScopeAllIndia] = useState(false);
  const [weatherCity, setWeatherCity] = useState(() => activeCity || "Delhi");
  const [prevActiveCity, setPrevActiveCity] = useState(activeCity);
  const [weatherLoading, setWeatherLoading] = useState(false);

  if (activeCity !== prevActiveCity) {
    setPrevActiveCity(activeCity);
    setWeatherCity(activeCity);
  }

  useEffect(() => {
    let active = true;
    const cityFilter = scopeAllIndia ? "All" : activeCity;

    Promise.all([
      fetchIncidents(cityFilter).catch(() => ({ success: false, data: [] })),
      fetchWeather(activeCity).catch(() => ({ success: false, data: null })),
      fetchRoadSegments().catch(() => ({ success: false, data: [] }))
    ])
      .then(([incData, weatherData, segData]) => {
        if (!active) return;
        if (incData.success) setIncidents(incData.data || []);
        if (weatherData.success) setWeather(weatherData.data || null);
        if (segData.success && Array.isArray(segData.data)) setRoadCount(segData.data.length);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeCity, scopeAllIndia]);

  async function refreshDashboardData() {
    setLoading(true);
    try {
      const cityFilter = scopeAllIndia ? "All" : activeCity;
      const [incData, weatherData, segData] = await Promise.all([
        fetchIncidents(cityFilter).catch(() => ({ success: false, data: [] })),
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

  async function handleWeatherCityChange(city) {
    setWeatherCity(city);
    setWeatherLoading(true);
    try {
      const res = await fetchWeather(city);
      if (res.success) setWeather(res.data);
    } catch {
      // quiet fallback
    } finally {
      setWeatherLoading(false);
    }
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
            <h1>Live Traffic Analytics — {activeCity}, {activeState}</h1>
            <p>
              Real-time weather, air quality, active road hazards, and corridor speed trends for{" "}
              <strong>{activeCity}</strong> and connected highways across India.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="refresh-btn-hero" onClick={openCityModal}>
              <MapPin size={15} /> Switch City ({activeCity})
            </button>
            <button className="refresh-btn-hero" onClick={refreshDashboardData} disabled={loading}>
              <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
              {loading ? "Refreshing..." : "Refresh Live Data"}
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="metrics-strip">
          <div className="metric-chip metric-chip-blue">
            <Route size={18} className="metric-icon" />
            <span className="metric-num">{roadCount}</span>
            <span className="metric-label">Monitored Corridors</span>
          </div>
          <div className="metric-chip metric-chip-purple">
            <Activity size={18} className="metric-icon" />
            <span className="metric-num">{activeCity}</span>
            <span className="metric-label">{activeState}</span>
          </div>
          <div className="metric-chip metric-chip-amber">
            <AlertCircle size={18} className="metric-icon" />
            <span className="metric-num metric-alert">{activeCount}</span>
            <span className="metric-label">
              Active Hazards ({scopeAllIndia ? "All India" : activeCity})
            </span>
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

      {/* LIVE WEATHER & AQI CITY SWITCHER */}
      <section className="dashboard-weather-switcher-section">
        <div className="weather-switcher-card">
          <div className="weather-switcher-header">
            <CloudSun size={18} className="text-cyan" />
            <h3>Live City Weather &amp; Air Quality Monitor</h3>
            {weather && <span className="live-pulse-badge">Live Telemetry</span>}
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
                <strong>{weather.windSpeed ?? "N/A"} km/h</strong>
              </div>
              <div className="weather-detail-item">
                <span>Humidity</span>
                <strong>{weather.humidity ?? "N/A"}%</strong>
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
                <strong
                  className={
                    (weather.rainfall || weather.precipitation || 0) > 10 ||
                    weather.condition?.toLowerCase().includes("rain") ||
                    weather.condition?.toLowerCase().includes("fog")
                      ? "text-rose"
                      : "text-emerald"
                  }
                >
                  {(weather.rainfall || weather.precipitation || 0) > 10 ||
                  weather.condition?.toLowerCase().includes("rain") ||
                  weather.condition?.toLowerCase().includes("fog")
                    ? "Caution — Reduce Speed"
                    : "Normal Conditions"}
                </strong>
              </div>
            </div>
          )}
          {weatherLoading && (
            <div className="weather-loading-row">Fetching live weather for {weatherCity}...</div>
          )}
        </div>
      </section>

      {/* ACTIVE INCIDENTS (CITY FILTERED) */}
      <section className="incidents-section-card">
        <div className="incidents-card-header">
          <div>
            <h2>🚨 Active Road Hazards — {scopeAllIndia ? "All India" : activeCity}</h2>
            <p>Live road incidents affecting route stability scores in your selected region.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="refresh-btn-sm"
              onClick={() => setScopeAllIndia(!scopeAllIndia)}
            >
              {scopeAllIndia ? `Filter: ${activeCity} Only` : "Show All Cities"}
            </button>
            <button className="refresh-btn-sm" onClick={refreshDashboardData} disabled={loading}>
              {loading ? "..." : "🔄 Refresh"}
            </button>
          </div>
        </div>

        {incidents.length === 0 ? (
          <div className="no-incidents-notice">
            <span>✅</span>
            <p>
              No active hazards reported in {scopeAllIndia ? "monitored regions" : activeCity} right
              now.
            </p>
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
                  {isAuthority && <th>Action</th>}
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
                          <span style={{ color: "#38bdf8" }}>
                            <Camera size={11} /> {inc.images.length} photo(s)
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {new Date(inc.reportedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    {isAuthority && (
                      <td>
                        <button
                          className="resolve-btn"
                          onClick={() => handleResolve(inc._id)}
                          title="Mark hazard as cleared"
                        >
                          ✓ Resolve
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TrafficAnalytics />
    </div>
  );
}

export default Dashboard;
