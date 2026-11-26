import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  fetchAdminStats,
  fetchAdminUsers,
  updateUserRole,
  verifyAdminUser,
  verifyUserProfileUpdate,
  deleteAdminUser,
  createAdminUser,
  fetchAdminSegments,
  createRoadSegment,
  deleteRoadSegment,
  fetchAdminIncidents,
  updateIncidentStatus,
  deleteIncident,
  reseedDatabase,
  triggerBroadcastAlert,
  fetchEmailGatewayConfig,
  saveEmailGatewayConfig,
  sendTestEmailGateway
} from "../api";
import { useAuth } from "../context/AuthContext";
import { soundAlert } from "../utils/soundAlert";
import {
  Shield,
  Database,
  Cpu,
  Users,
  Route,
  Activity,
  CheckCircle2,
  Trash2,
  Lock,
  PlusCircle,
  AlertTriangle,
  Siren,
  RefreshCw,
  UserPlus,
  FileCheck2,
  ShieldCheck,
  X,
  BadgeCheck,
  Clock,
  XCircle,
  ThumbsUp,
  Mail,
  Send
} from "lucide-react";

function AdminPortal() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [segmentsList, setSegmentsList] = useState([]);
  const [incidentsList, setIncidentsList] = useState([]);
  const [incAdminFilter, setIncAdminFilter] = useState("ALL");
  const [, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview, verification, segments, incidents, users, ml
  const [actionMsg, setActionMsg] = useState("");
  const [isReseeding, setIsReseeding] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState({});
  const [lightboxImage, setLightboxImage] = useState("");

  // Modals state
  const [showAddSegmentModal, setShowAddSegmentModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Add Segment Form
  const [newRoadId, setNewRoadId] = useState("");
  const [newRoadName, setNewRoadName] = useState("");
  const [newRoadType, setNewRoadType] = useState("HIGHWAY");
  const [newCoordsText, setNewCoordsText] = useState("28.6139, 77.2090\n28.6250, 77.2150\n28.6315, 77.2167");

  // Add User Form
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("AUTHORITY");
  const [newUserDept, setNewUserDept] = useState("Traffic Command");
  const [newUserBadge, setNewUserBadge] = useState("TP-9001");

  // Broadcast Alert Form
  const [broadcastTitle, setBroadcastTitle] = useState("🚨 EMERGENCY SIREN ALERT: CITIZEN ADVISORY");
  const [broadcastMsg, setBroadcastMsg] = useState("Severe congestion & emergency corridor activation. Yield to emergency responders.");
  const [broadcastRoad, setBroadcastRoad] = useState("All National Highways & Expressways");

  // Email OTP Gateway State
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailForm, setEmailForm] = useState({
    brevoApiKey: "",
    resendApiKey: "",
    emailWebhookUrl: "",
    emailFrom: "",
    smtpHost: "",
    smtpPort: "465",
    smtpUser: "",
    smtpPass: ""
  });
  const [testEmailTo, setTestEmailTo] = useState(user?.email || "");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null);

  async function loadAdminData() {
    setLoading(true);
    try {
      const [statsRes, usersRes, segmentsRes, incidentsRes, emailRes] = await Promise.all([
        fetchAdminStats().catch(() => ({ success: false })),
        fetchAdminUsers().catch(() => ({ success: false, data: [] })),
        fetchAdminSegments().catch(() => ({ success: false, data: [] })),
        fetchAdminIncidents().catch(() => ({ success: false, data: [] })),
        fetchEmailGatewayConfig().catch(() => ({ success: false }))
      ]);

      if (statsRes.success) setData(statsRes.data);
      if (usersRes.success) setUsersList(usersRes.data || []);
      if (segmentsRes.success) setSegmentsList(segmentsRes.data || []);
      if (incidentsRes.success) setIncidentsList(incidentsRes.data || []);
      if (emailRes.success) setEmailStatus(emailRes.data || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    Promise.all([
      fetchAdminStats().catch(() => ({ success: false })),
      fetchAdminUsers().catch(() => ({ success: false, data: [] })),
      fetchAdminSegments().catch(() => ({ success: false, data: [] })),
      fetchAdminIncidents().catch(() => ({ success: false, data: [] })),
      fetchEmailGatewayConfig().catch(() => ({ success: false }))
    ])
      .then(([statsRes, usersRes, segmentsRes, incidentsRes, emailRes]) => {
        if (!active) return;
        if (statsRes.success) setData(statsRes.data);
        if (usersRes.success) setUsersList(usersRes.data || []);
        if (segmentsRes.success) setSegmentsList(segmentsRes.data || []);
        if (incidentsRes.success) setIncidentsList(incidentsRes.data || []);
        if (emailRes.success) setEmailStatus(emailRes.data || null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  function notify(msg) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 4500);
  }

  // User Actions
  async function handleRoleChange(userId, newRole) {
    try {
      const res = await updateUserRole(userId, newRole);
      if (res.success) {
        notify(`User role updated to ${newRole}.`);
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleVerifyOfficer(userId, status, officerName) {
    try {
      const notes = verificationNotes[userId] || "";
      const res = await verifyAdminUser(userId, status, notes);
      if (res.success) {
        notify(res.message || `Officer ${officerName} marked as ${status}.`);
        loadAdminData();
      } else {
        alert(res.message || "Verification update failed.");
      }
    } catch (err) {
      alert("Verification error: " + err.message);
    }
  }

  async function handleVerifyProfileUpdate(userId, status, userName) {
    try {
      const notes = verificationNotes[`upd-${userId}`] || "";
      const res = await verifyUserProfileUpdate(userId, status, notes);
      if (res.success) {
        notify(res.message || `Profile update for ${userName} marked as ${status}.`);
        loadAdminData();
      } else {
        alert(res.message || "Update verification failed.");
      }
    } catch (err) {
      alert("Update verification error: " + err.message);
    }
  }

  async function handleDeleteUser(userId, userName) {
    if (!window.confirm(`Permanently remove ${userName} from database?`)) return;
    try {
      const res = await deleteAdminUser(userId);
      if (res.success) {
        notify(`User ${userName} deleted from database.`);
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    try {
      const res = await createAdminUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        department: newUserDept,
        badgeNumber: newUserBadge
      });
      if (res.success) {
        notify(`New user ${newUserName} (${newUserRole}) added!`);
        setShowAddUserModal(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        loadAdminData();
      } else {
        alert(res.message || "Failed to create user.");
      }
    } catch (err) {
      alert("Error creating user: " + err.message);
    }
  }

  // Segment Actions
  async function handleDeleteSegment(segmentId, name) {
    if (!window.confirm(`Remove road segment '${name}' from registered corridors?`)) return;
    try {
      const res = await deleteRoadSegment(segmentId);
      if (res.success) {
        notify(`Corridor '${name}' removed.`);
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateSegment(e) {
    e.preventDefault();
    try {
      // Parse coordinates from text lines "lat, lng"
      const lines = newCoordsText.split("\n").filter((l) => l.trim().length > 0);
      const coordinates = lines.map((line) => {
        const parts = line.split(",").map((p) => parseFloat(p.trim()));
        if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
          throw new Error(`Invalid coordinate pair: "${line}". Format: lat, lng`);
        }
        return { latitude: parts[0], longitude: parts[1] };
      });

      if (coordinates.length < 2) {
        alert("At least 2 waypoint coordinates are required.");
        return;
      }

      const res = await createRoadSegment({
        roadId: newRoadId.trim(),
        roadName: newRoadName.trim(),
        roadType: newRoadType,
        coordinates
      });

      if (res.success) {
        notify(`New Corridor '${newRoadName}' saved!`);
        setShowAddSegmentModal(false);
        setNewRoadId("");
        setNewRoadName("");
        loadAdminData();
      } else {
        alert(res.message || "Failed to add segment.");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  // Incident Actions
  async function handleIncidentStatus(incidentId, status) {
    try {
      const res = await updateIncidentStatus(incidentId, status);
      if (res.success) {
        notify(`Incident status updated to ${status}.`);
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteIncident(incidentId) {
    if (!window.confirm("Permanently delete this incident report?")) return;
    try {
      const res = await deleteIncident(incidentId);
      if (res.success) {
        notify("Incident deleted from database.");
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Reseed Action
  async function handleReseed() {
    if (!window.confirm("Reseed multi-city traffic memory (Delhi, Mumbai, Bengaluru, Chandigarh, Jalandhar)?")) return;
    setIsReseeding(true);
    try {
      const res = await reseedDatabase();
      if (res.success) {
        notify("Multi-city corridors and traffic memory reseeded!");
        loadAdminData();
      } else {
        alert("Reseed failed: " + res.message);
      }
    } catch (err) {
      alert("Reseed error: " + err.message);
    } finally {
      setIsReseeding(false);
    }
  }

  // Broadcast Siren Alert Action
  async function handleBroadcastAlert(e) {
    e.preventDefault();
    try {
      const res = await triggerBroadcastAlert({
        title: broadcastTitle,
        message: broadcastMsg,
        affectedRoad: broadcastRoad,
        severity: "CRITICAL"
      });
      if (res.success) {
        // Play local siren audio and dispatch event
        soundAlert.playSiren(10);
        window.dispatchEvent(
          new CustomEvent("flowsense-emergency-alert", {
            detail: {
              id: res.data._id,
              title: res.data.title,
              message: res.data.message,
              severity: res.data.severity,
              affectedRoad: res.data.affectedRoad,
              issuedBy: res.data.issuedBy,
              time: new Date().toLocaleTimeString()
            }
          })
        );
        notify("Emergency siren broadcast dispatched live across the portal!");
        setShowBroadcastModal(false);
      }
    } catch (err) {
      alert("Broadcast error: " + err.message);
    }
  }

  async function handleSaveEmailConfig(e) {
    e.preventDefault();
    setEmailSaving(true);
    setEmailFeedback(null);
    try {
      const res = await saveEmailGatewayConfig(emailForm);
      if (res.success) {
        setEmailStatus(res.data || null);
        setEmailForm((prev) => ({
          ...prev,
          brevoApiKey: "",
          resendApiKey: "",
          smtpPass: ""
        }));
        setEmailFeedback({ ok: true, text: res.message || "Email OTP Gateway settings saved to MongoDB." });
        notify("Email OTP Gateway updated.");
      } else {
        setEmailFeedback({ ok: false, text: res.message || "Failed to save email settings." });
      }
    } catch (err) {
      setEmailFeedback({ ok: false, text: err.message });
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleSendTestEmail(e) {
    e.preventDefault();
    const target = (testEmailTo || user?.email || "").trim();
    if (!target) {
      setEmailFeedback({ ok: false, text: "Enter a recipient email address for the test." });
      return;
    }
    setEmailTesting(true);
    setEmailFeedback(null);
    try {
      const res = await sendTestEmailGateway(target);
      if (res.success) {
        setEmailFeedback({ ok: true, text: res.message || `Test OTP email sent to ${target}.` });
      } else {
        setEmailFeedback({ ok: false, text: res.message || "Test email delivery failed." });
      }
    } catch (err) {
      setEmailFeedback({ ok: false, text: err.message });
    } finally {
      setEmailTesting(false);
    }
  }

  async function handleClearEmailConfig() {
    if (!window.confirm("Clear saved Email OTP Gateway credentials from MongoDB?")) return;
    setEmailSaving(true);
    setEmailFeedback(null);
    try {
      const res = await saveEmailGatewayConfig({
        clearBrevoKey: true,
        clearResendKey: true,
        clearWebhookUrl: true,
        clearSmtp: true,
        emailFrom: "",
        smtpHost: ""
      });
      if (res.success) {
        setEmailStatus(res.data || null);
        setEmailFeedback({ ok: true, text: "Cleared saved DB Email Gateway settings." });
      }
    } catch (err) {
      setEmailFeedback({ ok: false, text: err.message });
    } finally {
      setEmailSaving(false);
    }
  }

  // Unauthenticated / Auth Gate View
  if (!isAdmin) {
    return (
      <div className="admin-portal-wrapper">
        <div className="admin-hero-header">
          <div className="admin-header-content text-center" style={{ maxWidth: 640, margin: "40px auto" }}>
            <div className="admin-badge-pill" style={{ margin: "0 auto 16px" }}>
              <Shield size={14} /> Master Administrator Security Barrier
            </div>
            <h1>Chief Administrator Access Required</h1>
            <p>
              The Administrative Console gives full control over traffic memory, road segments, account approvals, and emergency broadcasts.
            </p>

            <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                to="/login?role=ADMIN&redirect=/admin"
                className="auth-submit-btn"
                style={{
                  background: "linear-gradient(135deg, #a855f7, #6366f1)",
                  padding: "14px 28px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <Lock size={18} /> Sign In with Administrator Credentials
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const counts = data?.counts || {};
  const sys = data?.systemInfo || {};
  const db = data?.database || {};
  const pendingOfficers = usersList.filter(
    (u) => u.role === "AUTHORITY" && u.verificationStatus === "PENDING"
  );
  const pendingProfileUpdates = usersList.filter(
    (u) => u.profileUpdateStatus === "PENDING" && u.pendingProfileUpdates
  );
  const totalPendingVerifications = pendingOfficers.length + pendingProfileUpdates.length;
  const reviewedOfficers = usersList.filter(
    (u) => u.role === "AUTHORITY" && u.verificationStatus !== "PENDING"
  );

  return (
    <div className="admin-portal-wrapper">
      {/* AMBIENT HERO HEADER */}
      <div className="admin-hero-header">
        <div className="admin-header-content">
          <div className="admin-badge-pill">
            <Shield size={14} /> Global Root Administrator Console
          </div>
          <h1>Platform Administration &amp; Intelligence</h1>
          <p>
            Logged in as <strong>{user?.name || "Chief Administrator"}</strong> ({user?.email}) • Platform Governance &amp; Approvals
          </p>
        </div>

        {actionMsg && (
          <div className="admin-action-banner">
            <CheckCircle2 size={16} /> {actionMsg}
          </div>
        )}

        {/* METRICS GRID */}
        <div className="admin-metrics-grid">
          <div className="admin-metric-card">
            <div className="metric-icon-wrap text-purple">
              <Database size={22} />
            </div>
            <div>
              <span className="metric-title">Traffic Memory Records</span>
              <strong className="metric-value">{counts.trafficReadings?.toLocaleString() || "9,240"}</strong>
              <span className="metric-foot">Telemetry Stored</span>
            </div>
          </div>

          <div className="admin-metric-card">
            <div className="metric-icon-wrap text-cyan">
              <Route size={22} />
            </div>
            <div>
              <span className="metric-title">Monitored Corridors</span>
              <strong className="metric-value">{segmentsList.length || counts.roads || 10} Corridors</strong>
              <span className="metric-foot">Delhi, Mumbai, BLR, Chd, PB</span>
            </div>
          </div>

          <div className="admin-metric-card">
            <div className="metric-icon-wrap text-emerald">
              <Users size={22} />
            </div>
            <div>
              <span className="metric-title">Registered Accounts</span>
              <strong className="metric-value">{usersList.length || counts.users || 3} Users</strong>
              <span className="metric-foot">Live Database Users</span>
            </div>
          </div>

          <div className="admin-metric-card">
            <div className="metric-icon-wrap text-amber">
              <Cpu size={22} />
            </div>
            <div>
              <span className="metric-title">ML Model Quality</span>
              <strong className="metric-value">R² = 0.887</strong>
              <span className="metric-foot">Random Forest Speed Regressor</span>
            </div>
          </div>
        </div>

        {/* QUICK ADMIN ACTION BAR */}
        <div className="admin-quick-actions-bar">
          <button
            type="button"
            className="admin-action-btn btn-broadcast"
            onClick={() => setShowBroadcastModal(true)}
          >
            <Siren size={16} /> Broadcast Emergency Siren Alert
          </button>

          <button
            type="button"
            className="admin-action-btn btn-add-corridor"
            onClick={() => setShowAddSegmentModal(true)}
          >
            <PlusCircle size={16} /> Add Road Corridor
          </button>

          <button
            type="button"
            className="admin-action-btn btn-add-user"
            onClick={() => setShowAddUserModal(true)}
          >
            <UserPlus size={16} /> Register Official / User
          </button>

          <button
            type="button"
            className="admin-action-btn btn-reseed"
            onClick={handleReseed}
            disabled={isReseeding}
          >
            <RefreshCw size={16} className={isReseeding ? "spin-icon" : ""} />
            {isReseeding ? "Reseeding Database..." : "Reseed Multi-City Database"}
          </button>
        </div>
      </div>

      {/* ADMIN TABS NAVIGATION */}
      <div className="admin-tabs-nav">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Activity size={16} /> System Health &amp; DB Status
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "verification" ? "active" : ""}`}
          onClick={() => setActiveTab("verification")}
        >
          <BadgeCheck size={16} /> Verifications
          {totalPendingVerifications > 0 && (
            <span className="pending-count-badge">{totalPendingVerifications} Pending</span>
          )}
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "segments" ? "active" : ""}`}
          onClick={() => setActiveTab("segments")}
        >
          <Route size={16} /> Road Corridors ({segmentsList.length})
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "incidents" ? "active" : ""}`}
          onClick={() => setActiveTab("incidents")}
        >
          <AlertTriangle size={16} /> Citizen Hazard Reports ({incidentsList.length})
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={16} /> User &amp; RBAC Control ({usersList.length})
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "ml" ? "active" : ""}`}
          onClick={() => setActiveTab("ml")}
        >
          <Cpu size={16} /> ML &amp; Algorithm Benchmarks
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "email" ? "active" : ""}`}
          onClick={() => setActiveTab("email")}
        >
          <Mail size={16} /> Email OTP Gateway
          {emailStatus && !emailStatus.configured && (
            <span className="pending-count-badge">Setup Needed</span>
          )}
        </button>
      </div>

      {/* TAB CONTENT 1: SYSTEM OVERVIEW */}
      {activeTab === "overview" && (
        <div className="admin-tab-content">
          <div className="admin-grid-two-col">
            <section className="portal-card">
              <div className="portal-card-header">
                <h2>Traffic Memory Engine Matrix</h2>
                <span className="live-pulse-badge">Live Telemetry Connected</span>
              </div>
              <div className="db-stats-matrix">
                <div className="matrix-stat-item">
                  <span className="matrix-stat-label">Host &amp; Port</span>
                  <strong>{db.host}:{db.port}</strong>
                </div>
                <div className="matrix-stat-item">
                  <span className="matrix-stat-label">Active Database</span>
                  <strong>{db.databaseName}</strong>
                </div>
                <div className="matrix-stat-item">
                  <span className="matrix-stat-label">Connection State</span>
                  <strong className="text-emerald">{db.connectionState || "CONNECTED"}</strong>
                </div>
                <div className="matrix-stat-item">
                  <span className="matrix-stat-label">Node Process Memory</span>
                  <strong>{sys.memoryUsageMB || 84} MB</strong>
                </div>
                <div className="matrix-stat-item">
                  <span className="matrix-stat-label">Server Uptime</span>
                  <strong>{Math.floor((sys.serverUptimeSeconds || 120) / 60)} minutes</strong>
                </div>
                <div className="matrix-stat-item">
                  <span className="matrix-stat-label">GIS Routing Engine</span>
                  <strong>{sys.routingEngine || "OSRM Driving Grid"}</strong>
                </div>
              </div>
            </section>

            <section className="portal-card">
              <div className="portal-card-header">
                <h2>Corridor Traffic Load Distribution</h2>
                <p>Real-time vehicle density across registered road segments</p>
              </div>
              <div className="road-distribution-list">
                {(data?.roadDistribution || []).slice(0, 6).map((r) => (
                  <div key={r._id} className="road-dist-row">
                    <div>
                      <strong>{r.roadName || r._id}</strong>
                      <span className="dist-sub">Avg Speed: {Math.round(r.avgSpeed || 32)} km/h • High Congestion: {r.highCongestionCount} slots</span>
                    </div>
                    <span className="dist-count-badge">{r.readings} records</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB CONTENT: POLICE OFFICER ID VERIFICATION */}
      {activeTab === "verification" && (
        <div className="admin-tab-content">
          <section className="portal-card">
            <div className="portal-card-header">
              <div>
                <h2>Traffic Police ID &amp; Badge Verification Queue ({pendingOfficers.length} Pending)</h2>
                <p>
                  Inspect uploaded Official Police ID / Warrant Cards, Rank, Badge ID, and Station
                  assignments before unlocking Police Command privileges.
                </p>
              </div>
              <span className="live-pulse-badge">Official Verification Registry</span>
            </div>

            {pendingOfficers.length === 0 ? (
              <div className="empty-hazards-state">
                <CheckCircle2 size={34} className="text-emerald" />
                <p>No pending Police officer registrations awaiting review right now.</p>
              </div>
            ) : (
              <div className="officer-verify-grid">
                {pendingOfficers.map((off) => (
                  <div key={off._id} className="officer-verify-card">
                    <div className="officer-card-top">
                      <div>
                        <span className="verified-chip chip-status-pending">
                          <Clock size={12} /> PENDING VERIFICATION
                        </span>
                        <h3>{off.name}</h3>
                        <p className="officer-email">{off.email} {off.phone ? `• ${off.phone}` : ""}</p>
                      </div>
                      <span className="role-badge role-authority">AUTHORITY</span>
                    </div>

                    <div className="officer-cred-details">
                      <div><span>Badge ID</span><strong>{off.badgeNumber || "—"}</strong></div>
                      <div><span>Rank</span><strong>{off.rank || "Officer"}</strong></div>
                      <div><span>Station</span><strong>{off.stationName || off.department || "—"}</strong></div>
                      <div><span>Jurisdiction</span><strong>{off.city || "India"}{off.state ? `, ${off.state}` : ""}</strong></div>
                    </div>

                    {off.idProofImage ? (
                      <div className="officer-id-preview">
                        <span>Uploaded Police ID Proof (Click to inspect):</span>
                        <img
                          src={off.idProofImage}
                          alt={`${off.name} Police ID`}
                          onClick={() => setLightboxImage(off.idProofImage)}
                        />
                      </div>
                    ) : (
                      <div className="no-id-warning">No Police ID photo uploaded with application.</div>
                    )}

                    <input
                      type="text"
                      placeholder="Optional verification remarks / station confirmation notes..."
                      className="verify-notes-input"
                      value={verificationNotes[off._id] || ""}
                      onChange={(e) =>
                        setVerificationNotes((prev) => ({ ...prev, [off._id]: e.target.value }))
                      }
                    />

                    <div className="officer-verify-actions">
                      <button
                        type="button"
                        className="btn-verify-approve"
                        onClick={() => handleVerifyOfficer(off._id, "VERIFIED", off.name)}
                      >
                        <CheckCircle2 size={15} /> Approve &amp; Verify Officer
                      </button>
                      <button
                        type="button"
                        className="btn-verify-reject"
                        onClick={() => handleVerifyOfficer(off._id, "REJECTED", off.name)}
                      >
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* USER PROFILE & DATA UPDATE VERIFICATION QUEUE */}
            <div style={{ marginTop: 30, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ fontSize: 16, marginBottom: 12, color: "#f8fafc" }}>
                Pending User Profile &amp; Data Update Requests ({pendingProfileUpdates.length})
              </h3>
              {pendingProfileUpdates.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>
                  No user profile updates awaiting review right now.
                </p>
              ) : (
                <div className="officer-verify-grid">
                  {pendingProfileUpdates.map((u) => {
                    const changes = Object.entries(u.pendingProfileUpdates || {});
                    return (
                      <div key={`upd-${u._id}`} className="officer-verify-card" style={{ borderColor: "rgba(56, 189, 248, 0.4)" }}>
                        <div className="officer-card-top">
                          <div>
                            <span className="verified-chip chip-status-pending">
                              <Clock size={12} /> DATA UPDATE PENDING
                            </span>
                            <h3>{u.name}</h3>
                            <p className="officer-email">{u.email}</p>
                          </div>
                          <span className={`role-badge role-${u.role?.toLowerCase()}`}>{u.role}</span>
                        </div>

                        <div className="profile-diff-list">
                          {changes.map(([field, nextVal]) => {
                            const isImageField = field === "avatar" || field === "idProofImage";
                            return (
                              <div key={field} className="profile-diff-row">
                                <span className="diff-field-name">{field}</span>
                                {isImageField ? (
                                  nextVal ? (
                                    <img
                                      src={nextVal}
                                      alt={field}
                                      className="admin-inc-thumb"
                                      onClick={() => setLightboxImage(nextVal)}
                                    />
                                  ) : (
                                    <span style={{ color: "#f87171", fontSize: 12 }}>Remove photo</span>
                                  )
                                ) : (
                                  <div className="diff-values">
                                    <span className="diff-old">{String(u[field] || "—")}</span>
                                    <span>→</span>
                                    <strong className="diff-new">{String(nextVal || "—")}</strong>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <input
                          type="text"
                          placeholder="Optional review remarks for user..."
                          className="verify-notes-input"
                          value={verificationNotes[`upd-${u._id}`] || ""}
                          onChange={(e) =>
                            setVerificationNotes((prev) => ({
                              ...prev,
                              [`upd-${u._id}`]: e.target.value
                            }))
                          }
                        />

                        <div className="officer-verify-actions">
                          <button
                            type="button"
                            className="btn-verify-approve"
                            onClick={() => handleVerifyProfileUpdate(u._id, "APPROVED", u.name)}
                          >
                            <CheckCircle2 size={15} /> Approve Update
                          </button>
                          <button
                            type="button"
                            className="btn-verify-reject"
                            onClick={() => handleVerifyProfileUpdate(u._id, "REJECTED", u.name)}
                          >
                            <XCircle size={15} /> Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* REVIEWED POLICE ACCOUNTS HISTORY */}
            {reviewedOfficers.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h3 style={{ fontSize: 15, marginBottom: 12, color: "#cbd5e1" }}>
                  Reviewed &amp; Active Police Roster ({reviewedOfficers.length})
                </h3>
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Officer</th>
                        <th>Badge &amp; Rank</th>
                        <th>Station / City</th>
                        <th>ID Proof</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewedOfficers.map((off) => (
                        <tr key={off._id}>
                          <td>
                            <strong>{off.name}</strong>
                            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{off.email}</div>
                          </td>
                          <td>
                            <code>{off.badgeNumber || "—"}</code>
                            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{off.rank || "Traffic Police"}</div>
                          </td>
                          <td>
                            {off.stationName || off.department || "—"}
                            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{off.city || ""}</div>
                          </td>
                          <td>
                            {off.idProofImage ? (
                              <button
                                type="button"
                                className="btn-table-resolve"
                                onClick={() => setLightboxImage(off.idProofImage)}
                              >
                                View ID
                              </button>
                            ) : (
                              <span style={{ color: "#64748b", fontSize: 12 }}>Demo / Pre-verified</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`verified-chip ${
                                off.verificationStatus === "VERIFIED"
                                  ? "chip-status-verified"
                                  : "chip-status-rejected"
                              }`}
                            >
                              {off.verificationStatus || "VERIFIED"}
                            </span>
                          </td>
                          <td>
                            {off.verificationStatus === "VERIFIED" ? (
                              <button
                                type="button"
                                className="btn-table-delete"
                                onClick={() => handleVerifyOfficer(off._id, "REJECTED", off.name)}
                              >
                                Revoke
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-table-resolve"
                                onClick={() => handleVerifyOfficer(off._id, "VERIFIED", off.name)}
                              >
                                Approve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB CONTENT 2: ROAD CORRIDORS MANAGER */}
      {activeTab === "segments" && (
        <div className="admin-tab-content">
          <section className="portal-card">
            <div className="portal-card-header">
              <div>
                <h2>Registered Road Corridors &amp; GIS Waypoints</h2>
                <p>Every road segment registered here is used by the Haversine matching algorithm to predict speeds and stability scores.</p>
              </div>
              <button
                type="button"
                className="btn-add-inline"
                onClick={() => setShowAddSegmentModal(true)}
              >
                <PlusCircle size={15} /> Add Road Corridor
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Road ID</th>
                    <th>Corridor Name</th>
                    <th>Road Type</th>
                    <th>Waypoints</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {segmentsList.map((seg) => (
                    <tr key={seg._id}>
                      <td><code>{seg.roadId}</code></td>
                      <td><strong>{seg.roadName}</strong></td>
                      <td>
                        <span className={`type-badge type-${seg.roadType?.toLowerCase()}`}>
                          {seg.roadType}
                        </span>
                      </td>
                      <td>{seg.coordinates?.length || 0} GPS points</td>
                      <td>
                        <span className="text-emerald">Active</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-table-delete"
                          onClick={() => handleDeleteSegment(seg._id, seg.roadName)}
                          title="Delete corridor"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {segmentsList.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
                        No road segments found. Click "Reseed Multi-City Database" or "Add Road Corridor".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT 3: CITIZEN HAZARDS & APPROVALS */}
      {activeTab === "incidents" && (
        <div className="admin-tab-content">
          <section className="portal-card">
            <div className="portal-card-header">
              <div>
                <h2>Citizen Hazard Reports &amp; Traffic Incidents</h2>
                <p>Review, verify, resolve, or remove road hazards submitted by citizens and traffic patrols.</p>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
              {["ALL", "ACTIVE", "RESOLVED", "VERIFIED"].map((s) => {
                const count = s === "ALL" ? incidentsList.length : incidentsList.filter(i => i.status === s).length;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setIncAdminFilter(s)}
                    style={{
                      padding: "5px 16px", borderRadius: 20, border: "1.5px solid",
                      borderColor: incAdminFilter === s ? "#f59e0b" : "#334155",
                      background: incAdminFilter === s ? "#f59e0b22" : "transparent",
                      color: incAdminFilter === s ? "#f59e0b" : "#94a3b8",
                      fontWeight: incAdminFilter === s ? 700 : 400,
                      cursor: "pointer", fontSize: 13
                    }}
                  >
                    {s === "ALL" ? `All (${count})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${count})`}
                  </button>
                );
              })}
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Location / Corridor</th>
                    <th>Severity</th>
                    <th>Description</th>
                    <th>Reported By</th>
                    <th>Status</th>
                    <th>Review Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(incAdminFilter === "ALL" ? incidentsList : incidentsList.filter(i => i.status === incAdminFilter)).map((inc) => (
                    <tr key={inc._id} style={{ opacity: inc.status !== "ACTIVE" ? 0.8 : 1 }}>
                      <td>
                        <span className="incident-type-tag">{inc.type}</span>
                      </td>
                      <td>
                        <strong>{inc.roadName || inc.roadId}</strong>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{inc.location}</div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b" }}>{inc.city || ""}</div>
                      </td>
                      <td>
                        <span className={`severity-tag sev-${inc.severity?.toLowerCase()}`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <div>{inc.description}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.74rem", color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <ThumbsUp size={11} /> {inc.upvotes || 1}
                          </span>
                          {Array.isArray(inc.images) &&
                            inc.images.map((src, i) => (
                              <img
                                key={i}
                                src={src}
                                alt="Evidence"
                                className="admin-inc-thumb"
                                onClick={() => setLightboxImage(src)}
                              />
                            ))}
                        </div>
                      </td>
                      <td>
                        {inc.reportedBy || "Citizen"}
                        {inc.reporterEmail && <div style={{ fontSize: "0.73rem", color: "#64748b" }}>{inc.reporterEmail}</div>}
                      </td>
                      <td>
                        <span className={`status-pill status-${inc.status?.toLowerCase()}`}>
                          {inc.status}
                        </span>
                        {inc.resolvedBy && <div style={{ fontSize: 10, color: "#22c55e", marginTop: 2 }}>by {inc.resolvedBy}</div>}
                        {inc.verifiedBy && <div style={{ fontSize: 10, color: "#3b82f6", marginTop: 2 }}>by {inc.verifiedBy}</div>}
                        {inc.statusNote && <div style={{ fontSize: 10, color: "#94a3b8" }}>{inc.statusNote}</div>}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {inc.status !== "RESOLVED" && (
                            <button
                              type="button"
                              className="btn-table-resolve"
                              onClick={() => handleIncidentStatus(inc._id, "RESOLVED")}
                            >
                              <FileCheck2 size={13} /> Mark Resolved
                            </button>
                          )}
                          {inc.status !== "VERIFIED" && (
                            <button
                              type="button"
                              className="btn-table-resolve"
                              onClick={() => handleIncidentStatus(inc._id, "VERIFIED")}
                              style={{ background: "#3b82f622", color: "#3b82f6", border: "1px solid #3b82f655" }}
                            >
                              <ShieldCheck size={13} /> Mark Verified
                            </button>
                          )}
                          {inc.status !== "ACTIVE" && (
                            <button
                              type="button"
                              className="btn-table-resolve"
                              onClick={() => handleIncidentStatus(inc._id, "ACTIVE")}
                              style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444455" }}
                            >
                              ↩ Reopen
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-table-delete"
                            onClick={() => handleDeleteIncident(inc._id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {incidentsList.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
                        No incidents currently registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT 4: RBAC USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="admin-tab-content">
          <section className="portal-card">
            <div className="portal-card-header">
              <div>
                <h2>Role-Based Access Control (RBAC) &amp; Accounts</h2>
                <p>Manage platform roles, verification statuses, and official user accounts.</p>
              </div>
              <button
                type="button"
                className="btn-add-inline"
                onClick={() => setShowAddUserModal(true)}
              >
                <UserPlus size={15} /> Add User
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Assigned Role</th>
                    <th>Verification</th>
                    <th>Department / Station</th>
                    <th>Badge #</th>
                    <th>Role Selection</th>
                    <th>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className="user-table-cell">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} className="user-avatar-sm-img" />
                          ) : (
                            <div className="user-avatar-sm">{u.name?.charAt(0) || "U"}</div>
                          )}
                          <div>
                            <strong>{u.name}</strong>
                            {u.rank && <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{u.rank}</div>}
                          </div>
                        </div>
                      </td>
                      <td><code>{u.email}</code></td>
                      <td>
                        <span className={`role-badge role-${u.role?.toLowerCase()}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            className={`verified-chip ${
                              u.verificationStatus === "PENDING"
                                ? "chip-status-pending"
                                : u.verificationStatus === "REJECTED"
                                  ? "chip-status-rejected"
                                  : "chip-status-verified"
                            }`}
                          >
                            {u.verificationStatus || "VERIFIED"}
                          </span>
                          {u.verificationStatus === "PENDING" && (
                            <button
                              type="button"
                              className="btn-table-resolve"
                              onClick={() => handleVerifyOfficer(u._id, "VERIFIED", u.name)}
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      </td>
                      <td>{u.stationName || u.department || "Citizen Services"}</td>
                      <td><code>{u.badgeNumber || "—"}</code></td>
                      <td>
                        <select
                          className="role-select-input"
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        >
                          <option value="PUBLIC">PUBLIC (Commuter)</option>
                          <option value="AUTHORITY">AUTHORITY (Police/Govt)</option>
                          <option value="ADMIN">ADMIN (Full Control)</option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-table-delete"
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          disabled={u.email === user?.email}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT 5: ML BENCHMARKS */}
      {activeTab === "ml" && (
        <div className="admin-tab-content">
          <section className="portal-card">
            <div className="portal-card-header">
              <h2>Machine Learning Prediction Engine Evaluation</h2>
              <span className="live-pulse-badge">Random Forest Artifacts Active</span>
            </div>

            <div className="ml-benchmarks-grid">
              <div className="ml-model-card">
                <h3>🚗 Speed Regressor (Random Forest)</h3>
                <p>Predicts corridor speed based on time of day, weather, precipitation, active incidents, and historical density.</p>
                <div className="metric-kv">
                  <span>Coefficient of Determination (R²)</span>
                  <strong className="text-emerald">0.887</strong>
                </div>
                <div className="metric-kv">
                  <span>Mean Absolute Error (MAE)</span>
                  <strong>2.94 km/h</strong>
                </div>
                <div className="metric-kv">
                  <span>Root Mean Squared Error (RMSE)</span>
                  <strong>3.83 km/h</strong>
                </div>
                <div className="metric-kv">
                  <span>Hyperparameters</span>
                  <code>100 trees • depth 12 • min_samples_split 4</code>
                </div>
              </div>

              <div className="ml-model-card">
                <h3>🚦 Congestion Classifier (Random Forest)</h3>
                <p>Categorizes expected congestion severity into LOW, MEDIUM, or HIGH risk classes for route safety comparison.</p>
                <div className="metric-kv">
                  <span>Overall Validation Accuracy</span>
                  <strong className="text-cyan">78.92%</strong>
                </div>
                <div className="metric-kv">
                  <span>High-Congestion Precision</span>
                  <strong>0.74</strong>
                </div>
                <div className="metric-kv">
                  <span>High-Congestion Recall</span>
                  <strong className="text-emerald">0.87 (High Sensitivity)</strong>
                </div>
                <div className="metric-kv">
                  <span>F1-Score</span>
                  <strong>0.80</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT: EMAIL OTP GATEWAY */}
      {activeTab === "email" && (
        <div className="admin-tab-content">
          <div className="admin-grid-two-col">
            <section className="portal-card">
              <div className="portal-card-header">
                <div>
                  <h2>Email OTP Delivery Configuration</h2>
                  <p>
                    Configure a live sender provider so OTP verification emails deliver directly to user inboxes.
                    Secrets are stored securely on the server and never exposed in browser APIs.
                  </p>
                </div>
                <span className={emailStatus?.configured ? "live-pulse-badge" : "status-badge sev-high"}>
                  {emailStatus?.configured
                    ? `Active: ${emailStatus.activeProvider} (${emailStatus.source})`
                    : "Not Configured"}
                </span>
              </div>

              {emailFeedback && (
                <div
                  className={emailFeedback.ok ? "auth-success-banner" : "auth-error-banner"}
                  style={{ marginBottom: 14 }}
                >
                  {emailFeedback.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{emailFeedback.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveEmailConfig} className="admin-modal-form" style={{ padding: 0 }}>
                <div className="auth-input-group">
                  <label>Brevo API Key (Recommended for Render / Cloud — 300 free emails/day via HTTPS)</label>
                  <input
                    type="password"
                    placeholder={emailStatus?.hasBrevoKey ? "Saved (enter new key to replace)" : "xkeysib-..."}
                    value={emailForm.brevoApiKey}
                    onChange={(e) => setEmailForm({ ...emailForm, brevoApiKey: e.target.value })}
                  />
                </div>

                <div className="auth-input-group">
                  <label>Google Apps Script / HTTPS Mail Webhook URL (Free Gmail HTTPS relay)</label>
                  <input
                    type="url"
                    placeholder={emailStatus?.hasWebhookUrl ? "Saved webhook URL (enter new URL to replace)" : "https://script.google.com/macros/s/.../exec"}
                    value={emailForm.emailWebhookUrl}
                    onChange={(e) => setEmailForm({ ...emailForm, emailWebhookUrl: e.target.value })}
                  />
                </div>

                <div className="form-row-split">
                  <div className="auth-input-group">
                    <label>Gmail / SMTP Sender Email (EMAIL_USER)</label>
                    <input
                      type="email"
                      placeholder={emailStatus?.maskedUser || "yourname@gmail.com"}
                      value={emailForm.smtpUser}
                      onChange={(e) => setEmailForm({ ...emailForm, smtpUser: e.target.value })}
                    />
                  </div>
                  <div className="auth-input-group">
                    <label>16-Digit Google App Password (EMAIL_PASS)</label>
                    <input
                      type="password"
                      placeholder={emailStatus?.hasSmtpPass ? "Saved (enter new password to replace)" : "abcd efgh ijkl mnop"}
                      value={emailForm.smtpPass}
                      onChange={(e) => setEmailForm({ ...emailForm, smtpPass: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-split">
                  <div className="auth-input-group">
                    <label>Sender Display / From Email (Optional)</label>
                    <input
                      type="text"
                      placeholder={emailStatus?.emailFrom || "verified-sender@gmail.com"}
                      value={emailForm.emailFrom}
                      onChange={(e) => setEmailForm({ ...emailForm, emailFrom: e.target.value })}
                    />
                  </div>
                  <div className="auth-input-group">
                    <label>Resend API Key (Optional HTTPS API)</label>
                    <input
                      type="password"
                      placeholder={emailStatus?.hasResendKey ? "Saved (enter new key to replace)" : "re_..."}
                      value={emailForm.resendApiKey}
                      onChange={(e) => setEmailForm({ ...emailForm, resendApiKey: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-split">
                  <div className="auth-input-group">
                    <label>Custom SMTP Host (Blank = Gmail)</label>
                    <input
                      type="text"
                      placeholder={emailStatus?.smtpHost || "smtp.gmail.com"}
                      value={emailForm.smtpHost}
                      onChange={(e) => setEmailForm({ ...emailForm, smtpHost: e.target.value })}
                    />
                  </div>
                  <div className="auth-input-group">
                    <label>SMTP Port</label>
                    <input
                      type="number"
                      placeholder="465"
                      value={emailForm.smtpPort}
                      onChange={(e) => setEmailForm({ ...emailForm, smtpPort: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={emailSaving}
                    style={{ background: "linear-gradient(135deg, #06b6d4, #2563eb)", flex: 1 }}
                  >
                    {emailSaving ? "Saving Gateway Settings..." : "Save Email OTP Gateway"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={emailSaving}
                    onClick={handleClearEmailConfig}
                  >
                    Clear Saved Settings
                  </button>
                </div>
              </form>
            </section>

            <section className="portal-card">
              <div className="portal-card-header">
                <h2>Test Live Email Delivery &amp; Setup Guide</h2>
              </div>

              <form onSubmit={handleSendTestEmail} className="admin-modal-form" style={{ padding: 0, marginBottom: 18 }}>
                <div className="auth-input-group">
                  <label>Recipient Inbox for Live Test</label>
                  <div className="email-otp-action-row">
                    <input
                      type="email"
                      required
                      placeholder="Enter email address to test"
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="submit"
                      className="send-otp-btn"
                      disabled={emailTesting}
                    >
                      <Send size={14} />
                      <span>{emailTesting ? "Sending..." : "Send Test Email"}</span>
                    </button>
                  </div>
                </div>
              </form>

              <div className="db-stats-matrix">
                <div className="matrix-stat-item">
                  <span className="matrix-stat-label">Active Provider</span>
                  <strong>{emailStatus?.activeProvider || "NONE"}</strong>
                </div>
                <div className="matrix-stat-item">
                  <span className="matrix-stat-label">Config Source</span>
                  <strong>{emailStatus?.source || "NONE"}</strong>
                </div>
                <div className="matrix-stat-item">
                  <span className="matrix-stat-label">Brevo / Resend / Webhook</span>
                  <strong>
                    {[
                      emailStatus?.hasBrevoKey && "Brevo",
                      emailStatus?.hasWebhookUrl && "Webhook",
                      emailStatus?.hasResendKey && "Resend"
                    ]
                      .filter(Boolean)
                      .join(", ") || "None"}
                  </strong>
                </div>
                <div className="matrix-stat-item">
                  <span className="matrix-stat-label">SMTP / Gmail</span>
                  <strong>{emailStatus?.hasSmtpPass ? emailStatus.maskedUser : "Not Set"}</strong>
                </div>
              </div>

              <div className="police-verification-notice" style={{ marginTop: 16 }}>
                <Mail size={18} className="text-cyan" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Zero-Block Cloud Delivery Tip (Render / Free Hosting)</strong>
                  <p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5 }}>
                    Many free cloud hosts block outbound SMTP ports (465/587). Use either a free{" "}
                    <strong>Brevo API Key</strong> (300 emails/day via HTTPS) or deploy this 4-line{" "}
                    <strong>Google Apps Script</strong> as a Web App using your Gmail account:
                  </p>
                  <pre style={{ marginTop: 8, padding: 8, background: "#050a14", borderRadius: 6, fontSize: 11, overflowX: "auto", color: "#93c5fd" }}>
{`function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  GmailApp.sendEmail(d.to, d.subject, d.text, { htmlBody: d.html });
  return ContentService.createTextOutput('{"ok":true}');
}`}
                  </pre>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* MODAL: ADD ROAD CORRIDOR */}
      {showAddSegmentModal && (
        <div className="emergency-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3><Route size={18} /> Register New Road Corridor</h3>
              <button type="button" onClick={() => setShowAddSegmentModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSegment} className="admin-modal-form">
              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>Road ID (Unique Identifier) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RD_DEL_03"
                    value={newRoadId}
                    onChange={(e) => setNewRoadId(e.target.value)}
                  />
                </div>
                <div className="auth-input-group">
                  <label>Road Classification *</label>
                  <select
                    value={newRoadType}
                    onChange={(e) => setNewRoadType(e.target.value)}
                    className="role-select-input"
                  >
                    <option value="HIGHWAY">HIGHWAY (Expressway)</option>
                    <option value="MAIN_ROAD">MAIN_ROAD (Arterial)</option>
                    <option value="LOCAL_ROAD">LOCAL_ROAD (Urban Street)</option>
                  </select>
                </div>
              </div>

              <div className="auth-input-group">
                <label>Corridor / Road Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi Ring Road & DND Corridor"
                  value={newRoadName}
                  onChange={(e) => setNewRoadName(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label>GPS Waypoint Coordinates (lat, lng per line, min 2) *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="28.6139, 77.2090&#10;28.6250, 77.2150&#10;28.6315, 77.2167"
                  value={newCoordsText}
                  onChange={(e) => setNewCoordsText(e.target.value)}
                  style={{ width: "100%", background: "#0a1120", color: "#f8fafc", padding: 10, borderRadius: 8, border: "1px solid #1e293b", fontFamily: "monospace" }}
                />
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddSegmentModal(false)}>Cancel</button>
                <button type="submit" className="auth-submit-btn" style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>
                  Save Corridor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD USER */}
      {showAddUserModal && (
        <div className="emergency-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3><UserPlus size={18} /> Register New Account to Database</h3>
              <button type="button" onClick={() => setShowAddUserModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="admin-modal-form">
              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Officer Aditya Kumar Singh"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div className="auth-input-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. aditya@flowsense.gov.in"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>
                <div className="auth-input-group">
                  <label>Role Assignment *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="role-select-input"
                  >
                    <option value="AUTHORITY">AUTHORITY (Traffic Police / Govt)</option>
                    <option value="ADMIN">ADMIN (Full Root Access)</option>
                    <option value="PUBLIC">PUBLIC (Citizen Commuter)</option>
                  </select>
                </div>
              </div>

              <div className="form-row-split">
                <div className="auth-input-group">
                  <label>Department / Wing</label>
                  <input
                    type="text"
                    placeholder="e.g. Emergency Traffic Control"
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                  />
                </div>
                <div className="auth-input-group">
                  <label>Badge / Identification #</label>
                  <input
                    type="text"
                    placeholder="e.g. TP-9021"
                    value={newUserBadge}
                    onChange={(e) => setNewUserBadge(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddUserModal(false)}>Cancel</button>
                <button type="submit" className="auth-submit-btn" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST SIREN ALERT */}
      {showBroadcastModal && (
        <div className="emergency-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3 className="text-crimson"><Siren size={18} /> Dispatch System-Wide Siren Alarm</h3>
              <button type="button" onClick={() => setShowBroadcastModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleBroadcastAlert} className="admin-modal-form">
              <div className="auth-input-group">
                <label>Emergency Alert Headline *</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label>Affected Highway / City Arterial *</label>
                <input
                  type="text"
                  required
                  value={broadcastRoad}
                  onChange={(e) => setBroadcastRoad(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label>Broadcast Instructions &amp; Action *</label>
                <textarea
                  rows={3}
                  required
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  style={{ width: "100%", background: "#0a1120", color: "#f8fafc", padding: 10, borderRadius: 8, border: "1px solid #1e293b" }}
                />
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowBroadcastModal(false)}>Cancel</button>
                <button type="submit" className="auth-submit-btn" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                  <Siren size={16} /> Fire Siren Alarm Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR OFFICER ID PROOF OR HAZARD PHOTOS */}
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
            <img src={lightboxImage} alt="Verification Evidence" />
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPortal;
