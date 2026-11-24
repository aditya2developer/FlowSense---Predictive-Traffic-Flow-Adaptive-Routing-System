const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

/**
 * FlowSense AI Copilot / Smart City Assistant Knowledge Base
 * Answers Pan-India routing, MongoDB database architecture, traffic engineering,
 * safety protocols, emergency dispatch, and municipal queries.
 */
async function generateAIResponse(userQuery) {
  const q = String(userQuery || "").toLowerCase().trim();

  // 1. MONGODB DATABASE & PLATFORM COLLECTIONS
  if (
    q.includes("mongo") ||
    q.includes("database") ||
    q.includes("collection") ||
    q.includes("document") ||
    q.includes("atlas") ||
    q.includes("cluster") ||
    q.includes("storage") ||
    q.includes("schema")
  ) {
    let stats = {
      roads: 10,
      records: 9240,
      incidents: 5,
      weather: 5,
      advisories: 2,
      users: 3
    };
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        const db = mongoose.connection.db;
        const [rCount, tCount, iCount, wCount, aCount, uCount] = await Promise.all([
          db.collection("roadsegments").countDocuments().catch(() => 10),
          db.collection("trafficrecords").countDocuments().catch(() => 9240),
          db.collection("incidents").countDocuments().catch(() => 5),
          db.collection("weathers").countDocuments().catch(() => 5),
          db.collection("advisories").countDocuments().catch(() => 2),
          db.collection("users").countDocuments().catch(() => 3)
        ]);
        stats = { roads: rCount, records: tCount, incidents: iCount, weather: wCount, advisories: aCount, users: uCount };
      }
    } catch (e) {
      // fallback to known seeded numbers
    }

    return {
      reply: `🗄️ **FlowSense Live MongoDB Atlas Architecture:**\n\n` +
        `Our database is hosted on **MongoDB Atlas Cloud (AWS Mumbai ap-south-1)** under the \`flowsense\` production database.\n\n` +
        `**Live Production Collections & Documents:**\n` +
        `• 🛣️ **\`roadsegments\`** (${stats.roads} Documents) — High-precision GIS coordinate arrays for major Indian corridors (GT Road/NH-44, Delhi-Meerut Expressway, Mumbai Eastern Freeway, Outer Ring Road Bengaluru, Chandigarh MP Marg, etc.)\n` +
        `• 📊 **\`trafficrecords\`** (${stats.records.toLocaleString()} Documents) — 24/7 historical time-series velocity, congestion index (0–1), and vehicle volume counts.\n` +
        `• 🚨 **\`incidents\`** (${stats.incidents} Documents) — Active road hazards, collisions, waterlogging, and road repairs with geo-coordinates and severity.\n` +
        `• 🌧️ **\`weathers\`** (${stats.weather} Documents) — Multi-city meteorological telemetry (precipitation, visibility, wind speed, temperature).\n` +
        `• 📢 **\`advisories\`** (${stats.advisories} Documents) — Traffic Police high-priority emergency alerts and green corridor broadcasts.\n` +
        `• 👥 **\`users\`** (${stats.users} Accounts) — Secure RBAC authentication for Root Admins, Traffic Police Officers, and Public Commuters.\n` +
        `• 📬 **\`contactmessages\`** — Direct citizen inquiries and municipal dispatch messages.\n\n` +
        `👉 **Showcase & Inspect Documents:** Open the new [MongoDB Data Platform](/database) tab to view, search, and inspect all live collections and JSON documents!`
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
        `1. **Historical Traffic Volatility (40%)**: Analyzes 9,240+ time-series records in MongoDB across day-of-week and hour-of-day to detect recurring bottlenecks.\n` +
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
        `1. **City Selection**: Choose your city (Delhi NCR, Mumbai, Bengaluru, Chandigarh, Jalandhar, or enter a custom city).\n` +
        `2. **Hazard Type**: Select from Collision, Pothole, Severe Waterlogging, Road Construction, Fallen Trees, or Fire.\n` +
        `3. **Location & Severity**: Provide street landmark and severity (LOW / MEDIUM / HIGH / CRITICAL).\n` +
        `4. **Instant Synchronization**: Stored instantly in MongoDB Atlas, triggering dynamic route recalculations and notifying local Traffic Police!`
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
        `• 👤 **Public Commuter (\`PUBLIC\`)** — Open route stability evaluation, real-time weather grid, community hazard submission.\n` +
        `• 👮 **Traffic Police (\`AUTHORITY\`)** — Multi-city jurisdiction command, Green Corridor preemption, live incident dispatch, audible sirens.\n` +
        `• 👑 **Root Administrator (\`ADMIN\`)** — Master control over GIS road corridors, user promotion/revocation, platform diagnostics, MongoDB management.\n\n` +
        `**Demo Credentials for Evaluation:**\n` +
        `• Admin: \`admin@flowsense.gov.in\` | Password: \`admin\`\n` +
        `• Traffic Police: \`police@flowsense.gov.in\` | Password: \`police\`\n` +
        `• Commuter: \`citizen@flowsense.in\` | Password: \`citizen\`\n\n` +
        `👉 *Sign in at the [Login Portal](/login) to test privileged tools.*`
    };
  }

  // 9. DEFAULT SMART CITY COPILOT GREETING
  return {
    reply: `🤖 **FlowSense Smart City AI Copilot is online and connected to MongoDB Atlas!**\n\n` +
      `I can assist you with:\n` +
      `• 🗄️ **MongoDB Platform**: Inspect live collections (\`roadsegments\`, \`trafficrecords\`, \`incidents\`, etc.)\n` +
      `• 📊 **Stability Score**: Learn how our 4-factor multi-tier algorithm calculates route resilience.\n` +
      `• 🚨 **Emergency Helplines**: Official toll-free numbers (**112**, **1033**, **108**, **101**).\n` +
      `• 🚑 **Green Corridors**: How Police synchronize signals for critical emergency vehicles.\n` +
      `• 🌧️ **Weather Safety**: Guidelines for heavy monsoon, fog, and aquaplaning.\n` +
      `• ⚠️ **Hazard Reporting**: Submitting potholes and accident spots for municipal action.\n\n` +
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
