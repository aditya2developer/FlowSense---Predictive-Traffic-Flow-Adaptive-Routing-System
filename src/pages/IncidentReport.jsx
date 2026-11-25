import { useState, useEffect } from "react";
import {
  reportIncident,
  fetchIncidents,
  upvoteIncident,
  reverseGeocodeCoords,
  fetchNearbyServices
} from "../api";
import { compressImageFile } from "../utils/imageHelper";
import { useAuth } from "../context/AuthContext";
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
  Info,
  Camera,
  Crosshair,
  X,
  ThumbsUp,
  Navigation,
  Hospital,
  Shield,
  Fuel
} from "lucide-react";

// All major cities & districts across all 28 States + 8 UTs of India
const CITIES = [
  "Delhi NCR", "Chandigarh", "Jalandhar / Punjab", "Amritsar", "Ludhiana", "Patiala",
  "Gurugram (Gurgaon)", "Faridabad", "Agra", "Lucknow", "Kanpur", "Varanasi",
  "Prayagraj (Allahabad)", "Noida / Greater Noida", "Meerut", "Dehradun", "Haridwar",
  "Shimla", "Manali", "Jammu", "Srinagar", "Leh / Ladakh", "Jaipur", "Jodhpur",
  "Udaipur", "Ajmer", "Kota", "Bikaner", "Mumbai", "Pune", "Nashik", "Aurangabad",
  "Nagpur", "Thane", "Navi Mumbai", "Kolhapur", "Solapur", "Ahmedabad", "Surat",
  "Vadodara", "Rajkot", "Bhavnagar", "Gandhinagar", "Bhopal", "Indore", "Jabalpur",
  "Gwalior", "Ujjain", "Panaji / Goa", "Bengaluru", "Mysuru", "Mangaluru",
  "Hubli-Dharwad", "Belagavi (Belgaum)", "Chennai", "Coimbatore", "Madurai", "Salem",
  "Tiruchirappalli", "Tiruppur", "Vellore", "Tirunelveli", "Hyderabad", "Secunderabad",
  "Warangal", "Vijayawada", "Visakhapatnam", "Guntur", "Tirupati", "Thiruvananthapuram",
  "Kochi / Ernakulam", "Kozhikode (Calicut)", "Thrissur", "Kolkata", "Howrah",
  "Durgapur", "Siliguri", "Asansol", "Bhubaneswar", "Cuttack", "Rourkela", "Puri",
  "Patna", "Gaya", "Muzaffarpur", "Ranchi", "Jamshedpur", "Dhanbad", "Raipur",
  "Bhilai", "Bilaspur", "Guwahati", "Silchar", "Dibrugarh", "Shillong", "Imphal",
  "Agartala", "Aizawl", "Itanagar", "Kohima", "Gangtok", "Puducherry",
  "Port Blair (Andaman)", "Daman", "Silvassa", "Other City / Town"
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
    case "FIRE_HAZARD": return { driver: "🔥 Fire Threat: Roll up vehicle windows and switch AC to recirculate. Clear all lanes for approaching fire tenders.", police: "🚔 Cordon off 200m zone. Halt incoming traffic and guide fire engines through oncoming lane." };
    case "TRAFFIC_JAM": return { driver: "⏱️ Severe Gridlock: Delay departure by 30 mins or divert via secondary ring road.", police: "🚔 Clear illegal curb parking at choke point. Extend green signal timing by 25 seconds." };
    case "CONSTRUCTION": return { driver: "🚧 Construction Zone: Reduce speed to 40 km/h. Watch for road workers and unmarked diversions.", police: "🚔 Verify site barricading compliance. Issue notice to contractor for reflective cone placement." };
    case "DEBRIS": return { driver: "⚠️ Road Debris: Slow to 30 km/h. Use hazard lights. Do not swerve suddenly at highway speeds.", police: "🚔 Send patrol bike for immediate debris clearance. Close lane until safe." };
    case "STALLED_VEHICLE": return { driver: "🚙 Stalled Vehicle Ahead: Use side mirror before lane change. Keep 2 lanes clear for tow truck.", police: "🚔 Dispatch NHAI towing assistance. Place emergency triangles 100m behind vehicle." };
    default: return { driver: "⚠️ Drive with heightened alertness. Reduce speed and leave 3-car stopping distance.", police: "🚔 Patrol bike assigned to verify hazard location and clear debris." };
  }
}

