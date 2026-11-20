import { useState } from "react";
import { reportIncident } from "../api";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Send,
  CheckCircle2,
  MapPin,
  ShieldAlert,
  Flame,
  Droplets,
  Construction,
  Car,
  HelpCircle,
  Phone,
  Sparkles,
  Info
} from "lucide-react";

const CITIES = [
  "Delhi NCR",
  "Mumbai",
  "Bengaluru",
  "Chandigarh",
  "Jalandhar / Punjab",
  "Kolkata",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Jaipur",
  "Lucknow",
  "Ahmedabad",
  "Other City"
];

const HAZARD_TYPES = [
  { id: "ACCIDENT", label: "Accident / Collision", icon: "💥", severityDefault: "HIGH" },
  { id: "FLOOD", label: "Waterlogging / Flooding", icon: "🌊", severityDefault: "HIGH" },
  { id: "ROADBLOCK", label: "Complete Roadblock / Closure", icon: "🛑", severityDefault: "CRITICAL" },
  { id: "POTHOLE", label: "Severe Pothole / Road Damage", icon: "🕳️", severityDefault: "MEDIUM" },
  { id: "TRAFFIC_JAM", label: "Major Traffic Gridlock", icon: "🚗", severityDefault: "MEDIUM" },
  { id: "CONSTRUCTION", label: "Unmarked Construction / Work", icon: "🚧", severityDefault: "MEDIUM" },
  { id: "FIRE_HAZARD", label: "Vehicle / Roadside Fire", icon: "🔥", severityDefault: "CRITICAL" },
  { id: "DEBRIS", label: "Dangerous Debris / Fallen Tree", icon: "⚠️", severityDefault: "HIGH" },
  { id: "STALLED_VEHICLE", label: "Stalled Vehicle / Breakdown", icon: "🚙", severityDefault: "LOW" },
  { id: "OTHER", label: "Other Hazard", icon: "⚠️", severityDefault: "MEDIUM" }
];

const PRESET_ROADS_BY_CITY = {
  "Delhi NCR": [
    "NH-48 Delhi-Gurgaon Expressway",
    "Ring Road & Barapullah Elevated Corridor",
    "DND Flyway & Mayur Vihar Link",
    "Outer Ring Road / Munirka Flyover",
    "Connaught Place Inner/Outer Circle"
  ],
  "Mumbai": [
    "Bandra-Worli Sea Link & Western Arterial",
    "Western Express Highway (Andheri to Airport)",
    "Eastern Freeway (Chembur to South Bombay)",
    "BKC Central Connector Road",
    "Marine Drive (Netaji Subhash Chandra Bose Rd)"
  ],
  "Bengaluru": [
    "Outer Ring Road (Koramangala to Whitefield)",
    "Hosur Road Elevated Expressway (Silk Board)",
    "Bellandur EcoSpace Service Corridor",
    "Old Airport Road & Marathahalli Bridge",
    "MG Road & Trinity Junction"
  ],
  "Chandigarh": [
    "Airport Road PR-7 & Zirakpur Highway",
    "Himalayan Expressway Corridor",
    "Sector 17 to Sector 35 Arterial",
    "Tribune Chowk Arterial Roundabout",
    "Madhya Marg & PGI Corridor"
  ],
  "Jalandhar / Punjab": [
    "GT Road / NH-44 Highway Corridor",
    "Nakodar Road Arterial",
    "Phagwara - Jalandhar Cantt Link Road",
    "Jalandhar - Amritsar Highway (NH-3)",
    "Model Town - Bus Stand Arterial"
  ]
};

// AI Client-side Recommendation Preview based on hazard type
function getLiveRecommendationPreview(type, road, city) {
  switch (type) {
    case "ACCIDENT":
      return {
        driver: "🚨 Diversion Advised: Approach with caution at under 30 km/h. Keep right shoulder open for emergency ambulance.",
        police: "🚔 Immediate SOP: Dispatch Highway Interceptor & Trauma EMS. Establish 300m warning cone perimeter."
      };
    case "FLOOD":
      return {
        driver: "🌊 Underpass Flooding: Low sedans & bikes avoid waterlogged stretches. Do not restart stalled engine in water.",
        police: "🚔 Immediate SOP: Deploy high-capacity municipal pumps. Erect reflective warning barricades at submerged dip."
      };
    case "ROADBLOCK":
      return {
        driver: "🛑 Street Closed: Impassable. Follow FlowSense alternate green route or use public transit / Metro.",
        police: "🚔 Immediate SOP: Station traffic constable at preceding intersection. Push digital detour signs."
      };
    case "POTHOLE":
      return {
        driver: "🕳️ Crater Warning: Two-wheelers maintain steady handle grip. Avoid sudden lane swerving at high speeds.",
        police: "🚔 Immediate SOP: Mark crater with reflective safety paint. Issue urgent repair ticket to PWD / NHAI."
      };
    case "FIRE_HAZARD":
      return {
        driver: "🔥 Fire Threat: Roll up vehicle windows and switch AC to recirculate. Clear all lanes for approaching fire tenders.",
        police: "🚔 Immediate SOP: Cordone off 200m zone. Halt incoming traffic and guide fire engines through oncoming lane."
      };
    case "TRAFFIC_JAM":
      return {
        driver: "⏱️ Severe Gridlock: Delay departure by 30 mins or divert via secondary ring road.",
        police: "🚔 Immediate SOP: Clear illegal curb parking at choke point. Extend green signal timing by 25 seconds."
      };
    default:
      return {
        driver: "⚠️ Drive with heightened alertness. Reduce speed and leave 3-car stopping distance.",
        police: "🚔 Immediate SOP: Patrol bike assigned to verify hazard location and clear debris."
      };
  }
}

