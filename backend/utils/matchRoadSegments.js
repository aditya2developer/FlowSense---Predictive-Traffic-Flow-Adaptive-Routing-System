const RoadSegment = require("../models/RoadSegment");

// Calculate the distance between two geographic points in meters.
function calculateDistanceMeters(point1, point2) {
  const earthRadius = 6371000;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);

  const deltaLat = toRadians(
    point2.latitude - point1.latitude
  );

  const deltaLon = toRadians(
    point2.longitude - point1.longitude
  );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const safeA = Math.min(1, Math.max(0, a));

  return (
    2 *
    earthRadius *
    Math.atan2(
      Math.sqrt(safeA),
      Math.sqrt(1 - safeA)
    )
  );
}

// Match registered road segments against OSRM route coordinates.
//
// OSRM coordinates use [longitude, latitude].
// MongoDB road coordinates use { latitude, longitude }.
async function matchRoadSegments(
  routeCoordinates,
  maxDistanceMeters = 100,
  minimumMatchPercentage = 50
) {
  if (
    !Array.isArray(routeCoordinates) ||
    routeCoordinates.length === 0
  ) {
    return [];
  }

  const validRouteCoordinates = routeCoordinates
    .filter(
      (point) =>
        Array.isArray(point) &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1])
    )
    .map((point) => ({
      longitude: point[0],
      latitude: point[1]
    }));

  if (validRouteCoordinates.length === 0) {
    return [];
  }

  const roadSegments = await RoadSegment.find({
    isActive: true
  }).lean();

  const matches = [];

  for (const segment of roadSegments) {
    if (
      !Array.isArray(segment.coordinates) ||
      segment.coordinates.length < 2
    ) {
      continue;
    }

    const validSegmentCoordinates = segment.coordinates.filter(
      (point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude)
    );

    if (validSegmentCoordinates.length < 2) {
      continue;
    }

    let matchedPoints = 0;
    let totalMatchedDistance = 0;

    for (const segmentPoint of validSegmentCoordinates) {
      let closestDistance = Infinity;

      for (const routePoint of validRouteCoordinates) {
        const distance = calculateDistanceMeters(
          {
            latitude: segmentPoint.latitude,
            longitude: segmentPoint.longitude
          },
          routePoint
        );

        if (distance < closestDistance) {
          closestDistance = distance;
        }

        // Route points are ordered, but do not stop early:
        // a later route point could be closer.
      }

      if (closestDistance <= maxDistanceMeters) {
        matchedPoints++;
        totalMatchedDistance += closestDistance;
      }
    }

    const totalPoints = validSegmentCoordinates.length;

    const matchPercentage =
      (matchedPoints / totalPoints) * 100;

    if (matchPercentage >= minimumMatchPercentage) {
      matches.push({
        roadId: segment.roadId,
        roadName: segment.roadName,
        matchedPoints,
        totalSegmentPoints: totalPoints,
        matchPercentage: Number(
          matchPercentage.toFixed(2)
        ),
        averageMatchedDistanceMeters:
          matchedPoints > 0
            ? Number(
                (
                  totalMatchedDistance / matchedPoints
                ).toFixed(2)
              )
            : null
      });
    }
  }

  // Prefer segments with the greatest number of matching points.
  // Use distance as the tie-breaker.
  return matches.sort(
    (a, b) =>
      b.matchPercentage - a.matchPercentage ||
      a.averageMatchedDistanceMeters -
        b.averageMatchedDistanceMeters
  );
}

module.exports = matchRoadSegments;

