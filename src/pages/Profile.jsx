import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchMyReports, sendOtp, resetUserPassword } from "../api";
import { INDIA_STATES_AND_UTS } from "../utils/indiaLocations";
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
  const { user, updateProfile, changePassword, refreshUser, role } = useAuth();

  const [activeTab, setActiveTab] = useState("details"); // 'details' | 'security' | 'reports'
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Profile Details State
  const [name, setName] = useState(() => user?.name || "");
  const [phone, setPhone] = useState(() => user?.phone || "");
  const [city, setCity] = useState(() => user?.city || "");
  const [stateName, setStateName] = useState(() => user?.state || "Delhi (NCT)");
  const [bio, setBio] = useState(() => user?.bio || "");
  const [emergencyContact, setEmergencyContact] = useState(() => user?.emergencyContact || "");
  const [vehicleInfo, setVehicleInfo] = useState(() => user?.vehicleInfo || "");
  const [department, setDepartment] = useState(() => user?.department || "");
  const [badgeNumber, setBadgeNumber] = useState(() => user?.badgeNumber || "");
  const [rank, setRank] = useState(() => user?.rank || "");
  const [stationName, setStationName] = useState(() => user?.stationName || "");
  const [idProofImage, setIdProofImage] = useState(() => user?.idProofImage || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change & Forgot Password inside Profile
  const [securityMode, setSecurityMode] = useState("change"); // 'change' | 'forgot'
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpSentMsg, setOtpSentMsg] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  // Reports State
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setFeedback({ type: "", text: "" });
    try {
      const compressed = await compressImageFile(file, 480, 0.8);
      const res = await updateProfile({ avatar: compressed });
      if (res.success) {
        notify("success", res.message || "Profile photo submitted for verification.");
      } else {
        notify("error", res.message || "Failed to update profile photo.");
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
        notify("success", res.message || "Photo removal submitted.");
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
      notify("error", err.message || "Could not process ID image.");
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

      if (role === "AUTHORITY" || role === "ADMIN") {
        payload.badgeNumber = badgeNumber.trim();
        payload.rank = rank.trim();
        payload.stationName = stationName.trim();
        if (role === "AUTHORITY" && idProofImage) {
          payload.idProofImage = idProofImage;
        }
      }

      const res = await updateProfile(payload);
      if (res.success) {
        notify(
          "success",
          res.message || "Profile changes submitted for Administrator verification."
        );
      } else {
        notify("error", res.message || "Failed to submit profile update.");
      }
    } catch (err) {
      notify("error", "Profile update failed: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSendSecurityOtp() {
    if (!user?.email) return;
    setOtpSending(true);
    setOtpSentMsg("");
    setFeedback({ type: "", text: "" });
    const purpose = securityMode === "forgot" ? "PASSWORD_RESET" : "PASSWORD_CHANGE";
    try {
      const res = await sendOtp(user.email, purpose);
      if (res.success) {
        setOtpSentMsg(res.message || `6-digit verification code sent to ${user.email}.`);
        setOtpCooldown(45);
      } else {
        notify("error", res.message || "Unable to deliver email OTP.");
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

    const strength = evaluatePasswordStrength(newPassword);
    if (!strength.valid) {
      notify("error", "New password must satisfy all 5 password criteria.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      notify("error", "New password and confirmation do not match.");
      return;
    }
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      notify("error", "Please enter the 6-digit OTP sent to your email.");
      return;
    }

    setChangingPwd(true);
    try {
      let res;
      if (securityMode === "forgot") {
        res = await resetUserPassword({
          email: user.email,
          otpCode: otpCode.trim(),
          newPassword
        });
      } else {
        if (!currentPassword) {
          notify("error", "Please enter your current password or switch to Forgot Password.");
          setChangingPwd(false);
          return;
        }
        res = await changePassword({
          currentPassword,
          newPassword,
          otpCode: otpCode.trim()
        });
      }

      if (res.success) {
        notify("success", res.message || "Password updated securely!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setOtpCode("");
        setOtpSentMsg("");
        await refreshUser();
      } else {
        notify("error", res.message || "Password update verification failed.");
      }
    } catch (err) {
      notify("error", "Failed to update password: " + err.message);
    } finally {
      setChangingPwd(false);
    }
  }

  const verStatus = user?.verificationStatus || "VERIFIED";
  const pendingFields = user?.pendingProfileUpdates ? Object.keys(user.pendingProfileUpdates) : [];
  const initials = (user?.name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="page-container profile-page-wrapper">
      {feedback.text && (
        <div
          className={feedback.type === "error" ? "auth-error-banner" : "auth-success-banner"}
          style={{ marginBottom: 20 }}
        >
          {feedback.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* TOP PROFILE HERO */}
      <section className="profile-hero-card cyber-glow-panel">
        <div className="panel-glow-corner corner-tl" />
        <div className="panel-glow-corner corner-br" />

        <div className="profile-hero-inner">
          <div className="profile-avatar-block">
            <div className="profile-avatar-ring">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-initials">{initials}</div>
              )}

              <label className="avatar-upload-fab" title="Upload new profile photo">
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

          <div className="profile-identity-meta">
            <div className="profile-badges-row">
              <span className={`role-badge role-${role.toLowerCase()}`}>
                {role === "ADMIN" && <Shield size={12} />}
                {role === "AUTHORITY" && <Radio size={12} />}
                {role === "PUBLIC" && <User size={12} />}
                <span>
                  {role === "ADMIN"
                    ? "Administrator"
                    : role === "AUTHORITY"
                      ? "Traffic Police"
                      : "Commuter"}
                </span>
              </span>

              {user?.isEmailVerified && (
                <span className="verified-chip chip-email-ok">
                  <Mail size={12} /> Email Verified
                </span>
              )}

              {verStatus === "VERIFIED" && (
                <span className="verified-chip chip-status-verified">
                  <ShieldCheck size={13} /> Verified Account
                </span>
              )}
              {verStatus === "PENDING" && (
                <span className="verified-chip chip-status-pending">
                  <Clock size={13} /> Account Verification Pending
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
                  {" "}• <MapPin size={14} /> {user.city}
                  {user.state ? `, ${user.state}` : ""}
                </>
              )}
            </p>

            {/* ADMIN DATA UPDATE VERIFICATION CALLOUT */}
            {user?.profileUpdateStatus === "PENDING" && pendingFields.length > 0 && (
              <div className="verification-pending-callout">
                <Clock size={16} className="text-amber" />
                <div>
                  <strong>Data Update Pending Admin Verification:</strong> Your requested changes (
                  {pendingFields.join(", ")}) are queued for Administrator approval before taking
                  effect publicly.
                </div>
              </div>
            )}

            {user?.profileUpdateStatus === "REJECTED" && (
              <div className="verification-rejected-callout">
                <AlertTriangle size={16} className="text-rose" />
                <div>
                  <strong>Last Profile Update Declined:</strong>{" "}
                  {user?.profileUpdateNotes || "Please review your details and resubmit."}
                </div>
              </div>
            )}

            {verStatus === "PENDING" && role === "AUTHORITY" && (
              <div className="verification-pending-callout">
                <Clock size={16} className="text-amber" />
                <div>
                  <strong>Police Account Review Pending:</strong> An Administrator is reviewing your
                  official Badge &amp; ID proof before enabling Police Command access.
                </div>
              </div>
            )}

            <div className="profile-telemetry-row">
              {user?.badgeNumber && (
                <div className="profile-stat-pill">
                  <span>Badge ID</span>
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
                <span>Last Sign In</span>
                <strong>
                  {user?.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : "Current Session"}
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
          <User size={16} /> Personal &amp; Official Details
        </button>
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <Lock size={16} /> Password &amp; Forgot Password
        </button>
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === "reports" ? "active" : ""}`}
          onClick={handleSelectReportsTab}
        >
          <FileText size={16} /> My Hazard Reports
        </button>
      </div>

      {/* TAB 1: PROFILE DETAILS UPDATION (SENT TO ADMIN FOR VERIFICATION) */}
      {activeTab === "details" && (
        <section className="portal-card profile-content-card">
          <div className="portal-card-header">
            <div>
              <h2>Update Profile Details</h2>
              <p>
                {role === "ADMIN"
                  ? "Update your administrator account information."
                  : "All profile and credential changes are reviewed and verified by an Administrator."}
              </p>
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
                <label>State / Union Territory</label>
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="auth-select-input"
                >
                  {INDIA_STATES_AND_UTS.map((s) => (
                    <option key={s.state} value={s.state}>
                      {s.state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="auth-input-group">
                <label>City / District</label>
                <div className="input-with-icon">
                  <MapPin size={16} className="field-icon" />
                  <input
                    type="text"
                    placeholder="Enter your city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-row-split">
              <div className="auth-input-group">
                <label>Vehicle Information</label>
                <div className="input-with-icon">
                  <Car size={16} className="field-icon" />
                  <input
                    type="text"
                    placeholder="e.g. Sedan / Two-Wheeler"
                    value={vehicleInfo}
                    onChange={(e) => setVehicleInfo(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Emergency Contact (Name &amp; Phone)</label>
                <div className="input-with-icon">
                  <HeartPulse size={16} className="field-icon" />
                  <input
                    type="text"
                    placeholder="Emergency contact number"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-row-split">
              <div className="auth-input-group">
                <label>Department / Commuter Category</label>
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
                <label>About / Bio</label>
                <input
                  type="text"
                  placeholder="Optional bio or commute route notes"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </div>

            {(role === "AUTHORITY" || role === "ADMIN") && (
              <div className="police-credentials-panel" style={{ marginTop: 8 }}>
                <div className="police-panel-title">
                  <FileBadge2 size={16} className="text-cyan" />
                  <span>Official Credentials</span>
                </div>

                <div className="form-row-split">
                  <div className="auth-input-group">
                    <label>Badge / Officer ID</label>
                    <input
                      type="text"
                      value={badgeNumber}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                    />
                  </div>
                  <div className="auth-input-group">
                    <label>Rank</label>
                    <input
                      type="text"
                      value={rank}
                      onChange={(e) => setRank(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Assigned Police Station / Office</label>
                  <input
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                  />
                </div>

                {role === "AUTHORITY" && (
                  <div className="auth-input-group">
                    <label>Official ID Card Photo</label>
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
                            <CheckCircle2 size={14} /> ID Card Attached
                          </span>
                          <label className="replace-id-label">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleIdProofUpload}
                              hidden
                            />
                            <Upload size={13} /> Upload Updated ID
                          </label>
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
                          <strong>Upload Official ID Photo</strong>
                          <span>Submitted for Administrator review</span>
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
                style={{ width: "auto", minWidth: 250 }}
              >
                <Save size={17} />
                <span>
                  {savingProfile
                    ? "Submitting..."
                    : role === "ADMIN"
                      ? "Save Profile Changes"
                      : "Submit Changes for Admin Verification"}
                </span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 2: PASSWORD CHANGE & FORGOT PASSWORD VIA EMAIL OTP */}
      {activeTab === "security" && (
        <section className="portal-card profile-content-card">
          <div className="portal-card-header">
            <div>
              <h2>Password Security &amp; Recovery</h2>
              <p>
                Verify updates with a 6-digit OTP emailed directly to <strong>{user?.email}</strong>.
              </p>
            </div>
          </div>

          <div className="auth-mode-switch-bar" style={{ maxWidth: 460, marginBottom: 18 }}>
            <button
              type="button"
              className={`mode-switch-tab ${securityMode === "change" ? "mode-tab-active" : ""}`}
              onClick={() => {
                setSecurityMode("change");
                setOtpSentMsg("");
                setOtpCode("");
              }}
            >
              <Lock size={14} /> Change Password
            </button>
            <button
              type="button"
              className={`mode-switch-tab ${securityMode === "forgot" ? "mode-tab-active" : ""}`}
              onClick={() => {
                setSecurityMode("forgot");
                setOtpSentMsg("");
                setOtpCode("");
              }}
            >
              <KeyRound size={14} /> Forgot Current Password
            </button>
          </div>

          <form onSubmit={handlePasswordSubmit} className="profile-edit-form">
            {securityMode === "change" && (
              <div className="auth-input-group">
                <div className="label-between-row">
                  <label>Current Password *</label>
                  <button
                    type="button"
                    className="inline-link-btn"
                    onClick={() => setSecurityMode("forgot")}
                  >
                    Forgot current password? Reset via Email OTP
                  </button>
                </div>
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
            )}

            <div className="auth-input-group">
              <label>6-Digit Email OTP *</label>
              <div className="email-otp-action-row">
                <div className="input-with-icon" style={{ flex: 1 }}>
                  <KeyRound size={16} className="field-icon" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP from your email"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <button
                  type="button"
                  className="send-otp-btn"
                  onClick={handleSendSecurityOtp}
                  disabled={otpSending || otpCooldown > 0}
                >
                  <Send size={14} />
                  <span>
                    {otpSending
                      ? "Sending..."
                      : otpCooldown > 0
                        ? `Wait (${otpCooldown}s)`
                        : "Email Me OTP"}
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
                <label>New Strong Password *</label>
                <div className="input-with-icon input-with-eye">
                  <Lock size={16} className="field-icon" />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    placeholder="New strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

              <div className="auth-input-group">
                <label>Confirm New Password *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="field-icon" />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    placeholder="Confirm new password"
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
                style={{ width: "auto", minWidth: 250 }}
              >
                <ShieldCheck size={17} />
                <span>
                  {changingPwd
                    ? "Updating Password..."
                    : securityMode === "forgot"
                      ? "Verify Email OTP & Reset Password"
                      : "Verify Email OTP & Change Password"}
                </span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 3: MY REPORTS */}
      {activeTab === "reports" && (
        <section className="portal-card profile-content-card">
          <div className="portal-card-header">
            <div>
              <h2>My Submitted Road Hazard Reports ({reports.length})</h2>
              <p>Live status of hazards you have reported.</p>
            </div>
            <Link to="/report" className="btn-add-inline" style={{ textDecoration: "none" }}>
              + Report Hazard
            </Link>
          </div>

          {loadingReports ? (
            <p style={{ color: "#94a3b8" }}>Loading your hazard reports...</p>
          ) : reports.length === 0 ? (
            <div className="empty-hazards-state">
              <AlertTriangle size={34} className="text-amber" />
              <p>You have not submitted any hazard reports yet.</p>
              <Link to="/report" className="btn-add-inline" style={{ textDecoration: "none", marginTop: 10 }}>
                Report a Road Hazard
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
                          alt={`Hazard ${idx + 1}`}
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
            <img src={lightboxImage} alt="Preview" />
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
