import { useEffect, useState } from "react";
import { fetchWeather } from "../api";
import { CloudRain, Wind, Eye, Droplets, ChevronDown } from "lucide-react";

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

function WeatherWidget({ initialCity = "Delhi" }) {
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
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

  if (!weather && !loading) return null;

  return (
    <div className="weather-widget-container">
      <div className="weather-widget-pill" onClick={() => setShowDropdown(!showDropdown)}>
        <span className="live-api-tag">REAL-TIME API</span>
        <span className="weather-icon">{weather?.icon || "🌤️"}</span>

        <button type="button" className="weather-city-btn">
          <span>{weather?.city || selectedCity}</span>
          <ChevronDown size={13} />
        </button>

        <span className="weather-sep">•</span>
        <span className="weather-temp">{weather ? `${weather.temperature}°C` : "..."}</span>
        <span className="weather-condition">{weather?.condition || "Clear"}</span>

        {weather?.rainfall > 0 && (
          <span className="weather-rain">
            <Droplets size={12} /> {weather.rainfall} mm
          </span>
        )}

        {weather?.windSpeed && (
          <span className="weather-wind">
            <Wind size={12} /> {weather.windSpeed} km/h
          </span>
        )}
      </div>

      {showDropdown && (
        <div className="weather-city-dropdown">
          <span className="dropdown-title">Select Live Weather City:</span>
          <div className="weather-city-options">
            {WEATHER_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`weather-opt-btn ${selectedCity === c ? "active-opt" : ""}`}
                onClick={() => {
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

      {weather?.warning && (
        <div className="weather-live-warning">
          <span>⚠️ {weather.warning}</span>
        </div>
      )}
    </div>
  );
}

export default WeatherWidget;
