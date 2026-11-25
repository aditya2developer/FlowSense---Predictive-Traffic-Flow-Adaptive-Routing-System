import { useState, useEffect } from "react";
import {
  reportIncident,
  fetchIncidents,
  upvoteIncident,
  reverseGeocodeCoords,
  fetchNearbyServices
} from "../api";
import { compressImageFile } from "../utils/imageHelper";
import { INDIA_STATES_AND_UTS, getCitiesForState } from "../utils/indiaLocations";
import { useAuth } from "../context/AuthContext";
import { useCity } from "../context/CityContext";
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

function getLiveRecommendationPreview(type) {
  switch (type) {
    case "ACCIDENT": return { driver: "Approach with caution under 30 km/h. Keep the right lane clear for emergency ambulance.", police: "Dispatch nearest patrol and medical unit. Establish a 300m warning perimeter." };
    case "FLOOD": return { driver: "Avoid submerged dips and underpasses. Do not restart stalled engines in deep water.", police: "Deploy drainage pumps and install reflective flood warning barriers." };
    case "ROADBLOCK": return { driver: "Road blocked ahead. Follow suggested detour corridor.", police: "Deploy traffic officers at preceding junctions and issue detour advisory." };
    case "POTHOLE": return { driver: "Two-wheelers maintain steady grip and avoid abrupt lane changes.", police: "Mark hazard with warning cones and notify municipal road maintenance." };
    case "FIRE_HAZARD": return { driver: "Roll up windows and yield all lanes immediately for fire tenders.", police: "Secure a 200m safety perimeter and guide fire brigade units." };
    case "TRAFFIC_JAM": return { driver: "Expect delays. Consider taking an alternate route or delaying departure.", police: "Clear curb bottlenecks and adjust intersection green-signal cycles." };
    case "CONSTRUCTION": return { driver: "Reduce speed to 40 km/h and watch for workers and lane shifts.", police: "Verify reflective barricading compliance on the active corridor." };
    case "DEBRIS": return { driver: "Slow down to 30 km/h, enable hazard blinkers, and keep safe clearance.", police: "Dispatch quick-response patrol to remove road obstruction." };
    case "STALLED_VEHICLE": return { driver: "Merge safely leaving clear access for towing recovery.", police: "Dispatch highway patrol recovery crane and place warning triangles." };
    default: return { driver: "Drive cautiously and maintain safe stopping distance.", police: "Assign patrol unit to inspect location and restore flow." };
  }
}

