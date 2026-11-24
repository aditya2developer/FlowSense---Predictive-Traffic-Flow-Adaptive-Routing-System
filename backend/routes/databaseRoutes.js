const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

// Mask sensitive fields in user documents for public/showcase display
function sanitizeDocument(doc, collectionName) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  if (collectionName === "users" && obj.password) {
    obj.password = "•••••••• [BCRYPT_HASH_PROTECTED]";
  }
  return obj;
}

// Inferred field types from document samples
function inferSchema(docs) {
  if (!docs || docs.length === 0) return [];
  const fieldsMap = {};
  docs.forEach((doc) => {
    Object.keys(doc).forEach((key) => {
      if (!fieldsMap[key]) {
        let val = doc[key];
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

// Resilient DB accessor with auto-reconnect
async function getDb() {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db;
  }
  if (mongoose.connection.readyState !== 1) {
    try {
      const connectDB = require("../config/db");
      await connectDB();
    } catch (e) {
      console.warn("Auto-connect DB attempt failed:", e.message);
    }
  }
  if (mongoose.connection.db) {
    return mongoose.connection.db;
  }
  if (mongoose.connection.getClient) {
    try {
      const client = mongoose.connection.getClient();
      if (client) return client.db();
    } catch (e) {}
  }
  return null;
}

/**
 * GET /api/database/diagnostic
 * Health & connection diagnostic for debugging Atlas connectivity.
 */
router.get("/diagnostic", (req, res) => {
  return res.json({
    success: true,
    readyState: mongoose.connection.readyState,
    readyStateName: mongoose.STATES[mongoose.connection.readyState],
    hasDb: !!mongoose.connection.db,
    dbName: mongoose.connection.db?.databaseName || null,
    isMongoConnected: global.isMongoConnected || false,
    lastConnectionError: global.mongoConnectionError || null,
    envUriConfigured: !!process.env.MONGO_URI,
    activeHost: mongoose.connection.host || null,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/database/overview
 * Real-time metadata for all collections, document counts, and Atlas cluster stats.
 */
router.get("/overview", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database connection not initialized: " + (global.mongoConnectionError || "Disconnected")
      });
    }

    const t0 = Date.now();
    await db.command({ ping: 1 });
    const pingMs = Date.now() - t0;

    let dbStats = { storageSize: 0, objects: 0, indexes: 0 };
    try {
      dbStats = await db.stats();
    } catch (e) {
      // Free/shared tier may restrict dbStats command in some environments
    }

    const rawCollections = await db.listCollections().toArray();
    // Sort collections alphabetically or logically
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
      if (c.name.startsWith("system.")) continue;

      const colInstance = db.collection(c.name);
      const count = await colInstance.countDocuments();
      totalDocs += count;

      let colIndexes = [];
      try {
        colIndexes = await colInstance.indexes();
      } catch (err) {
        colIndexes = [{ name: "_id_" }];
      }

      // Sample a document to get schema
      const sample = await colInstance.findOne({});
      const schema = sample ? inferSchema([sample]) : [];

      collectionsInfo.push({
        name: c.name,
        type: c.type || "collection",
        count,
        indexCount: colIndexes.length,
        indexes: colIndexes.map((idx) => idx.name),
        schemaSummary: schema.map((s) => s.field).slice(0, 8),
        sampleId: sample ? sample._id : null
      });
    }

    const host = mongoose.connection.host || "cluster0.pbc06oq.mongodb.net";
    const dbName = mongoose.connection.name || "flowsense";

    return res.json({
      success: true,
      cluster: {
        host,
        dbName,
        connectionState: mongoose.STATES[mongoose.connection.readyState],
        pingLatencyMs: pingMs,
        provider: "MongoDB Atlas Cloud",
        region: "AWS Mumbai (ap-south-1)",
        tier: "Atlas M0 Shared Cluster",
        driverVersion: mongoose.version
      },
      stats: {
        totalCollections: collectionsInfo.length,
        totalDocuments: totalDocs,
        totalIndexes: dbStats.indexes || collectionsInfo.reduce((acc, c) => acc + c.indexCount, 0),
        storageSizeKB: dbStats.storageSize ? Math.round(dbStats.storageSize / 1024) : 0,
        dataSizeKB: dbStats.dataSize ? Math.round(dbStats.dataSize / 1024) : 0
      },
      collections: collectionsInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database overview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch database overview: " + error.message
    });
  }
});

/**
 * GET /api/database/collection/:collectionName
 * Paginated documents list with search, sort, and schema breakdown.
 */
router.get("/collection/:collectionName", async (req, res) => {
  try {
    const { collectionName } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy || "_id";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: "Database not connected" });
    }

    const colInstance = db.collection(collectionName);
    const totalCount = await colInstance.countDocuments();

    // Build filter query
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
          { email: searchRegex },
          { role: searchRegex },
          { status: searchRegex },
          { type: searchRegex },
          { title: searchRegex },
          { description: searchRegex },
          { location: searchRegex },
          { severity: searchRegex },
          { subject: searchRegex }
        ]
      };
    }

    const filteredCount = search ? await colInstance.countDocuments(filter) : totalCount;

    // Fetch documents
    const rawDocs = await colInstance
      .find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const sanitizedDocs = rawDocs.map((doc) => sanitizeDocument(doc, collectionName));
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
    console.error(`Collection ${req.params.collectionName} error:`, error);
    return res.status(500).json({
      success: false,
      message: `Failed to query collection ${req.params.collectionName}: ${error.message}`
    });
  }
});

/**
 * GET /api/database/document/:collectionName/:id
 * Fetch a single document by ObjectId or field ID
 */
router.get("/document/:collectionName/:id", async (req, res) => {
  try {
    const { collectionName, id } = req.params;
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: "Database not connected" });
    }
    const colInstance = db.collection(collectionName);

    let doc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await colInstance.findOne({ _id: new mongoose.Types.ObjectId(id) });
    }
    if (!doc) {
      doc = await colInstance.findOne({
        $or: [{ roadId: id }, { email: id }, { incidentId: id }, { id: id }]
      });
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({
      success: true,
      collectionName,
      document: sanitizeDocument(doc, collectionName)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/database/export/:collectionName
 * Full collection export formatted for JSON download
 */
router.get("/export/:collectionName", async (req, res) => {
  try {
    const { collectionName } = req.params;
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, message: "Database not connected" });
    }
    const colInstance = db.collection(collectionName);

    const docs = await colInstance.find({}).limit(5000).toArray();
    const sanitized = docs.map((d) => sanitizeDocument(d, collectionName));

    res.setHeader("Content-Disposition", `attachment; filename=flowsense_${collectionName}_export.json`);
    res.setHeader("Content-Type", "application/json");
    return res.send(JSON.stringify(sanitized, null, 2));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
