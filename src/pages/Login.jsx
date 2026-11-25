import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchCaptcha, sendOtp, resetUserPassword } from "../api";
import { compressImageFile } from "../utils/imageHelper";
import { evaluatePasswordStrength } from "../utils/passwordStrength";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import CaptchaBox from "../components/CaptchaBox";
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
  KeyRound,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  Send,
  ShieldCheck,
  Upload,
  X,
  FileBadge2,
  Clock,
  Sparkles,
  Copy
} from "lucide-react";

const ROLE_PRESETS = {
  PUBLIC: {
    role: "PUBLIC",
    title: "Citizen & Commuter Portal",
    subtitle: "Real-time AI routing, hazard photo alerts & safety intelligence",
    icon: UserCheck,
    accent: "#10b981",
    ambient: "public-ambient",
    pillActiveClass: "role-pill-public-active",
    badgeLabel: "Public Citizen Access",
    defaultEmail: "citizen@flowsense.in",
    defaultPass: "citizen",
    defaultDept: "Daily City Commuter",
    badgePlaceholder: "CITIZEN-001"
  },
  AUTHORITY: {
    role: "AUTHORITY",
    title: "Traffic Police & Authority Command",
    subtitle: "Green corridor preemption, hazard dispatch & badge verification",
    icon: Radio,
    accent: "#06b6d4",
    ambient: "authority-ambient",
    pillActiveClass: "role-pill-authority-active",
    badgeLabel: "Official Police ID & Admin Approval Required",
    defaultEmail: "police@flowsense.gov.in",
    defaultPass: "police",
    defaultDept: "City Traffic Police & Dispatch Wing",
    badgePlaceholder: "TP-8409"
  },
  ADMIN: {
    role: "ADMIN",
    title: "Global Root Administrator",
    subtitle: "Officer verification, MongoDB oversight & corridor control",
    icon: Shield,
    accent: "#a855f7",
    ambient: "admin-ambient",
    pillActiveClass: "role-pill-admin-active",
    badgeLabel: "Level 1 System Clearance",
    defaultEmail: "admin@flowsense.gov.in",
    defaultPass: "admin",
    defaultDept: "Smart Mobility Headquarters",
    badgePlaceholder: "SYS-ADMIN-01"
  }
};

const POLICE_RANKS = [
  "Traffic Constable",
  "Head Constable",
  "Assistant Sub-Inspector (ASI)",
  "Sub-Inspector (SI)",
  "Traffic Inspector",
  "Deputy Superintendent (DSP / ACP)",
  "Superintendent of Police (SP / DCP)",
  "Joint Commissioner / Commissioner",
  "Highway Patrol Officer"
];

