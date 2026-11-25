const mongoose = require("mongoose");

const otpRecordSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    otp: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      enum: ["REGISTER", "PASSWORD_CHANGE", "PASSWORD_RESET", "LOGIN_VERIFY"],
      default: "REGISTER"
    },
    verified: {
      type: Boolean,
      default: false
    },
    attempts: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // MongoDB TTL auto-cleanup when expiresAt passes
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("OtpRecord", otpRecordSchema);
