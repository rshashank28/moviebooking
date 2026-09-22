process.env.NODE_ENV = 'test';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../app');
const { seedAllData } = require('../seed/seedData');
const Movie = require('../models/Movie');
const Event = require('../models/Event');
const Show = require('../models/Show');
const Venue = require('../models/Venue');

describe('Phases 3 & 4: Catalog & Venue System Test Suite', () => {
  let testServer;
  let baseUrl;
  let mongoServer;
  let sampleMovie;
  let sampleEvent;
  let sampleShow;
  let sampleVenue;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    // Seed test database with cities, movies, events, venues, shows
    await seedAllData();

    sampleMovie = await Movie.findOne({ isTrending: true });
    sampleEvent = await Event.findOne({ category: 'CONCERTS' });
    sampleShow = await Show.findOne({});
    sampleVenue = await Venue.findOne({});

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

  it('1. should fetch active cities list with Patna and Mumbai', async () => {
    const res = await fetch(`${baseUrl}/api/cities`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 8);
    const cityNames = body.data.map((c) => c.name);
    assert.ok(cityNames.includes('Patna'));
    assert.ok(cityNames.includes('Mumbai'));
  });

  it('2. should fetch categories list', async () => {
    const res = await fetch(`${baseUrl}/api/categories`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 5);
  });

  it('3. should fetch movies list with pagination and filters', async () => {
    const res = await fetch(`${baseUrl}/api/movies?status=NOW_SHOWING&limit=10`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0);
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
  });

  it('4. should fetch movie details with venues and showtimes in Patna', async () => {
    const res = await fetch(`${baseUrl}/api/movies/${sampleMovie._id}?city=Patna`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.movie.title, sampleMovie.title);
    assert.ok(Array.isArray(body.data.venues));
    assert.ok(body.data.availableDates.length > 0);
  });

  it('5. should fetch events list filtered by category', async () => {
    const res = await fetch(`${baseUrl}/api/events?category=CONCERTS`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0);
    assert.strictEqual(body.data[0].category, 'CONCERTS');
  });

  it('6. should fetch single event details with ticket tiers', async () => {
    const res = await fetch(`${baseUrl}/api/events/${sampleEvent._id}`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.title, sampleEvent.title);
    assert.ok(body.data.ticketCategories.length >= 2);
  });

  it('7. should fetch venues by city', async () => {
    const res = await fetch(`${baseUrl}/api/venues?city=Patna`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 2);
  });

  it('8. should fetch show details and interactive seat matrix', async () => {
    const res = await fetch(`${baseUrl}/api/shows/${sampleShow._id}`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.show);
    assert.ok(body.data.seats.length > 0);
    assert.strictEqual(body.data.seats[0].status, 'AVAILABLE');
    assert.ok(body.data.seats[0].price > 0);
  });
});
