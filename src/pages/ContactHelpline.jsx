import { useState, useEffect } from "react";
import { useCity } from "../context/CityContext";
import { INDIA_STATES_AND_UTS } from "../utils/indiaLocations";
import {
  PhoneCall,
  AlertTriangle,
  Building2,
  Send,
  CheckCircle2,
  FileText,
  LifeBuoy
} from "lucide-react";
import { fetchHelplines, submitContactMessage } from "../api";

const INDIAN_STATES = [
  "National / Central Query",
  ...INDIA_STATES_AND_UTS.map((s) => s.state)
];

const GRIEVANCE_CATEGORIES = [
  { id: "EMERGENCY_TRAFFIC_ALERT", label: "🚨 Urgent Traffic Hazard / Emergency Road Alert" },
  { id: "POTHOLE_ROAD_GRIEVANCE", label: "🕳️ Hazardous Pothole / Crater / Surface Damage" },
  { id: "SIGNAL_MALFUNCTION", label: "🚦 Traffic Signal Failure / Choke Point" },
  { id: "HIGHWAY_PATROL_FEEDBACK", label: "🛣️ National Highway (NHAI) Patrol Request" },
  { id: "GOVERNMENT_PARTNERSHIP", label: "🏛️ Government / Municipal Corporation Smart City Tie-up" },
  { id: "API_SMART_CITY_INTEGRATION", label: "🌐 Open API / Intelligent Transit System Integration" },
  { id: "TECHNICAL_SUPPORT", label: "💻 Technical Portal Bug / Routing Issue" },
  { id: "GENERAL_INQUIRY", label: "ℹ️ General Inquiry / Public Suggestion" }
];

