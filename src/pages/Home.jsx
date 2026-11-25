import { useState, useEffect } from "react";
import MapView from "../components/MapView";
import SearchBox from "../components/SearchBox";
import RouteList from "../components/RouteList";
import WeatherWidget from "../components/WeatherWidget";
import LoadingSpinner from "../components/LoadingSpinner";
import { searchRoutes, fetchAdvisories, fetchLiveFeed, fetchNearbyServices } from "../api";
import {
  AlertCircle,
  Radio,
  Sparkles,
  Activity,
  ShieldCheck,
  Database,
  Cpu,
  Hospital,
  Shield,
  Fuel,
  Radar,
  Clock,
  UserCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

function Home() {
  const { user, isAuthenticated } = useAuth();

  const [from, setFrom] = useState("Connaught Place (Rajiv Chowk), New Delhi");
  const [to, setTo] = useState("Indira Gandhi International Airport, Terminal 3, New Delhi");
  const [routes, setRoutes] = useState([]);
  const [locations, setLocations] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advisories, setAdvisories] = useState([]);

  // Real-time Dynamic Telemetry Feed + Nearby Services
  const [liveFeed, setLiveFeed] = useState(null);
  const [nearbyPoi, setNearbyPoi] = useState(null);
  const [scanningPoi, setScanningPoi] = useState(false);
  const [liveClock, setLiveClock] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    fetchAdvisories().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setAdvisories(res.data);
      }
    });

    function refreshLiveTelemetry() {
      fetchLiveFeed()
        .then((res) => {
          if (res.success && res.data) {
            setLiveFeed(res.data);
          }
        })
        .catch(() => {});
    }

    refreshLiveTelemetry();
    const feedInterval = setInterval(refreshLiveTelemetry, 45000);
    const clockInterval = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString());
    }, 1000);

    return () => {
      clearInterval(feedInterval);
      clearInterval(clockInterval);
    };
  }, []);

  async function handleScanNearby(lat, lon) {
    setScanningPoi(true);
    try {
      const res = await fetchNearbyServices(lat, lon, 5000);
      if (res.success && res.data) {
        setNearbyPoi(res.data);
      }
    } catch {
      // Quiet fallback
    } finally {
      setScanningPoi(false);
    }
  }

  function handleScanMyGpsEmergency() {
    if (navigator.geolocation) {
      setScanningPoi(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => handleScanNearby(pos.coords.latitude, pos.coords.longitude),
        () => handleScanNearby(28.6139, 77.2090),
        { timeout: 6000 }
      );
    } else {
      handleScanNearby(28.6139, 77.2090);
    }
  }

  async function handleSearch() {
    if (!from.trim() || !to.trim()) {
      setError("Please enter both starting point and destination.");
      return;
    }

    setLoading(true);
    setError("");
    setRoutes([]);
    setLocations(null);
    setSelectedRouteId(null);

    try {
      const data = await searchRoutes(from.trim(), to.trim());

      if (data.success && Array.isArray(data.routes) && data.routes.length > 0) {
        setRoutes(data.routes);
        setLocations({
          from: data.from,
          to: data.to
        });
        const rec = data.routes.find((r) => r.recommended) || data.routes[0];
        setSelectedRouteId(rec?.id || 1);

        // Automatically query nearby hospitals, police, and fuel stations near destination/origin
        if (data.from?.latitude && data.from?.longitude) {
          handleScanNearby(data.from.latitude, data.from.longitude);
        }
      } else {
        setError(data.message || "No driving routes were found for these locations.");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(
        "Unable to connect to FlowSense backend. Please ensure the backend server is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container home-page">
      {/* ACTIVE GOVERNMENT / POLICE ADVISORY BANNER */}
      {advisories.length > 0 && (
        <aside className="official-advisories-strip">
          <div className="advisory-strip-inner">
            <Radio size={18} className="advisory-siren-icon text-cyan" />
            <div className="advisory-marquee">
              <strong>Official Traffic Advisory:</strong>{" "}
              {advisories.map((a, i) => (
                <span key={a._id || i} className="advisory-pill-item">
                  <span className={`adv-tag tag-${(a.severity || "medium").toLowerCase()}`}>
                    [{a.severity || "INFO"}]
                  </span>{" "}
                  {a.title} — {a.message}
                  {i < advisories.length - 1 ? " • " : ""}
                </span>
              ))}
            </div>
            <Link to="/contact" className="advisory-action-link">
              View Emergency Numbers
            </Link>
          </div>
        </aside>
      )}

      {/* FUTURISTIC LIVE TELEMETRY TICKER */}
      <div className="cyber-telemetry-ticker">
        <div className="telemetry-pill">
          <span className="telemetry-dot pulse-emerald" />
          <span className="telemetry-label">Grid Sync:</span>
          <strong>{liveClock} IST</strong>
        </div>
        <div className="telemetry-pill">
          <Database size={13} className="text-cyan" />
          <span className="telemetry-label">MongoDB Atlas:</span>
          <Link to="/database" className="ticker-link">
            {liveFeed?.totalTrafficRecords?.toLocaleString() || "9,240"}+ Records •{" "}
            {liveFeed?.totalSegments || 10} Corridors
          </Link>
        </div>
        <div className="telemetry-pill">
          <Activity size={13} className="text-rose" />
          <span className="telemetry-label">Active Hazards:</span>
          <Link to="/report" className="ticker-link">
            {liveFeed?.activeIncidents ?? "Live"} Active
          </Link>
        </div>
        <div className="telemetry-pill">
          <Cpu size={13} className="text-purple" />
          <span className="telemetry-label">AI Engine:</span>
          <span>4-Factor Stability Model</span>
        </div>
        <div className="telemetry-pill">
          <ShieldCheck size={13} className="text-amber" />
          {isAuthenticated && user ? (
            <Link to="/profile" className="ticker-link">
              {user.name?.split(" ")[0]} ({user.verificationStatus || "VERIFIED"})
            </Link>
          ) : (
            <Link to="/login" className="ticker-link">
              OTP + CAPTCHA Auth Active
            </Link>
          )}
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-badge">
          <Sparkles size={14} className="hero-sparkle-anim text-cyan" />
          <span>Real-Time Pan-India Smart Mobility &amp; Air Quality Grid</span>
        </div>

        <h1 className="hero-title">
          Intelligent Highway Routing &amp; <br />
          <span className="gradient-text-shimmer">Dynamic Corridor Stability</span>
        </h1>

        <p className="hero-subtitle">
          Powered by live MongoDB Atlas telemetry ({liveFeed?.totalTrafficRecords?.toLocaleString() || "9,240"}+ traffic records),
          Open-Meteo weather &amp; AQI sensors, OSRM routing, and Overpass emergency POI radar.
        </p>

        {/* CTA QUICK STRIP */}
        <div className="hero-quick-cta-row">
          <button
            type="button"
            className="hero-radar-btn"
            onClick={handleScanMyGpsEmergency}
            disabled={scanningPoi}
          >
            <Radar size={15} className={scanningPoi ? "spin-icon" : ""} />
            <span>{scanningPoi ? "Scanning Overpass POI Grid..." : "Scan Nearby Hospitals, Police & Fuel"}</span>
          </button>

          {!isAuthenticated ? (
            <Link to="/login?mode=register" className="hero-auth-cta">
              <UserCheck size={15} /> Create OTP-Verified Account
            </Link>
          ) : (
            <Link to="/profile" className="hero-auth-cta">
              <UserCheck size={15} /> Open My Profile &amp; Security
            </Link>
          )}
        </div>
      </section>

      {/* SEARCH AND WEATHER ROW */}
      <div className="home-top-grid">
        <div className="search-col">
          <SearchBox
            from={from}
            to={to}
            setFrom={setFrom}
            setTo={setTo}
            onSearch={handleSearch}
            loading={loading}
          />
        </div>

        <div className="weather-col">
          <WeatherWidget initialCity="Delhi" />
        </div>
      </div>

      {/* LIVE MULTI-CITY WEATHER & AQI PULSE GRID (100% REAL-TIME) */}
      {liveFeed?.liveWeatherGrid && liveFeed.liveWeatherGrid.length > 0 && (
        <section className="live-city-weather-strip">
          <div className="strip-head-label">
            <Clock size={13} className="text-cyan" />
            <span>Live Multi-City Weather &amp; AQI Feed (Open-Meteo API):</span>
          </div>
          <div className="live-city-cards-row">
            {liveFeed.liveWeatherGrid.map((cw) => (
              <div key={cw.city} className="mini-city-weather-card">
                <div className="mini-cw-top">
                  <strong>{cw.city}</strong>
                  <span>{cw.icon} {cw.temperature}°C</span>
                </div>
                <div className="mini-cw-bottom">
                  <span>{cw.condition}</span>
                  {cw.aqi && (
                    <span
                      className="mini-aqi-pill"
                      style={{
                        color: cw.aqi.color,
                        borderColor: `${cw.aqi.color}55`,
                        backgroundColor: `${cw.aqi.color}1a`
                      }}
                    >
                      AQI {cw.aqi.usAqi}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* NEARBY EMERGENCY SERVICES RADAR RESULTS (OPENSTREETMAP OVERPASS API) */}
      {nearbyPoi && nearbyPoi.services && nearbyPoi.services.length > 0 && (
        <section className="nearby-radar-section portal-card">
          <div className="portal-card-header" style={{ marginBottom: 14 }}>
            <div className="header-title-group">
              <Radar size={20} className="text-emerald" />
              <div>
                <h2 style={{ fontSize: 16 }}>
                  Live Nearby Emergency &amp; Roadside Assistance ({nearbyPoi.count} Found)
                </h2>
                <p>Fetched live from {nearbyPoi.source}</p>
              </div>
            </div>
            <span className="live-pulse-badge emerald">
              Center: {nearbyPoi.center.latitude.toFixed(3)}°N, {nearbyPoi.center.longitude.toFixed(3)}°E
            </span>
          </div>

          <div className="nearby-poi-grid">
            {nearbyPoi.services.slice(0, 9).map((srv) => (
              <div key={srv.id} className="nearby-poi-card">
                <span className={`poi-icon-tag poi-${srv.category.toLowerCase()}`}>
                  {srv.category === "HOSPITAL" && <Hospital size={12} />}
                  {srv.category === "POLICE" && <Shield size={12} />}
                  {srv.category === "FUEL" && <Fuel size={12} />}
                  {srv.category}
                </span>
                <strong>{srv.name}</strong>
                <div className="poi-card-foot">
                  <span>
                    {Number(srv.latitude).toFixed(3)}, {Number(srv.longitude).toFixed(3)}
                  </span>
                  {srv.phone && <a href={`tel:${srv.phone}`}>{srv.phone}</a>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="error-banner cyber-error-banner" role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>Routing Alert</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <LoadingSpinner message="Evaluating candidate routes, querying MongoDB traffic memory, and computing Stability Scores..." />
      )}

      {/* ROUTE RESULTS & MAP SECTION */}
      {!loading && routes.length > 0 && (
        <section className="results-wrapper">
          <div className="results-grid">
            <div className="map-column">
              <MapView
                routes={routes}
                locations={locations}
                selectedRouteId={selectedRouteId}
                onSelectRoute={(id) => setSelectedRouteId(id)}
              />
            </div>

            <div className="routes-column">
              <RouteList
                routes={routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={(id) => setSelectedRouteId(id)}
              />
            </div>
          </div>
        </section>
      )}

      {/* WHY FLOWSENSE EXPLAINER WITH GLOWING CYBER CARDS */}
      <section className="features-showcase">
        <h2>Engineered for Commuters, Police &amp; Municipalities</h2>
        <div className="features-grid">
          <div className="feature-card cyber-hover-card">
            <span className="feature-icon">🔐</span>
            <h3>Enterprise OTP + CAPTCHA Auth</h3>
            <p>
              Confidential signups with 6-digit OTP email verification, SVG human CAPTCHA, 12-round bcrypt hard passwords, and Admin verification for Police officers.
            </p>
            <div className="card-edge-glow" />
          </div>

          <div className="feature-card cyber-hover-card">
            <span className="feature-icon">🎯</span>
            <h3>Predictive Route Stability</h3>
            <p>
              Combines delay risk, RMSE speed variability, active photo-verified hazards, and real-time precipitation + AQI into an explainable 0–100 Stability Score.
            </p>
            <div className="card-edge-glow" />
          </div>

          <div className="feature-card cyber-hover-card">
            <span className="feature-icon">🚑</span>
            <h3>Real-Time Overpass &amp; Dispatch</h3>
            <p>
              Integrates Open-Meteo weather/AQI, BigDataCloud reverse geocoding, and OpenStreetMap Overpass emergency POIs alongside Traffic Police Green Corridors.
            </p>
            <div className="card-edge-glow" />
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
