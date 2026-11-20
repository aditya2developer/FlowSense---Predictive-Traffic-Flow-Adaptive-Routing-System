import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, registerUser, fetchCurrentUser } from "../api";

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
  const [loading, setLoading] = useState(true);

  // Validate session against real-time MongoDB backend on mount
  useEffect(() => {
    if (token) {
      fetchCurrentUser()
        .then((res) => {
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem("flowsense_user", JSON.stringify(res.user));
          } else {
            logout();
          }
        })
        .catch(() => {
          // If offline or network error, keep local session if valid
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  // Real-time Authentication against MongoDB
  async function login(email, password, role) {
    const res = await loginUser(email, password, role);
    if (res.success && res.token && res.user) {
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem("flowsense_token", res.token);
      localStorage.setItem("flowsense_user", JSON.stringify(res.user));
    }
    return res;
  }

  // Real-time User Registration directly saved to MongoDB
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAdmin,
        isAuthority,
        isPublic,
        isAuthenticated,
        loading,
        login,
        register,
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
