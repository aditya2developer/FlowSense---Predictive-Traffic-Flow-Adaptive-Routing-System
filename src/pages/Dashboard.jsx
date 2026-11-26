import { useEffect, useState } from "react";
import TrafficAnalytics from "../components/TrafficAnalytics";
import IncidentEditModal from "../components/IncidentEditModal";
import { fetchAllIncidentStatuses, updateRouteIncidentStatus, fetchWeather, fetchRoadSegments } from "../api";
import { useCity } from "../context/CityContext";
import { useAuth } from "../context/AuthContext";
import { RefreshCw, CloudSun, AlertCircle, Shield, Activity, Route, ThumbsUp, Camera, MapPin, Pencil } from "lucide-react";

const WEATHER_CITIES = [
  "Delhi", "Mumbai", "Bengaluru", "Chennai", "Hyderabad", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Jalandhar",
  "Surat", "Kochi", "Visakhapatnam", "Bhopal", "Indore", "Patna",
  "Bhubaneswar", "Guwahati", "Dehradun", "Amritsar", "Vadodara", "Ranchi",
  "Shimla", "Panaji", "Srinagar", "Raipur"
];

function Dashboard() {
  const { activeCity, activeState, openCityModal } = useCity();
  const { isAuthority, isAdmin } = useAuth();
  const canManageIncidents = isAuthority || isAdmin;

  const [incidents, setIncidents] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingIncident, setEditingIncident] = useState(null);
  const [weather, setWeather] = useState(null);
  const [roadCount, setRoadCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [scopeAllIndia, setScopeAllIndia] = useState(true);
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

    function loadDashboard() {
      Promise.all([
        fetchAllIncidentStatuses(cityFilter).catch(() => ({ success: false, data: [] })),
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
    }

    loadDashboard();
    const poll = setInterval(loadDashboard, 10000);

    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [activeCity, scopeAllIndia]);

  async function refreshDashboardData() {
    setLoading(true);
    try {
      const cityFilter = scopeAllIndia ? "All" : activeCity;
      const [incData, weatherData, segData] = await Promise.all([
        fetchAllIncidentStatuses(cityFilter).catch(() => ({ success: false, data: [] })),
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

  async function handleIncidentStatusChange(id, nextStatus) {
    try {
      const res = await updateRouteIncidentStatus(id, nextStatus);
      if (res.success && res.data) {
        setIncidents((prev) => prev.map((inc) => (inc._id === id ? { ...inc, ...res.data } : inc)));
      } else {
        alert(res.message || "Failed to update incident status in database.");
      }
    } catch (err) {
      console.error("Failed to update incident status:", err);
      alert("Network error while updating incident status.");
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

      {/* ALL INCIDENTS (CROSS-PORTAL SYNCED) */}
      <section className="incidents-section-card">
        <div className="incidents-card-header">
          <div>
            <h2>🚨 Road Hazard Reports ({incidents.length}) — {scopeAllIndia ? "All India" : activeCity}</h2>
            <p>All active, verified, and resolved hazard reports synchronized live across Public, Authority, and Admin portals.</p>
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

        <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
          {["ALL", "ACTIVE", "RESOLVED", "VERIFIED"].map((s) => {
            const count = s === "ALL" ? incidents.length : incidents.filter((i) => i.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "4px 14px",
                  borderRadius: 20,
                  border: "1.5px solid",
                  borderColor: statusFilter === s ? "#38bdf8" : "#334155",
                  background: statusFilter === s ? "#0284c722" : "transparent",
                  color: statusFilter === s ? "#38bdf8" : "#94a3b8",
                  fontWeight: statusFilter === s ? 700 : 400,
                  cursor: "pointer",
                  fontSize: 12
                }}
              >
                {s === "ALL" ? `All (${count})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${count})`}
              </button>
            );
          })}
        </div>

        {(() => {
          const visible = statusFilter === "ALL" ? incidents : incidents.filter((i) => i.status === statusFilter);
          return visible.length === 0 ? (
            <div className="no-incidents-notice">
              <span>✅</span>
              <p>
                No {statusFilter !== "ALL" ? statusFilter.toLowerCase() + " " : ""}hazards in {scopeAllIndia ? "monitored regions" : activeCity} right
                now.
              </p>
            </div>
          ) : (
            <div className="incidents-table-wrapper">
              <table className="incidents-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Road Corridor</th>
                    <th>City</th>
                    <th>Description</th>
                    <th>Reported</th>
                    {canManageIncidents && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((inc) => (
                    <tr key={inc._id} style={{ opacity: inc.status !== "ACTIVE" ? 0.85 : 1 }}>
                      <td>
                        <span className={`severity-tag sev-${(inc.severity || "medium").toLowerCase()}`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "2px 9px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: inc.status === "ACTIVE" ? "#ef444422" : inc.status === "RESOLVED" ? "#22c55e22" : "#3b82f622",
                            color: inc.status === "ACTIVE" ? "#ef4444" : inc.status === "RESOLVED" ? "#22c55e" : "#3b82f6"
                          }}
                        >
                          {inc.status || "ACTIVE"}
                        </span>
                        {inc.status === "RESOLVED" && inc.resolvedBy && (
                          <div style={{ fontSize: 10, color: "#22c55e", marginTop: 2 }}>by {inc.resolvedBy}</div>
                        )}
                        {inc.status === "VERIFIED" && inc.verifiedBy && (
                          <div style={{ fontSize: 10, color: "#3b82f6", marginTop: 2 }}>by {inc.verifiedBy}</div>
                        )}
                      </td>
                      <td><strong>{inc.type?.replace(/_/g, " ")}</strong></td>
                      <td>{inc.roadName || inc.roadId}</td>
                      <td>{inc.city || "—"}</td>
                      <td style={{ maxWidth: 220, fontSize: "0.82rem" }}>
                        <div>{inc.description || "No description provided"}</div>
                        {inc.statusNote && (
                          <div style={{ fontSize: "0.73rem", color: "#38bdf8", marginTop: 2 }}>Note: {inc.statusNote}</div>
                        )}
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
                      {canManageIncidents && (
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {inc.status !== "RESOLVED" && (
                              <button
                                className="resolve-btn"
                                onClick={() => handleIncidentStatusChange(inc._id, "RESOLVED")}
                                title="Mark hazard as resolved"
                              >
                                ✓ Resolve
                              </button>
                            )}
                            {inc.status !== "VERIFIED" && (
                              <button
                                className="resolve-btn"
                                onClick={() => handleIncidentStatusChange(inc._id, "VERIFIED")}
                                title="Mark hazard as verified"
                                style={{ background: "#3b82f622", color: "#3b82f6", borderColor: "#3b82f655" }}
                              >
                                ✔ Verify
                              </button>
                            )}
                            {inc.status !== "ACTIVE" && (
                              <button
                                className="resolve-btn"
                                onClick={() => handleIncidentStatusChange(inc._id, "ACTIVE")}
                                title="Reopen hazard"
                                style={{ background: "#ef444422", color: "#ef4444", borderColor: "#ef444455" }}
                              >
                                ↩ Reopen
                              </button>
                            )}
                            <button
                              className="resolve-btn"
                              onClick={() => setEditingIncident(inc)}
                              title="Update hazard details"
                              style={{ background: "#0284c722", color: "#38bdf8", borderColor: "#38bdf855", display: "inline-flex", alignItems: "center", gap: 3 }}
                            >
                              <Pencil size={11} /> Edit
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </section>

      <TrafficAnalytics />

      {editingIncident && (
        <IncidentEditModal
          incident={editingIncident}
          canEditStatus={canManageIncidents}
          onClose={() => setEditingIncident(null)}
          onSaved={(updated) => {
            setIncidents((prev) => prev.map((i) => (i._id === updated._id ? { ...i, ...updated } : i)));
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;
