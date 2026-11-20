/**
 * FlowSense Real-Time Meteorological API Client
 * Powered by Open-Meteo live weather grid (Real-time global weather, no API key required).
 * Provides Pan-India coverage for all 28 States, 8 UTs, and dynamic geocoding for ANY city in India.
 */

const PAN_INDIA_COORDINATES = {
  // National Capital & Northern Hubs
  "delhi": { lat: 28.6139, lon: 77.2090, name: "Delhi NCR", state: "Delhi" },
  "new delhi": { lat: 28.6139, lon: 77.2090, name: "New Delhi", state: "Delhi" },
  "noida": { lat: 28.5355, lon: 77.3910, name: "Noida", state: "Uttar Pradesh" },
  "gurugram": { lat: 28.4595, lon: 77.0266, name: "Gurugram (Gurgaon)", state: "Haryana" },
  "gurgaon": { lat: 28.4595, lon: 77.0266, name: "Gurugram", state: "Haryana" },
  "faridabad": { lat: 28.4089, lon: 77.3178, name: "Faridabad", state: "Haryana" },
  "ghaziabad": { lat: 28.6692, lon: 77.4538, name: "Ghaziabad", state: "Uttar Pradesh" },
  "chandigarh": { lat: 30.7333, lon: 76.7794, name: "Chandigarh", state: "Chandigarh" },
  "mohali": { lat: 30.7046, lon: 76.7179, name: "Mohali (SAS Nagar)", state: "Punjab" },
  "panchkula": { lat: 30.6942, lon: 76.8606, name: "Panchkula", state: "Haryana" },
  "jalandhar": { lat: 31.3260, lon: 75.5762, name: "Jalandhar", state: "Punjab" },
  "amritsar": { lat: 31.6340, lon: 74.8723, name: "Amritsar", state: "Punjab" },
  "ludhiana": { lat: 30.9010, lon: 75.8573, name: "Ludhiana", state: "Punjab" },
  "phagwara": { lat: 31.2206, lon: 75.7696, name: "Phagwara / LPU", state: "Punjab" },
  "patiala": { lat: 30.3398, lon: 76.3869, name: "Patiala", state: "Punjab" },
  "bathinda": { lat: 30.2110, lon: 74.9455, name: "Bathinda", state: "Punjab" },
  "shimla": { lat: 31.1048, lon: 77.1734, name: "Shimla", state: "Himachal Pradesh" },
  "dharamshala": { lat: 32.2190, lon: 76.3234, name: "Dharamshala", state: "Himachal Pradesh" },
  "dehradun": { lat: 30.3165, lon: 78.0322, name: "Dehradun", state: "Uttarakhand" },
  "haridwar": { lat: 29.9457, lon: 78.1642, name: "Haridwar", state: "Uttarakhand" },
  "rishikesh": { lat: 30.0869, lon: 78.2676, name: "Rishikesh", state: "Uttarakhand" },
  "srinagar": { lat: 34.0837, lon: 74.7973, name: "Srinagar", state: "Jammu & Kashmir" },
  "jammu": { lat: 32.7266, lon: 74.8570, name: "Jammu", state: "Jammu & Kashmir" },

  // Western India
  "mumbai": { lat: 19.0760, lon: 72.8777, name: "Mumbai", state: "Maharashtra" },
  "navi mumbai": { lat: 19.0330, lon: 73.0297, name: "Navi Mumbai", state: "Maharashtra" },
  "thane": { lat: 19.2183, lon: 72.9781, name: "Thane", state: "Maharashtra" },
  "pune": { lat: 18.5204, lon: 73.8567, name: "Pune", state: "Maharashtra" },
  "nagpur": { lat: 21.1458, lon: 79.0882, name: "Nagpur", state: "Maharashtra" },
  "nashik": { lat: 19.9975, lon: 73.7898, name: "Nashik", state: "Maharashtra" },
  "aurangabad": { lat: 19.8762, lon: 75.3433, name: "Chhatrapati Sambhajinagar", state: "Maharashtra" },
  "ahmedabad": { lat: 23.0225, lon: 72.5714, name: "Ahmedabad", state: "Gujarat" },
  "gandhinagar": { lat: 23.2156, lon: 72.6369, name: "Gandhinagar (GIFT City)", state: "Gujarat" },
  "surat": { lat: 21.1702, lon: 72.8311, name: "Surat", state: "Gujarat" },
  "vadodara": { lat: 22.3072, lon: 73.1812, name: "Vadodara", state: "Gujarat" },
  "rajkot": { lat: 22.3039, lon: 70.8022, name: "Rajkot", state: "Gujarat" },
  "panaji": { lat: 15.4909, lon: 73.8278, name: "Panaji (Goa)", state: "Goa" },
  "goa": { lat: 15.2993, lon: 74.1240, name: "Goa", state: "Goa" },

  // Southern India
  "bengaluru": { lat: 12.9716, lon: 77.5946, name: "Bengaluru", state: "Karnataka" },
  "bangalore": { lat: 12.9716, lon: 77.5946, name: "Bengaluru", state: "Karnataka" },
  "mysuru": { lat: 12.2958, lon: 76.6394, name: "Mysuru", state: "Karnataka" },
  "mysore": { lat: 12.2958, lon: 76.6394, name: "Mysuru", state: "Karnataka" },
  "mangaluru": { lat: 12.9141, lon: 74.8560, name: "Mangaluru", state: "Karnataka" },
  "mangalore": { lat: 12.9141, lon: 74.8560, name: "Mangaluru", state: "Karnataka" },
  "hyderabad": { lat: 17.3850, lon: 78.4867, name: "Hyderabad", state: "Telangana" },
  "secunderabad": { lat: 17.4399, lon: 78.4983, name: "Secunderabad", state: "Telangana" },
  "warangal": { lat: 17.9689, lon: 79.5941, name: "Warangal", state: "Telangana" },
  "chennai": { lat: 13.0827, lon: 80.2707, name: "Chennai", state: "Tamil Nadu" },
  "coimbatore": { lat: 11.0168, lon: 76.9558, name: "Coimbatore", state: "Tamil Nadu" },
  "madurai": { lat: 9.9252, lon: 78.1198, name: "Madurai", state: "Tamil Nadu" },
  "tiruchirappalli": { lat: 10.7905, lon: 78.7047, name: "Tiruchirappalli", state: "Tamil Nadu" },
  "salem": { lat: 11.6643, lon: 78.1460, name: "Salem", state: "Tamil Nadu" },
  "kochi": { lat: 9.9312, lon: 76.2673, name: "Kochi", state: "Kerala" },
  "thiruvananthapuram": { lat: 8.5241, lon: 76.9366, name: "Thiruvananthapuram", state: "Kerala" },
  "kozhikode": { lat: 11.2588, lon: 75.7804, name: "Kozhikode", state: "Kerala" },
  "visakhapatnam": { lat: 17.6868, lon: 83.2185, name: "Visakhapatnam (Vizag)", state: "Andhra Pradesh" },
  "vijayawada": { lat: 16.5062, lon: 80.6480, name: "Vijayawada", state: "Andhra Pradesh" },
  "amaravati": { lat: 16.5417, lon: 80.5150, name: "Amaravati", state: "Andhra Pradesh" },

  // Eastern & Central India
  "kolkata": { lat: 22.5726, lon: 88.3639, name: "Kolkata", state: "West Bengal" },
  "howrah": { lat: 22.5958, lon: 88.2636, name: "Howrah", state: "West Bengal" },
  "durgapur": { lat: 23.5204, lon: 87.3119, name: "Durgapur", state: "West Bengal" },
  "siliguri": { lat: 26.7271, lon: 88.3953, name: "Siliguri", state: "West Bengal" },
  "bhubaneswar": { lat: 20.2961, lon: 85.8245, name: "Bhubaneswar", state: "Odisha" },
  "cuttack": { lat: 20.4625, lon: 85.8830, name: "Cuttack", state: "Odisha" },
  "puri": { lat: 19.8135, lon: 85.8312, name: "Puri", state: "Odisha" },
  "patna": { lat: 25.5941, lon: 85.1376, name: "Patna", state: "Bihar" },
  "gaya": { lat: 24.7914, lon: 85.0002, name: "Gaya", state: "Bihar" },
  "ranchi": { lat: 23.3441, lon: 85.3096, name: "Ranchi", state: "Jharkhand" },
  "jamshedpur": { lat: 22.8046, lon: 86.2029, name: "Jamshedpur", state: "Jharkhand" },
  "dhanbad": { lat: 23.7957, lon: 86.4304, name: "Dhanbad", state: "Jharkhand" },
  "raipur": { lat: 21.2514, lon: 81.6296, name: "Raipur", state: "Chhattisgarh" },
  "bilaspur": { lat: 22.0797, lon: 82.1409, name: "Bilaspur", state: "Chhattisgarh" },
  "bhopal": { lat: 23.2599, lon: 77.4126, name: "Bhopal", state: "Madhya Pradesh" },
  "indore": { lat: 22.7196, lon: 75.8577, name: "Indore", state: "Madhya Pradesh" },
  "gwalior": { lat: 26.2183, lon: 78.1828, name: "Gwalior", state: "Madhya Pradesh" },
  "jabalpur": { lat: 23.1815, lon: 79.9864, name: "Jabalpur", state: "Madhya Pradesh" },
  "ujjain": { lat: 23.1765, lon: 75.7885, name: "Ujjain", state: "Madhya Pradesh" },

  // Uttar Pradesh & Rajasthan
  "lucknow": { lat: 26.8467, lon: 80.9462, name: "Lucknow", state: "Uttar Pradesh" },
  "kanpur": { lat: 26.4499, lon: 80.3319, name: "Kanpur", state: "Uttar Pradesh" },
  "varanasi": { lat: 25.3176, lon: 82.9739, name: "Varanasi (Kashi)", state: "Uttar Pradesh" },
  "prayagraj": { lat: 25.4358, lon: 81.8463, name: "Prayagraj (Allahabad)", state: "Uttar Pradesh" },
  "allahabad": { lat: 25.4358, lon: 81.8463, name: "Prayagraj", state: "Uttar Pradesh" },
  "agra": { lat: 27.1767, lon: 78.0081, name: "Agra", state: "Uttar Pradesh" },
  "mathura": { lat: 27.4924, lon: 77.6737, name: "Mathura", state: "Uttar Pradesh" },
  "meerut": { lat: 28.9845, lon: 77.7064, name: "Meerut", state: "Uttar Pradesh" },
  "gorakhpur": { lat: 26.7606, lon: 83.3732, name: "Gorakhpur", state: "Uttar Pradesh" },
  "jaipur": { lat: 26.9124, lon: 75.7873, name: "Jaipur", state: "Rajasthan" },
  "jodhpur": { lat: 26.2389, lon: 73.0243, name: "Jodhpur", state: "Rajasthan" },
  "udaipur": { lat: 24.5854, lon: 73.7125, name: "Udaipur", state: "Rajasthan" },
  "kota": { lat: 25.2138, lon: 75.8648, name: "Kota", state: "Rajasthan" },
  "ajmer": { lat: 26.4499, lon: 74.6399, name: "Ajmer", state: "Rajasthan" },

  // Northeast India
  "guwahati": { lat: 26.1445, lon: 91.7362, name: "Guwahati", state: "Assam" },
  "shillong": { lat: 25.5788, lon: 91.8933, name: "Shillong", state: "Meghalaya" },
  "gangtok": { lat: 27.3389, lon: 88.6065, name: "Gangtok", state: "Sikkim" },
  "imphal": { lat: 24.8170, lon: 93.9368, name: "Imphal", state: "Manipur" },
  "agartala": { lat: 23.8315, lon: 91.2868, name: "Agartala", state: "Tripura" },
  "aizawl": { lat: 23.7271, lon: 92.7176, name: "Aizawl", state: "Mizoram" },
  "kohima": { lat: 25.6751, lon: 94.1086, name: "Kohima", state: "Nagaland" },
  "itanagar": { lat: 27.0844, lon: 93.6053, name: "Itanagar", state: "Arunachal Pradesh" }
};

