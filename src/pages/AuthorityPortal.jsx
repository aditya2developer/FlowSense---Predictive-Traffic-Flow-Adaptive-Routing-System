import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  fetchEnforcementStats,
  fetchIncidents,
  resolveIncident,
  fetchAdvisories,
  createAdvisory,
  expireAdvisory,
  dispatchGreenCorridor
} from "../api";
import { useAuth } from "../context/AuthContext";
import { useCity } from "../context/CityContext";
import { soundAlert } from "../utils/soundAlert";
import {
  Radio,
  Ambulance,
  AlertTriangle,
  Send,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Building2,
  FileBadge2
} from "lucide-react";

const POLICE_JURISDICTIONS = [
  "All Cities",
  "Delhi NCR",
  "Mumbai",
  "Bengaluru",
  "Chandigarh",
  "Jalandhar / Punjab",
  "Kolkata",
  "Chennai",
  "Hyderabad",
  "Pune"
];

const CITY_CORRIDOR_PRESETS = {
  "Delhi NCR": {
    from: "AIIMS New Delhi, Ansari Nagar",
    to: "Indira Gandhi International Airport, Terminal 3"
  },
  "Mumbai": {
    from: "Lilavati Hospital, Bandra West, Mumbai",
    to: "Nariman Point Emergency Center, South Mumbai"
  },
  "Bengaluru": {
    from: "Manipal Hospital, Old Airport Road, Bengaluru",
    to: "ITPB Whitefield Tech Zone, Bengaluru"
  },
  "Chandigarh": {
    from: "PGI Chandigarh, Sector 12",
    to: "Chandigarh International Airport, Mohali"
  },
  "Jalandhar / Punjab": {
    from: "Civil Hospital, Jalandhar, Punjab",
    to: "Lovely Professional University, Phagwara, Punjab"
  }
};

