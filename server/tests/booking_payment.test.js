process.env.NODE_ENV = 'test';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../app');
const { seedAllData } = require('../seed/seedData');
const User = require('../models/User');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Coupon = require('../models/Coupon');
const Booking = require('../models/Booking');
const { generateAccessToken } = require('../utils/jwt');

describe('Phases 7, 8 & 9: Booking, Pricing, Razorpay & QR Pass Test Suite', () => {
  let testServer;
  let baseUrl;
  let mongoServer;
  let demoUser;
  let authToken;
  let demoShow;
  let createdBookingId = '';
  let generatedVerificationToken = '';

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    await seedAllData();

    demoUser = await User.findOne({ role: 'CUSTOMER' }) || await User.create({
      name: 'Customer Test',
      email: 'customer@test.com',
      password: 'password123',
      loyaltyPoints: 100
    });

    authToken = generateAccessToken(demoUser);
    demoShow = await Show.findOne({});

    // Seed test coupon
    await Coupon.create({
      code: 'PROMO50',
      description: '₹50 flat discount',
      discountType: 'FIXED',
      discountValue: 50,
      minOrderAmount: 200,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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

  it('1. should calculate price correctly with convenience fee (₹30/seat) and GST (18%)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/calculate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingType: 'MOVIE',
        showId: demoShow._id,
        seatIdentifiers: ['A1', 'A2']
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.baseAmount > 0);
    assert.strictEqual(body.data.convenienceFee, 60); // 2 seats * 30
    assert.strictEqual(body.data.taxAmount, 11); // 18% of 60 = 10.8 -> 11
    assert.strictEqual(body.data.finalAmount, body.data.baseAmount + 60 + 11);
  });

  it('2. should apply coupon code discount properly', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/calculate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingType: 'MOVIE',
        showId: demoShow._id,
        seatIdentifiers: ['A1', 'A2'],
        couponCode: 'PROMO50'
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.couponCode, 'PROMO50');
    assert.strictEqual(body.data.discountAmount, 50);
  });

  it('3. should initiate booking & create Razorpay order', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        bookingType: 'MOVIE',
        showId: demoShow._id,
        seatIdentifiers: ['A1', 'A2'],
        couponCode: 'PROMO50'
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.bookingId);
    assert.ok(body.data.razorpayOrder.id);

    createdBookingId = body.data.bookingId;
  });

  it('4. should verify payment and confirm booking with QR code generation', async () => {
    const res = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        bookingId: createdBookingId,
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_456',
        razorpay_signature: `test_sig_${createdBookingId}`
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.booking.bookingStatus, 'CONFIRMED');
    assert.ok(body.data.booking.qrCodeData);
    assert.ok(body.data.booking.qrVerificationToken);
    assert.ok(body.data.pointsEarned > 0);

    generatedVerificationToken = body.data.booking.qrVerificationToken;
  });

  it('5. should have updated seat records in database to booked', async () => {
    const seats = await Seat.find({
      screen: demoShow.screen,
      seatIdentifier: { $in: ['A1', 'A2'] }
    });

    for (const s of seats) {
      assert.strictEqual(s.isAvailable, false);
    }
  });

  it('6. Gate check-in scan should admit authentic QR ticket', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/tickets/scan-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: generatedVerificationToken
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'ADMITTED');
    assert.strictEqual(body.data.isValid, true);
  });

  it('7. Gate check-in scanner should REJECT duplicate second scan (Anti-Fraud)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/tickets/scan-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: generatedVerificationToken
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'ALREADY_USED');
  });
});
