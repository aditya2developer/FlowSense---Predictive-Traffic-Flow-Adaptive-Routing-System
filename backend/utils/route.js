const fetch = require("node-fetch");

async function getRoute(
  startLatitude,
  startLongitude,
  endLatitude,
  endLongitude
) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${startLongitude},${startLatitude};` +
    `${endLongitude},${endLatitude}` +
    `?overview=full&geometries=geojson&alternatives=true`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Routing request failed");
  }

  const data = await response.json();

  if (data.code !== "Ok") {
    throw new Error("No route found");
  }

  return data;
}

module.exports = getRoute;