import { useState, useEffect } from "react";
import MapView from "../components/MapView";
import SearchBox from "../components/SearchBox";
import RouteList from "../components/RouteList";
import WeatherWidget from "../components/WeatherWidget";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  searchRoutes,
  fetchAdvisories,
  fetchLiveFeed,
  fetchNearbyServices,
  fetchAllIncidentStatuses
} from "../api";
import { useAuth } from "../context/AuthContext";
import { useCity } from "../context/CityContext";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Radio,
  Sparkles,
  Activity,
  ShieldCheck,
  Hospital,
  Shield,
  Fuel,
  Radar,
  Clock,
  UserCheck,
  MapPin
} from "lucide-react";

function Home() {
  const { user, isAuthenticated } = useAuth();
  const { activeCity, activeState, cityCoords, cityMeta, openCityModal } = useCity();

  const [from, setFrom] = useState(
    () => cityMeta?.defaultFrom || "Connaught Place (Rajiv Chowk), New Delhi"
  );
  const [to, setTo] = useState(
    () => cityMeta?.defaultTo || "Indira Gandhi International Airport, Terminal 3, New Delhi"
  );
  const [prevCityKey, setPrevCityKey] = useState(`${activeState}:${activeCity}`);

  // Synchronize default route inputs whenever active city changes
  const currentCityKey = `${activeState}:${activeCity}`;
  if (currentCityKey !== prevCityKey) {
    setPrevCityKey(currentCityKey);
    if (cityMeta) {
      setFrom(cityMeta.defaultFrom);
      setTo(cityMeta.defaultTo);
    } else {
      setFrom(`${activeCity}, ${activeState}`);
      setTo(`${activeCity} Airport / Central Station, ${activeState}`);
    }
  }

  const [routes, setRoutes] = useState([]);
  const [locations, setLocations] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advisories, setAdvisories] = useState([]);

  const [liveFeed, setLiveFeed] = useState(null);
  const [cityIncidents, setCityIncidents] = useState([]);
  const [nearbyPoi, setNearbyPoi] = useState(null);
  const [scanningPoi, setScanningPoi] = useState(false);
  const [liveClock, setLiveClock] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    let mounted = true;
    fetchAdvisories()
      .then((res) => {
        if (mounted && res.success && Array.isArray(res.data)) {
          setAdvisories(res.data);
        }
      })
      .catch(() => {});

    function refreshCityData() {
      fetchLiveFeed(activeCity)
        .then((res) => {
          if (mounted && res.success && res.data) {
            setLiveFeed(res.data);
          }
        })
        .catch(() => {});

      fetchAllIncidentStatuses(activeCity)
        .then((res) => {
          if (mounted && res.success && Array.isArray(res.data)) {
            setCityIncidents(res.data.slice(0, 6));
          }
        })
        .catch(() => {});
    }

    refreshCityData();
    const feedInterval = setInterval(refreshCityData, 45000);
    const clockInterval = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString());
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(feedInterval);
      clearInterval(clockInterval);
    };
  }, [activeCity]);

  async function handleScanNearby(lat, lon) {
    setScanningPoi(true);
    try {
      const res = await fetchNearbyServices(lat, lon, 5000);
      if (res.success && res.data) {
        setNearbyPoi(res.data);
      }
    } catch {
      // ignore error
    } finally {
      setScanningPoi(false);
    }
  }

  function handleScanActiveCityEmergency() {
    if (cityCoords?.lat && cityCoords?.lon) {
      handleScanNearby(cityCoords.lat, cityCoords.lon);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => handleScanNearby(pos.coords.latitude, pos.coords.longitude),
        () => handleScanNearby(28.6139, 77.2090),
        { timeout: 6000 }
      );
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
        setLocations({ from: data.from, to: data.to });
        const rec = data.routes.find((r) => r.recommended) || data.routes[0];
        setSelectedRouteId(rec?.id || 1);

        if (data.from?.latitude && data.from?.longitude) {
          handleScanNearby(data.from.latitude, data.from.longitude);
        }
      } else {
        setError(data.message || "No driving routes were found between these locations.");
      }
    } catch {
      setError("Unable to reach routing service right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container home-page">
      {/* ACTIVE TRAFFIC ADVISORIES BANNER */}
      {advisories.length > 0 && (
        <aside className="official-advisories-strip">
          <div className="advisory-strip-inner">
            <Radio size={18} className="advisory-siren-icon text-cyan" />
            <div className="advisory-marquee">
              <strong>Live Traffic Advisory:</strong>{" "}
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
              Emergency Helplines
            </Link>
          </div>
        </aside>
      )}

      {/* CITY-AWARE LIVE TELEMETRY STRIP */}
      <div className="cyber-telemetry-ticker">
        <div className="telemetry-pill">
          <span className="telemetry-dot pulse-emerald" />
          <span className="telemetry-label">Active Region:</span>
          <button
            type="button"
            className="ticker-city-btn"
            onClick={openCityModal}
          >
            <MapPin size={12} /> {activeCity}, {activeState}
          </button>
        </div>
        <div className="telemetry-pill">
          <Clock size={13} className="text-cyan" />
          <span className="telemetry-label">IST Time:</span>
          <strong>{liveClock}</strong>
        </div>
        <div className="telemetry-pill">
          <Activity size={13} className="text-rose" />
          <span className="telemetry-label">{activeCity} Hazards:</span>
          <Link to="/report" className="ticker-link">
            {liveFeed?.cityActiveIncidents ?? cityIncidents.length} Active
          </Link>
        </div>
        <div className="telemetry-pill">
          <ShieldCheck size={13} className="text-amber" />
          {isAuthenticated && user ? (
            <Link to="/profile" className="ticker-link">
              {user.name?.split(" ")[0]} • My Profile
            </Link>
          ) : (
            <Link to="/login" className="ticker-link">
              Sign In / Verify Email
            </Link>
          )}
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-badge">
          <Sparkles size={14} className="hero-sparkle-anim text-cyan" />
          <span>Live Smart Mobility Network — All 28 States &amp; 8 Union Territories</span>
        </div>

        <h1 className="hero-title">
          Real-Time Route Intelligence for <br />
          <span className="gradient-text-shimmer">{activeCity}, {activeState}</span>
        </h1>

        <p className="hero-subtitle">
          Compare live routes with dynamic congestion alerts, Air Quality Index (AQI), weather
          visibility warnings, and citizen hazard photos across your city.
        </p>

        <div className="hero-quick-cta-row">
          <button
            type="button"
            className="hero-radar-btn"
            onClick={handleScanActiveCityEmergency}
            disabled={scanningPoi}
          >
            <Radar size={15} className={scanningPoi ? "spin-icon" : ""} />
            <span>
              {scanningPoi
                ? `Scanning ${activeCity} Services...`
                : `Nearby Hospitals, Police & Fuel in ${activeCity}`}
            </span>
          </button>

          {!isAuthenticated ? (
            <Link to="/login?mode=register" className="hero-auth-cta">
              <UserCheck size={15} /> Create Account
            </Link>
          ) : (
            <Link to="/profile" className="hero-auth-cta">
              <UserCheck size={15} /> My Profile &amp; Security
            </Link>
          )}
        </div>
      </section>

      {/* SEARCH & WEATHER ROW */}
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
          <WeatherWidget />
        </div>
      </div>

      {/* LIVE CITY WEATHER & AQI PULSE GRID */}
      {liveFeed?.liveWeatherGrid && liveFeed.liveWeatherGrid.length > 0 && (
        <section className="live-city-weather-strip">
          <div className="strip-head-label">
            <Clock size={13} className="text-cyan" />
            <span>Live City Weather &amp; Air Quality:</span>
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

      {/* CITY-SPECIFIC ACTIVE ROAD HAZARDS SUMMARY */}
      <section className="city-hazards-spotlight portal-card" style={{ marginBottom: 24 }}>
        <div className="portal-card-header" style={{ marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 17 }}>
              Live Reported Road Hazards in {activeCity} ({cityIncidents.length})
            </h2>
            <p>Active traffic incidents, roadblocks, and waterlogging reported in your selected city.</p>
          </div>
          <Link to="/report" className="btn-add-inline" style={{ textDecoration: "none" }}>
            + Report Hazard in {activeCity}
          </Link>
        </div>

        {cityIncidents.length === 0 ? (
          <p style={{ color: "#94a3b8", margin: 0, fontSize: 13 }}>
            No active road hazards reported in {activeCity} right now. Drive safely!
          </p>
        ) : (
          <div className="community-hazards-grid">
            {cityIncidents.map((inc) => (
              <div key={inc._id} className="my-report-card">
                <div className="my-report-top">
                  <span className="incident-type-tag">{inc.type}</span>
                  <span className={`severity-tag sev-${(inc.severity || "medium").toLowerCase()}`}>
                    {inc.severity}
                  </span>
                  <span style={{
                    padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                    background: inc.status === "ACTIVE" ? "#ef444422" : inc.status === "RESOLVED" ? "#22c55e22" : "#3b82f622",
                    color: inc.status === "ACTIVE" ? "#ef4444" : inc.status === "RESOLVED" ? "#22c55e" : "#3b82f6"
                  }}>{inc.status || "ACTIVE"}</span>
                </div>
                <h4>{inc.roadName || inc.roadId}</h4>
                <p className="report-card-loc">
                  <MapPin size={12} /> {inc.location || inc.city}
                </p>
                {inc.description && <p className="report-card-desc">{inc.description}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* NEARBY EMERGENCY SERVICES */}
      {nearbyPoi && nearbyPoi.services && nearbyPoi.services.length > 0 && (
        <section className="nearby-radar-section portal-card">
          <div className="portal-card-header" style={{ marginBottom: 14 }}>
            <div className="header-title-group">
              <Radar size={20} className="text-emerald" />
              <div>
                <h2 style={{ fontSize: 16 }}>
                  Nearby Hospitals, Police &amp; Fuel Stations ({nearbyPoi.count} Found)
                </h2>
                <p>Real-time emergency services near your active location</p>
              </div>
            </div>
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
            <strong>Route Notice</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <LoadingSpinner message={`Calculating live routes and stability scores for ${activeCity}...`} />
      )}

      {/* ROUTE RESULTS & MAP */}
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

      {/* CAPABILITIES SHOWCASE */}
      <section className="features-showcase">
        <h2>Real-Time Smart Mobility Across India</h2>
        <div className="features-grid">
          <div className="feature-card cyber-hover-card">
            <span className="feature-icon">🧭</span>
            <h3>Pan-India Live Navigation</h3>
            <p>
              Calculate safest routes across every Indian state and city with live place suggestions,
              peak-hour traffic adjustments, and stability scoring.
            </p>
            <div className="card-edge-glow" />
          </div>

          <div className="feature-card cyber-hover-card">
            <span className="feature-icon">🌦️</span>
            <h3>Weather, AQI &amp; Hazard Photos</h3>
            <p>
              Stay ahead of heavy rain, dense fog, high AQI zones, and citizen-reported hazards
              with live photo evidence and community verification.
            </p>
            <div className="card-edge-glow" />
          </div>

          <div className="feature-card cyber-hover-card">
            <span className="feature-icon">🚓</span>
            <h3>Verified Police Response</h3>
            <p>
              Verified traffic officers dispatch emergency green corridors, broadcast live city
              advisories, and respond rapidly to active road hazards.
            </p>
            <div className="card-edge-glow" />
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
