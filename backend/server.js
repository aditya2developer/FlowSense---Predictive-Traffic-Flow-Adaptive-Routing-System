const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const routeRoutes = require("./routes/routeRoutes");

const app = express();

const PORT = process.env.PORT || 5000;


// Connect to MongoDB
connectDB();


// Middleware
app.use(cors());
app.use(express.json());


// Routes
app.use("/api/routes", routeRoutes);


// Health check
app.get("/api/health", (req, res) => {

  res.json({
    success: true,
    message: "FlowSense backend is running"
  });

});


// Start server
app.listen(PORT, () => {

  console.log(
    `FlowSense backend running on http://localhost:${PORT}`
  );

});