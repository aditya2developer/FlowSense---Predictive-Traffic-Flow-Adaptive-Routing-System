const mongoose = require("mongoose");

const advisorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO"
    },
    affectedRoad: {
      type: String,
      default: "All City Sectors"
    },
    issuedBy: {
      type: String,
      default: "Traffic Enforcement Control"
    },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED"],
      default: "ACTIVE"
    },
    expiresAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const Advisory = mongoose.model("Advisory", advisorySchema);

module.exports = Advisory;
