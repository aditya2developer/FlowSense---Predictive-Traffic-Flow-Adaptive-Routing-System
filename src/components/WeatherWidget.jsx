import { useEffect, useState } from "react";
import { fetchWeather, reverseGeocodeCoords } from "../api";
import { Wind, Droplets, ChevronDown, Crosshair, Activity } from "lucide-react";

const WEATHER_CITIES = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Chandigarh",
  "Jalandhar",
  "Kolkata",
  "Chennai",
  "Hyderabad",
  "Pune"
];

function WeatherWidget({ initialCity, defaultCity = "Delhi" }) {
  const [selectedCity, setSelectedCity] = useState(initialCity || defaultCity || "Delhi");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
            setSelectedCity(geo.data.city);
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
        <span className="live-api-tag">LIVE API</span>
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
            title="Click to inspect live Air Quality & Weather Telemetry"
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
            <span className="dropdown-title" style={{ marginBottom: 0 }}>Live Weather &amp; AQI City:</span>
            <button
              type="button"
              className="weather-gps-btn"
              onClick={handleDetectCity}
              title="Detect my current city via GPS"
            >
              <Crosshair size={11} /> My City
            </button>
          </div>
          <div className="weather-city-options">
            {WEATHER_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`weather-opt-btn ${selectedCity === c ? "active-opt" : ""}`}
                onClick={() => {
                  setLoading(true);
                  setSelectedCity(c);
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
          <span className="weather-exp-source">{weather.source}</span>
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
