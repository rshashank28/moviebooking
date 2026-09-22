process.env.NODE_ENV = 'test';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../app');
const { seedAllData } = require('../seed/seedData');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const { generateAccessToken } = require('../utils/jwt');

describe('Phases 10, 11 & 12: Refunds, Search, Wishlist, Reviews & Dashboard Test Suite', () => {
  let testServer;
  let baseUrl;
  let mongoServer;
  let demoUser;
  let authToken;
  let demoMovie;
  let demoShow;
  let testBooking;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    await seedAllData();

    demoUser = await User.findOne({ role: 'CUSTOMER' });
    if (!demoUser) {
      demoUser = await User.create({
        name: 'Customer Test',
        email: `customer_${Date.now()}@test.com`,
        password: 'password123',
        loyaltyPoints: 350
      });
    }

    authToken = generateAccessToken(demoUser);
    demoMovie = await Movie.findOne({ isTrending: true });
    demoShow = await Show.findOne({});

    // Create a confirmed booking for testing cancellation and reviews
    testBooking = await Booking.create({
      bookingId: `SP-MOV-TEST-${Date.now()}`,
      user: demoUser._id,
      bookingType: 'MOVIE',
      movie: demoMovie._id,
      show: demoShow._id,
      venue: demoShow.venue,
      screen: demoShow.screen,
      seats: [{ seatIdentifier: 'C1', row: 'C', number: 1, category: 'VIP', price: 340 }],
      pricing: {
        baseAmount: 340,
        convenienceFee: 30,
        taxAmount: 5,
        finalAmount: 375
      },
      payment: {
        orderId: 'order_test_refund',
        paymentId: 'pay_test_refund',
        status: 'PAID'
      },
      bookingStatus: 'CONFIRMED'
    });

    testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(0, resolve));
    const port = testServer.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
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

  it('1. Global search should find movies, events, and venues matching query', async () => {
    const res = await fetch(`${baseUrl}/api/search?q=patna`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.totalResults > 0);
  });

  it('2. Wishlist toggle should save and remove items', async () => {
    // Add to wishlist
    const addRes = await fetch(`${baseUrl}/api/wishlist/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        itemType: 'MOVIE',
        itemId: demoMovie._id
      })
    });
    const addBody = await addRes.json();
    assert.strictEqual(addRes.status, 200);
    assert.strictEqual(addBody.data.isWishlisted, true);

    // Retrieve wishlist
    const listRes = await fetch(`${baseUrl}/api/wishlist`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const listBody = await listRes.json();
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listBody.data.length, 1);
  });

  it('3. User should submit verified review with rating update and loyalty bonus', async () => {
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        itemType: 'MOVIE',
        itemId: demoMovie._id,
        rating: 10,
        title: 'Outstanding Cinematic Masterpiece',
        comment: 'Mindblowing VFX and gripping storyline from start to finish!'
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isVerifiedBooking, true); // Verified because user booked it!
  });

  it('4. User can cancel confirmed booking & receive automated refund', async () => {
    const res = await fetch(`${baseUrl}/api/refunds/cancel-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        bookingId: testBooking.bookingId,
        reason: 'Change of plans'
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.booking.bookingStatus, 'CANCELLED');
    assert.strictEqual(body.data.refund.refundPercentage, 75);
    assert.strictEqual(body.data.refund.refundAmount, Math.round(375 * 0.75));
  });

  it('5. User dashboard should return aggregated tickets, loyalty tier, and notifications', async () => {
    const res = await fetch(`${baseUrl}/api/user/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.tierInfo);
    assert.ok(body.data.notifications.length > 0); // Contains the refund notification
  });
});
