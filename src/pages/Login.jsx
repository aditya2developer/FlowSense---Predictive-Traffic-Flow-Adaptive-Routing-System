import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useCity } from "../context/CityContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchCaptcha, sendOtp, resetUserPassword } from "../api";
import { INDIA_STATES_AND_UTS, getCitiesForState } from "../utils/indiaLocations";
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
  Eye,
  EyeOff,
  Send,
  ShieldCheck,
  Upload,
  X,
  FileBadge2
} from "lucide-react";

const ROLE_PRESETS = {
  PUBLIC: {
    role: "PUBLIC",
    title: "Citizen & Commuter",
    subtitle: "Live routes, weather alerts, hazard reporting & city updates",
    icon: UserCheck,
    accent: "#10b981",
    ambient: "public-ambient",
    pillActiveClass: "role-pill-public-active",
    badgeLabel: "Commuter Account",
    deptPlaceholder: "Daily City Commuter"
  },
  AUTHORITY: {
    role: "AUTHORITY",
    title: "Traffic Police & Authority",
    subtitle: "Green corridor priority routing & live hazard dispatch",
    icon: Radio,
    accent: "#06b6d4",
    ambient: "authority-ambient",
    pillActiveClass: "role-pill-authority-active",
    badgeLabel: "Official ID & Admin Approval Required",
    deptPlaceholder: "City Traffic Police"
  },
  ADMIN: {
    role: "ADMIN",
    title: "System Administrator",
    subtitle: "Officer verification, data updates approval & system oversight",
    icon: Shield,
    accent: "#a855f7",
    ambient: "admin-ambient",
    pillActiveClass: "role-pill-admin-active",
    badgeLabel: "Administrator Clearance",
    deptPlaceholder: "Smart Mobility Operations"
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
  const { activeState, activeCity, selectCity } = useCity();
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

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState("");
  const [stateName, setStateName] = useState(() => activeState || "Delhi (NCT)");
  const [city, setCity] = useState(() => activeCity || "Delhi NCR");
  const [customCity, setCustomCity] = useState("");
  const [department, setDepartment] = useState("");

  // Police Credential Fields
  const [badgeNumber, setBadgeNumber] = useState("");
  const [rank, setRank] = useState("Traffic Inspector");
  const [stationName, setStationName] = useState("");
  const [idProofImage, setIdProofImage] = useState("");
  const [idProofUploading, setIdProofUploading] = useState(false);

  // CAPTCHA
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaSvgUrl, setCaptchaSvgUrl] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  // Email OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpSentMsg, setOtpSentMsg] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const availableCities = getCitiesForState(stateName);

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
      // ignore initial error
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

  useEffect(() => {
    if (isAuthenticated && user) {
      if (redirectTarget) navigate(redirectTarget);
      else if (user.role === "ADMIN") navigate("/admin");
      else if (user.role === "AUTHORITY") {
        navigate(user.verificationStatus === "PENDING" ? "/profile" : "/authority");
      } else navigate("/");
    }
  }, [isAuthenticated, user, redirectTarget, navigate]);

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
    setOtpSentMsg("");
    setOtpCode("");
    setConfirmPassword("");
    setCaptchaAnswer("");
  }

  function handleStateChange(nextState) {
    setStateName(nextState);
    const list = getCitiesForState(nextState);
    setCity(list[0]?.name || "Other");
    setCustomCity("");
  }

  async function handleSendOtp(purpose) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address first.");
      return;
    }

    setError("");
    setOtpSentMsg("");
    setOtpSending(true);
    try {
      const res = await sendOtp(cleanEmail, purpose);
      if (res.success) {
        setOtpSentMsg(res.message || `Verification OTP sent to ${cleanEmail}. Check your inbox.`);
        setOtpCooldown(45);
      } else {
        setError(res.message || "Unable to send verification email.");
      }
    } catch (err) {
      setError("Failed to contact verification service: " + err.message);
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
      setError(err.message || "Could not process uploaded ID image.");
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
        const preferredCity = res.user?.lastActiveCity || res.user?.city;
        const preferredState = res.user?.lastActiveState || res.user?.state || activeState;
        if (preferredCity) {
          selectCity({ state: preferredState, city: preferredCity });
        }
        setSuccessMsg(`Welcome back, ${res.user?.name}!`);
        setTimeout(() => {
          if (redirectTarget) navigate(redirectTarget);
          else if (res.user?.role === "ADMIN") navigate("/admin");
          else if (res.user?.role === "AUTHORITY") {
            navigate(res.user?.verificationStatus === "PENDING" ? "/profile" : "/authority");
          } else navigate("/");
        }, 600);
      } else {
        setError(res.message || "Invalid email, password, or CAPTCHA.");
        loadCaptchaChallenge();
      }
    } catch (err) {
      setError("Unable to sign in right now: " + err.message);
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
      setError("Full Name is required.");
      return;
    }

    const strength = evaluatePasswordStrength(password);
    if (!strength.valid) {
      setError("Please choose a stronger password meeting all 5 criteria.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setError("Please enter the 6-digit OTP sent to your email.");
      return;
    }

    const finalCity = city === "Other" ? customCity.trim() : city;
    if (!finalCity) {
      setError("Please select or enter your city.");
      return;
    }

    if (activeRole === "AUTHORITY") {
      if (!badgeNumber.trim() || !rank.trim() || !stationName.trim()) {
        setError("Police registration requires Official Badge ID, Rank, and Assigned Station.");
        return;
      }
      if (!idProofImage) {
        setError("Please upload your Official Police ID Card photo for Admin verification.");
        return;
      }
    }

    if (!captchaToken || !captchaAnswer.trim()) {
      setError("Please complete the CAPTCHA verification.");
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
        city: finalCity,
        state: stateName,
        department: department.trim() || ROLE_PRESETS[activeRole].deptPlaceholder,
        badgeNumber: activeRole === "PUBLIC" ? "" : badgeNumber.trim(),
        rank: activeRole === "AUTHORITY" ? rank.trim() : "",
        stationName: activeRole === "AUTHORITY" ? stationName.trim() : "",
        idProofImage: activeRole === "AUTHORITY" ? idProofImage : "",
        otpCode: otpCode.trim(),
        captchaToken,
        captchaAnswer: captchaAnswer.trim()
      });

      if (res.success) {
        selectCity({ state: stateName, city: finalCity });
        const isPendingPolice =
          res.user?.role === "AUTHORITY" && res.user?.verificationStatus === "PENDING";

        setSuccessMsg(
          isPendingPolice
            ? "Police registration submitted! Your ID and badge are pending Administrator verification."
            : `Registration complete! Welcome, ${res.user?.name}.`
        );

        setTimeout(() => {
          if (isPendingPolice) navigate("/profile");
          else if (res.user?.role === "ADMIN") navigate("/admin");
          else if (res.user?.role === "AUTHORITY") navigate("/authority");
          else navigate("/");
        }, 900);
      } else {
        setError(res.message || "Registration failed.");
        if (res.captchaFailed) {
          loadCaptchaChallenge();
        }
      }
    } catch (err) {
      setError("Unable to complete registration: " + err.message);
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
      setError("New password must meet all 5 security criteria.");
      return;
    }
    if (password !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setError("Please enter the 6-digit password reset OTP from your email.");
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
        setSuccessMsg(res.message || "Password updated! Please sign in with your new password.");
        setTimeout(() => {
          setPassword("");
          setConfirmPassword("");
          setOtpCode("");
          setOtpSentMsg("");
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

  const currentConfig = ROLE_PRESETS[activeRole];
  const IconComponent = currentConfig.icon;
  const passwordsMatch = Boolean(confirmPassword && password === confirmPassword);

  return (
    <div className={`auth-page-wrapper ${currentConfig.ambient}`}>
      <div className="auth-ambient-glow" />

      <div className={`auth-card-container ${mode === "register" ? "auth-card-wide" : ""}`}>
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

        <div className="auth-glass-card cyber-auth-card">
          <div className="panel-glow-corner corner-tl" />
          <div className="panel-glow-corner corner-br" />

          {/* MODE SWITCHER */}
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
              <ShieldCheck size={14} /> Register Account
            </button>
            <button
              type="button"
              className={`mode-switch-tab ${mode === "forgot" ? "mode-tab-active" : ""}`}
              onClick={() => switchMode("forgot")}
            >
              <KeyRound size={14} /> Forgot Password
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
              {mode === "forgot" ? "Email Account Recovery" : currentConfig.badgeLabel}
            </span>
            <h2>
              {mode === "login" && `Sign In — ${currentConfig.title}`}
              {mode === "register" && `Create ${currentConfig.title} Account`}
              {mode === "forgot" && "Reset Your Password"}
            </h2>
            <p>
              {mode === "forgot"
                ? "Verify your identity with a 6-digit OTP sent directly to your registered email."
                : currentConfig.subtitle}
            </p>
          </div>

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

          {/* SIGN IN */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="auth-form">
              <div className="auth-input-group">
                <label>Email Address *</label>
                <div className="input-with-icon">
                  <Mail size={17} className="field-icon" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
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
                {loading ? "Signing In..." : (
                  <>
                    Sign In <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* CONFIDENTIAL REGISTER */}
          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="auth-form">
              {activeRole === "AUTHORITY" && (
                <div className="police-verification-notice">
                  <FileBadge2 size={18} className="text-cyan" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Officer Verification Required</strong>
                    <p>
                      Police registrations and official ID uploads are reviewed by an Administrator
                      before command portal access is enabled.
                    </p>
                  </div>
                </div>
              )}

              <div className="auth-input-group">
                <label>Full Name *</label>
                <div className="input-with-icon">
                  <User size={17} className="field-icon" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Email Address (OTP Verification Required) *</label>
                <div className="email-otp-action-row">
                  <div className="input-with-icon" style={{ flex: 1 }}>
                    <Mail size={17} className="field-icon" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
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
                          : "Send Email OTP"}
                    </span>
                  </button>
                </div>
              </div>

              {otpSentMsg && (
                <div className="otp-dispatch-card">
                  <div className="otp-dispatch-header">
                    <Mail size={14} className="text-emerald" />
                    <span>{otpSentMsg}</span>
                  </div>
                </div>
              )}

              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>6-Digit Email OTP *</label>
                  <div className="input-with-icon">
                    <KeyRound size={17} className="field-icon" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Enter OTP from email"
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

              {/* STATE & CITY SELECTION */}
              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>State / Union Territory *</label>
                  <select
                    value={stateName}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="auth-select-input"
                    required
                  >
                    {INDIA_STATES_AND_UTS.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="auth-input-group">
                  <label>City / District *</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="auth-select-input"
                    required
                  >
                    {availableCities.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="Other">Other City / Town</option>
                  </select>
                </div>
              </div>

              {city === "Other" && (
                <div className="auth-input-group">
                  <label>Enter Your City / Town Name *</label>
                  <input
                    type="text"
                    required
                    placeholder={`Enter city in ${stateName}`}
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                  />
                </div>
              )}

              {activeRole === "AUTHORITY" && (
                <div className="police-credentials-panel">
                  <div className="police-panel-title">
                    <Radio size={15} className="text-cyan" />
                    <span>Official Traffic Police Details</span>
                  </div>

                  <div className="form-row-split">
                    <div className="auth-input-group">
                      <label>Official Badge ID *</label>
                      <div className="input-with-icon">
                        <BadgeAlert size={17} className="field-icon" />
                        <input
                          type="text"
                          required
                          placeholder="Enter Badge Number"
                          value={badgeNumber}
                          onChange={(e) => setBadgeNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="auth-input-group">
                      <label>Rank *</label>
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
                          placeholder="Station or circle name"
                          value={stationName}
                          onChange={(e) => setStationName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="auth-input-group">
                      <label>Department</label>
                      <div className="input-with-icon">
                        <Shield size={17} className="field-icon" />
                        <input
                          type="text"
                          placeholder={currentConfig.deptPlaceholder}
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label>Upload Official Police ID Card Photo *</label>
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
                              ? "Processing ID Image..."
                              : "Upload Police ID / Warrant Card Photo"}
                          </strong>
                          <span>Submitted confidentially for Administrator review</span>
                        </div>
                      </label>
                    ) : (
                      <div className="id-proof-preview-card">
                        <img src={idProofImage} alt="Uploaded ID" />
                        <div className="id-proof-meta">
                          <span className="text-emerald">
                            <CheckCircle2 size={14} /> ID Card Attached
                          </span>
                          <button
                            type="button"
                            className="remove-id-btn"
                            onClick={() => setIdProofImage("")}
                          >
                            <X size={14} /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeRole !== "AUTHORITY" && (
                <div className="form-row-split">
                  <div className="auth-input-group">
                    <label>Department / Commuter Profile</label>
                    <div className="input-with-icon">
                      <Building size={17} className="field-icon" />
                      <input
                        type="text"
                        placeholder={currentConfig.deptPlaceholder}
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                  </div>

                  {activeRole === "ADMIN" && (
                    <div className="auth-input-group">
                      <label>Administrator Clearance ID *</label>
                      <div className="input-with-icon">
                        <BadgeAlert size={17} className="field-icon" />
                        <input
                          type="text"
                          required
                          placeholder="Clearance ID"
                          value={badgeNumber}
                          onChange={(e) => setBadgeNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>Password *</label>
                  <div className="input-with-icon input-with-eye">
                    <Lock size={17} className="field-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Strong password"
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
                        {passwordsMatch ? " Matched" : " Mismatch"}
                      </span>
                    )}
                  </label>
                  <div className="input-with-icon">
                    <Lock size={17} className="field-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <PasswordStrengthMeter password={password} />

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
                {loading
                  ? "Creating Account..."
                  : activeRole === "AUTHORITY"
                    ? "Submit Police Application"
                    : "Create Verified Account"}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
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

              {otpSentMsg && (
                <div className="otp-dispatch-card">
                  <div className="otp-dispatch-header">
                    <Mail size={14} className="text-emerald" />
                    <span>{otpSentMsg}</span>
                  </div>
                </div>
              )}

              <div className="auth-input-group">
                <label>6-Digit Email OTP *</label>
                <div className="input-with-icon">
                  <KeyRound size={17} className="field-icon" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP from email"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>New Strong Password *</label>
                  <div className="input-with-icon input-with-eye">
                    <Lock size={17} className="field-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="New strong password"
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
                      placeholder="Confirm new password"
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
                {loading ? "Updating Password..." : "Verify Email OTP & Reset Password"}
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
                New to FlowSense? Create an account with Email OTP →
              </button>
            ) : (
              <button
                type="button"
                className="toggle-auth-mode-btn"
                onClick={() => switchMode("login")}
              >
                ← Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
