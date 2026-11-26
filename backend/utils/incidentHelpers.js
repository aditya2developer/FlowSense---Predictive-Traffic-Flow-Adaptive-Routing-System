const VALID_INCIDENT_STATUSES = ["ACTIVE", "RESOLVED", "VERIFIED"];

const ALLOWED_INCIDENT_TYPES = new Set([
  "ACCIDENT",
  "CONSTRUCTION",
  "FLOOD",
  "WATERLOGGING",
  "BREAKDOWN",
  "POTHOLE",
  "TRAFFIC_JAM",
  "ROADBLOCK",
  "FIRE_HAZARD",
  "STALLED_VEHICLE",
  "DEBRIS",
  "OTHER"
]);

const ALLOWED_INCIDENT_SEVERITIES = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a case-insensitive RegExp for smart city / jurisdiction matching.
 * Handles composite labels like "Jalandhar / Punjab" or metro aliases like "Delhi NCR".
 */
function buildCityRegex(city) {
  const raw = String(city || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "all" || lower === "all cities" || lower === "national" || lower === "all india") {
    return null;
  }

  const tokens = new Set();
  raw
    .split(/[/,|]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
    .forEach((part) => tokens.add(part));

  if (lower.includes("delhi")) {
    ["Delhi", "New Delhi", "Delhi NCR", "Noida", "Gurgaon", "Gurugram", "Ghaziabad", "Faridabad"].forEach((alias) =>
      tokens.add(alias)
    );
  } else if (lower.includes("bengaluru") || lower.includes("bangalore")) {
    tokens.add("Bengaluru");
    tokens.add("Bangalore");
  } else if (lower.includes("mumbai")) {
    tokens.add("Mumbai");
    tokens.add("Navi Mumbai");
    tokens.add("Thane");
  }

  const pattern = Array.from(tokens).map(escapeRegex).join("|");
  return pattern ? new RegExp(pattern, "i") : null;
}

/**
 * Validates and builds standardized DB update fields for incident status transitions.
 */
function buildIncidentStatusUpdate(rawStatusInput, actorName = "Official", note = "") {
  const rawStatus = String(rawStatusInput || "").toUpperCase().trim();
  if (!VALID_INCIDENT_STATUSES.includes(rawStatus)) {
    return { error: `status must be one of: ${VALID_INCIDENT_STATUSES.join(", ")}` };
  }

  const now = new Date();
  const cleanNote = String(note || "").trim();
  const updateFields = {
    status: rawStatus,
    updatedBy: actorName,
    lastUpdatedAt: now
  };

  if (cleanNote || rawStatus === "ACTIVE") {
    updateFields.statusNote = cleanNote;
  }

  if (rawStatus === "RESOLVED") {
    updateFields.resolvedBy = actorName;
    updateFields.resolvedAt = now;
  } else if (rawStatus === "VERIFIED") {
    updateFields.verifiedBy = actorName;
    updateFields.verifiedAt = now;
  } else if (rawStatus === "ACTIVE") {
    updateFields.resolvedBy = "";
    updateFields.resolvedAt = null;
    updateFields.verifiedBy = "";
    updateFields.verifiedAt = null;
  }

  return { rawStatus, updateFields };
}

module.exports = {
  VALID_INCIDENT_STATUSES,
  ALLOWED_INCIDENT_TYPES,
  ALLOWED_INCIDENT_SEVERITIES,
  buildCityRegex,
  buildIncidentStatusUpdate
};
