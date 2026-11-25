const mongoose = require('mongoose');

const weatherSchema = new mongoose.Schema(
  {
    location: { type: String, required: true },
    city: { type: String, index: true },
    state: { type: String, default: 'India' },
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Date, default: Date.now },
    temperature: { type: Number },
    humidity: { type: Number },
    rainfall: { type: Number, default: 0 },
    windSpeed: { type: Number, default: 0 },
    condition: { type: String, default: 'Clear' },
    visibility: { type: Number, default: 10 },
    aqi: {
      usAqi: { type: Number },
      pm25: { type: Number },
      pm10: { type: Number },
      label: { type: String },
      color: { type: String }
    },
    isLiveApi: { type: Boolean, default: true },
    source: { type: String, default: 'Open-Meteo Real-Time Weather & AQI Grid' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Weather', weatherSchema);