function IncidentReport() {
  const { user } = useAuth();

  const [selectedCity, setSelectedCity] = useState("Delhi NCR");
  const [customCity, setCustomCity] = useState("");
  const [selectedType, setSelectedType] = useState("ACCIDENT");
  const [severity, setSeverity] = useState("HIGH");
  const [roadName, setRoadName] = useState("NH-48 Delhi-Gurgaon Expressway");
  const [customRoad, setCustomRoad] = useState("");
  const [useCustomRoad, setUseCustomRoad] = useState(false);
  const [landmark, setLandmark] = useState("");
  const [description, setDescription] = useState("");
  const [reportedBy, setReportedBy] = useState(user?.name || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");

  // Real-time GPS & Photos state
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [gpsStatus, setGpsStatus] = useState("");
  const [locatingGps, setLocatingGps] = useState(false);
  const [nearbyServices, setNearbyServices] = useState([]);
  const [images, setImages] = useState([]);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Live Community Incidents Feed
  const [liveIncidents, setLiveIncidents] = useState([]);
  const [upvotingId, setUpvotingId] = useState("");
  const [lightboxImage, setLightboxImage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const activeCity = selectedCity === "Other City / Town" ? (customCity || "Custom City") : selectedCity;
  const activeRoad = useCustomRoad ? (customRoad || "Custom Road Corridor") : roadName;
  const liveRec = getLiveRecommendationPreview(selectedType);

  async function loadCommunityIncidents() {
    try {
      const res = await fetchIncidents();
      if (res.success && Array.isArray(res.data)) {
        setLiveIncidents(res.data.slice(0, 8));
      }
    } catch {
      // Quiet fallback
    }
  }

  useEffect(() => {
    let active = true;
    fetchIncidents()
      .then((res) => {
        if (active && res.success && Array.isArray(res.data)) {
          setLiveIncidents(res.data.slice(0, 8));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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

  function handleDetectGPS() {
    if (!navigator.geolocation) {
      setErrorMsg("GPS Geolocation is not supported by this browser.");
      return;
    }

    setLocatingGps(true);
    setGpsStatus("Acquiring satellite GPS coordinates & reverse geocoding...");
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lon = Number(pos.coords.longitude.toFixed(5));
        setLatitude(String(lat));
        setLongitude(String(lon));

        try {
          const [geoRes, poiRes] = await Promise.all([
            reverseGeocodeCoords(lat, lon),
            fetchNearbyServices(lat, lon, 5000)
          ]);

          if (geoRes.success && geoRes.data) {
            const addr = geoRes.data;
            const matchedCity = CITIES.find((c) =>
              c.toLowerCase().includes((addr.city || "").toLowerCase()) ||
              (addr.city || "").toLowerCase().includes(c.split(" ")[0].toLowerCase())
            );
            if (matchedCity) {
              setSelectedCity(matchedCity);
            } else if (addr.city) {
              setSelectedCity("Other City / Town");
              setCustomCity(addr.city);
            }

            if (addr.street) {
              setUseCustomRoad(true);
              setCustomRoad(addr.street);
            }
            if (addr.displayName) {
              setLandmark(addr.displayName.split(",").slice(0, 2).join(", "));
            }
            setGpsStatus(`GPS Locked (${lat}, ${lon}) via ${addr.source}`);
          } else {
            setGpsStatus(`GPS Locked at ${lat}°N, ${lon}°E`);
          }

          if (poiRes.success && poiRes.data?.services) {
            setNearbyServices(poiRes.data.services.slice(0, 6));
          }
        } catch {
          setGpsStatus(`GPS Coordinates Captured: ${lat}, ${lon}`);
        } finally {
          setLocatingGps(false);
        }
      },
      (err) => {
        setLocatingGps(false);
        setGpsStatus("");
        setErrorMsg(`GPS detection declined or unavailable (${err.message}). You can select city manually or enter coordinates.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 3 - images.length;
    if (remainingSlots <= 0) {
      setErrorMsg("Maximum 3 evidence photos allowed per incident report.");
      e.target.value = "";
      return;
    }

    setUploadingImg(true);
    setErrorMsg("");
    try {
      const selected = files.slice(0, remainingSlots);
      const compressedList = await Promise.all(
        selected.map((file) => compressImageFile(file, 720, 0.78))
      );
      setImages((prev) => [...prev, ...compressedList].slice(0, 3));
    } catch (err) {
      setErrorMsg(err.message || "Failed to process selected photo.");
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  }

  function handleRemoveImage(idx) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleUpvote(id) {
    setUpvotingId(id);
    try {
      const res = await upvoteIncident(id);
      if (res.success && res.data) {
        setLiveIncidents((prev) =>
          prev.map((item) => (item._id === id ? { ...item, upvotes: res.data.upvotes } : item))
        );
      }
    } finally {
      setUpvotingId("");
    }
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
    const parsedLat = parseFloat(latitude);
    const parsedLon = parseFloat(longitude);
    const hasCoords = Number.isFinite(parsedLat) && Number.isFinite(parsedLon);

    try {
      const payload = {
        roadId: generatedRoadId,
        roadName: activeRoad.trim(),
        city: activeCity.trim(),
        type: selectedType,
        severity,
        landmark: landmark.trim(),
        description:
          description.trim() ||
          `Citizen reported ${selectedType.toLowerCase().replace(/_/g, " ")} hazard on ${activeRoad}`,
        reportedBy: reportedBy.trim() || user?.name || "Concerned Citizen",
        reporterEmail: user?.email || "",
        contactPhone: contactPhone.trim(),
        location: landmark.trim() ? `${activeRoad} (Near ${landmark})` : activeRoad,
        images,
        coordinates: hasCoords ? { latitude: parsedLat, longitude: parsedLon } : undefined
      };

      const res = await reportIncident(payload);
      if (res.success) {
        setSuccessData(res);
        loadCommunityIncidents();
        window.dispatchEvent(
          new CustomEvent("flowsense-hazard-reported", {
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
          })
        );
        setTimeout(() => {
          setDescription("");
          setLandmark("");
          setImages([]);
        }, 800);
      } else {
        setErrorMsg(res.message || "Failed to submit hazard report. Please try again.");
      }
    } catch {
      setErrorMsg("Could not connect to FlowSense backend.");
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
            <AlertTriangle size={14} /> Pan-India Citizen Hazard &amp; Photo Reporting
          </div>
          <h1>Report a Road Hazard with Live GPS &amp; Photos</h1>
          <p>
            Capture live GPS coordinates, upload incident photos, and instantly alert Traffic Police
            with an audible emergency siren while degrading unstable corridor scores in MongoDB Atlas.
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
              <h2>Hazard Report &amp; Evidence Saved to MongoDB!</h2>
              <p>
                Incident ID: <code>{successData.data?._id}</code><br />
                Your report for <strong>{activeRoad}</strong> in <strong>{activeCity}</strong> has
                been persisted in MongoDB Atlas. Traffic Police command received an alert.
              </p>
              {(successData.driverRecommendation || successData.data?.recommendation) && (
                <div className="success-driver-rec-box">
                  <strong>What Commuters Should Do:</strong>
                  <p>{successData.driverRecommendation || successData.data?.recommendation}</p>
                </div>
              )}
              <div className="success-action-row">
                <button
                  type="button"
                  className="success-report-another-btn"
                  onClick={() => setSuccessData(null)}
                >
                  Report Another Hazard
                </button>
                <Link to="/" className="success-go-home-btn">
                  View Live Route Map
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {!successData && (
        <div className="incident-report-layout">
          {/* MAIN FORM */}
          <form onSubmit={handleSubmit} className="incident-form-card">
            <div className="form-section-header-between">
              <div className="form-section-header" style={{ margin: 0 }}>
                <MapPin size={18} className="text-cyan" />
                <h3>Step 1 — Real-Time Location &amp; GPS</h3>
              </div>
              <button
                type="button"
                className="locate-me-btn"
                onClick={handleDetectGPS}
                disabled={locatingGps}
              >
                <Crosshair size={14} className={locatingGps ? "spin-icon" : ""} />
                <span>{locatingGps ? "Locating GPS..." : "Detect My Exact GPS"}</span>
              </button>
            </div>

            {gpsStatus && (
              <div className="gps-locked-banner">
                <Navigation size={14} className="text-emerald" />
                <span>{gpsStatus}</span>
              </div>
            )}

            <div className="report-field-group">
              <label>City / District *</label>
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="report-select"
                required
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {selectedCity === "Other City / Town" && (
              <div className="report-field-group">
                <label>Enter City / Town Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Mysuru, Coimbatore, Bikaner..."
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  className="report-input"
                  required
                />
              </div>
            )}

            <div className="report-field-group">
              <label>Road / Corridor *</label>
              {presetRoads.length > 0 && !useCustomRoad ? (
                <div className="road-preset-group">
                  <select
                    value={roadName}
                    onChange={(e) => setRoadName(e.target.value)}
                    className="report-select"
                  >
                    {presetRoads.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="use-custom-road-link"
                    onClick={() => setUseCustomRoad(true)}
                  >
                    Enter custom road name →
                  </button>
                </div>
              ) : (
                <div className="road-preset-group">
                  <input
                    type="text"
                    placeholder="e.g. NH-44 near Ambala Flyover, Kharghar Ring Road..."
                    value={customRoad}
                    onChange={(e) => setCustomRoad(e.target.value)}
                    className="report-input"
                    required
                  />
                  {presetRoads.length > 0 && (
                    <button
                      type="button"
                      className="use-custom-road-link"
                      onClick={() => {
                        setUseCustomRoad(false);
                        setRoadName(presetRoads[0]);
                      }}
                    >
                      ← Use preset roads
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="report-field-group">
              <label>Landmark / Exact Spot</label>
              <input
                type="text"
                placeholder="e.g. Near Metro Gate 2, 200m before Toll Plaza..."
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="report-input"
              />
            </div>

            <div className="report-row-split">
              <div className="report-field-group">
                <label>GPS Latitude (Optional)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 28.6139"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="report-input"
                />
              </div>
              <div className="report-field-group">
                <label>GPS Longitude (Optional)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 77.2090"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="report-input"
                />
              </div>
            </div>

            <div className="form-section-header" style={{ marginTop: 20 }}>
              <AlertTriangle size={18} className="text-amber" />
              <h3>Step 2 — Hazard Type, Evidence Photos &amp; Details</h3>
            </div>

            <div className="hazard-type-grid">
              {HAZARD_TYPES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={`hazard-type-card ${selectedType === h.id ? "hazard-card-active" : ""}`}
                  onClick={() => handleTypeChange(h.id)}
                >
                  <span className="hazard-type-icon">{h.icon}</span>
                  <span className="hazard-type-label">{h.label}</span>
                </button>
              ))}
            </div>

            <div className="report-field-group">
              <label>Severity Level *</label>
              <div className="severity-select-row">
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`severity-btn sev-btn-${s.toLowerCase()} ${severity === s ? "sev-btn-active" : ""}`}
                    onClick={() => setSeverity(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* MULTI-IMAGE EVIDENCE UPLOAD */}
            <div className="report-field-group">
              <label>Upload Incident Photos (Up to 3 Evidence Images)</label>
              <div className="incident-photo-upload-area">
                <label className="incident-upload-trigger">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploadingImg || images.length >= 3}
                    hidden
                  />
                  <Camera size={18} className="text-cyan" />
                  <span>
                    {uploadingImg
                      ? "Compressing photos..."
                      : images.length >= 3
                        ? "Maximum 3 photos attached"
                        : `Add Incident Photos (${images.length}/3 uploaded)`}
                  </span>
                </label>

                {images.length > 0 && (
                  <div className="uploaded-evidence-grid">
                    {images.map((src, idx) => (
                      <div key={idx} className="evidence-thumb-item">
                        <img
                          src={src}
                          alt={`Incident photo ${idx + 1}`}
                          onClick={() => setLightboxImage(src)}
                        />
                        <button
                          type="button"
                          className="remove-evidence-btn"
                          onClick={() => handleRemoveImage(idx)}
                          title="Remove photo"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="report-field-group">
              <label>Describe the Hazard</label>
              <textarea
                rows={3}
                placeholder="Describe what you observed in detail — lane blocked, water depth, number of vehicles involved..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="report-textarea"
              />
            </div>

            <div className="form-section-header" style={{ marginTop: 20 }}>
              <Phone size={18} className="text-emerald" />
              <h3>Step 3 — Reporter Info</h3>
            </div>

            <div className="report-row-split">
              <div className="report-field-group">
                <label>Your Name</label>
                <input
                  type="text"
                  placeholder="Concerned Citizen"
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                  className="report-input"
                />
              </div>
              <div className="report-field-group">
                <label>Contact Number</label>
                <input
                  type="tel"
                  placeholder="+91 98XXXXXXXX"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="report-input"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="report-error-banner">
                <AlertTriangle size={16} /> {errorMsg}
              </div>
            )}

            <button type="submit" className="submit-hazard-btn" disabled={submitting}>
              {submitting ? (
                "Saving Report & Photos to MongoDB..."
              ) : (
                <>
                  <Send size={18} /> Submit Hazard Report — Alert Traffic Police Now
                </>
              )}
            </button>

            <p className="report-privacy-note">
              Your report and attached photos are persisted in MongoDB Atlas and dispatched immediately
              to jurisdiction Traffic Police.
            </p>
          </form>

          {/* LIVE RECOMMENDATION & NEARBY EMERGENCY SIDEBAR */}
          <div className="report-rec-sidebar">
            <div className="live-rec-card">
              <div className="live-rec-header">
                <Sparkles size={16} className="text-amber" />
                <span>AI Safety Guidance Preview</span>
                <span className="live-pulse-dot" />
              </div>
              <div className="rec-hazard-preview-label">
                {HAZARD_TYPES.find((h) => h.id === selectedType)?.icon}{" "}
                {HAZARD_TYPES.find((h) => h.id === selectedType)?.label}
                <span className={`rec-sev-badge sev-${severity.toLowerCase()}`}>{severity}</span>
              </div>
              <div className="rec-location-preview">
                <MapPin size={13} /> {activeCity} —{" "}
                {activeRoad.length > 42 ? `${activeRoad.substring(0, 42)}...` : activeRoad}
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
                <span>
                  Dial <strong>112</strong> for immediate emergency or <strong>1033</strong> for NHAI highway patrol.
                </span>
              </div>
            </div>

            {nearbyServices.length > 0 && (
              <div className="how-it-works-card">
                <h4>Live Nearby Help (OpenStreetMap Overpass)</h4>
                {nearbyServices.map((srv) => (
                  <div key={srv.id} className="nearby-poi-row">
                    <span className={`poi-icon-tag poi-${srv.category.toLowerCase()}`}>
                      {srv.category === "HOSPITAL" && <Hospital size={13} />}
                      {srv.category === "POLICE" && <Shield size={13} />}
                      {srv.category === "FUEL" && <Fuel size={13} />}
                      {srv.category}
                    </span>
                    <div className="poi-meta">
                      <strong>{srv.name}</strong>
                      {srv.phone && <span>Helpline: {srv.phone}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="how-it-works-card">
              <h4>How Your Report Helps</h4>
              <div className="how-step">
                <div className="how-step-num">1</div>
                <div>
                  <strong>Instant MongoDB Persistence</strong>
                  <p>Saved with GPS coordinates, compressed evidence images, and severity level.</p>
                </div>
              </div>
              <div className="how-step">
                <div className="how-step-num">2</div>
                <div>
                  <strong>Traffic Police Siren Alert</strong>
                  <p>Jurisdiction officers receive a live alarm on their command dashboard.</p>
                </div>
              </div>
              <div className="how-step">
                <div className="how-step-num">3</div>
                <div>
                  <strong>Dynamic Route Rerouting</strong>
                  <p>Corridor stability scores drop automatically to guide commuters around danger.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE COMMUNITY HAZARDS & VERIFICATION UPVOTES */}
      <section className="portal-card community-feed-section" style={{ marginTop: 32 }}>
        <div className="portal-card-header">
          <div>
            <h2>Live Community Hazard Feed ({liveIncidents.length} Active Reports)</h2>
            <p>Confirm active hazards on your route so commuters &amp; police know reports are verified.</p>
          </div>
          <span className="live-pulse-badge emerald">MongoDB Real-Time Feed</span>
        </div>

        {liveIncidents.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>No active community hazard reports right now.</p>
        ) : (
          <div className="community-hazards-grid">
            {liveIncidents.map((inc) => (
              <div key={inc._id} className="my-report-card">
                <div className="my-report-top">
                  <span className="incident-type-tag">{inc.type}</span>
                  <span className={`severity-tag sev-${(inc.severity || "medium").toLowerCase()}`}>
                    {inc.severity}
                  </span>
                  <span className="community-city-tag">{inc.city}</span>
                </div>

                <h4>{inc.roadName || inc.roadId}</h4>
                <p className="report-card-loc">
                  <MapPin size={12} /> {inc.location || inc.roadName}
                </p>
                {inc.coordinates?.latitude && (
                  <p className="report-card-coords">
                    GPS: {Number(inc.coordinates.latitude).toFixed(4)}°N,{" "}
                    {Number(inc.coordinates.longitude).toFixed(4)}°E
                  </p>
                )}
                {inc.description && <p className="report-card-desc">{inc.description}</p>}

                {Array.isArray(inc.images) && inc.images.length > 0 && (
                  <div className="report-thumbs-row">
                    {inc.images.map((imgSrc, idx) => (
                      <img
                        key={idx}
                        src={imgSrc}
                        alt="Hazard evidence"
                        onClick={() => setLightboxImage(imgSrc)}
                      />
                    ))}
                  </div>
                )}

                <div className="my-report-foot">
                  <span>By {inc.reportedBy || "Citizen"}</span>
                  <button
                    type="button"
                    className="upvote-action-btn"
                    onClick={() => handleUpvote(inc._id)}
                    disabled={upvotingId === inc._id}
                  >
                    <ThumbsUp size={13} /> Confirm ({inc.upvotes || 1})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* IMAGE LIGHTBOX */}
      {lightboxImage && (
        <div className="emergency-modal-overlay" onClick={() => setLightboxImage("")}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setLightboxImage("")}
            >
              <X size={18} />
            </button>
            <img src={lightboxImage} alt="Hazard Evidence" />
          </div>
        </div>
      )}
    </div>
  );
}

export default IncidentReport;
