import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchMyReports, sendOtp } from "../api";
import { compressImageFile } from "../utils/imageHelper";
import { evaluatePasswordStrength } from "../utils/passwordStrength";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { Link } from "react-router-dom";
import {
  User,
  Camera,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Car,
  HeartPulse,
  Building,
  FileBadge2,
  Lock,
  KeyRound,
  Send,
  Copy,
  Save,
  Trash2,
  FileText,
  ThumbsUp,
  Eye,
  EyeOff,
  Radio,
  Shield,
  Upload,
  X
} from "lucide-react";

function Profile() {
  const { user, updateProfile, changePassword, role } = useAuth();

  const [activeTab, setActiveTab] = useState("details"); // 'details' | 'security' | 'reports'
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  // Avatar state
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Profile Details Form State (initialized directly from authenticated user)
  const [name, setName] = useState(() => user?.name || "");
  const [phone, setPhone] = useState(() => user?.phone || "");
  const [city, setCity] = useState(() => user?.city || "");
  const [stateName, setStateName] = useState(() => user?.state || "");
  const [bio, setBio] = useState(() => user?.bio || "");
  const [emergencyContact, setEmergencyContact] = useState(() => user?.emergencyContact || "");
  const [vehicleInfo, setVehicleInfo] = useState(() => user?.vehicleInfo || "");
  const [department, setDepartment] = useState(() => user?.department || "");
  const [badgeNumber, setBadgeNumber] = useState(() => user?.badgeNumber || "");
  const [rank, setRank] = useState(() => user?.rank || "");
  const [stationName, setStationName] = useState(() => user?.stationName || "");
  const [idProofImage, setIdProofImage] = useState(() => user?.idProofImage || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpInfo, setOtpInfo] = useState(null);
  const [changingPwd, setChangingPwd] = useState(false);

  // My Incident Reports State
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");

  function handleSelectReportsTab() {
    setActiveTab("reports");
    if (!user) return;
    setLoadingReports(true);
    fetchMyReports()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setReports(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingReports(false));
  }

  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const t = setInterval(() => {
      setOtpCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  function notify(type, text) {
    setFeedback({ type, text });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setFeedback({ type: "", text: "" });
    try {
      const compressed = await compressImageFile(file, 480, 0.8);
      const res = await updateProfile({ avatar: compressed });
      if (res.success) {
        notify("success", "Profile photo updated and saved to MongoDB Atlas!");
      } else {
        notify("error", res.message || "Failed to save profile photo.");
      }
    } catch (err) {
      notify("error", err.message || "Could not upload image.");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUploading(true);
    try {
      const res = await updateProfile({ avatar: "" });
      if (res.success) {
        notify("success", "Profile photo removed.");
      }
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleIdProofUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 720, 0.8);
      setIdProofImage(compressed);
    } catch (err) {
      notify("error", err.message || "Could not process ID proof image.");
    } finally {
      e.target.value = "";
    }
  }

  async function handleSaveDetails(e) {
    e.preventDefault();
    if (!name.trim()) {
      notify("error", "Full Name cannot be empty.");
      return;
    }
    setSavingProfile(true);
    setFeedback({ type: "", text: "" });

    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        state: stateName.trim(),
        bio: bio.trim(),
        emergencyContact: emergencyContact.trim(),
        vehicleInfo: vehicleInfo.trim(),
        department: department.trim()
      };

      // Allow updating official police credentials only if not locked as VERIFIED
      if (role === "AUTHORITY" && user?.verificationStatus !== "VERIFIED") {
        payload.badgeNumber = badgeNumber.trim();
        payload.rank = rank.trim();
        payload.stationName = stationName.trim();
        payload.idProofImage = idProofImage;
      } else if (role === "ADMIN") {
        payload.badgeNumber = badgeNumber.trim();
        payload.rank = rank.trim();
        payload.stationName = stationName.trim();
      }

      const res = await updateProfile(payload);
      if (res.success) {
        notify("success", res.message || "Profile saved cleanly to MongoDB Atlas!");
      } else {
        notify("error", res.message || "Failed to update profile.");
      }
    } catch (err) {
      notify("error", "Profile update failed: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSendPasswordOtp() {
    if (!user?.email) return;
    setOtpSending(true);
    setFeedback({ type: "", text: "" });
    try {
      const res = await sendOtp(user.email, "PASSWORD_CHANGE");
      if (res.success) {
        setOtpInfo({
          message: res.message,
          otpPreview: res.otpPreview
        });
        setOtpCooldown(45);
      } else {
        notify("error", res.message || "Failed to send verification OTP.");
      }
    } catch (err) {
      notify("error", "OTP request failed: " + err.message);
    } finally {
      setOtpSending(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setFeedback({ type: "", text: "" });

    if (!currentPassword) {
      notify("error", "Please enter your current password.");
      return;
    }
    const strength = evaluatePasswordStrength(newPassword);
    if (!strength.valid) {
      notify("error", "New password must satisfy all 5 Enterprise Hard Password rules.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      notify("error", "New password and confirmation do not match.");
      return;
    }
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      notify("error", "Please request and enter the 6-digit security OTP.");
      return;
    }

    setChangingPwd(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        otpCode: otpCode.trim()
      });

      if (res.success) {
        notify("success", res.message || "Password updated & re-encrypted in MongoDB!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setOtpCode("");
        setOtpInfo(null);
      } else {
        notify("error", res.message || "Password change verification failed.");
      }
    } catch (err) {
      notify("error", "Failed to change password: " + err.message);
    } finally {
      setChangingPwd(false);
    }
  }

  const verStatus = user?.verificationStatus || "VERIFIED";
  const initials = (user?.name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="page-container profile-page-wrapper">
      {/* FEEDBACK BANNER */}
      {feedback.text && (
        <div
          className={
            feedback.type === "error" ? "auth-error-banner" : "auth-success-banner"
          }
          style={{ marginBottom: 20 }}
        >
          {feedback.type === "error" ? (
            <AlertTriangle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* TOP PROFILE IDENTITY HERO */}
      <section className="profile-hero-card cyber-glow-panel">
        <div className="panel-glow-corner corner-tl" />
        <div className="panel-glow-corner corner-br" />

        <div className="profile-hero-inner">
          {/* AVATAR & CAMERA UPLOAD */}
          <div className="profile-avatar-block">
            <div className="profile-avatar-ring">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-initials">{initials}</div>
              )}

              <label
                className="avatar-upload-fab"
                title="Upload or change profile photo"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                  hidden
                />
                <Camera size={16} />
              </label>
            </div>

            {user?.avatar && (
              <button
                type="button"
                className="remove-avatar-link"
                onClick={handleRemoveAvatar}
                disabled={avatarUploading}
              >
                <Trash2 size={12} /> Remove Photo
              </button>
            )}
          </div>

          {/* USER IDENTITY SUMMARY */}
          <div className="profile-identity-meta">
            <div className="profile-badges-row">
              <span className={`role-badge role-${role.toLowerCase()}`}>
                {role === "ADMIN" && <Shield size={12} />}
                {role === "AUTHORITY" && <Radio size={12} />}
                {role === "PUBLIC" && <User size={12} />}
                <span>
                  {role === "ADMIN"
                    ? "Global Administrator"
                    : role === "AUTHORITY"
                      ? "Traffic Police"
                      : "Verified Commuter"}
                </span>
              </span>

              {user?.isEmailVerified && (
                <span className="verified-chip chip-email-ok">
                  <Mail size={12} /> OTP Email Verified
                </span>
              )}

              {verStatus === "VERIFIED" && (
                <span className="verified-chip chip-status-verified">
                  <ShieldCheck size={13} /> Verified Account
                </span>
              )}
              {verStatus === "PENDING" && (
                <span className="verified-chip chip-status-pending">
                  <Clock size={13} /> Pending Admin Verification
                </span>
              )}
              {verStatus === "REJECTED" && (
                <span className="verified-chip chip-status-rejected">
                  <AlertTriangle size={13} /> Verification Rejected
                </span>
              )}
            </div>

            <h1>{user?.name}</h1>
            <p className="profile-email-line">
              <Mail size={14} /> {user?.email}
              {user?.city && (
                <>
                  {" "}
                  • <MapPin size={14} /> {user.city}
                  {user.state ? `, ${user.state}` : ""}
                </>
              )}
            </p>

            {verStatus === "PENDING" && role === "AUTHORITY" && (
              <div className="verification-pending-callout">
                <Clock size={16} className="text-amber" />
                <div>
                  <strong>Admin Badge &amp; ID Verification Pending:</strong> An Administrator is
                  reviewing your uploaded Police ID proof and Badge{" "}
                  <code>{user?.badgeNumber || "Pending"}</code>. Full Police Command access unlocks
                  immediately once verified.
                </div>
              </div>
            )}

            {verStatus === "REJECTED" && (
              <div className="verification-rejected-callout">
                <AlertTriangle size={16} className="text-rose" />
                <div>
                  <strong>Verification Rejected:</strong>{" "}
                  {user?.verificationNotes || "Please update your ID proof photo and contact Admin."}
                </div>
              </div>
            )}

            <div className="profile-telemetry-row">
              {user?.badgeNumber && (
                <div className="profile-stat-pill">
                  <span>Badge / Clearance ID</span>
                  <strong>{user.badgeNumber}</strong>
                </div>
              )}
              {user?.rank && (
                <div className="profile-stat-pill">
                  <span>Rank</span>
                  <strong>{user.rank}</strong>
                </div>
              )}
              {user?.stationName && (
                <div className="profile-stat-pill">
                  <span>Station</span>
                  <strong>{user.stationName}</strong>
                </div>
              )}
              <div className="profile-stat-pill">
                <span>Last Login</span>
                <strong>
                  {user?.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : "Active Session"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROFILE NAVIGATION TABS */}
      <div className="profile-tabs-bar">
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === "details" ? "active" : ""}`}
          onClick={() => setActiveTab("details")}
        >
          <User size={16} /> Profile Details &amp; ID
        </button>
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <Lock size={16} /> Password &amp; OTP Security
        </button>
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === "reports" ? "active" : ""}`}
          onClick={handleSelectReportsTab}
        >
          <FileText size={16} /> My Hazard Reports
        </button>
      </div>

      {/* ========================================= */}
      {/* TAB 1: PROFILE DETAILS UPDATION           */}
      {/* ========================================= */}
      {activeTab === "details" && (
        <section className="portal-card profile-content-card">
          <div className="portal-card-header">
            <div>
              <h2>Update Personal, Emergency &amp; Mobility Details</h2>
              <p>Changes are encrypted and synchronized in real time with MongoDB Atlas.</p>
            </div>
          </div>

          <form onSubmit={handleSaveDetails} className="profile-edit-form">
            <div className="form-row-split">
              <div className="auth-input-group">
                <label>Full Name *</label>
                <div className="input-with-icon">
                  <User size={16} className="field-icon" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Mobile Number</label>
                <div className="input-with-icon">
                  <Phone size={16} className="field-icon" />
                  <input
                    type="tel"
                    placeholder="+91 98XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-row-split">
              <div className="auth-input-group">
                <label>City / District</label>
                <div className="input-with-icon">
                  <MapPin size={16} className="field-icon" />
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
                  <Building size={16} className="field-icon" />
                  <input
                    type="text"
                    placeholder="e.g. Delhi, Punjab, Maharashtra"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-row-split">
              <div className="auth-input-group">
                <label>Vehicle / Transit Information</label>
                <div className="input-with-icon">
                  <Car size={16} className="field-icon" />
                  <input
                    type="text"
                    placeholder="e.g. White EV Sedan • DL-01-XX-4501"
                    value={vehicleInfo}
                    onChange={(e) => setVehicleInfo(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>SOS Emergency Contact (Name &amp; Phone)</label>
                <div className="input-with-icon">
                  <HeartPulse size={16} className="field-icon" />
                  <input
                    type="text"
                    placeholder="e.g. Family Contact - +91 98XXXXXXXX"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-row-split">
              <div className="auth-input-group">
                <label>Department / Commuter Profile</label>
                <div className="input-with-icon">
                  <Building size={16} className="field-icon" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Short Bio / Duty Summary</label>
                <input
                  type="text"
                  placeholder="Daily expressway commuter / Sector patrol lead..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </div>

            {/* POLICE OFFICIAL SECTION */}
            {(role === "AUTHORITY" || role === "ADMIN") && (
              <div className="police-credentials-panel" style={{ marginTop: 8 }}>
                <div className="police-panel-title">
                  <FileBadge2 size={16} className="text-cyan" />
                  <span>
                    Official Service Credentials{" "}
                    {role === "AUTHORITY" && verStatus === "VERIFIED"
                      ? "(Verified & Locked by Admin)"
                      : "(Editable While Pending/Review)"}
                  </span>
                </div>

                <div className="form-row-split">
                  <div className="auth-input-group">
                    <label>Badge / Clearance ID</label>
                    <input
                      type="text"
                      value={badgeNumber}
                      disabled={role === "AUTHORITY" && verStatus === "VERIFIED"}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                    />
                  </div>
                  <div className="auth-input-group">
                    <label>Rank</label>
                    <input
                      type="text"
                      value={rank}
                      disabled={role === "AUTHORITY" && verStatus === "VERIFIED"}
                      onChange={(e) => setRank(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Assigned Police Station / Headquarters</label>
                  <input
                    type="text"
                    value={stationName}
                    disabled={role === "AUTHORITY" && verStatus === "VERIFIED"}
                    onChange={(e) => setStationName(e.target.value)}
                  />
                </div>

                {role === "AUTHORITY" && (
                  <div className="auth-input-group">
                    <label>Official Police ID Proof Photo</label>
                    {idProofImage ? (
                      <div className="id-proof-preview-card">
                        <img
                          src={idProofImage}
                          alt="Police ID Proof"
                          onClick={() => setLightboxImage(idProofImage)}
                          style={{ cursor: "zoom-in" }}
                        />
                        <div className="id-proof-meta">
                          <span className="text-emerald">
                            <CheckCircle2 size={14} /> ID Card Stored in MongoDB
                          </span>
                          {verStatus !== "VERIFIED" && (
                            <label className="replace-id-label">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleIdProofUpload}
                                hidden
                              />
                              <Upload size={13} /> Replace Photo
                            </label>
                          )}
                        </div>
                      </div>
                    ) : (
                      <label className="id-upload-dropzone">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleIdProofUpload}
                          hidden
                        />
                        <Upload size={18} className="text-cyan" />
                        <div>
                          <strong>Upload Police ID Proof Photo</strong>
                          <span>Required for Administrator verification</span>
                        </div>
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="profile-form-actions">
              <button
                type="submit"
                className="cyber-submit-btn"
                disabled={savingProfile}
                style={{ width: "auto", minWidth: 240 }}
              >
                <Save size={17} />
                <span>{savingProfile ? "Saving to MongoDB..." : "Save Profile Changes"}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ========================================= */}
      {/* TAB 2: SECURITY & OTP PASSWORD CHANGE     */}
      {/* ========================================= */}
      {activeTab === "security" && (
        <section className="portal-card profile-content-card">
          <div className="portal-card-header">
            <div>
              <h2>Confidential Password Change &amp; 2FA Verification</h2>
              <p>
                Changing your password requires your current password, a live 6-digit OTP sent to{" "}
                <strong>{user?.email}</strong>, and an Enterprise Hard Password.
              </p>
            </div>
            <span className="live-pulse-badge emerald">Bcrypt 12-Round Protected</span>
          </div>

          <form onSubmit={handlePasswordSubmit} className="profile-edit-form">
            <div className="auth-input-group">
              <label>Current Password *</label>
              <div className="input-with-icon input-with-eye">
                <Lock size={16} className="field-icon" />
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  placeholder="Enter your existing password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-eye-btn"
                  onClick={() => setShowPwd(!showPwd)}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* OTP VERIFICATION STEP */}
            <div className="auth-input-group">
              <label>6-Digit Email OTP Verification *</label>
              <div className="email-otp-action-row">
                <div className="input-with-icon" style={{ flex: 1 }}>
                  <KeyRound size={16} className="field-icon" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <button
                  type="button"
                  className="send-otp-btn"
                  onClick={handleSendPasswordOtp}
                  disabled={otpSending || otpCooldown > 0}
                >
                  <Send size={14} />
                  <span>
                    {otpSending
                      ? "Sending..."
                      : otpCooldown > 0
                        ? `Wait (${otpCooldown}s)`
                        : "Send Security OTP"}
                  </span>
                </button>
              </div>
            </div>

            {otpInfo && (
              <div className="otp-dispatch-card">
                <div className="otp-dispatch-header">
                  <ShieldCheck size={14} className="text-emerald" />
                  <span>{otpInfo.message}</span>
                </div>
                {otpInfo.otpPreview && (
                  <div className="otp-preview-box">
                    <div>
                      <span className="otp-preview-label">Security Change OTP:</span>
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

            <div className="form-row-split">
              <div className="auth-input-group">
                <label>New Hard Password *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="field-icon" />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    placeholder="Min 8 chars, A-Z, 0-9, !@#"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Confirm New Password *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="field-icon" />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    placeholder="Re-enter new hard password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <PasswordStrengthMeter password={newPassword} />

            <div className="profile-form-actions">
              <button
                type="submit"
                className="cyber-submit-btn"
                disabled={changingPwd}
                style={{ width: "auto", minWidth: 260 }}
              >
                <ShieldCheck size={17} />
                <span>
                  {changingPwd
                    ? "Verifying OTP & Re-encrypting..."
                    : "Verify OTP & Change Password"}
                </span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ========================================= */}
      {/* TAB 3: MY SUBMITTED HAZARD REPORTS        */}
      {/* ========================================= */}
      {activeTab === "reports" && (
        <section className="portal-card profile-content-card">
          <div className="portal-card-header">
            <div>
              <h2>My Submitted Road Hazard Reports ({reports.length})</h2>
              <p>Real-time hazard reports linked to your account in MongoDB Atlas.</p>
            </div>
            <Link to="/report" className="btn-add-inline" style={{ textDecoration: "none" }}>
              + Report New Hazard
            </Link>
          </div>

          {loadingReports ? (
            <p style={{ color: "#94a3b8" }}>Loading your hazard reports from MongoDB...</p>
          ) : reports.length === 0 ? (
            <div className="empty-hazards-state">
              <AlertTriangle size={34} className="text-amber" />
              <p>You have not submitted any hazard reports from this account yet.</p>
              <Link to="/report" className="btn-add-inline" style={{ textDecoration: "none", marginTop: 10 }}>
                Submit Your First Hazard Report
              </Link>
            </div>
          ) : (
            <div className="my-reports-grid">
              {reports.map((rep) => (
                <div key={rep._id} className="my-report-card">
                  <div className="my-report-top">
                    <span className="incident-type-tag">{rep.type}</span>
                    <span className={`severity-tag sev-${rep.severity?.toLowerCase()}`}>
                      {rep.severity}
                    </span>
                    <span className={`status-pill status-${rep.status?.toLowerCase()}`}>
                      {rep.status}
                    </span>
                  </div>

                  <h4>{rep.roadName}</h4>
                  <p className="report-card-loc">
                    <MapPin size={13} /> {rep.city}
                    {rep.location ? ` • ${rep.location}` : ""}
                  </p>
                  {rep.description && <p className="report-card-desc">{rep.description}</p>}

                  {Array.isArray(rep.images) && rep.images.length > 0 && (
                    <div className="report-thumbs-row">
                      {rep.images.map((imgSrc, idx) => (
                        <img
                          key={idx}
                          src={imgSrc}
                          alt={`Evidence ${idx + 1}`}
                          onClick={() => setLightboxImage(imgSrc)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="my-report-foot">
                    <span>{new Date(rep.reportedAt || rep.createdAt).toLocaleString()}</span>
                    <span className="upvote-pill">
                      <ThumbsUp size={12} /> {rep.upvotes || 1} confirmed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* LIGHTBOX FOR VIEWING UPLOADED ID / INCIDENT PHOTOS */}
      {lightboxImage && (
        <div className="emergency-modal-overlay" onClick={() => setLightboxImage("")}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setLightboxImage("")}
            >
              <X size={18} />
            </button>
            <img src={lightboxImage} alt="Full Evidence Preview" />
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
