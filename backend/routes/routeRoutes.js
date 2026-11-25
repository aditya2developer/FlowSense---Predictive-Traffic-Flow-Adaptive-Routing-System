const geocodeLocation = require("../utils/geocode");
const getRoute = require("../utils/route");
const express = require("express");
const TrafficRecord = require("../models/TrafficRecord");
const predictTraffic = require("../utils/predictTraffic");
const calculateStabilityScore = require("../utils/calculateStabilityScore");
const RoadSegment = require("../models/RoadSegment");
const matchRoadSegments = require("../utils/matchRoadSegments");
const Incident = require('../models/Incident');
const Weather = require('../models/Weather');
const RouteSearch = require('../models/RouteSearch');
const { fetchRealTimeWeather } = require("../utils/liveWeather");
const { reverseGeocode, fetchNearbyEmergencyServices, autocompleteLocationIndia } = require("../utils/realTimeServices");
const generateRecommendations = require("../utils/recommendationEngine");
const { authenticate, optionalAuthenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

function sanitizeIncidentForCaller(inc, user) {
  if (!inc) return inc;
  const obj = typeof inc.toObject === "function" ? inc.toObject() : { ...inc };
  const canViewPii = user && ["ADMIN", "AUTHORITY"].includes(user.role);
  if (!canViewPii) {
    delete obj.reporterEmail;
    delete obj.contactPhone;
  }
  return obj;
}

function getIstDayAndHour() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const istString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istString);
  return {
    dayOfWeek: days[istDate.getDay()],
    currentHour: istDate.getHours()
  };
}

// ==========================================
// SEARCH ROUTES
// ==========================================

