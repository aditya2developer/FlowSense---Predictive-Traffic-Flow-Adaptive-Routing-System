const express = require("express");
const mongoose = require("mongoose");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// Internal security collections that must NEVER be browsed
const ALWAYS_HIDDEN_COLLECTIONS = new Set(["otprecords"]);
// Confidential PII collections restricted strictly to Global Admin
const ADMIN_ONLY_COLLECTIONS = new Set(["users", "contactmessages"]);

// Mask all confidential / PII fields before returning any document
function sanitizeDocument(doc, collectionName, isAdmin = false) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };

  // Never expose password hashes, OTP codes, or pending private payloads
  if (obj.password !== undefined) obj.password = "•••••••• [PROTECTED]";
  if (obj.otp !== undefined) delete obj.otp;
  if (obj.idProofImage) obj.idProofImage = "[VERIFICATION_DOCUMENT_PROTECTED]";
  if (obj.avatar && obj.avatar.length > 120) obj.avatar = "[AVATAR_IMAGE_STORED]";

  if (!isAdmin) {
    // Strip all personally identifiable fields for non-admin public viewers
    delete obj.reporterEmail;
    delete obj.contactPhone;
    delete obj.phone;
    delete obj.email;
    delete obj.emergencyContact;
    delete obj.pendingProfileUpdates;
    delete obj.badgeNumber;
    delete obj.verificationNotes;
    if (collectionName === "incidents" && obj.reportedBy) {
      obj.reportedBy = "Verified Citizen";
    }
  }

  return obj;
}

// Inferred field types from sanitized document samples
function inferSchema(docs) {
  if (!docs || docs.length === 0) return [];
  const fieldsMap = {};
  docs.forEach((doc) => {
    Object.keys(doc).forEach((key) => {
      if (!fieldsMap[key]) {
        const val = doc[key];
        let type = typeof val;
        if (val === null) type = "null";
        else if (Array.isArray(val)) type = `Array[${val.length > 0 ? typeof val[0] : "any"}]`;
        else if (val instanceof Date || (typeof val === "string" && !isNaN(Date.parse(val)) && val.includes("T"))) type = "Date";
        else if (val && val._bsontype === "ObjectID") type = "ObjectId";
        else if (val && typeof val === "object") type = "Object";
        fieldsMap[key] = type;
      }
    });
  });
  return Object.entries(fieldsMap).map(([field, type]) => ({ field, type }));
}

async function getDb() {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db;
  }
  return null;
}

function isCollectionRestricted(name, isAdmin) {
  const clean = String(name || "").toLowerCase().trim();
  if (ALWAYS_HIDDEN_COLLECTIONS.has(clean)) return true;
  if (!isAdmin && ADMIN_ONLY_COLLECTIONS.has(clean)) return true;
  return false;
}

/**
 * GET /api/database/diagnostic
 * Strictly restricted to Root Administrator
 */
