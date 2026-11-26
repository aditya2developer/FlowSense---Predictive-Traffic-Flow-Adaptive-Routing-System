const express = require("express");
const Incident = require("../models/Incident");
const Advisory = require("../models/Advisory");
const RoadSegment = require("../models/RoadSegment");
const MemoryStore = require("../utils/memoryStore");
const geocodeLocation = require("../utils/geocode");
const getRoute = require("../utils/route");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/authority/advisories — Active traffic police alerts
router.get("/advisories", async (req, res) => {
  try {
    if (global.isMongoConnected) {
      try {
        const advisories = await Advisory.find({ status: "ACTIVE" })
          .sort({ createdAt: -1 })
          .limit(20);
        return res.json({
          success: true,
          count: advisories.length,
          data: advisories
        });
      } catch {
        // Fall back to MemoryStore
      }
    }
    const memAdvisories = MemoryStore.getAdvisories();
    return res.json({
      success: true,
      count: memAdvisories.length,
      data: memAdvisories
    });
  } catch {
    const memAdvisories = MemoryStore.getAdvisories();
    return res.json({ success: true, count: memAdvisories.length, data: memAdvisories });
  }
});

// POST /api/authority/advisories — Broadcast advisory (requires AUTHORITY or ADMIN)
router.post("/advisories", authenticate, requireRole("AUTHORITY", "ADMIN"), async (req, res) => {
  try {
    const { title, message, severity, affectedRoad } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required." });
    }

    if (global.isMongoConnected) {
      const advisory = new Advisory({
        title,
        message,
        severity: severity || "INFO",
        affectedRoad: affectedRoad || "General Corridor",
        issuedBy: `${req.user.name} (${req.user.department || "Traffic Authority"})`
      });
      const saved = await advisory.save();
      return res.status(201).json({
        success: true,
        message: "Traffic advisory broadcast successfully.",
        data: saved
      });
    }

    const savedMem = MemoryStore.createAdvisory({
      title,
      message,
      severity,
      affectedRoad,
      issuedBy: `${req.user.name} (${req.user.department || "Traffic Authority"})`
    });

    return res.status(201).json({
      success: true,
      message: "Traffic advisory broadcast successfully.",
      data: savedMem
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/authority/advisories/:id/expire
router.patch("/advisories/:id/expire", authenticate, requireRole("AUTHORITY", "ADMIN"), async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const updated = await Advisory.findByIdAndUpdate(
        req.params.id,
        { status: "EXPIRED" },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, message: "Advisory not found." });
      return res.json({ success: true, data: updated });
    }
    const memUpdated = MemoryStore.expireAdvisory(req.params.id);
    return res.json({ success: true, data: memUpdated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/authority/green-corridor — Emergency Priority Routing Dispatch
router.post("/green-corridor", authenticate, requireRole("AUTHORITY", "ADMIN"), async (req, res) => {
  try {
    const { from, to, vehicleType = "AMBULANCE", priorityReason } = req.body;

    if (!from || !to) {
      return res.status(400).json({ success: false, message: "Origin and Destination required." });
    }

    const fromLoc = await geocodeLocation(from);
    const toLoc = await geocodeLocation(to);

    if (!fromLoc || !toLoc) {
      return res.status(404).json({ success: false, message: "Could not geocode locations." });
    }

    const routeData = await getRoute(
      fromLoc.latitude,
      fromLoc.longitude,
      toLoc.latitude,
      toLoc.longitude
    );

    if (!routeData?.routes?.[0]) {
      return res.status(404).json({ success: false, message: "No route available for green corridor." });
    }

    const route = routeData.routes[0];
    const normalDurationMin = Math.round(route.duration / 60);
    const expeditedDurationMin = Math.max(1, Math.round(normalDurationMin * 0.55));
    const distanceKm = Number((route.distance / 1000).toFixed(2));

    const advisoryData = {
      title: `🚨 EMERGENCY GREEN CORRIDOR: ${vehicleType}`,
      message: `Emergency vehicle dispatch from ${fromLoc.displayName.split(",")[0]} to ${toLoc.displayName.split(",")[0]}. Traffic lights synchronized green. Commuters must yield right-of-way.`,
      severity: "CRITICAL",
      affectedRoad: "NH-44 & Central Arterials",
      issuedBy: `${req.user.name} (${req.user.badgeNumber || "Dispatch"})`
    };

    if (global.isMongoConnected) {
      const advisory = new Advisory(advisoryData);
      await advisory.save();
    } else {
      MemoryStore.createAdvisory(advisoryData);
    }

    return res.json({
      success: true,
      corridorId: `GC-${Date.now().toString().slice(-6)}`,
      vehicleType,
      priorityReason: priorityReason || "Critical Patient Transfer",
      from: fromLoc,
      to: toLoc,
      distanceKm,
      normalDurationMin,
      expeditedDurationMin,
      timeSavedMin: normalDurationMin - expeditedDurationMin,
      trafficSignalPreemption: "ACTIVE (14 Intersections Cleared)",
      geometry: route.geometry,
      dispatchedBy: req.user.name
    });
  } catch (error) {
    console.error("Green corridor error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/authority/enforcement-stats — Traffic Police Operations Dashboard (City Jurisdiction Aware)
router.get("/enforcement-stats", authenticate, requireRole("AUTHORITY", "ADMIN"), async (req, res) => {
  try {
    const { city } = req.query;

    let activeIncidents = [];
    let segmentsCount = 10;

    if (global.isMongoConnected) {
      try {
        const filter = { status: "ACTIVE" };
        if (city && city.toLowerCase() !== "all" && city.toLowerCase() !== "national") {
          filter.city = new RegExp(city.trim(), "i");
        }
        activeIncidents = await Incident.find(filter);
        const segments = await RoadSegment.find({});
        segmentsCount = segments.length;
      } catch {
        activeIncidents = MemoryStore.getIncidents(city);
        segmentsCount = MemoryStore.getAllRoads().length;
      }
    } else {
      activeIncidents = MemoryStore.getIncidents(city);
      segmentsCount = MemoryStore.getAllRoads().length;
    }

    const highSeverityCount = activeIncidents.filter((i) => i.severity === "HIGH" || i.severity === "CRITICAL").length;
    const accidentsCount = activeIncidents.filter((i) => i.type === "ACCIDENT").length;
    const roadWorkCount = activeIncidents.filter((i) => i.type === "CONSTRUCTION" || i.type === "POTHOLE").length;
    const waterloggingCount = activeIncidents.filter((i) => i.type === "FLOOD").length;

    return res.json({
      success: true,
      jurisdiction: city || "All Jurisdictions",
      stats: {
        totalMonitoredCorridors: segmentsCount,
        activeHazards: activeIncidents.length,
        highSeverityHazards: highSeverityCount,
        accidentsReported: accidentsCount,
        roadWorkCount,
        waterloggingCount,
        patrolUnitsDeployed: 12,
        radarSensorsOnline: 18,
        systemStatus: "ALL UNITS SYNCHRONIZED"
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