router.post("/search", optionalAuthenticate, async (req, res) => {
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

    // debug removed
    // debug removed

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

    // OSRM routes fetched

    // 4. GET CURRENT IST DAY & HOUR + LIVE DESTINATION WEATHER/AQI
    const { dayOfWeek, currentHour } = getIstDayAndHour();
    const destinationCityHint = (toLocation.displayName || to).split(",")[0].trim();
    const liveRouteWeather = await fetchRealTimeWeather(
      destinationCityHint,
      toLocation.latitude,
      toLocation.longitude
    ).catch(() => null);

    // Pre-fetch active incidents matching origin/destination city for non-seeded state corridors
    const searchCityKeywords = [
      (fromLocation.displayName || "").split(",")[0]?.trim(),
      (toLocation.displayName || "").split(",")[0]?.trim()
    ].filter((s) => s && s.length >= 3);

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

          // matched road segment
        } else {
          // no registered road segment matched
        }
      } catch (matchError) {
        // A matching error should not remove a valid OSRM route.
        console.error(
          "Road matching failed:",
          matchError
        );
      }

      const roadId = matchedRoadId;

      // 7. FETCH HISTORICAL TRAFFIC PREDICTION, LIVE WEATHER & ACTIVE INCIDENTS
      let prediction = null;
      let activeIncidents = [];
      let latestWeather = liveRouteWeather;

      if (!latestWeather && global.isMongoConnected) {
        try {
          latestWeather = await Weather.findOne({}).sort({ timestamp: -1 }).lean();
        } catch (err) {
          console.warn("Weather lookup skipped:", err.message);
        }
      }

      if (global.isMongoConnected) {
        if (roadId) {
          try {
            prediction = await predictTraffic(roadId, dayOfWeek, currentHour);
          } catch (predictionError) {
            console.error(`Traffic prediction failed for ${roadId}:`, predictionError);
          }
          try {
            activeIncidents = await Incident.find({ roadId, status: "ACTIVE" }).lean();
          } catch {}
        }
        if (activeIncidents.length === 0 && searchCityKeywords.length > 0) {
          try {
            const cityRegexes = searchCityKeywords.map((c) => new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
            activeIncidents = await Incident.find({ city: { $in: cityRegexes }, status: "ACTIVE" }).limit(6).lean();
          } catch {}
        }
      } else {
        const MemoryStore = require("../utils/memoryStore");
        const allMem = MemoryStore.getIncidents();
        activeIncidents = roadId
          ? allMem.filter((inc) => inc.roadId === roadId)
          : allMem.filter((inc) =>
              searchCityKeywords.some((c) => (inc.city || "").toLowerCase().includes(c.toLowerCase()))
            );
      }

      const distanceKm = Number(
        (route.distance / 1000).toFixed(2)
      );

      const currentTime = Math.max(
        1,
        Math.round(route.duration / 60)
      );

      let predictedTime = currentTime;
      let congestion = "LOW";
      let stabilityScore = null;

      const hasHistoricalPrediction =
        Boolean(prediction) &&
        Number.isFinite(prediction.predictedSpeed) &&
        prediction.predictedSpeed > 0 &&
        Number.isFinite(prediction.historicalRecords) &&
        prediction.historicalRecords > 0 &&
        ["LOW", "MEDIUM", "HIGH"].includes(prediction.predictedCongestion);

      // 8. CALCULATE PREDICTED TIME AND STABILITY SCORE (Historical OR Live Multi-State Telemetry)
      if (hasHistoricalPrediction) {
        congestion = prediction.predictedCongestion;
        const baselineSpeed = 40;
        predictedTime = Math.max(
          1,
          Math.round(currentTime * (baselineSpeed / prediction.predictedSpeed))
        );

        const calculatedScore = calculateStabilityScore({
          currentTime,
          predictedTime,
          highCongestionPercentage: Number(prediction.highCongestionPercentage) || 0,
          averageSpeed: prediction.predictedSpeed,
          speedVariability: Number(prediction.speedVariability) || 0,
          incidents: activeIncidents,
          weather: latestWeather
        });

        if (Number.isFinite(calculatedScore) && calculatedScore >= 0 && calculatedScore <= 100) {
          stabilityScore = calculatedScore;
        }
      } else {
        // Real-time Pan-India dynamic telemetry using OSRM free-flow speed, IST peak-hour curve & Open-Meteo weather/AQI
        const freeFlowSpeed = Number(Math.max(18, Math.min(85, (distanceKm / currentTime) * 60)).toFixed(1));
        const isMorningPeak = currentHour >= 8 && currentHour <= 11;
        const isEveningPeak = currentHour >= 17 && currentHour <= 21;
        const isMidday = currentHour >= 12 && currentHour <= 16;

        let rushFactor = 1.05;
        let highCongPct = 14;
        if (isMorningPeak || isEveningPeak) {
          rushFactor = 1.24 + index * 0.06;
          highCongPct = 52 + index * 10;
        } else if (isMidday) {
          rushFactor = 1.12 + index * 0.04;
          highCongPct = 28 + index * 8;
        }

        const rainMm = Number(latestWeather?.rainfall || 0);
        const weatherMultiplier = rainMm >= 5 ? 1.18 : rainMm > 0 ? 1.08 : 1.0;
        const incidentPenaltyMins = Math.min(25, activeIncidents.length * 6);

        predictedTime = Math.max(
          currentTime,
          Math.round(currentTime * rushFactor * weatherMultiplier + incidentPenaltyMins)
        );

        const dynamicSpeed = Number(Math.max(14, (distanceKm / predictedTime) * 60).toFixed(1));
        congestion =
          highCongPct >= 65 || rainMm >= 5 || activeIncidents.length >= 2
            ? "HIGH"
            : highCongPct >= 35 || activeIncidents.length === 1
              ? "MEDIUM"
              : "LOW";

        const calculatedScore = calculateStabilityScore({
          currentTime,
          predictedTime,
          highCongestionPercentage: Math.min(95, highCongPct),
          averageSpeed: dynamicSpeed,
          speedVariability: Number((Math.abs(freeFlowSpeed - dynamicSpeed) * 0.6 + 3.2).toFixed(1)),
          incidents: activeIncidents,
          weather: latestWeather
        });

        stabilityScore = Number.isFinite(calculatedScore) ? calculatedScore : 82;
        prediction = {
          predictedSpeed: dynamicSpeed,
          predictedCongestion: congestion,
          highCongestionPercentage: Math.min(95, highCongPct),
          speedVariability: Number((Math.abs(freeFlowSpeed - dynamicSpeed) * 0.6 + 3.2).toFixed(1)),
          historicalRecords: 0,
          isDynamicTelemetry: true
        };
      }

      // Generate concise user-facing rationale
      let explanation = "";
      if (hasHistoricalPrediction) {
        explanation = `Peak traffic pattern at ${currentHour}:00 IST shows ${congestion} congestion risk (est. ${prediction.predictedSpeed} km/h).`;
      } else {
        const wDesc = latestWeather ? `${latestWeather.condition} (${latestWeather.temperature}°C)` : "Clear conditions";
        explanation = `Live route analysis at ${currentHour}:00 IST under ${wDesc} shows ${congestion} congestion risk (est. ${prediction.predictedSpeed} km/h).`;
      }
      if (activeIncidents.length > 0) {
        explanation += ` ${activeIncidents.length} active hazard(s) reported nearby.`;
      }

      // 9. INCLUDE VALID ROUTES IN THE RESPONSE
      routes.push({
        id: index + 1,
        name: `Route ${String.fromCharCode(65 + index)}`,
        roadId: roadId || null,
        roadName:
          matchedRoadName ||
          route.legs?.[0]?.summary ||
          `Corridor ${String.fromCharCode(65 + index)}`,
        distance: distanceKm,
        currentTime,
        predictedTime,
        congestion,
        riskClass: congestion ? congestion.toLowerCase() : "low",
        stabilityScore,
        recommended: false,
        message: hasHistoricalPrediction
          ? "Estimated from corridor history and live weather telemetry."
          : "Estimated from live driving network, IST rush-hour flow, and Open-Meteo weather.",
        explanation,
        activeIncidents: activeIncidents.map((inc) => sanitizeIncidentForCaller(inc, null)),
        weather: latestWeather,
        geometry: route.geometry,
        trafficPrediction: prediction
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

    // routes returned

    // 11B. PERSIST ROUTE SEARCH & LIVE TRAFFIC OBSERVATION TO MONGODB
    if (global.isMongoConnected && routes.length > 0) {
      try {
        const best = routes[0];
        const parts = String(toLocation.displayName || "").split(",").map((s) => s.trim()).filter(Boolean);
        const inferredCity = best?.weather?.city || (parts.length >= 3 ? parts[parts.length - 3] : destinationCityHint) || "India";
        const inferredState = best?.weather?.state || (parts.length >= 2 ? parts[parts.length - 2] : "India");

        await RouteSearch.create({
          fromQuery: from.trim(),
          toQuery: to.trim(),
          fromName: fromLocation.displayName,
          toName: toLocation.displayName,
          fromCoords: { latitude: fromLocation.latitude, longitude: fromLocation.longitude },
          toCoords: { latitude: toLocation.latitude, longitude: toLocation.longitude },
          city: inferredCity,
          state: inferredState,
          recommendedRoadId: best.roadId || null,
          recommendedRoadName: best.roadName || "",
          distanceKm: best.distance || 0,
          currentTimeMin: best.currentTime || 0,
          predictedTimeMin: best.predictedTime || 0,
          stabilityScore: Number.isFinite(best.stabilityScore) ? best.stabilityScore : null,
          congestion: best.congestion || "LOW",
          weatherCondition: best.weather?.condition || "",
          weatherTemp: Number.isFinite(best.weather?.temperature) ? best.weather.temperature : null,
          userId: req.user?._id || null,
          userRole: req.user?.role || "GUEST",
          searchedAt: new Date()
        });

        const liveRoadId =
          best.roadId ||
          `LIVE_${String(inferredCity).replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10) || "INDIA"}`;
        const liveSpeed = Number(
          best.trafficPrediction?.predictedSpeed ||
          Math.max(16, Number(((best.distance / Math.max(1, best.predictedTime)) * 60).toFixed(1)))
        );
        const liveCongestion = ["LOW", "MEDIUM", "HIGH"].includes(best.congestion) ? best.congestion : "LOW";
        const liveVehicles = liveCongestion === "HIGH" ? 240 : liveCongestion === "MEDIUM" ? 145 : 68;

        await TrafficRecord.create({
          roadId: liveRoadId,
          roadName: best.roadName || `${inferredCity} Live Corridor`,
          timestamp: new Date(),
          dayOfWeek,
          hour: currentHour,
          vehicleCount: liveVehicles,
          averageSpeed: liveSpeed,
          congestionLevel: liveCongestion
        });
      } catch (syncErr) {
        console.warn("Search telemetry MongoDB sync warning:", syncErr.message);
      }
    }

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
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const trafficRecords = await TrafficRecord
      .find()
      .sort({ timestamp: -1 })
      .limit(limit);

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
    if (global.isMongoConnected) {
      try {
        const segments = await RoadSegment.find({
          isActive: true
        }).sort({
          roadName: 1
        });
        if (segments && segments.length > 0) {
          return res.json({
            success: true,
            count: segments.length,
            data: segments
          });
        }
      } catch (e) {}
    }

    const MemoryStore = require("../utils/memoryStore");
    const segments = MemoryStore.getAllRoads();
    return res.json({
      success: true,
      count: segments.length,
      data: segments
    });
  } catch (error) {
    const MemoryStore = require("../utils/memoryStore");
    const segments = MemoryStore.getAllRoads();
    return res.json({
      success: true,
      count: segments.length,
      data: segments
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

// RECENT ROUTE SEARCH TELEMETRY (MongoDB synced, authenticated per user)
router.get("/recent-searches", authenticate, async (req, res) => {
  try {
    if (!global.isMongoConnected) {
      return res.json({ success: true, count: 0, data: [] });
    }
    const filter = req.user.role === "ADMIN" ? {} : { userId: req.user._id };
    const rows = await RouteSearch.find(filter).sort({ searchedAt: -1 }).limit(20).lean();
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load search history." });
  }
});

// INCIDENTS - POST /incidents (Allows anyone to report any hazard with AI recommendations)
router.post('/incidents', async (req, res) => {
  try {
    const {
      roadId,
      roadName,
      state = '',
      city = 'General',
      type = 'ACCIDENT',
      severity = 'MEDIUM',
      description = '',
      landmark = '',
      reportedBy = 'Citizen Commuter',
      reporterEmail = '',
      contactPhone = '',
      location = '',
      images = [],
      coordinates
    } = req.body || {};

    const cleanRoadId = roadId && roadId.trim() ? roadId.trim() : `HAZ_${Date.now().toString(36).toUpperCase()}`;
    const cleanRoadName = roadName && roadName.trim() ? roadName.trim() : (location || `${city} Road Hazard`);

    const ALLOWED_TYPES = new Set([
      'ACCIDENT', 'CONSTRUCTION', 'FLOOD', 'WATERLOGGING', 'BREAKDOWN',
      'POTHOLE', 'TRAFFIC_JAM', 'ROADBLOCK', 'FIRE_HAZARD', 'STALLED_VEHICLE', 'DEBRIS', 'OTHER'
    ]);
    const rawType = String(type || 'ACCIDENT').trim().toUpperCase().replace(/[\s-]+/g, '_');
    const normalizedType = ALLOWED_TYPES.has(rawType) ? rawType : 'OTHER';
    const rawSev = String(severity || 'MEDIUM').trim().toUpperCase();
    const normalizedSeverity = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(rawSev) ? rawSev : 'MEDIUM';

    // Generate intelligent AI recommendations for both Commuter safety & Police response
    const { driverRecommendation, policeActionPlan } = generateRecommendations(
      normalizedType,
      normalizedSeverity,
      cleanRoadName,
      city
    );

    let saved = null;
    if (global.isMongoConnected) {
      const incident = new Incident({
        roadId: cleanRoadId,
        roadName: cleanRoadName,
        state: String(state || '').trim(),
        city: city.trim(),
        type: normalizedType,
        severity: normalizedSeverity,
        description: description.trim(),
        landmark: landmark.trim(),
        recommendation: driverRecommendation,
        reportedBy: reportedBy.trim() || 'Citizen Commuter',
        reporterEmail: String(reporterEmail || '').trim().toLowerCase(),
        contactPhone: contactPhone.trim(),
        location: location.trim() || cleanRoadName,
        images: Array.isArray(images) ? images.slice(0, 3) : [],
        upvotes: 1,
        coordinates: coordinates || null,
        status: 'ACTIVE'
      });
      saved = await incident.save();
    } else {
      const MemoryStore = require("../utils/memoryStore");
      saved = MemoryStore.createIncident({
        roadId: cleanRoadId,
        roadName: cleanRoadName,
        state: String(state || '').trim(),
        city: city.trim(),
        type: normalizedType,
        severity: normalizedSeverity,
        description: description.trim(),
        landmark: landmark.trim(),
        recommendation: driverRecommendation,
        reportedBy: reportedBy.trim() || 'Citizen Commuter',
        reporterEmail: String(reporterEmail || '').trim().toLowerCase(),
        contactPhone: contactPhone.trim(),
        location: location.trim() || cleanRoadName,
        images: Array.isArray(images) ? images.slice(0, 3) : [],
        coordinates: coordinates || null
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Hazard reported and saved to FlowSense real-time database.',
      data: saved,
      driverRecommendation,
      policeActionPlan
    });
  } catch (error) {
    console.error('Incident save error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save hazard report: ' + error.message });
  }
});

// INCIDENTS - GET all active (Supports ?city=Delhi & ?status=ACTIVE)
router.get('/incidents', optionalAuthenticate, async (req, res) => {
  try {
    const { city, status } = req.query;

    if (global.isMongoConnected) {
      try {
        const filter = {};
        if (status) {
          filter.status = status;
        } else {
          filter.status = 'ACTIVE';
        }
        if (city && city.toLowerCase() !== 'all' && city.toLowerCase() !== 'all cities' && city.toLowerCase() !== 'national') {
          filter.city = new RegExp(city.trim(), 'i');
        }
        const incidents = await Incident.find(filter).sort({ reportedAt: -1 }).limit(100);
        const safe = incidents.map((i) => sanitizeIncidentForCaller(i, req.user));
        return res.json({ success: true, count: safe.length, data: safe });
      } catch (e) {}
    }

    const MemoryStore = require("../utils/memoryStore");
    const memInc = MemoryStore.getIncidents(city).map((i) => sanitizeIncidentForCaller(i, req.user));
    return res.json({ success: true, count: memInc.length, data: memInc });
  } catch (error) {
    const MemoryStore = require("../utils/memoryStore");
    const memInc = MemoryStore.getIncidents(req.query?.city).map((i) => sanitizeIncidentForCaller(i, req.user));
    return res.json({ success: true, count: memInc.length, data: memInc });
  }
});

// INCIDENTS - GET by city
router.get('/incidents/city/:city', optionalAuthenticate, async (req, res) => {
  try {
    const cityName = req.params.city;
    if (global.isMongoConnected) {
      try {
        const filter = { status: 'ACTIVE' };
        if (cityName && cityName.toLowerCase() !== 'all') {
          filter.city = new RegExp(cityName.trim(), 'i');
        }
        const incidents = await Incident.find(filter).sort({ reportedAt: -1 });
        const safe = incidents.map((i) => sanitizeIncidentForCaller(i, req.user));
        return res.json({ success: true, count: safe.length, data: safe });
      } catch (e) {}
    }

    const MemoryStore = require("../utils/memoryStore");
    const memInc = MemoryStore.getIncidents(cityName).map((i) => sanitizeIncidentForCaller(i, req.user));
    return res.json({ success: true, count: memInc.length, data: memInc });
  } catch (error) {
    const MemoryStore = require("../utils/memoryStore");
    const memInc = MemoryStore.getIncidents(req.params.city).map((i) => sanitizeIncidentForCaller(i, req.user));
    return res.json({ success: true, count: memInc.length, data: memInc });
  }
});

// INCIDENTS - GET by roadId
router.get('/incidents/road/:roadId', optionalAuthenticate, async (req, res) => {
  try {
    if (global.isMongoConnected) {
      try {
        const incidents = await Incident.find({ roadId: req.params.roadId }).sort({ reportedAt: -1 });
        const safe = incidents.map((i) => sanitizeIncidentForCaller(i, req.user));
        return res.json({ success: true, count: safe.length, data: safe });
      } catch (e) {}
    }
    const MemoryStore = require("../utils/memoryStore");
    const memInc = MemoryStore.getIncidents()
      .filter((i) => i.roadId === req.params.roadId)
      .map((i) => sanitizeIncidentForCaller(i, req.user));
    return res.json({ success: true, count: memInc.length, data: memInc });
  } catch (error) {
    return res.json({ success: true, count: 0, data: [] });
  }
});

// INCIDENTS - PATCH resolve (Authority / Admin)
router.patch('/incidents/:id/resolve', authenticate, requireRole('AUTHORITY', 'ADMIN'), async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const incident = await Incident.findByIdAndUpdate(req.params.id, { status: 'RESOLVED' }, { new: true });
      if (!incident) {
        return res.status(404).json({ success: false, message: 'Incident not found.' });
      }
      return res.json({ success: true, message: 'Incident resolved.', data: incident });
    }
    const MemoryStore = require("../utils/memoryStore");
    const memInc = MemoryStore.updateIncidentStatus(req.params.id, 'RESOLVED');
    if (!memInc) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }
    return res.json({ success: true, message: 'Incident resolved.', data: memInc });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to resolve incident: ' + error.message });
  }
});

// WEATHER - GET Real-Time API for Any City (Open-Meteo live meteorological grid + auto MongoDB upsert)
router.get('/weather/:city', async (req, res) => {
  try {
    const cityName = req.params.city || 'Delhi';
    const liveWeather = await fetchRealTimeWeather(cityName);
    return res.json({ success: true, data: liveWeather });
  } catch (error) {
    console.error('Weather error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch real-time weather.' });
  }
});

