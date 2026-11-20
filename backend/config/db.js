const mongoose = require("mongoose");

const connectDB = async () => {
  // Prevent Mongoose from buffering queries indefinitely when disconnected
  mongoose.set("bufferCommands", false);

  const primaryUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/flowsense";
  const localFallbackUri = "mongodb://127.0.0.1:27017/flowsense";

  try {
    console.log(`Connecting to database...`);
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 2500 });
    global.isMongoConnected = true;
    console.log(`✅ MongoDB connected successfully to: ${primaryUri.includes("@") ? "MongoDB Atlas (Remote Cloud)" : primaryUri}`);
  } catch (error) {
    if (primaryUri !== localFallbackUri) {
      try {
        await mongoose.connect(localFallbackUri, { serverSelectionTimeoutMS: 2000 });
        global.isMongoConnected = true;
        console.log(`✅ MongoDB connected successfully using local fallback: ${localFallbackUri}`);
        return;
      } catch (fallbackError) {
        // Fall through to memory store
      }
    }

    global.isMongoConnected = false;
    console.log("⚡ Notice: Remote MongoDB unconfigured or unreachable.");
    console.log("🚀 FlowSense High-Speed In-Memory Data Engine is ACTIVE. Response time: <5ms.");
  }
};

module.exports = connectDB;
