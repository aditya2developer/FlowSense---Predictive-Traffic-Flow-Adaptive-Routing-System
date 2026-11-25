import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  Radio,
  User,
  LogOut,
  Compass,
  Database,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  LogIn,
  UserPlus,
  PhoneCall,
  ShieldCheck,
  Clock
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

function Navbar() {
  const { user, role, isAdmin, isAuthority, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function handleLogout() {
    setDropdownOpen(false);
    logout();
    navigate("/login");
  }

  const roleBadgeStyle = {
    ADMIN: "badge-admin",
    AUTHORITY: "badge-authority",
    PUBLIC: "badge-public"
  }[role] || "badge-public";

  const verificationStatus = user?.verificationStatus || "VERIFIED";

  return (
    <header className="navbar-header-ambient">
      <div className="navbar-ambient-border" />
      <div className="navbar-inner-ambient">
        {/* BRAND LOGO */}
        <NavLink to="/" className="navbar-brand-ambient">
          <div className="brand-logo-hex">
            <span className="logo-traffic-lights">🚦</span>
          </div>
          <div className="brand-text-ambient">
            <span className="brand-title-ambient">FlowSense</span>
            <span className="brand-badge-ambient">Real-Time Mobility Intelligence</span>
          </div>
        </NavLink>

        {/* ROLE-AWARE NAVIGATION LINKS */}
        <nav className="nav-links-ambient">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `ambient-nav-link ${isActive ? "active-ambient" : ""}`}
          >
            <Compass size={16} /> <span>Route Finder</span>
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) => `ambient-nav-link ${isActive ? "active-ambient" : ""}`}
          >
            <BarChart3 size={16} /> <span>Analytics &amp; Heatmap</span>
          </NavLink>

          <NavLink
            to="/database"
            className={({ isActive }) => `ambient-nav-link link-database ${isActive ? "active-ambient-emerald" : ""}`}
            title="Live MongoDB Atlas Collections & Documents Explorer"
          >
            <Database size={16} /> <span>MongoDB Platform</span>
          </NavLink>

          {isAuthority && (
            <NavLink
              to="/authority"
              className={({ isActive }) => `ambient-nav-link link-authority ${isActive ? "active-ambient-cyan" : ""}`}
            >
              <Radio size={16} /> <span>Police Command</span>
            </NavLink>
          )}

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `ambient-nav-link link-admin ${isActive ? "active-ambient-purple" : ""}`}
            >
              <Shield size={16} /> <span>Admin Console</span>
            </NavLink>
          )}

          <NavLink
            to="/report"
            className={({ isActive }) => `ambient-nav-link ${isActive ? "active-ambient" : ""}`}
          >
            <AlertTriangle size={16} /> <span>Report Hazard</span>
          </NavLink>

          <NavLink
            to="/contact"
            className={({ isActive }) => `ambient-nav-link ${isActive ? "active-ambient" : ""}`}
          >
            <PhoneCall size={16} /> <span>Helpline (112 / 1033)</span>
          </NavLink>
        </nav>

        {/* AUTHENTICATION / PROFILE SECTION */}
        <div className="navbar-user-section" ref={dropdownRef}>
          {isAuthenticated && user ? (
            <div className="user-dropdown-container">
              <button
                type="button"
                className={`active-role-pill ${roleBadgeStyle}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="nav-user-avatar" />
                ) : (
                  <>
                    {role === "ADMIN" && <Shield size={14} />}
                    {role === "AUTHORITY" && <Radio size={14} />}
                    {role === "PUBLIC" && <User size={14} />}
                  </>
                )}
                <span className="role-pill-text">
                  {user.name?.split(" ")[0]} (
                  {role === "ADMIN"
                    ? "Admin"
                    : role === "AUTHORITY"
                      ? verificationStatus === "PENDING"
                        ? "Police Pending"
                        : "Traffic Police"
                      : "Commuter"}
                  )
                </span>
                <ChevronDown size={14} className="dropdown-caret" />
              </button>

              {dropdownOpen && (
                <div className="ambient-dropdown-menu">
                  <div className="dropdown-user-info">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <strong>{user.name}</strong>
                      {verificationStatus === "VERIFIED" ? (
                        <span className="nav-ver-badge ok" title="Verified Account">
                          <ShieldCheck size={12} /> Verified
                        </span>
                      ) : (
                        <span className="nav-ver-badge pending" title="Awaiting Admin Review">
                          <Clock size={12} /> {verificationStatus}
                        </span>
                      )}
                    </div>
                    <span>{user.email}</span>
                    <span className="dropdown-dept">
                      {user.department || (role === "ADMIN" ? "HQ Administrator" : role === "AUTHORITY" ? "Traffic Police" : "Citizen")}
                    </span>
                    {user.badgeNumber && (
                      <span className="dropdown-badge-num">Badge: {user.badgeNumber}</span>
                    )}
                  </div>

                  <div className="dropdown-divider" />

                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User size={15} /> My Profile &amp; Security
                  </Link>

                  <Link
                    to="/database"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Database size={15} /> MongoDB Platform Explorer
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Shield size={15} /> Open Admin Console
                    </Link>
                  )}

                  {isAuthority && (
                    <Link
                      to="/authority"
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Radio size={15} /> Open Police Command Hub
                    </Link>
                  )}

                  <Link
                    to="/report"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <AlertTriangle size={15} /> Report Road Hazard
                  </Link>

                  <div className="dropdown-divider" />

                  <button
                    type="button"
                    className="dropdown-item item-logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-nav-buttons">
              <NavLink to="/login" className="login-action-btn">
                <LogIn size={15} /> Sign In
              </NavLink>
              <NavLink to="/login?mode=register" className="register-action-btn">
                <UserPlus size={15} /> Register
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
