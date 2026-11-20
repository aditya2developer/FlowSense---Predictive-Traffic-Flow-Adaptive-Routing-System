import { useState } from "react";
import { reportIncident } from "../api";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Send,
  CheckCircle2,
  MapPin,
  ShieldAlert,
  Car,
  Phone,
  Sparkles,
  Info
} from "lucide-react";

// All major cities & districts across all 28 States + 8 UTs of India
const CITIES = [
  // North India
  "Delhi NCR",
  "Chandigarh",
  "Jalandhar / Punjab",
  "Amritsar",
  "Ludhiana",
  "Patiala",
  "Gurugram (Gurgaon)",
  "Faridabad",
  "Agra",
  "Lucknow",
  "Kanpur",
  "Varanasi",
  "Prayagraj (Allahabad)",
  "Noida / Greater Noida",
  "Meerut",
  "Dehradun",
  "Haridwar",
  "Shimla",
  "Manali",
  "Jammu",
  "Srinagar",
  "Leh / Ladakh",
  "Jaipur",
  "Jodhpur",
  "Udaipur",
  "Ajmer",
  "Kota",
  "Bikaner",
  // West India
  "Mumbai",
  "Pune",
  "Nashik",
  "Aurangabad",
  "Nagpur",
  "Thane",
  "Navi Mumbai",
  "Kolhapur",
  "Solapur",
  "Ahmedabad",
  "Surat",
  "Vadodara",
  "Rajkot",
  "Bhavnagar",
  "Gandhinagar",
  "Bhopal",
  "Indore",
  "Jabalpur",
  "Gwalior",
  "Ujjain",
  "Panaji / Goa",
  // South India
  "Bengaluru",
  "Mysuru",
  "Mangaluru",
  "Hubli-Dharwad",
  "Belagavi (Belgaum)",
  "Chennai",
  "Coimbatore",
  "Madurai",
  "Salem",
  "Tiruchirappalli",
  "Tiruppur",
  "Vellore",
  "Tirunelveli",
  "Hyderabad",
  "Secunderabad",
  "Warangal",
  "Vijayawada",
  "Visakhapatnam",
  "Guntur",
  "Tirupati",
  "Thiruvananthapuram",
  "Kochi / Ernakulam",
  "Kozhikode (Calicut)",
  "Thrissur",
  // East & Central India
  "Kolkata",
  "Howrah",
  "Durgapur",
  "Siliguri",
  "Asansol",
  "Bhubaneswar",
  "Cuttack",
  "Rourkela",
  "Puri",
  "Patna",
  "Gaya",
  "Muzaffarpur",
  "Ranchi",
  "Jamshedpur",
  "Dhanbad",
  "Raipur",
  "Bhilai",
  "Bilaspur",
  // Northeast India
  "Guwahati",
  "Silchar",
  "Dibrugarh",
  "Shillong",
  "Imphal",
  "Agartala",
  "Aizawl",
  "Itanagar",
  "Kohima",
  "Gangtok",
  // Union Territories
  "Puducherry",
  "Port Blair (Andaman)",
  "Daman",
  "Silvassa",
  "Other City / Town"
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
  "Delhi NCR": ["NH-48 Delhi-Gurgaon Expressway", "Ring Road & Barapullah Elevated Corridor", "DND Flyway & Mayur Vihar Link", "Outer Ring Road / Munirka Flyover", "Connaught Place Inner/Outer Circle"],
  "Mumbai": ["Bandra-Worli Sea Link & Western Arterial", "Western Express Highway (Andheri to Airport)", "Eastern Freeway (Chembur to South Bombay)", "BKC Central Connector Road", "Marine Drive (Netaji Subhash Chandra Bose Rd)"],
  "Bengaluru": ["Outer Ring Road (Koramangala to Whitefield)", "Hosur Road Elevated Expressway (Silk Board)", "Bellandur EcoSpace Service Corridor", "Old Airport Road & Marathahalli Bridge", "MG Road & Trinity Junction"],
  "Chandigarh": ["Airport Road PR-7 & Zirakpur Highway", "Himalayan Expressway Corridor", "Sector 17 to Sector 35 Arterial", "Tribune Chowk Arterial Roundabout", "Madhya Marg & PGI Corridor"],
  "Jalandhar / Punjab": ["GT Road / NH-44 Highway Corridor", "Nakodar Road Arterial", "Phagwara - Jalandhar Cantt Link Road", "Jalandhar - Amritsar Highway (NH-3)", "Model Town - Bus Stand Arterial"],
  "Hyderabad": ["Outer Ring Road (ORR) PVNR Expressway", "HITEC City - Gachibowli Corridor", "Nehru Outer Ring Road NH-65 Interchange", "Kukatpally - Miyapur MMTS Underpass", "Uppal - LB Nagar Stretch"],
  "Chennai": ["Anna Salai (Mount Road) Central Corridor", "OMR (IT Corridor) - Sholinganallur to Siruseri", "GST Road NH-45 Airport Junction", "Poonamallee High Road", "Inner Ring Road (Koyambedu to Ambattur)"],
  "Kolkata": ["EM Bypass & Science City Flyover", "VIP Road (Airport to Salt Lake)", "Ultadanga Flyover & New Town Rajarhat", "Second Hooghly Bridge (Vidyasagar Setu)", "Park Street & Esplanade Central"],
  "Pune": ["Mumbai-Pune Expressway (NH-48)", "Hinjewadi IT Park - Wakad Ring Road", "Sinhagad Road & Warje Flyover", "Katraj - Kondhwa Bypass", "Nagar Road & Wagholi Corridor"],
  "Ahmedabad": ["GIFT City - SG Highway Expressway", "Sardar Patel Ring Road (NH-147)", "CG Road & Navrangpura Underpass", "Ashram Road & Gandhi Bridge Corridor", "Sarkhej - Gandhinagar Highway"],
  "Jaipur": ["Jaipur-Delhi NH-48 Flyover Zone", "Ajmer Road (NH-48) & Durgapura Stretch", "Tonk Road Flyover Underpass", "Sirsi Road & Kalwar Road Chowk", "JLN Marg Arterial Corridor"],
  "Lucknow": ["Shaheed Path Ring Road (NH-28)", "Amar Shaheed Path Expressway", "Faizabad Road & Gomti Nagar Link", "Vikas Nagar - Chinhat Corridor", "Kanpur Road NH-27 Stretch"],
  "Ahmedabad": ["GIFT City - SG Highway Expressway", "Sardar Patel Ring Road (NH-147)", "CG Road & Navrangpura Underpass", "Ashram Road & Gandhi Bridge Corridor", "Sarkhej - Gandhinagar Highway"],
  "Bhopal": ["Hoshangabad Road & BHEL Flyover", "New Market - MP Nagar Corridor", "Raisen Road NH-146", "Berasia Road Bypass", "Karond - Bairagarh Arterial"],
  "Indore": ["Ring Road & Palasia Square", "Super Corridor (IT Park) Stretch", "AB Road (Agra-Bombay NH-3)", "Rau - Pithampur Industrial Road", "Bhawarkua - LIG Colony Link"],
  "Visakhapatnam": ["Beach Road (NH-16) Coastal Corridor", "Steel Plant Road Arterial", "MVP Colony to NAD Junction", "Gajuwaka Industrial Area Flyover", "NH-16 Bheemunipatnam Stretch"],
  "Kochi / Ernakulam": ["NH-66 Kochi Bypass", "Seaport-Airport Road Corridor", "MG Road & Ernakulam Junction", "Vytila - Thripunithura Link", "Edapally Junction Flyover"],
  "Guwahati": ["NH-27 (Guwahati Bypass) Corridor", "RG Baruah Road & Dispur Link", "Jalukbari - Adabari Underpass", "Six Mile - Khanapara Stretch", "Lokhra Road Arterial"]
};

