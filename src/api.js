/**
 * FlowSense Centralized API Client
 * Provides complete API support for Public, Authority (Police/Government), and Admin personas.
 * Features built-in timeout handling to ensure smooth, non-blocking user experience.
 */

import { getTabToken } from "./utils/tabSession";

const BASE_URL = import.meta.env.VITE_API_URL || "";

function getAuthHeaders() {
  const token = getTabToken();
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
      success: false,
      message: response.ok
        ? "Unexpected non-JSON response from API server."
        : `HTTP Error ${response.status}`
    }));

    if (data && typeof data === "object" && !Array.isArray(data) && !("httpStatus" in data)) {
      Object.defineProperty(data, "httpStatus", { value: response.status, enumerable: false });
    }

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
// AUTHENTICATION, CAPTCHA, OTP & PROFILE APIs
// ==========================================

export async function fetchCaptcha() {
  return apiFetch("/api/auth/captcha", { cache: "no-store" }, 30000);
}

export async function sendOtp(email, purpose = "REGISTER") {
  return apiFetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, purpose })
  }, 25000);
}

export async function loginUser(email, password, role, captchaToken, captchaAnswer) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role, captchaToken, captchaAnswer })
  }, 20000);
}

export async function registerUser(userData) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  }, 25000);
}

export async function updateUserProfile(profileData) {
  return apiFetch("/api/auth/profile", {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData)
  }, 10000);
}

export async function changeUserPassword(payload) {
  return apiFetch("/api/auth/change-password", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  }, 15000);
}

export async function resetUserPassword(payload) {
  return apiFetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }, 20000);
}

export async function fetchMyReports() {
  return apiFetch("/api/auth/my-reports", {
    headers: getAuthHeaders()
  }, 10000);
}

export async function fetchCurrentUser() {
  return apiFetch("/api/auth/me", {
    headers: getAuthHeaders()
  }, 25000);
}

// ==========================================
// ROUTING, LIVE AUTOCOMPLETE & TRAFFIC APIs
// ==========================================

export async function fetchLiveAutocomplete(query, lat, lon) {
  const params = new URLSearchParams({ q: query });
  if (lat !== undefined && lon !== undefined) {
    params.set("lat", lat);
    params.set("lon", lon);
  }
  return apiFetch(`/api/routes/autocomplete?${params.toString()}`, { headers: getAuthHeaders() }, 4500);
}

export async function searchRoutes(from, to) {
  return apiFetch("/api/routes/search", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ from, to })
  }, 12000);
}

export async function fetchAnalytics(roadId) {
  return apiFetch(`/api/routes/analytics/${encodeURIComponent(roadId)}`, { headers: getAuthHeaders() });
}

export async function fetchIncidents(city) {
  const query = city && city !== "All" && city !== "All Cities" ? `?city=${encodeURIComponent(city)}` : "";
  return apiFetch(`/api/routes/incidents${query}`, { headers: getAuthHeaders() }, 5000);
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

export async function upvoteIncident(id) {
  return apiFetch(`/api/routes/incidents/${id}/upvote`, {
    method: "POST",
    headers: getAuthHeaders()
  });
}

export async function reverseGeocodeCoords(lat, lon) {
  return apiFetch(`/api/routes/reverse-geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { headers: getAuthHeaders() }, 6000);
}

export async function fetchNearbyServices(lat, lon, radius = 5000) {
  return apiFetch(`/api/routes/nearby-services?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&radius=${radius}`, { headers: getAuthHeaders() }, 8000);
}

export async function fetchLiveFeed(city) {
  const q = city ? `?city=${encodeURIComponent(city)}` : "";
  return apiFetch(`/api/routes/live-feed${q}`, { headers: getAuthHeaders() }, 8000);
}

export async function fetchWeather(city = "Delhi") {
  return apiFetch(`/api/routes/weather/${encodeURIComponent(city)}`, { headers: getAuthHeaders() }, 6000);
}

export async function fetchRoadSegments() {
  return apiFetch("/api/routes/segments", { headers: getAuthHeaders() }, 5000);
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
  return apiFetch("/api/authority/advisories", { headers: getAuthHeaders() }, 4000);
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

export async function verifyAdminUser(userId, status, notes = "") {
  return apiFetch(`/api/admin/users/${userId}/verify`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, notes })
  });
}

export async function verifyUserProfileUpdate(userId, status, notes = "") {
  return apiFetch(`/api/admin/users/${userId}/verify-profile-update`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, notes })
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

export async function fetchEmailGatewayConfig() {
  return apiFetch("/api/admin/email-config", {
    headers: getAuthHeaders()
  }, 5000);
}

export async function saveEmailGatewayConfig(payload) {
  return apiFetch("/api/admin/email-config", {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  }, 8000);
}

export async function sendTestEmailGateway(to) {
  return apiFetch("/api/admin/email-test", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ to })
  }, 14000);
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
  return apiFetch("/api/contact/helplines", { headers: getAuthHeaders() }, 4000);
}

export async function submitContactMessage(data) {
  return apiFetch("/api/contact", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
}

// ==========================================
// PAN-INDIA SMART CITY AI COPILOT / CHATBOT API
// ==========================================

export async function sendChatMessage(message) {
  return apiFetch("/api/chat", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message })
  }, 7000);
}

// ==========================================
// ACTIVE LOCATION SYNC & RECENT SEARCHES
// ==========================================

export async function updateActiveLocation(city, state) {
  return apiFetch("/api/auth/active-location", {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ city, state })
  }, 4000);
}

export async function fetchRecentSearches() {
  return apiFetch("/api/routes/recent-searches", {
    headers: getAuthHeaders()
  }, 5000);
}

// ==========================================
// MONGODB PLATFORM & DATA EXPLORER APIs
// ==========================================

export async function fetchDatabaseOverview() {
  return apiFetch("/api/database/overview", { headers: getAuthHeaders() }, 6000);
}

export async function fetchCollectionDocuments(collectionName, { page = 1, limit = 20, search = "", sortBy = "_id", sortOrder = "desc" } = {}) {
  const query = new URLSearchParams({
    page,
    limit,
    search,
    sortBy,
    sortOrder
  }).toString();
  return apiFetch(`/api/database/collection/${encodeURIComponent(collectionName)}?${query}`, {
    headers: getAuthHeaders()
  }, 7000);
}

export async function fetchDocumentDetails(collectionName, id) {
  return apiFetch(`/api/database/document/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders()
  }, 5000);
}

export function getDatabaseExportUrl(collectionName) {
  return `${BASE_URL}/api/database/export/${encodeURIComponent(collectionName)}`;
}

export async function downloadCollectionExport(collectionName) {
  const response = await fetch(getDatabaseExportUrl(collectionName), {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error("Admin clearance required to export data.");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `flowsense_${collectionName}_export.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

