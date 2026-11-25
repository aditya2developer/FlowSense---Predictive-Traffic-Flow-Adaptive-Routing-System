const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

/**
 * FlowSense AI Copilot / Smart City Assistant Knowledge Base
 * Answers Pan-India routing, real-time telemetry, traffic engineering,
 * safety protocols, emergency dispatch, and municipal queries.
 */
async function generateAIResponse(userQuery) {
  const q = String(userQuery || "").toLowerCase().trim();

  // 1. PAN-INDIA REAL-TIME COVERAGE & LIVE DATA
  if (
    q.includes("cover") ||
    q.includes("state") ||
    q.includes("city") ||
    q.includes("real-time") ||
    q.includes("real time") ||
    q.includes("live data") ||
    q.includes("mongo") ||
    q.includes("database") ||
    q.includes("collection") ||
    q.includes("atlas")
  ) {
    let activeIncidentCount = 0;
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        activeIncidentCount = await mongoose.connection.db
          .collection("incidents")
          .countDocuments({ status: { $ne: "RESOLVED" } })
          .catch(() => 0);
      }
    } catch {
      activeIncidentCount = 0;
    }

    return {
      reply: `🌐 **FlowSense Pan-India Real-Time Intelligence Network:**\n\n` +
        `FlowSense operates live across **all 28 Indian States & 8 Union Territories (36 regions total)** with city-level selection:\n` +
        `• 🛣️ **Live Route & Place Autocomplete** — Multi-route pathfinding (OSRM) and Indian geocoding across highways, expressways, and city roads.\n` +
        `• 🌦️ **Live Weather & Air Quality (AQI)** — Real-time precipitation, visibility, temperature, wind speed, and US/Indian AQI per selected city.\n` +
        `• 🏥 **Emergency POIs** — Real-time lookup of nearest hospitals, police stations, and EV/fuel hubs around your active city.\n` +
        `• 🚨 **Community Hazard Grid** — ${activeIncidentCount} active community and authority hazards currently tracked across India.\n\n` +
        `👉 *Select your state & city from the top navbar anytime, or visit [Live Analytics](/dashboard).*`
    };
  }

  // 2. EMERGENCY & HELPLINES
  if (
    q.includes("emergency") ||
    q.includes("helpline") ||
    q.includes("police number") ||
    q.includes("ambulance") ||
    q.includes("accident call") ||
    q.includes("highway number") ||
    q.includes("sos") ||
    q.includes("contact")
  ) {
    return {
      reply: `🚨 **Pan-India Official Emergency Helplines (24x7 Toll-Free):**\n\n` +
        `• **112** — Unified National Emergency Helpline (Police, Fire & Medical across all 28 States & 8 UTs)\n` +
        `• **1033** — NHAI National Highway Assistance & Heavy Towing/Trauma Support\n` +
        `• **108 / 102** — Emergency Medical Services & ICU Trauma Ambulance\n` +
        `• **101** — Fire Brigade & Disaster Rescue Service\n` +
        `• **1078** — NDRF (National Disaster Response Force - Flash Floods & Landslides)\n` +
        `• **1091** — Women Safety & Highway Security Patrol\n\n` +
        `👉 *For localized state traffic control rooms and direct police dispatch, visit our [Contact & Helpline Directory](/contact).*`
    };
  }

  // 3. STABILITY SCORE EXPLANATION
  if (
    q.includes("stability") ||
    q.includes("score") ||
    q.includes("how it works") ||
    q.includes("algorithm") ||
    q.includes("calculation") ||
    q.includes("metric") ||
    q.includes("formula")
  ) {
    return {
      reply: `📊 **FlowSense Route Stability Score (0–100) Algorithm:**\n\n` +
        `Unlike standard GPS engines that only inspect current momentary speed, FlowSense computes dynamic route resilience using a 4-Factor Weighted Model:\n\n` +
        `1. **Traffic Volatility Analysis (40%)**: Evaluates time-series velocity across day-of-week and hour-of-day (IST) alongside road congestion curves.\n` +
        `2. **Speed Variance & Delay Risk (25%)**: Root Mean Square Error (RMSE) between nominal highway free-flow speed and current observed speed.\n` +
        `3. **Active Hazard Penalties (20%)**: Live collision, waterlogging, or pothole reports deduct up to 35 points depending on severity.\n` +
        `4. **Meteorological Grid Penalties (15%)**: Real-time precipitation, fog visibility (<200m), and aquaplaning risks from the Open-Meteo API.\n\n` +
        `**Classification Bands:**\n` +
        `• 🟢 **75–100 (Optimal)** — Consistent flow, minimal bottleneck volatility, lowest ETA variance.\n` +
        `• 🟡 **50–74 (Moderate Risk)** — Intermittent merge friction and minor congestion spikes.\n` +
        `• 🔴 **0–49 (Highly Unstable)** — Severe gridlock, waterlogging, or blocked lanes; detour strongly recommended.`
    };
  }

  // 4. GREEN CORRIDOR
  if (
    q.includes("green corridor") ||
    q.includes("organ transplant") ||
    q.includes("ambulance corridor") ||
    q.includes("traffic signal preemption") ||
    q.includes("clear corridor") ||
    q.includes("siren")
  ) {
    return {
      reply: `🚑 **Emergency Green Corridor Protocol:**\n\n` +
        `A Green Corridor is a dedicated, signal-preempted arterial pathway coordinated by Traffic Police for critical emergency transfers (e.g. cardiac donors, organ transplants, high-trauma ambulances).\n\n` +
        `**FlowSense Green Corridor Workflow:**\n` +
        `1. **Dispatch Initiation**: Authorized Traffic Police activate the corridor in the [Police Command Hub](/authority) selecting origin hospital and destination.\n` +
        `2. **Automated Signal Preemption**: Traffic signals along the corridor sequence are turned green 90 seconds ahead of vehicle arrival (cutting transit delay by ~45%).\n` +
        `3. **Civilian Advisory Broadcast**: Audible siren alerts and visual banners are pushed to all active commuters navigating nearby, instructing them to yield left.\n\n` +
        `*Authority credentials (\`AUTHORITY\` role) are required to initiate an active corridor.*`
    };
  }

  // 5. WEATHER & RAIN / FOG SAFETY
  if (
    q.includes("rain") ||
    q.includes("weather") ||
    q.includes("fog") ||
    q.includes("monsoon") ||
    q.includes("waterlog") ||
    q.includes("flood") ||
    q.includes("storm") ||
    q.includes("visibility")
  ) {
    return {
      reply: `🌧️ **Monsoon & Fog Road Safety Advisory:**\n\n` +
        `• **Waterlogging Navigation**: Avoid entering underpasses where water depth is unknown. Drive in 1st or 2nd gear at steady RPM. Never restart an engine that has stalled submerged in water.\n` +
        `• **Aquaplaning Prevention**: When driving on expressways (e.g. Yamuna Expressway, Mumbai-Pune, Samruddhi Mahamarg) during rain, tire treads lose grip above 70 km/h. Drop speed to 60–70 km/h and maintain a 4-car following distance.\n` +
        `• **Dense Fog Protocol**: Switch on low-beam headlights and yellow fog lights. Guide your vehicle using the solid white road edge paint line, never oncoming headlights.\n\n` +
        `👉 *Check the live weather telemetry cards on the Home page for real-time precipitation and visibility metrics.*`
    };
  }

  // 6. REPORTING A HAZARD
  if (
    q.includes("report") ||
    q.includes("hazard") ||
    q.includes("pothole") ||
    q.includes("accident") ||
    q.includes("roadblock") ||
    q.includes("broken") ||
    q.includes("incident")
  ) {
    return {
      reply: `⚠️ **Reporting Road Hazards in FlowSense:**\n\n` +
        `Citizens, commuters, and emergency personnel can report road hazards across India via the [Report Hazard Portal](/report):\n\n` +
        `1. **City Selection**: Select any Indian state and city across India.\n` +
        `2. **Hazard Type**: Select from Collision, Pothole, Severe Waterlogging, Road Construction, Fallen Trees, or Fire.\n` +
        `3. **Location, Photo & Severity**: Attach incident photo evidence, mark the landmark, and set severity (LOW / MEDIUM / HIGH / CRITICAL).\n` +
        `4. **Instant Synchronization**: Syncs live across commuters and Traffic Police alerts for your city!`
    };
  }

  // 7. SPEED LIMITS ON INDIAN ROADS
  if (
    q.includes("speed limit") ||
    q.includes("fast") ||
    q.includes("highway speed") ||
    q.includes("expressway speed") ||
    q.includes("challan") ||
    q.includes("fine") ||
    q.includes("radar")
  ) {
    return {
      reply: `⚡ **Official Speed Limits on Indian Roadways (MoRTH Gazette):**\n\n` +
        `• **Access-Controlled Expressways** (Delhi-Mumbai, Purvanchal, NE-1): **120 km/h** for Cars (M1); **100 km/h** for Heavy Commercial Vehicles.\n` +
        `• **4-Lane / 6-Lane National Highways (NH)**: **100 km/h** for 4-wheelers; **80 km/h** for 2-wheelers.\n` +
        `• **State Highways & City Arterials**: **70–80 km/h**.\n` +
        `• **Urban City Corridors & Municipal Sectors**: **50 km/h** (School / Hospital safety zones: **25–30 km/h**).\n\n` +
        `🛡️ *FlowSense speed telemetry flags high-variance overspeeding to assist highway patrol safety dispatch.*`
    };
  }

  // 8. ROLES & AUTHENTICATION
  if (
    q.includes("admin") ||
    q.includes("police") ||
    q.includes("commuter") ||
    q.includes("role") ||
    q.includes("account") ||
    q.includes("login") ||
    q.includes("register") ||
    q.includes("credential")
  ) {
    return {
      reply: `🛡️ **FlowSense Multi-Tier Role-Based Access Control (RBAC):**\n\n` +
        `• 👤 **Public Commuter (\`PUBLIC\`)** — Real-time route stability evaluation, city weather & AQI grid, and verified hazard reporting.\n` +
        `• 👮 **Traffic Police (\`AUTHORITY\`)** — City/district jurisdiction command, Green Corridor preemption, and live incident dispatch (requires Badge/Government ID verification).\n` +
        `• 👑 **Administrator (\`ADMIN\`)** — Platform governance, Police badge & user profile update approval, and system oversight.\n\n` +
        `👉 *Sign in or register with Email OTP verification at the [Login Portal](/login).*`
    };
  }

  // 9. DEFAULT SMART CITY COPILOT GREETING
  return {
    reply: `🤖 **FlowSense Smart City AI Copilot is online!**\n\n` +
      `I can assist you with:\n` +
      `• 🌐 **Pan-India Coverage**: Live routes, weather, AQI, and hazards across all 28 States & 8 UTs.\n` +
      `• 📊 **Stability Score**: Learn how our 4-factor multi-tier algorithm calculates route resilience.\n` +
      `• 🚨 **Emergency Helplines**: Official toll-free numbers (**112**, **1033**, **108**, **101**).\n` +
      `• 🚑 **Green Corridors**: How Police synchronize signals for critical emergency vehicles.\n` +
      `• 🌧️ **Weather Safety**: Guidelines for heavy monsoon, fog, and aquaplaning.\n` +
      `• ⚠️ **Hazard Reporting**: Submitting photo-verified potholes and accident spots for action.\n\n` +
      `*Feel free to ask any question or tap one of the quick prompt chips below!*`
  };
}

// POST /api/chat — Real-time AI Copilot endpoint
router.post("/", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Query message is required." });
    }

    const { reply } = await generateAIResponse(message);

    return res.json({
      success: true,
      query: message,
      reply,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Chatbot API error:", error);
    return res.status(500).json({ success: false, message: "Chatbot engine error." });
  }
});

module.exports = router;
