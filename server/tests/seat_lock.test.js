process.env.NODE_ENV = 'test';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../app');
const { seedAllData } = require('../seed/seedData');
const Show = require('../models/Show');
const SeatLockService = require('../services/seatLock.service');

describe('Phases 5 & 6: Real-Time Seat Locking & Race Condition Test Suite', () => {
  let testServer;
  let baseUrl;
  let mongoServer;
  let sampleShow;

  const user1 = 'user_alice_12345';
  const user2 = 'user_bob_67890';

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    await seedAllData();
    sampleShow = await Show.findOne({});

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

  it('1. User 1 should lock seats A1 and A2 successfully', async () => {
    const res = await fetch(`${baseUrl}/api/shows/${sampleShow._id}/lock-seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seatIdentifiers: ['A1', 'A2'],
        sessionId: user1
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.deepStrictEqual(body.data.lockedSeats, ['A1', 'A2']);
    assert.ok(body.data.lockToken);
    assert.ok(body.data.expiresAt);
  });

  it('2. User 2 should be REJECTED when trying to lock already held seat A1 (All-or-Nothing Atomic Guard)', async () => {
    const res = await fetch(`${baseUrl}/api/shows/${sampleShow._id}/lock-seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seatIdentifiers: ['A1', 'B1'],
        sessionId: user2
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'LOCK_FAILED');

    // Verify B1 was NOT partially locked
    const activeLocks = await SeatLockService.getActiveLocks(sampleShow._id);
    assert.strictEqual(activeLocks['B1'], undefined);
  });

  it('3. should return active locks for the show', async () => {
    const res = await fetch(`${baseUrl}/api/shows/${sampleShow._id}/locked-seats`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data['A1']);
    assert.strictEqual(body.data['A1'].userId, user1);
  });

  it('4. User 1 should unlock seats A1 and A2', async () => {
    const res = await fetch(`${baseUrl}/api/shows/${sampleShow._id}/unlock-seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seatIdentifiers: ['A1', 'A2'],
        sessionId: user1
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.deepStrictEqual(body.data.unlockedSeats, ['A1', 'A2']);
  });

  it('5. User 2 should now be able to lock seat A1 after User 1 released it', async () => {
    const res = await fetch(`${baseUrl}/api/shows/${sampleShow._id}/lock-seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seatIdentifiers: ['A1'],
        sessionId: user2
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.deepStrictEqual(body.data.lockedSeats, ['A1']);
  });

  it('6. Concurrent race condition: 2 simultaneous lock requests for same seat C1', async () => {
    const [resA, resB] = await Promise.all([
      fetch(`${baseUrl}/api/shows/${sampleShow._id}/lock-seats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatIdentifiers: ['C1'], sessionId: 'client_A' })
      }),
      fetch(`${baseUrl}/api/shows/${sampleShow._id}/lock-seats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatIdentifiers: ['C1'], sessionId: 'client_B' })
      })
    ]);

    const statusA = resA.status;
    const statusB = resB.status;

    // Exactly one must succeed with 200, the other must fail with 400
    const statuses = [statusA, statusB].sort();
    assert.strictEqual(statuses[0], 200);
    assert.strictEqual(statuses[1], 400);
  });
});
