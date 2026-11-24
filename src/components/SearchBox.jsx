import { useState, useRef, useEffect } from "react";
import {
  MapPin,
  Compass,
  Sparkles,
  Navigation,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Check,
  Zap,
  Building,
  GraduationCap,
  Plane,
  Train
} from "lucide-react";

// Curated Pan-India smart suggestion autocomplete dictionary
const POPULAR_INDIAN_SUGGESTIONS = [
  // Punjab / Jalandhar
  { label: "Lovely Professional University (LPU Gate / NH-44), Phagwara", city: "Punjab", icon: "GraduationCap" },
  { label: "Phagwara Junction & GT Road, Punjab", city: "Punjab", icon: "Train" },
  { label: "Jalandhar Cantt Railway Station & Military Area, Punjab", city: "Punjab", icon: "Train" },
  { label: "PAP Chowk / NH-44 Flyover, Jalandhar, Punjab", city: "Punjab", icon: "Navigation" },
  { label: "BMC Chowk, Central Jalandhar, Punjab", city: "Punjab", icon: "Building" },
  { label: "Rama Mandi Junction / Hoshiarpur Road, Jalandhar, Punjab", city: "Punjab", icon: "Navigation" },
  { label: "Golden Temple & Heritage Street, Amritsar, Punjab", city: "Punjab", icon: "Building" },
  { label: "Ludhiana City Center & Clock Tower, Punjab", city: "Punjab", icon: "Building" },

  // Delhi NCR
  { label: "Connaught Place (Rajiv Chowk), New Delhi", city: "Delhi", icon: "Building" },
  { label: "Indira Gandhi International Airport, Terminal 3, New Delhi", city: "Delhi", icon: "Plane" },
  { label: "IGI Domestic Terminal 1, New Delhi", city: "Delhi", icon: "Plane" },
  { label: "AIIMS New Delhi & Ring Road Corridor", city: "Delhi", icon: "Building" },
  { label: "Noida Sector 18 Commercial Hub & DND Flyway, Uttar Pradesh", city: "Noida", icon: "Building" },
  { label: "Noida Sector 62 Electronic City, Uttar Pradesh", city: "Noida", icon: "Building" },
  { label: "DLF Cyber Hub & Cyber City, Sector 24, Gurugram", city: "Gurgaon", icon: "Building" },
  { label: "Akshardham / Delhi-Meerut Expressway Interchange, New Delhi", city: "Delhi", icon: "Navigation" },
  { label: "ISBT Kashmere Gate & Grand Trunk Road, Delhi", city: "Delhi", icon: "Train" },
  { label: "India Gate & Kartavya Path, New Delhi", city: "Delhi", icon: "Building" },

  // Mumbai & Maharashtra
  { label: "Bandra Kurla Complex (BKC Financial District), Mumbai", city: "Mumbai", icon: "Building" },
  { label: "Nariman Point & Marine Drive Promenade, South Mumbai", city: "Mumbai", icon: "Building" },
  { label: "Chhatrapati Shivaji Maharaj International Airport (T2), Mumbai", city: "Mumbai", icon: "Plane" },
  { label: "Vashi Navi Mumbai & Sion-Panvel Expressway, Maharashtra", city: "Mumbai", icon: "Navigation" },
  { label: "Eastern Freeway Corridor (Chembur to Orange Gate), Mumbai", city: "Mumbai", icon: "Navigation" },
  { label: "Hinjewadi Rajiv Gandhi Infotech Park Phase 1, Pune", city: "Pune", icon: "Building" },

  // Bengaluru
  { label: "Koramangala 5th Block Startup Corridor, Bengaluru", city: "Bengaluru", icon: "Building" },
  { label: "ITPB International Tech Park, Whitefield, Bengaluru", city: "Bengaluru", icon: "Building" },
  { label: "Electronic City Phase 1 & Hosur Road Elevated Expressway, Bengaluru", city: "Bengaluru", icon: "Navigation" },
  { label: "Kempegowda International Airport (BLR), Devanahalli, Bengaluru", city: "Bengaluru", icon: "Plane" },
  { label: "Central Silk Board Junction (Outer Ring Road), Bengaluru", city: "Bengaluru", icon: "Navigation" },
  { label: "Indiranagar 100 Feet Road, Bengaluru", city: "Bengaluru", icon: "Building" },

  // Chandigarh & Tricity
  { label: "Sector 17 City Plaza, Chandigarh", city: "Chandigarh", icon: "Building" },
  { label: "Shaheed Bhagat Singh International Airport (PR-7), Mohali/Chandigarh", city: "Chandigarh", icon: "Plane" },
  { label: "Tribune Chowk / Himalayan Expressway Junction, Chandigarh", city: "Chandigarh", icon: "Navigation" },

  // Hyderabad, Chennai, Kolkata
  { label: "Hitec City & Mindspace IT Park, Cyberabad, Hyderabad", city: "Hyderabad", icon: "Building" },
  { label: "Rajiv Gandhi International Airport (RGIA), Shamshabad, Hyderabad", city: "Hyderabad", icon: "Plane" },
  { label: "T. Nagar Commercial Corridor, Chennai", city: "Chennai", icon: "Building" },
  { label: "Chennai International Airport, Meenambakkam, Tamil Nadu", city: "Chennai", icon: "Plane" },
  { label: "Howrah Railway Terminus & Howrah Bridge, Kolkata", city: "Kolkata", icon: "Train" },
  { label: "Salt Lake Sector V & Biswa Bangla Gate, Kolkata", city: "Kolkata", icon: "Building" },
  { label: "Netaji Subhash Chandra Bose International Airport (CCU), Kolkata", city: "Kolkata", icon: "Plane" }
];

