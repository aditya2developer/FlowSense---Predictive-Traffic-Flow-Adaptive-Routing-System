import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import IncidentReport from "./pages/IncidentReport";
import Login from "./pages/Login";
import AuthorityPortal from "./pages/AuthorityPortal";
import AdminPortal from "./pages/AdminPortal";
import EmergencyAlertModal from "./components/EmergencyAlertModal";
import "./App.css";

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

          {/* GLOBAL EMERGENCY ALERT MODAL — Only sounds for authenticated Traffic Police */}
          <EmergencyAlertModal />

          <main className="flowsense-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/report" element={<IncidentReport />} />

              {/* STRICTLY ROLE-PROTECTED PORTALS — Visible only after successful login */}
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
                  <strong>FlowSense Enterprise</strong>
                  <p>Predictive Traffic Flow &amp; Adaptive Multi-Role Routing System</p>
                </div>
              </div>
              <div className="footer-links-ambient">
                <a href="/login?role=ADMIN">Admin Console</a>
                <a href="/login?role=AUTHORITY">Police Command</a>
                <a href="/login?role=PUBLIC">Commuter Portal</a>
                <a href="/report">Report Hazard</a>
              </div>
              <div className="footer-meta-ambient">
                <span>Real-Time MongoDB Cloud • Open-Meteo Weather • OSRM Routing Grid</span>
                <p>© {new Date().getFullYear()} FlowSense. Built for Smart Cities &amp; Safe Commuters.</p>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