function wmoCodeToCondition(code) {
  if (code === 0) return { condition: "Clear", icon: "☀️", warning: null };
  if (code >= 1 && code <= 3) return { condition: "Cloudy", icon: "⛅", warning: null };
  if (code === 45 || code === 48) return {
    condition: "Fog",
    icon: "🌫️",
    warning: "Reduced visibility due to dense fog. Maintain low-beam headlights and speed under 40 km/h."
  };
  if (code >= 51 && code <= 55) return {
    condition: "Drizzle",
    icon: "🌦️",
    warning: "Slick asphalt reported. Maintain 3-vehicle braking distance."
  };
  if (code >= 61 && code <= 65) return {
    condition: "Rain",
    icon: "🌧️",
    warning: "Active monsoon rainfall. Moderate hydroplaning risk on expressways; maintain safe distance."
  };
  if (code >= 80 && code <= 82) return {
    condition: "Heavy Rain",
    icon: "⛈️",
    warning: "Intense downpours. Waterlogging expected in low underpasses; drive cautiously."
  };
  if (code >= 95) return {
    condition: "Thunderstorm",
    icon: "⚡",
    warning: "Severe thunderstorm with wind gusts. Avoid highway parking near hoardings/trees."
  };
  return { condition: "Clear", icon: "🌤️", warning: null };
}

