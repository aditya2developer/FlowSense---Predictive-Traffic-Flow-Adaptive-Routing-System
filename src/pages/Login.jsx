import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Shield,
  Radio,
  UserCheck,
  ArrowRight,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  Building,
  BadgeAlert,
  Sparkles,
  KeyRound
} from "lucide-react";

const ROLE_PRESETS = {
  ADMIN: {
    role: "ADMIN",
    title: "Global Root Administrator",
    subtitle: "Full database oversight, ML audits & corridor management",
    icon: Shield,
    accent: "#a855f7",
    ambient: "admin-ambient",
    badgeLabel: "Level 1 System Clearance",
    defaultEmail: "admin@flowsense.gov.in",
    defaultPass: "admin",
    defaultDept: "Smart Mobility Headquarters",
    badgePlaceholder: "SYS-ADMIN-01"
  },
  AUTHORITY: {
    role: "AUTHORITY",
    title: "Traffic Police & Authority Command",
    subtitle: "Emergency green corridor dispatch & hazard management",
    icon: Radio,
    accent: "#06b6d4",
    ambient: "authority-ambient",
    badgeLabel: "Official Police Badge Required",
    defaultEmail: "police@flowsense.gov.in",
    defaultPass: "police",
    defaultDept: "City Traffic Police & Enforcement",
    badgePlaceholder: "TP-8409"
  },
  PUBLIC: {
    role: "PUBLIC",
    title: "Citizen & Commuter Portal",
    subtitle: "Real-time AI routing, traffic memory & hazard alerts",
    icon: UserCheck,
    accent: "#10b981",
    ambient: "public-ambient",
    badgeLabel: "Public Citizen Access",
    defaultEmail: "citizen@flowsense.in",
    defaultPass: "citizen",
    defaultDept: "Daily City Commuter",
    badgePlaceholder: "CITIZEN-001"
  }
};