export default function ContactHelpline() {
  const { activeState, activeCity } = useCity();

  const [helplines, setHelplines] = useState([]);
  const [stateDirectories, setStateDirectories] = useState([]);
  const [stateFilter, setStateFilter] = useState(() => activeState?.split(" ")[0] || "All");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedState, setSelectedState] = useState(() => activeState || "Delhi (NCT)");
  const [city, setCity] = useState(() => activeCity || "");
  const [category, setCategory] = useState("POTHOLE_ROAD_GRIEVANCE");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchHelplines()
      .then((res) => {
        if (res.success) {
          setHelplines(res.nationalHelplines || []);
          setStateDirectories(res.stateDirectories || []);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setErrorMsg("Please fill in all required fields (Name, Email, Subject, Message).");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSubmittedTicket(null);

    try {
      const res = await submitContactMessage({
        name,
        email,
        phone,
        state: selectedState,
        city: city.trim() || selectedState,
        category,
        subject,
        message
      });

      if (res.success) {
        setSubmittedTicket(res);
        setSubject("");
        setMessage("");
      } else {
        setErrorMsg(res.message || "Failed to submit message.");
      }
    } catch {
      setErrorMsg("Network error connecting to Smart City Operations server.");
    } finally {
      setSubmitting(false);
    }
  }

  const matchedDirs = stateFilter === "All"
    ? stateDirectories
    : stateDirectories.filter(
        (d) =>
          d.state.toLowerCase().includes(stateFilter.toLowerCase()) ||
          d.city.toLowerCase().includes(activeCity.toLowerCase())
      );
  const filteredDirectories = matchedDirs.length > 0 ? matchedDirs : stateDirectories;

  return (
    <div className="contact-page-wrapper">
      {/* HERO BANNER */}
      <div className="contact-hero-banner">
        <div className="contact-hero-badge">
          <LifeBuoy size={15} /> Ministry-Grade Public Assistance &amp; Helplines
        </div>
        <h1>Pan-India Emergency Helplines &amp; Grievance Redressal</h1>
        <p>
          Connect directly with national emergency responders, state highway traffic directorates, and the FlowSense Smart Mobility Operations Desk across all 28 Indian States &amp; 8 Union Territories.
        </p>
      </div>

      {/* SECTION 1: ONE-TOUCH NATIONAL EMERGENCY HELPLINES */}
      <section className="contact-section">
        <div className="section-title-wrap">
          <PhoneCall size={20} className="text-red" />
          <h2>National Emergency Response Dialers (Toll-Free 24/7)</h2>
        </div>
        <p className="section-subtitle">
          In case of severe road collisions, trauma patient transfers, or highway disasters, dial these direct hotlines immediately.
        </p>

        <div className="helplines-grid">
          {helplines.map((h) => (
            <div key={h.code} className="helpline-card">
              <div className="helpline-card-header">
                <span className="helpline-icon">{h.icon}</span>
                <span className="helpline-247-tag">{h.available}</span>
              </div>
              <div className="helpline-card-body">
                <a href={`tel:${h.code}`} className="helpline-code-btn" title={`Click to dial ${h.code}`}>
                  <PhoneCall size={16} /> Call {h.code}
                </a>
                <h3>{h.title}</h3>
                <span className="helpline-dept">{h.dept}</span>
                <p>{h.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: CITIZEN GRIEVANCE & OPERATIONS DESK FORM */}
      <section className="contact-section" style={{ marginTop: 40 }}>
        <div className="section-title-wrap">
          <FileText size={20} className="text-cyan" />
          <h2>Submit Road Grievance or Smart City Inquiry</h2>
        </div>
        <p className="section-subtitle">
          Report recurring signal failures, highway maintenance issues, or road safety concerns directly to our Operations Desk.
        </p>

        {submittedTicket && (
          <div className="ticket-success-card">
            <div className="ticket-success-header">
              <CheckCircle2 size={24} className="text-emerald" />
              <div>
                <h3>Grievance Successfully Registered!</h3>
                <span className="ticket-id-badge">Ticket #{submittedTicket.ticketId}</span>
              </div>
            </div>
            <p className="ticket-success-msg">{submittedTicket.message}</p>
            <div className="ticket-footer-note">
              <span>Status: <strong className="text-emerald">OPEN (Under Review)</strong></span> • Expected Resolution: <strong>24–48 Hours</strong>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="incident-error-banner" style={{ marginBottom: 16 }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="contact-form-card">
          <div className="form-row-split">
            <div className="auth-input-group">
              <label>Full Official / Citizen Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Chandra Verma"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="auth-input-group">
              <label>Email Address *</label>
              <input
                type="email"
                required
                placeholder="e.g. ramesh@domain.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-split" style={{ marginTop: 12 }}>
            <div className="auth-input-group">
              <label>Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="auth-input-group">
              <label>State / Union Territory *</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="role-select-input"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row-split" style={{ marginTop: 12 }}>
            <div className="auth-input-group">
              <label>City / District Name</label>
              <input
                type="text"
                placeholder="e.g. New Delhi, Pune, Bengaluru, Ludhiana"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="auth-input-group">
              <label>Category of Inquiry / Grievance *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="role-select-input"
              >
                {GRIEVANCE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="auth-input-group" style={{ marginTop: 12 }}>
            <label>Subject / Brief Summary *</label>
            <input
              type="text"
              required
              placeholder="e.g. Broken Traffic Signal and Crater on Outer Ring Road Flyover"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="auth-input-group" style={{ marginTop: 12 }}>
            <label>Detailed Message &amp; Landmark Coordinates *</label>
            <textarea
              rows={4}
              required
              placeholder="Provide exact intersection details, highway milestone, or municipal request description..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: "100%", background: "#0a1120", color: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #1e293b" }}
            />
          </div>

          <button
            type="submit"
            className="contact-submit-btn"
            disabled={submitting}
          >
            {submitting ? "Sending to Operations Desk..." : <><Send size={18} /> Submit Grievance / Inquiry</>}
          </button>
        </form>
      </section>

      {/* SECTION 3: STATE-WISE TRAFFIC POLICE CONTROL ROOM DIRECTORY */}
      <section className="contact-section" style={{ marginTop: 40 }}>
        <div className="section-title-wrap" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Building2 size={20} className="text-purple" />
            <h2>State Traffic Police Control Room Directory</h2>
          </div>
          <button
            type="button"
            className="refresh-btn-sm"
            onClick={() => setStateFilter(stateFilter === "All" ? activeState?.split(" ")[0] || "All" : "All")}
          >
            {stateFilter === "All" ? `Show ${activeState} First` : "Show All States"}
          </button>
        </div>
        <p className="section-subtitle">
          Direct desk contacts and headquarters control rooms for major Indian metropolitan traffic police wings.
        </p>

        <div className="state-directory-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>State / Jurisdiction</th>
                <th>Headquarters Hub</th>
                <th>Direct Control Room Phone</th>
                <th>Control Room Facility</th>
                <th>Official Web Portal</th>
              </tr>
            </thead>
            <tbody>
              {filteredDirectories.map((d, idx) => (
                <tr key={idx}>
                  <td><strong>{d.state}</strong></td>
                  <td>{d.city}</td>
                  <td>
                    <a href={`tel:${d.phone}`} className="phone-table-link">
                      <PhoneCall size={13} /> {d.phone}
                    </a>
                  </td>
                  <td style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>{d.controlRoom}</td>
                  <td>
                    <span className="gov-website-tag">
                      {d.website}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