function Login() {
  const { login, register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roleQuery = searchParams.get("role") || "PUBLIC";
  const redirectTarget = searchParams.get("redirect") || "";

  // Modes: 'login' | 'register' | 'forgot'
  const [explicitMode, setExplicitMode] = useState(null);
  const urlMode = searchParams.get("mode") === "register" ? "register" : "login";
  const mode = explicitMode || urlMode;
  const [prevSearchStr, setPrevSearchStr] = useState(searchParams.toString());
  if (prevSearchStr !== searchParams.toString()) {
    setPrevSearchStr(searchParams.toString());
    setExplicitMode(null);
  }
  const [activeRole, setActiveRole] = useState(
    ["ADMIN", "AUTHORITY", "PUBLIC"].includes(roleQuery) ? roleQuery : "PUBLIC"
  );

  // Common Auth Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Extended Profile / Confidential Registration Fields
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [department, setDepartment] = useState("");

  // Traffic Police Official Credential Fields
  const [badgeNumber, setBadgeNumber] = useState("");
  const [rank, setRank] = useState("Traffic Inspector");
  const [stationName, setStationName] = useState("");
  const [idProofImage, setIdProofImage] = useState("");
  const [idProofUploading, setIdProofUploading] = useState(false);

  // Real-time CAPTCHA state
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaSvgUrl, setCaptchaSvgUrl] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  // Real-time 6-Digit OTP state
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpInfo, setOtpInfo] = useState(null);

  // Submission / Feedback state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load CAPTCHA from backend
  const loadCaptchaChallenge = useCallback(async () => {
    setLoadingCaptcha(true);
    try {
      const res = await fetchCaptcha();
      if (res.success && res.captchaToken && res.svgDataUrl) {
        setCaptchaToken(res.captchaToken);
        setCaptchaSvgUrl(res.svgDataUrl);
        setCaptchaAnswer("");
      }
    } catch {
      // Quiet fallback; handled on submit if empty
    } finally {
      setLoadingCaptcha(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (mode !== "forgot") {
      fetchCaptcha()
        .then((res) => {
          if (active && res.success && res.captchaToken && res.svgDataUrl) {
            setCaptchaToken(res.captchaToken);
            setCaptchaSvgUrl(res.svgDataUrl);
            setCaptchaAnswer("");
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [mode]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (redirectTarget) {
        navigate(redirectTarget);
      } else if (user.role === "ADMIN") {
        navigate("/admin");
      } else if (user.role === "AUTHORITY") {
        navigate(user.verificationStatus === "PENDING" ? "/profile" : "/authority");
      } else {
        navigate("/");
      }
    }
  }, [isAuthenticated, user, redirectTarget, navigate]);

  // OTP cooldown countdown timer
  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  function switchMode(nextMode) {
    setExplicitMode(nextMode);
    setError("");
    setSuccessMsg("");
    setOtpInfo(null);
    setOtpCode("");
    setConfirmPassword("");
    setCaptchaAnswer("");
  }

  async function handleSendOtp(purpose) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address before requesting a 6-digit OTP.");
      return;
    }

    setError("");
    setOtpSending(true);
    try {
      const res = await sendOtp(cleanEmail, purpose);
      if (res.success) {
        setOtpInfo({
          message: res.message,
          deliveryMode: res.deliveryMode,
          otpPreview: res.otpPreview
        });
        setOtpCooldown(45);
      } else {
        setError(res.message || "Could not send OTP verification code.");
      }
    } catch (err) {
      setError("Failed to contact OTP dispatch server: " + err.message);
    } finally {
      setOtpSending(false);
    }
  }

  async function handleIdProofUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setIdProofUploading(true);
    try {
      const compressed = await compressImageFile(file, 720, 0.8);
      setIdProofImage(compressed);
    } catch (err) {
      setError(err.message || "Could not process Police ID photo.");
    } finally {
      setIdProofUploading(false);
      e.target.value = "";
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!captchaToken || !captchaAnswer.trim()) {
      setError("Please enter the security CAPTCHA characters shown above.");
      return;
    }

    setLoading(true);
    try {
      const res = await login(
        email.trim().toLowerCase(),
        password,
        activeRole,
        captchaToken,
        captchaAnswer.trim()
      );

      if (res.success) {
        setSuccessMsg(`Verified & Authenticated! Welcome back, ${res.user?.name}.`);
        setTimeout(() => {
          if (redirectTarget) navigate(redirectTarget);
          else if (res.user?.role === "ADMIN") navigate("/admin");
          else if (res.user?.role === "AUTHORITY") {
            navigate(res.user?.verificationStatus === "PENDING" ? "/profile" : "/authority");
          } else navigate("/");
        }, 650);
      } else {
        setError(res.message || "Invalid credentials. Please check email, password, and CAPTCHA.");
        loadCaptchaChallenge();
      }
    } catch (err) {
      setError("Unable to reach authentication server: " + err.message);
      loadCaptchaChallenge();
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!name.trim()) {
      setError("Full Official Name is required.");
      return;
    }

    const strength = evaluatePasswordStrength(password);
    if (!strength.valid) {
      setError("Password must meet all 5 Enterprise Hard Password rules shown in the meter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please confirm your password carefully.");
      return;
    }

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setError("Please request and enter the 6-digit Email OTP verification code.");
      return;
    }

    if (activeRole === "AUTHORITY") {
      if (!badgeNumber.trim() || !rank.trim() || !stationName.trim()) {
        setError("Police registration requires Official Badge ID, Rank, and Assigned Station.");
        return;
      }
      if (!idProofImage) {
        setError("Please upload your Official Police ID / Warrant Card photo for Admin verification.");
        return;
      }
    }

    if (!captchaToken || !captchaAnswer.trim()) {
      setError("Please solve the security CAPTCHA challenge before submitting.");
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: activeRole,
        phone: phone.trim(),
        city: city.trim(),
        state: stateName.trim(),
        department: department.trim() || ROLE_PRESETS[activeRole].defaultDept,
        badgeNumber:
          activeRole === "PUBLIC"
            ? ""
            : badgeNumber.trim() || ROLE_PRESETS[activeRole].badgePlaceholder,
        rank: activeRole === "AUTHORITY" ? rank.trim() : "",
        stationName: activeRole === "AUTHORITY" ? stationName.trim() : "",
        idProofImage: activeRole === "AUTHORITY" ? idProofImage : "",
        otpCode: otpCode.trim(),
        captchaToken,
        captchaAnswer: captchaAnswer.trim()
      });

      if (res.success) {
        const isPendingPolice =
          res.user?.role === "AUTHORITY" && res.user?.verificationStatus === "PENDING";

        setSuccessMsg(
          isPendingPolice
            ? "Police credentials & ID proof submitted to MongoDB! Account is PENDING Admin verification. Redirecting to your Profile..."
            : `Confidential registration verified in MongoDB! Welcome, ${res.user?.name}.`
        );

        setTimeout(() => {
          if (isPendingPolice) navigate("/profile");
          else if (res.user?.role === "ADMIN") navigate("/admin");
          else if (res.user?.role === "AUTHORITY") navigate("/authority");
          else navigate("/");
        }, 1000);
      } else {
        setError(res.message || "Registration failed.");
        if (res.captchaFailed) {
          loadCaptchaChallenge();
        }
      }
    } catch (err) {
      setError("Unable to connect to registration service: " + err.message);
      loadCaptchaChallenge();
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotResetSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const strength = evaluatePasswordStrength(password);
    if (!strength.valid) {
      setError("New password must satisfy all 5 security rules.");
      return;
    }
    if (password !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setError("Please enter the 6-digit password reset OTP.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetUserPassword({
        email: email.trim().toLowerCase(),
        otpCode: otpCode.trim(),
        newPassword: password
      });
      if (res.success) {
        setSuccessMsg(res.message || "Password reset complete! Sign in with your new password.");
        setTimeout(() => {
          setPassword("");
          setConfirmPassword("");
          setOtpCode("");
          setOtpInfo(null);
          setExplicitMode("login");
        }, 1200);
      } else {
        setError(res.message || "Could not reset password.");
      }
    } catch (err) {
      setError("Password reset error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFillCredentials(presetKey) {
    const preset = ROLE_PRESETS[presetKey];
    setActiveRole(presetKey);
    setEmail(preset.defaultEmail);
    setPassword(preset.defaultPass);
    setError("");
  }

  const currentConfig = ROLE_PRESETS[activeRole];
  const IconComponent = currentConfig.icon;
  const passwordsMatch = Boolean(confirmPassword && password === confirmPassword);

  return (
    <div className={`auth-page-wrapper ${currentConfig.ambient}`}>
      <div className="auth-ambient-glow" />

      <div className={`auth-card-container ${mode === "register" ? "auth-card-wide" : ""}`}>
        {/* ROLE SELECTOR PILLS */}
        {mode !== "forgot" && (
          <div className="role-selector-pills">
            {["PUBLIC", "AUTHORITY", "ADMIN"].map((rKey) => {
              const cfg = ROLE_PRESETS[rKey];
              const TabIcon = cfg.icon;
              const isSelected = activeRole === rKey;
              return (
                <button
                  key={rKey}
                  type="button"
                  className={`role-pill ${isSelected ? cfg.pillActiveClass : ""}`}
                  onClick={() => {
                    setActiveRole(rKey);
                    setError("");
                  }}
                >
                  <TabIcon size={16} />
                  <span>
                    {rKey === "PUBLIC"
                      ? "Commuter"
                      : rKey === "AUTHORITY"
                        ? "Traffic Police"
                        : "Administrator"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* MAIN CYBER GLASS AUTH CARD */}
        <div className="auth-glass-card cyber-auth-card">
          <div className="panel-glow-corner corner-tl" />
          <div className="panel-glow-corner corner-br" />

          {/* TOP MODE SWITCHER BAR */}
          <div className="auth-mode-switch-bar">
            <button
              type="button"
              className={`mode-switch-tab ${mode === "login" ? "mode-tab-active" : ""}`}
              onClick={() => switchMode("login")}
            >
              <Lock size={14} /> Sign In
            </button>
            <button
              type="button"
              className={`mode-switch-tab ${mode === "register" ? "mode-tab-active" : ""}`}
              onClick={() => switchMode("register")}
            >
              <ShieldCheck size={14} /> Confidential Register
            </button>
            <button
              type="button"
              className={`mode-switch-tab ${mode === "forgot" ? "mode-tab-active" : ""}`}
              onClick={() => switchMode("forgot")}
            >
              <KeyRound size={14} /> Reset Password
            </button>
          </div>

          {/* HEADER */}
          <div className="auth-header">
            <div
              className="role-icon-box cyber-icon-orb"
              style={{
                backgroundColor: `${currentConfig.accent}1a`,
                borderColor: currentConfig.accent,
                boxShadow: `0 0 25px ${currentConfig.accent}35`
              }}
            >
              <IconComponent size={28} color={currentConfig.accent} />
            </div>
            <span className="role-clearance-badge" style={{ color: currentConfig.accent }}>
              {mode === "forgot" ? "OTP Account Recovery" : currentConfig.badgeLabel}
            </span>
            <h2>
              {mode === "login" && `Sign In — ${currentConfig.title}`}
              {mode === "register" && `Confidential Registration — ${currentConfig.title}`}
              {mode === "forgot" && "Verify OTP & Reset Password"}
            </h2>
            <p>
              {mode === "forgot"
                ? "Recover your encrypted FlowSense account using 6-digit email OTP verification."
                : currentConfig.subtitle}
            </p>
          </div>

          {/* STATUS BANNERS */}
          {successMsg && (
            <div className="auth-success-banner">
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="auth-error-banner">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ============================== */}
          {/* VIEW 1: LOGIN WITH CAPTCHA     */}
          {/* ============================== */}
          {mode === "login" && (
            <>
              <form onSubmit={handleLoginSubmit} className="auth-form">
                <div className="auth-input-group">
                  <label>Official Email Address *</label>
                  <div className="input-with-icon">
                    <Mail size={17} className="field-icon" />
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
                  <div className="label-between-row">
                    <label>Password *</label>
                    <button
                      type="button"
                      className="inline-link-btn"
                      onClick={() => switchMode("forgot")}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="input-with-icon input-with-eye">
                    <Lock size={17} className="field-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* SVG SECURITY CAPTCHA CHALLENGE */}
                <CaptchaBox
                  svgDataUrl={captchaSvgUrl}
                  captchaAnswer={captchaAnswer}
                  setCaptchaAnswer={setCaptchaAnswer}
                  onRefresh={loadCaptchaChallenge}
                  loadingCaptcha={loadingCaptcha}
                />

                <button
                  type="submit"
                  className="auth-submit-btn cyber-auth-submit"
                  disabled={loading}
                  style={{
                    background: `linear-gradient(135deg, ${currentConfig.accent}, #2563eb)`
                  }}
                >
                  {loading ? (
                    "Verifying CAPTCHA & MongoDB Credentials..."
                  ) : (
                    <>
                      Verify &amp; Sign In <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* SAMPLE CREDENTIALS QUICK FILL */}
              <div className="sample-credentials-helper">
                <span className="helper-label">
                  <KeyRound size={13} /> Quick Fill Demo Credentials (Then Solve CAPTCHA):
                </span>
                <div className="credential-chips-row">
                  <button
                    type="button"
                    className="cred-chip-btn chip-citizen"
                    onClick={() => handleFillCredentials("PUBLIC")}
                  >
                    🚗 Citizen ({ROLE_PRESETS.PUBLIC.defaultEmail})
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
                    className="cred-chip-btn chip-admin"
                    onClick={() => handleFillCredentials("ADMIN")}
                  >
                    🛡️ Admin ({ROLE_PRESETS.ADMIN.defaultEmail})
                  </button>
                </div>
              </div>
            </>
          )}

          {/* =========================================== */}
          {/* VIEW 2: CONFIDENTIAL REGISTRATION (OTP +    */}
          {/* STRONG PASSWORD + POLICE ID + CAPTCHA)      */}
          {/* =========================================== */}
          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="auth-form">
              <div className="confidential-security-strip">
                <Lock size={14} className="text-emerald" />
                <span>
                  Confidential Signup: 12-Round Bcrypt • 6-Digit Email OTP • Anti-Bot CAPTCHA
                </span>
              </div>

              {activeRole === "AUTHORITY" && (
                <div className="police-verification-notice">
                  <FileBadge2 size={18} className="text-cyan" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Traffic Police Credential Verification Required</strong>
                    <p>
                      Officers must provide official Badge ID, Rank, Assigned Station, and upload an
                      ID/Warrant Card photo. Your account stays in <strong>PENDING</strong> status until an
                      Admin approves it.
                    </p>
                  </div>
                </div>
              )}

              {/* FULL NAME */}
              <div className="auth-input-group">
                <label>Full Official Name *</label>
                <div className="input-with-icon">
                  <User size={17} className="field-icon" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your complete name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              {/* EMAIL + SEND OTP BUTTON */}
              <div className="auth-input-group">
                <label>Official Email Address &amp; 6-Digit OTP Verification *</label>
                <div className="email-otp-action-row">
                  <div className="input-with-icon" style={{ flex: 1 }}>
                    <Mail size={17} className="field-icon" />
                    <input
                      type="email"
                      required
                      placeholder={currentConfig.defaultEmail}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="send-otp-btn"
                    onClick={() => handleSendOtp("REGISTER")}
                    disabled={otpSending || otpCooldown > 0}
                  >
                    <Send size={14} />
                    <span>
                      {otpSending
                        ? "Sending..."
                        : otpCooldown > 0
                          ? `Resend (${otpCooldown}s)`
                          : "Send OTP"}
                    </span>
                  </button>
                </div>
              </div>

              {/* VIRTUAL CONFIDENTIAL OTP INBOX DISPLAY */}
              {otpInfo && (
                <div className="otp-dispatch-card">
                  <div className="otp-dispatch-header">
                    <Sparkles size={14} className="text-emerald" />
                    <span>{otpInfo.message}</span>
                  </div>
                  {otpInfo.otpPreview && (
                    <div className="otp-preview-box">
                      <div>
                        <span className="otp-preview-label">Confidential Verification OTP:</span>
                        <strong className="otp-preview-code">{otpInfo.otpPreview}</strong>
                      </div>
                      <button
                        type="button"
                        className="otp-autofill-btn"
                        onClick={() => setOtpCode(otpInfo.otpPreview)}
                      >
                        <Copy size={12} /> Auto-fill Code
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* OTP CODE + PHONE */}
              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>Enter 6-Digit Email OTP *</label>
                  <div className="input-with-icon">
                    <KeyRound size={17} className="field-icon" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="6-digit OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Mobile Number</label>
                  <div className="input-with-icon">
                    <Phone size={17} className="field-icon" />
                    <input
                      type="tel"
                      placeholder="+91 98XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* CITY & STATE */}
              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>City / District</label>
                  <div className="input-with-icon">
                    <MapPin size={17} className="field-icon" />
                    <input
                      type="text"
                      placeholder="e.g. New Delhi, Jalandhar, Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>State / UT</label>
                  <div className="input-with-icon">
                    <Building size={17} className="field-icon" />
                    <input
                      type="text"
                      placeholder="e.g. Delhi, Punjab, Maharashtra"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* POLICE OFFICIAL CREDENTIALS SECTION */}
              {activeRole === "AUTHORITY" && (
                <div className="police-credentials-panel">
                  <div className="police-panel-title">
                    <Radio size={15} className="text-cyan" />
                    <span>Official Traffic Police Credentials</span>
                  </div>

                  <div className="form-row-split">
                    <div className="auth-input-group">
                      <label>Official Police Badge ID *</label>
                      <div className="input-with-icon">
                        <BadgeAlert size={17} className="field-icon" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. TP-8409"
                          value={badgeNumber}
                          onChange={(e) => setBadgeNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="auth-input-group">
                      <label>Official Police Rank *</label>
                      <select
                        value={rank}
                        onChange={(e) => setRank(e.target.value)}
                        className="auth-select-input"
                        required
                      >
                        {POLICE_RANKS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row-split">
                    <div className="auth-input-group">
                      <label>Police Station / Traffic Circle *</label>
                      <div className="input-with-icon">
                        <Building size={17} className="field-icon" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Connaught Place Traffic Circle"
                          value={stationName}
                          onChange={(e) => setStationName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="auth-input-group">
                      <label>Department / Wing</label>
                      <div className="input-with-icon">
                        <Shield size={17} className="field-icon" />
                        <input
                          type="text"
                          placeholder={currentConfig.defaultDept}
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* OFFICIAL POLICE ID PROOF UPLOAD */}
                  <div className="auth-input-group">
                    <label>Upload Official Police ID / Warrant Card Photo *</label>
                    {!idProofImage ? (
                      <label className="id-upload-dropzone">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleIdProofUpload}
                          hidden
                        />
                        <Upload size={20} className="text-cyan" />
                        <div>
                          <strong>
                            {idProofUploading
                              ? "Compressing ID Image..."
                              : "Click to upload Police ID Card (JPG / PNG / WEBP)"}
                          </strong>
                          <span>Auto-compressed and encrypted for Admin Review</span>
                        </div>
                      </label>
                    ) : (
                      <div className="id-proof-preview-card">
                        <img src={idProofImage} alt="Uploaded Police ID" />
                        <div className="id-proof-meta">
                          <span className="text-emerald">
                            <CheckCircle2 size={14} /> Official ID Photo Attached
                          </span>
                          <button
                            type="button"
                            className="remove-id-btn"
                            onClick={() => setIdProofImage("")}
                          >
                            <X size={14} /> Replace Photo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ADMIN OR PUBLIC OPTIONAL FIELDS */}
              {activeRole !== "AUTHORITY" && (
                <div className="form-row-split">
                  <div className="auth-input-group">
                    <label>Department / Commuter Profile</label>
                    <div className="input-with-icon">
                      <Building size={17} className="field-icon" />
                      <input
                        type="text"
                        placeholder={currentConfig.defaultDept}
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                  </div>

                  {activeRole === "ADMIN" && (
                    <div className="auth-input-group">
                      <label>Admin Clearance ID *</label>
                      <div className="input-with-icon">
                        <BadgeAlert size={17} className="field-icon" />
                        <input
                          type="text"
                          required
                          placeholder={currentConfig.badgePlaceholder}
                          value={badgeNumber}
                          onChange={(e) => setBadgeNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STRONG HARD PASSWORD + CONFIRM */}
              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>Hard Security Password *</label>
                  <div className="input-with-icon input-with-eye">
                    <Lock size={17} className="field-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Min 8 chars, A-Z, 0-9, !@#"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>
                    Confirm Password *
                    {confirmPassword && (
                      <span
                        className="match-indicator"
                        style={{ color: passwordsMatch ? "#10b981" : "#ef4444" }}
                      >
                        {passwordsMatch ? " ✓ Matched" : " ✗ Mismatch"}
                      </span>
                    )}
                  </label>
                  <div className="input-with-icon">
                    <Lock size={17} className="field-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter hard password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <PasswordStrengthMeter password={password} />

              {/* SECURITY CAPTCHA FOR REGISTRATION */}
              <CaptchaBox
                svgDataUrl={captchaSvgUrl}
                captchaAnswer={captchaAnswer}
                setCaptchaAnswer={setCaptchaAnswer}
                onRefresh={loadCaptchaChallenge}
                loadingCaptcha={loadingCaptcha}
              />

              <button
                type="submit"
                className="auth-submit-btn cyber-auth-submit"
                disabled={loading}
                style={{
                  background: `linear-gradient(135deg, ${currentConfig.accent}, #2563eb)`
                }}
              >
                {loading ? (
                  "Encrypting & Saving Account to MongoDB..."
                ) : (
                  <>
                    {activeRole === "AUTHORITY"
                      ? "Submit Police Registration for Admin Verification"
                      : "Create Confidential Account in MongoDB"}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* =========================================== */}
          {/* VIEW 3: FORGOT PASSWORD RESET WITH OTP      */}
          {/* =========================================== */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotResetSubmit} className="auth-form">
              <div className="auth-input-group">
                <label>Registered Email Address *</label>
                <div className="email-otp-action-row">
                  <div className="input-with-icon" style={{ flex: 1 }}>
                    <Mail size={17} className="field-icon" />
                    <input
                      type="email"
                      required
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="send-otp-btn"
                    onClick={() => handleSendOtp("PASSWORD_RESET")}
                    disabled={otpSending || otpCooldown > 0}
                  >
                    <Send size={14} />
                    <span>
                      {otpSending
                        ? "Sending..."
                        : otpCooldown > 0
                          ? `Wait (${otpCooldown}s)`
                          : "Send Reset OTP"}
                    </span>
                  </button>
                </div>
              </div>

              {otpInfo && (
                <div className="otp-dispatch-card">
                  <div className="otp-dispatch-header">
                    <Clock size={14} className="text-amber" />
                    <span>{otpInfo.message}</span>
                  </div>
                  {otpInfo.otpPreview && (
                    <div className="otp-preview-box">
                      <div>
                        <span className="otp-preview-label">Reset Verification OTP:</span>
                        <strong className="otp-preview-code">{otpInfo.otpPreview}</strong>
                      </div>
                      <button
                        type="button"
                        className="otp-autofill-btn"
                        onClick={() => setOtpCode(otpInfo.otpPreview)}
                      >
                        <Copy size={12} /> Auto-fill
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="auth-input-group">
                <label>6-Digit Recovery OTP *</label>
                <div className="input-with-icon">
                  <KeyRound size={17} className="field-icon" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>New Hard Password *</label>
                  <div className="input-with-icon input-with-eye">
                    <Lock size={17} className="field-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="New hard password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Confirm New Password *</label>
                  <div className="input-with-icon">
                    <Lock size={17} className="field-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <PasswordStrengthMeter password={password} />

              <button
                type="submit"
                className="auth-submit-btn cyber-auth-submit"
                disabled={loading}
                style={{ background: "linear-gradient(135deg, #06b6d4, #6366f1)" }}
              >
                {loading ? "Resetting Encrypted Password..." : "Verify OTP & Update Password"}
              </button>
            </form>
          )}

          {/* FOOTER */}
          <div className="auth-card-footer">
            {mode === "login" ? (
              <button
                type="button"
                className="toggle-auth-mode-btn"
                onClick={() => switchMode("register")}
              >
                New to FlowSense? Register confidentially with 6-Digit OTP Verification →
              </button>
            ) : (
              <button
                type="button"
                className="toggle-auth-mode-btn"
                onClick={() => switchMode("login")}
              >
                ← Back to Sign In with Email &amp; CAPTCHA
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
