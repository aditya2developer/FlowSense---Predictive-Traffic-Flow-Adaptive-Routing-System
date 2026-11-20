/**
 * FlowSense Real-Time Meteorological API Client
 * Powered by Open-Meteo live weather grid (Real-time global weather, no API key required).
 */

const CITY_COORDINATES = {
  "delhi": { lat: 28.6139, lon: 77.2090, name: "Delhi NCR" },
  "new delhi": { lat: 28.6139, lon: 77.2090, name: "Delhi NCR" },
  "mumbai": { lat: 19.0760, lon: 72.8777, name: "Mumbai" },
  "bengaluru": { lat: 12.9716, lon: 77.5946, name: "Bengaluru" },
  "bangalore": { lat: 12.9716, lon: 77.5946, name: "Bengaluru" },
  "chandigarh": { lat: 30.7333, lon: 76.7794, name: "Chandigarh" },
  "jalandhar": { lat: 31.3260, lon: 75.5762, name: "Jalandhar" },
  "phagwara": { lat: 31.2206, lon: 75.7696, name: "Phagwara / LPU" },
  "kolkata": { lat: 22.5726, lon: 88.3639, name: "Kolkata" },
  "chennai": { lat: 13.0827, lon: 80.2707, name: "Chennai" },
  "hyderabad": { lat: 17.3850, lon: 78.4867, name: "Hyderabad" },
  "pune": { lat: 18.5204, lon: 73.8567, name: "Pune" },
  "jaipur": { lat: 26.9124, lon: 75.7873, name: "Jaipur" },
  "lucknow": { lat: 26.8467, lon: 80.9462, name: "Lucknow" },
  "ahmedabad": { lat: 23.0225, lon: 72.5714, name: "Ahmedabad" }
};

function wmoCodeToCondition(code) {
  if (code === 0) return { condition: "Clear", icon: "☀️", warning: null };
  if (code >= 1 && code <= 3) return { condition: "Cloudy", icon: "⛅", warning: null };
  if (code === 45 || code === 48) return {
    condition: "Fog",
    icon: "🌫️",
    warning: "Reduced visibility due to fog. Use low-beam fog lights and reduce highway speeds."
  };
  if (code >= 51 && code <= 55) return {
    condition: "Drizzle",
    icon: "🌦️",
    warning: "Slick road surfaces reported. Extend vehicle braking distance."
  };
  if (code >= 61 && code <= 65) return {
    condition: "Rain",
    icon: "🌧️",
    warning: "Active rainfall. Moderate hydroplaning risk on expressways; maintain safe distance."
  };
  if (code >= 80 && code <= 82) return {
    condition: "Heavy Rain",
    icon: "⛈️",
    warning: "Intense downpours. Waterlogging expected in underpasses; drive cautiously."
  };
  if (code >= 95) return {
    condition: "Thunderstorm",
    icon: "⚡",
    warning: "Severe thunderstorm. Wind gusts may cause tree/branch hazards; avoid parking near hoardings."
  };
  return { condition: "Clear", icon: "🌤️", warning: null };
}

// In-memory cache to prevent spamming external API (cached for 60 seconds per city)
const weatherCache = new Map();

async function fetchRealTimeWeather(cityOrQuery = "Delhi", fallbackLat = null, fallbackLon = null) {
  const cleanCity = String(cityOrQuery || "Delhi").trim().toLowerCase();
  const cached = weatherCache.get(cleanCity);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data;
  }

  let coords = CITY_COORDINATES[cleanCity];
  if (!coords && fallbackLat && fallbackLon) {
    coords = { lat: fallbackLat, lon: fallbackLon, name: cityOrQuery };
  } else if (!coords) {
    // Default to Delhi if unknown
    coords = { lat: 28.6139, lon: 77.2090, name: cityOrQuery };
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const current = data.current || {};
      const { condition, icon, warning } = wmoCodeToCondition(current.weather_code);

      const result = {
        city: coords.name || cityOrQuery,
        location: `${coords.name || cityOrQuery} Metro Area`,
        temperature: Math.round(current.temperature_2m ?? 27),
        humidity: Math.round(current.relative_humidity_2m ?? 55),
        rainfall: Number((current.precipitation ?? 0).toFixed(1)),
        windSpeed: Math.round(current.wind_speed_10m ?? 8),
        condition,
        icon,
        warning,
        visibility: condition === "Fog" ? 2 : condition === "Heavy Rain" ? 4 : 9,
        isLiveApi: true,
        fetchedAt: new Date().toISOString()
      };

      weatherCache.set(cleanCity, { timestamp: Date.now(), data: result });
      return result;
    }
  } catch (err) {
    console.warn(`Live weather fetch failed for ${cityOrQuery}, using dynamic fallback:`, err.message);
  }

  // Graceful deterministic fallback
  const fallback = {
    city: coords.name || cityOrQuery,
    location: `${coords.name || cityOrQuery} Corridor Grid`,
    temperature: 28,
    humidity: 58,
    rainfall: 0,
    windSpeed: 7,
    condition: "Clear",
    icon: "☀️",
    warning: null,
    visibility: 8,
    isLiveApi: false,
    fetchedAt: new Date().toISOString()
  };
  return fallback;
}

module.exports = {
  fetchRealTimeWeather,
  CITY_COORDINATES
};