function getLiveRecommendationPreview(type) {
  switch (type) {
    case "ACCIDENT": return { driver: "🚨 Diversion Advised: Approach with caution at under 30 km/h. Keep right shoulder open for emergency ambulance.", police: "🚔 Dispatch Highway Interceptor & Trauma EMS. Establish 300m warning cone perimeter." };
    case "FLOOD": return { driver: "🌊 Underpass Flooding: Low sedans & bikes avoid waterlogged stretches. Do not restart stalled engine in water.", police: "🚔 Deploy high-capacity municipal pumps. Erect reflective warning barricades at submerged dip." };
    case "ROADBLOCK": return { driver: "🛑 Street Closed: Impassable. Follow FlowSense alternate green route or use public transit / Metro.", police: "🚔 Station traffic constable at preceding intersection. Push digital detour signs." };
    case "POTHOLE": return { driver: "🕳️ Crater Warning: Two-wheelers maintain steady handle grip. Avoid sudden lane swerving at high speeds.", police: "🚔 Mark crater with reflective safety paint. Issue urgent repair ticket to PWD / NHAI." };
    case "FIRE_HAZARD": return { driver: "🔥 Fire Threat: Roll up vehicle windows and switch AC to recirculate. Clear all lanes for approaching fire tenders.", police: "🚔 Cordone off 200m zone. Halt incoming traffic and guide fire engines through oncoming lane." };
    case "TRAFFIC_JAM": return { driver: "⏱️ Severe Gridlock: Delay departure by 30 mins or divert via secondary ring road.", police: "🚔 Clear illegal curb parking at choke point. Extend green signal timing by 25 seconds." };
    case "CONSTRUCTION": return { driver: "🚧 Construction Zone: Reduce speed to 40 km/h. Watch for road workers and unmarked diversions.", police: "🚔 Verify site barricading compliance. Issue notice to contractor for reflective cone placement." };
    case "DEBRIS": return { driver: "⚠️ Road Debris: Slow to 30 km/h. Use hazard lights. Do not swerve suddenly at highway speeds.", police: "🚔 Send patrol bike for immediate debris clearance. Close lane until safe." };
    case "STALLED_VEHICLE": return { driver: "🚙 Stalled Vehicle Ahead: Use side mirror before lane change. Keep 2 lanes clear for tow truck.", police: "🚔 Dispatch NHAI towing assistance. Place emergency triangles 100m behind vehicle." };
    default: return { driver: "⚠️ Drive with heightened alertness. Reduce speed and leave 3-car stopping distance.", police: "🚔 Patrol bike assigned to verify hazard location and clear debris." };
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

  const activeCity = selectedCity === "Other City / Town" ? (customCity || "Custom City") : selectedCity;
  const activeRoad = useCustomRoad ? (customRoad || "Custom Road Corridor") : roadName;
  const liveRec = getLiveRecommendationPreview(selectedType);

  function handleCityChange(city) {
    setSelectedCity(city);
    setCustomCity("");
    const presets = PRESET_ROADS_BY_CITY[city];
    if (presets && presets.length > 0) {
      setRoadName(presets[0]);
      setUseCustomRoad(false);
    } else {
      setUseCustomRoad(true);
      setCustomRoad("");
    }
  }

  function handleTypeChange(type) {
    setSelectedType(type);
    const hazard = HAZARD_TYPES.find((h) => h.id === type);
    if (hazard) setSeverity(hazard.severityDefault);
  }

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
        description: description.trim() || `Citizen reported ${selectedType.toLowerCase().replace(/_/g, " ")} hazard on ${activeRoad}`,
        reportedBy: reportedBy.trim() || "Concerned Citizen",
        contactPhone: contactPhone.trim(),
        location: landmark.trim() ? `${activeRoad} (Near ${landmark})` : activeRoad
      };
      const res = await reportIncident(payload);
      if (res.success) {
        setSuccessData(res);
        window.dispatchEvent(new CustomEvent("flowsense-hazard-reported", {
          detail: {
            id: res.data?._id || generatedRoadId,
            type: selectedType,
            title: `🚨 NEW HAZARD REPORTED: ${selectedType.replace(/_/g, " ")}`,
            roadName: activeRoad,
            city: activeCity,
            location: payload.location,
            severity,
            description: payload.description,
            reportedBy: payload.reportedBy,
            recommendation: res.policeActionPlan || liveRec.police,
            time: new Date().toLocaleTimeString()
          }
        }));
        setTimeout(() => { setDescription(""); setReportedBy(""); setContactPhone(""); setLandmark(""); }, 1000);
      } else {
        setErrorMsg(res.message || "Failed to submit hazard report. Please try again.");
      }
    } catch {
      setErrorMsg("Could not connect to FlowSense backend. Ensure the server is running on port 5000.");
    } finally {
      setSubmitting(false);
    }
  }

  const presetRoads = PRESET_ROADS_BY_CITY[selectedCity] || [];

  return (
    <div className="page-container incident-report-page">
      {/* HEADER */}
      <section className="incident-hero-section">
        <div className="incident-hero-content">
          <div className="incident-hero-badge">
            <AlertTriangle size={14} /> Pan-India Citizen Hazard Reporting System
          </div>
          <h1>Report a Road Hazard</h1>
          <p>
            Your report is <strong>instantly saved to MongoDB</strong>, alerts nearest Traffic Police with an audible siren, and updates the FlowSense real-time stability score for your corridor.
            Available for <strong>all cities, states &amp; union territories of India</strong>.
          </p>
          <div className="emergency-quick-dial-row">
            <a href="tel:112" className="quick-dial-chip chip-red"><Phone size={14} /> 112 — National Emergency</a>
            <a href="tel:1033" className="quick-dial-chip chip-blue"><Phone size={14} /> 1033 — NHAI Highway Help</a>
            <a href="tel:108" className="quick-dial-chip chip-green"><Phone size={14} /> 108 — Ambulance</a>
          </div>
        </div>
      </section>

      {/* SUCCESS STATE */}
      {successData && (
        <section className="report-success-banner-full">
          <div className="success-full-inner">
            <CheckCircle2 size={40} className="success-big-icon" />
            <div>
              <h2>Hazard Report Submitted Successfully!</h2>
              <p>
                Incident ID: <code>{successData.data?._id}</code><br />
                Your report for <strong>{activeRoad}</strong> in <strong>{activeCity}</strong> has been saved to MongoDB. Traffic Police have been automatically alerted with an emergency siren.
              </p>
              {successData.recommendation && (
                <div className="success-driver-rec-box">
                  <strong>What You Should Do:</strong>
                  <p>{successData.recommendation}</p>
                </div>
              )}
              <div className="success-action-row">
                <button type="button" className="success-report-another-btn" onClick={() => setSuccessData(null)}>Report Another Hazard</button>
                <Link to="/" className="success-go-home-btn">View Live Route Map</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {!successData && (
        <div className="incident-report-layout">
          {/* MAIN FORM */}
          <form onSubmit={handleSubmit} className="incident-form-card">
            <div className="form-section-header">
              <MapPin size={18} className="text-cyan" />
              <h3>Step 1 — Select Location</h3>
            </div>

            <div className="report-field-group">
              <label>City / District *</label>
              <select value={selectedCity} onChange={(e) => handleCityChange(e.target.value)} className="report-select" required>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {selectedCity === "Other City / Town" && (
              <div className="report-field-group">
                <label>Enter City / Town Name *</label>
                <input type="text" placeholder="e.g. Mysuru, Coimbatore, Bikaner..." value={customCity} onChange={(e) => setCustomCity(e.target.value)} className="report-input" required />
              </div>
            )}

            <div className="report-field-group">
              <label>Road / Corridor *</label>
              {presetRoads.length > 0 && !useCustomRoad ? (
                <div className="road-preset-group">
                  <select value={roadName} onChange={(e) => setRoadName(e.target.value)} className="report-select">
                    {presetRoads.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button type="button" className="use-custom-road-link" onClick={() => setUseCustomRoad(true)}>Enter custom road name →</button>
                </div>
              ) : (
                <div className="road-preset-group">
                  <input type="text" placeholder="e.g. NH-44 near Ambala Flyover, Kharghar Ring Road..." value={customRoad} onChange={(e) => setCustomRoad(e.target.value)} className="report-input" required />
                  {presetRoads.length > 0 && <button type="button" className="use-custom-road-link" onClick={() => { setUseCustomRoad(false); setRoadName(presetRoads[0]); }}>← Use preset roads</button>}
                </div>
              )}
            </div>

            <div className="report-field-group">
              <label>Landmark / Exact Spot</label>
              <input type="text" placeholder="e.g. Near Zomato Office, 200m before Toll Plaza..." value={landmark} onChange={(e) => setLandmark(e.target.value)} className="report-input" />
            </div>

            <div className="form-section-header" style={{ marginTop: 20 }}>
              <AlertTriangle size={18} className="text-amber" />
              <h3>Step 2 — Hazard Details</h3>
            </div>

            <div className="hazard-type-grid">
              {HAZARD_TYPES.map((h) => (
                <button key={h.id} type="button" className={`hazard-type-card ${selectedType === h.id ? "hazard-card-active" : ""}`} onClick={() => handleTypeChange(h.id)}>
                  <span className="hazard-type-icon">{h.icon}</span>
                  <span className="hazard-type-label">{h.label}</span>
                </button>
              ))}
            </div>

            <div className="report-field-group">
              <label>Severity Level *</label>
              <div className="severity-select-row">
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
                  <button key={s} type="button" className={`severity-btn sev-btn-${s.toLowerCase()} ${severity === s ? "sev-btn-active" : ""}`} onClick={() => setSeverity(s)}>{s}</button>
                ))}
              </div>
            </div>

            <div className="report-field-group">
              <label>Describe the Hazard</label>
              <textarea rows={3} placeholder="Describe what you observed in detail — lane blocked, water depth, number of vehicles involved..." value={description} onChange={(e) => setDescription(e.target.value)} className="report-textarea" />
            </div>

            <div className="form-section-header" style={{ marginTop: 20 }}>
              <Phone size={18} className="text-emerald" />
              <h3>Step 3 — Reporter Info (Optional)</h3>
            </div>

            <div className="report-row-split">
              <div className="report-field-group">
                <label>Your Name</label>
                <input type="text" placeholder="Concerned Citizen" value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} className="report-input" />
              </div>
              <div className="report-field-group">
                <label>Contact Number</label>
                <input type="tel" placeholder="+91 98XXXXXXXX" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="report-input" />
              </div>
            </div>

            {errorMsg && (
              <div className="report-error-banner"><AlertTriangle size={16} /> {errorMsg}</div>
            )}

            <button type="submit" className="submit-hazard-btn" disabled={submitting}>
              {submitting ? "Submitting to MongoDB & Alerting Police..." : (
                <><Send size={18} /> Submit Hazard Report — Alert Traffic Police Now</>
              )}
            </button>

            <p className="report-privacy-note">
              Your report is saved securely in MongoDB and immediately dispatched to jurisdiction Traffic Police with an audible emergency siren.
            </p>
          </form>

          {/* LIVE RECOMMENDATION SIDEBAR */}
          <div className="report-rec-sidebar">
            <div className="live-rec-card">
              <div className="live-rec-header">
                <Sparkles size={16} className="text-amber" />
                <span>AI Safety Guidance Preview</span>
                <span className="live-pulse-dot" />
              </div>
              <div className="rec-hazard-preview-label">
                {HAZARD_TYPES.find((h) => h.id === selectedType)?.icon} {HAZARD_TYPES.find((h) => h.id === selectedType)?.label}
                <span className={`rec-sev-badge sev-${severity.toLowerCase()}`}>{severity}</span>
              </div>
              <div className="rec-location-preview">
                <MapPin size={13} /> {activeCity} — {activeRoad.length > 42 ? activeRoad.substring(0, 42) + "..." : activeRoad}
              </div>
              <div className="rec-box driver-rec">
                <div className="rec-title"><Car size={15} /> What Drivers Should Do:</div>
                <p>{liveRec.driver}</p>
              </div>
              <div className="rec-box police-rec">
                <div className="rec-title"><ShieldAlert size={15} /> Police Action Plan:</div>
                <p>{liveRec.police}</p>
              </div>
              <div className="rec-helpline-box">
                <Info size={14} />
                <span>Dial <strong>112</strong> for immediate emergency or <strong>1033</strong> for NHAI highway patrol.</span>
              </div>
            </div>

            <div className="how-it-works-card">
              <h4>How Your Report Helps</h4>
              <div className="how-step">
                <div className="how-step-num">1</div>
                <div><strong>Instant MongoDB Save</strong><p>Your report is immediately persisted with timestamp, GPS metadata, and severity classification.</p></div>
              </div>
              <div className="how-step">
                <div className="how-step-num">2</div>
                <div><strong>Traffic Police Siren Alert</strong><p>Jurisdiction officers receive an audible siren notification on their police command portal in real time.</p></div>
              </div>
              <div className="how-step">
                <div className="how-step-num">3</div>
                <div><strong>Route Score Degradation</strong><p>FlowSense stability score for the affected corridor drops automatically, rerouting other commuters away from the hazard.</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IncidentReport;
