const geocodeLocation = require("../utils/geocode");
const getRoute = require("../utils/route");
const express = require("express");
const TrafficRecord = require("../models/TrafficRecord");
const predictTraffic = require("../utils/predictTraffic");

const calculateStabilityScore =
  require("../utils/calculateStabilityScore");

const router = express.Router();

const RoadSegment = require("../models/RoadSegment");
const matchRoadSegments = require("../utils/matchRoadSegments");

// ==========================================
// SEARCH ROUTES
// ==========================================

router.post("/search", async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "From and To locations are required"
      });
    }

    // 1. GEOCODE SOURCE
    const fromLocation = await geocodeLocation(from);

    if (!fromLocation) {
      return res.status(404).json({
        success: false,
        message: `Could not find location: ${from}`
      });
    }

    // 2. GEOCODE DESTINATION
    const toLocation = await geocodeLocation(to);

    if (!toLocation) {
      return res.status(404).json({
        success: false,
        message: `Could not find location: ${to}`
      });
    }

    console.log("FROM:", fromLocation);
    console.log("TO:", toLocation);

    // 3. GET ROUTES FROM OSRM
    const routeData = await getRoute(
      fromLocation.latitude,
      fromLocation.longitude,
      toLocation.latitude,
      toLocation.longitude
    );

    if (
      !routeData ||
      routeData.code !== "Ok" ||
      !Array.isArray(routeData.routes) ||
      routeData.routes.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: "No driving routes were found for these locations."
      });
    }

    console.log("OSRM ROUTES FOUND:", routeData.routes.length);

    // 4. GET CURRENT DAY AND HOUR
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
    const dayOfWeek = days[now.getDay()];
    const currentHour = now.getHours();

    const routes = [];

    // 5. PROCESS EACH ROUTE
    for (let index = 0; index < routeData.routes.length; index++) {
      const route = routeData.routes[index];

      if (
        !route ||
        !Number.isFinite(route.distance) ||
        !Number.isFinite(route.duration) ||
        !route.geometry ||
        !Array.isArray(route.geometry.coordinates)
      ) {
        console.warn("Skipping invalid OSRM route:", index);
        continue;
      }

      const routeCoordinates = route.geometry.coordinates;

      let matchedRoadId = null;
      let matchedRoadName = null;

      // Match route with registered MongoDB road segments.
      try {
        const matchedSegments =
          await matchRoadSegments(routeCoordinates);

        if (
          Array.isArray(matchedSegments) &&
          matchedSegments.length > 0
        ) {
          matchedRoadId = matchedSegments[0].roadId;
          matchedRoadName = matchedSegments[0].roadName;

          console.log(
            `Route ${index + 1} matched:`,
            matchedRoadId,
            matchedRoadName
          );
        } else {
          console.log(
            `Route ${index + 1}: no registered road segment matched.`
          );
        }
      } catch (matchError) {
        // Matching failure must not remove a valid route.
        console.error(
          "Road matching failed:",
          matchError.message
        );
      }

      const roadId = matchedRoadId;

      // 6. FETCH HISTORICAL TRAFFIC PREDICTION
      let prediction = null;

      if (roadId) {
        try {
          prediction = await predictTraffic(
            roadId,
            dayOfWeek,
            currentHour
          );
        } catch (predictionError) {
          console.error(
            `Traffic prediction failed for ${roadId}:`,
            predictionError.message
          );
        }
      }

      const distanceKm =
        Math.round((route.distance / 1000) * 100) / 100;

      const currentTime = Math.max(
        1,
        Math.round(route.duration / 60)
      );

      let predictedTime = currentTime;
      let congestion = "LOW";
      let stabilityScore = 50;

      const hasHistoricalPrediction =
        Boolean(prediction) &&
        Number.isFinite(prediction.predictedSpeed) &&
        prediction.predictedSpeed > 0;

      // 7. CALCULATE PREDICTED TIME AND STABILITY SCORE
      if (hasHistoricalPrediction) {
        congestion = prediction.predictedCongestion || "MEDIUM";

        /*
         * Prototype travel-time estimate.
         * Assumes a baseline speed of 40 km/h.
         * This is not a live traffic prediction.
         */
        const baselineSpeed = 40;

        predictedTime = Math.max(
          1,
          Math.round(
            currentTime *
              (baselineSpeed / prediction.predictedSpeed)
          )
        );

        const calculatedScore = calculateStabilityScore({
          currentTime,
          predictedTime,

          highCongestionPercentage:
            Number(prediction.highCongestionPercentage) || 0,

          averageSpeed: prediction.predictedSpeed,

          speedVariability:
            Number(prediction.speedVariability) || 0
        });

        // Accept only valid scores.
        if (
          Number.isFinite(calculatedScore) &&
          calculatedScore >= 0 &&
          calculatedScore <= 100
        ) {
          stabilityScore = calculatedScore;
        }
      }

      console.log("========== ROUTE SCORE ==========");
      console.log("Road:", roadId);
      console.log("Current time:", currentTime);
      console.log("Predicted time:", predictedTime);
      console.log("Congestion:", congestion);
      console.log(
        "High congestion %:",
        prediction?.highCongestionPercentage
      );
      console.log(
        "Average speed:",
        prediction?.predictedSpeed
      );
      console.log(
        "Speed variability:",
        prediction?.speedVariability
      );
      console.log("FINAL STABILITY:", stabilityScore);

      // 8. ALWAYS INCLUDE VALID OSRM ROUTES
      routes.push({
        id: index + 1,

        name: `Route ${String.fromCharCode(65 + index)}`,

        roadId: roadId || null,

        roadName:
          matchedRoadName || "No registered road match",

        distance: distanceKm,

        currentTime,

        predictedTime,

        congestion,

        riskClass: congestion.toLowerCase(),

        stabilityScore,

        // Assigned after all routes have been processed.
        recommended: false,

        message: hasHistoricalPrediction
          ? "Travel-time estimate uses historical traffic records and a prototype calculation."
          : roadId
            ? "Road matched, but historical prediction is unavailable."
            : "Real route found. Register and match its road segment to use historical traffic predictions.",

        geometry: route.geometry,

        trafficPrediction: prediction
      });
    }

    // 9. RANK ROUTES
    // Prefer routes with valid historical predictions.
    // Then compare stability scores and predicted travel times.
    routes.sort((a, b) => {
      const aHasPrediction =
        a.trafficPrediction &&
        Number.isFinite(a.trafficPrediction.predictedSpeed) &&
        a.trafficPrediction.predictedSpeed > 0
          ? 1
          : 0;

      const bHasPrediction =
        b.trafficPrediction &&
        Number.isFinite(b.trafficPrediction.predictedSpeed) &&
        b.trafficPrediction.predictedSpeed > 0
          ? 1
          : 0;

      if (aHasPrediction !== bHasPrediction) {
        return bHasPrediction - aHasPrediction;
      }

      if (b.stabilityScore !== a.stabilityScore) {
        return b.stabilityScore - a.stabilityScore;
      }

      return a.predictedTime - b.predictedTime;
    });

    // Recommend the top-ranked route only when a valid
    // historical prediction is available.
    if (routes.length > 0) {
      const firstRoute = routes[0];

      const firstRouteHasPrediction =
        firstRoute.trafficPrediction &&
        Number.isFinite(firstRoute.trafficPrediction.predictedSpeed) &&
        firstRoute.trafficPrediction.predictedSpeed > 0;

      if (firstRouteHasPrediction) {
        firstRoute.recommended = true;
      }
    }

    console.log("FINAL ROUTES RETURNED:", routes.length);

    // 10. SEND RESPONSE
    return res.json({
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

      routes
    });

  } catch (error) {
    console.error(
      "Route search error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to search routes"
    });
  }
});

