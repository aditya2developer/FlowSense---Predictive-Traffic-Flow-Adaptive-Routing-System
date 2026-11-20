import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  Radio,
  User,
  LogOut,
  Compass,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  LogIn,
  UserPlus,
  PhoneCall
} from "lucide-react";
import { useState } from "react";

function Navbar() {
  const { user, role, isAdmin, isAuthority, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

          {/* AUTHORITY DISPATCH LINK — Visible only for authenticated Traffic Police & Admin */}
          {isAuthority && (
            <NavLink
              to="/authority"
              className={({ isActive }) => `ambient-nav-link link-authority ${isActive ? "active-ambient-cyan" : ""}`}
            >
              <Radio size={16} /> <span>Police Command</span>
            </NavLink>
          )}

          {/* MAIN ADMIN LINK — Visible only for authenticated Global Admin */}
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
        <div className="navbar-user-section">
          {isAuthenticated && user ? (
            <div className="user-dropdown-container">
              <button
                type="button"
                className={`active-role-pill ${roleBadgeStyle}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {role === "ADMIN" && <Shield size={14} />}
                {role === "AUTHORITY" && <Radio size={14} />}
                {role === "PUBLIC" && <User size={14} />}
                <span className="role-pill-text">
                  {user.name?.split(" ")[0]} ({role === "ADMIN" ? "Admin" : role === "AUTHORITY" ? "Traffic Police" : "Commuter"})
                </span>
                <ChevronDown size={14} className="dropdown-caret" />
              </button>

              {dropdownOpen && (
                <div className="ambient-dropdown-menu">
                  <div className="dropdown-user-info">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    <span className="dropdown-dept">
                      {user.department || (role === "ADMIN" ? "HQ Administrator" : role === "AUTHORITY" ? "Traffic Police" : "Citizen")}
                    </span>
                    {user.badgeNumber && (
                      <span className="dropdown-badge-num">Badge: {user.badgeNumber}</span>
                    )}
                  </div>

                  <div className="dropdown-divider" />

                  {/* QUICK PORTAL LINKS BASED ON ROLE */}
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