function AuthorityPortal() {
  const { user } = useAuth();
  const { activeCity, cityMeta } = useCity();

  const [selectedJurisdiction, setSelectedJurisdiction] = useState(() => activeCity || "All Cities");
  const [prevActiveCity, setPrevActiveCity] = useState(activeCity);
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [advisories, setAdvisories] = useState([]);
  const [, setLoading] = useState(true);

  // Green Corridor State
  const [gcFrom, setGcFrom] = useState(() => cityMeta?.defaultFrom || "AIIMS New Delhi, Ansari Nagar");
  const [gcTo, setGcTo] = useState(() => cityMeta?.defaultTo || "Indira Gandhi International Airport, Terminal 3");

  if (activeCity && activeCity !== prevActiveCity) {
    setPrevActiveCity(activeCity);
    setSelectedJurisdiction(activeCity);
    if (cityMeta) {
      setGcFrom(cityMeta.defaultFrom);
      setGcTo(cityMeta.defaultTo);
    }
  }
  const [vehicleType, setVehicleType] = useState("AMBULANCE");
  const [priorityReason, setPriorityReason] = useState("Critical Trauma Patient Transfer");
  const [gcResult, setGcResult] = useState(null);
  const [gcLoading, setGcLoading] = useState(false);

  // New Advisory State
  const [advTitle, setAdvTitle] = useState("");
  const [advMessage, setAdvMessage] = useState("");
  const [advSeverity, setAdvSeverity] = useState("WARNING");
  const [advRoad, setAdvRoad] = useState("All City Sectors");
  const [advSubmitting, setAdvSubmitting] = useState(false);

  async function loadData(city = selectedJurisdiction) {
    setLoading(true);
    try {
      const [statsRes, incRes, advRes] = await Promise.all([
        fetchEnforcementStats(city).catch(() => ({ success: false })),
        fetchIncidents(city).catch(() => ({ success: false, data: [] })),
        fetchAdvisories().catch(() => ({ success: false, data: [] }))
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (incRes.success) setIncidents(incRes.data || []);
      if (advRes.success) setAdvisories(advRes.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchEnforcementStats(selectedJurisdiction).catch(() => ({ success: false })),
      fetchIncidents(selectedJurisdiction).catch(() => ({ success: false, data: [] })),
      fetchAdvisories().catch(() => ({ success: false, data: [] }))
    ])
      .then(([statsRes, incRes, advRes]) => {
        if (!active) return;
        if (statsRes.success) setStats(statsRes.stats);
        if (incRes.success) setIncidents(incRes.data || []);
        if (advRes.success) setAdvisories(advRes.data || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedJurisdiction]);

  // Real-time polling every 6 seconds to fetch new hazards in active jurisdiction
  useEffect(() => {
    const interval = setInterval(() => {
      fetchIncidents(selectedJurisdiction).then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setIncidents(res.data);
        }
      });
      fetchEnforcementStats(selectedJurisdiction).then((res) => {
        if (res.success && res.stats) {
          setStats(res.stats);
        }
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [selectedJurisdiction]);

  function handleJurisdictionChange(city) {
    setSelectedJurisdiction(city);
    if (CITY_CORRIDOR_PRESETS[city]) {
      setGcFrom(CITY_CORRIDOR_PRESETS[city].from);
      setGcTo(CITY_CORRIDOR_PRESETS[city].to);
    }
  }

  async function handleDispatchGreenCorridor(e) {
    e.preventDefault();
    setGcLoading(true);
    setGcResult(null);
    try {
      const res = await dispatchGreenCorridor({
        from: gcFrom,
        to: gcTo,
        vehicleType,
        priorityReason
      });
      if (res.success) {
        setGcResult(res);
        // Fire global siren alert for police
        soundAlert.playSiren(10);
        window.dispatchEvent(
          new CustomEvent("flowsense-emergency-alert", {
            detail: {
              id: `gc-${res.corridorId}`,
              type: "GREEN_CORRIDOR",
              title: `🚨 EMERGENCY GREEN CORRIDOR: ${vehicleType}`,
              roadName: "Priority Emergency Corridor",
              city: selectedJurisdiction,
              location: `${res.from?.displayName?.split(',')[0]} → ${res.to?.displayName?.split(',')[0]}`,
              severity: "CRITICAL",
              description: `Emergency vehicle routing activated. Distance: ${res.distanceKm} km. Expedited arrival: ${res.expeditedDurationMin} min (${res.timeSavedMin} min saved). ${res.trafficSignalPreemption}.`,
              reportedBy: `${user?.name || "Traffic Dispatch"} (Badge: ${user?.badgeNumber || "TP-HQ"})`,
              recommendation: "Preempt all traffic signals along corridor to continuous green. Station interceptor at major intersections.",
              time: new Date().toLocaleTimeString()
            }
          })
        );
        loadData(selectedJurisdiction);
      } else {
        alert(res.message || "Failed to dispatch green corridor.");
      }
    } catch {
      alert("Failed to communicate with emergency routing server.");
    } finally {
      setGcLoading(false);
    }
  }

  async function handleResolveIncident(id) {
    try {
      const res = await resolveIncident(id);
      if (res.success) {
        setIncidents((prev) => prev.filter((i) => i._id !== id));
        loadData(selectedJurisdiction);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleBroadcastAdvisory(e) {
    e.preventDefault();
    if (!advTitle.trim() || !advMessage.trim()) return;
    setAdvSubmitting(true);
    try {
      const res = await createAdvisory({
        title: advTitle,
        message: advMessage,
        severity: advSeverity,
        affectedRoad: advRoad
      });
      if (res.success) {
        setAdvTitle("");
        setAdvMessage("");
        loadData(selectedJurisdiction);
      }
    } finally {
      setAdvSubmitting(false);
    }
  }

  async function handleExpireAdvisory(id) {
    try {
      const res = await expireAdvisory(id);
      if (res.success) {
        setAdvisories((prev) => prev.filter((a) => a._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  const isPolicePending =
    user?.role === "AUTHORITY" &&
    user?.verificationStatus &&
    user.verificationStatus !== "VERIFIED";

  if (isPolicePending) {
    return (
      <div className="authority-portal-wrapper">
        <div className="portal-card" style={{ maxWidth: 660, margin: "40px auto", textAlign: "center" }}>
          <div className="role-icon-box" style={{ borderColor: "#f59e0b", marginBottom: 16 }}>
            <Clock size={28} color="#f59e0b" />
          </div>
          <span className="verified-chip chip-status-pending" style={{ marginBottom: 12 }}>
            <FileBadge2 size={13} /> Status: {user.verificationStatus}
          </span>
          <h1 style={{ fontSize: 24, margin: "8px 0 12px" }}>
            Police Command Access Awaiting Admin Verification
          </h1>
          <p style={{ color: "#94a3b8", lineHeight: 1.6 }}>
            Welcome Officer <strong>{user.name}</strong> (Badge: <code>{user.badgeNumber || "Submitted"}</code>).
            For national traffic security, newly registered Police accounts must have their
            Official Badge &amp; ID Proof verified by a Root Administrator before dispatching Green
            Corridors or Emergency Broadcasts.
          </p>
          {user.verificationNotes && (
            <div className="verification-rejected-callout" style={{ textAlign: "left", marginTop: 14 }}>
              <strong>Admin Remarks:</strong> {user.verificationNotes}
            </div>
          )}
          <div style={{ marginTop: 22, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link to="/profile" className="cyber-submit-btn" style={{ textDecoration: "none", width: "auto" }}>
              Check Verification Status &amp; ID Proof
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="authority-portal-wrapper">
      {/* AMBIENT GLOW BANNER */}
      <div className="authority-hero-header">
        <div className="authority-header-content">
          <div className="authority-badge-pill">
            <Radio size={14} className="radar-sweep-icon" /> Official Police Operations &amp; Enforcement Command
          </div>
          <h1>Traffic Police &amp; Authority Command Hub</h1>
          <p>
            Logged in as <strong>{user?.name || "Inspector Rajesh Sharma"}</strong> ({user?.department || "City Traffic Police"}, Badge: {user?.badgeNumber || "TP-8409"})
          </p>
        </div>

        {/* CITY / AREA JURISDICTION SELECTOR */}
        <div className="jurisdiction-selector-container">
          <div className="jurisdiction-label">
            <Building2 size={16} className="text-cyan" />
            <span>Select Jurisdiction Area (Every City Supported):</span>
          </div>
          <div className="jurisdiction-pills">
            {POLICE_JURISDICTIONS.map((city) => (
              <button
                key={city}
                type="button"
                className={`jurisdiction-pill-btn ${selectedJurisdiction === city ? "active-jurisdiction" : ""}`}
                onClick={() => handleJurisdictionChange(city)}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* OPERATIONS STATS STRIP FOR ACTIVE CITY */}
        <div className="authority-stats-strip">
          <div className="authority-stat-card">
            <span className="stat-label">Active Hazards ({selectedJurisdiction})</span>
            <strong className="stat-value text-red">{incidents.length}</strong>
            <span className="stat-sub">Live Telemetry Feed</span>
          </div>

          <div className="authority-stat-card">
            <span className="stat-label">Critical / High Severity</span>
            <strong className="stat-value text-amber">
              {stats?.highSeverityHazards || incidents.filter((i) => i.severity === "HIGH" || i.severity === "CRITICAL").length}
            </strong>
            <span className="stat-sub">Requires Rapid Dispatch</span>
          </div>

          <div className="authority-stat-card">
            <span className="stat-label">Accidents Reported</span>
            <strong className="stat-value text-purple">
              {stats?.accidentsReported || incidents.filter((i) => i.type === "ACCIDENT").length}
            </strong>
            <span className="stat-sub">Interceptor Units Alerted</span>
          </div>

          <div className="authority-stat-card">
            <span className="stat-label">Signal Preemption Grid</span>
            <strong className="stat-value text-cyan">ONLINE</strong>
            <span className="stat-sub">18 Dynamic Speed Radars</span>
          </div>
        </div>
      </div>

      {/* DUAL WORKSPACE LAYOUT */}
      <div className="authority-grid-layout">
        {/* LEFT COLUMN: GREEN CORRIDOR & LIVE HAZARDS */}
        <div className="authority-col-main">
          {/* SECTION 1: EMERGENCY GREEN CORRIDOR DISPATCH */}
          <section className="portal-card gc-card">
            <div className="portal-card-header">
              <div className="header-title-group">
                <Ambulance className="header-icon text-red" size={24} />
                <div>
                  <h2>Emergency Priority Green Corridor Dispatch</h2>
                  <p>Preempt traffic signals and open express lanes for emergency medical/fire transfer in <strong>{selectedJurisdiction}</strong>.</p>
                </div>
              </div>
              <span className="priority-badge">Level 1 Clearance</span>
            </div>

            <form onSubmit={handleDispatchGreenCorridor} className="gc-form">
              <div className="form-row-split">
                <div className="form-group">
                  <label>Emergency Vehicle Type</label>
                  <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                    <option value="AMBULANCE">🚑 Trauma Ambulance (Organ / Critical Patient)</option>
                    <option value="FIRE_BRIGADE">🚒 Fire Tender Dispatch</option>
                    <option value="POLICE_PILOT">🚓 Police Interceptor Pilot Convoy</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority Reason / Case File</label>
                  <input
                    type="text"
                    value={priorityReason}
                    onChange={(e) => setPriorityReason(e.target.value)}
                    placeholder="e.g. Critical Cardiac Transfer"
                    required
                  />
                </div>
              </div>

              <div className="form-row-split" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label>Origin Hospital / Point *</label>
                  <input
                    type="text"
                    value={gcFrom}
                    onChange={(e) => setGcFrom(e.target.value)}
                    placeholder="Origin location"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Destination Medical Center *</label>
                  <input
                    type="text"
                    value={gcTo}
                    onChange={(e) => setGcTo(e.target.value)}
                    placeholder="Destination location"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="gc-submit-btn"
                disabled={gcLoading}
              >
                {gcLoading ? (
                  "Calculating Corridor & Preempting Signals..."
                ) : (
                  <>
                    <Zap size={18} /> Synchronize &amp; Dispatch Green Corridor
                  </>
                )}
              </button>
            </form>

            {/* GREEN CORRIDOR RESULT CARD */}
            {gcResult && (
              <div className="gc-result-box">
                <div className="gc-result-header">
                  <CheckCircle2 size={20} className="text-emerald" />
                  <strong>CORRIDOR {gcResult.corridorId} ACTIVATED &amp; SIGNALS PREEMPTED GREEN</strong>
                </div>

                <div className="gc-metrics-grid">
                  <div className="gc-metric-item">
                    <span>Corridor Distance</span>
                    <strong>{gcResult.distanceKm} km</strong>
                  </div>
                  <div className="gc-metric-item">
                    <span>Normal Travel Time</span>
                    <strong>{gcResult.normalDurationMin} mins</strong>
                  </div>
                  <div className="gc-metric-item">
                    <span>Green Corridor Travel Time</span>
                    <strong className="text-emerald">{gcResult.expeditedDurationMin} mins</strong>
                  </div>
                  <div className="gc-metric-item">
                    <span>Time Saved</span>
                    <strong className="text-cyan">-{gcResult.timeSavedMin} mins (45% Faster)</strong>
                  </div>
                </div>

                <div className="gc-preemption-banner">
                  <ShieldCheck size={18} className="text-emerald" />
                  <span>{gcResult.trafficSignalPreemption} • Dispatched by {gcResult.dispatchedBy}</span>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: LIVE HAZARDS & WHAT POLICE SHOULD DO RECOMMENDATIONS */}
          <section className="portal-card active-hazards-card">
            <div className="portal-card-header">
              <div className="header-title-group">
                <AlertTriangle className="header-icon text-amber" size={22} />
                <div>
                  <h2>Live Incident Reports &amp; Police Action Plans ({selectedJurisdiction})</h2>
                  <p>Real-time citizen &amp; patrol reports with AI-recommended action plans for officers.</p>
                </div>
              </div>
              <span className="live-pulse-badge">Live Sync Active</span>
            </div>

            {incidents.length === 0 ? (
              <div className="empty-hazards-state">
                <CheckCircle2 size={36} className="text-emerald" />
                <p>No active hazards reported in {selectedJurisdiction}. All corridors flowing smoothly.</p>
              </div>
            ) : (
              <div className="authority-table-wrapper">
                <table className="authority-table">
                  <thead>
                    <tr>
                      <th>Hazard Type</th>
                      <th>Corridor &amp; City</th>
                      <th>Severity</th>
                      <th>Details &amp; Landmark</th>
                      <th>What Police Should Do (Action Plan)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((inc) => (
                      <tr key={inc._id}>
                        <td>
                          <span className="incident-type-tag">{inc.type}</span>
                        </td>
                        <td>
                          <strong>{inc.roadName || inc.roadId}</strong>
                          <div className="sub-city-tag">{inc.city || "Jurisdiction"}</div>
                        </td>
                        <td>
                          <span className={`severity-tag sev-${inc.severity?.toLowerCase()}`}>
                            {inc.severity}
                          </span>
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          <div>{inc.description}</div>
                          {inc.location && <div className="location-hint">📍 {inc.location}</div>}
                          <div className="reporter-hint">By {inc.reportedBy} • 👍 {inc.upvotes || 1}</div>
                          {Array.isArray(inc.images) && inc.images.length > 0 && (
                            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                              {inc.images.map((src, i) => (
                                <img key={i} src={src} alt="Evidence" className="admin-inc-thumb" />
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <div className="police-action-plan-cell">
                            <Sparkles size={13} className="text-amber" />
                            <span>{inc.recommendation || "Dispatch nearest patrol bike to verify coordinates and deploy warning cones."}</span>
                          </div>
                        </td>
                        <td>
                          <button
                            className="authority-resolve-action-btn"
                            onClick={() => handleResolveIncident(inc._id)}
                            title="Mark hazard as cleared in database"
                          >
                            ✓ Mark Resolved
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: TRAFFIC ADVISORY BROADCASTER */}
        <div className="authority-col-side">
          <section className="portal-card advisory-broadcast-card">
            <div className="portal-card-header">
              <div className="header-title-group">
                <Radio className="header-icon text-cyan" size={22} />
                <div>
                  <h2>Broadcast Citizen Advisory</h2>
                  <p>Issue immediate alerts to all civilian GPS navigation feeds in <strong>{selectedJurisdiction}</strong>.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleBroadcastAdvisory} className="advisory-form">
              <div className="form-group">
                <label>Alert Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Severe Fog & Diversion on Expressway"
                  value={advTitle}
                  onChange={(e) => setAdvTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Affected Road Corridor</label>
                <select value={advRoad} onChange={(e) => setAdvRoad(e.target.value)}>
                  <option value="NH-48 Delhi-Gurgaon Expressway (CP to IGI Airport)">NH-48 Delhi-Gurgaon Expressway</option>
                  <option value="Ring Road & Barapullah Elevated (Delhi)">Ring Road &amp; Barapullah (Delhi)</option>
                  <option value="Bandra-Worli Sea Link & Western Arterial (Mumbai)">Bandra-Worli Sea Link (Mumbai)</option>
                  <option value="Outer Ring Road & Marathahalli Tech Corridor (Bengaluru)">Outer Ring Road (Bengaluru)</option>
                  <option value="Airport Road PR-7 & Himalayan Arterial (Chandigarh)">Airport Road PR-7 (Chandigarh)</option>
                  <option value="GT Road / NH-44 Highway Corridor (Jalandhar)">GT Road / NH-44 Corridor (Jalandhar)</option>
                  <option value="All City Sectors">All City Sectors (National Broadcast)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Severity Level</label>
                <select value={advSeverity} onChange={(e) => setAdvSeverity(e.target.value)}>
                  <option value="INFO">ℹ️ General Traffic Advisory (Info)</option>
                  <option value="WARNING">⚠️ Major Delay Warning</option>
                  <option value="CRITICAL">🚨 Critical Road Block / Emergency</option>
                </select>
              </div>

              <div className="form-group">
                <label>Detailed Message for Drivers *</label>
                <textarea
                  rows={3}
                  placeholder="Provide detour instructions or speed reduction advisory..."
                  value={advMessage}
                  onChange={(e) => setAdvMessage(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="advisory-submit-btn"
                disabled={advSubmitting}
              >
                {advSubmitting ? "Transmitting..." : <><Send size={16} /> Broadcast to Drivers</>}
              </button>
            </form>

            {/* ACTIVE ADVISORIES LIST */}
            <div className="active-advisories-stack">
              <h3>Currently Active Broadcasts ({advisories.length})</h3>
              {advisories.length === 0 ? (
                <p className="no-advisories-text">No active broadcasts.</p>
              ) : (
                advisories.map((adv) => (
                  <div key={adv._id} className={`advisory-item severity-${adv.severity.toLowerCase()}`}>
                    <div className="advisory-item-header">
                      <strong>{adv.title}</strong>
                      <button
                        className="expire-btn"
                        onClick={() => handleExpireAdvisory(adv._id)}
                        title="Expire broadcast"
                      >
                        ✕ Expire
                      </button>
                    </div>
                    <p className="adv-msg">{adv.message}</p>
                    <div className="adv-footer">
                      <span>📍 {adv.affectedRoad}</span>
                      <span>By {adv.issuedBy}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AuthorityPortal;
