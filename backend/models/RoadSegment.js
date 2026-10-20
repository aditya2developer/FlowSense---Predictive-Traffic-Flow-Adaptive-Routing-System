const mongoose = require("mongoose");

const roadSegmentSchema = new mongoose.Schema(
  {
    roadId: {
      type: String,
      required: true,
      unique: true
    },

    roadName: {
      type: String,
      required: true
    },

    coordinates: [
      {
        latitude: {
          type: Number,
          required: true
        },

        longitude: {
          type: Number,
          required: true
        }
      }
    ],

    roadType: {
      type: String,
      enum: [
        "HIGHWAY",
        "MAIN_ROAD",
        "LOCAL_ROAD"
      ],
      default: "MAIN_ROAD"
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const RoadSegment = mongoose.model(
  "RoadSegment",
  roadSegmentSchema
);

module.exports = RoadSegment;