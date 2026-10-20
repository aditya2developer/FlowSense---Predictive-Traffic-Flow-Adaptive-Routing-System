const geocodeLocation = require("../utils/geocode");
const getRoute = require("../utils/route");
const express = require("express");
const TrafficRecord = require("../models/TrafficRecord");

const predictTraffic = require("../utils/predictTraffic");

const calculateStabilityScore =
  require("../utils/calculateStabilityScore");
const router = express.Router();

const RoadSegment = require("../models/RoadSegment");



router.post("/search", async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "From and To locations are required"
      });
    }

    // --------------------------------
    // 1. GEOCODE FROM LOCATION
    // --------------------------------

    const fromLocation = await geocodeLocation(from);

    if (!fromLocation) {
      return res.status(404).json({
        success: false,
        message: `Could not find location: ${from}`
      });
    }

    // --------------------------------
    // 2. GEOCODE TO LOCATION
    // --------------------------------

    const toLocation = await geocodeLocation(to);

    if (!toLocation) {
      return res.status(404).json({
        success: false,
        message: `Could not find location: ${to}`
      });
    }

    console.log("FROM:", fromLocation);
    console.log("TO:", toLocation);

    // --------------------------------
    // 3. GET REAL ROAD ROUTES
    // --------------------------------

    const routeData = await getRoute(
      fromLocation.latitude,
      fromLocation.longitude,
      toLocation.latitude,
      toLocation.longitude
    );

    const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];



const now = new Date();

const dayOfWeek =
  days[now.getDay()];

const hour =
  now.getHours();


const routes = [];

for (
  let index = 0;
  index < routeData.routes.length;
  index++
) {

  const route = routeData.routes[index];

  const roadId =
    index === 0
      ? "RD001"
      : "RD002";


  const prediction =
    await predictTraffic(
      roadId,
      dayOfWeek,
      hour
    );


  const distanceKm =
    Math.round(
      (route.distance / 1000) * 100
    ) / 100;


  const currentTime =
    Math.round(
      route.duration / 60
    );


  let predictedTime =
    currentTime;

  let congestion =
    "LOW";

  let stabilityScore =
    50;


  if (prediction) {

    congestion =
      prediction.predictedCongestion;


    /*
      Traffic speed factor

      OSRM time = baseline travel time.

      If historical speed is lower,
      predicted travel time increases.
    */

    const normalSpeed = 40;

    const speedFactor =
      normalSpeed /
      prediction.predictedSpeed;


    predictedTime =
      Math.round(
        currentTime * speedFactor
      );


    /*
      Stability score

      Higher congestion risk
      → lower stability.
    */

  //   if (congestion === "HIGH") {

  //     stabilityScore = 55;

  //   } else if (
  //     congestion === "MEDIUM"
  //   ) {

  //     stabilityScore = 72;

  //   } else {

  //     stabilityScore = 88;

  //   }
  // let stabilityScore = 50;

if (prediction) {

  stabilityScore =
    calculateStabilityScore({

      currentTime: currentTime,

      predictedTime: predictedTime,

      highCongestionPercentage:
        prediction.highCongestionPercentage,

      averageSpeed:
        prediction.predictedSpeed,

      speedVariability:
        prediction.speedVariability

    });

  console.log("========== ROUTE SCORE ==========");

  console.log("Road:", roadId);

  console.log(
    "Current time:",
    currentTime
  );

  console.log(
    "Predicted time:",
    predictedTime
  );

  console.log(
    "Congestion:",
    prediction.predictedCongestion
  );

  console.log(
    "High congestion %:",
    prediction.highCongestionPercentage
  );

  console.log(
    "Average speed:",
    prediction.predictedSpeed
  );

  console.log(
    "Speed variability:",
    prediction.speedVariability
  );

  console.log(
    "FINAL STABILITY:",
    stabilityScore
  );

}

  // }



  routes.push({

    id: index + 1,

    name:
      `Route ${String.fromCharCode(65 + index)}`,

    distance:
      distanceKm,

    currentTime:
      currentTime,

    predictedTime:
      predictedTime,

    congestion:
      congestion,

    riskClass:
      congestion.toLowerCase(),

    stabilityScore:
      stabilityScore,

    recommended:false,

    message:
      prediction
        ? "Prediction based on historical traffic memory."
        : "Historical traffic data unavailable.",

    geometry:
      route.geometry,

    trafficPrediction:
      prediction

  });

}
}

