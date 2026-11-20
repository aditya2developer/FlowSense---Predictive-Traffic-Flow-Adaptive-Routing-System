const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "flowsense_super_secret_jwt_key_2026";

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in."
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    let user = null;
    if (global.isMongoConnected) {
      try {
        user = await User.findById(decoded.id).select("-password");
      } catch (err) {
        user = null;
      }
    }

    if (!user) {
      const MemoryStore = require("../utils/memoryStore");
      user = MemoryStore.findUserById(decoded.id) || MemoryStore.findUserByEmail(decoded.email);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or account is deactivated."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token."
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires ${allowedRoles.join(" or ")} privilege.`
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  JWT_SECRET
};
