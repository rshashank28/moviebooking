process.env.NODE_ENV = 'test';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../app');
const { generateAccessToken } = require('../utils/jwt');

const User = require('../models/User');
const Organizer = require('../models/Organizer');
const City = require('../models/City');
const Category = require('../models/Category');
const Venue = require('../models/Venue');
const Screen = require('../models/Screen');

describe('Phases 13 & 14: Organizer and Admin Test Suite', () => {
  let testServer;
  let baseUrl;
  let mongoServer;
  let adminToken = '';
  let customerToken = '';
  let organizerToken = '';
  let organizerId = '';
  let eventId = '';

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(0, resolve));
    const port = testServer.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // 1. Create Admin
    const adminUser = await User.create({
      name: 'Master Admin',
      email: `admin_${Date.now()}@showpulse.com`,
      password: 'Password@123',
      phone: '+919876543200',
      role: 'ADMIN'
    });
    adminToken = generateAccessToken(adminUser);

    // 2. Create Customer
    const customerUser = await User.create({
      name: 'Normal Customer',
      email: `cust_${Date.now()}@showpulse.com`,
      password: 'Password@123',
      role: 'CUSTOMER'
    });
    customerToken = generateAccessToken(customerUser);

    // 3. Create Organizer
    const orgRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pulse Live Team',
        email: `pulse_${Date.now()}@showpulse.com`,
        password: 'Password@123',
        phone: '+919876543201',
        role: 'ORGANIZER',
        organizationName: 'Pulse Live Concerts'
      })
    });
    const orgData = await orgRes.json();
    organizerToken = orgData.data.accessToken;

    const orgDoc = await Organizer.findOne({ user: orgData.data.user._id });
    if (orgDoc) {
      organizerId = orgDoc._id.toString();
    }
  });

  after(async () => {
    if (testServer) {
      await new Promise((resolve) => testServer.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('1. should fetch organizer stats & analytics', async () => {
    const res = await fetch(`${baseUrl}/api/organizer/stats`, {
      headers: { Authorization: `Bearer ${organizerToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.stats);
    assert.strictEqual(typeof body.data.stats.totalEvents, 'number');
    assert.strictEqual(typeof body.data.stats.totalRevenue, 'number');
  });

  it('2. should create a new event draft as organizer', async () => {
    const res = await fetch(`${baseUrl}/api/organizer/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        title: 'Neon Nights EDM Fest 2026',
        category: 'CONCERTS',
        artist: 'DJ Pulse',
        venueName: 'Koramangala Indoor Arena',
        address: '80ft Road, Koramangala',
        city: 'Bengaluru',
        date: new Date(Date.now() + 7 * 86400000).toISOString(),
        startTime: '07:00 PM',
        endTime: '11:00 PM',
        capacity: 500,
        ticketCategories: [
          { name: 'VIP Pass', price: 1500, capacity: 100, soldCount: 0, description: 'VIP Lounge' },
          { name: 'General Pass', price: 699, capacity: 400, soldCount: 0, description: 'Floor Access' }
        ]
      })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.title, 'Neon Nights EDM Fest 2026');
    eventId = body.data._id;
  });

  it('3. should export sales CSV as organizer', async () => {
    const res = await fetch(`${baseUrl}/api/organizer/export-csv`, {
      headers: { Authorization: `Bearer ${organizerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'text/csv; charset=utf-8');
  });

  it('4. should fetch admin system metrics overview', async () => {
    const res = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.overview);
    assert.strictEqual(typeof body.data.overview.totalUsers, 'number');
    assert.strictEqual(typeof body.data.overview.totalOrganizers, 'number');
  });

  it('5. Customer attempting admin endpoint should return 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  it('6. Customer attempting organizer endpoint should return 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/organizer/stats`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  it('7. Unauthenticated request to admin metrics should return 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/admin/metrics`);
    assert.strictEqual(res.status, 401);
  });

  it('8. should list platform users with pagination for admin', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  it('9. should list organizers for admin review', async () => {
    const res = await fetch(`${baseUrl}/api/admin/organizers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
  });

  it('10. should update organizer verification status by admin', async () => {
    const res = await fetch(`${baseUrl}/api/admin/organizers/${organizerId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'VERIFIED');
  });

  it('11. should create a system discount coupon as admin', async () => {
    const res = await fetch(`${baseUrl}/api/admin/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        code: 'ADMINFEST50',
        description: '50% off up to ₹200 on all tickets',
        discountType: 'PERCENTAGE',
        discountValue: 50,
        maxDiscount: 200,
        minOrderAmount: 400
      })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.code, 'ADMINFEST50');
  });

  it('12. should list system coupons as admin', async () => {
    const res = await fetch(`${baseUrl}/api/admin/coupons`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
  });
});
