const crypto = require("crypto");

const CAPTCHA_SECRET = process.env.JWT_SECRET || "flowsense_super_secret_jwt_key_2026";

/**
 * Validates enterprise password complexity:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
function validateStrongPassword(password) {
  const pwd = String(password || "");
  const checks = {
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)
  };

  const errors = [];
  if (!checks.minLength) errors.push("At least 8 characters required");
  if (!checks.hasUpper) errors.push("At least 1 uppercase letter (A-Z) required");
  if (!checks.hasLower) errors.push("At least 1 lowercase letter (a-z) required");
  if (!checks.hasNumber) errors.push("At least 1 numeric digit (0-9) required");
  if (!checks.hasSpecial) errors.push("At least 1 special symbol (!@#$%^&*) required");

  const score = Object.values(checks).filter(Boolean).length;

  return {
    valid: errors.length === 0,
    score,
    checks,
    errors
  };
}

/**
 * Generates a distorted SVG CAPTCHA challenge with a stateless HMAC-signed token
 * valid for 5 minutes.
 */
function generateCaptchaChallenge() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Ambiguous characters excluded
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }

  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  const nonce = crypto.randomBytes(6).toString("hex");
  const payload = `${code.toUpperCase()}:${expiresAt}:${nonce}`;
  const hmac = crypto.createHmac("sha256", CAPTCHA_SECRET).update(payload).digest("hex");
  const captchaToken = Buffer.from(`${expiresAt}:${nonce}:${hmac}`).toString("base64");

  // Build crisp SVG with subtle cyber interference lines and rotated glyphs
  const colors = ["#38bdf8", "#34d399", "#fbbf24", "#c084fc", "#f472b6", "#60a5fa"];
  let textElements = "";
  for (let i = 0; i < code.length; i++) {
    const x = 18 + i * 28;
    const y = 32 + crypto.randomInt(-5, 6);
    const rotate = crypto.randomInt(-18, 19);
    const color = colors[i % colors.length];
    textElements += `<text x="${x}" y="${y}" fill="${color}" font-family="monospace, sans-serif" font-size="24" font-weight="900" transform="rotate(${rotate} ${x} ${y})">${code[i]}</text>`;
  }

  let noiseLines = "";
  for (let i = 0; i < 5; i++) {
    const x1 = crypto.randomInt(0, 40);
    const y1 = crypto.randomInt(5, 45);
    const x2 = crypto.randomInt(150, 200);
    const y2 = crypto.randomInt(5, 45);
    const stroke = colors[crypto.randomInt(0, colors.length)];
    noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-opacity="0.35" stroke-width="1.5" />`;
  }

  let dots = "";
  for (let i = 0; i < 18; i++) {
    const cx = crypto.randomInt(5, 195);
    const cy = crypto.randomInt(5, 45);
    dots += `<circle cx="${cx}" cy="${cy}" r="1.2" fill="#94a3b8" fill-opacity="0.45" />`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50" viewBox="0 0 200 50">
    <rect width="200" height="50" rx="8" fill="#0f172a"/>
    <path d="M0 25 Q 50 ${crypto.randomInt(10, 40)}, 100 25 T 200 25" fill="none" stroke="#06b6d4" stroke-opacity="0.25" stroke-width="1.5"/>
    ${dots}
    ${noiseLines}
    ${textElements}
  </svg>`;

  return {
    captchaToken,
    svgDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    expiresInSeconds: 300
  };
}

/**
 * Verifies user CAPTCHA answer against signed HMAC token
 */
function verifyCaptchaChallenge(captchaToken, userAnswer) {
  if (!captchaToken || !userAnswer) {
    return { valid: false, message: "CAPTCHA verification is required." };
  }

  try {
    const decoded = Buffer.from(String(captchaToken), "base64").toString("utf8");
    const [expiresAtStr, nonce, expectedHmac] = decoded.split(":");
    const expiresAt = Number(expiresAtStr);

    if (!expiresAt || !nonce || !expectedHmac) {
      return { valid: false, message: "Invalid CAPTCHA challenge token." };
    }

    if (Date.now() > expiresAt) {
      return { valid: false, message: "CAPTCHA expired. Please refresh and try again." };
    }

    const cleanAnswer = String(userAnswer).trim().toUpperCase();
    const payload = `${cleanAnswer}:${expiresAt}:${nonce}`;
    const computedHmac = crypto.createHmac("sha256", CAPTCHA_SECRET).update(payload).digest("hex");

    if (computedHmac !== expectedHmac) {
      return { valid: false, message: "Incorrect CAPTCHA text. Please check and retry." };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, message: "CAPTCHA validation failed." };
  }
}

/**
 * Generates cryptographically secure 6-digit numeric OTP
 */
function generateSecureOTP() {
  return String(crypto.randomInt(100000, 999999));
}

// In-memory OTP store fallback
const otpMemoryCache = new Map();

function saveMemoryOTP(email, otp, purpose) {
  const key = `${email.toLowerCase()}:${purpose}`;
  otpMemoryCache.set(key, {
    email: email.toLowerCase(),
    otp,
    purpose,
    verified: false,
    expiresAt: Date.now() + 5 * 60 * 1000
  });
}

function getMemoryOTP(email, purpose) {
  const key = `${email.toLowerCase()}:${purpose}`;
  const item = otpMemoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    otpMemoryCache.delete(key);
    return null;
  }
  return item;
}

function deleteMemoryOTP(email, purpose) {
  const key = `${email.toLowerCase()}:${purpose}`;
  otpMemoryCache.delete(key);
}

module.exports = {
  validateStrongPassword,
  generateCaptchaChallenge,
  verifyCaptchaChallenge,
  generateSecureOTP,
  saveMemoryOTP,
  getMemoryOTP,
  deleteMemoryOTP
};
