const mongoose = require("mongoose");

const trafficRecordSchema = new mongoose.Schema(
  {
    roadId: {
      type: String,
      required: true
    },

    roadName: {
      type: String,
      required: true
    },

    timestamp: {
      type: Date,
      default: Date.now
    },

    dayOfWeek: {
      type: String,
      required: true
    },

    hour: {
      type: Number,
      required: true,
      min: 0,
      max: 23
    },

    vehicleCount: {
      type: Number,
      required: true,
      min: 0
    },

    averageSpeed: {
      type: Number,
      required: true,
      min: 0
    },

    congestionLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true
    }
  },

  {
    timestamps: true
  }
);

const TrafficRecord = mongoose.model(
  "TrafficRecord",
  trafficRecordSchema
);

module.exports = TrafficRecord;