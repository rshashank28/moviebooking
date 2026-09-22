process.env.NODE_ENV = 'test';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../app');

describe('Phase 2: Authentication & RBAC Test Suite', () => {
  let testServer;
  let baseUrl;
  let mongoServer;
  let customerAccessToken = '';
  let customerRefreshToken = '';
  let organizerAccessToken = '';

  const customerData = {
    name: 'Alice Tester',
    email: `alice_${Date.now()}@example.com`,
    password: 'password123',
    phone: '+919876543210'
  };

  const organizerData = {
    name: 'Bob Organizer',
    email: `bob_${Date.now()}@example.com`,
    password: 'password123',
    phone: '+919876543211',
    role: 'ORGANIZER',
    organizationName: 'Bob Entertainment Group'
  };

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

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

  it('1. should register a new CUSTOMER successfully', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.email, customerData.email);
    assert.strictEqual(body.data.user.role, 'CUSTOMER');
    assert.strictEqual(body.data.user.loyaltyPoints, 100);
    assert.ok(body.data.accessToken);
    assert.ok(body.data.refreshToken);

    customerAccessToken = body.data.accessToken;
    customerRefreshToken = body.data.refreshToken;
  });

  it('2. should prevent duplicate email registration', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    });

    const body = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'EMAIL_EXISTS');
  });

  it('3. should register an ORGANIZER with profile record', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(organizerData)
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.role, 'ORGANIZER');
    assert.ok(body.data.accessToken);
    organizerAccessToken = body.data.accessToken;
  });

  it('4. should log in with valid credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerData.email,
        password: customerData.password
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.accessToken);
    assert.ok(body.data.refreshToken);
  });

  it('5. should reject login with invalid password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerData.email,
        password: 'wrongpassword'
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.code, 'INVALID_CREDENTIALS');
  });

  it('6. should access protected GET /api/auth/me with Bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${customerAccessToken}`
      }
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.email, customerData.email);
  });

  it('7. should reject GET /api/auth/me without token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  it('8. should rotate refresh token successfully', async () => {
    const res = await fetch(`${baseUrl}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: customerRefreshToken })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.accessToken);
    assert.ok(body.data.refreshToken);
    assert.notStrictEqual(body.data.refreshToken, customerRefreshToken);
  });
});
