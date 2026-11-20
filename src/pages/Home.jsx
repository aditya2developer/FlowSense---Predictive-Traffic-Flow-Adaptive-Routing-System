import { useState, useEffect } from "react";
import MapView from "../components/MapView";
import SearchBox from "../components/SearchBox";
import RouteList from "../components/RouteList";
import WeatherWidget from "../components/WeatherWidget";
import LoadingSpinner from "../components/LoadingSpinner";
import { searchRoutes, fetchAdvisories } from "../api";
import { AlertCircle, Radio, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

function Home() {
  const { user, role } = useAuth();

  const [from, setFrom] = useState("Connaught Place, New Delhi");
  const [to, setTo] = useState("Indira Gandhi International Airport, New Delhi");
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
                <span key={a._id} className="advisory-pill-item">
                  <span className={`adv-tag tag-${a.severity.toLowerCase()}`}>[{a.severity}]</span> {a.title} — {a.message}
                  {i < advisories.length - 1 ? " • " : ""}
                </span>
              ))}
            </div>
            {role === "AUTHORITY" && (
              <Link to="/authority" className="manage-adv-link">Manage Advisories →</Link>
            )}
          </div>
        </aside>
      )}

      {/* AMBIENT HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} /> Next-Gen AI Navigation &amp; Traffic Memory
          </div>
          <h1>Find the Best Route with Traffic Memory</h1>
          <p>
            Standard GPS guides you by what traffic is doing <em>right now</em>.
            FlowSense analyzes thousands of historical observations to predict impending congestion spikes and score route reliability.
          </p>

          <WeatherWidget initialCity="Delhi" />
        </div>
      </section>

      {/* USER SESSION STATUS STRIP (NO SWITCHING WITHOUT LOGIN) */}
      {user && (
        <div className="active-user-greeting-strip">
          <div className="greeting-inner">
            <span className="greeting-badge">
              {role === "ADMIN" ? "🛡️ System Administrator" : role === "AUTHORITY" ? "🚔 Traffic Police Command" : "🚗 Citizen Commuter"}
            </span>
            <span className="greeting-text">
              Logged in as: <strong>{user.name}</strong> ({user.email})
              {user.department && ` • ${user.department}`}
            </span>
          </div>
        </div>
      )}

      <section className="search-section">
        <SearchBox
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
          onSearch={handleSearch}
          loading={loading}
        />

        {error && (
          <div className="search-error-banner" role="alert">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}
      </section>

      {loading && (
        <LoadingSpinner message="Evaluating candidate routes, querying MongoDB traffic memory, and computing Stability Scores..." />
      )}

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

      {/* WHY FLOWSENSE EXPLAINER */}
      <section className="features-showcase">
        <h2>Engineered for Commuters, Police &amp; Municipalities</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">🧠</span>
            <h3>Traffic Memory Engine</h3>
            <p>
              Stores hundreds of time-series observations by day of week and hour to identify recurring bottlenecks that live GPS misses.
            </p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">🎯</span>
            <h3>Predictive Route Stability</h3>
            <p>
              Combines delay risk, speed variability, active hazards, and weather into an explainable 0–100 score.
            </p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">🚓</span>
            <h3>Authority Dispatch Hub</h3>
            <p>
              Enables traffic police to synchronize emergency green corridors, broadcast driver alerts, and clear road hazards in real time.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
