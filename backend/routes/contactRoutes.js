const express = require("express");
const ContactMessage = require("../models/ContactMessage");
const MemoryStore = require("../utils/memoryStore");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// PAN-INDIA OFFICIAL EMERGENCY HELPLINES DIRECTORY
const NATIONAL_HELPLINES = [
  {
    code: "112",
    title: "National Emergency Helpline (All-in-One)",
    dept: "Ministry of Home Affairs (Police, Fire, Ambulance)",
    category: "Emergency",
    icon: "🚨",
    tollFree: true,
    available: "24/7",
    description: "Single unified emergency number for police, medical, fire, and disaster response across all Indian States & UTs."
  },
  {
    code: "1033",
    title: "NHAI National Highway Emergency Assistance",
    dept: "National Highways Authority of India (MoRTH)",
    category: "Highway Assistance",
    icon: "🛣️",
    tollFree: true,
    available: "24/7",
    description: "Emergency road assistance, highway towing, accident ambulance dispatch on all National Highways and Expressways."
  },
  {
    code: "1095",
    title: "Delhi & Capital Region Traffic Police Helpline",
    dept: "Traffic Police Headquarters",
    category: "Traffic Control",
    icon: "🚔",
    tollFree: true,
    available: "24/7",
    description: "Traffic emergency helpline, congestion reporting, and signal breakdown dispatch."
  },
  {
    code: "108",
    title: "Emergency Medical & Trauma Ambulance Response",
    dept: "State Emergency Medical Services",
    category: "Ambulance",
    icon: "🚑",
    tollFree: true,
    available: "24/7",
    description: "Free emergency hospital transit and life-support ambulance dispatch."
  },
  {
    code: "101",
    title: "Fire & Rescue Service",
    dept: "Fire Services Directorate",
    category: "Fire Emergency",
    icon: "🚒",
    tollFree: true,
    available: "24/7",
    description: "Fire rescue, hazardous material containment, and vehicle extrication."
  },
  {
    code: "1078",
    title: "National Disaster Response Force (NDRF)",
    dept: "NDMA Control Room",
    category: "Disaster / Floods",
    icon: "🛡️",
    tollFree: true,
    available: "24/7",
    description: "Emergency response for flash floods, cyclones, landslides, and major road collapses."
  },
  {
    code: "1091",
    title: "Women Safety & Highway Security",
    dept: "Police Special Cell",
    category: "Women Safety",
    icon: "👩",
    tollFree: true,
    available: "24/7",
    description: "Immediate emergency police response for women travelers and transit commuters."
  }
];

const STATE_TRAFFIC_DIRECTORY = [
  { state: "Delhi NCR", city: "New Delhi", phone: "011-25844444", controlRoom: "Delhi Traffic Police HQ, Todapur", website: "traffic.delhipolice.gov.in" },
  { state: "Maharashtra", city: "Mumbai", phone: "022-24937747", controlRoom: "Mumbai Traffic Police HQ, Worli", website: "trafficpolicemumbai.maharashtra.gov.in" },
  { state: "Karnataka", city: "Bengaluru", phone: "080-22943030", controlRoom: "Bengaluru Traffic Police (BTP) TMC, Infantry Rd", website: "btp.gov.in" },
  { state: "Telangana", city: "Hyderabad", phone: "040-27852482", controlRoom: "Hyderabad Traffic Command, Nampally", website: "htp.gov.in" },
  { state: "Tamil Nadu", city: "Chennai", phone: "044-23452330", controlRoom: "Greater Chennai Traffic Police Control, Vepery", website: "chennaitrafficpolice.gov.in" },
  { state: "West Bengal", city: "Kolkata", phone: "033-22143644", controlRoom: "Kolkata Traffic Police Lalbazar HQ", website: "kolkatatrafficpolice.gov.in" },
  { state: "Gujarat", city: "Ahmedabad", phone: "079-25630100", controlRoom: "Ahmedabad Traffic Police, Mithakhali", website: "ahmedabadcitypolice.org" },
  { state: "Punjab", city: "Jalandhar / Chandigarh", phone: "0181-2224476", controlRoom: "Punjab Highway Patrol Control, Sector 9", website: "punjabpolice.gov.in" },
  { state: "Uttar Pradesh", city: "Lucknow", phone: "0522-2207038", controlRoom: "UP 112 & Traffic Directorate, Gomti Nagar", website: "uppolice.gov.in" },
  { state: "Rajasthan", city: "Jaipur", phone: "0141-2561256", controlRoom: "Jaipur Traffic Police Control, JLN Marg", website: "police.rajasthan.gov.in" },
  { state: "Kerala", city: "Thiruvananthapuram / Kochi", phone: "0471-2558731", controlRoom: "Kerala State Traffic Enforcement Wing", website: "keralapolice.gov.in" },
  { state: "Odisha", city: "Bhubaneswar", phone: "0674-2536855", controlRoom: "Bhubaneswar-Cuttack Police Commissionerate", website: "odishapolice.gov.in" }
];

// GET /api/contact/helplines — Pan-India Directory
router.get("/helplines", (req, res) => {
  return res.json({
    success: true,
    nationalHelplines: NATIONAL_HELPLINES,
    stateDirectories: STATE_TRAFFIC_DIRECTORY
  });
});

// POST /api/contact — Submit Citizen Inquiry or Grievance to MongoDB
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, state, city, category, subject, message } = req.body || {};

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject, and message are required."
      });
    }

    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const ticketId = `FS-IND-${Date.now().toString().slice(-4)}${randomSuffix}`;

    // Determine priority automatically
    let priority = "MEDIUM";
    if (category === "EMERGENCY_TRAFFIC_ALERT") priority = "URGENT";
    else if (category === "SIGNAL_MALFUNCTION" || category === "POTHOLE_ROAD_GRIEVANCE") priority = "HIGH";
    else if (category === "GOVERNMENT_PARTNERSHIP" || category === "API_SMART_CITY_INTEGRATION") priority = "HIGH";

    let saved = null;
    if (global.isMongoConnected) {
      try {
        const contact = new ContactMessage({
          ticketId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : "",
          state: state || "National / Pan-India",
          city: city || "General",
          category: category || "GENERAL_INQUIRY",
          subject: subject.trim(),
          message: message.trim(),
          priority,
          status: "OPEN"
        });
        saved = await contact.save();
      } catch (e) {
        saved = null;
      }
    }

    if (!saved) {
      saved = MemoryStore.addContactMessage({
        ticketId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : "",
        state: state || "National / Pan-India",
        city: city || "General",
        category: category || "GENERAL_INQUIRY",
        subject: subject.trim(),
        message: message.trim(),
        priority,
        status: "OPEN"
      });
    }

    return res.status(201).json({
      success: true,
      ticketId,
      message: `Your grievance/inquiry has been registered under Tracking Ticket ${ticketId}. Our Operations team will review it within 24–48 hours.`,
      data: saved
    });
  } catch (error) {
    console.error("Contact submission error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit message: " + error.message
    });
  }
});

// GET /api/contact/tickets — Admin Oversight
router.get("/tickets", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const tickets = await ContactMessage.find().sort({ createdAt: -1 }).limit(100);
    return res.json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