// WEATHER - POST
router.post('/weather', async (req, res) => {
  try {
    const { location, city, state, temperature, humidity, rainfall, windSpeed, condition, visibility } = req.body;
    if (!location) return res.status(400).json({ success: false, message: 'location is required.' });
    const weather = new Weather({ location, city, state, temperature, humidity, rainfall, windSpeed, condition, visibility });
    const saved = await weather.save();
    return res.status(201).json({ success: true, data: saved });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to save weather.' }); }
});

// INCIDENTS - POST upvote / community verification
router.post('/incidents/:id/upvote', async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const updated = await Incident.findByIdAndUpdate(
        req.params.id,
        { $inc: { upvotes: 1 } },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Incident not found.' });
      }
      return res.json({ success: true, data: updated, message: 'Hazard confirmed by commuter.' });
    }
    const MemoryStore = require("../utils/memoryStore");
    const memUpdated = MemoryStore.upvoteIncident(req.params.id);
    if (memUpdated) {
      return res.json({ success: true, data: memUpdated, message: 'Hazard confirmed by commuter.' });
    }
    return res.status(404).json({ success: false, message: 'Incident not found.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// REAL-TIME REVERSE GEOCODING (Free BigDataCloud / Nominatim)
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'lat and lon query params required.' });
    }
    const result = await reverseGeocode(lat, lon);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Reverse geocode failed.' });
  }
});

