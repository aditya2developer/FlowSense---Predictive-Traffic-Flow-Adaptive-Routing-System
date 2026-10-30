const geocodeLocation = require("../utils/geocode");
const getRoute = require("../utils/route");
const express = require("express");
const TrafficRecord = require("../models/TrafficRecord");
const predictTraffic = require("../utils/predictTraffic");
const calculateStabilityScore = require("../utils/calculateStabilityScore");
const RoadSegment = require("../models/RoadSegment");
const matchRoadSegments = require("../utils/matchRoadSegments");

const router = express.Router();

// ==========================================
// SEARCH ROUTES
// ==========================================

router.post("/search", async (req, res) => {
  try {
    const { from, to } = req.body || {};

    if (
      typeof from !== "string" ||
      typeof to !== "string" ||
      !from.trim() ||
      !to.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "From and To locations are required."
      });
    }

    // 1. GEOCODE SOURCE
    const fromLocation = await geocodeLocation(from.trim());

    if (!fromLocation) {
      return res.status(404).json({
        success: false,
        message: `Could not find location: ${from}`
      });
    }

    // 2. GEOCODE DESTINATION
    const toLocation = await geocodeLocation(to.trim());

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
    // Uses the backend server's local timezone.
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
        !Array.isArray(route.geometry.coordinates) ||
        route.geometry.coordinates.length < 2
      ) {
        console.warn("Skipping invalid OSRM route:", index);
        continue;
      }

      const routeCoordinates = route.geometry.coordinates;

      let matchedRoadId = null;
      let matchedRoadName = null;

      // 6. MATCH ROUTE WITH A REGISTERED ROAD SEGMENT
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
        // A matching error should not remove a valid OSRM route.
        console.error(
          "Road matching failed:",
          matchError
        );
      }

      const roadId = matchedRoadId;

      // 7. FETCH HISTORICAL TRAFFIC PREDICTION
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
            predictionError
          );
        }
      }

      const distanceKm = Number(
        (route.distance / 1000).toFixed(2)
      );

      const currentTime = Math.max(
        1,
        Math.round(route.duration / 60)
      );

      // Do not invent congestion or stability values when
      // historical traffic data is unavailable.
      let predictedTime = currentTime;
      let congestion = null;
      let stabilityScore = null;

      // Validate the prediction before using it.
      const hasHistoricalPrediction =
        Boolean(prediction) &&
        Number.isFinite(prediction.predictedSpeed) &&
        prediction.predictedSpeed > 0 &&
        Number.isFinite(prediction.historicalRecords) &&
        prediction.historicalRecords > 0 &&
        ["LOW", "MEDIUM", "HIGH"].includes(
          prediction.predictedCongestion
        );

      // 8. CALCULATE PREDICTED TIME AND STABILITY SCORE
      if (hasHistoricalPrediction) {
        congestion = prediction.predictedCongestion;

        /*
         * Prototype travel-time calculation.
         *
         * Assumes a baseline speed of 40 km/h.
         * This is NOT a live traffic measurement.
         *
         * Replace this assumption with a validated
         * route-specific baseline when suitable data
         * becomes available.
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

        if (
          Number.isFinite(calculatedScore) &&
          calculatedScore >= 0 &&
          calculatedScore <= 100
        ) {
          stabilityScore = calculatedScore;
        }
      }

      console.log("========== ROUTE SCORE ==========");
      console.log("Route:", index + 1);
      console.log("Road:", roadId);
      console.log("Current time:", currentTime);
      console.log("Predicted time:", predictedTime);
      console.log("Congestion:", congestion);
      console.log(
        "Historical records:",
        prediction?.historicalRecords
      );
      console.log(
        "Predicted speed:",
        prediction?.predictedSpeed
      );
      console.log(
        "High congestion percentage:",
        prediction?.highCongestionPercentage
      );
      console.log("Stability score:", stabilityScore);

      // 9. INCLUDE VALID ROUTES IN THE RESPONSE
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

        // Avoid calling toLowerCase() on null.
        riskClass: congestion
          ? congestion.toLowerCase()
          : "unknown",

        stabilityScore,

        recommended: false,

        message: hasHistoricalPrediction
          ? "Travel-time estimate uses historical traffic records and a prototype calculation."
          : roadId
            ? "Road matched, but a valid historical prediction is unavailable."
            : "Route found. No registered road segment matched, so historical traffic prediction is unavailable.",

        geometry: route.geometry,

        trafficPrediction: hasHistoricalPrediction
          ? prediction
          : null
      });
    }

    // If OSRM returned routes but all were invalid, report this.
    if (routes.length === 0) {
      return res.status(502).json({
        success: false,
        message: "The routing service returned no usable routes."
      });
    }

    // 10. RANK ROUTES
    // Prefer routes with valid historical predictions.
    // Then compare stability scores and predicted travel times.
    routes.sort((a, b) => {
      const aHasPrediction =
        a.trafficPrediction &&
        Number.isFinite(a.trafficPrediction.predictedSpeed) &&
        a.trafficPrediction.predictedSpeed > 0 &&
        Number.isFinite(a.stabilityScore)
          ? 1
          : 0;

      const bHasPrediction =
        b.trafficPrediction &&
        Number.isFinite(b.trafficPrediction.predictedSpeed) &&
        b.trafficPrediction.predictedSpeed > 0 &&
        Number.isFinite(b.stabilityScore)
          ? 1
          : 0;

      if (aHasPrediction !== bHasPrediction) {
        return bHasPrediction - aHasPrediction;
      }

      // Compare scores only when both routes have scores.
      if (
        Number.isFinite(a.stabilityScore) &&
        Number.isFinite(b.stabilityScore) &&
        a.stabilityScore !== b.stabilityScore
      ) {
        return b.stabilityScore - a.stabilityScore;
      }

      // Otherwise, prefer the shorter estimated travel time.
      return a.predictedTime - b.predictedTime;
    });

    // 11. RECOMMEND A ROUTE ONLY WHEN ITS PREDICTION
    // AND STABILITY SCORE ARE VALID.
    if (routes.length > 0) {
      const firstRoute = routes[0];

      const firstRouteHasPrediction =
        Boolean(firstRoute.trafficPrediction) &&
        Number.isFinite(
          firstRoute.trafficPrediction.predictedSpeed
        ) &&
        firstRoute.trafficPrediction.predictedSpeed > 0 &&
        Number.isFinite(firstRoute.stabilityScore) &&
        firstRoute.stabilityScore >= 0 &&
        firstRoute.stabilityScore <= 100;

      if (firstRouteHasPrediction) {
        firstRoute.recommended = true;
      }
    }

    console.log("FINAL ROUTES RETURNED:", routes.length);

    // 12. SEND RESPONSE
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
    // Full details are logged in the backend terminal.
    console.error("Route search error:", error);

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
    console.error("Error saving traffic record:", error);

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
      const numericHour = Number(hour);

      if (
        !Number.isInteger(numericHour) ||
        numericHour < 0 ||
        numericHour > 23
      ) {
        return res.status(400).json({
          success: false,
          message: "Hour must be an integer between 0 and 23."
        });
      }

      const trafficPattern = await TrafficRecord.aggregate([
        {
          $match: {
            roadId,
            dayOfWeek,
            hour: numericHour
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
          hour: numericHour,
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
        hour: numericHour,

        data: {
          averageVehicleCount: Math.round(
            pattern.averageVehicleCount
          ),

          averageSpeed: Number(
            pattern.averageSpeed.toFixed(1)
          ),

          recordCount: pattern.recordCount,

          highCongestionCount: pattern.highCongestionCount,

          highCongestionPercentage: Math.round(
            highCongestionPercentage
          )
        }
      });
    } catch (error) {
      console.error("Error calculating traffic pattern:", error);

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
    console.error("Error fetching traffic history:", error);

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
    console.error("Error fetching traffic records:", error);

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
      const numericHour = Number(hour);

      if (
        !Number.isInteger(numericHour) ||
        numericHour < 0 ||
        numericHour > 23
      ) {
        return res.status(400).json({
          success: false,
          message: "Hour must be an integer between 0 and 23."
        });
      }

      const historicalData = await TrafficRecord.aggregate([
        {
          $match: {
            roadId,
            dayOfWeek,
            hour: numericHour
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

      const predictedVehicleCount = Math.round(
        historical.averageVehicleCount
      );

      const predictedSpeed = Number(
        historical.averageSpeed.toFixed(1)
      );

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
        hour: numericHour,

        prediction: {
          predictedVehicleCount,
          predictedSpeed,
          predictedCongestion,
          predictedTravelTime,
          distanceKm: roadDistanceKm,
          historicalRecords: historical.recordCount,
          highCongestionPercentage: Math.round(
            highCongestionPercentage
          )
        }
      });
    } catch (error) {
      console.error("Prediction error:", error);

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

    // Validate the coordinate structure.
    const validCoordinates = coordinates.every(
      (point) =>
        point &&
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        point.latitude >= -90 &&
        point.latitude <= 90 &&
        point.longitude >= -180 &&
        point.longitude <= 180
    );

    if (!validCoordinates) {
      return res.status(400).json({
        success: false,
        message:
          "Each coordinate must contain valid latitude and longitude numbers."
      });
    }

    const roadSegment = await RoadSegment.findOneAndUpdate(
      { roadId },
      {
        roadId,
        roadName,
        coordinates,
        ...(roadType ? { roadType } : {})
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
    console.error("Error saving road segment:", error);

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
    console.error("Error fetching road segments:", error);

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
      const numericHour = Number(hour);

      if (
        !Number.isInteger(numericHour) ||
        numericHour < 0 ||
        numericHour > 23
      ) {
        return res.status(400).json({
          success: false,
          message: "Hour must be an integer between 0 and 23."
        });
      }

      const prediction = await predictTraffic(
        roadId,
        dayOfWeek,
        numericHour
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
        hour: numericHour,
        prediction
      });
    } catch (error) {
      console.error("Prediction error:", error);

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
      const numericHour = Number(hour);

      if (
        !Number.isInteger(numericHour) ||
        numericHour < 0 ||
        numericHour > 23
      ) {
        return res.status(400).json({
          success: false,
          message: "Hour must be an integer between 0 and 23."
        });
      }

      const trafficRecords = await TrafficRecord.find({
        roadId,
        dayOfWeek,
        hour: numericHour
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
        (record) => record.congestionLevel === "HIGH"
      ).length;

      return res.json({
        success: true,
        roadId,
        dayOfWeek,
        hour: numericHour,
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
      console.error("Traffic pattern error:", error);

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
    console.error("Traffic analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate traffic analytics."
    });
  }
});

module.exports = router;