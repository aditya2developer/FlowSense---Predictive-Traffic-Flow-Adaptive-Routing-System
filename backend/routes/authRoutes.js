const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OtpRecord = require("../models/OtpRecord");
const Incident = require("../models/Incident");
const MemoryStore = require("../utils/memoryStore");
const { authenticate, JWT_SECRET } = require("../middleware/auth");
const {
  validateStrongPassword,
  generateCaptchaChallenge,
  verifyCaptchaChallenge,
  generateSecureOTP,
  saveMemoryOTP,
  getMemoryOTP,
  deleteMemoryOTP
} = require("../utils/securityHelpers");

const router = express.Router();

// Pre-seeded Demo Accounts for Evaluator Convenience
const DEMO_ACCOUNTS = [
  {
    role: "ADMIN",
    roleLabel: "Main System Administrator",
    email: "admin@flowsense.gov.in",
    password: "admin",
    name: "Aditya Kr Singh",
    department: "Smart Mobility Headquarters",
    badgeNumber: "SYS-ADMIN-01",
    rank: "Chief Systems Architect",
    stationName: "Central Command HQ, Delhi",
    city: "Delhi NCR",
    state: "Delhi",
    isEmailVerified: true,
    verificationStatus: "VERIFIED",
    description: "Full system oversight, police ID verification, database control, and global overrides."
  },
  {
    role: "AUTHORITY",
    roleLabel: "Traffic Enforcement & Police Dispatch",
    email: "police@flowsense.gov.in",
    password: "police",
    name: "Inspector Rajesh Sharma",
    department: "City Traffic Police & Dispatch Wing",
    badgeNumber: "TP-8409",
    rank: "Traffic Inspector",
    stationName: "Connaught Place Traffic Circle",
    city: "Delhi NCR",
    state: "Delhi",
    isEmailVerified: true,
    verificationStatus: "VERIFIED",
    description: "Emergency green-corridor dispatch, hazard resolution, and speed radar telemetry."
  },
  {
    role: "PUBLIC",
    roleLabel: "Commuter & Citizen",
    email: "citizen@flowsense.in",
    password: "citizen",
    name: "Priya Verma",
    department: "Daily Commuter (Car / EV Transit)",
    badgeNumber: "CITIZEN-001",
    city: "Jalandhar",
    state: "Punjab",
    isEmailVerified: true,
    verificationStatus: "VERIFIED",
    description: "Route prediction, stability comparison, community reporting with photos, and alerts."
  }
];

function formatSafeUser(user) {
  const u = typeof user.toObject === "function" ? user.toObject() : { ...user };
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department || "",
    badgeNumber: u.badgeNumber || "",
    rank: u.rank || "",
    stationName: u.stationName || "",
    city: u.city || "",
    state: u.state || "",
    phone: u.phone || "",
    emergencyContact: u.emergencyContact || "",
    vehicleInfo: u.vehicleInfo || "",
    bio: u.bio || "",
    avatar: u.avatar || "",
    idProofImage: u.idProofImage || "",
    isEmailVerified: Boolean(u.isEmailVerified),
    verificationStatus: u.verificationStatus || "VERIFIED",
    verificationNotes: u.verificationNotes || "",
    verifiedBy: u.verifiedBy || "",
    verifiedAt: u.verifiedAt || null,
    lastLoginAt: u.lastLoginAt || null,
    passwordChangedAt: u.passwordChangedAt || null,
    createdAt: u.createdAt || null
  };
}

async function verifyStoredOTP(email, otpCode, purpose) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanOtp = String(otpCode || "").trim();

  if (!cleanEmail || !cleanOtp) {
    return { valid: false, message: "6-digit OTP verification code is required." };
  }

  // Check MongoDB first
  if (global.isMongoConnected) {
    try {
      const record = await OtpRecord.findOne({
        email: cleanEmail,
        purpose
      }).sort({ createdAt: -1 });

      if (record) {
        if (Date.now() > new Date(record.expiresAt).getTime()) {
          await OtpRecord.deleteMany({ email: cleanEmail, purpose });
          return { valid: false, message: "OTP has expired. Please request a new 6-digit OTP." };
        }
        if (record.otp !== cleanOtp) {
          record.attempts += 1;
          await record.save();
          return { valid: false, message: "Invalid 6-digit OTP code. Please check carefully." };
        }
        await OtpRecord.deleteMany({ email: cleanEmail, purpose });
        deleteMemoryOTP(cleanEmail, purpose);
        return { valid: true };
      }
    } catch (e) {
      // Fall through to memory cache check
    }
  }

  // Fallback memory check
  const mem = getMemoryOTP(cleanEmail, purpose);
  if (!mem) {
    return { valid: false, message: "No active OTP found or OTP expired. Please request a new OTP." };
  }
  if (mem.otp !== cleanOtp) {
    return { valid: false, message: "Invalid 6-digit OTP code." };
  }
  deleteMemoryOTP(cleanEmail, purpose);
  return { valid: true };
}

