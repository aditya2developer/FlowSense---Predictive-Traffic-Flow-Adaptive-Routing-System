import { useState } from "react";
import { MapPin, ChevronDown, ChevronUp, Compass, Sparkles, Navigation } from "lucide-react";

const REGIONAL_CITY_GROUPS = [
  {
    region: "Northern Hubs (Delhi, Punjab, UP, Chd)",
    emoji: "🏛️",
    presets: [
      {
        city: "Delhi NCR",
        label: "Connaught Place → IGI Airport T3",
        from: "Connaught Place, New Delhi",
        to: "Indira Gandhi International Airport, Terminal 3, New Delhi"
      },
      {
        city: "Delhi - Noida",
        label: "AIIMS Delhi → Noida Sector 18",
        from: "AIIMS New Delhi, Ansari Nagar",
        to: "Noida Sector 18, Uttar Pradesh"
      },
      {
        city: "Chandigarh",
        label: "Sector 17 Plaza → Chandigarh Airport",
        from: "Sector 17 Plaza, Chandigarh",
        to: "Chandigarh International Airport, Mohali, Punjab"
      },
      {
        city: "Punjab",
        label: "LPU Phagwara → Jalandhar Cantt",
        from: "Lovely Professional University, Phagwara, Punjab",
        to: "Jalandhar Cantt Railway Station, Punjab"
      },
      {
        city: "Uttar Pradesh",
        label: "Hazratganj Lucknow → CCS Airport",
        from: "Hazratganj, Lucknow, Uttar Pradesh",
        to: "Chaudhary Charan Singh International Airport, Lucknow"
      },
      {
        city: "Rajasthan",
        label: "Hawa Mahal Jaipur → Jaipur Airport",
        from: "Hawa Mahal, Badi Choupad, Jaipur, Rajasthan",
        to: "Jaipur International Airport, Sanganer, Jaipur"
      }
    ]
  },
  {
    region: "Western Corridor (Mumbai, Pune, Gujarat, Goa)",
    emoji: "🌊",
    presets: [
      {
        city: "Mumbai",
        label: "BKC → Nariman Point (Marine Drive)",
        from: "Bandra Kurla Complex, Mumbai, Maharashtra",
        to: "Nariman Point, South Mumbai, Maharashtra"
      },
      {
        city: "Mumbai - Pune",
        label: "Vashi Navi Mumbai → Hinjewadi Pune",
        from: "Vashi, Navi Mumbai, Maharashtra",
        to: "Hinjewadi Phase 1, Pune, Maharashtra"
      },
      {
        city: "Gujarat",
        label: "SG Highway → GIFT City Gandhinagar",
        from: "SG Highway, Bodakdev, Ahmedabad, Gujarat",
        to: "GIFT City, Gandhinagar, Gujarat"
      },
      {
        city: "Surat",
        label: "Dumas Road → Surat Railway Station",
        from: "Dumas Road, Surat, Gujarat",
        to: "Surat Railway Station, Gujarat"
      },
      {
        city: "Goa",
        label: "Panaji → Dabolim Airport Goa",
        from: "Panaji, Goa",
        to: "Dabolim Airport, Vasco da Gama, Goa"
      }
    ]
  },
  {
    region: "Southern Grid (Bengaluru, Hyderabad, Chennai, Kerala)",
    emoji: "🌿",
    presets: [
      {
        city: "Bengaluru",
        label: "Koramangala → ITPB Whitefield",
        from: "Koramangala 5th Block, Bangalore, Karnataka",
        to: "International Tech Park, Whitefield, Bangalore, Karnataka"
      },
      {
        city: "Hyderabad",
        label: "Hitec City / Cyberabad → RGIA Airport",
        from: "Hitec City, Cyberabad, Hyderabad, Telangana",
        to: "Rajiv Gandhi International Airport, Shamshabad, Hyderabad"
      },
      {
        city: "Chennai",
        label: "T. Nagar → Chennai Airport (OMR Corridor)",
        from: "T. Nagar, Chennai, Tamil Nadu",
        to: "Chennai International Airport, Meenambakkam, Tamil Nadu"
      },
      {
        city: "Kerala",
        label: "MG Road Kochi → Cochin Intl Airport",
        from: "MG Road, Ernakulam, Kochi, Kerala",
        to: "Cochin International Airport, Nedumbassery, Kerala"
      },
      {
        city: "Andhra Pradesh",
        label: "Benz Circle Vijayawada → Amaravati",
        from: "Benz Circle, Vijayawada, Andhra Pradesh",
        to: "AP State Secretariat, Amaravati, Andhra Pradesh"
      }
    ]
  },
  {
    region: "Eastern, Central & Northeast (Kolkata, Odisha, MP, Assam)",
    emoji: "🌅",
    presets: [
      {
        city: "Kolkata",
        label: "Howrah Station → Park Street",
        from: "Howrah Railway Station, West Bengal",
        to: "Park Street, Kolkata, West Bengal"
      },
      {
        city: "Kolkata Tech",
        label: "Salt Lake Sector V → Kolkata Airport",
        from: "Salt Lake Sector V, Kolkata, West Bengal",
        to: "Netaji Subhash Chandra Bose International Airport, Kolkata"
      },
      {
        city: "Odisha",
        label: "Master Canteen Bhubaneswar → Cuttack",
        from: "Master Canteen, Bhubaneswar, Odisha",
        to: "Badambadi, Cuttack, Odisha"
      },
      {
        city: "Madhya Pradesh",
        label: "Bhopal VIP Road → Indore Super Corridor",
        from: "VIP Road, Bhopal, Madhya Pradesh",
        to: "Super Corridor, Indore, Madhya Pradesh"
      },
      {
        city: "Bihar",
        label: "Gandhi Maidan Patna → Patna Airport",
        from: "Gandhi Maidan, Patna, Bihar",
        to: "Jay Prakash Narayan Airport, Patna, Bihar"
      },
      {
        city: "Northeast / Assam",
        label: "Paltan Bazar Guwahati → LGBI Airport",
        from: "Paltan Bazar, Guwahati, Assam",
        to: "Lokpriya Gopinath Bordoloi International Airport, Guwahati"
      }
    ]
  },
  {
    region: "National Expressways (Access-Controlled Arterials)",
    emoji: "🛣️",
    presets: [
      {
        city: "Yamuna Expressway",
        label: "Greater Noida → Taj Mahal Agra",
        from: "Pari Chowk, Greater Noida, Uttar Pradesh",
        to: "Taj Mahal, Agra, Uttar Pradesh"
      },
      {
        city: "Delhi-Mumbai",
        label: "Sohna Gurugram → Dausa Expressway",
        from: "Sohna Toll Plaza, Gurugram, Haryana",
        to: "Dausa Interchange, Rajasthan"
      },
      {
        city: "NH-44 Highway",
        label: "Kashmir Gate Delhi → Ambala Cantt",
        from: "Kashmere Gate, Delhi",
        to: "Ambala Cantt Railway Station, Haryana"
      },
      {
        city: "BLR-MYS Expressway",
        label: "NICE Road Bengaluru → Mysuru Ring Road",
        from: "Kengeri NICE Junction, Bengaluru, Karnataka",
        to: "Columbia Asia Junction, Mysuru, Karnataka"
      }
    ]
  }
];