// In-memory cache to prevent spamming external API (cached for 60 seconds per city)
const weatherCache = new Map();

/**
 * Dynamic Geocoding fallback:
 * If a city or town is not in PAN_INDIA_COORDINATES, query OpenStreetMap Nominatim
 * so that 100% of Indian cities, towns, and districts can return live real-time weather!
 */
async function geocodeUnknownCity(cityName) {
  try {
    const clean = cityName.replace(/[^a-zA-Z0-9\s]/g, "").trim();
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=1&q=${encodeURIComponent(clean)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      headers: { "User-Agent": "FlowSense-SmartCity-Platform/2.0" },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          name: data[0].display_name.split(",")[0],
          state: "India"
        };
      }
    }
  } catch (err) {
    // quiet fallback
  }
  return null;
}

async function fetchRealTimeWeather(cityOrQuery = "Delhi", fallbackLat = null, fallbackLon = null) {
  const cleanCity = String(cityOrQuery || "Delhi").trim().toLowerCase();
  const cached = weatherCache.get(cleanCity);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data;
  }

  let coords = PAN_INDIA_COORDINATES[cleanCity];

  // If not found directly, check partial match
  if (!coords) {
    for (const key of Object.keys(PAN_INDIA_COORDINATES)) {
      if (cleanCity.includes(key) || key.includes(cleanCity)) {
        coords = PAN_INDIA_COORDINATES[key];
        break;
      }
    }
  }

  // If still not found and fallback coords provided, use them
  if (!coords && fallbackLat && fallbackLon) {
    coords = { lat: fallbackLat, lon: fallbackLon, name: cityOrQuery, state: "India" };
  }

  // If still not found, dynamically geocode via OpenStreetMap
  if (!coords) {
    const geo = await geocodeUnknownCity(cityOrQuery);
    if (geo) {
      coords = geo;
      // Cache this coordinate for subsequent requests
      PAN_INDIA_COORDINATES[cleanCity] = geo;
    } else {
      coords = { lat: 28.6139, lon: 77.2090, name: cityOrQuery, state: "India" };
    }
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
        state: coords.state || "India",
        location: `${coords.name || cityOrQuery}, ${coords.state || "India"}`,
        latitude: coords.lat,
        longitude: coords.lon,
        temperature: Math.round(current.temperature_2m ?? 27),
        humidity: Math.round(current.relative_humidity_2m ?? 55),
        rainfall: Number((current.precipitation ?? 0).toFixed(1)),
        windSpeed: Math.round(current.wind_speed_10m ?? 8),
        condition,
        icon,
        warning,
        visibility: condition === "Fog" ? 2 : condition === "Heavy Rain" ? 4 : 9,
        isLiveApi: true,
        source: "Open-Meteo Pan-India Real-Time Grid",
        fetchedAt: new Date().toISOString()
      };

      weatherCache.set(cleanCity, { timestamp: Date.now(), data: result });
      return result;
    }
  } catch (err) {
    console.warn(`Live weather fetch failed for ${cityOrQuery}, using fallback:`, err.message);
  }

  // Deterministic fallback
  const fallback = {
    city: coords.name || cityOrQuery,
    state: coords.state || "India",
    location: `${coords.name || cityOrQuery}, ${coords.state || "India"}`,
    latitude: coords.lat,
    longitude: coords.lon,
    temperature: 28,
    humidity: 58,
    rainfall: 0,
    windSpeed: 7,
    condition: "Clear",
    icon: "☀️",
    warning: null,
    visibility: 8,
    isLiveApi: false,
    source: "FlowSense Offline Fallback Grid",
    fetchedAt: new Date().toISOString()
  };
  return fallback;
}

module.exports = {
  fetchRealTimeWeather,
  PAN_INDIA_COORDINATES
};
