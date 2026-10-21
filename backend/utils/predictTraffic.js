const TrafficRecord = require("../models/TrafficRecord");

async function predictTraffic(roadId, dayOfWeek, hour) {
  // First, try to find records for this exact road, day, and hour.
  let historicalData = await TrafficRecord.aggregate([
    {
      $match: {
        roadId,
        dayOfWeek,
        hour
      }
    },
    {
      $group: {
        _id: null,

        averageVehicleCount: {
          $avg: "$vehicleCount"
        },

        averageSpeed: {
          $avg: "$averageSpeed"
        },

        speedVariability: {
          $stdDevPop: "$averageSpeed"
        },

        recordCount: {
          $sum: 1
        },

        highCongestionCount: {
          $sum: {
            $cond: [
              { $eq: ["$congestionLevel", "HIGH"] },
              1,
              0
            ]
          }
        },

        mediumCongestionCount: {
          $sum: {
            $cond: [
              { $eq: ["$congestionLevel", "MEDIUM"] },
              1,
              0
            ]
          }
        },

        lowCongestionCount: {
          $sum: {
            $cond: [
              { $eq: ["$congestionLevel", "LOW"] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  let predictionSource = "EXACT_DAY_AND_HOUR";

  // If no exact time records exist, use all records for this road.
  if (historicalData.length === 0) {
    historicalData = await TrafficRecord.aggregate([
      {
        $match: {
          roadId
        }
      },
      {
        $group: {
          _id: null,

          averageVehicleCount: {
            $avg: "$vehicleCount"
          },

          averageSpeed: {
            $avg: "$averageSpeed"
          },

          speedVariability: {
            $stdDevPop: "$averageSpeed"
          },

          recordCount: {
            $sum: 1
          },

          highCongestionCount: {
            $sum: {
              $cond: [
                { $eq: ["$congestionLevel", "HIGH"] },
                1,
                0
              ]
            }
          },

          mediumCongestionCount: {
            $sum: {
              $cond: [
                { $eq: ["$congestionLevel", "MEDIUM"] },
                1,
                0
              ]
            }
          },

          lowCongestionCount: {
            $sum: {
              $cond: [
                { $eq: ["$congestionLevel", "LOW"] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    predictionSource = "ROAD_HISTORY_FALLBACK";
  }

  // No historical records are available for this road.
  if (historicalData.length === 0) {
    return null;
  }

  const historical = historicalData[0];
  const recordCount = historical.recordCount;

  if (!recordCount || recordCount <= 0) {
    return null;
  }

  const highCongestionPercentage =
    (historical.highCongestionCount / recordCount) * 100;

  const mediumCongestionPercentage =
    (historical.mediumCongestionCount / recordCount) * 100;

  const lowCongestionPercentage =
    (historical.lowCongestionCount / recordCount) * 100;

  /*
   * Classify congestion using the most frequently recorded
   * congestion level. This describes historical observations;
   * it does not guarantee the future traffic condition.
   */
  const congestionCounts = [
    {
      level: "HIGH",
      count: historical.highCongestionCount
    },
    {
      level: "MEDIUM",
      count: historical.mediumCongestionCount
    },
    {
      level: "LOW",
      count: historical.lowCongestionCount
    }
  ];

  // Prefer HIGH, then MEDIUM, if counts are tied.
  congestionCounts.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    const priority = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };

    return priority[b.level] - priority[a.level];
  });

  const predictedCongestion = congestionCounts[0].level;

  return {
    predictedVehicleCount: Math.round(
      historical.averageVehicleCount
    ),

    predictedSpeed: Math.round(
      historical.averageSpeed * 10
    ) / 10,

    speedVariability: Math.round(
      (historical.speedVariability || 0) * 10
    ) / 10,

    predictedCongestion,

    highCongestionPercentage: Math.round(
      highCongestionPercentage
    ),

    mediumCongestionPercentage: Math.round(
      mediumCongestionPercentage
    ),

    lowCongestionPercentage: Math.round(
      lowCongestionPercentage
    ),

    historicalRecords: recordCount,

    predictionSource
  };
}

module.exports = predictTraffic;

