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

// Validate coordinates and convert OSRM's
// [longitude, latitude] format to named properties.
function normalizeRouteCoordinates(routeCoordinates) {
if (!Array.isArray(routeCoordinates)) {
return [];
}

return routeCoordinates
.filter(
(point) =>
Array.isArray(point) &&
Number.isFinite(point[0]) &&
Number.isFinite(point[1]) &&
point[1] >= -90 &&
point[1] <= 90 &&
point[0] >= -180 &&
point[0] <= 180
)
.map(([longitude, latitude]) => ({
longitude,
latitude
}));
}

// Find the closest route point to a registered segment point.
function findClosestRouteDistance(segmentPoint, routePoints) {
let closestDistance = Infinity;

for (const routePoint of routePoints) {
const distance = calculateDistanceMeters(
segmentPoint,
routePoint
);


if (distance < closestDistance) {
  closestDistance = distance;
}

if (closestDistance === 0) {
  break;
}


}

return closestDistance;
}

// Match registered road segments against OSRM route coordinates.
//
// IMPORTANT:
// This is a point-proximity matcher, not a full road-network matcher.
// A successful match alone does not prove that a road's identity
// or its historical traffic data is correct.
async function matchRoadSegments(
routeCoordinates,
maxDistanceMeters = 50,
minimumMatchPercentage = 80
) {
const validRouteCoordinates =
normalizeRouteCoordinates(routeCoordinates);

if (validRouteCoordinates.length < 2) {
return [];
}

if (
!Number.isFinite(maxDistanceMeters) ||
maxDistanceMeters <= 0 ||
!Number.isFinite(minimumMatchPercentage) ||
minimumMatchPercentage <= 0 ||
minimumMatchPercentage > 100
) {
throw new Error("Invalid road-matching configuration.");
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


const validSegmentCoordinates =
  segment.coordinates.filter(
    (point) =>
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      point.latitude >= -90 &&
      point.latitude <= 90 &&
      point.longitude >= -180 &&
      point.longitude <= 180
  );

if (validSegmentCoordinates.length < 2) {
  continue;
}

let matchedPoints = 0;
let totalMatchedDistance = 0;

for (const segmentPoint of validSegmentCoordinates) {
  const closestDistance = findClosestRouteDistance(
    segmentPoint,
    validRouteCoordinates
  );

  if (closestDistance <= maxDistanceMeters) {
    matchedPoints++;
    totalMatchedDistance += closestDistance;
  }
}

const totalPoints = validSegmentCoordinates.length;

const matchPercentage =
  (matchedPoints / totalPoints) * 100;

if (matchPercentage < minimumMatchPercentage) {
  continue;
}

matches.push({
  roadId: segment.roadId,
  roadName: segment.roadName,
  matchedPoints,
  totalSegmentPoints: totalPoints,
  matchPercentage: Number(
    matchPercentage.toFixed(2)
  ),
  averageMatchedDistanceMeters: Number(
    (totalMatchedDistance / matchedPoints).toFixed(2)
  )
});


}

// Rank by matching percentage first, then by proximity.
return matches.sort(
(a, b) =>
b.matchPercentage - a.matchPercentage ||
a.averageMatchedDistanceMeters -
b.averageMatchedDistanceMeters
);
}

module.exports = matchRoadSegments;
