require('dotenv').config();
const mongoose = require('mongoose');
const RoadSegment = require('./models/RoadSegment');
const TrafficRecord = require('./models/TrafficRecord');
const Incident = require('./models/Incident');
const Weather = require('./models/Weather');
const Advisory = require('./models/Advisory');
const User = require('./models/User');

const ATLAS_DEFAULT_URI = 'mongodb+srv://adityakumarsingh84092_db_user:aditya@cluster0.pbc06oq.mongodb.net/flowsense?retryWrites=true&w=majority';
const MONGO_URI = process.env.MONGO_URI || ATLAS_DEFAULT_URI;

// Multi-City Corridors: Jalandhar, Delhi NCR, Mumbai, Bengaluru, Chandigarh
const roads = [
  // JALANDHAR & PUNJAB CORRIDORS
  {
    roadId: 'RD001',
    roadName: 'GT Road / NH-44 Highway Corridor (Jalandhar)',
    roadType: 'HIGHWAY',
    coordinates: [
      { latitude: 31.2206, longitude: 75.7696 }, // Phagwara
      { latitude: 31.2533, longitude: 75.7033 }, // LPU Gate
      { latitude: 31.2610, longitude: 75.6800 }, // Chaheru
      { latitude: 31.2720, longitude: 75.6550 }, // Deep Nagar / Cantt East
      { latitude: 31.2850, longitude: 75.6350 }, // Jalandhar Cantt Bypass
      { latitude: 31.3090, longitude: 75.6130 }, // Rama Mandi
      { latitude: 31.3180, longitude: 75.6020 }, // PAP Chowk
      { latitude: 31.3254, longitude: 75.5789 }  // BMC Chowk / Central Jalandhar
    ]
  },
  {
    roadId: 'RD002',
    roadName: 'Nakodar Road Corridor (Jalandhar)',
    roadType: 'MAIN_ROAD',
    coordinates: [
      { latitude: 31.3150, longitude: 75.5720 }, // Nakodar Chowk
      { latitude: 31.3010, longitude: 75.5900 },
      { latitude: 31.2850, longitude: 75.5700 }, // Wadala
      { latitude: 31.2600, longitude: 75.5450 }, // Lambra
      { latitude: 31.2300, longitude: 75.5200 }  // Towards Nakodar
    ]
  },
  {
    roadId: 'RD003',
    roadName: 'Phagwara - Cantt Link Road (Punjab)',
    roadType: 'MAIN_ROAD',
    coordinates: [
      { latitude: 31.2250, longitude: 75.7500 },
      { latitude: 31.2500, longitude: 75.6950 },
      { latitude: 31.2700, longitude: 75.6400 },
      { latitude: 31.2850, longitude: 75.6170 } // Cantt Railway Station
    ]
  },
  {
    roadId: 'RD004',
    roadName: 'Jalandhar - Amritsar Highway (NH-3)',
    roadType: 'HIGHWAY',
    coordinates: [
      { latitude: 31.3250, longitude: 75.5780 }, // Central
      { latitude: 31.3400, longitude: 75.5500 }, // Maqsudan
      { latitude: 31.3650, longitude: 75.5150 }, // Bidhipur
      { latitude: 31.4000, longitude: 75.4600 }  // Kartarpur
    ]
  },
  {
    roadId: 'RD005',
    roadName: 'Model Town - Bus Stand Arterial (Jalandhar)',
    roadType: 'LOCAL_ROAD',
    coordinates: [
      { latitude: 31.3260, longitude: 75.5820 }, // Bus Stand
      { latitude: 31.3200, longitude: 75.5800 }, // BMC Chowk
      { latitude: 31.3120, longitude: 75.5750 }, // Model Town Market
      { latitude: 31.2950, longitude: 75.5900 }, // Defence Colony
      { latitude: 31.2850, longitude: 75.6170 }  // Cantt Link
    ]
  },

  // DELHI NCR CORRIDORS
  {
    roadId: 'RD_DEL_01',
    roadName: 'NH-48 Delhi-Gurgaon Expressway (CP to IGI Airport)',
    roadType: 'HIGHWAY',
    coordinates: [
      { latitude: 28.6315, longitude: 77.2167 }, // Connaught Place
      { latitude: 28.6139, longitude: 77.2090 }, // Shanti Path / Diplomatic Enclave
      { latitude: 28.5921, longitude: 77.1600 }, // Dhaula Kuan Junction
      { latitude: 28.5610, longitude: 77.1350 }, // Subroto Park
      { latitude: 28.5480, longitude: 77.1200 }, // Mahipalpur Flyover
      { latitude: 28.5562, longitude: 77.1000 }, // Aerocity
      { latitude: 28.5562, longitude: 77.0850 }  // IGI Airport Terminal 3
    ]
  },
  {
    roadId: 'RD_DEL_02',
    roadName: 'Ring Road & Barapullah Elevated (AIIMS to Noida DND)',
    roadType: 'HIGHWAY',
    coordinates: [
      { latitude: 28.5672, longitude: 77.2100 }, // AIIMS New Delhi
      { latitude: 28.5720, longitude: 77.2300 }, // South Extension
      { latitude: 28.5850, longitude: 77.2550 }, // Lajpat Nagar
      { latitude: 28.5890, longitude: 77.2750 }, // Sarai Kale Khan
      { latitude: 28.5800, longitude: 77.3000 }, // DND Flyway Toll
      { latitude: 28.5700, longitude: 77.3200 }  // Noida Sector 18
    ]
  },

  // MUMBAI CORRIDORS
  {
    roadId: 'RD_MUM_01',
    roadName: 'Bandra-Worli Sea Link & Western Arterial (BKC to Nariman Pt)',
    roadType: 'HIGHWAY',
    coordinates: [
      { latitude: 19.0657, longitude: 72.8686 }, // BKC
      { latitude: 19.0544, longitude: 72.8402 }, // Kalanagar Bandra
      { latitude: 19.0430, longitude: 72.8220 }, // Bandra Reclamation
      { latitude: 19.0200, longitude: 72.8150 }, // Bandra-Worli Sea Link
      { latitude: 18.9980, longitude: 72.8120 }, // Worli Sea Face
      { latitude: 18.9720, longitude: 72.8100 }, // Haji Ali / Pedder Rd
      { latitude: 18.9400, longitude: 72.8200 }, // Marine Drive
      { latitude: 18.9256, longitude: 72.8242 }  // Nariman Point
    ]
  },

  // BENGALURU CORRIDORS
  {
    roadId: 'RD_BLR_01',
    roadName: 'Outer Ring Road & Marathahalli Tech Corridor (Koramangala to Whitefield)',
    roadType: 'MAIN_ROAD',
    coordinates: [
      { latitude: 12.9352, longitude: 77.6245 }, // Koramangala 5th Block
      { latitude: 12.9270, longitude: 77.6350 }, // Sony World Signal
      { latitude: 12.9220, longitude: 77.6750 }, // Bellandur EcoSpace
      { latitude: 12.9350, longitude: 77.6950 }, // Devarabeesanahalli
      { latitude: 12.9550, longitude: 77.7020 }, // Marathahalli Bridge
      { latitude: 12.9698, longitude: 77.7499 }  // ITPB Whitefield
    ]
  },

  // CHANDIGARH / TRICITY CORRIDORS
  {
    roadId: 'RD_CHD_01',
    roadName: 'Airport Road PR-7 & Himalayan Arterial (Sector 17 to Airport)',
    roadType: 'MAIN_ROAD',
    coordinates: [
      { latitude: 30.7398, longitude: 76.7827 }, // Sector 17 Plaza
      { latitude: 30.7200, longitude: 76.7850 }, // Sector 34 / 35 Chowk
      { latitude: 30.7050, longitude: 76.7900 }, // Tribune Chowk
      { latitude: 30.6850, longitude: 76.8050 }, // Hallomajra Light Point
      { latitude: 30.6700, longitude: 76.8200 }, // Zirakpur Junction
      { latitude: 30.6735, longitude: 76.7885 }  // Chandigarh Intl Airport
    ]
  }
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getTrafficForHour(hour) {
  if (hour >= 7 && hour <= 9) {
    return {
      level: 'HIGH',
      speed: () => 14 + Math.random() * 12,
      count: () => 210 + Math.floor(Math.random() * 70)
    };
  }
  if (hour >= 10 && hour <= 11) {
    return {
      level: 'MEDIUM',
      speed: () => 28 + Math.random() * 10,
      count: () => 130 + Math.floor(Math.random() * 50)
    };
  }
  if (hour >= 12 && hour <= 14) {
    return {
      level: 'MEDIUM',
      speed: () => 30 + Math.random() * 10,
      count: () => 140 + Math.floor(Math.random() * 50)
    };
  }
  if (hour >= 17 && hour <= 20) {
    return {
      level: 'HIGH',
      speed: () => 12 + Math.random() * 14,
      count: () => 240 + Math.floor(Math.random() * 80)
    };
  }
  if (hour >= 22 || hour <= 5) {
    return {
      level: 'LOW',
      speed: () => 52 + Math.random() * 12,
      count: () => 20 + Math.floor(Math.random() * 30)
    };
  }
  return {
    level: 'LOW',
    speed: () => 40 + Math.random() * 12,
    count: () => 70 + Math.floor(Math.random() * 45)
  };
}

async function runSeed({ preserveUserRecords = false } = {}) {
  console.log('Seeding FlowSense database...');
  await RoadSegment.deleteMany({});
  await TrafficRecord.deleteMany({});
  await Incident.deleteMany({});
  await Weather.deleteMany({});
  await Advisory.deleteMany({});
  if (!preserveUserRecords) {
    await User.deleteMany({});
    console.log('Cleared all user records for fresh seed.');
  } else {
    console.log('Preserving existing user records.');
  }

  // 1. Insert Road Segments
  await RoadSegment.insertMany(roads);
  console.log(`Seeded ${roads.length} road corridors across India.`);

  // 2. Generate Historical Traffic Memory Readings
  const trafficRecords = [];
  const hours = [0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

  for (const road of roads) {
    for (const day of days) {
      for (const hour of hours) {
        const traffic = getTrafficForHour(hour);
        const recordsPerSlot = hour >= 7 && hour <= 20 ? 8 : 4;
        for (let i = 0; i < recordsPerSlot; i++) {
          const baseDate = new Date();
          baseDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 45));
          baseDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

          trafficRecords.push({
            roadId: road.roadId,
            roadName: road.roadName,
            timestamp: baseDate,
            dayOfWeek: day,
            hour,
            vehicleCount: traffic.count(),
            averageSpeed: Number(traffic.speed().toFixed(1)),
            congestionLevel: traffic.level
          });
        }
      }
    }
  }

  await TrafficRecord.insertMany(trafficRecords);
  console.log(`Seeded ${trafficRecords.length} historical traffic readings.`);

  // 3. Seed Realistic Incidents
  await Incident.insertMany([
    {
      roadId: 'RD001',
      roadName: 'GT Road / NH-44 Highway Corridor (Jalandhar)',
      city: 'Jalandhar',
      type: 'ACCIDENT',
      severity: 'HIGH',
      description: 'Multi-vehicle collision near Chaheru Bridge; left 2 lanes obstructed.',
      recommendation: 'Reduce speed to 30 km/h, merge into right lane early. Consider Cantt link bypass.',
      reportedBy: 'Highway Traffic Patrol',
      location: 'Near Chaheru Flyover, NH-44',
      status: 'ACTIVE'
    },
    {
      roadId: 'RD_DEL_01',
      roadName: 'NH-48 Delhi-Gurgaon Expressway',
      city: 'Delhi',
      type: 'CONSTRUCTION',
      severity: 'MEDIUM',
      description: 'Underpass expansion work near Mahipalpur Flyover; speed restriction 40 km/h.',
      recommendation: 'Speed enforced at 40 km/h. Plan 15 mins extra travel time to IGI Airport.',
      reportedBy: 'NHAI Road Safety Cell',
      location: 'Mahipalpur Junction, Delhi',
      status: 'ACTIVE'
    },
    {
      roadId: 'RD_MUM_01',
      roadName: 'Bandra-Worli Sea Link & Western Arterial',
      city: 'Mumbai',
      type: 'BREAKDOWN',
      severity: 'LOW',
      description: 'Bus stalled on southbound shoulder near Worli exit. Tow truck en route.',
      recommendation: 'Maintain center lane. Towing crane deployed by Mumbai Traffic Police.',
      reportedBy: 'Mumbai Traffic Police (West)',
      location: 'Worli Sea Face Southbound',
      status: 'ACTIVE'
    },
    {
      roadId: 'RD_BLR_01',
      roadName: 'Outer Ring Road & Marathahalli Tech Corridor',
      city: 'Bengaluru',
      type: 'FLOOD',
      severity: 'MEDIUM',
      description: 'Waterlogging near Bellandur EcoSpace service lane. Slow moving traffic.',
      recommendation: 'Use elevated main carriage-way instead of service road. Avoid low-ground sedans.',
      reportedBy: 'BBMP Control Room',
      location: 'Bellandur EcoSpace Service Road',
      status: 'ACTIVE'
    },
    {
      roadId: 'RD_CHD_01',
      roadName: 'Airport Road PR-7 & Himalayan Arterial',
      city: 'Chandigarh',
      type: 'POTHOLE',
      severity: 'MEDIUM',
      description: 'Deep road surface depressions near Zirakpur merge light point.',
      recommendation: 'Two-wheelers drive with caution. Diversion cones placed by Tricity Traffic Cell.',
      reportedBy: 'Tricity Traffic Wing',
      location: 'Near Zirakpur Light Junction, PR-7',
      status: 'ACTIVE'
    }
  ]);
  console.log('Seeded multi-city active incidents.');

  // 4. Seed Weather Snapshots
  await Weather.insertMany([
    {
      city: 'Delhi',
      location: 'Connaught Place & IGI Hub',
      temperature: 28,
      humidity: 52,
      rainfall: 0,
      windSpeed: 8,
      condition: 'Clear',
      visibility: 6
    },
    {
      city: 'Mumbai',
      location: 'Bandra & Nariman Point',
      temperature: 31,
      humidity: 78,
      rainfall: 1.2,
      windSpeed: 16,
      condition: 'Cloudy',
      visibility: 8
    },
    {
      city: 'Bengaluru',
      location: 'Koramangala & Whitefield Tech Zone',
      temperature: 24,
      humidity: 62,
      rainfall: 0.5,
      windSpeed: 10,
      condition: 'Rain',
      visibility: 9
    },
    {
      city: 'Chandigarh',
      location: 'Sector 17 & Airport PR-7',
      temperature: 26,
      humidity: 48,
      rainfall: 0,
      windSpeed: 6,
      condition: 'Clear',
      visibility: 9
    },
    {
      city: 'Jalandhar',
      location: 'Central Arterial & NH-44',
      temperature: 27,
      humidity: 55,
      rainfall: 0,
      windSpeed: 7,
      condition: 'Clear',
      visibility: 8
    }
  ]);
  console.log('Seeded multi-city meteorological snapshots.');

  // 5. Seed Initial Advisories
  await Advisory.insertMany([
    {
      title: '🚨 EMERGENCY GREEN CORRIDOR ACTIVE: AMBULANCE',
      message: 'Organ transplant transfer vehicle moving along NH-44 & Central Expressway. Traffic signal preemption active.',
      severity: 'CRITICAL',
      affectedRoad: 'GT Road / NH-44 Highway Corridor',
      issuedBy: 'Traffic Police Headquarters (Insp. Sharma)',
      status: 'ACTIVE'
    },
    {
      title: '⚠️ PEAK HOUR MERGING ADVISORY',
      message: 'Heavy volume reported on arterial merge ramps. Adaptive stability score recommending alternate ring road bypass.',
      severity: 'WARNING',
      affectedRoad: 'Central Express Corridors',
      issuedBy: 'Smart City Control Room',
      status: 'ACTIVE'
    }
  ]);
  console.log('Seeded critical emergency advisories.');

  // 6. Ensure Default Core Users Exist
  const defaultUsers = [
    {
      name: "Aditya Kr Singh",
      email: "admin@flowsense.gov.in",
      password: "admin",
      role: "ADMIN",
      department: "Smart Mobility Headquarters",
      badgeNumber: "SYS-ADMIN-01"
    },
    {
      name: "Inspector Rajesh Sharma",
      email: "police@flowsense.gov.in",
      password: "police",
      role: "AUTHORITY",
      department: "City Traffic Police & Dispatch Wing",
      badgeNumber: "TP-8409"
    },
    {
      name: "Priya Verma",
      email: "citizen@flowsense.in",
      password: "citizen",
      role: "PUBLIC",
      department: "Daily Commuter (Car / Transit)",
      badgeNumber: "CITIZEN-001"
    }
  ];

  for (const u of defaultUsers) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const newUser = new User(u);
      await newUser.save();
      console.log(`Created default user: ${u.email} (${u.role})`);
    }
  }

  return {
    roads: roads.length,
    trafficRecords: trafficRecords.length,
    incidents: 4,
    weather: 5,
    advisories: 2
  };
}

// Standalone execution
if (require.main === module) {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log('Connected to MongoDB for CLI seed');
      const stats = await runSeed();
      console.log('Seeding complete:', stats);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}

module.exports = { runSeed, roads };
