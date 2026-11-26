/**
 * Per-tab isolated session storage backed by window.sessionStorage.
 *
 * Each browser tab maintains its own independent authentication session:
 * - Different tabs can stay signed in to different accounts at the same time.
 * - Page reloads (F5) within a tab keep that tab's session intact.
 * - Signing out in one tab logs out only that tab; all other tabs keep their
 *   sessions before and after refresh.
 */

const TOKEN_KEY = "flowsense_token";
const USER_KEY = "flowsense_user";
const VERIFIED_AT_KEY = "flowsense_verified_at";

export function getTabToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getTabUserRaw() {
  try {
    return sessionStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function getTabVerifiedAt() {
  try {
    return Number(sessionStorage.getItem(VERIFIED_AT_KEY) || "0");
  } catch {
    return 0;
  }
}

export function saveTabSession(token, user, verifiedAt = Date.now()) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(VERIFIED_AT_KEY, String(verifiedAt));
  } catch {
    // Ignore storage quota or restricted context errors
  }
}

export function updateTabUser(user) {
  try {
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage quota errors
  }
}

export function updateTabVerifiedAt(verifiedAt = Date.now()) {
  try {
    sessionStorage.setItem(VERIFIED_AT_KEY, String(verifiedAt));
  } catch {
    // Ignore storage errors
  }
}

export function clearTabSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(VERIFIED_AT_KEY);
  } catch {
    // Ignore storage errors
  }
}
