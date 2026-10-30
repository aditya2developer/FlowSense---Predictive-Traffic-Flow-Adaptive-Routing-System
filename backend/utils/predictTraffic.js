
const TrafficRecord = require("../models/TrafficRecord");

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

async function predictTraffic(roadId, dayOfWeek, hour) {
  // Validate the prediction request.
  if (
    typeof roadId !== "string" ||
    !roadId.trim() ||
    !DAY_NAMES.includes(dayOfWeek) ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23
  ) {
    throw new Error(
      "Invalid prediction input: provide a valid roadId, weekday, and hour."
    );
  }

  // Strategy 1: Exact weekday and hour.
  let records = await TrafficRecord.find({
    roadId,
    dayOfWeek,
    hour
  }).lean();

  let predictionSource = "EXACT_DAY_AND_HOUR";

  // Strategy 2: Same hour on any day.
  if (records.length === 0) {
    records = await TrafficRecord.find({
      roadId,
      hour
    }).lean();

    predictionSource = "SAME_HOUR_ANY_DAY";
  }

  // Strategy 3: Same weekday within two hours.
  if (records.length === 0) {
    const sameDayRecords = await TrafficRecord.find({
      roadId,
      dayOfWeek
    }).lean();

    records = sameDayRecords.filter((record) => {
      const difference = Math.abs(record.hour - hour);
      const circularDifference = Math.min(
        difference,
        24 - difference
      );

      return circularDifference <= 2;
    });

    predictionSource = "NEARBY_HOURS_SAME_DAY";
  }

  // Strategy 4: Use all available records for this road.
  if (records.length === 0) {
    records = await TrafficRecord.find({
      roadId
    }).lean();

    predictionSource = "ROAD_HISTORY_FALLBACK";
  }

  // No historical data exists.
  if (records.length === 0) {
    return null;
  }

  /*
   * Assign temporal weights.
   *
   * Exact match: weight 1.
   * Same hour on another day: weight 1.
   * Nearby hours: weight decreases with time difference.
   * General road history: weight decreases with time difference.
   */
  const weightedRecords = records.map((record) => {
    let timeWeight = 1;

    if (
      predictionSource === "NEARBY_HOURS_SAME_DAY" ||
      predictionSource === "ROAD_HISTORY_FALLBACK"
    ) {
      const difference = Math.abs(record.hour - hour);

      const circularDifference = Math.min(
        difference,
        24 - difference
      );

      timeWeight = 1 / (circularDifference + 1);
    }

    return {
      hour: record.hour,
      vehicleCount: record.vehicleCount,
      averageSpeed: record.averageSpeed,
      congestionLevel: record.congestionLevel,
      timeWeight
    };
  });

  // Temporary debug output. Remove after verifying the results.
  // console.log(
  //   "FlowSense prediction debug:",
  //   weightedRecords
  // );

  // Calculate total weight.
  const totalWeight = weightedRecords.reduce(
    (sum, record) => sum + record.timeWeight,
    0
  );

  console.log( {
  totalWeight,
  weightedVehicleTotal: weightedRecords.reduce(
    (sum, record) =>
      sum + record.vehicleCount * record.timeWeight,
    0
  ),
  weightedSpeedTotal: weightedRecords.reduce(
    (sum, record) =>
      sum + record.averageSpeed * record.timeWeight,
    0
  )
});

  if (totalWeight <= 0) {
    return null;
  }

  // Calculate weighted average vehicle count.
  const weightedVehicleCount = weightedRecords.reduce(
    (sum, record) =>
      sum + record.vehicleCount * record.timeWeight,
    0
  );

  const predictedVehicleCount = Math.round(
    weightedVehicleCount / totalWeight
  );

  // Calculate weighted average speed.
  const weightedSpeed = weightedRecords.reduce(
    (sum, record) =>
      sum + record.averageSpeed * record.timeWeight,
    0
  );

  const predictedSpeed = weightedSpeed / totalWeight;

  // Calculate weighted population standard deviation of speed.
  const weightedSquaredSpeed = weightedRecords.reduce(
    (sum, record) =>
      sum +
      record.averageSpeed *
        record.averageSpeed *
        record.timeWeight,
    0
  );

  const variance = Math.max(
    0,
    weightedSquaredSpeed / totalWeight -
      predictedSpeed * predictedSpeed
  );

  const speedVariability = Math.sqrt(variance);

  // Calculate weighted congestion totals.
  const congestionWeights = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  };

  for (const record of weightedRecords) {
    if (
      Object.prototype.hasOwnProperty.call(
        congestionWeights,
        record.congestionLevel
      )
    ) {
      congestionWeights[record.congestionLevel] +=
        record.timeWeight;
    }
  }

  const totalCongestionWeight =
    congestionWeights.HIGH +
    congestionWeights.MEDIUM +
    congestionWeights.LOW;

  if (totalCongestionWeight <= 0) {
    return null;
  }

  // Prefer HIGH, then MEDIUM, then LOW when weights are tied.
  const priority = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  const predictedCongestion = Object.keys(
    congestionWeights
  ).sort(
    (a, b) =>
      congestionWeights[b] - congestionWeights[a] ||
      priority[b] - priority[a]
  )[0];

  const highCongestionPercentage = Math.round(
    (congestionWeights.HIGH / totalCongestionWeight) * 100
  );

  const mediumCongestionPercentage = Math.round(
    (congestionWeights.MEDIUM / totalCongestionWeight) * 100
  );

  const lowCongestionPercentage = Math.round(
    (congestionWeights.LOW / totalCongestionWeight) * 100
  );

  // Data quality reflects record quantity, not verified accuracy.
  const dataQuality =
    weightedRecords.length >= 20
      ? "HIGH"
      : weightedRecords.length >= 5
      ? "MEDIUM"
      : "LOW";

  return {
    predictedVehicleCount,

    predictedSpeed: Number(
      predictedSpeed.toFixed(1)
    ),

    speedVariability: Number(
      speedVariability.toFixed(1)
    ),

    predictedCongestion,

    highCongestionPercentage,
    mediumCongestionPercentage,
    lowCongestionPercentage,

    historicalRecords: weightedRecords.length,
    predictionSource,
    dataQuality
  };
}

module.exports = predictTraffic;