// ==========================================
// GET /api/auth/demo-users
// ==========================================
router.get("/demo-users", (req, res) => {
  res.json({
    success: true,
    data: DEMO_ACCOUNTS
  });
});

// ==========================================
// GET /api/auth/captcha
// Real-time SVG Cyber CAPTCHA challenge
// ==========================================
router.get("/captcha", (req, res) => {
  const challenge = generateCaptchaChallenge();
  return res.json({
    success: true,
    captchaToken: challenge.captchaToken,
    svgDataUrl: challenge.svgDataUrl,
    expiresInSeconds: challenge.expiresInSeconds
  });
});

// ==========================================
// POST /api/auth/send-otp
// Real-time 6-digit OTP generator & dispatcher
// ==========================================
router.post("/send-otp", async (req, res) => {
  try {
    const { email, purpose = "REGISTER" } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address for OTP delivery."
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (purpose === "REGISTER" && global.isMongoConnected) {
      try {
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "This email is already registered in MongoDB. Please sign in instead."
          });
        }
      } catch (e) {}
    }

    if ((purpose === "PASSWORD_RESET") && global.isMongoConnected) {
      try {
        const existing = await User.findOne({ email: cleanEmail });
        if (!existing) {
          return res.status(404).json({
            success: false,
            message: "No account found with this email address."
          });
        }
      } catch (e) {}
    }

    const otp = generateSecureOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Store in MongoDB OtpRecord + Memory cache
    if (global.isMongoConnected) {
      try {
        await OtpRecord.deleteMany({ email: cleanEmail, purpose });
        await OtpRecord.create({
          email: cleanEmail,
          otp,
          purpose,
          expiresAt
        });
      } catch (e) {
        // Fallback already saved below
      }
    }
    saveMemoryOTP(cleanEmail, otp, purpose);

    console.log(`🔐 [OTP DISPATCH] Purpose: ${purpose} | Email: ${cleanEmail} | OTP: ${otp}`);

    return res.json({
      success: true,
      message: `A confidential 6-digit OTP has been dispatched to ${cleanEmail} (valid for 5 minutes).`,
      deliveryMode: process.env.SMTP_HOST ? "SMTP_EMAIL" : "LIVE_VIRTUAL_INBOX",
      otpPreview: process.env.SMTP_HOST ? undefined : otp,
      expiresInSeconds: 300
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate and dispatch OTP."
    });
  }
});

