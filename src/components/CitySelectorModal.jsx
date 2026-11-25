import { useState } from "react";
import { useCity } from "../context/CityContext";
import { INDIA_STATES_AND_UTS, getCitiesForState } from "../utils/indiaLocations";
import { MapPin, Crosshair, CheckCircle2, X, Globe } from "lucide-react";

export default function CitySelectorModal() {
  const {
    activeState,
    activeCity,
    cityModalOpen,
    closeCityModal,
    selectCity,
    detectMyCity,
    detectingGps
  } = useCity();

  const [statePick, setStatePick] = useState(activeState || "Delhi (NCT)");
  const citiesForPick = getCitiesForState(statePick);
  const [cityPick, setCityPick] = useState(
    citiesForPick.some((c) => c.name === activeCity) ? activeCity : citiesForPick[0]?.name || ""
  );
  const [customCityName, setCustomCityName] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  if (!cityModalOpen) return null;

  function handleStateChange(nextState) {
    setStatePick(nextState);
    setUseCustom(false);
    setCustomCityName("");
    const list = getCitiesForState(nextState);
    if (list.length > 0) {
      setCityPick(list[0].name);
    } else {
      setCityPick("");
      setUseCustom(true);
    }
  }

  function handleConfirm(e) {
    e.preventDefault();
    if (useCustom) {
      if (!customCityName.trim()) return;
      selectCity({ state: statePick, city: customCityName.trim() });
      return;
    }
    const chosen = citiesForPick.find((c) => c.name === cityPick) || citiesForPick[0];
    if (chosen) {
      selectCity({
        state: statePick,
        city: chosen.name,
        lat: chosen.lat,
        lon: chosen.lon
      });
    }
  }

  return (
    <div className="emergency-modal-overlay" onClick={closeCityModal}>
      <div className="city-modal-card cyber-glow-panel" onClick={(e) => e.stopPropagation()}>
        <div className="city-modal-header">
          <div className="city-modal-title-group">
            <Globe size={20} className="text-cyan" />
            <div>
              <h3>Select Your State &amp; City</h3>
              <p>Live routes, weather, AQI, nearby help, and hazards adapt to your city.</p>
            </div>
          </div>
          <button type="button" className="modal-close-icon-btn" onClick={closeCityModal} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <button
          type="button"
          className="gps-detect-city-btn"
          onClick={detectMyCity}
          disabled={detectingGps}
        >
          <Crosshair size={16} className={detectingGps ? "spin-icon" : ""} />
          <span>{detectingGps ? "Detecting Your Current City..." : "Auto-Detect My City Using GPS"}</span>
        </button>

        <form onSubmit={handleConfirm} className="city-modal-form">
          <div className="auth-input-group">
            <label>Indian State / Union Territory (All 36 Supported)</label>
            <select
              value={statePick}
              onChange={(e) => handleStateChange(e.target.value)}
              className="auth-select-input"
            >
              <optgroup label="28 States">
                {INDIA_STATES_AND_UTS.filter((s) => s.type === "State").map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state}
                  </option>
                ))}
              </optgroup>
              <optgroup label="8 Union Territories">
                {INDIA_STATES_AND_UTS.filter((s) => s.type === "Union Territory").map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state} (UT)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="auth-input-group">
            <div className="label-between-row">
              <label>City / District</label>
              <button
                type="button"
                className="inline-link-btn"
                onClick={() => setUseCustom(!useCustom)}
              >
                {useCustom ? "Choose from listed cities" : "Type another town/city"}
              </button>
            </div>

            {!useCustom ? (
              <select
                value={cityPick}
                onChange={(e) => setCityPick(e.target.value)}
                className="auth-select-input"
              >
                {citiesForPick.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="input-with-icon">
                <MapPin size={16} className="field-icon" />
                <input
                  type="text"
                  required
                  placeholder={`Enter city or town in ${statePick}`}
                  value={customCityName}
                  onChange={(e) => setCustomCityName(e.target.value)}
                />
              </div>
            )}
          </div>

          <button type="submit" className="cyber-submit-btn">
            <CheckCircle2 size={17} />
            <span>Set Active City &amp; View Live Data</span>
          </button>
        </form>
      </div>
    </div>
  );
}
