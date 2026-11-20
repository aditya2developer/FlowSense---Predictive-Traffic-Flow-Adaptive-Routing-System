const express = require("express");
const router = express.Router();

/**
 * FlowSense AI Copilot / Smart City Assistant Knowledge Base
 * Answers Pan-India routing, traffic engineering, safety, emergency and municipal queries.
 */
function generateAIResponse(userQuery) {
  const q = String(userQuery || "").toLowerCase().trim();

  // 1. EMERGENCY & HELPLINES
  if (q.includes("emergency") || q.includes("helpline") || q.includes("police number") || q.includes("ambulance") || q.includes("accident call") || q.includes("highway number") || q.includes("contact")) {
    return {
      reply: `🚨 **Pan-India Official Emergency Helplines:**\n\n` +
        `• **112** — Unified National Emergency Helpline (Police, Fire & Medical across all States)\n` +
        `• **1033** — NHAI National Highway Emergency Assistance & Towing Service\n` +
        `• **108 / 102** — Emergency Medical & Trauma Ambulance Response\n` +
        `• **101** — Fire & Disaster Rescue Service\n` +
        `• **1078** — NDRF (Disaster Management & Flash Floods)\n` +
        `• **1091** — Women Safety & Highway Security Patrol\n\n` +
        `💡 *You can also visit our [Contact & Helpline Directory](/contact) for state-specific control rooms.*`
    };
  }

  // 2. STABILITY SCORE EXPLANATION
  if (q.includes("stability") || q.includes("score") || q.includes("how it works") || q.includes("algorithm") || q.includes("calculation") || q.includes("metric")) {
    return {
      reply: `📊 **How FlowSense Route Stability Score (0–100) Works:**\n\n` +
        `Standard GPS only looks at vehicle speeds *right now*. FlowSense combines:\n\n` +
        `1. **Historical Traffic Memory (40%)**: Recurring time-series bottlenecks across 7 days and 24 hours stored in MongoDB.\n` +
        `2. **Speed Variability & Delay Risk (25%)**: Root Mean Square Error (RMSE) between historical speed and live speed.\n` +
        `3. **Active Road Hazards & Incidents (20%)**: Active collisions, waterlogging, or construction along the corridor.\n` +
        `4. **Real-Time Meteorology (15%)**: Real-time precipitation, fog, and wind from the Open-Meteo API grid.\n\n` +
        `• **75–100 (Green)**: Optimal Corridor — Consistent flow, minimal bottleneck volatility.\n` +
        `• **50–74 (Amber)**: Moderate Risk — Merge friction and minor slowdowns.\n` +
        `• **0–49 (Red)**: Highly Unstable — Severe bottlenecks, accidents, or waterlogging.`
    };
  }

  // 3. GREEN CORRIDOR
  if (q.includes("green corridor") || q.includes("organ transplant") || q.includes("ambulance corridor") || q.includes("traffic signal preemption") || q.includes("clear corridor")) {
    return {
      reply: `🚑 **Emergency Green Corridor Protocol:**\n\n` +
        `A Green Corridor is a dedicated, signal-preempted route created by Traffic Police for time-critical emergency vehicles (such as live organ donor transfers, cardiac trauma patients, or fire engines).\n\n` +
        `**How FlowSense Powers Green Corridors:**\n` +
        `1. **Hospital Dispatch**: Authorized Traffic Police select the origin hospital and destination in the [Police Command Hub](/authority).\n` +
        `2. **Automated Signal Preemption**: Traffic signals along the route are synchronized green in sequence (average 45% travel time reduction).\n` +
        `3. **Civilian Broadcast**: Critical siren alerts are pushed to drivers' navigation feeds instructing them to yield right-of-way.\n\n` +
        `*Authority access is required to dispatch active corridors.*`
    };
  }

  // 4. WEATHER & RAIN / FOG SAFETY
  if (q.includes("rain") || q.includes("weather") || q.includes("fog") || q.includes("monsoon") || q.includes("waterlog") || q.includes("flood") || q.includes("storm")) {
    return {
      reply: `🌧️ **Monsoon & Fog Road Safety Guidelines:**\n\n` +
        `• **Waterlogging**: Avoid low-lying underpasses. Drive in 1st or 2nd gear at steady engine RPM. Never restart an engine that has stalled in deep water.\n` +
        `• **Hydroplaning**: On expressways (e.g. Yamuna, Mumbai-Pune, Samruddhi), water films reduce tire traction. Drop speed below 70 km/h and maintain 4-car following distance.\n` +
        `• **Dense Fog**: Turn on low-beam headlights and yellow fog lamps. Follow white road edge line markings rather than oncoming headlights.\n\n` +
        `💡 *Check the live weather badge on the Home page for real-time precipitation and visibility data for your city!*`
    };
  }

  // 5. REPORTING A HAZARD
  if (q.includes("report") || q.includes("hazard") || q.includes("pothole") || q.includes("accident") || q.includes("roadblock") || q.includes("broken")) {
    return {
      reply: `📝 **Reporting Road Hazards in FlowSense:**\n\n` +
        `Anyone (citizens, drivers, police) can report road issues across any Indian state at the [Report Hazard Portal](/report):\n\n` +
        `1. Select your city (Delhi, Mumbai, Bengaluru, Chandigarh, Kolkata, Chennai, etc. or custom city).\n` +
        `2. Choose hazard type (Collision, Pothole, Waterlogging, Construction, Roadblock, Fire, Debris).\n` +
        `3. Enter landmark or street name and severity level.\n` +
        `4. **Submit**: It is immediately saved in MongoDB, alerts local Traffic Police, and informs other commuters with AI safety recommendations!`
    };
  }

  // 6. SPEED LIMITS ON INDIAN ROADS
  if (q.includes("speed limit") || q.includes("fast") || q.includes("highway speed") || q.includes("expressway speed") || q.includes("challan") || q.includes("fine")) {
    return {
      reply: `🛣️ **Official Speed Limits on Indian Roadways (MoRTH Guidelines):**\n\n` +
        `• **Access-Controlled Expressways** (e.g. Delhi-Mumbai, NE-1, Purvanchal): **120 km/h** for M1 Passenger Cars; **100 km/h** for Commercial Vehicles.\n` +
        `• **4-Lane & 6-Lane National Highways (NH)**: **100 km/h** for Cars; **80 km/h** for Two-Wheelers.\n` +
        `• **State Highways & Arterial Roads**: **70–80 km/h**.\n` +
        `• **Urban City Roads & Municipal Sectors**: **50 km/h** (Schools/Hospital zones: **25–30 km/h**).\n\n` +
        `⚠️ *Speed radars monitored by FlowSense trigger automated traffic police alerts if severe overspeeding occurs.*`
    };
  }

  // 7. ROLES & ADMIN CAPABILITIES
  if (q.includes("admin") || q.includes("police") || q.includes("commuter") || q.includes("role") || q.includes("account") || q.includes("login") || q.includes("register")) {
    return {
      reply: `👥 **FlowSense User Roles & Access Architecture:**\n\n` +
        `• **Citizen / Commuter (\`PUBLIC\`)**: Open AI routing, real-time weather grid, stability comparison, and community hazard reporting.\n` +
        `• **Traffic Police (\`AUTHORITY\`)**: Multi-city jurisdiction command, audible emergency siren alerts, Green Corridor preemption, and hazard resolution.\n` +
        `• **Global Administrator (\`ADMIN\`)**: Root control over MongoDB traffic memory, road corridor GIS waypoints, RBAC user promotions, and platform diagnostics.\n\n` +
        `🔐 *To access official tools, sign in via the [Login Portal](/login).*`
    };
  }

  // 8. DEFAULT INTELLIGENT HELPFUL RESPONSE
  return {
    reply: `👋 **FlowSense Smart City Copilot at your service!**\n\n` +
      `I can assist you with:\n` +
      `• **Navigation**: Route stability analysis & fastest highway paths across India.\n` +
      `• **Emergency**: National helpline numbers (**112**, **1033**, **108**, **101**).\n` +
      `• **Dispatches**: How Traffic Police synchronize emergency Green Corridors.\n` +
      `• **Safety**: Driving precautions during heavy rains, fog, or waterlogging.\n` +
      `• **Reporting**: Submitting citizen hazard reports for potholes, collisions, or roadblocks.\n` +
      `• **Official Help**: Contacting state traffic police and municipal control rooms.\n\n` +
      `*Feel free to ask any question about Indian road safety, traffic systems, or FlowSense features!*`
  };
}

// POST /api/chat — Real-time AI Copilot endpoint
router.post("/", (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Query message is required." });
    }

    const { reply } = generateAIResponse(message);

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