function IncidentReport() {
  const [selectedCity, setSelectedCity] = useState("Delhi NCR");
  const [customCity, setCustomCity] = useState("");
  const [selectedType, setSelectedType] = useState("ACCIDENT");
  const [severity, setSeverity] = useState("HIGH");
  const [roadName, setRoadName] = useState("NH-48 Delhi-Gurgaon Expressway");
  const [customRoad, setCustomRoad] = useState("");
  const [useCustomRoad, setUseCustomRoad] = useState(false);
  const [landmark, setLandmark] = useState("");
  const [description, setDescription] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const activeCity = selectedCity === "Other City" ? (customCity || "Custom City") : selectedCity;
  const activeRoad = useCustomRoad ? (customRoad || "Custom Road Corridor") : roadName;

  const liveRec = getLiveRecommendationPreview(selectedType, activeRoad, activeCity);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!activeCity.trim() || !activeRoad.trim()) {
      setErrorMsg("Please specify both city and road/location.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessData(null);

    const generatedRoadId = `HAZ_${Date.now().toString(36).toUpperCase()}`;

    try {
      const payload = {
        roadId: generatedRoadId,
        roadName: activeRoad.trim(),
        city: activeCity.trim(),
        type: selectedType,
        severity,
        landmark: landmark.trim(),
        description: description.trim() || `Citizen reported ${selectedType.toLowerCase().replace('_', ' ')} hazard on ${activeRoad}`,
        reportedBy: reportedBy.trim() || "Concerned Citizen",
        contactPhone: contactPhone.trim(),
        location: landmark.trim() ? `${activeRoad} (Near ${landmark})` : activeRoad
      };

      const res = await reportIncident(payload);

      if (res.success) {
        setSuccessData(res);
        // Dispatch real-time custom event so if any traffic police is logged in, their siren triggers immediately!
        window.dispatchEvent(
          new CustomEvent("flowsense-hazard-reported", {
            detail: {
              id: res.data?._id || generatedRoadId,
              type: selectedType,
              title: `🚨 NEW HAZARD REPORTED: ${selectedType.replace("_", " ")}`,
              roadName: activeRoad,
              city: activeCity,
              location: payload.location,
              severity,
              description: payload.description,
              reportedBy: payload.reportedBy,
              recommendation: res.policeActionPlan || liveRec.police,
              time: new Date().toLocaleTimeString()
            }
          })
        );

        // Reset form
        setDescription("");
        setLandmark("");
      } else {
        setErrorMsg(res.message || "Failed to submit hazard report.");
      }
    } catch {
      setErrorMsg("Unable to connect to FlowSense backend server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="incident-page-wrapper">
      <div className="incident-hero-strip">
        <div className="incident-hero-inner">
          <div className="hero-badge-red">
            <ShieldAlert size={15} /> Citizen &amp; Official Real-Time Hazard Reporting
          </div>
          <h1>Report Any Road Hazard in Any City</h1>
          <p>
            Help fellow commuters stay safe and instantly dispatch traffic police response.
            Every hazard submitted here directly updates FlowSense real-time route calculations and triggers the Traffic Police operations alarm.
          </p>
        </div>
      </div>

      <div className="incident-form-container">
        {successData && (
          <div className="incident-success-card">
            <div className="success-header">
              <CheckCircle2 size={24} className="text-emerald" />
              <div>
                <h3>Hazard Reported &amp; Stored in Database!</h3>
                <p>Traffic Police operations have been notified with high-priority audible dispatch.</p>
              </div>
            </div>

            {/* WHAT SHOULD I DO RECOMMENDATION DISPLAY */}
            <div className="success-recommendation-box">
              <h4>💡 AI Safety Recommendation (What You &amp; Drivers Should Do):</h4>
              <p>{successData.driverRecommendation || liveRec.driver}</p>

              <h4 style={{ marginTop: 12 }}>👮 Traffic Police Action Plan:</h4>
              <p>{successData.policeActionPlan || liveRec.police}</p>
            </div>

            <div style={{ marginTop: 16 }}>
              <Link to="/" className="btn-return-home">
                ← View Impact on Live Route Finder
              </Link>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="incident-error-banner">
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="incident-main-form">
          {/* STEP 1: CITY SELECTION */}
          <div className="form-section-card">
            <h3>1. Select City / Area Jurisdiction</h3>
            <p className="section-hint">Reports are instantly routed to the local Traffic Police unit of this city.</p>

            <div className="city-pill-selector">
              {CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  className={`city-pill-btn ${selectedCity === city ? "active-city-pill" : ""}`}
                  onClick={() => {
                    setSelectedCity(city);
                    if (PRESET_ROADS_BY_CITY[city]) {
                      setRoadName(PRESET_ROADS_BY_CITY[city][0]);
                    }
                  }}
                >
                  {city}
                </button>
              ))}
            </div>

            {selectedCity === "Other City" && (
              <div className="auth-input-group" style={{ marginTop: 12 }}>
                <label>Enter Your City Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surat, Indore, Nagpur, Patna"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* STEP 2: HAZARD TYPE */}
          <div className="form-section-card">
            <h3>2. What Kind of Hazard Are You Reporting?</h3>
            <p className="section-hint">Choose the icon that best describes the road situation.</p>

            <div className="hazard-type-grid">
              {HAZARD_TYPES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={`hazard-type-card ${selectedType === h.id ? "active-hazard-card" : ""}`}
                  onClick={() => {
                    setSelectedType(h.id);
                    setSeverity(h.severityDefault);
                  }}
                >
                  <span className="hazard-emoji">{h.icon}</span>
                  <strong>{h.label}</strong>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 3: ROAD LOCATION & SEVERITY */}
          <div className="form-section-card">
            <h3>3. Hazard Location &amp; Severity</h3>

            <div className="form-row-split">
              <div className="auth-input-group">
                <label>Roadway / Corridor *</label>
                {!useCustomRoad && PRESET_ROADS_BY_CITY[selectedCity] ? (
                  <select
                    value={roadName}
                    onChange={(e) => setRoadName(e.target.value)}
                    className="role-select-input"
                  >
                    {PRESET_ROADS_BY_CITY[selectedCity].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ring Road near Mayur Vihar Flyover"
                    value={customRoad}
                    onChange={(e) => setCustomRoad(e.target.value)}
                  />
                )}
                <button
                  type="button"
                  className="toggle-custom-road-link"
                  onClick={() => setUseCustomRoad(!useCustomRoad)}
                >
                  {useCustomRoad ? "← Pick from city arterial list" : "+ Type a custom street/road name"}
                </button>
              </div>

              <div className="auth-input-group">
                <label>Hazard Severity *</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="role-select-input"
                >
                  <option value="LOW">LOW — Minor slowdown, lane partially clear</option>
                  <option value="MEDIUM">MEDIUM — Moderate delay, 1 lane blocked</option>
                  <option value="HIGH">HIGH — Severe congestion, multi-lane obstruction</option>
                  <option value="CRITICAL">CRITICAL — Complete blockage, emergency risk</option>
                </select>
              </div>
            </div>

            <div className="form-row-split" style={{ marginTop: 12 }}>
              <div className="auth-input-group">
                <label>Nearest Landmark / Pillar / KM Marker</label>
                <input
                  type="text"
                  placeholder="e.g. Opposite Metro Pillar 182, near Exit 4"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label>Your Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Citizen Driver"
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-input-group" style={{ marginTop: 12 }}>
              <label>Additional Description / Details</label>
              <textarea
                rows={3}
                placeholder="Describe vehicle types involved, extent of water depth, or lane visibility..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: "100%", background: "#0a1120", color: "#f8fafc", padding: 10, borderRadius: 8, border: "1px solid #1e293b" }}
              />
            </div>
          </div>

          {/* STEP 4: LIVE AI RECOMMENDATION PREVIEW (WHAT SHOULD I DO) */}
          <div className="live-ai-guidance-card">
            <div className="guidance-header">
              <Sparkles size={18} className="text-purple" />
              <h4>AI Guidance Preview (What You &amp; Drivers Should Do):</h4>
            </div>
            <p className="guidance-text">{liveRec.driver}</p>
            <div className="guidance-police-preview">
              <strong>Police Dispatch Alert:</strong> {liveRec.police}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="incident-submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              "Transmitting to Traffic Police & Database..."
            ) : (
              <>
                <Send size={18} /> Submit Hazard &amp; Alert Traffic Police Dispatch
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default IncidentReport;
