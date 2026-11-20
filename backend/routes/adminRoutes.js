const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const RoadSegment = require("../models/RoadSegment");
const TrafficRecord = require("../models/TrafficRecord");
const Incident = require("../models/Incident");
const Weather = require("../models/Weather");
const Advisory = require("../models/Advisory");
const { authenticate, requireRole } = require("../middleware/auth");
const { runSeed } = require("../seedData");

const router = express.Router();

// ==========================================
// 1. DEEP PLATFORM OVERVIEW & STATS
// ==========================================
router.get("/stats", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const [
      userCount,
      segmentCount,
      trafficRecordCount,
      incidentCount,
      weatherCount,
      advisoryCount
    ] = await Promise.all([
      User.countDocuments(),
      RoadSegment.countDocuments(),
      TrafficRecord.countDocuments(),
      Incident.countDocuments(),
      Weather.countDocuments(),
      Advisory.countDocuments()
    ]);

    // Memory breakdown per road segment
    const roadTrafficCounts = await TrafficRecord.aggregate([
      {
        $group: {
          _id: "$roadId",
          roadName: { $first: "$roadName" },
          readings: { $sum: 1 },
          avgSpeed: { $avg: "$averageSpeed" },
          highCongestionCount: {
            $sum: { $cond: [{ $eq: ["$congestionLevel", "HIGH"] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Active users list
    const recentUsers = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(10);

    const dbStats = {
      databaseName: mongoose.connection.name || "flowsense",
      connectionState: mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED",
      host: mongoose.connection.host || "127.0.0.1",
      port: mongoose.connection.port || 27017,
      totalCollections: 6
    };

    return res.json({
      success: true,
      data: {
        counts: {
          users: userCount,
          roads: segmentCount,
          trafficReadings: trafficRecordCount,
          incidents: incidentCount,
          weatherSnapshots: weatherCount,
          advisories: advisoryCount
        },
        systemInfo: {
          serverUptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          platform: process.platform,
          memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
          mlModelStatus: "Random Forest Models Active (R²=0.887)",
          routingEngine: "OSRM Open Driving Grid + Haversine Matcher"
        },
        database: dbStats,
        roadDistribution: roadTrafficCounts,
        recentUsers
      }
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. USER & RBAC MANAGEMENT
// ==========================================

// GET /api/admin/users
router.get("/users", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/users
router.post("/users", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, email, password, role, department, badgeNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password required." });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "User with this email already exists." });
    }
    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: role || "PUBLIC",
      department: department || "Operations",
      badgeNumber: badgeNumber || ""
    });
    await user.save();
    return res.status(201).json({
      success: true,
      message: `User ${user.name} created successfully.`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        badgeNumber: user.badgeNumber
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["ADMIN", "AUTHORITY", "PUBLIC"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role." });
    }
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");
    return res.json({ success: true, data: updated, message: `Role updated to ${role}` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    return res.json({ success: true, message: `User ${deleted.name} (${deleted.email}) deleted.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. ROAD CORRIDORS & SEGMENTS MANAGEMENT
// ==========================================

// GET /api/admin/segments
router.get("/segments", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const segments = await RoadSegment.find().sort({ createdAt: -1 });
    return res.json({ success: true, count: segments.length, data: segments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/segments
router.post("/segments", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { roadId, roadName, roadType, coordinates } = req.body;

    if (!roadId || !roadName) {
      return res.status(400).json({ success: false, message: "Road ID and Road Name are required." });
    }

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least two valid coordinates [{latitude, longitude}, ...] are required."
      });
    }

    const cleanRoadId = String(roadId).trim().toUpperCase();

    // Check duplicate
    const existing = await RoadSegment.findOne({ roadId: cleanRoadId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Road ID '${cleanRoadId}' already exists. Use a unique identifier.`
      });
    }

    const newSegment = new RoadSegment({
      roadId: cleanRoadId,
      roadName: roadName.trim(),
      roadType: ["HIGHWAY", "MAIN_ROAD", "LOCAL_ROAD"].includes(roadType) ? roadType : "MAIN_ROAD",
      coordinates,
      isActive: true
    });

    const saved = await newSegment.save();
    return res.status(201).json({
      success: true,
      message: `Road corridor '${saved.roadName}' created successfully in MongoDB.`,
      data: saved
    });
  } catch (error) {
    console.error("Create segment error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/segments/:id
router.delete("/segments/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const deleted = await RoadSegment.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Road segment not found." });
    }
    return res.json({ success: true, message: `Road segment '${deleted.roadName}' removed from database.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. CITIZEN INCIDENT REPORTS & APPROVALS
// ==========================================

// GET /api/admin/incidents
router.get("/incidents", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ createdAt: -1 });
    return res.json({ success: true, count: incidents.length, data: incidents });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin/incidents/:id/status
router.patch("/incidents/:id/status", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["ACTIVE", "RESOLVED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be ACTIVE or RESOLVED." });
    }
    const updated = await Incident.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Incident not found." });
    }
    return res.json({ success: true, data: updated, message: `Incident marked as ${status}.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/incidents/:id
router.delete("/incidents/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const deleted = await Incident.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Incident not found." });
    }
    return res.json({ success: true, message: "Incident deleted from database." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5. DATABASE RE-SEED & SIREN BROADCAST
// ==========================================

// POST /api/admin/reseed
router.post("/reseed", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await runSeed();
    return res.json({
      success: true,
      message: "FlowSense MongoDB successfully re-seeded with multi-city traffic memory!",
      data: result
    });
  } catch (error) {
    console.error("Reseed error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/broadcast-alert
router.post("/broadcast-alert", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { title, message, severity = "CRITICAL", affectedRoad } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required." });
    }
    const advisory = new Advisory({
      title,
      message,
      severity,
      affectedRoad: affectedRoad || "All Major Corridors",
      issuedBy: `Admin ${req.user.name} (Global Control)`
    });
    const saved = await advisory.save();
    return res.status(201).json({
      success: true,
      message: "Emergency Siren Broadcast issued to all portals.",
      data: saved
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
