const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");
const routeRoutes = require("./routes/routeRoutes");
const authRoutes = require("./routes/authRoutes");
const authorityRoutes = require("./routes/authorityRoutes");
const adminRoutes = require("./routes/adminRoutes");
const contactRoutes = require("./routes/contactRoutes");
const chatRoutes = require("./routes/chatRoutes");
const databaseRoutes = require("./routes/databaseRoutes");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// Render & reverse-proxy support so express-rate-limit identifies client IPs accurately
app.set("trust proxy", 1);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
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
app.use("/api/contact", contactRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/database", databaseRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FlowSense enterprise backend is running",
    rolesSupported: ["ADMIN", "AUTHORITY", "PUBLIC"],
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build artifacts for production deployment
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

// Fallback to index.html for SPA client-side routing on non-API GET requests (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api/")) {
    return res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) next();
    });
  }
  next();
});

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`FlowSense backend running on http://localhost:${PORT}`);
});
