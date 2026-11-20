import { useState, useEffect, useRef } from "react";
import { soundAlert } from "../utils/soundAlert";
import { fetchIncidents } from "../api";
import { useAuth } from "../context/AuthContext";
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  X,
  CheckCircle,
  Siren,
  BellRing,
  ShieldAlert,
  Compass,
  MapPin,
  Clock,
  User
} from "lucide-react";

export default function EmergencyAlertModal() {
  const { role, user } = useAuth();
  const [activeAlert, setActiveAlert] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const seenIncidentIds = useRef(new Set());
  const initialLoadDone = useRef(false);

  // STRICT REQUIREMENT: Siren alarm and alert modal must ONLY trigger for Traffic Police (AUTHORITY)
  const isTrafficPolice = role === "AUTHORITY";

  // Listen for custom hazard report events dispatched from the Incident Report page or other portals
  useEffect(() => {
    if (!isTrafficPolice) return;

    function handleCustomAlert(event) {
      if (event.detail && isTrafficPolice) {
        triggerPoliceAlert(event.detail);
      }
    }

    window.addEventListener("flowsense-hazard-reported", handleCustomAlert);
    window.addEventListener("flowsense-emergency-alert", handleCustomAlert);
    return () => {
      window.removeEventListener("flowsense-hazard-reported", handleCustomAlert);
      window.removeEventListener("flowsense-emergency-alert", handleCustomAlert);
    };
  }, [isTrafficPolice]);

  // Real-time polling for new hazard reports every 6 seconds — ONLY FOR TRAFFIC POLICE
  useEffect(() => {
    if (!isTrafficPolice) return;

    let isMounted = true;

    async function pollLiveHazards() {
      try {
        const res = await fetchIncidents();
        if (res.success && Array.isArray(res.data) && isMounted) {
          if (!initialLoadDone.current) {
            // Seed initial set with existing IDs so alarm doesn't fire for old historical hazards upon login
            res.data.forEach((inc) => seenIncidentIds.current.add(inc._id));
            initialLoadDone.current = true;
            return;
          }

          // Check if any brand new hazard was reported
          const newIncident = res.data.find(
            (inc) => !seenIncidentIds.current.has(inc._id) && inc.status === "ACTIVE"
          );

          if (newIncident) {
            seenIncidentIds.current.add(newIncident._id);
            triggerPoliceAlert({
              id: newIncident._id,
              type: newIncident.type || "HAZARD",
              title: `🚨 NEW HAZARD REPORTED: ${newIncident.type?.replace("_", " ")}`,
              roadName: newIncident.roadName || newIncident.roadId,
              city: newIncident.city || "Jurisdiction",
              location: newIncident.location || newIncident.landmark || "Roadway",
              severity: newIncident.severity || "HIGH",
              description: newIncident.description || "Citizen reported obstruction.",
              reportedBy: newIncident.reportedBy || "Citizen Reporter",
              recommendation: newIncident.recommendation || "Deploy nearest traffic patrol unit to clear obstruction and establish warning perimeter.",
              time: new Date(newIncident.reportedAt || Date.now()).toLocaleTimeString()
            });
          }
        }
      } catch (err) {
        // quiet fallback
      }
    }

    pollLiveHazards();
    const interval = setInterval(pollLiveHazards, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isTrafficPolice]);

  function triggerPoliceAlert(hazardData) {
    // Double check: Alarm should come to ONLY traffic police, NOT public and admin
    if (!isTrafficPolice) return;

    setActiveAlert(hazardData);
    setIsOpen(true);
    // Play the audible siren sound for Traffic Police
    soundAlert.playSiren(9);
  }

  function handleDismiss() {
    soundAlert.stopSiren();
    setIsOpen(false);
  }

  function handleToggleMute() {
    const muted = soundAlert.toggleMute();
    setIsMuted(muted);
  }

  function handleManualPoliceDrill() {
    triggerPoliceAlert({
      id: `drill-${Date.now()}`,
      type: "ACCIDENT",
      title: "🚨 LIVE HAZARD SIREN TEST: TRAFFIC POLICE DRILL",
      roadName: "GT Road / NH-44 Expressway",
      city: "Active Jurisdiction",
      location: "Near Chaheru Flyover Junction",
      severity: "CRITICAL",
      description: "Simulation drill: Multi-vehicle collision reported blocking left two lanes. Emergency response protocol triggered.",
      reportedBy: "Control Room Simulation",
      recommendation: "1. Dispatch Patrol Unit #4 with hazard cones. 2. Preempt traffic lights to green at preceding intersection. 3. Call 108 Emergency Ambulance.",
      time: new Date().toLocaleTimeString()
    });
  }

  // If user is NOT Traffic Police (i.e. Public or Admin), DO NOT render any siren or alert modal
  if (!isTrafficPolice) {
    return null;
  }

  return (
    <>
      {/* QUICK SIREN TEST PILL (Visible only on Traffic Police interface) */}
      <div className="emergency-drill-pill-wrap">
        <button
          type="button"
          className="emergency-drill-btn police-drill-btn"
          onClick={handleManualPoliceDrill}
          title="Police Siren Audio Test & Hazard Response Drill"
        >
          <Siren size={15} className="drill-icon-spin text-cyan" />
          <span>Test Police Hazard Siren</span>
        </button>
      </div>

      {/* POPUP HAZARD ALERT MODAL FOR POLICE */}
      {isOpen && activeAlert && (
        <div className="emergency-modal-overlay">
          <div className="emergency-modal-card police-alert-card">
            {/* AMBIENT FLASHING RED & BLUE POLICE GLOW */}
            <div className="police-pulsing-halo" />

            <div className="emergency-modal-header police-modal-header">
              <div className="emergency-header-left">
                <div className="emergency-siren-badge police-siren-badge">
                  <ShieldAlert size={22} className="bell-shaking" />
                </div>
                <div>
                  <span className="emergency-kicker text-cyan">
                    TRAFFIC POLICE DISPATCH ALERT • {activeAlert.city} • {activeAlert.time || "JUST NOW"}
                  </span>
                  <h3>{activeAlert.title}</h3>
                </div>
              </div>
              <button
                type="button"
                className="emergency-close-btn"
                onClick={handleDismiss}
                aria-label="Dismiss alert"
              >
                <X size={20} />
              </button>
            </div>

            <div className="emergency-modal-body">
              <div className="police-alert-meta-strip">
                <span className="police-meta-chip">
                  <MapPin size={13} /> {activeAlert.roadName} ({activeAlert.city})
                </span>
                <span className={`severity-tag sev-${activeAlert.severity?.toLowerCase()}`}>
                  {activeAlert.severity} SEVERITY
                </span>
                <span className="police-meta-chip">
                  <User size={13} /> By {activeAlert.reportedBy}
                </span>
              </div>

              <p className="emergency-main-message" style={{ marginTop: 12 }}>
                <strong>Reported Hazard Details:</strong> {activeAlert.description}
                {activeAlert.location && <span> (Exact Spot: {activeAlert.location})</span>}
              </p>

              {/* ACTIONABLE AI RECOMMENDATIONS FOR POLICE (WHAT SHOULD I DO) */}
              <div className="police-recommendation-box">
                <div className="rec-box-header">
                  <AlertTriangle size={17} className="text-amber" />
                  <strong>RECOMMENDED ACTION PLAN (WHAT POLICE SHOULD DO):</strong>
                </div>
                <p className="rec-box-text">
                  {activeAlert.recommendation || "1. Dispatch nearest interceptor patrol unit. 2. Establish 200m warning cone perimeter. 3. Extend green phase for diversion route."}
                </p>
              </div>

              <div className="emergency-details-grid" style={{ marginTop: 12 }}>
                <div className="emergency-detail-item">
                  <span className="detail-label">OFFICER ON DUTY</span>
                  <strong>{user?.name || "Traffic Inspector"}</strong>
                </div>

                <div className="emergency-detail-item">
                  <span className="detail-label">SIREN SOUND ALARM</span>
                  <strong className="text-crimson">
                    {isMuted ? "Siren Muted" : "Active Audible Siren (Oscillator)"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="emergency-modal-actions">
              <button
                type="button"
                className="siren-mute-toggle-btn"
                onClick={handleToggleMute}
              >
                {isMuted ? (
                  <>
                    <VolumeX size={16} /> Unmute Siren
                  </>
                ) : (
                  <>
                    <Volume2 size={16} /> Mute Siren
                  </>
                )}
              </button>

              <button
                type="button"
                className="emergency-acknowledge-btn police-acknowledge-btn"
                onClick={handleDismiss}
              >
                <CheckCircle size={18} /> Acknowledge &amp; Deploy Response
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