function SearchBox({ from, to, setFrom, setTo, onSearch, loading = false }) {
  const [openRegionIdx, setOpenRegionIdx] = useState(0);

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
            <span className="dot dot-green" /> Starting Point (Any City / Highway / Landmark in India)
          </label>
          <input
            id="from-input"
            type="text"
            placeholder="e.g. Connaught Place Delhi, BKC Mumbai, Koramangala Bengaluru, LPU Phagwara..."
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
            <span className="dot dot-red" /> Destination (Any City / Airport / District in India)
          </label>
          <input
            id="to-input"
            type="text"
            placeholder="e.g. IGI Airport Terminal 3, Nariman Point, ITPB Whitefield, Jalandhar Cantt..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </div>
      </div>

      {/* PAN-INDIA MULTI-REGION & MULTI-STATE PRESET BROWSER */}
      <div className="city-presets-container">
        <div className="presets-label-bar">
          <span className="presets-label">
            <Compass size={14} className="text-cyan" /> Pan-India Regional Quick Presets (All States &amp; Expressways):
          </span>
          <span className="pan-india-flag-badge">🇮🇳 28 States &amp; 8 UTs Supported</span>
        </div>

        {/* REGION SELECTOR TABS */}
        <div className="city-tabs-row">
          {REGIONAL_CITY_GROUPS.map((group, idx) => (
            <button
              key={group.region}
              type="button"
              className={`city-tab-btn ${openRegionIdx === idx ? "city-tab-active" : ""}`}
              onClick={() => setOpenRegionIdx(openRegionIdx === idx ? null : idx)}
              disabled={loading}
            >
              {group.emoji} {group.region}
              {openRegionIdx === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          ))}
        </div>

        {/* PRESET ROUTE CHIPS */}
        {openRegionIdx !== null && (
          <div className="city-presets-chips">
            {REGIONAL_CITY_GROUPS[openRegionIdx]?.presets.map((p, pIdx) => (
              <button
                key={pIdx}
                type="button"
                className="preset-chip pan-india-chip"
                onClick={() => applyPreset(p)}
                disabled={loading}
                title={`${p.from} → ${p.to}`}
              >
                <span className="chip-city-tag">{p.city}:</span> {p.label}
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
            <span className="btn-spinner" /> Querying Pan-India OSRM &amp; Traffic Memory...
          </>
        ) : (
          "🔍 Calculate Pan-India Optimal Route & Stability Score"
        )}
      </button>
    </section>
  );
}

export default SearchBox;
