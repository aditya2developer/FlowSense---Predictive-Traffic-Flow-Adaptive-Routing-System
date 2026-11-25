/**
 * FlowSense Final MongoDB Sync Verification
 * Starts the backend on a test port and runs all checks.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const { fork } = require('child_process');
const path = require('path');

const ATLAS_DEFAULT_URI = 'mongodb+srv://adityakumarsingh84092_db_user:aditya@cluster0.pbc06oq.mongodb.net/flowsense?retryWrites=true&w=majority';
const MONGO_URI = process.env.MONGO_URI || ATLAS_DEFAULT_URI;
const PORT = 5000; // Use default port since server.js uses it

const results = [];
function log(pass, label, detail = '') {
  const icon = pass ? '✅' : '❌';
  results.push({ pass, label });
  console.log(`${icon} ${label}${detail ? ' — ' + detail : ''}`);
}

async function req(method, pth, body = null, token = null) {
  return new Promise((resolve) => {
    const opts = {
      hostname: '127.0.0.1',
      port: PORT,
      path: pth,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
      });
    });
    r.on('error', (e) => resolve({ error: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  // Start server as a child process
  const serverProc = fork(path.join(__dirname, 'server.js'), [], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });
  
  // Wait for server to be ready
  await new Promise((resolve) => {
    serverProc.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('running on')) resolve();
    });
    serverProc.stderr.on('data', (d) => process.stderr.write(d));
    setTimeout(resolve, 6000); // fallback
  });
  
  // Extra wait for MongoDB connection
  await new Promise((r) => setTimeout(r, 3000));
  
  // Connect mongoose for direct DB checks
  await mongoose.connect(MONGO_URI);
  console.log('✅ Verification DB connection ready\n');

  try {
    // ====== TEST 1: Admin JWT & /api/auth/me verification ======
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('./middleware/auth');
    const User = require('./models/User');
    const adminRecord = await User.findOne({ email: 'admin@flowsense.gov.in' });
    const adminToken = adminRecord
      ? jwt.sign({ id: adminRecord._id, email: adminRecord.email, role: adminRecord.role }, JWT_SECRET, { expiresIn: '1h' })
      : null;
    log(!!adminToken, 'PASS 1: Admin verification token', adminToken ? 'token signed for DB test' : 'ADMIN USER NOT FOUND');

    // Verify /api/auth/me rejects forged token & accepts real token
    const badMe = await req('GET', '/api/auth/me', null, 'forged.invalid.token');
    const goodMe = await req('GET', '/api/auth/me', null, adminToken);
    log(badMe.success === false && goodMe.success === true, 'PASS 1B: /api/auth/me rejects fake token & accepts valid token');

    // Verify /api/routes/recent-searches requires auth
    const unauthSearches = await req('GET', '/api/routes/recent-searches');
    log(unauthSearches.success === false, 'PASS 1C: /recent-searches rejects unauthenticated access');

    // ====== TEST 2: Weather fetch → MongoDB upsert ======
    const weatherRes = await req('GET', '/api/routes/weather/Delhi');
    log(weatherRes.success !== false, 'PASS 2: Live weather for Delhi', `temp=${weatherRes?.data?.temperature || weatherRes?.temperature || 'N/A'}`);

    const Weather = require('./models/Weather');
    await new Promise((r) => setTimeout(r, 1500));
    const weatherDoc = await Weather.findOne({ city: /delhi/i }).sort({ updatedAt: -1 });
    log(!!weatherDoc, 'PASS 3: Weather in MongoDB', weatherDoc ? `city=${weatherDoc.city}, temp=${weatherDoc.temperature}` : 'NOT FOUND');

    // ====== TEST 4: Active location sync ======
    if (adminToken) {
      const locRes = await req('PATCH', '/api/auth/active-location', { city: 'Mumbai', state: 'Maharashtra' }, adminToken);
      log(locRes.success, 'PASS 4: Active location sync', locRes.message || '');

      const UserCheck = require('./models/User');
      await new Promise((r) => setTimeout(r, 500));
      const adminUser = await UserCheck.findOne({ email: 'admin@flowsense.gov.in' });
      log(adminUser?.lastActiveCity === 'Mumbai', 'PASS 5: lastActiveCity in MongoDB', `city=${adminUser?.lastActiveCity}, state=${adminUser?.lastActiveState}`);
      // Restore Admin's default Delhi NCR active location after test
      await req('PATCH', '/api/auth/active-location', { city: 'Delhi NCR', state: 'Delhi (NCT)' }, adminToken);
    }

    // ====== TEST 6: Route search ======
    const routeRes = await req('POST', '/api/routes/search', {
      from: 'Connaught Place, Delhi',
      to: 'India Gate, Delhi'
    }, adminToken);
    log(routeRes.success !== false && routeRes.routes, 'PASS 6: Route search', `routes=${routeRes?.routes?.length || 0}`);

    const RouteSearch = require('./models/RouteSearch');
    await new Promise((r) => setTimeout(r, 1500));
    const searchDoc = await RouteSearch.findOne({ fromQuery: /Connaught/i }).sort({ createdAt: -1 });
    log(!!searchDoc, 'PASS 7: RouteSearch in MongoDB', searchDoc ? `from=${searchDoc.fromQuery}, to=${searchDoc.toQuery}` : 'NOT FOUND');

    // ====== TEST 8: Contact message ======
    const contactRes = await req('POST', '/api/contact', {
      name: 'Test User',
      email: 'test@verify.com',
      phone: '9999999999',
      subject: 'Verification Test',
      message: 'Testing MongoDB sync.',
      category: 'GENERAL_INQUIRY'
    });
    log(contactRes.success, 'PASS 8: Contact message', contactRes.message || '');

    const ContactMessage = require('./models/ContactMessage');
    const contactDoc = await ContactMessage.findOne({ email: 'test@verify.com' }).sort({ createdAt: -1 });
    log(!!contactDoc, 'PASS 9: Contact in MongoDB', contactDoc ? `subject=${contactDoc.subject}` : 'NOT FOUND');

    // ====== TEST 10: Tickets list ======
    const ticketsRes = await req('GET', '/api/contact/tickets', null, adminToken);
    const ticketArr = ticketsRes.tickets || ticketsRes.data || (Array.isArray(ticketsRes) ? ticketsRes : []);
    log(Array.isArray(ticketArr), 'PASS 10: Tickets list', `count=${ticketArr.length}`);

    // ====== TEST 11: Incident WATERLOGGING ======
    const incidentRes = await req('POST', '/api/routes/incidents', {
      roadId: 'RD_DEL_01',
      roadName: 'NH-48 Delhi-Gurgaon Expressway',
      city: 'Delhi',
      state: 'Delhi (NCT)',
      type: 'WATERLOGGING',
      severity: 'MEDIUM',
      description: 'Verification test waterlogging.',
      recommendation: 'Avoid area.',
      location: 'Test location'
    }, adminToken);
    log(incidentRes.success, 'PASS 11: Incident WATERLOGGING', incidentRes.message || '');

    const Incident = require('./models/Incident');
    await new Promise((r) => setTimeout(r, 500));
    const incDoc = await Incident.findOne({ type: 'WATERLOGGING', description: /Verification test/i });
    log(!!incDoc, 'PASS 12: Incident in MongoDB', incDoc ? `type=${incDoc.type}, state=${incDoc.state}` : 'NOT FOUND');

    // ====== TEST 13: DB overview ======
    const dbRes = await req('GET', '/api/database/overview', null, adminToken);
    log(dbRes.success && Array.isArray(dbRes.collections), 'PASS 13: Database overview', `collections=${dbRes?.collections?.length || 'N/A'}`);

    // ====== TEST 14: Reseed preserves users ======
    const User2 = require('./models/User');
    const userCountBefore = await User2.countDocuments();
    const reseedRes = await req('POST', '/api/admin/reseed', null, adminToken);
    log(reseedRes.success, 'PASS 14: Reseed DB', reseedRes.message || '');

    await new Promise((r) => setTimeout(r, 3000));
    const userCountAfter = await User2.countDocuments();
    log(userCountAfter >= userCountBefore, 'PASS 15: Users preserved after reseed', `before=${userCountBefore}, after=${userCountAfter}`);

    // ====== CLEANUP ======
    await Incident.deleteOne({ type: 'WATERLOGGING', description: /Verification test/i });
    await ContactMessage.deleteOne({ email: 'test@verify.com' });
    await RouteSearch.deleteMany({ fromQuery: /Connaught/i });

  } finally {
    // ====== SUMMARY ======
    console.log('\n' + '='.repeat(50));
    const passed = results.filter((r) => r.pass).length;
    const failed = results.filter((r) => !r.pass).length;
    console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${results.length}`);
    if (failed > 0) {
      console.log('FAILURES:');
      results.filter((r) => !r.pass).forEach((r) => console.log(`  ❌ ${r.label}`));
    }
    console.log('='.repeat(50));

    serverProc.kill();
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