const FAST_CORRIDOR_PRESETS = [
  {
    name: "LPU → Jalandhar Cantt",
    tag: "🎓 Punjab Hub",
    from: "Lovely Professional University (LPU Gate / NH-44), Phagwara",
    to: "Jalandhar Cantt Railway Station & Military Area, Punjab"
  },
  {
    name: "Connaught Place → IGI Airport",
    tag: "✈️ Delhi Corridor",
    from: "Connaught Place (Rajiv Chowk), New Delhi",
    to: "Indira Gandhi International Airport, Terminal 3, New Delhi"
  },
  {
    name: "BKC → Nariman Point",
    tag: "🏢 Mumbai Arterial",
    from: "Bandra Kurla Complex (BKC Financial District), Mumbai",
    to: "Nariman Point & Marine Drive Promenade, South Mumbai"
  },
  {
    name: "Koramangala → ITPB Whitefield",
    tag: "💻 Bengaluru Tech",
    from: "Koramangala 5th Block Startup Corridor, Bengaluru",
    to: "ITPB International Tech Park, Whitefield, Bengaluru"
  },
  {
    name: "Sector 17 → Chandigarh Airport",
    tag: "🏔️ Tricity PR-7",
    from: "Sector 17 City Plaza, Chandigarh",
    to: "Shaheed Bhagat Singh International Airport (PR-7), Mohali/Chandigarh"
  },
  {
    name: "AIIMS → Noida Sector 18",
    tag: "⚡ DND Express",
    from: "AIIMS New Delhi & Ring Road Corridor",
    to: "Noida Sector 18 Commercial Hub & DND Flyway, Uttar Pradesh"
  }
];

