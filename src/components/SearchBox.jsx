const CITY_GROUPS = [
  {
    city: "Punjab / Jalandhar",
    emoji: "🏙️",
    presets: [
      {
        label: "LPU → Jalandhar Cantt",
        from: "Lovely Professional University, Phagwara, Punjab",
        to: "Jalandhar Cantt Railway Station, Punjab"
      },
      {
        label: "Bus Stand → Model Town",
        from: "Jalandhar City Bus Stand, Punjab",
        to: "Model Town, Jalandhar, Punjab"
      },
      {
        label: "PAP Chowk → Rama Mandi",
        from: "PAP Complex, Jalandhar, Punjab",
        to: "Rama Mandi Chowk, Jalandhar, Punjab"
      }
    ]
  },
  {
    city: "Delhi NCR",
    emoji: "🏛️",
    presets: [
      {
        label: "CP → IGI Airport",
        from: "Connaught Place, New Delhi",
        to: "Indira Gandhi International Airport, New Delhi"
      },
      {
        label: "AIIMS → Noida Sector 18",
        from: "AIIMS, New Delhi",
        to: "Noida Sector 18, Uttar Pradesh"
      }
    ]
  },
  {
    city: "Mumbai",
    emoji: "🌊",
    presets: [
      {
        label: "BKC → Nariman Point",
        from: "Bandra Kurla Complex, Mumbai, Maharashtra",
        to: "Nariman Point, Mumbai, Maharashtra"
      },
      {
        label: "Bandra → Worli Sea Link",
        from: "Bandra, Mumbai, Maharashtra",
        to: "Worli Sea Face, Mumbai, Maharashtra"
      }
    ]
  },
  {
    city: "Bengaluru",
    emoji: "🌿",
    presets: [
      {
        label: "Koramangala → Whitefield",
        from: "Koramangala 5th Block, Bangalore, Karnataka",
        to: "International Tech Park, Whitefield, Bangalore"
      }
    ]
  },
  {
    city: "Chandigarh",
    emoji: "🌲",
    presets: [
      {
        label: "Sector 17 → Airport",
        from: "Sector 17 Plaza, Chandigarh",
        to: "Chandigarh International Airport, Mohali"
      }
    ]
  }
];

import { useState } from "react";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";

function SearchBox({ from, to, setFrom, setTo, onSearch, loading = false }) {
  const [openCityGroup, setOpenCityGroup] = useState("Punjab / Jalandhar");

  function handleKeyDown(e) {
    if (e.key === "Enter" && !loading) {
      onSearch();
    }
  }

  function handleSwap() {
    const temp = from;
    setFrom(to);
    setTo(temp);
  }

  function applyPreset(preset) {
    setFrom(preset.from);
    setTo(preset.to);
  }

  return (
    <section className="search-box-card">
      <div className="search-inputs-wrapper">
        <div className="input-field-group">
          <label htmlFor="from-input">
            <span className="dot dot-green" /> Starting Point (Origin)
          </label>
          <input
            id="from-input"
            type="text"
            placeholder="e.g. Connaught Place, New Delhi"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </div>

        <button
          type="button"
          className="swap-button"
          onClick={handleSwap}
          title="Swap starting point and destination"
          disabled={loading || (!from && !to)}
          aria-label="Swap locations"
        >
          ⇄
        </button>

        <div className="input-field-group">
          <label htmlFor="to-input">
            <span className="dot dot-red" /> Destination
          </label>
          <input
            id="to-input"
            type="text"
            placeholder="e.g. IGI Airport, New Delhi"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </div>
      </div>

      {/* MULTI-CITY QUICK DEMO PRESETS */}
      <div className="city-presets-container">
        <span className="presets-label">
          <MapPin size={13} /> Quick Demo Routes by City:
        </span>

        <div className="city-tabs-row">
          {CITY_GROUPS.map((group) => (
            <button
              key={group.city}
              type="button"
              className={`city-tab-btn ${openCityGroup === group.city ? "city-tab-active" : ""}`}
              onClick={() => setOpenCityGroup(openCityGroup === group.city ? null : group.city)}
              disabled={loading}
            >
              {group.emoji} {group.city}
              {openCityGroup === group.city ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          ))}
        </div>

        {openCityGroup && (
          <div className="city-presets-chips">
            {CITY_GROUPS.find((g) => g.city === openCityGroup)?.presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-chip"
                onClick={() => applyPreset(p)}
                disabled={loading}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className="search-submit-btn"
        onClick={onSearch}
        disabled={loading || !from.trim() || !to.trim()}
      >
        {loading ? (
          <>
            <span className="btn-spinner" /> Evaluating Route Stability...
          </>
        ) : (
          "🔍 Find Best Route with Traffic Memory"
        )}
      </button>
    </section>
  );
}

export default SearchBox;
