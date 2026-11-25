import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
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
    return <div className="page-loading-state">Loading Profile Session...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/profile" replace />;
  }
  return children;
}

function ProtectedAuthorityRoute({ children }) {
  const { isAuthority, isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="page-loading-state">Authenticating Police Credentials...</div>;
  }
  if (!isAuthenticated || !isAuthority) {
    return <Navigate to="/login?role=AUTHORITY&redirect=/authority" replace />;
  }
  return children;
}

function ProtectedAdminRoute({ children }) {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="page-loading-state">Authenticating Root Administrator...</div>;
  }
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login?role=ADMIN&redirect=/admin" replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flowsense-app">
          <Navbar />

          {/* GLOBAL EMERGENCY ALERT MODAL — Police Only Hazard Dispatch */}
          <EmergencyAlertModal />

          {/* SMART CITY AI COPILOT CHATBOT */}
          <FlowSenseChatbot />

          <main className="flowsense-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/database" element={<DatabasePlatform />} />
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

              {/* STRICTLY ROLE-PROTECTED PORTALS */}
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
                  <strong>FlowSense National Smart Mobility</strong>
                  <p>Pan-India Predictive Traffic Flow &amp; Adaptive Emergency Routing Platform</p>
                </div>
              </div>
              <div className="footer-links-ambient">
                <Link to="/database">MongoDB Platform</Link>
                <Link to="/profile">User Profile</Link>
                <Link to="/login?role=ADMIN">Admin Console</Link>
                <Link to="/login?role=AUTHORITY">Police Command</Link>
                <Link to="/report">Report Hazard</Link>
                <Link to="/contact">Helpline &amp; Contact (112 / 1033)</Link>
              </div>
              <div className="footer-meta-ambient">
                <p>© {new Date().getFullYear()} FlowSense Platform. Built for Smart Cities Mission.</p>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
