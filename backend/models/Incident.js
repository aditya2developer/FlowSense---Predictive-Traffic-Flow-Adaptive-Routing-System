const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    roadId: { type: String, required: true },
    roadName: { type: String, required: true },
    city: { type: String, default: "General" },
    type: {
      type: String,
      enum: [
        "ACCIDENT",
        "CONSTRUCTION",
        "FLOOD",
        "BREAKDOWN",
        "POTHOLE",
        "TRAFFIC_JAM",
        "ROADBLOCK",
        "FIRE_HAZARD",
        "STALLED_VEHICLE",
        "DEBRIS",
        "OTHER"
      ],
      default: "ACCIDENT"
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM"
    },
    description: { type: String, default: "" },
    landmark: { type: String, default: "" },
    recommendation: { type: String, default: "" },
    reportedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["ACTIVE", "RESOLVED", "VERIFIED"],
      default: "ACTIVE"
    },
    reportedBy: { type: String, default: "Citizen Commuter" },
    reporterEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    location: { type: String, default: "" },
    images: {
      type: [String],
      default: []
    },
    upvotes: {
      type: Number,
      default: 1
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Incident", incidentSchema);
