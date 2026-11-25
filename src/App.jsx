import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CityProvider } from "./context/CityContext";
import Navbar from "./components/Navbar";
import CitySelectorModal from "./components/CitySelectorModal";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import IncidentReport from "./pages/IncidentReport";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import AuthorityPortal from "./pages/AuthorityPortal";
import AdminPortal from "./pages/AdminPortal";
import ContactHelpline from "./pages/ContactHelpline";
import DatabasePlatform from "./pages/DatabasePlatform";
import EmergencyAlertModal from "./components/EmergencyAlertModal";
import FlowSenseChatbot from "./components/FlowSenseChatbot";
import "./App.css";

function ProtectedUserRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="page-loading-state">Loading Profile...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/profile" replace />;
  }
  return children;
}

function ProtectedAuthorityRoute({ children }) {
  const { isAuthority, isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="page-loading-state">Checking Police Access...</div>;
  }
  if (!isAuthenticated || !isAuthority) {
    return <Navigate to="/login?role=AUTHORITY&redirect=/authority" replace />;
  }
  return children;
}

function ProtectedAdminRoute({ children }) {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="page-loading-state">Checking Administrator Access...</div>;
  }
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login?role=ADMIN&redirect=/admin" replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <CityProvider>
        <BrowserRouter>
          <div className="flowsense-app">
            <Navbar />
            <CitySelectorModal />

            {/* GLOBAL EMERGENCY ALERT MODAL — Police Hazard Dispatch */}
            <EmergencyAlertModal />

            {/* SMART CITY ASSISTANT */}
            <FlowSenseChatbot />

            <main className="flowsense-main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route
                  path="/database"
                  element={
                    <ProtectedAdminRoute>
                      <DatabasePlatform />
                    </ProtectedAdminRoute>
                  }
                />
                <Route path="/report" element={<IncidentReport />} />
                <Route path="/contact" element={<ContactHelpline />} />

                <Route
                  path="/profile"
                  element={
                    <ProtectedUserRoute>
                      <Profile />
                    </ProtectedUserRoute>
                  }
                />

                <Route
                  path="/authority"
                  element={
                    <ProtectedAuthorityRoute>
                      <AuthorityPortal />
                    </ProtectedAuthorityRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedAdminRoute>
                      <AdminPortal />
                    </ProtectedAdminRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <footer className="flowsense-footer-ambient">
              <div className="footer-inner-ambient">
                <div className="footer-brand-ambient">
                  <span className="brand-logo-icon">🚦</span>
                  <div>
                    <strong>FlowSense Smart Mobility</strong>
                    <p>Pan-India Real-Time Traffic Navigation &amp; Road Safety Platform</p>
                  </div>
                </div>
                <div className="footer-links-ambient">
                  <Link to="/">Route Finder</Link>
                  <Link to="/dashboard">Live Analytics</Link>
                  <Link to="/report">Report Hazard</Link>
                  <Link to="/contact">Emergency Helplines (112 / 1033)</Link>
                  <Link to="/profile">My Profile</Link>
                </div>
                <div className="footer-meta-ambient">
                  <p>© {new Date().getFullYear()} FlowSense Platform. Coverage across all 28 States &amp; 8 UTs.</p>
                </div>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </CityProvider>
    </AuthProvider>
  );
}

export default App;
