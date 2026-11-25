import { useEffect, useState } from "react";
import { useCity } from "../context/CityContext";
import { fetchWeather, reverseGeocodeCoords } from "../api";
import { Wind, Droplets, ChevronDown, Crosshair, Activity } from "lucide-react";

const QUICK_WEATHER_CITIES = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Guwahati",
  "Bhopal",
  "Kochi"
];

function WeatherWidget() {
  const { activeCity, selectCity, activeState } = useCity();
  const [overrideCity, setOverrideCity] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const selectedCity = overrideCity || activeCity || "Delhi";

  useEffect(() => {
    let isMounted = true;
    fetchWeather(selectedCity)
      .then((data) => {
        if (isMounted && data.success && data.data) {
          setWeather(data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  function handleDetectCity() {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const geo = await reverseGeocodeCoords(pos.coords.latitude, pos.coords.longitude);
          if (geo.success && geo.data?.city) {
            setOverrideCity(null);
            selectCity({
              state: geo.data.state || activeState,
              city: geo.data.city,
              lat: pos.coords.latitude,
              lon: pos.coords.longitude
            });
            setShowDropdown(false);
          }
        } finally {
          setLoading(false);
        }
      },
      () => setLoading(false),
      { timeout: 6000 }
    );
  }

  if (!weather && !loading) return null;

  return (
    <div className="weather-widget-container">
      <div className="weather-widget-pill" onClick={() => setShowDropdown(!showDropdown)}>
        <span className="live-api-tag">LIVE WEATHER</span>
        <span className="weather-icon">{weather?.icon || "🌤️"}</span>

        <button type="button" className="weather-city-btn">
          <span>{weather?.city || selectedCity}</span>
          <ChevronDown size={13} />
        </button>

        <span className="weather-sep">•</span>
        <span className="weather-temp">{weather ? `${weather.temperature}°C` : "..."}</span>
        <span className="weather-condition">{weather?.condition || "Clear"}</span>

        {weather?.aqi && (
          <span
            className="weather-aqi-pill"
            style={{
              borderColor: `${weather.aqi.color}66`,
              backgroundColor: `${weather.aqi.color}22`,
              color: weather.aqi.color
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            title="View Air Quality & Wind Telemetry"
          >
            <Activity size={11} /> AQI {weather.aqi.usAqi} ({weather.aqi.label})
          </span>
        )}

        {weather?.rainfall > 0 && (
          <span className="weather-rain">
            <Droplets size={12} /> {weather.rainfall} mm
          </span>
        )}

        {weather?.windSpeed > 0 && (
          <span className="weather-wind">
            <Wind size={12} /> {weather.windSpeed} km/h
          </span>
        )}
      </div>

      {showDropdown && (
        <div className="weather-city-dropdown">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="dropdown-title" style={{ marginBottom: 0 }}>Check City Weather &amp; AQI:</span>
            <button
              type="button"
              className="weather-gps-btn"
              onClick={handleDetectCity}
              title="Detect current city via GPS"
            >
              <Crosshair size={11} /> GPS City
            </button>
          </div>
          <div className="weather-city-options">
            {QUICK_WEATHER_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`weather-opt-btn ${selectedCity === c ? "active-opt" : ""}`}
                onClick={() => {
                  setLoading(true);
                  setOverrideCity(c);
                  setShowDropdown(false);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {showDetails && weather && (
        <div className="weather-expanded-panel">
          <div className="weather-exp-grid">
            <div>
              <span>Humidity</span>
              <strong>{weather.humidity}%</strong>
            </div>
            <div>
              <span>Visibility</span>
              <strong>{weather.visibility} km</strong>
            </div>
            <div>
              <span>PM2.5</span>
              <strong>{weather.aqi?.pm25 ?? "—"} µg/m³</strong>
            </div>
            <div>
              <span>PM10</span>
              <strong>{weather.aqi?.pm10 ?? "—"} µg/m³</strong>
            </div>
          </div>
        </div>
      )}

      {weather?.warning && (
        <div className="weather-live-warning">
          <span>⚠️ {weather.warning}</span>
        </div>
      )}
    </div>
  );
}

export default WeatherWidget;
