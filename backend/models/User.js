const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["ADMIN", "AUTHORITY", "PUBLIC"],
      default: "PUBLIC"
    },
    department: {
      type: String,
      default: "Citizen Services"
    },
    badgeNumber: {
      type: String,
      default: ""
    },
    rank: {
      type: String,
      default: ""
    },
    stationName: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      default: ""
    },
    state: {
      type: String,
      default: ""
    },
    lastActiveCity: {
      type: String,
      default: ""
    },
    lastActiveState: {
      type: String,
      default: ""
    },
    phone: {
      type: String,
      default: ""
    },
    emergencyContact: {
      type: String,
      default: ""
    },
    vehicleInfo: {
      type: String,
      default: ""
    },
    bio: {
      type: String,
      default: ""
    },
    avatar: {
      type: String,
      default: "" // Base64 compressed image or URL
    },
    idProofImage: {
      type: String,
      default: "" // Uploaded Police / Authority ID card photo
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    verificationStatus: {
      type: String,
      enum: ["VERIFIED", "PENDING", "REJECTED"],
      default: "VERIFIED"
    },
    verifiedBy: {
      type: String,
      default: ""
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verificationNotes: {
      type: String,
      default: ""
    },
    pendingProfileUpdates: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    profileUpdateStatus: {
      type: String,
      enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
      default: "NONE"
    },
    profileUpdateNotes: {
      type: String,
      default: ""
    },
    profileUpdateRequestedAt: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