// REAL-TIME NEARBY EMERGENCY SERVICES (Hospitals, Police, Fuel via Overpass API)
router.get('/nearby-services', async (req, res) => {
  try {
    const lat = Number(req.query.lat) || 28.6139;
    const lon = Number(req.query.lon) || 77.2090;
    const radius = Math.min(15000, Math.max(1000, Number(req.query.radius) || 5000));
    const result = await fetchNearbyEmergencyServices(lat, lon, radius);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load nearby services.' });
  }
});

// REAL-TIME PAN-INDIA AUTOCOMPLETE (Photon + Nominatim across all 28 States & 8 UTs)
router.get('/autocomplete', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const { lat, lon } = req.query;
    if (q.length < 2) {
      return res.json({ success: true, data: [] });
    }
    const suggestions = await autocompleteLocationIndia(q, lat, lon);
    return res.json({ success: true, data: suggestions });
  } catch {
    return res.json({ success: true, data: [] });
  }
});

// REAL-TIME LIVE MOBILITY & WEATHER GRID FEED (City-Aware)
router.get('/live-feed', async (req, res) => {
  try {
    const cityParam = (req.query.city || '').trim();
    const defaultCities = ['Delhi', 'Mumbai', 'Bengaluru', 'Jalandhar'];
    const weatherTargets = cityParam && !defaultCities.some((d) => cityParam.toLowerCase().includes(d.toLowerCase()))
      ? [cityParam, 'Delhi', 'Mumbai', 'Bengaluru']
      : defaultCities;

    const weatherGrid = await Promise.all(
      weatherTargets.map((c) => fetchRealTimeWeather(c))
    );

    let activeIncidents = 0;
    let cityActiveIncidents = 0;
    let totalSegments = 10;
    let totalTrafficRecords = 9240;

    if (global.isMongoConnected) {
      try {
        const queries = [
          Incident.countDocuments({ status: 'ACTIVE' }),
          RoadSegment.countDocuments(),
          TrafficRecord.countDocuments()
        ];
        if (cityParam && cityParam.toLowerCase() !== 'all') {
          queries.push(
            Incident.countDocuments({
              status: 'ACTIVE',
              city: new RegExp(cityParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
            })
          );
        }
        const results = await Promise.all(queries);
        [activeIncidents, totalSegments, totalTrafficRecords] = results;
        cityActiveIncidents = results[3] !== undefined ? results[3] : activeIncidents;
      } catch (e) {}
    } else {
      const MemoryStore = require("../utils/memoryStore");
      const allActive = MemoryStore.getIncidents();
      activeIncidents = allActive.length;
      cityActiveIncidents = cityParam ? MemoryStore.getIncidents(cityParam).length : activeIncidents;
      totalSegments = MemoryStore.getAllRoads().length;
    }

    return res.json({
      success: true,
      data: {
        city: cityParam || 'All India',
        activeIncidents,
        cityActiveIncidents,
        totalSegments,
        totalTrafficRecords,
        liveWeatherGrid: weatherGrid,
        serverTimestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Live feed unavailable.' });
  }
});

module.exports = router;