routes.sort(
  (a, b) =>
    b.stabilityScore -
    a.stabilityScore
);

if (routes.length > 0) {

  routes[0].recommended = true;

}

    // --------------------------------
    // 5. SEND RESPONSE
    // --------------------------------

    res.json({
      success: true,

      from: {
        name: fromLocation.displayName,
        latitude: fromLocation.latitude,
        longitude: fromLocation.longitude
      },

      to: {
        name: toLocation.displayName,
        latitude: toLocation.latitude,
        longitude: toLocation.longitude
      },

      routes: routes
    });

  } catch (error) {

    console.error(
      "Route search error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to search routes"
    });
  }
});

router.post("/traffic", async (req, res) => {

  try {

    const trafficRecord = new TrafficRecord({
      roadId: req.body.roadId,
      roadName: req.body.roadName,
      timestamp: req.body.timestamp,
      dayOfWeek: req.body.dayOfWeek,
      hour: req.body.hour,
      vehicleCount: req.body.vehicleCount,
      averageSpeed: req.body.averageSpeed,
      congestionLevel: req.body.congestionLevel
    });

    const savedRecord = await trafficRecord.save();

    res.status(201).json({
      success: true,
      message: "Traffic record saved successfully",
      data: savedRecord
    });

  } catch (error) {

    console.error("Error saving traffic record:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to save traffic record"
    });

  }

});

// ==========================================
// GET HISTORICAL TRAFFIC PATTERN
// ROAD + DAY + HOUR
// ==========================================

router.get(
  "/traffic/pattern/:roadId/:dayOfWeek/:hour",
  async (req, res) => {

    try {

      const {
        roadId,
        dayOfWeek,
        hour
      } = req.params;

      const trafficPattern = await TrafficRecord.aggregate([

        // 1. Find matching historical records
        {
          $match: {
            roadId: roadId,
            dayOfWeek: dayOfWeek,
            hour: Number(hour)
          }
        },

        // 2. Calculate historical averages
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

      const pattern = trafficPattern[0];

const highCongestionPercentage =
  (pattern.highCongestionCount / pattern.recordCount) * 100;

      // No historical data found
      res.json({

  success: true,

  roadId: roadId,

  dayOfWeek: dayOfWeek,

  hour: Number(hour),

  data: {

    averageVehicleCount:
      Math.round(pattern.averageVehicleCount),

    averageSpeed:
      Math.round(pattern.averageSpeed * 10) / 10,

    recordCount:
      pattern.recordCount,

    highCongestionCount:
      pattern.highCongestionCount,

    highCongestionPercentage:
      Math.round(highCongestionPercentage)

  }

});


      res.json({

        success: true,

        roadId: roadId,

        dayOfWeek: dayOfWeek,

        hour: Number(hour),

        data: trafficPattern[0]

      });

    } catch (error) {

      console.error(
        "Error calculating traffic pattern:",
        error.message
      );

      res.status(500).json({

        success: false,

        message: "Failed to calculate traffic pattern"

      });

    }

  }
);

// ==========================================
// GET TRAFFIC HISTORY FOR A ROAD
// ==========================================

router.get("/traffic/history/:roadId", async (req, res) => {

  try {

    const { roadId } = req.params;

    const history = await TrafficRecord.aggregate([

      // 1. Find records for this road
      {
        $match: {
          roadId: roadId
        }
      },

      // 2. Group records by hour
      {
        $group: {

          _id: "$hour",

          averageVehicleCount: {
            $avg: "$vehicleCount"
          },

          averageSpeed: {
            $avg: "$averageSpeed"
          },

          recordCount: {
            $sum: 1
          }

        }
      },

      // 3. Sort by hour
      {
        $sort: {
          _id: 1
        }
      }

    ]);

    res.json({

      success: true,

      roadId: roadId,

      history: history

    });

  } catch (error) {

    console.error(
      "Error fetching traffic history:",
      error.message
    );

    res.status(500).json({

      success: false,

      message: "Failed to fetch traffic history"

    });

  }

});
// ==========================================
// GET ALL TRAFFIC RECORDS
// ==========================================

router.get("/traffic", async (req, res) => {

  try {

    const trafficRecords = await TrafficRecord
      .find()
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      count: trafficRecords.length,
      data: trafficRecords
    });

  } catch (error) {

    console.error(
      "Error fetching traffic records:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch traffic records"
    });

  }

});

