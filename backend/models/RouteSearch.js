const mongoose = require("mongoose");

const routeSearchSchema = new mongoose.Schema(
  {
    fromQuery: { type: String, required: true, trim: true },
    toQuery: { type: String, required: true, trim: true },
    fromName: { type: String, default: "" },
    toName: { type: String, default: "" },
    fromCoords: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    toCoords: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    city: { type: String, default: "India" },
    state: { type: String, default: "India" },
    recommendedRoadId: { type: String, default: null },
    recommendedRoadName: { type: String, default: "" },
    distanceKm: { type: Number, default: 0 },
    currentTimeMin: { type: Number, default: 0 },
    predictedTimeMin: { type: Number, default: 0 },
    stabilityScore: { type: Number, default: null },
    congestion: { type: String, default: "LOW" },
    weatherCondition: { type: String, default: "" },
    weatherTemp: { type: Number, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userRole: { type: String, default: "GUEST" },
    searchedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RouteSearch", routeSearchSchema);
