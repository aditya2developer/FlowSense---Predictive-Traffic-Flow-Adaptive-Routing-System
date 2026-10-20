const fetch = require("node-fetch");

async function geocodeLocation(location) {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?q=${encodeURIComponent(location)}` +
    "&format=json" +
    "&limit=1";

  const response = await fetch(url, {
    headers: {
      "User-Agent": "FlowSense/1.0"
    }
  });

  if (!response.ok) {
    throw new Error("Geocoding request failed");
  }

  const data = await response.json();

  if (data.length === 0) {
    return null;
  }

  return {
    latitude: Number(data[0].lat),
    longitude: Number(data[0].lon),
    displayName: data[0].display_name
  };
}

module.exports = geocodeLocation;