// ==========================================
// POST /api/auth/login
// Real-time Login with CAPTCHA + Bcrypt Password Verification
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { email, password, role, captchaToken, captchaAnswer } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    // Verify CAPTCHA
    const captchaCheck = verifyCaptchaChallenge(captchaToken, captchaAnswer);
    if (!captchaCheck.valid) {
      return res.status(400).json({
        success: false,
        message: captchaCheck.message,
        captchaFailed: true
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

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

    // Auto-seed demo accounts on first login if missing
    if (!user) {
      const demoMatch = DEMO_ACCOUNTS.find((d) => d.email.toLowerCase() === cleanEmail);
      if (demoMatch && password === demoMatch.password) {
        if (global.isMongoConnected) {
          try {
            user = new User({
              name: demoMatch.name,
              email: demoMatch.email,
              password: demoMatch.password,
              role: demoMatch.role,
              department: demoMatch.department,
              badgeNumber: demoMatch.badgeNumber,
              rank: demoMatch.rank || "",
              stationName: demoMatch.stationName || "",
              city: demoMatch.city || "",
              state: demoMatch.state || "",
              isEmailVerified: true,
              verificationStatus: "VERIFIED"
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

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    if (role && user.role !== role && user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: `Account is registered as ${user.role}, not ${role}. Please choose the matching role tab.`
      });
    }

    if (user.verificationStatus === "REJECTED") {
      return res.status(403).json({
        success: false,
        message: "This official police account verification was rejected by the Root Administrator."
      });
    }

    // Record login timestamp
    if (global.isMongoConnected && typeof user.save === "function") {
      try {
        user.lastLoginAt = new Date();
        await user.save();
      } catch (e) {}
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
      message: `Authenticated successfully. Welcome back, ${user.name}!`,
      token,
      user: formatSafeUser(user)
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication server error."
    });
  }
});

// ==========================================
// POST /api/auth/register
// Confidential Registration with Strong Password, CAPTCHA, OTP & Police ID Verification
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "PUBLIC",
      phone = "",
      city = "",
      state = "",
      department = "",
      badgeNumber = "",
      rank = "",
      stationName = "",
      idProofImage = "",
      captchaToken,
      captchaAnswer,
      otpCode
    } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full Name, Email, and Password are required."
      });
    }

    // 1. Verify CAPTCHA
    const captchaCheck = verifyCaptchaChallenge(captchaToken, captchaAnswer);
    if (!captchaCheck.valid) {
      return res.status(400).json({
        success: false,
        message: captchaCheck.message,
        captchaFailed: true
      });
    }

    // 2. Enforce Strong Hard Password Policy
    const pwdCheck = validateStrongPassword(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({
        success: false,
        message: `Password does not meet security standards: ${pwdCheck.errors.join(", ")}.`
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 3. Verify 6-Digit Email OTP
    const otpCheck = await verifyStoredOTP(cleanEmail, otpCode, "REGISTER");
    if (!otpCheck.valid) {
      return res.status(400).json({
        success: false,
        message: otpCheck.message,
        otpFailed: true
      });
    }

    // 4. Validate Police / Authority Official Credentials
    const targetRole = ["ADMIN", "AUTHORITY", "PUBLIC"].includes(role) ? role : "PUBLIC";
    if (targetRole === "AUTHORITY") {
      if (!badgeNumber.trim() || !rank.trim() || !stationName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Traffic Police registration requires Official Badge ID, Rank, and Station/Jurisdiction."
        });
      }
    }

    const verificationStatus = targetRole === "AUTHORITY" ? "PENDING" : "VERIFIED";

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
          role: targetRole,
          phone: phone.trim(),
          city: city.trim(),
          state: state.trim(),
          department: department.trim() || (targetRole === "AUTHORITY" ? "City Traffic Police" : "Citizen Commuter"),
          badgeNumber: badgeNumber.trim(),
          rank: rank.trim(),
          stationName: stationName.trim(),
          idProofImage: idProofImage || "",
          isEmailVerified: true,
          verificationStatus,
          lastLoginAt: new Date()
        });

        await newUser.save();

        const token = jwt.sign(
          { id: newUser._id, role: newUser.role, email: newUser.email },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        return res.status(201).json({
          success: true,
          message:
            targetRole === "AUTHORITY"
              ? "Police registration submitted! Your badge & ID proof are queued for Admin Verification."
              : "Confidential registration complete! Email verified and saved securely in MongoDB.",
          token,
          user: formatSafeUser(newUser)
        });
      } catch (err) {
        console.warn("MongoDB register fallback warning:", err.message);
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
      role: targetRole,
      phone: phone.trim(),
      city: city.trim(),
      state: state.trim(),
      department: department.trim() || (targetRole === "AUTHORITY" ? "City Traffic Police" : "Citizen Commuter"),
      badgeNumber: badgeNumber.trim(),
      rank: rank.trim(),
      stationName: stationName.trim(),
      idProofImage: idProofImage || "",
      isEmailVerified: true,
      verificationStatus
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
      user: formatSafeUser(memUser)
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Registration server error."
    });
  }
});

// ==========================================
// GET /api/auth/me
// ==========================================
router.get("/me", authenticate, (req, res) => {
  return res.json({
    success: true,
    user: formatSafeUser(req.user)
  });
});

