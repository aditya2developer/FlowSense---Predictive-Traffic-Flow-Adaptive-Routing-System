const mongoose = require("mongoose");

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/flowsense";
  const localFallbackUri = "mongodb://127.0.0.1:27017/flowsense";

  try {
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected successfully to: ${primaryUri.includes("@") ? "MongoDB Atlas (Remote)" : primaryUri}`);
  } catch (error) {
    console.warn(`Primary MongoDB connection failed (${error.message}). Attempting local fallback...`);
    if (primaryUri !== localFallbackUri) {
      try {
        await mongoose.connect(localFallbackUri, { serverSelectionTimeoutMS: 5000 });
        console.log(`MongoDB connected successfully using local fallback: ${localFallbackUri}`);
        return;
      } catch (fallbackError) {
        console.error("Local MongoDB fallback also failed:", fallbackError.message);
      }
    }
    console.error("MongoDB connection could not be established.");
    console.error("Please verify that MongoDB service is running locally or that your IP is whitelisted in Atlas.");
  }
};

module.exports = connectDB;