export default function SearchBox({ from, to, setFrom, setTo, onSearch, loading = false }) {
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeChip, setActiveChip] = useState(null);

  const fromRef = useRef(null);
  const toRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (fromRef.current && !fromRef.current.contains(e.target)) {
        setShowFromDropdown(false);
      }
      if (toRef.current && !toRef.current.contains(e.target)) {
        setShowToDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function filterSuggestions(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase().trim();
    return POPULAR_INDIAN_SUGGESTIONS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.city.toLowerCase().includes(q)
    ).slice(0, 5);
  }

  function handleFromChange(val) {
    setFrom(val);
    const matches = filterSuggestions(val);
    setFromSuggestions(matches);
    setShowFromDropdown(matches.length > 0);
  }

  function handleToChange(val) {
    setTo(val);
    const matches = filterSuggestions(val);
    setToSuggestions(matches);
    setShowToDropdown(matches.length > 0);
  }

  function handleSwap() {
    const temp = from;
    setFrom(to);
    setTo(temp);
  }

  function applyPreset(p, idx) {
    setActiveChip(idx);
    setFrom(p.from);
    setTo(p.to);
    setShowFromDropdown(false);
    setShowToDropdown(false);
  }

  // HTML5 Live Device Geolocation
  function handleLocateMe() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFrom(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        setIsLocating(false);
      },
      () => {
        // Fallback default if user denies permission
        setFrom("Connaught Place (Rajiv Chowk), New Delhi");
        setIsLocating(false);
      },
      { timeout: 7000 }
    );
  }

  function renderSuggestionIcon(type) {
    switch (type) {
      case "GraduationCap":
        return <GraduationCap size={14} className="sugg-icon text-amber" />;
      case "Plane":
        return <Plane size={14} className="sugg-icon text-cyan" />;
      case "Train":
        return <Train size={14} className="sugg-icon text-purple" />;
      default:
        return <Building size={14} className="sugg-icon text-emerald" />;
    }
  }

  return (
    <section className="search-box-card cyber-glow-panel">
      {/* GLOWING AMBIENT CORNER LIGHTS */}
      <div className="panel-glow-corner corner-tl" />
      <div className="panel-glow-corner corner-br" />

      {/* TOP HEADER STATUS */}
      <div className="search-header-status">
        <div className="header-status-left">
          <span className="radar-ping-icon">
            <span className="radar-circle-pulse" />
            <Navigation size={15} className="compass-icon-anim" />
          </span>
          <span className="search-status-title">Pan-India Adaptive Route Optimizer</span>
          <span className="status-live-tag">GPS &amp; OSRM Active</span>
        </div>

        <button
          type="button"
          className="locate-me-btn"
          onClick={handleLocateMe}
          title="Use current GPS device location as origin"
          disabled={loading || isLocating}
        >
          <Crosshair size={13} className={isLocating ? "spin-icon" : ""} />
          <span>{isLocating ? "Acquiring GPS..." : "Locate My GPS"}</span>
        </button>
      </div>

      {/* INPUTS WRAPPER */}
      <div className="search-inputs-wrapper">
        {/* FROM INPUT WITH AUTOCOMPLETE */}
        <div className="input-field-group" ref={fromRef}>
          <label htmlFor="from-input">
            <span className="dot dot-green dot-glow-green" />
            <span>Origin Point (Landmark, University, City, Corridor)</span>
          </label>
          <div className="input-with-icon">
            <MapPin size={16} className="field-icon icon-green" />
            <input
              id="from-input"
              type="text"
              placeholder="e.g. LPU Phagwara, Connaught Place, BKC Mumbai, Sector 17 Chandigarh..."
              value={from}
              onChange={(e) => handleFromChange(e.target.value)}
              onFocus={() => {
                const matches = filterSuggestions(from);
                setFromSuggestions(matches);
                setShowFromDropdown(matches.length > 0);
              }}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {/* AUTOCOMPLETE DROPDOWN */}
          {showFromDropdown && fromSuggestions.length > 0 && (
            <div className="smart-autocomplete-dropdown">
              <div className="dropdown-label">Smart Suggestions:</div>
              {fromSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="autocomplete-item"
                  onClick={() => {
                    setFrom(s.label);
                    setShowFromDropdown(false);
                  }}
                >
                  {renderSuggestionIcon(s.icon)}
                  <div className="item-text-wrap">
                    <span className="item-label">{s.label}</span>
                    <span className="item-city-badge">{s.city}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SWAP BUTTON */}
        <button
          type="button"
          className="swap-button cyber-swap-btn"
          onClick={handleSwap}
          title="Swap origin and destination"
          disabled={loading || (!from && !to)}
          aria-label="Swap locations"
        >
          <ArrowRightLeft size={16} className="swap-icon-anim" />
        </button>

        {/* TO INPUT WITH AUTOCOMPLETE */}
        <div className="input-field-group" ref={toRef}>
          <label htmlFor="to-input">
            <span className="dot dot-red dot-glow-red" />
            <span>Destination (Airport, Sector, Hub, Railway Terminus)</span>
          </label>
          <div className="input-with-icon">
            <MapPin size={16} className="field-icon icon-red" />
            <input
              id="to-input"
              type="text"
              placeholder="e.g. IGI Airport T3, Jalandhar Cantt, Nariman Point, ITPB Whitefield..."
              value={to}
              onChange={(e) => handleToChange(e.target.value)}
              onFocus={() => {
                const matches = filterSuggestions(to);
                setToSuggestions(matches);
                setShowToDropdown(matches.length > 0);
              }}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {/* AUTOCOMPLETE DROPDOWN */}
          {showToDropdown && toSuggestions.length > 0 && (
            <div className="smart-autocomplete-dropdown">
              <div className="dropdown-label">Smart Suggestions:</div>
              {toSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="autocomplete-item"
                  onClick={() => {
                    setTo(s.label);
                    setShowToDropdown(false);
                  }}
                >
                  {renderSuggestionIcon(s.icon)}
                  <div className="item-text-wrap">
                    <span className="item-label">{s.label}</span>
                    <span className="item-city-badge">{s.city}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* POPULAR HIGHWAY & SMART CITY CORRIDORS */}
      <div className="fast-presets-section">
        <div className="fast-presets-label">
          <Zap size={14} className="text-amber" />
          <span>Popular Fast Corridors:</span>
        </div>

        <div className="fast-chips-scroll">
          {FAST_CORRIDOR_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className={`fast-corridor-chip ${activeChip === idx ? "active-fast-chip" : ""}`}
              onClick={() => applyPreset(p, idx)}
              disabled={loading}
              title={`${p.from} → ${p.to}`}
            >
              <span className="chip-tag">{p.tag}</span>
              <span className="chip-name">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SUBMIT BUTTON WITH GLOWING CYBER ACTION */}
      <button
        type="button"
        className="search-submit-btn cyber-submit-btn"
        onClick={onSearch}
        disabled={loading || !from.trim() || !to.trim()}
      >
        <span className="btn-glow-shimmer" />
        {loading ? (
          <>
            <span className="btn-spinner" />
            <span>Analyzing Traffic Memory &amp; Stability Grid...</span>
          </>
        ) : (
          <>
            <Sparkles size={17} className="btn-sparkle-icon" />
            <span>Calculate Pan-India Optimal Route &amp; Stability Score</span>
          </>
        )}
      </button>
    </section>
  );
}
