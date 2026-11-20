const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      default: ""
    },
    state: {
      type: String,
      default: "National / Pan-India"
    },
    city: {
      type: String,
      default: "General"
    },
    category: {
      type: String,
      enum: [
        "EMERGENCY_TRAFFIC_ALERT",
        "POTHOLE_ROAD_GRIEVANCE",
        "SIGNAL_MALFUNCTION",
        "GOVERNMENT_PARTNERSHIP",
        "HIGHWAY_PATROL_FEEDBACK",
        "API_SMART_CITY_INTEGRATION",
        "TECHNICAL_SUPPORT",
        "GENERAL_INQUIRY"
      ],
      default: "GENERAL_INQUIRY"
    },
    subject: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN"
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM"
    },
    assignedOfficer: {
      type: String,
      default: "City Traffic Operations Desk"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
