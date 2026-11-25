import { createContext, useContext, useState, useEffect } from "react";
import {
  loginUser,
  registerUser,
  fetchCurrentUser,
  updateUserProfile,
  changeUserPassword
} from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("flowsense_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("flowsense_token"));
  const [loading, setLoading] = useState(!user);

  // Re-verify session against backend in background without blocking UI
  useEffect(() => {
    if (token) {
      fetchCurrentUser()
        .then((res) => {
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem("flowsense_user", JSON.stringify(res.user));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  async function refreshUser() {
    if (!token) return null;
    try {
      const res = await fetchCurrentUser();
      if (res.success && res.user) {
        setUser(res.user);
        localStorage.setItem("flowsense_user", JSON.stringify(res.user));
        return res.user;
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
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem("flowsense_token", res.token);
      localStorage.setItem("flowsense_user", JSON.stringify(res.user));
    }
    return res;
  }

  // Real-time Confidential User Registration directly saved to MongoDB
  async function register(userData) {
    const res = await registerUser(userData);
    if (res.success && res.token && res.user) {
      setUser(res.user);
      setToken(res.token);
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
    setUser(null);
    setToken(null);
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