function IncidentReport() {
  const { user } = useAuth();
  const { activeState, activeCity, cityMeta } = useCity();

  const [selectedState, setSelectedState] = useState(() => activeState || "Delhi (NCT)");
  const [selectedCity, setSelectedCity] = useState(() => activeCity || "Delhi NCR");
  const [customCity, setCustomCity] = useState("");
  const [prevGlobalCity, setPrevGlobalCity] = useState(`${activeState}:${activeCity}`);

  if (`${activeState}:${activeCity}` !== prevGlobalCity) {
    setPrevGlobalCity(`${activeState}:${activeCity}`);
    setSelectedState(activeState);
    setSelectedCity(activeCity);
  }

  const availableCities = getCitiesForState(selectedState);
  const presetRoads = cityMeta?.corridors || [];

  const [selectedType, setSelectedType] = useState("ACCIDENT");
  const [severity, setSeverity] = useState("HIGH");
  const [roadName, setRoadName] = useState(() => presetRoads[0] || "");
  const [customRoad, setCustomRoad] = useState("");
  const [useCustomRoad, setUseCustomRoad] = useState(() => presetRoads.length === 0);
  const [landmark, setLandmark] = useState("");
  const [description, setDescription] = useState("");
  const [reportedBy, setReportedBy] = useState(() => user?.name || "");
  const [contactPhone, setContactPhone] = useState(() => user?.phone || "");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [gpsStatus, setGpsStatus] = useState("");
  const [locatingGps, setLocatingGps] = useState(false);
  const [nearbyServices, setNearbyServices] = useState([]);
  const [images, setImages] = useState([]);
  const [uploadingImg, setUploadingImg] = useState(false);

  const [liveIncidents, setLiveIncidents] = useState([]);
  const [upvotingId, setUpvotingId] = useState("");
  const [lightboxImage, setLightboxImage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const finalCity = selectedCity === "Other" ? customCity.trim() || "Custom City" : selectedCity;
  const activeRoad = useCustomRoad ? customRoad.trim() || "Road Corridor" : roadName || `${finalCity} Main Road`;
  const liveRec = getLiveRecommendationPreview(selectedType);

  useEffect(() => {
    let active = true;
    fetchIncidents(finalCity)
      .then((res) => {
        if (active && res.success && Array.isArray(res.data)) {
          setLiveIncidents(res.data.slice(0, 8));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [finalCity]);

  function handleStateChange(nextState) {
    setSelectedState(nextState);
    const list = getCitiesForState(nextState);
    const firstCity = list[0];
    setSelectedCity(firstCity ? firstCity.name : "Other");
    setCustomCity("");
    if (firstCity?.corridors?.length) {
      setRoadName(firstCity.corridors[0]);
      setUseCustomRoad(false);
    } else {
      setUseCustomRoad(true);
      setCustomRoad("");
    }
  }

  function handleCityChange(nextCity) {
    setSelectedCity(nextCity);
    setCustomCity("");
    const match = availableCities.find((c) => c.name === nextCity);
    if (match?.corridors?.length) {
      setRoadName(match.corridors[0]);
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
    setGpsStatus("Detecting GPS coordinates and street address...");
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
            if (addr.street) {
              setUseCustomRoad(true);
              setCustomRoad(addr.street);
            }
            if (addr.displayName) {
              setLandmark(addr.displayName.split(",").slice(0, 2).join(", "));
            }
            setGpsStatus(`Location locked (${lat}, ${lon})`);
          } else {
            setGpsStatus(`Location locked (${lat}, ${lon})`);
          }

          if (poiRes.success && poiRes.data?.services) {
            setNearbyServices(poiRes.data.services.slice(0, 6));
          }
        } catch {
          setGpsStatus(`GPS captured (${lat}, ${lon})`);
        } finally {
          setLocatingGps(false);
        }
      },
      (err) => {
        setLocatingGps(false);
        setGpsStatus("");
        setErrorMsg(`GPS detection unavailable (${err.message}). You can enter your location manually.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 3 - images.length;
    if (remainingSlots <= 0) {
      setErrorMsg("Maximum 3 photos allowed per incident report.");
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
    if (!finalCity.trim() || !activeRoad.trim()) {
      setErrorMsg("Please specify both city and road location.");
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
        roadName: activeRoad,
        city: finalCity,
        type: selectedType,
        severity,
        landmark: landmark.trim(),
        description:
          description.trim() ||
          `Reported ${selectedType.toLowerCase().replace(/_/g, " ")} hazard on ${activeRoad}`,
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
        fetchIncidents(finalCity).then((r) => {
          if (r.success && Array.isArray(r.data)) setLiveIncidents(r.data.slice(0, 8));
        });
        window.dispatchEvent(
          new CustomEvent("flowsense-hazard-reported", {
            detail: {
              id: res.data?._id || generatedRoadId,
              type: selectedType,
              title: `NEW HAZARD REPORTED: ${selectedType.replace(/_/g, " ")}`,
              roadName: activeRoad,
              city: finalCity,
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
        setErrorMsg(res.message || "Failed to submit hazard report.");
      }
    } catch {
      setErrorMsg("Unable to submit hazard report right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container incident-report-page">
      {/* HEADER */}
      <section className="incident-hero-section">
        <div className="incident-hero-content">
          <div className="incident-hero-badge">
            <AlertTriangle size={14} /> Live Road Hazard Reporting — {finalCity}
          </div>
          <h1>Report a Road Hazard with Live GPS &amp; Photos</h1>
          <p>
            Capture your exact location, upload photos of road incidents or blocks, and alert local
            commuters and traffic authorities immediately.
          </p>
          <div className="emergency-quick-dial-row">
            <a href="tel:112" className="quick-dial-chip chip-red"><Phone size={14} /> 112 — National Emergency</a>
            <a href="tel:1033" className="quick-dial-chip chip-blue"><Phone size={14} /> 1033 — Highway Help</a>
            <a href="tel:108" className="quick-dial-chip chip-green"><Phone size={14} /> 108 — Ambulance</a>
          </div>
        </div>
      </section>

      {successData && (
        <section className="report-success-banner-full">
          <div className="success-full-inner">
            <CheckCircle2 size={40} className="success-big-icon" />
            <div>
              <h2>Hazard Report Submitted!</h2>
              <p>
                Your report for <strong>{activeRoad}</strong> in <strong>{finalCity}</strong> is now
                live and Traffic Authorities have been alerted.
              </p>
              {(successData.driverRecommendation || successData.data?.recommendation) && (
                <div className="success-driver-rec-box">
                  <strong>Recommended Action for Commuters:</strong>
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
          <form onSubmit={handleSubmit} className="incident-form-card">
            <div className="form-section-header-between">
              <div className="form-section-header" style={{ margin: 0 }}>
                <MapPin size={18} className="text-cyan" />
                <h3>Step 1 — State, City &amp; GPS Location</h3>
              </div>
              <button
                type="button"
                className="locate-me-btn"
                onClick={handleDetectGPS}
                disabled={locatingGps}
              >
                <Crosshair size={14} className={locatingGps ? "spin-icon" : ""} />
                <span>{locatingGps ? "Detecting GPS..." : "Detect My GPS"}</span>
              </button>
            </div>

            {gpsStatus && (
              <div className="gps-locked-banner">
                <Navigation size={14} className="text-emerald" />
                <span>{gpsStatus}</span>
              </div>
            )}

            <div className="report-row-split">
              <div className="report-field-group">
                <label>State / Union Territory *</label>
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="report-select"
                  required
                >
                  {INDIA_STATES_AND_UTS.map((s) => (
                    <option key={s.state} value={s.state}>
                      {s.state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="report-field-group">
                <label>City / District *</label>
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="report-select"
                  required
                >
                  {availableCities.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="Other">Other City / Town</option>
                </select>
              </div>
            </div>

            {selectedCity === "Other" && (
              <div className="report-field-group">
                <label>Enter City / Town Name *</label>
                <input
                  type="text"
                  placeholder={`Enter city or town in ${selectedState}`}
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  className="report-input"
                  required
                />
              </div>
            )}

            <div className="report-field-group">
              <label>Road / Street / Highway *</label>
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
                    placeholder={`Road or highway name in ${finalCity}`}
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
                      ← Use suggested roads
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="report-field-group">
              <label>Landmark / Exact Spot</label>
              <input
                type="text"
                placeholder="e.g. Near Metro Gate, Toll Plaza, or Market Chowk"
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
                  placeholder="Latitude"
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
                  placeholder="Longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="report-input"
                />
              </div>
            </div>

            <div className="form-section-header" style={{ marginTop: 20 }}>
              <AlertTriangle size={18} className="text-amber" />
              <h3>Step 2 — Hazard Type, Photos &amp; Details</h3>
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

            <div className="report-field-group">
              <label>Upload Incident Photos (Up to 3 Photos)</label>
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
                      ? "Processing photos..."
                      : images.length >= 3
                        ? "Maximum 3 photos attached"
                        : `Attach Incident Photos (${images.length}/3 uploaded)`}
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
              <label>Description</label>
              <textarea
                rows={3}
                placeholder="Describe lanes affected, waterlogging depth, traffic backup, or detour details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="report-textarea"
              />
            </div>

            <div className="form-section-header" style={{ marginTop: 20 }}>
              <Phone size={18} className="text-emerald" />
              <h3>Step 3 — Contact Details (Kept Confidential for Police Only)</h3>
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
                <label>Phone Number (Private to Police)</label>
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
              {submitting ? "Submitting Report..." : (
                <>
                  <Send size={18} /> Submit Hazard Report
                </>
              )}
            </button>
          </form>

          {/* SIDEBAR */}
          <div className="report-rec-sidebar">
            <div className="live-rec-card">
              <div className="live-rec-header">
                <Sparkles size={16} className="text-amber" />
                <span>Safety Advisory Preview</span>
                <span className="live-pulse-dot" />
              </div>
              <div className="rec-hazard-preview-label">
                {HAZARD_TYPES.find((h) => h.id === selectedType)?.icon}{" "}
                {HAZARD_TYPES.find((h) => h.id === selectedType)?.label}
                <span className={`rec-sev-badge sev-${severity.toLowerCase()}`}>{severity}</span>
              </div>
              <div className="rec-location-preview">
                <MapPin size={13} /> {finalCity} —{" "}
                {activeRoad.length > 42 ? `${activeRoad.substring(0, 42)}...` : activeRoad}
              </div>
              <div className="rec-box driver-rec">
                <div className="rec-title"><Car size={15} /> For Drivers:</div>
                <p>{liveRec.driver}</p>
              </div>
              <div className="rec-box police-rec">
                <div className="rec-title"><ShieldAlert size={15} /> Traffic Police Action:</div>
                <p>{liveRec.police}</p>
              </div>
              <div className="rec-helpline-box">
                <Info size={14} />
                <span>
                  Dial <strong>112</strong> for immediate emergency or <strong>1033</strong> on highways.
                </span>
              </div>
            </div>

            {nearbyServices.length > 0 && (
              <div className="how-it-works-card">
                <h4>Nearby Hospitals, Police &amp; Fuel</h4>
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
          </div>
        </div>
      )}

      {/* CITY COMMUNITY HAZARDS FEED */}
      <section className="portal-card community-feed-section" style={{ marginTop: 32 }}>
        <div className="portal-card-header">
          <div>
            <h2>Live Road Hazards in {finalCity} ({liveIncidents.length})</h2>
            <p>Confirm active incidents on your route to help other commuters in {finalCity}.</p>
          </div>
          <span className="live-pulse-badge emerald">{finalCity} Live Feed</span>
        </div>

        {liveIncidents.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>No active road hazards reported in {finalCity} right now.</p>
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
                        alt="Hazard photo"
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
