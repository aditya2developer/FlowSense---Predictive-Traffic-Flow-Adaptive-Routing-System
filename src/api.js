/**
 * FlowSense Centralized API Client
 * Provides complete API support for Public, Authority (Police/Government), and Admin personas.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "";

function getAuthHeaders() {
  const token = localStorage.getItem("flowsense_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

// ==========================================
// AUTHENTICATION APIs
// ==========================================

export async function loginUser(email, password, role) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role })
  });
  return response.json();
}

export async function registerUser(userData) {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  });
  return response.json();
}

export async function fetchCurrentUser() {
  const response = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function fetchDemoUsers() {
  const response = await fetch(`${BASE_URL}/api/auth/demo-users`);
  return response.json();
}

// ==========================================
// ROUTING & TRAFFIC MEMORY APIs
// ==========================================

export async function searchRoutes(from, to) {
  const response = await fetch(`${BASE_URL}/api/routes/search`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ from, to })
  });
  return response.json();
}

export async function fetchAnalytics(roadId) {
  const response = await fetch(
    `${BASE_URL}/api/routes/analytics/${encodeURIComponent(roadId)}`
  );
  return response.json();
}

export async function fetchIncidents(city) {
  const query = city && city !== "All" && city !== "All Cities" ? `?city=${encodeURIComponent(city)}` : "";
  const response = await fetch(`${BASE_URL}/api/routes/incidents${query}`);
  return response.json();
}

export async function reportIncident(data) {
  const response = await fetch(`${BASE_URL}/api/routes/incidents`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function resolveIncident(id) {
  const response = await fetch(`${BASE_URL}/api/routes/incidents/${id}/resolve`, {
    method: "PATCH",
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function fetchWeather(city = "Delhi") {
  const response = await fetch(
    `${BASE_URL}/api/routes/weather/${encodeURIComponent(city)}`
  );
  return response.json();
}

export async function fetchRoadSegments() {
  const response = await fetch(`${BASE_URL}/api/routes/segments`);
  return response.json();
}

// ==========================================
// TRAFFIC AUTHORITY (POLICE & OFFICIALS) APIs
// ==========================================

export async function fetchEnforcementStats(city) {
  const query = city && city !== "All" && city !== "All Cities" ? `?city=${encodeURIComponent(city)}` : "";
  const response = await fetch(`${BASE_URL}/api/authority/enforcement-stats${query}`, {
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function fetchAdvisories() {
  const response = await fetch(`${BASE_URL}/api/authority/advisories`);
  return response.json();
}

export async function createAdvisory(data) {
  const response = await fetch(`${BASE_URL}/api/authority/advisories`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function expireAdvisory(id) {
  const response = await fetch(`${BASE_URL}/api/authority/advisories/${id}/expire`, {
    method: "PATCH",
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function dispatchGreenCorridor(data) {
  const response = await fetch(`${BASE_URL}/api/authority/green-corridor`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return response.json();
}

// ==========================================
// MAIN ADMIN APIs (FULL CRUD & OVERRIDES)
// ==========================================

export async function fetchAdminStats() {
  const response = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function fetchAdminUsers() {
  const response = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function createAdminUser(userData) {
  const response = await fetch(`${BASE_URL}/api/admin/users`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });
  return response.json();
}

export async function updateUserRole(userId, newRole) {
  const response = await fetch(`${BASE_URL}/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ role: newRole })
  });
  return response.json();
}

export async function deleteAdminUser(userId) {
  const response = await fetch(`${BASE_URL}/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function fetchAdminSegments() {
  const response = await fetch(`${BASE_URL}/api/admin/segments`, {
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function createRoadSegment(segmentData) {
  const response = await fetch(`${BASE_URL}/api/admin/segments`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(segmentData)
  });
  return response.json();
}

export async function deleteRoadSegment(segmentId) {
  const response = await fetch(`${BASE_URL}/api/admin/segments/${segmentId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function fetchAdminIncidents() {
  const response = await fetch(`${BASE_URL}/api/admin/incidents`, {
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function updateIncidentStatus(incidentId, status) {
  const response = await fetch(`${BASE_URL}/api/admin/incidents/${incidentId}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  return response.json();
}

export async function deleteIncident(incidentId) {
  const response = await fetch(`${BASE_URL}/api/admin/incidents/${incidentId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function reseedDatabase() {
  const response = await fetch(`${BASE_URL}/api/admin/reseed`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  return response.json();
}

export async function triggerBroadcastAlert(alertData) {
  const response = await fetch(`${BASE_URL}/api/admin/broadcast-alert`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(alertData)
  });
  return response.json();
}

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}
