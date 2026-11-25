/**
 * Evaluates password complexity using the same rules enforced by backend/utils/securityHelpers.js.
 */
export function evaluatePasswordStrength(password = "") {
  const pwd = String(password || "");
  const checks = {
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)
  };

  const score = Object.values(checks).filter(Boolean).length;
  let label = "Empty";
  let color = "#64748b";

  if (pwd.length > 0) {
    if (score <= 2) {
      label = "Weak";
      color = "#ef4444";
    } else if (score === 3) {
      label = "Fair";
      color = "#f59e0b";
    } else if (score === 4) {
      label = "Strong";
      color = "#38bdf8";
    } else {
      label = "Enterprise Hard";
      color = "#10b981";
    }
  }

  return {
    valid: score === 5,
    score,
    label,
    color,
    checks
  };
}
