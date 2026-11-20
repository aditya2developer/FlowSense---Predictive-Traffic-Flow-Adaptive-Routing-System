/**
 * FlowSense Centralized API Client
 * Provides complete API support for Public, Authority (Police/Government), and Admin personas.
 * Features built-in timeout handling to ensure smooth, non-blocking user experience.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "";

function getAuthHeaders() {
  const token = localStorage.getItem("flowsense_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function apiFetch(endpoint, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({
      success: response.ok,
      message: response.ok ? "OK" : `HTTP Error ${response.status}`
    }));

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      success: false,
      message: err.name === "AbortError" ? "Request timed out" : (err.message || "Network error")
    };
  }
}

// ==========================================
// AUTHENTICATION APIs
// ==========================================

export async function loginUser(email, password, role) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role })
  });
}

export async function registerUser(userData) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  });
}

export async function fetchCurrentUser() {
  return apiFetch("/api/auth/me", {
    headers: getAuthHeaders()
  }, 4000);
}

export async function fetchDemoUsers() {
  return apiFetch("/api/auth/demo-users");
}

// ==========================================
// ROUTING & TRAFFIC MEMORY APIs
// ==========================================

export async function searchRoutes(from, to) {
  return apiFetch("/api/routes/search", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ from, to })
  }, 12000);
}

export async function fetchAnalytics(roadId) {
  return apiFetch(`/api/routes/analytics/${encodeURIComponent(roadId)}`);
}

export async function fetchIncidents(city) {
  const query = city && city !== "All" && city !== "All Cities" ? `?city=${encodeURIComponent(city)}` : "";
  return apiFetch(`/api/routes/incidents${query}`, {}, 5000);
}

export async function reportIncident(data) {
  return apiFetch("/api/routes/incidents", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
}

export async function resolveIncident(id) {
  return apiFetch(`/api/routes/incidents/${id}/resolve`, {
    method: "PATCH",
    headers: getAuthHeaders()
  });
}

export async function fetchWeather(city = "Delhi") {
  return apiFetch(`/api/routes/weather/${encodeURIComponent(city)}`, {}, 6000);
}

export async function fetchRoadSegments() {
  return apiFetch("/api/routes/segments", {}, 5000);
}

// ==========================================
// TRAFFIC AUTHORITY (POLICE & OFFICIALS) APIs
// ==========================================

export async function fetchEnforcementStats(city) {
  const query = city && city !== "All" && city !== "All Cities" ? `?city=${encodeURIComponent(city)}` : "";
  return apiFetch(`/api/authority/enforcement-stats${query}`, {
    headers: getAuthHeaders()
  }, 5000);
}

export async function fetchAdvisories() {
  return apiFetch("/api/authority/advisories", {}, 4000);
}

export async function createAdvisory(data) {
  return apiFetch("/api/authority/advisories", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
}

export async function expireAdvisory(id) {
  return apiFetch(`/api/authority/advisories/${id}/expire`, {
    method: "PATCH",
    headers: getAuthHeaders()
  });
}

export async function dispatchGreenCorridor(data) {
  return apiFetch("/api/authority/green-corridor", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }, 10000);
}

// ==========================================
// MAIN ADMIN APIs (FULL CRUD & OVERRIDES)
// ==========================================

export async function fetchAdminStats() {
  return apiFetch("/api/admin/stats", {
    headers: getAuthHeaders()
  }, 6000);
}

export async function fetchAdminUsers() {
  return apiFetch("/api/admin/users", {
    headers: getAuthHeaders()
  }, 5000);
}

export async function createAdminUser(userData) {
  return apiFetch("/api/admin/users", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });
}

export async function updateUserRole(userId, newRole) {
  return apiFetch(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ role: newRole })
  });
}

export async function deleteAdminUser(userId) {
  return apiFetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
}

export async function fetchAdminSegments() {
  return apiFetch("/api/admin/segments", {
    headers: getAuthHeaders()
  }, 5000);
}

export async function createRoadSegment(segmentData) {
  return apiFetch("/api/admin/segments", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(segmentData)
  });
}

export async function deleteRoadSegment(segmentId) {
  return apiFetch(`/api/admin/segments/${segmentId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
}

export async function fetchAdminIncidents() {
  return apiFetch("/api/admin/incidents", {
    headers: getAuthHeaders()
  }, 5000);
}

export async function updateIncidentStatus(incidentId, status) {
  return apiFetch(`/api/admin/incidents/${incidentId}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
}

export async function deleteIncident(incidentId) {
  return apiFetch(`/api/admin/incidents/${incidentId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
}

export async function reseedDatabase() {
  return apiFetch("/api/admin/reseed", {
    method: "POST",
    headers: getAuthHeaders()
  });
}

export async function triggerBroadcastAlert(alertData) {
  return apiFetch("/api/admin/broadcast-alert", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(alertData)
  });
}

export async function checkBackendHealth() {
  try {
    const res = await apiFetch("/api/health", {}, 3000);
    return res.success;
  } catch {
    return false;
  }
}

// ==========================================
// CONTACT & EMERGENCY HELPLINE APIs
// ==========================================

export async function fetchHelplines() {
  return apiFetch("/api/contact/helplines", {}, 4000);
}

export async function submitContactMessage(data) {
  return apiFetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

// ==========================================
// PAN-INDIA SMART CITY AI COPILOT / CHATBOT API
// ==========================================

export async function sendChatMessage(message) {
  return apiFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  }, 7000);
}
