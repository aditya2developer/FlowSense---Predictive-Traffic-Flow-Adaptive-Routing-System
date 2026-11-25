const mongoose = require("mongoose");

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    resendApiKey: { type: String, default: "" },
    brevoApiKey: { type: String, default: "" },
    emailWebhookUrl: { type: String, default: "" },
    emailWebhookSecret: { type: String, default: "" },
    emailFrom: { type: String, default: "" },
    smtpHost: { type: String, default: "" },
    smtpPort: { type: Number, default: 465 },
    smtpUser: { type: String, default: "" },
    smtpPass: { type: String, default: "" },
    updatedBy: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemConfig", systemConfigSchema);
