import { useState, useRef, useEffect } from "react";
import { useCity } from "../context/CityContext";
import { INDIA_STATES_AND_UTS, getCitiesForState } from "../utils/indiaLocations";
import { fetchLiveAutocomplete, reverseGeocodeCoords } from "../api";
import {
  MapPin,
  Sparkles,
  Navigation,
  ArrowRightLeft,
  Crosshair,
  Zap,
  Building,
  Globe
} from "lucide-react";

export default function SearchBox({ from, to, setFrom, setTo, onSearch, loading = false }) {
  const { activeCity, activeState, cityCoords, cityMeta, openCityModal } = useCity();

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeChip, setActiveChip] = useState(null);

  const fromRef = useRef(null);
  const toRef = useRef(null);
  const fromTimerRef = useRef(null);
  const toTimerRef = useRef(null);

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

  function getCityFastPresets() {
    const stateCities = getCitiesForState(activeState);
    const list = [];

    if (cityMeta) {
      list.push({
        name: `${cityMeta.name} Key Route`,
        tag: cityMeta.state,
        from: cityMeta.defaultFrom,
        to: cityMeta.defaultTo
      });
    }

    for (const c of stateCities) {
      if (!cityMeta || c.name !== cityMeta.name) {
        list.push({
          name: `${c.name} Corridor`,
          tag: activeState,
          from: c.defaultFrom,
          to: c.defaultTo
        });
      }
    }

    // Add inter-city state connection if another city exists in same state
    if (stateCities.length >= 2) {
      list.push({
        name: `${stateCities[0].name} -> ${stateCities[1].name}`,
        tag: "Intercity",
        from: stateCities[0].defaultFrom,
        to: stateCities[1].defaultFrom
      });
    } else if (cityMeta) {
      // Suggest top nearby corridor chip from adjacent major state hub
      const otherState = INDIA_STATES_AND_UTS.find((s) => s.state !== activeState);
      if (otherState?.cities?.[0]) {
        list.push({
          name: `${otherState.cities[0].name} Hub`,
          tag: otherState.state,
          from: otherState.cities[0].defaultFrom,
          to: otherState.cities[0].defaultTo
        });
      }
    }

    return list.slice(0, 5);
  }

  function queryLiveSuggestions(val, setter, showSetter, timerRef) {
    if (timerRef.current) clearTimeout(timerRef.current);
    const clean = val.trim();
    if (clean.length < 2) {
      setter([]);
      showSetter(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetchLiveAutocomplete(clean, cityCoords?.lat, cityCoords?.lon);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setter(res.data);
          showSetter(true);
        } else {
          setter([]);
        }
      } catch {
        setter([]);
      }
    }, 260);
  }

  function handleFromChange(val) {
    setFrom(val);
    queryLiveSuggestions(val, setFromSuggestions, setShowFromDropdown, fromTimerRef);
  }

  function handleToChange(val) {
    setTo(val);
    queryLiveSuggestions(val, setToSuggestions, setShowToDropdown, toTimerRef);
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

  function handleLocateMe() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const geo = await reverseGeocodeCoords(latitude, longitude);
          if (geo.success && geo.data?.displayName) {
            setFrom(`${geo.data.displayName} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          } else {
            setFrom(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          }
        } catch {
          setFrom(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setFrom(cityMeta?.defaultFrom || `${activeCity}, ${activeState}`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }

  const cityPresets = getCityFastPresets();

  return (
    <section className="search-box-card cyber-glow-panel">
      <div className="panel-glow-corner corner-tl" />
      <div className="panel-glow-corner corner-br" />

      {/* TOP HEADER BAR */}
      <div className="search-header-status">
        <div className="header-status-left">
          <span className="radar-ping-icon">
            <span className="radar-circle-pulse" />
            <Navigation size={15} className="compass-icon-anim" />
          </span>
          <span className="search-status-title">All-India Live Route Finder</span>
          <button
            type="button"
            className="city-switch-inline-tag"
            onClick={openCityModal}
            title="Change your selected city or state"
          >
            <Globe size={11} /> {activeCity}, {activeState}
          </button>
        </div>

        <button
          type="button"
          className="locate-me-btn"
          onClick={handleLocateMe}
          title="Use current GPS location as starting point"
          disabled={loading || isLocating}
        >
          <Crosshair size={13} className={isLocating ? "spin-icon" : ""} />
          <span>{isLocating ? "Detecting GPS..." : "Use My GPS"}</span>
        </button>
      </div>

      {/* INPUTS */}
      <div className="search-inputs-wrapper">
        <div className="input-field-group" ref={fromRef}>
          <label htmlFor="from-input">
            <span className="dot dot-green dot-glow-green" />
            <span>Starting Point ({activeCity})</span>
          </label>
          <div className="input-with-icon">
            <MapPin size={16} className="field-icon icon-green" />
            <input
              id="from-input"
              type="text"
              placeholder={`Search landmark, station, or street in ${activeCity}...`}
              value={from}
              onChange={(e) => handleFromChange(e.target.value)}
              onFocus={() => fromSuggestions.length > 0 && setShowFromDropdown(true)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {showFromDropdown && fromSuggestions.length > 0 && (
            <div className="smart-autocomplete-dropdown">
              <div className="dropdown-label">Live Suggestions across India:</div>
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
                  <Building size={14} className="sugg-icon text-emerald" />
                  <div className="item-text-wrap">
                    <span className="item-label">{s.label}</span>
                    <span className="item-city-badge">{s.state || s.city}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

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

        <div className="input-field-group" ref={toRef}>
          <label htmlFor="to-input">
            <span className="dot dot-red dot-glow-red" />
            <span>Destination</span>
          </label>
          <div className="input-with-icon">
            <MapPin size={16} className="field-icon icon-red" />
            <input
              id="to-input"
              type="text"
              placeholder={`Search destination in ${activeState} or any Indian city...`}
              value={to}
              onChange={(e) => handleToChange(e.target.value)}
              onFocus={() => toSuggestions.length > 0 && setShowToDropdown(true)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {showToDropdown && toSuggestions.length > 0 && (
            <div className="smart-autocomplete-dropdown">
              <div className="dropdown-label">Live Suggestions across India:</div>
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
                  <Building size={14} className="sugg-icon text-cyan" />
                  <div className="item-text-wrap">
                    <span className="item-label">{s.label}</span>
                    <span className="item-city-badge">{s.state || s.city}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LOCALIZED FAST ROUTES FOR USER'S CITY/STATE */}
      {cityPresets.length > 0 && (
        <div className="fast-presets-section">
          <div className="fast-presets-label">
            <Zap size={14} className="text-amber" />
            <span>Popular Routes in {activeState}:</span>
          </div>

          <div className="fast-chips-scroll">
            {cityPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className={`fast-corridor-chip ${activeChip === idx ? "active-fast-chip" : ""}`}
                onClick={() => applyPreset(p, idx)}
                disabled={loading}
                title={`${p.from} -> ${p.to}`}
              >
                <span className="chip-tag">{p.tag}</span>
                <span className="chip-name">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
            <span>Finding Best Routes in Real Time...</span>
          </>
        ) : (
          <>
            <Sparkles size={17} className="btn-sparkle-icon" />
            <span>Find Safest &amp; Fastest Route</span>
          </>
        )}
      </button>
    </section>
  );
}
