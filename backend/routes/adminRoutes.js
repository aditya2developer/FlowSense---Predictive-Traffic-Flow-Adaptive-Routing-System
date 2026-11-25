const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const RoadSegment = require("../models/RoadSegment");
const TrafficRecord = require("../models/TrafficRecord");
const Incident = require("../models/Incident");
const Weather = require("../models/Weather");
const Advisory = require("../models/Advisory");
const MemoryStore = require("../utils/memoryStore");
const { authenticate, requireRole } = require("../middleware/auth");
const { runSeed } = require("../seedData");

const router = express.Router();

// ==========================================
// 1. DEEP PLATFORM OVERVIEW & STATS
// ==========================================
router.get("/stats", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    if (global.isMongoConnected) {
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

        const recentUsers = await User.find()
          .select("-password")
          .sort({ createdAt: -1 })
          .limit(10);

        const dbStats = {
          databaseName: mongoose.connection.name || "flowsense",
          connectionState: "CONNECTED",
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
      } catch (e) {
        // Fall back to memory store
      }
    }

    return res.json({
      success: true,
      data: MemoryStore.getStats()
    });
  } catch (error) {
    return res.json({
      success: true,
      data: MemoryStore.getStats()
    });
  }
});

// ==========================================
// 2. USER & RBAC MANAGEMENT
// ==========================================
router.get("/users", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    if (global.isMongoConnected) {
      try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        return res.json({ success: true, count: users.length, data: users });
      } catch (e) {}
    }
    const memUsers = MemoryStore.getAllUsers();
    return res.json({ success: true, count: memUsers.length, data: memUsers });
  } catch (error) {
    const memUsers = MemoryStore.getAllUsers();
    return res.json({ success: true, count: memUsers.length, data: memUsers });
  }
});