function Login() {
  const { login, register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode: 'login' or 'register'
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const [isRegistering, setIsRegistering] = useState(initialMode === "register");

  // Requested role filter from query
  const roleQuery = searchParams.get("role") || "PUBLIC";
  const redirectTarget = searchParams.get("redirect") || "";

  const [activeRole, setActiveRole] = useState(
    ["ADMIN", "AUTHORITY", "PUBLIC"].includes(roleQuery) ? roleQuery : "PUBLIC"
  );

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (redirectTarget) {
        navigate(redirectTarget);
      } else if (user.role === "ADMIN") {
        navigate("/admin");
      } else if (user.role === "AUTHORITY") {
        navigate("/authority");
      } else {
        navigate("/");
      }
    }
  }, [isAuthenticated, user, redirectTarget, navigate]);

  // Reset fields on mode toggle
  useEffect(() => {
    setError("");
    setSuccessMsg("");
    if (!isRegistering) {
      // Default sample credentials can be filled by clicking helper chips
      setEmail("");
      setPassword("");
    }
  }, [isRegistering, activeRole]);

  // Handle Form Submission (Real-Time MongoDB Auth)
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isRegistering) {
        // Real-Time Registration in MongoDB
        if (!name.trim()) {
          setError("Full Name is required.");
          setLoading(false);
          return;
        }

        const res = await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: activeRole,
          department: department.trim() || ROLE_PRESETS[activeRole].defaultDept,
          badgeNumber: badgeNumber.trim() || ROLE_PRESETS[activeRole].badgePlaceholder
        });

        if (res.success) {
          setSuccessMsg(`Account created in MongoDB! Welcome, ${res.user?.name}. Redirecting...`);
          setTimeout(() => {
            if (activeRole === "ADMIN") navigate("/admin");
            else if (activeRole === "AUTHORITY") navigate("/authority");
            else navigate("/");
          }, 800);
        } else {
          setError(res.message || "Registration failed. An account with this email may already exist.");
        }
      } else {
        // Real-Time Login against MongoDB
        const res = await login(email.trim().toLowerCase(), password, activeRole);
        if (res.success) {
          setSuccessMsg(`Authentication successful! Welcome back, ${res.user?.name}.`);
          setTimeout(() => {
            if (redirectTarget) navigate(redirectTarget);
            else if (res.user?.role === "ADMIN") navigate("/admin");
            else if (res.user?.role === "AUTHORITY") navigate("/authority");
            else navigate("/");
          }, 600);
        } else {
          setError(res.message || "Invalid credentials. Please verify your email and password.");
        }
      }
    } catch (err) {
      setError("Unable to connect to FlowSense authentication server: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Quick-Fill Sample Credentials (Only fills the input fields so user can review and click Sign In)
  function handleFillCredentials(presetKey) {
    const preset = ROLE_PRESETS[presetKey];
    setActiveRole(presetKey);
    setEmail(preset.defaultEmail);
    setPassword(preset.defaultPass);
    setError("");
  }

  const currentConfig = ROLE_PRESETS[activeRole];
  const IconComponent = currentConfig.icon;

  return (
    <div className={`auth-page-wrapper ${currentConfig.ambient}`}>
      <div className="auth-ambient-glow" />

      <div className="auth-card-container">
        {/* ROLE TABS */}
        <div className="auth-role-tabs">
          <button
            type="button"
            className={`role-tab ${activeRole === "PUBLIC" ? "active-public" : ""}`}
            onClick={() => {
              setActiveRole("PUBLIC");
              setError("");
            }}
          >
            <UserCheck size={16} /> <span>Commuter</span>
          </button>

          <button
            type="button"
            className={`role-tab ${activeRole === "AUTHORITY" ? "active-authority" : ""}`}
            onClick={() => {
              setActiveRole("AUTHORITY");
              setError("");
            }}
          >
            <Radio size={16} /> <span>Traffic Police</span>
          </button>

          <button
            type="button"
            className={`role-tab ${activeRole === "ADMIN" ? "active-admin" : ""}`}
            onClick={() => {
              setActiveRole("ADMIN");
              setError("");
            }}
          >
            <Shield size={16} /> <span>Administrator</span>
          </button>
        </div>

        {/* MAIN AUTH CARD */}
        <div className="auth-card">
          {/* CARD HEADER */}
          <div className="auth-card-header">
            <div
              className="role-avatar-circle"
              style={{
                backgroundColor: `${currentConfig.accent}20`,
                borderColor: currentConfig.accent
              }}
            >
              <IconComponent size={28} color={currentConfig.accent} />
            </div>
            <span className="role-clearance-badge" style={{ color: currentConfig.accent }}>
              {currentConfig.badgeLabel}
            </span>
            <h2>{isRegistering ? `Register as ${currentConfig.title}` : `Sign In to ${currentConfig.title}`}</h2>
            <p>{currentConfig.subtitle}</p>
          </div>

          {/* SUCCESS MESSAGE */}
          {successMsg && (
            <div className="auth-success-banner">
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ERROR MESSAGE */}
          {error && (
            <div className="auth-error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* REAL-TIME AUTHENTICATION FORM */}
          <form onSubmit={handleSubmit} className="auth-form">
            {isRegistering && (
              <div className="auth-input-group">
                <label>Full Official Name *</label>
                <div className="input-with-icon">
                  <User size={18} className="field-icon" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="auth-input-group">
              <label>Official Email Address *</label>
              <div className="input-with-icon">
                <Mail size={18} className="field-icon" />
                <input
                  type="email"
                  required
                  placeholder={currentConfig.defaultEmail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label>Password *</label>
              <div className="input-with-icon">
                <Lock size={18} className="field-icon" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {isRegistering && (
              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>Department / Jurisdiction</label>
                  <div className="input-with-icon">
                    <Building size={18} className="field-icon" />
                    <input
                      type="text"
                      placeholder={currentConfig.defaultDept}
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                </div>

                {activeRole !== "PUBLIC" && (
                  <div className="auth-input-group">
                    <label>Badge / Officer ID *</label>
                    <div className="input-with-icon">
                      <BadgeAlert size={18} className="field-icon" />
                      <input
                        type="text"
                        placeholder={currentConfig.badgePlaceholder}
                        value={badgeNumber}
                        onChange={(e) => setBadgeNumber(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
              style={{
                background: `linear-gradient(135deg, ${currentConfig.accent}, #2563eb)`
              }}
            >
              {loading ? (
                "Authenticating with MongoDB..."
              ) : (
                <>
                  {isRegistering ? "Register Account in Database" : `Sign In to ${currentConfig.title}`} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* SAMPLE CREDENTIALS AUTO-FILL CHIPS (Fills form fields only for convenience) */}
          {!isRegistering && (
            <div className="sample-credentials-helper">
              <span className="helper-label">
                <KeyRound size={13} /> Quick Fill Registered Credentials:
              </span>
              <div className="credential-chips-row">
                <button
                  type="button"
                  className="cred-chip-btn chip-admin"
                  onClick={() => handleFillCredentials("ADMIN")}
                >
                  🛡️ Admin ({ROLE_PRESETS.ADMIN.defaultEmail})
                </button>
                <button
                  type="button"
                  className="cred-chip-btn chip-police"
                  onClick={() => handleFillCredentials("AUTHORITY")}
                >
                  🚔 Police ({ROLE_PRESETS.AUTHORITY.defaultEmail})
                </button>
                <button
                  type="button"
                  className="cred-chip-btn chip-citizen"
                  onClick={() => handleFillCredentials("PUBLIC")}
                >
                  🚗 Citizen ({ROLE_PRESETS.PUBLIC.defaultEmail})
                </button>
              </div>
            </div>
          )}

          {/* TOGGLE SIGN IN / REGISTER MODE */}
          <div className="auth-card-footer">
            <button
              type="button"
              className="toggle-auth-mode-btn"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
                setSuccessMsg("");
              }}
            >
              {isRegistering
                ? "Already registered in MongoDB? Sign In to Existing Account"
                : "Need an account? Register a new Commuter, Police or Admin account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
