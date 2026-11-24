import { useState, useEffect } from "react";
import MapView from "../components/MapView";
import SearchBox from "../components/SearchBox";
import RouteList from "../components/RouteList";
import WeatherWidget from "../components/WeatherWidget";
import LoadingSpinner from "../components/LoadingSpinner";
import { searchRoutes, fetchAdvisories } from "../api";
import { AlertCircle, Radio, Sparkles, Activity, ShieldCheck, Database, Zap, Cpu } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

function Home() {
  const { user, role } = useAuth();

  const [from, setFrom] = useState("Connaught Place (Rajiv Chowk), New Delhi");
  const [to, setTo] = useState("Indira Gandhi International Airport, Terminal 3, New Delhi");
  const [routes, setRoutes] = useState([]);
  const [locations, setLocations] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advisories, setAdvisories] = useState([]);

  useEffect(() => {
    fetchAdvisories().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setAdvisories(res.data);
      }
    });
  }, []);

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
      } else {
        setError(data.message || "No driving routes were found for these locations.");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(
        "Unable to connect to FlowSense backend. Please ensure the backend server is running on port 5000."
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

      {/* FUTURISTIC GLOWING TELEMETRY TICKER */}
      <div className="cyber-telemetry-ticker">
        <div className="telemetry-pill">
          <span className="telemetry-dot pulse-emerald" />
          <span className="telemetry-label">Grid Status:</span>
          <strong>Pan-India Online</strong>
        </div>
        <div className="telemetry-pill">
          <Database size={13} className="text-cyan" />
          <span className="telemetry-label">MongoDB Atlas:</span>
          <Link to="/database" className="ticker-link">9,265+ Records</Link>
        </div>
        <div className="telemetry-pill">
          <Cpu size={13} className="text-purple" />
          <span className="telemetry-label">AI Engine:</span>
          <span>4-Factor Stability Model</span>
        </div>
        <div className="telemetry-pill">
          <ShieldCheck size={13} className="text-amber" />
          <span className="telemetry-label">Helplines:</span>
          <span>112 / 1033 (24x7 Active)</span>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-badge">
          <Sparkles size={14} className="hero-sparkle-anim text-cyan" />
          <span>Next-Generation Predictive Mobility Grid</span>
        </div>

        <h1 className="hero-title">
          Intelligent Highway Routing &amp; <br />
          <span className="gradient-text-shimmer">Dynamic Corridor Stability</span>
        </h1>

        <p className="hero-subtitle">
          FlowSense analyzes 9,240+ time-series traffic records in MongoDB Atlas, combining historical speed variability,
          meteorological sensors, and live incident hazards to identify the safest, most resilient route.
        </p>
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
          <WeatherWidget defaultCity="Delhi" />
        </div>
      </div>

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
            <span className="feature-icon">🧠</span>
            <h3>Traffic Memory Engine</h3>
            <p>
              Stores hundreds of time-series observations in MongoDB by day of week and hour to identify recurring bottlenecks that live GPS engines miss.
            </p>
            <div className="card-edge-glow" />
          </div>

          <div className="feature-card cyber-hover-card">
            <span className="feature-icon">🎯</span>
            <h3>Predictive Route Stability</h3>
            <p>
              Combines delay risk, RMSE speed variability, active hazards, and real-time precipitation into an explainable 0–100 Stability Score.
            </p>
            <div className="card-edge-glow" />
          </div>

          <div className="feature-card cyber-hover-card">
            <span className="feature-icon">🚑</span>
            <h3>Authority Dispatch Hub</h3>
            <p>
              Enables traffic police to synchronize emergency green corridors, broadcast civilian siren alerts, and clear road hazards in real time.
            </p>
            <div className="card-edge-glow" />
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
