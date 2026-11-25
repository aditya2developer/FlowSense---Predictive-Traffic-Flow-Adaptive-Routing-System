import { Check, X, ShieldCheck } from "lucide-react";
import { evaluatePasswordStrength } from "../utils/passwordStrength";

const CRITERIA = [
  { key: "minLength", label: "8+ characters" },
  { key: "hasUpper", label: "Uppercase (A-Z)" },
  { key: "hasLower", label: "Lowercase (a-z)" },
  { key: "hasNumber", label: "Digit (0-9)" },
  { key: "hasSpecial", label: "Special (!@#$%^&*)" }
];

export default function PasswordStrengthMeter({ password }) {
  const result = evaluatePasswordStrength(password);

  if (!password) return null;

  return (
    <div className="password-strength-box">
      <div className="strength-header-row">
        <span className="strength-title">
          <ShieldCheck size={13} style={{ color: result.color }} />
          Password Strength:
          <strong style={{ color: result.color }}> {result.label}</strong>
        </span>
        <span className="strength-score-num">{result.score}/5</span>
      </div>

      <div className="strength-bars-row">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className="strength-bar-seg"
            style={{
              backgroundColor: bar <= result.score ? result.color : "rgba(255, 255, 255, 0.1)",
              boxShadow: bar <= result.score ? `0 0 10px ${result.color}60` : "none"
            }}
          />
        ))}
      </div>

      <div className="strength-criteria-grid">
        {CRITERIA.map((c) => {
          const passed = result.checks[c.key];
          return (
            <span key={c.key} className={`criteria-pill ${passed ? "criteria-pass" : "criteria-fail"}`}>
              {passed ? <Check size={11} /> : <X size={11} />}
              {c.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