// ==========================================
// PREDICT TRAFFIC
// ==========================================

router.get(
  "/traffic/predict/:roadId/:dayOfWeek/:hour",
  async (req, res) => {

    try {

      const {
        roadId,
        dayOfWeek,
        hour
      } = req.params;


      // Get historical traffic pattern
      const historicalData = await TrafficRecord.aggregate([

        {
          $match: {
            roadId: roadId,
            dayOfWeek: dayOfWeek,
            hour: Number(hour)
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


      // No historical data
      if (historicalData.length === 0) {

        return res.json({

          success: true,

          message:
            "Not enough historical data for prediction",

          prediction: null

        });

      }


      const historical = historicalData[0];


      // Calculate historical high congestion percentage
      const highCongestionPercentage =
        (
          historical.highCongestionCount /
          historical.recordCount
        ) * 100;


      // ------------------------------------------
      // BASELINE PREDICTION
      // ------------------------------------------

      const predictedVehicleCount =
        Math.round(
          historical.averageVehicleCount
        );


      const predictedSpeed =
        Math.round(
          historical.averageSpeed * 10
        ) / 10;


      let predictedCongestion;


      if (highCongestionPercentage >= 70) {

        predictedCongestion = "HIGH";

      } else if (highCongestionPercentage >= 40) {

        predictedCongestion = "MEDIUM";

      } else {

        predictedCongestion = "LOW";

      }

      const roadDistanceKm = 10;

const predictedTravelTime =
  (roadDistanceKm / predictedSpeed) * 60;

const roundedTravelTime =
  Math.round(predictedTravelTime);

      // ------------------------------------------
      // RESPONSE
      // ------------------------------------------

      res.json({

        success: true,

        roadId: roadId,

        dayOfWeek: dayOfWeek,

        hour: Number(hour),

        prediction: {

          predictedVehicleCount:
            predictedVehicleCount,

          predictedSpeed:
            predictedSpeed,

          predictedCongestion:
            predictedCongestion,

            predictedTravelTime:
          roundedTravelTime,

          distanceKm:
          roadDistanceKm,

          historicalRecords:
            historical.recordCount,

          highCongestionPercentage:
            Math.round(
              highCongestionPercentage
            )

        }

      });

    } catch (error) {

      console.error(
        "Prediction error:",
        error.message
      );

      res.status(500).json({

        success: false,

        message: "Failed to predict traffic"

      });

    }

  }
);

// REGISTER A ROAD SEGMENT
router.post("/segments", async (req, res) => {
  try {
    const {
      roadId,
      roadName,
      coordinates,
      roadType
    } = req.body;

    if (
      !roadId ||
      !roadName ||
      !Array.isArray(coordinates) ||
      coordinates.length < 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          "roadId, roadName, and at least two coordinates are required"
      });
    }

    const roadSegment = await RoadSegment.findOneAndUpdate(
      { roadId },
      {
        roadId,
        roadName,
        coordinates,
        roadType
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(201).json({
      success: true,
      message: "Road segment saved successfully",
      data: roadSegment
    });

  } catch (error) {
    console.error("Error saving road segment:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to save road segment"
    });
  }
});

// GET ALL ACTIVE ROAD SEGMENTS
router.get("/segments", async (req, res) => {
  try {
    const segments = await RoadSegment.find({
      isActive: true
    }).sort({
      roadName: 1
    });

    res.json({
      success: true,
      count: segments.length,
      data: segments
    });

  } catch (error) {
    console.error("Error fetching road segments:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch road segments"
    });
  }
});

// GET TRAFFIC PREDICTION
router.get("/predict/:roadId/:dayOfWeek/:hour", async (req, res) => {
  try {
    const { roadId, dayOfWeek, hour } = req.params;

    const prediction = await predictTraffic(
      roadId,
      dayOfWeek,
      Number(hour)
    );

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: "No historical traffic data found for this road."
      });
    }

    res.json({
      success: true,
      roadId,
      dayOfWeek,
      hour: Number(hour),
      prediction
    });
  } catch (error) {
    console.error("Prediction error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to predict traffic."
    });
  }
});

