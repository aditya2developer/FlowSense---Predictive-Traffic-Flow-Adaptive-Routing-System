import { useState } from "react";
import { X, Save } from "lucide-react";
import { updateIncidentDetails } from "../api";

const HAZARD_TYPES = [
  "ACCIDENT",
  "CONSTRUCTION",
  "FLOOD",
  "WATERLOGGING",
  "BREAKDOWN",
  "POTHOLE",
  "TRAFFIC_JAM",
  "ROADBLOCK",
  "FIRE_HAZARD",
  "STALLED_VEHICLE",
  "DEBRIS",
  "OTHER"
];

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["ACTIVE", "VERIFIED", "RESOLVED"];

export default function IncidentEditModal({ incident, canEditStatus = false, onClose, onSaved }) {
  const [roadName, setRoadName] = useState(() => incident?.roadName || "");
  const [city, setCity] = useState(() => incident?.city || "");
  const [type, setType] = useState(() => incident?.type || "ACCIDENT");
  const [severity, setSeverity] = useState(() => incident?.severity || "MEDIUM");
  const [landmark, setLandmark] = useState(() => incident?.landmark || "");
  const [description, setDescription] = useState(() => incident?.description || "");
  const [status, setStatus] = useState(() => incident?.status || "ACTIVE");
  const [statusNote, setStatusNote] = useState(() => incident?.statusNote || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!incident) return null;

  async function handleSave(e) {
    e.preventDefault();
    if (!roadName.trim() || !city.trim()) {
      setError("Road corridor and city are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        roadName: roadName.trim(),
        city: city.trim(),
        type,
        severity,
        landmark: landmark.trim(),
        description: description.trim(),
        location: landmark.trim() ? `${roadName.trim()} (Near ${landmark.trim()})` : roadName.trim()
      };
      if (canEditStatus) {
        payload.status = status;
        payload.statusNote = statusNote.trim();
      }
      const res = await updateIncidentDetails(incident._id, payload);
      if (res.success && res.data) {
        onSaved(res.data);
        onClose();
      } else {
        setError(res.message || "Failed to update hazard report in database.");
      }
    } catch {
      setError("Network error while saving update to database.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="emergency-modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="portal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          width: "92%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 24,
          border: "1px solid rgba(56, 189, 248, 0.35)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Update Hazard Report</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "#ef444422", color: "#fca5a5", marginBottom: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
              Hazard Type
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: 8, borderRadius: 6, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155" }}>
                {HAZARD_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
              Severity
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ padding: 8, borderRadius: 6, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155" }}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
              City
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                style={{ padding: 8, borderRadius: 6, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
              Landmark
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Near intersection / landmark"
                style={{ padding: 8, borderRadius: 6, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155" }}
              />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
            Road / Corridor Name
            <input
              type="text"
              value={roadName}
              onChange={(e) => setRoadName(e.target.value)}
              required
              style={{ padding: 8, borderRadius: 6, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
            Description
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ padding: 8, borderRadius: 6, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155" }}
            />
          </label>

          {canEditStatus && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 8, borderRadius: 6, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155" }}>
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
                Official Update Note
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Patrol cleared obstruction"
                  style={{ padding: 8, borderRadius: 6, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155" }}
                />
              </label>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #475569", background: "transparent", color: "#cbd5e1", cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#0284c7", color: "#fff", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Save size={14} /> {saving ? "Saving to DB..." : "Save to Database"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
