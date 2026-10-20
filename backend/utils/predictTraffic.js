const TrafficRecord = require("../models/TrafficRecord");

async function predictTraffic(roadId, dayOfWeek, hour) {

  // First try exact day + hour
  let historicalData = await TrafficRecord.aggregate([
    {
      $match: {
        roadId: roadId,
        dayOfWeek: dayOfWeek,
        hour: hour
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

        recordCount: {
          $sum: 1
        },

        highCongestionCount: {
          $sum: {
            $cond: [
              {
                $eq: [
                  "$congestionLevel",
                  "HIGH"
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  // If exact time doesn't exist,
  // use all historical records for that road.
  if (historicalData.length === 0) {

    historicalData = await TrafficRecord.aggregate([
      {
        $match: {
          roadId: roadId
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
                {
                  $eq: [
                    "$congestionLevel",
                    "HIGH"
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
  }

  if (historicalData.length === 0) {
    return null;
  }

  const historical = historicalData[0];

  const highCongestionPercentage =
    (
      historical.highCongestionCount /
      historical.recordCount
    ) * 100;

  let predictedCongestion;

  if (highCongestionPercentage >= 70) {

    predictedCongestion = "HIGH";

  } else if (highCongestionPercentage >= 40) {

    predictedCongestion = "MEDIUM";

  } else {

    predictedCongestion = "LOW";

  }

  return {

  predictedVehicleCount:
    Math.round(
      historical.averageVehicleCount
    ),

  predictedSpeed:
    Math.round(
      historical.averageSpeed * 10
    ) / 10,

  speedVariability:
    Math.round(
      (historical.speedVariability || 0) * 10
    ) / 10,

  predictedCongestion,

  highCongestionPercentage:
    Math.round(
      highCongestionPercentage
    ),

  historicalRecords:
    historical.recordCount
};
}

module.exports = predictTraffic;