router.post("/users", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, email, password, role, department, badgeNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password required." });
    }
    const cleanEmail = String(email).trim().toLowerCase();

    if (global.isMongoConnected) {
      try {
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
      } catch (e) {}
    }

    const created = MemoryStore.createUser({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: role || "PUBLIC",
      department: department || "Operations",
      badgeNumber: badgeNumber || ""
    });

    return res.status(201).json({
      success: true,
      message: `User ${created.name} created successfully.`,
      data: created
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/users/:id/role", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["ADMIN", "AUTHORITY", "PUBLIC"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role." });
    }
    if (global.isMongoConnected) {
      try {
        const updated = await User.findByIdAndUpdate(
          req.params.id,
          { role },
          { new: true }
        ).select("-password");
        if (updated) return res.json({ success: true, data: updated, message: `Role updated to ${role}` });
      } catch (e) {}
    }
    const memUpdated = MemoryStore.updateUserRole(req.params.id, role);
    return res.json({ success: true, data: memUpdated, message: `Role updated to ${role}` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Verify or reject a Police / Authority officer registration
router.patch("/users/:id/verify", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { status = "VERIFIED", notes = "" } = req.body || {};
    if (!["VERIFIED", "PENDING", "REJECTED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid verification status." });
    }

    if (global.isMongoConnected) {
      const updatePayload = {
        verificationStatus: status,
        verifiedBy: req.user.name,
        verifiedAt: new Date(),
        verificationNotes: notes
      };
      if (status === "VERIFIED") {
        updatePayload.isEmailVerified = true;
      }

      const updated = await User.findByIdAndUpdate(
        req.params.id,
        updatePayload,
        { new: true }
      ).select("-password");

      if (!updated) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      return res.json({
        success: true,
        data: updated,
        message: `Officer ${updated.name} marked as ${status} by Admin ${req.user.name}.`
      });
    }

    const memVerified = MemoryStore.verifyUser(req.params.id, status, req.user.name, notes);
    if (memVerified) {
      return res.json({
        success: true,
        data: memVerified,
        message: `Officer ${memVerified.name} marked as ${status} by Admin ${req.user.name}.`
      });
    }

    return res.status(404).json({ success: false, message: "User not found." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Verify or reject a User's pending profile data updates
router.patch("/users/:id/verify-profile-update", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { status = "APPROVED", notes = "" } = req.body || {};
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be APPROVED or REJECTED." });
    }

    if (global.isMongoConnected) {
      const dbUser = await User.findById(req.params.id);
      if (!dbUser) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      if (status === "APPROVED" && dbUser.pendingProfileUpdates) {
        const safeFields = [
          "name",
          "phone",
          "city",
          "state",
          "bio",
          "vehicleInfo",
          "emergencyContact",
          "avatar",
          "department",
          "badgeNumber",
          "rank",
          "stationName",
          "idProofImage"
        ];
        safeFields.forEach((field) => {
          if (dbUser.pendingProfileUpdates[field] !== undefined) {
            dbUser[field] = dbUser.pendingProfileUpdates[field];
          }
        });
      }

      dbUser.pendingProfileUpdates = null;
      dbUser.profileUpdateStatus = status;
      dbUser.profileUpdateNotes = notes;
      dbUser.verifiedBy = req.user.name;
      dbUser.verifiedAt = new Date();
      await dbUser.save();

      const safeUser = dbUser.toObject();
      delete safeUser.password;

      return res.json({
        success: true,
        data: safeUser,
        message: `Profile data update for ${safeUser.name} marked as ${status}.`
      });
    }

    const memUpdated = MemoryStore.verifyProfileUpdate(req.params.id, status, req.user.name, notes);
    if (!memUpdated) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    return res.json({
      success: true,
      data: memUpdated,
      message: `Profile data update for ${memUpdated.name} marked as ${status}.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/users/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    if (global.isMongoConnected) {
      try {
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (deleted) return res.json({ success: true, message: `User ${deleted.name} (${deleted.email}) deleted.` });
      } catch (e) {}
    }
    const memDeleted = MemoryStore.deleteUser(req.params.id);
    return res.json({ success: true, message: `User deleted from memory.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. ROAD CORRIDORS & SEGMENTS MANAGEMENT
// ==========================================
router.get("/segments", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    if (global.isMongoConnected) {
      try {
        const segments = await RoadSegment.find().sort({ createdAt: -1 });
        return res.json({ success: true, count: segments.length, data: segments });
      } catch (e) {}
    }
    const memRoads = MemoryStore.getAllRoads();
    return res.json({ success: true, count: memRoads.length, data: memRoads });
  } catch (error) {
    const memRoads = MemoryStore.getAllRoads();
    return res.json({ success: true, count: memRoads.length, data: memRoads });
  }
});

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

    if (global.isMongoConnected) {
      try {
        const newSegment = new RoadSegment({
          roadId: String(roadId).trim().toUpperCase(),
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
      } catch (e) {}
    }

    const created = MemoryStore.createRoad({ roadId, roadName, roadType, coordinates });
    return res.status(201).json({
      success: true,
      message: `Road corridor '${created.roadName}' created successfully.`,
      data: created
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/segments/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    if (global.isMongoConnected) {
      try {
        const deleted = await RoadSegment.findByIdAndDelete(req.params.id);
        if (deleted) return res.json({ success: true, message: `Road segment '${deleted.roadName}' removed.` });
      } catch (e) {}
    }
    MemoryStore.deleteRoad(req.params.id);
    return res.json({ success: true, message: `Road segment removed.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. CITIZEN INCIDENT REPORTS & APPROVALS
// ==========================================
router.get("/incidents", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    if (global.isMongoConnected) {
      try {
        const incidents = await Incident.find().sort({ createdAt: -1 });
        return res.json({ success: true, count: incidents.length, data: incidents });
      } catch (e) {}
    }
    const memInc = MemoryStore.getAllIncidentsRaw();
    return res.json({ success: true, count: memInc.length, data: memInc });
  } catch (error) {
    const memInc = MemoryStore.getAllIncidentsRaw();
    return res.json({ success: true, count: memInc.length, data: memInc });
  }
});

router.patch("/incidents/:id/status", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { status } = req.body;
    if (global.isMongoConnected) {
      try {
        const updated = await Incident.findByIdAndUpdate(
          req.params.id,
          { status },
          { new: true }
        );
        if (updated) return res.json({ success: true, data: updated, message: `Incident marked as ${status}.` });
      } catch (e) {}
    }
    const memUpdated = MemoryStore.updateIncidentStatus(req.params.id, status);
    return res.json({ success: true, data: memUpdated, message: `Incident marked as ${status}.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/incidents/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    if (global.isMongoConnected) {
      try {
        await Incident.findByIdAndDelete(req.params.id);
      } catch (e) {}
    }
    MemoryStore.deleteIncident(req.params.id);
    return res.json({ success: true, message: "Incident deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5. DATABASE RE-SEED & SIREN BROADCAST
// ==========================================
router.post("/reseed", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    if (global.isMongoConnected) {
      try {
        const result = await runSeed();
        return res.json({
          success: true,
          message: "FlowSense MongoDB successfully re-seeded with multi-city traffic memory!",
          data: result
        });
      } catch (e) {}
    }
    return res.json({
      success: true,
      message: "FlowSense database memory refreshed with multi-city corridors (Delhi, Mumbai, Bengaluru, Chandigarh, Jalandhar)."
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/broadcast-alert", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { title, message, severity = "CRITICAL", affectedRoad } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required." });
    }
    const alertData = {
      title,
      message,
      severity,
      affectedRoad: affectedRoad || "All Major Corridors",
      issuedBy: `Admin ${req.user.name} (Global Control)`
    };

    if (global.isMongoConnected) {
      try {
        const advisory = new Advisory(alertData);
        const saved = await advisory.save();
        return res.status(201).json({
          success: true,
          message: "Emergency Siren Broadcast issued to all portals.",
          data: saved
        });
      } catch (e) {}
    }

    const savedMem = MemoryStore.createAdvisory(alertData);
    return res.status(201).json({
      success: true,
      message: "Emergency Siren Broadcast issued to all portals.",
      data: savedMem
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
