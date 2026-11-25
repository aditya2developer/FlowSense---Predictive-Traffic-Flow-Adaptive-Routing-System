const fetch = require("node-fetch");

/**
 * Free Real-Time External Services Utility
 * 1. Reverse Geocoding (BigDataCloud + OpenStreetMap Nominatim) - zero API key required
 * 2. Nearby Emergency Services (OpenStreetMap Overpass API) - live Hospitals, Police, Fuel
 */

const nearbyCache = new Map();

/**
 * Resolve any GPS (lat, lon) coordinate into real Indian street, neighborhood, city, and state.
 */
async function reverseGeocode(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  // Tier 1: BigDataCloud Free Reverse Geocoding (ultra-fast, no rate limit)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const area = data.locality || data.principalSubdivision || "";
      const city = data.city || data.locality || "India";
      const state = data.principalSubdivision || "India";
      const fullAddress = [data.locality, data.city, data.principalSubdivision, data.countryName]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(", ");

      return {
        latitude,
        longitude,
        street: area,
        city,
        state,
        displayName: fullAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        source: "BigDataCloud Real-Time Reverse Grid"
      };
    }
  } catch (e) {
    // Fall through to Nominatim
  }

  // Tier 2: OpenStreetMap Nominatim Reverse
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "FlowSense-SmartCity/2.0 (admin@flowsense.gov.in)" }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      return {
        latitude,
        longitude,
        street: addr.road || addr.suburb || addr.neighbourhood || "",
        city: addr.city || addr.town || addr.county || addr.state_district || "India",
        state: addr.state || "India",
        displayName: data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        source: "OpenStreetMap Nominatim"
      };
    }
  } catch (e) {}

  return {
    latitude,
    longitude,
    street: "Highway Corridor",
    city: "India",
    state: "India",
    displayName: `GPS Pin (${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E)`,
    source: "GPS Direct"
  };
}

/**
 * Fetches live nearby Hospitals, Police Stations, and Fuel Stations via OpenStreetMap Overpass API
 */
async function fetchNearbyEmergencyServices(lat = 28.6139, lon = 77.2090, radiusMeters = 5000) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  const cacheKey = `${latitude.toFixed(2)}:${longitude.toFixed(2)}:${radiusMeters}`;
  const cached = nearbyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 120000) {
    return cached.data;
  }

  const query = `
    [out:json][timeout:6];
    (
      node["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
      node["amenity"="police"](around:${radiusMeters},${latitude},${longitude});
      node["amenity"="fuel"](around:${radiusMeters},${latitude},${longitude});
    );
    out body 18;
  `;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "FlowSense-SmartCity/2.0"
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const elements = Array.isArray(data.elements) ? data.elements : [];
      const mapped = elements
        .filter((el) => el.tags && el.tags.name)
        .map((el) => ({
          id: el.id,
          name: el.tags.name,
          category: el.tags.amenity === "hospital" ? "HOSPITAL" : el.tags.amenity === "police" ? "POLICE" : "FUEL",
          latitude: el.lat,
          longitude: el.lon,
          phone: el.tags.phone || el.tags["contact:phone"] || (el.tags.amenity === "police" ? "112" : el.tags.amenity === "hospital" ? "108" : "")
        }));

      if (mapped.length > 0) {
        const responseData = {
          center: { latitude, longitude },
          count: mapped.length,
          source: "OpenStreetMap Overpass Real-Time POI Grid",
          services: mapped
        };
        nearbyCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
        return responseData;
      }
    }
  } catch (err) {
    console.warn("Overpass primary slow, switching to Photon POI grid:", err.message);
  }

  // Tier 2: Fast Geo-biased Photon OpenStreetMap POI Grid (parallel lookup for hospital, police, fuel)
  try {
    const categories = [
      { q: "hospital", cat: "HOSPITAL", defaultPhone: "108" },
      { q: "police station", cat: "POLICE", defaultPhone: "112" },
      { q: "petrol pump", cat: "FUEL", defaultPhone: "" }
    ];

    const results = await Promise.all(
      categories.map(async ({ q, cat, defaultPhone }) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        try {
          const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${latitude}&lon=${longitude}&limit=8`;
          const r = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": "FlowSense-SmartCity/2.0" }
          });
          clearTimeout(timeout);
          if (!r.ok) return [];
          const json = await r.json();
          const features = Array.isArray(json.features) ? json.features : [];
          const nonRoads = features.filter((f) => f.properties?.osm_key !== "highway");
          const chosen = (nonRoads.length > 0 ? nonRoads : features).slice(0, 3);
          return chosen.map((f, idx) => {
            const coords = f.geometry?.coordinates || [longitude, latitude];
            const props = f.properties || {};
            const placeLabel = [props.name || props.street, props.city || props.county]
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(", ");
            return {
              id: props.osm_id || `${cat}-${idx}`,
              name: placeLabel || `${cat} Point`,
              category: cat,
              latitude: Number(coords[1]),
              longitude: Number(coords[0]),
              phone: defaultPhone
            };
          });
        } catch {
          clearTimeout(timeout);
          return [];
        }
      })
    );

    const combined = results.flat().filter((s) => s.name);
    if (combined.length > 0) {
      const responseData = {
        center: { latitude, longitude },
        count: combined.length,
        source: "OpenStreetMap Photon Real-Time POI Grid",
        services: combined
      };
      nearbyCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
      return responseData;
    }
  } catch (err) {
    console.warn("Photon POI lookup warning:", err.message);
  }

  return {
    center: { latitude, longitude },
    count: 0,
    source: "Overpass Standby",
    services: []
  };
}

module.exports = {
  reverseGeocode,
  fetchNearbyEmergencyServices
};