// GET HISTORICAL TRAFFIC PATTERN
router.get("/pattern/:roadId/:dayOfWeek/:hour", async (req, res) => {
  try {
    const { roadId, dayOfWeek, hour } = req.params;

    const trafficRecords = await TrafficRecord.find({
      roadId,
      dayOfWeek,
      hour: Number(hour)
    }).sort({ timestamp: -1 });

    if (trafficRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No historical traffic records found for this road and time."
      });
    }

    const totalVehicles = trafficRecords.reduce(
      (sum, record) => sum + record.vehicleCount,
      0
    );

    const totalSpeed = trafficRecords.reduce(
      (sum, record) => sum + record.averageSpeed,
      0
    );

    const highCongestionCount = trafficRecords.filter(
      record => record.congestionLevel === "HIGH"
    ).length;

    res.json({
      success: true,
      roadId,
      dayOfWeek,
      hour: Number(hour),
      historicalRecords: trafficRecords.length,
      averageVehicleCount: Number(
        (totalVehicles / trafficRecords.length).toFixed(2)
      ),
      averageSpeed: Number(
        (totalSpeed / trafficRecords.length).toFixed(2)
      ),
      highCongestionPercentage: Number(
        ((highCongestionCount / trafficRecords.length) * 100).toFixed(2)
      ),
      records: trafficRecords
    });
  } catch (error) {
    console.error("Traffic pattern error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve historical traffic patterns."
    });
  }
});

// TRAFFIC MEMORY ANALYTICS
router.get("/analytics/:roadId", async (req, res) => {
  try {
    const { roadId } = req.params;

    const analytics = await TrafficRecord.aggregate([
      {
        $match: {
          roadId: roadId
        }
      },
      {
        $group: {
          _id: {
            dayOfWeek: "$dayOfWeek",
            hour: "$hour"
          },
          averageVehicleCount: {
            $avg: "$vehicleCount"
          },
          averageSpeed: {
            $avg: "$averageSpeed"
          },
          totalRecords: {
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
          }
        }
      },
      {
        $project: {
          _id: 0,
          dayOfWeek: "$_id.dayOfWeek",
          hour: "$_id.hour",
          averageVehicleCount: {
            $round: ["$averageVehicleCount", 2]
          },
          averageSpeed: {
            $round: ["$averageSpeed", 2]
          },
          totalRecords: 1,
          highCongestionPercentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      "$highCongestionCount",
                      "$totalRecords"
                    ]
                  },
                  100
                ]
              },
              2
            ]
          }
        }
      },
      {
        $sort: {
          dayOfWeek: 1,
          hour: 1
        }
      }
    ]);

    res.json({
      success: true,
      roadId,
      count: analytics.length,
      data: analytics
    });
  } catch (error) {
    console.error("Traffic analytics error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to generate traffic analytics."
    });
  }
});
module.exports = router;