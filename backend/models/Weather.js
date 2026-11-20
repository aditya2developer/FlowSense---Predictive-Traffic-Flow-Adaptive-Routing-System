const mongoose = require('mongoose');

const weatherSchema = new mongoose.Schema(
  {
    location: { type: String, required: true },
    city: { type: String },
    timestamp: { type: Date, default: Date.now },
    temperature: { type: Number },
    humidity: { type: Number },
    rainfall: { type: Number, default: 0 },
    windSpeed: { type: Number, default: 0 },
    condition: {
      type: String,
      enum: ['Clear', 'Cloudy', 'Rain', 'Heavy Rain', 'Fog', 'Thunderstorm', 'Drizzle', 'Haze'],
    },
    visibility: { type: Number, default: 10 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Weather', weatherSchema);