router.get("/diagnostic", authenticate, requireRole("ADMIN"), (req, res) => {
  return res.json({
    success: true,
    readyState: mongoose.connection.readyState,
    readyStateName: mongoose.STATES[mongoose.connection.readyState],
    hasDb: !!mongoose.connection.db,
    dbName: mongoose.connection.db?.databaseName || null,
    isMongoConnected: global.isMongoConnected || false,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/database/overview
 * Real-time metadata for public traffic collections (and full collections for Admin)
 */
router.get("/overview", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const isAdmin = req.user?.role === "ADMIN";
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Live database cluster is currently in standby mode."
      });
    }

    const t0 = Date.now();
    await db.command({ ping: 1 });
    const pingMs = Date.now() - t0;

    let dbStats = { storageSize: 0, objects: 0, indexes: 0 };
    try {
      dbStats = await db.stats();
    } catch {
      // Restricted on some tiers
    }

    const rawCollections = await db.listCollections().toArray();
    const collectionOrder = ["roadsegments", "trafficrecords", "incidents", "weathers", "advisories", "users", "contactmessages"];
    rawCollections.sort((a, b) => {
      const idxA = collectionOrder.indexOf(a.name);
      const idxB = collectionOrder.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    const collectionsInfo = [];
    let totalDocs = 0;

    for (const c of rawCollections) {
      if (c.name.startsWith("system.") || isCollectionRestricted(c.name, isAdmin)) continue;

      const colInstance = db.collection(c.name);
      const count = await colInstance.countDocuments();
      totalDocs += count;

      let colIndexes = [];
      try {
        colIndexes = await colInstance.indexes();
      } catch {
        colIndexes = [{ name: "_id_" }];
      }

      const rawSample = await colInstance.findOne({});
      const safeSample = rawSample ? sanitizeDocument(rawSample, c.name, isAdmin) : null;
      const schema = safeSample ? inferSchema([safeSample]) : [];

      collectionsInfo.push({
        name: c.name,
        type: c.type || "collection",
        count,
        indexCount: colIndexes.length,
        indexes: colIndexes.map((idx) => idx.name),
        schemaSummary: schema.map((s) => s.field).slice(0, 8),
        sampleId: safeSample ? safeSample._id : null
      });
    }

    return res.json({
      success: true,
      cluster: {
        host: isAdmin ? mongoose.connection.host || "Atlas Cloud" : "Encrypted Smart City Cloud",
        dbName: mongoose.connection.name || "flowsense",
        connectionState: mongoose.STATES[mongoose.connection.readyState],
        pingLatencyMs: pingMs,
        provider: "Cloud Document Store",
        region: "Asia South (India)"
      },
      stats: {
        totalCollections: collectionsInfo.length,
        totalDocuments: totalDocs,
        totalIndexes: dbStats.indexes || collectionsInfo.reduce((acc, c) => acc + c.indexCount, 0),
        storageSizeKB: dbStats.storageSize ? Math.round(dbStats.storageSize / 1024) : 0,
        dataSizeKB: dbStats.dataSize ? Math.round(dbStats.dataSize / 1024) : 0
      },
      collections: collectionsInfo,
      isAdminView: isAdmin,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database overview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load database overview."
    });
  }
});

/**
 * GET /api/database/collection/:collectionName
 * Confidential collections protected; PII stripped for non-admin users.
 */
router.get("/collection/:collectionName", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const isAdmin = req.user?.role === "ADMIN";
    const { collectionName } = req.params;

    if (isCollectionRestricted(collectionName, isAdmin)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Confidential collection requires Administrator clearance."
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy || "_id";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: "Database unavailable" });
    }

    const colInstance = db.collection(collectionName);
    const totalCount = await colInstance.countDocuments();

    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter = {
        $or: [
          { roadId: searchRegex },
          { roadName: searchRegex },
          { city: searchRegex },
          { roadType: searchRegex },
          { name: searchRegex },
          { role: searchRegex },
          { status: searchRegex },
          { type: searchRegex },
          { title: searchRegex },
          { description: searchRegex },
          { location: searchRegex },
          { severity: searchRegex }
        ]
      };
    }

    const filteredCount = search ? await colInstance.countDocuments(filter) : totalCount;

    const rawDocs = await colInstance
      .find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const sanitizedDocs = rawDocs.map((doc) => sanitizeDocument(doc, collectionName, isAdmin));
    const schema = inferSchema(sanitizedDocs);

    return res.json({
      success: true,
      collectionName,
      pagination: {
        page,
        limit,
        totalDocuments: totalCount,
        filteredCount,
        totalPages: Math.ceil(filteredCount / limit) || 1
      },
      schema,
      documents: sanitizedDocs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Collection query error:`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to query collection."
    });
  }
});

/**
 * GET /api/database/document/:collectionName/:id
 */
router.get("/document/:collectionName/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const isAdmin = req.user?.role === "ADMIN";
    const { collectionName, id } = req.params;

    if (isCollectionRestricted(collectionName, isAdmin)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Confidential collection requires Administrator clearance."
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: "Database unavailable" });
    }
    const colInstance = db.collection(collectionName);

    let doc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await colInstance.findOne({ _id: new mongoose.Types.ObjectId(id) });
    }
    if (!doc) {
      doc = await colInstance.findOne({
        $or: [{ roadId: id }, { incidentId: id }, { id }]
      });
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({
      success: true,
      collectionName,
      document: sanitizeDocument(doc, collectionName, isAdmin)
    });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to inspect document." });
  }
});

/**
 * GET /api/database/export/:collectionName
 */
router.get("/export/:collectionName", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const isAdmin = req.user?.role === "ADMIN";
    const { collectionName } = req.params;

    if (isCollectionRestricted(collectionName, isAdmin)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Confidential collection cannot be exported publicly."
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: "Database unavailable" });
    }
    const colInstance = db.collection(collectionName);

    const docs = await colInstance.find({}).limit(5000).toArray();
    const sanitized = docs.map((d) => sanitizeDocument(d, collectionName, isAdmin));

    res.setHeader("Content-Disposition", `attachment; filename=flowsense_${collectionName}_export.json`);
    res.setHeader("Content-Type", "application/json");
    return res.send(JSON.stringify(sanitized, null, 2));
  } catch {
    return res.status(500).json({ success: false, message: "Export failed." });
  }
});

module.exports = router;