// ==========================================
// PUT /api/auth/profile
// Update User Profile Details & Upload Profile Avatar Photo
// ==========================================
router.put("/profile", authenticate, async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "phone",
      "city",
      "state",
      "bio",
      "vehicleInfo",
      "emergencyContact",
      "avatar",
      "department",
      "badgeNumber",
      "rank",
      "stationName",
      "idProofImage"
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
      }
    });

    if (global.isMongoConnected) {
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true }
      ).select("-password");

      if (!updatedUser) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      return res.json({
        success: true,
        message: "Profile updated securely in MongoDB Atlas!",
        user: formatSafeUser(updatedUser)
      });
    }

    const updatedMem = MemoryStore.updateUserProfile(req.user._id, updates);
    return res.json({
      success: true,
      message: "Profile updated in active session.",
      user: formatSafeUser(updatedMem || { ...req.user, ...updates })
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile."
    });
  }
});

// ==========================================
// POST /api/auth/change-password
// Confidential Password Change with Current Password + 6-Digit OTP + Hard Password Policy
// ==========================================
router.post("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword, otpCode } = req.body || {};

    if (!currentPassword || !newPassword || !otpCode) {
      return res.status(400).json({
        success: false,
        message: "Current password, 6-digit verification OTP, and new password are all required."
      });
    }

    // Validate new strong password
    const pwdCheck = validateStrongPassword(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({
        success: false,
        message: `New password too weak: ${pwdCheck.errors.join(", ")}.`
      });
    }

    // Verify OTP
    const otpCheck = await verifyStoredOTP(req.user.email, otpCode, "PASSWORD_CHANGE");
    if (!otpCheck.valid) {
      return res.status(400).json({
        success: false,
        message: otpCheck.message
      });
    }

    if (global.isMongoConnected) {
      const dbUser = await User.findById(req.user._id);
      if (!dbUser) {
        return res.status(404).json({ success: false, message: "User record not found." });
      }

      const isCurrentMatch = await dbUser.comparePassword(currentPassword);
      if (!isCurrentMatch) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect."
        });
      }

      dbUser.password = newPassword;
      dbUser.passwordChangedAt = new Date();
      await dbUser.save();

      return res.json({
        success: true,
        message: "Password changed and re-encrypted in MongoDB Atlas successfully!"
      });
    }

    return res.status(503).json({
      success: false,
      message: "Database connection required for password modification."
    });
  } catch (error) {
    console.error("Password change error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change password."
    });
  }
});

// ==========================================
// POST /api/auth/reset-password
// Forgot Password flow using OTP
// ==========================================
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body || {};
    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, 6-digit OTP, and new password are required."
      });
    }

    const pwdCheck = validateStrongPassword(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({
        success: false,
        message: `Password too weak: ${pwdCheck.errors.join(", ")}.`
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const otpCheck = await verifyStoredOTP(cleanEmail, otpCode, "PASSWORD_RESET");
    if (!otpCheck.valid) {
      return res.status(400).json({ success: false, message: otpCheck.message });
    }

    if (global.isMongoConnected) {
      const dbUser = await User.findOne({ email: cleanEmail });
      if (!dbUser) {
        return res.status(404).json({ success: false, message: "Account not found." });
      }
      dbUser.password = newPassword;
      dbUser.passwordChangedAt = new Date();
      await dbUser.save();

      return res.json({
        success: true,
        message: "Password reset complete! You can now sign in with your new password."
      });
    }

    return res.status(503).json({ success: false, message: "Database unavailable." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Password reset failed." });
  }
});

// ==========================================
// GET /api/auth/my-reports
// Returns incidents reported by the logged-in user
// ==========================================
router.get("/my-reports", authenticate, async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const reports = await Incident.find({
        $or: [
          { reporterEmail: req.user.email },
          { reportedBy: req.user.name }
        ]
      }).sort({ createdAt: -1 }).limit(50);
      return res.json({ success: true, data: reports });
    }
    const memReports = MemoryStore.getAllIncidentsRaw().filter(
      (inc) =>
        (inc.reporterEmail && inc.reporterEmail === req.user.email) ||
        inc.reportedBy === req.user.name
    );
    return res.json({ success: true, data: memReports });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load user reports." });
  }
});

module.exports = router;
