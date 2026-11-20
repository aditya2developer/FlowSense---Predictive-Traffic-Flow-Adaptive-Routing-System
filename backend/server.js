const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const routeRoutes = require("./routes/routeRoutes");
const authRoutes = require("./routes/authRoutes");
const authorityRoutes = require("./routes/authorityRoutes");
const adminRoutes = require("./routes/adminRoutes");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later."
  }
});
app.use("/api/", apiLimiter);

// Route Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/authority", authorityRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/routes", routeRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FlowSense enterprise backend is running",
    rolesSupported: ["ADMIN", "AUTHORITY", "PUBLIC"],
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`FlowSense backend running on http://localhost:${PORT}`);
});
