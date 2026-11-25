import { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  loginUser,
  registerUser,
  fetchCurrentUser,
  updateUserProfile,
  changeUserPassword
} from "../api";

const AuthContext = createContext(null);

function isTokenStructurallyValid(tok) {
  if (!tok || typeof tok !== "string") return false;
  const parts = tok.split(".");
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      return false;
    }
    return Boolean(payload.id || payload.email);
  } catch {
    return false;
  }
}

function readInitialSession() {
  try {
    const savedToken = localStorage.getItem("flowsense_token");
    const savedUser = localStorage.getItem("flowsense_user");
    if (!savedToken || !isTokenStructurallyValid(savedToken) || !savedUser) {
      localStorage.removeItem("flowsense_token");
      localStorage.removeItem("flowsense_user");
      return { token: null, user: null };
    }
    return { token: savedToken, user: JSON.parse(savedUser) };
  } catch {
    localStorage.removeItem("flowsense_token");
    localStorage.removeItem("flowsense_user");
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [initialSession] = useState(readInitialSession);
  const [user, setUser] = useState(initialSession.user);
  const [token, setToken] = useState(initialSession.token);
  const [loading, setLoading] = useState(Boolean(initialSession.token));
  const verifiedTokenRef = useRef(null);

  // Verify stored token with backend before allowing protected/main routes
  useEffect(() => {
    if (!token || verifiedTokenRef.current === token) return undefined;
    let active = true;

    fetchCurrentUser()
      .then((res) => {
        if (!active) return;
        if (res.success && res.user) {
          verifiedTokenRef.current = token;
          setUser(res.user);
          localStorage.setItem("flowsense_user", JSON.stringify(res.user));
        } else if (res.httpStatus === 401 || res.httpStatus === 403 || !isTokenStructurallyValid(token)) {
          verifiedTokenRef.current = null;
          setUser(null);
          setToken(null);
          localStorage.removeItem("flowsense_token");
          localStorage.removeItem("flowsense_user");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function refreshUser() {
    if (!token) return null;
    try {
      const res = await fetchCurrentUser();
      if (res.success && res.user) {
        verifiedTokenRef.current = token;
        setUser(res.user);
        localStorage.setItem("flowsense_user", JSON.stringify(res.user));
        return res.user;
      }
      if (res.httpStatus === 401 || res.httpStatus === 403) {
        logout();
      }
    } catch {
      // keep cached user if transient network error
    }
    return null;
  }

  // Real-time Authentication against MongoDB with CAPTCHA
  async function login(email, password, role, captchaToken, captchaAnswer) {
    const res = await loginUser(email, password, role, captchaToken, captchaAnswer);
    if (res.success && res.token && res.user) {
      verifiedTokenRef.current = res.token;
      setUser(res.user);
      setToken(res.token);
      setLoading(false);
      localStorage.setItem("flowsense_token", res.token);
      localStorage.setItem("flowsense_user", JSON.stringify(res.user));
    }
    return res;
  }

  // Real-time Confidential User Registration directly saved to MongoDB
  async function register(userData) {
    const res = await registerUser(userData);
    if (res.success && res.token && res.user) {
      verifiedTokenRef.current = res.token;
      setUser(res.user);
      setToken(res.token);
      setLoading(false);
      localStorage.setItem("flowsense_token", res.token);
      localStorage.setItem("flowsense_user", JSON.stringify(res.user));
    }
    return res;
  }

  // Real-time Profile Update saved to MongoDB
  async function updateProfile(profileData) {
    const res = await updateUserProfile(profileData);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem("flowsense_user", JSON.stringify(res.user));
    }
    return res;
  }

  // Confidential Password Change with OTP Verification
  async function changePassword(payload) {
    const res = await changeUserPassword(payload);
    if (res.success) {
      await refreshUser();
    }
    return res;
  }

  function logout() {
    verifiedTokenRef.current = null;
    setUser(null);
    setToken(null);
    setLoading(false);
    localStorage.removeItem("flowsense_token");
    localStorage.removeItem("flowsense_user");
  }

  const isAuthenticated = Boolean(user && token);
  const role = user?.role || "GUEST";
  const isAdmin = isAuthenticated && role === "ADMIN";
  const isAuthority = isAuthenticated && (role === "AUTHORITY" || role === "ADMIN");
  const isPublic = isAuthenticated && (role === "PUBLIC" || role === "ADMIN");
  const isVerified = isAuthenticated && (user?.verificationStatus || "VERIFIED") === "VERIFIED";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAdmin,
        isAuthority,
        isPublic,
        isVerified,
        isAuthenticated,
        loading,
        login,
        register,
        updateProfile,
        changePassword,
        refreshUser,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
