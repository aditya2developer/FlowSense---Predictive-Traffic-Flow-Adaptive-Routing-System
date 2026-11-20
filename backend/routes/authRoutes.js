const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const MemoryStore = require("../utils/memoryStore");
const { authenticate, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// Seeded Demo Users Info (for UI 1-click test buttons)
const DEMO_ACCOUNTS = [
  {
    role: "ADMIN",
    roleLabel: "Main System Administrator",
    email: "admin@flowsense.gov.in",
    password: "admin",
    name: "Aditya Kr Singh",
    department: "Smart Mobility Headquarters",
    badgeNumber: "SYS-ADMIN-01",
    description: "Full system oversight, database control, ML audits, and global overrides."
  },
  {
    role: "AUTHORITY",
    roleLabel: "Traffic Enforcement & Police Dispatch",
    email: "police@flowsense.gov.in",
    password: "police",
    name: "Inspector Rajesh Sharma",
    department: "City Traffic Police & Dispatch Wing",
    badgeNumber: "TP-8409",
    description: "Emergency green-corridor dispatch, hazard resolution, and speed radar telemetry."
  },
  {
    role: "PUBLIC",
    roleLabel: "Commuter & Citizen",
    email: "citizen@flowsense.in",
    password: "citizen",
    name: "Priya Verma",
    department: "Daily Commuter (Car / Transit)",
    badgeNumber: "CITIZEN-001",
    description: "Route prediction, stability comparison, community reporting, and commute alerts."
  }
];

// GET /api/auth/demo-users
router.get("/demo-users", (req, res) => {
  res.json({
    success: true,
    data: DEMO_ACCOUNTS
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if user exists (MongoDB or In-Memory fallback)
    let user = null;
    if (global.isMongoConnected) {
      try {
        user = await User.findOne({ email: cleanEmail });
      } catch (e) {
        user = null;
      }
    }

    if (!user) {
      user = MemoryStore.findUserByEmail(cleanEmail);
    }

    // Auto-create demo accounts if they don't exist yet!
    if (!user) {
      const demoMatch = DEMO_ACCOUNTS.find(
        (d) => d.email.toLowerCase() === cleanEmail
      );
      if (demoMatch && password === demoMatch.password) {
        if (global.isMongoConnected) {
          try {
            user = new User({
              name: demoMatch.name,
              email: demoMatch.email,
              password: demoMatch.password,
              role: demoMatch.role,
              department: demoMatch.department,
              badgeNumber: demoMatch.badgeNumber
            });
            await user.save();
          } catch {
            user = MemoryStore.findUserByEmail(cleanEmail);
          }
        } else {
          user = MemoryStore.findUserByEmail(cleanEmail);
        }
      } else {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password."
        });
      }
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Optional role check if logging into a role-specific portal
    if (role && user.role !== role && user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: `Account is registered as ${user.role}, but attempting to access ${role} portal.`
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        badgeNumber: user.badgeNumber,
        phone: user.phone || ""
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication server error."
    });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, department, badgeNumber } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required."
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (global.isMongoConnected) {
      try {
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "An account with this email already exists."
          });
        }

        const newUser = new User({
          name: name.trim(),
          email: cleanEmail,
          password,
          role: role && ["ADMIN", "AUTHORITY", "PUBLIC"].includes(role) ? role : "PUBLIC",
          department: department || "Citizen Commuter",
          badgeNumber: badgeNumber || ""
        });
        await newUser.save();

        const token = jwt.sign(
          { id: newUser._id, role: newUser.role, email: newUser.email },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        return res.status(201).json({
          success: true,
          message: "Registration successful!",
          token,
          user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            department: newUser.department,
            badgeNumber: newUser.badgeNumber
          }
        });
      } catch (err) {
        // Fall back to memory store if Mongo error
      }
    }

    // Memory Store Fallback
    const existingMem = MemoryStore.findUserByEmail(cleanEmail);
    if (existingMem) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    const memUser = MemoryStore.createUser({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: role && ["ADMIN", "AUTHORITY", "PUBLIC"].includes(role) ? role : "PUBLIC",
      department: department || "Citizen Commuter",
      badgeNumber: badgeNumber || ""
    });

    const token = jwt.sign(
      { id: memUser._id, role: memUser.role, email: memUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful!",
      token,
      user: memUser
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed."
    });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
