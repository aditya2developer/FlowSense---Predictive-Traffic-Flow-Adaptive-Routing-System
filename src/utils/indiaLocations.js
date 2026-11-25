/**
 * Complete Registry of ALL 28 Indian States & 8 Union Territories (36 total)
 * with coordinates and curated origin-destination corridors per city.
 */
export const INDIA_STATES_AND_UTS = [
  // 28 STATES
  {
    state: "Andhra Pradesh",
    type: "State",
    cities: [
      {
        name: "Visakhapatnam",
        lat: 17.6868,
        lon: 83.2185,
        defaultFrom: "RK Beach Road, Visakhapatnam, Andhra Pradesh",
        defaultTo: "Visakhapatnam International Airport, NAD Junction",
        corridors: ["Beach Road (NH-16)", "Gajuwaka Industrial Flyover", "MVP Colony - NAD Corridor"]
      },
      {
        name: "Vijayawada",
        lat: 16.5062,
        lon: 80.6480,
        defaultFrom: "Benz Circle, Vijayawada, Andhra Pradesh",
        defaultTo: "Vijayawada Junction Railway Station",
        corridors: ["MG Road Bandar Corridor", "Prakasam Barrage Link", "NH-16 Inner Ring Road"]
      },
      {
        name: "Tirupati",
        lat: 13.6288,
        lon: 79.4192,
        defaultFrom: "Tirupati Central Railway Station, Andhra Pradesh",
        defaultTo: "Tirupati International Airport, Renigunta",
        corridors: ["Renigunta Highway NH-716", "Alipiri Link Road"]
      }
    ]
  },
  {
    state: "Arunachal Pradesh",
    type: "State",
    cities: [
      {
        name: "Itanagar",
        lat: 27.0844,
        lon: 93.6053,
        defaultFrom: "Ganga Market, Itanagar, Arunachal Pradesh",
        defaultTo: "Naharlagun Railway Station, Arunachal Pradesh",
        corridors: ["NH-415 Itanagar-Naharlagun Highway", "Hollongi Airport Corridor"]
      }
    ]
  },
  {
    state: "Assam",
    type: "State",
    cities: [
      {
        name: "Guwahati",
        lat: 26.1445,
        lon: 91.7362,
        defaultFrom: "Paltan Bazar Railway Station, Guwahati, Assam",
        defaultTo: "Lokpriya Gopinath Bordoloi International Airport, Guwahati",
        corridors: ["NH-27 Guwahati Bypass", "GS Road Dispur Arterial", "Jalukbari - Borjhar Highway"]
      },
      {
        name: "Silchar",
        lat: 24.8333,
        lon: 92.7789,
        defaultFrom: "Silchar Town Center, Assam",
        defaultTo: "NIT Silchar Campus, Assam",
        corridors: ["NH-37 Silchar Bypass", "Hailakandi Road"]
      }
    ]
  },
  {
    state: "Bihar",
    type: "State",
    cities: [
      {
        name: "Patna",
        lat: 25.5941,
        lon: 85.1376,
        defaultFrom: "Patna Junction, Fraser Road, Patna, Bihar",
        defaultTo: "Jay Prakash Narayan International Airport, Patna",
        corridors: ["JP Ganga Path (Marine Drive)", "Bailey Road Arterial", "Atal Path Expressway"]
      },
      {
        name: "Gaya",
        lat: 24.7914,
        lon: 85.0002,
        defaultFrom: "Gaya Junction, Bihar",
        defaultTo: "Mahabodhi Temple, Bodh Gaya, Bihar",
        corridors: ["NH-22 Bodh Gaya Corridor", "Station Road"]
      }
    ]
  },
  {
    state: "Chhattisgarh",
    type: "State",
    cities: [
      {
        name: "Raipur",
        lat: 21.2514,
        lon: 81.6296,
        defaultFrom: "Raipur Junction Railway Station, Chhattisgarh",
        defaultTo: "Swami Vivekananda Airport, Mana, Raipur",
        corridors: ["Nava Raipur Expressway", "VIP Road Airport Link", "GE Road Arterial"]
      },
      {
        name: "Bilaspur",
        lat: 22.0797,
        lon: 82.1409,
        defaultFrom: "Bilaspur Junction, Chhattisgarh",
        defaultTo: "Nehru Chowk, Bilaspur",
        corridors: ["Vyapar Vihar Ring Road", "NH-130 Bypass"]
      }
    ]
  },
  {
    state: "Goa",
    type: "State",
    cities: [
      {
        name: "Panaji",
        lat: 15.4909,
        lon: 73.8278,
        defaultFrom: "Miramar Circle, Panaji, Goa",
        defaultTo: "Goa International Airport, Dabolim, Goa",
        corridors: ["Atal Setu Mandovi Bridge", "NH-66 Panaji-Margao Highway"]
      },
      {
        name: "Margao",
        lat: 15.2832,
        lon: 73.9862,
        defaultFrom: "Madgaon Railway Station, Goa",
        defaultTo: "Colva Beach Circle, Goa",
        corridors: ["NH-66 Margao Bypass", "Eastern Bypass Road"]
      }
    ]
  },
  {
    state: "Gujarat",
    type: "State",
    cities: [
      {
        name: "Ahmedabad",
        lat: 23.0225,
        lon: 72.5714,
        defaultFrom: "SG Highway, Prahlad Nagar, Ahmedabad, Gujarat",
        defaultTo: "Sardar Vallabhbhai Patel International Airport, Ahmedabad",
        corridors: ["Sardar Patel Ring Road (NH-147)", "SG Highway Corridor", "Ashram Road Riverfront"]
      },
      {
        name: "Surat",
        lat: 21.1702,
        lon: 72.8311,
        defaultFrom: "Surat Railway Station, Gujarat",
        defaultTo: "Surat International Airport, Dumas Road",
        corridors: ["Dumas Road Diamond Corridor", "Outer Ring Road Surat"]
      },
      {
        name: "Vadodara",
        lat: 22.3072,
        lon: 73.1812,
        defaultFrom: "Alkapuri Circle, Vadodara, Gujarat",
        defaultTo: "Vadodara Airport, Harni",
        corridors: ["NH-48 Vadodara Bypass", "VIP Road"]
      }
    ]
  },
  {
    state: "Haryana",
    type: "State",
    cities: [
      {
        name: "Gurugram",
        lat: 28.4595,
        lon: 77.0266,
        defaultFrom: "DLF Cyber Hub, Sector 24, Gurugram, Haryana",
        defaultTo: "HUDA City Centre / Millennium City, Gurugram",
        corridors: ["NH-48 Delhi-Gurgaon Expressway", "Golf Course Road", "Dwarka Expressway"]
      },
      {
        name: "Faridabad",
        lat: 28.4089,
        lon: 77.3178,
        defaultFrom: "Badkhal Chowk, Faridabad, Haryana",
        defaultTo: "Ballabgarh Terminal, NH-19, Faridabad",
        corridors: ["NH-19 Mathura Road Corridor", "Faridabad Bypass"]
      }
    ]
  },
  {
    state: "Himachal Pradesh",
    type: "State",
    cities: [
      {
        name: "Shimla",
        lat: 31.1048,
        lon: 77.1734,
        defaultFrom: "ISBT Tutikandi, Shimla, Himachal Pradesh",
        defaultTo: "Sanjauli / Kufri Bypass, Shimla",
        corridors: ["NH-5 Kalka-Shimla Highway", "Circular Cart Road"]
      },
      {
        name: "Dharamshala",
        lat: 32.2190,
        lon: 76.3234,
        defaultFrom: "Dharamshala Bus Stand, Himachal Pradesh",
        defaultTo: "McLeod Ganj Square, Himachal Pradesh",
        corridors: ["Kotwali Bazaar Arterial", "Gaggal Airport Highway"]
      }
    ]
  },
  {
    state: "Jharkhand",
    type: "State",
    cities: [
      {
        name: "Ranchi",
        lat: 23.3441,
        lon: 85.3096,
        defaultFrom: "Albert Ekka Chowk, Main Road, Ranchi, Jharkhand",
        defaultTo: "Birsa Munda Airport, Hinoo, Ranchi",
        corridors: ["Ranchi Ring Road", "Kanke Road", "Hinoo Airport Boulevard"]
      },
      {
        name: "Jamshedpur",
        lat: 22.8046,
        lon: 86.2029,
        defaultFrom: "Tatanagar Railway Station, Jamshedpur, Jharkhand",
        defaultTo: "Sakchi Golchakkar, Jamshedpur",
        corridors: ["Marine Drive Adityapur", "NH-33 Mango Highway"]
      }
    ]
  },
  {
    state: "Karnataka",
    type: "State",
    cities: [
      {
        name: "Bengaluru",
        lat: 12.9716,
        lon: 77.5946,
        defaultFrom: "Koramangala 5th Block Startup Corridor, Bengaluru",
        defaultTo: "ITPB International Tech Park, Whitefield, Bengaluru",
        corridors: ["Outer Ring Road (Silk Board to Whitefield)", "Hosur Elevated Expressway", "Old Airport Road"]
      },
      {
        name: "Mysuru",
        lat: 12.2958,
        lon: 76.6394,
        defaultFrom: "Mysore Palace Circle, Mysuru, Karnataka",
        defaultTo: "Infosys Campus, Hebbal Industrial Area, Mysuru",
        corridors: ["Bengaluru-Mysuru Expressway (NH-275)", "Outer Ring Road Mysuru"]
      }
    ]
  },
  {
    state: "Kerala",
    type: "State",
    cities: [
      {
        name: "Kochi",
        lat: 9.9312,
        lon: 76.2673,
        defaultFrom: "Vytila Mobility Hub, Kochi, Kerala",
        defaultTo: "Cochin International Airport, Nedumbassery",
        corridors: ["NH-66 Edappally Bypass", "Seaport-Airport Road", "MG Road Ernakulam"]
      },
      {
        name: "Thiruvananthapuram",
        lat: 8.5241,
        lon: 76.9366,
        defaultFrom: "Technopark Phase 1, Kazhakkoottam, Thiruvananthapuram",
        defaultTo: "Thiruvananthapuram International Airport",
        corridors: ["NH-66 Kazhakkoottam Bypass", "MG Road Kowdiar Link"]
      }
    ]
  },
  {
    state: "Madhya Pradesh",
    type: "State",
    cities: [
      {
        name: "Indore",
        lat: 22.7196,
        lon: 75.8577,
        defaultFrom: "Rajwada Square, Indore, Madhya Pradesh",
        defaultTo: "Devi Ahilya Bai Holkar Airport, Indore",
        corridors: ["AB Road BRTS Corridor", "Super Corridor (TCS/Infosys)", "Indore Ring Road"]
      },
      {
        name: "Bhopal",
        lat: 23.2599,
        lon: 77.4126,
        defaultFrom: "MP Nagar Zone 1, Bhopal, Madhya Pradesh",
        defaultTo: "Raja Bhoj Airport, Gandhi Nagar, Bhopal",
        corridors: ["VIP Road Upper Lake", "Hoshangabad Road", "Kolar Arterial"]
      }
    ]
  },
  {
    state: "Maharashtra",
    type: "State",
    cities: [
      {
        name: "Mumbai",
        lat: 19.0760,
        lon: 72.8777,
        defaultFrom: "Bandra Kurla Complex (BKC Financial District), Mumbai",
        defaultTo: "Nariman Point & Marine Drive Promenade, South Mumbai",
        corridors: ["Bandra-Worli Sea Link", "Western Express Highway", "Eastern Freeway"]
      },
      {
        name: "Pune",
        lat: 18.5204,
        lon: 73.8567,
        defaultFrom: "Shivajinagar, Pune, Maharashtra",
        defaultTo: "Hinjewadi Rajiv Gandhi Infotech Park Phase 1, Pune",
        corridors: ["Mumbai-Pune Expressway", "Wakad-Hinjewadi Ring Road", "Nagar Road"]
      },
      {
        name: "Nagpur",
        lat: 21.1458,
        lon: 79.0882,
        defaultFrom: "Zero Mile Freedom Park, Nagpur, Maharashtra",
        defaultTo: "MIHAN SEZ / Dr. Babasaheb Ambedkar International Airport, Nagpur",
        corridors: ["Wardha Road Corridor", "Samruddhi Mahamarg Interchange"]
      }
    ]
  },
  {
    state: "Manipur",
    type: "State",
    cities: [
      {
        name: "Imphal",
        lat: 24.8170,
        lon: 93.9368,
        defaultFrom: "Kangla Fort Gate, Imphal, Manipur",
        defaultTo: "Bir Tikendrajit International Airport, Imphal",
        corridors: ["Tiddim Road Airport Link", "NH-2 Imphal Arterial"]
      }
    ]
  },
  {
    state: "Meghalaya",
    type: "State",
    cities: [
      {
        name: "Shillong",
        lat: 25.5788,
        lon: 91.8933,
        defaultFrom: "Police Bazar (Khyndailad), Shillong, Meghalaya",
        defaultTo: "Umiam Lake Viewpoint, NH-6, Meghalaya",
        corridors: ["NH-6 Shillong Bypass", "GS Road Hill Arterial"]
      }
    ]
  },
  {
    state: "Mizoram",
    type: "State",
    cities: [
      {
        name: "Aizawl",
        lat: 23.7271,
        lon: 92.7176,
        defaultFrom: "Bara Bazar (Dawrpui), Aizawl, Mizoram",
        defaultTo: "Lengpui Airport Highway, Mizoram",
        corridors: ["NH-44A Lengpui Corridor", "Chanmari-Zarkawt Arterial"]
      }
    ]
  },
  {
    state: "Nagaland",
    type: "State",
    cities: [
      {
        name: "Kohima",
        lat: 25.6751,
        lon: 94.1086,
        defaultFrom: "Kohima War Cemetery, Nagaland",
        defaultTo: "Dimapur Junction, Nagaland",
        corridors: ["NH-29 Kohima-Dimapur Highway", "Circular Road"]
      }
    ]
  },
  {
    state: "Odisha",
    type: "State",
    cities: [
      {
        name: "Bhubaneswar",
        lat: 20.2961,
        lon: 85.8245,
        defaultFrom: "Master Canteen Square, Bhubaneswar, Odisha",
        defaultTo: "Biju Patnaik International Airport, Bhubaneswar",
        corridors: ["Janpath Smart Corridor", "NH-16 Jayadev Vihar Flyover", "Nandankanan Road"]
      },
      {
        name: "Cuttack",
        lat: 20.4625,
        lon: 85.8830,
        defaultFrom: "Badambadi Terminal, Cuttack, Odisha",
        defaultTo: "SCB Medical College, Cuttack",
        corridors: ["Ring Road Cuttack", "NH-16 Trisulia Link"]
      }
    ]
  },
  {
    state: "Punjab",
    type: "State",
    cities: [
      {
        name: "Jalandhar",
        lat: 31.3260,
        lon: 75.5762,
        defaultFrom: "Lovely Professional University (LPU Gate / NH-44), Phagwara",
        defaultTo: "Jalandhar Cantt Railway Station & Military Area, Punjab",
        corridors: ["GT Road / NH-44 Corridor", "Nakodar Road", "Phagwara - Cantt Link"]
      },
      {
        name: "Ludhiana",
        lat: 30.9010,
        lon: 75.8573,
        defaultFrom: "Ludhiana Junction, Clock Tower, Punjab",
        defaultTo: "Ferozepur Road / South City, Ludhiana",
        corridors: ["NH-44 Elevated Expressway", "Ferozepur Road"]
      },
      {
        name: "Amritsar",
        lat: 31.6340,
        lon: 74.8723,
        defaultFrom: "Golden Temple Heritage Corridor, Amritsar, Punjab",
        defaultTo: "Sri Guru Ram Dass Jee International Airport, Amritsar",
        corridors: ["GT Road BRTS Corridor", "Airport Highway NH-3"]
      }
    ]
  },
  {
    state: "Rajasthan",
    type: "State",
    cities: [
      {
        name: "Jaipur",
        lat: 26.9124,
        lon: 75.7873,
        defaultFrom: "Hawa Mahal / Badi Chaupar, Jaipur, Rajasthan",
        defaultTo: "Jaipur International Airport, Sanganer",
        corridors: ["JLN Marg Arterial", "Tonk Road Elevated", "Ajmer Road (NH-48)"]
      },
      {
        name: "Jodhpur",
        lat: 26.2389,
        lon: 73.0243,
        defaultFrom: "Clock Tower, Sardar Market, Jodhpur, Rajasthan",
        defaultTo: "AIIMS Jodhpur, Basni, Rajasthan",
        corridors: ["Pal Road Corridor", "AIIMS Residency Link"]
      },
      {
        name: "Udaipur",
        lat: 24.5854,
        lon: 73.7125,
        defaultFrom: "Fateh Sagar Lake Promenade, Udaipur, Rajasthan",
        defaultTo: "Maharana Pratap Airport, Dabok, Udaipur",
        corridors: ["NH-27 Dabok Expressway", "Hiran Magri Arterial"]
      }
    ]
  },
  {
    state: "Sikkim",
    type: "State",
    cities: [
      {
        name: "Gangtok",
        lat: 27.3389,
        lon: 88.6065,
        defaultFrom: "MG Marg Plaza, Gangtok, Sikkim",
        defaultTo: "Ranipool Junction, NH-10, Sikkim",
        corridors: ["NH-10 Gangtok Arterial", "Indira Bypass"]
      }
    ]
  },
  {
    state: "Tamil Nadu",
    type: "State",
    cities: [
      {
        name: "Chennai",
        lat: 13.0827,
        lon: 80.2707,
        defaultFrom: "T. Nagar Commercial Corridor, Chennai, Tamil Nadu",
        defaultTo: "Chennai International Airport, Meenambakkam",
        corridors: ["Anna Salai (Mount Road)", "OMR IT Expressway", "GST Road NH-45"]
      },
      {
        name: "Coimbatore",
        lat: 11.0168,
        lon: 76.9558,
        defaultFrom: "Gandhipuram Central Bus Stand, Coimbatore, Tamil Nadu",
        defaultTo: "Coimbatore International Airport, Peelamedu",
        corridors: ["Avinashi Road Elevated", "L&T Bypass NH-544"]
      },
      {
        name: "Madurai",
        lat: 9.9252,
        lon: 78.1198,
        defaultFrom: "Madurai Junction, Tamil Nadu",
        defaultTo: "Madurai Airport, Tamil Nadu",
        corridors: ["Ring Road Madurai", "Alagar Kovil Arterial"]
      }
    ]
  },
  {
    state: "Telangana",
    type: "State",
    cities: [
      {
        name: "Hyderabad",
        lat: 17.3850,
        lon: 78.4867,
        defaultFrom: "Hitec City & Mindspace IT Park, Cyberabad, Hyderabad",
        defaultTo: "Rajiv Gandhi International Airport (RGIA), Shamshabad, Hyderabad",
        corridors: ["PVNR Expressway", "Outer Ring Road (ORR)", "Gachibowli IT Corridor"]
      },
      {
        name: "Warangal",
        lat: 17.9689,
        lon: 79.5941,
        defaultFrom: "NIT Warangal Campus, Telangana",
        defaultTo: "Warangal Railway Station, Telangana",
        corridors: ["Hanamkonda-Kazipet NH-163", "Hunter Road"]
      }
    ]
  },
  {
    state: "Tripura",
    type: "State",
    cities: [
      {
        name: "Agartala",
        lat: 23.8315,
        lon: 91.2868,
        defaultFrom: "Ujjayanta Palace, Agartala, Tripura",
        defaultTo: "Maharaja Bir Bikram Airport, Agartala",
        corridors: ["Airport VIP Road", "NH-8 Agartala Bypass"]
      }
    ]
  },
  {
    state: "Uttar Pradesh",
    type: "State",
    cities: [
      {
        name: "Lucknow",
        lat: 26.8467,
        lon: 80.9462,
        defaultFrom: "Hazratganj Chowk, Lucknow, Uttar Pradesh",
        defaultTo: "Chaudhary Charan Singh International Airport, Lucknow",
        corridors: ["Shaheed Path Ring Road", "Gomti Nagar Express", "Kanpur Road Corridor"]
      },
      {
        name: "Noida",
        lat: 28.5355,
        lon: 77.3910,
        defaultFrom: "Noida Sector 18 Commercial Hub, Uttar Pradesh",
        defaultTo: "Noida Sector 62 Electronic City, Uttar Pradesh",
        corridors: ["Noida-Greater Noida Expressway", "DND Flyway", "MP Road 1"]
      },
      {
        name: "Varanasi",
        lat: 25.3176,
        lon: 82.9739,
        defaultFrom: "Varanasi Cantonment Railway Station, Uttar Pradesh",
        defaultTo: "Lal Bahadur Shastri International Airport, Babatpur",
        corridors: ["Babatpur Airport Four-Lane", "Varanasi Ring Road"]
      }
    ]
  },
  {
    state: "Uttarakhand",
    type: "State",
    cities: [
      {
        name: "Dehradun",
        lat: 30.3165,
        lon: 78.0322,
        defaultFrom: "Clock Tower (Ghanta Ghar), Dehradun, Uttarakhand",
        defaultTo: "Jolly Grant Airport, Dehradun, Uttarakhand",
        corridors: ["Rajpur Road", "Haridwar-Dehradun Expressway (NH-7)"]
      },
      {
        name: "Haridwar",
        lat: 29.9457,
        lon: 78.1642,
        defaultFrom: "Har Ki Pauri, Haridwar, Uttarakhand",
        defaultTo: "AIIMS Rishikesh, Uttarakhand",
        corridors: ["NH-34 Haridwar-Rishikesh Corridor", "SIDCUL Bypass"]
      }
    ]
  },
  {
    state: "West Bengal",
    type: "State",
    cities: [
      {
        name: "Kolkata",
        lat: 22.5726,
        lon: 88.3639,
        defaultFrom: "Howrah Railway Terminus & Howrah Bridge, Kolkata",
        defaultTo: "Netaji Subhash Chandra Bose International Airport (CCU), Kolkata",
        corridors: ["EM Bypass Arterial", "VIP Road Airport Link", "Maa Flyover"]
      },
      {
        name: "Siliguri",
        lat: 26.7271,
        lon: 88.3953,
        defaultFrom: "Siliguri Junction, West Bengal",
        defaultTo: "Bagdogra International Airport, West Bengal",
        corridors: ["Asian Highway AH-2", "Sevoke Road Arterial"]
      }
    ]
  },

  // 8 UNION TERRITORIES
  {
    state: "Delhi (NCT)",
    type: "Union Territory",
    cities: [
      {
        name: "Delhi NCR",
        lat: 28.6139,
        lon: 77.2090,
        defaultFrom: "Connaught Place (Rajiv Chowk), New Delhi",
        defaultTo: "Indira Gandhi International Airport, Terminal 3, New Delhi",
        corridors: ["NH-48 Delhi-Gurgaon Expressway", "Ring Road Barapullah", "DND Flyway"]
      }
    ]
  },
  {
    state: "Chandigarh",
    type: "Union Territory",
    cities: [
      {
        name: "Chandigarh",
        lat: 30.7333,
        lon: 76.7794,
        defaultFrom: "Sector 17 City Plaza, Chandigarh",
        defaultTo: "Shaheed Bhagat Singh International Airport (PR-7), Mohali/Chandigarh",
        corridors: ["Airport Road PR-7", "Madhya Marg", "Dakshin Marg"]
      }
    ]
  },
  {
    state: "Jammu & Kashmir",
    type: "Union Territory",
    cities: [
      {
        name: "Srinagar",
        lat: 34.0837,
        lon: 74.7973,
        defaultFrom: "Lal Chowk, Srinagar, Jammu & Kashmir",
        defaultTo: "Sheikh ul-Alam International Airport, Srinagar",
        corridors: ["Boulevard Dal Lake Road", "NH-44 Parimpora Bypass"]
      },
      {
        name: "Jammu",
        lat: 32.7266,
        lon: 74.8570,
        defaultFrom: "Jammu Tawi Railway Station, Jammu & Kashmir",
        defaultTo: "Katra Vaishno Devi Helipad, Jammu & Kashmir",
        corridors: ["NH-44 Jammu-Udhampur Highway", "BC Road Arterial"]
      }
    ]
  },
  {
    state: "Ladakh",
    type: "Union Territory",
    cities: [
      {
        name: "Leh",
        lat: 34.1526,
        lon: 77.5771,
        defaultFrom: "Leh Main Market, Ladakh",
        defaultTo: "Kushok Bakula Rimpochee Airport, Leh",
        corridors: ["NH-1 Leh-Srinagar Highway", "Fort Road Leh"]
      }
    ]
  },
  {
    state: "Puducherry",
    type: "Union Territory",
    cities: [
      {
        name: "Puducherry",
        lat: 11.9416,
        lon: 79.8083,
        defaultFrom: "Promenade Beach, White Town, Puducherry",
        defaultTo: "Auroville Visitor Center, Puducherry",
        corridors: ["East Coast Road (ECR)", "Bussy Street Boulevard"]
      }
    ]
  },
  {
    state: "Andaman & Nicobar Islands",
    type: "Union Territory",
    cities: [
      {
        name: "Port Blair",
        lat: 11.6234,
        lon: 92.7265,
        defaultFrom: "Aberdeen Bazaar, Sri Vijaya Puram (Port Blair)",
        defaultTo: "Veer Savarkar International Airport, Port Blair",
        corridors: ["Marine Hill Coastal Road", "NH-4 Andaman Trunk Road"]
      }
    ]
  },
  {
    state: "Dadra & Nagar Haveli and Daman & Diu",
    type: "Union Territory",
    cities: [
      {
        name: "Daman",
        lat: 20.3974,
        lon: 72.8328,
        defaultFrom: "Nani Daman Jetty, Daman",
        defaultTo: "Vapi Junction Railway Station, Gujarat/Daman",
        corridors: ["Daman-Vapi Link Road", "Coastal Devka Promenade"]
      },
      {
        name: "Silvassa",
        lat: 20.2763,
        lon: 73.0083,
        defaultFrom: "Kilvani Naka, Silvassa",
        defaultTo: "Dudhni Lakefront, Dadra & Nagar Haveli",
        corridors: ["Naroli Industrial Corridor", "Khanvel Hill Highway"]
      }
    ]
  },
  {
    state: "Lakshadweep",
    type: "Union Territory",
    cities: [
      {
        name: "Kavaratti",
        lat: 10.5593,
        lon: 72.6358,
        defaultFrom: "Kavaratti Secretariat Jetty, Lakshadweep",
        defaultTo: "Ujjra Mosque Lagoon Road, Kavaratti",
        corridors: ["Kavaratti Main Island Loop"]
      }
    ]
  }
];

export function getAllStates() {
  return INDIA_STATES_AND_UTS.map((s) => ({
    state: s.state,
    type: s.type,
    cityCount: s.cities.length
  }));
}

export function getCitiesForState(stateName) {
  const found = INDIA_STATES_AND_UTS.find(
    (s) => s.state.toLowerCase() === String(stateName || "").toLowerCase()
  );
  return found ? found.cities : [];
}

export function getFlatAllCities() {
  const list = [];
  for (const st of INDIA_STATES_AND_UTS) {
    for (const c of st.cities) {
      list.push({ ...c, state: st.state, type: st.type });
    }
  }
  return list;
}

export function findCityEntry(cityQuery) {
  const q = String(cityQuery || "").toLowerCase().trim();
  if (!q) return null;
  for (const st of INDIA_STATES_AND_UTS) {
    for (const c of st.cities) {
      if (
        c.name.toLowerCase() === q ||
        q.includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(q)
      ) {
        return { ...c, state: st.state };
      }
    }
  }
  return null;
}