// ==========================================
// ADD A TRAFFIC RECORD
// ==========================================

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

    return res.status(201).json({
      success: true,
      message: "Traffic record saved successfully",
      data: savedRecord
    });

  } catch (error) {
    console.error(
      "Error saving traffic record:",
      error.message
    );

    return res.status(500).json({
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
      const { roadId, dayOfWeek, hour } = req.params;

      const trafficPattern = await TrafficRecord.aggregate([
        {
          $match: {
            roadId,
            dayOfWeek,
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
                  { $eq: ["$congestionLevel", "HIGH"] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      if (trafficPattern.length === 0) {
        return res.json({
          success: true,
          roadId,
          dayOfWeek,
          hour: Number(hour),
          data: null,
          message: "No historical traffic data found."
        });
      }

      const pattern = trafficPattern[0];

      const highCongestionPercentage =
        (pattern.highCongestionCount / pattern.recordCount) * 100;

      return res.json({
        success: true,
        roadId,
        dayOfWeek,
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

    } catch (error) {
      console.error(
        "Error calculating traffic pattern:",
        error.message
      );

      return res.status(500).json({
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
      {
        $match: {
          roadId
        }
      },
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
      {
        $sort: {
          _id: 1
        }
      }
    ]);

    return res.json({
      success: true,
      roadId,
      history
    });

  } catch (error) {
    console.error(
      "Error fetching traffic history:",
      error.message
    );

    return res.status(500).json({
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

    return res.json({
      success: true,
      count: trafficRecords.length,
      data: trafficRecords
    });

  } catch (error) {
    console.error(
      "Error fetching traffic records:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch traffic records"
    });
  }
});

// ==========================================
// PREDICT TRAFFIC USING AGGREGATION
// ==========================================

router.get(
  "/traffic/predict/:roadId/:dayOfWeek/:hour",
  async (req, res) => {
    try {
      const { roadId, dayOfWeek, hour } = req.params;

      const historicalData = await TrafficRecord.aggregate([
        {
          $match: {
            roadId,
            dayOfWeek,
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
                  { $eq: ["$congestionLevel", "HIGH"] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      if (historicalData.length === 0) {
        return res.json({
          success: true,
          message: "Not enough historical data for prediction",
          prediction: null
        });
      }

      const historical = historicalData[0];

      const highCongestionPercentage =
        (historical.highCongestionCount /
          historical.recordCount) * 100;

      const predictedVehicleCount =
        Math.round(historical.averageVehicleCount);

      const predictedSpeed =
        Math.round(historical.averageSpeed * 10) / 10;

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
        predictedSpeed > 0
          ? Math.round((roadDistanceKm / predictedSpeed) * 60)
          : null;

      return res.json({
        success: true,
        roadId,
        dayOfWeek,
        hour: Number(hour),

        prediction: {
          predictedVehicleCount,
          predictedSpeed,
          predictedCongestion,
          predictedTravelTime,
          distanceKm: roadDistanceKm,
          historicalRecords: historical.recordCount,
          highCongestionPercentage:
            Math.round(highCongestionPercentage)
        }
      });

    } catch (error) {
      console.error(
        "Prediction error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Failed to predict traffic"
      });
    }
  }
);

// ==========================================
// REGISTER OR UPDATE A ROAD SEGMENT
// ==========================================

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

    return res.status(201).json({
      success: true,
      message: "Road segment saved successfully",
      data: roadSegment
    });

  } catch (error) {
    console.error(
      "Error saving road segment:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to save road segment"
    });
  }
});

// ==========================================
// GET ALL ACTIVE ROAD SEGMENTS
// ==========================================

router.get("/segments", async (req, res) => {
  try {
    const segments = await RoadSegment.find({
      isActive: true
    }).sort({
      roadName: 1
    });

    return res.json({
      success: true,
      count: segments.length,
      data: segments
    });

  } catch (error) {
    console.error(
      "Error fetching road segments:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch road segments"
    });
  }
});

// ==========================================
// GET TRAFFIC PREDICTION USING TRAFFIC MEMORY
// ==========================================

router.get(
  "/predict/:roadId/:dayOfWeek/:hour",
  async (req, res) => {
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

      return res.json({
        success: true,
        roadId,
        dayOfWeek,
        hour: Number(hour),
        prediction
      });

    } catch (error) {
      console.error(
        "Prediction error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Failed to predict traffic."
      });
    }
  }
);

// ==========================================
// GET HISTORICAL TRAFFIC PATTERN
// ==========================================

router.get(
  "/pattern/:roadId/:dayOfWeek/:hour",
  async (req, res) => {
    try {
      const { roadId, dayOfWeek, hour } = req.params;

      const trafficRecords = await TrafficRecord.find({
        roadId,
        dayOfWeek,
        hour: Number(hour)
      }).sort({
        timestamp: -1
      });

      if (trafficRecords.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "No historical traffic records found for this road and time."
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

      return res.json({
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
          (
            (highCongestionCount / trafficRecords.length) * 100
          ).toFixed(2)
        ),

        records: trafficRecords
      });

    } catch (error) {
      console.error(
        "Traffic pattern error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve historical traffic patterns."
      });
    }
  }
);

// ==========================================
// TRAFFIC MEMORY ANALYTICS
// ==========================================

router.get("/analytics/:roadId", async (req, res) => {
  try {
    const { roadId } = req.params;

    const analytics = await TrafficRecord.aggregate([
      {
        $match: {
          roadId
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

    return res.json({
      success: true,
      roadId,
      count: analytics.length,
      data: analytics
    });

  } catch (error) {
    console.error(
      "Traffic analytics error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate traffic analytics."
    });
  }
});

module.exports = router;
