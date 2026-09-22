process.env.NODE_ENV = 'test';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../app');

const City = require('../models/City');
const Venue = require('../models/Venue');
const Screen = require('../models/Screen');
const Movie = require('../models/Movie');
const Event = require('../models/Event');
const Show = require('../models/Show');

describe('Phases 15 & 16: Smart Recommendations & AI Assistant Test Suite', () => {
  let testServer;
  let baseUrl;
  let mongoServer;
  let showId = '';

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(0, resolve));
    const port = testServer.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Seed data
    const city = await City.create({ name: 'Patna', slug: 'patna', state: 'Bihar', tier: 2 });
    const venue = await Venue.create({
      name: 'Cinepolis Patna Central',
      slug: 'cinepolis-patna',
      city: city._id,
      state: 'Bihar',
      address: 'Frazer Road',
      coordinates: { lat: 25.612, lng: 85.138 }
    });

    const screen = await Screen.create({
      venue: venue._id,
      name: 'Audi 1',
      screenType: 'IMAX',
      totalCapacity: 50,
      layout: [
        { rowLabel: 'A', category: 'RECLINER', seatCount: 6, aisleGaps: [] },
        { rowLabel: 'B', category: 'VIP', seatCount: 8, aisleGaps: [] },
        { rowLabel: 'C', category: 'PREMIUM', seatCount: 10, aisleGaps: [] },
        { rowLabel: 'D', category: 'REGULAR', seatCount: 10, aisleGaps: [] },
        { rowLabel: 'E', category: 'REGULAR', seatCount: 10, aisleGaps: [] }
      ]
    });

    const movie = await Movie.create({
      title: 'Interstellar Odyssey',
      slug: 'interstellar-odyssey',
      genres: ['Sci-Fi', 'Action'],
      languages: ['English', 'Hindi'],
      duration: 165,
      rating: 9.2,
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800',
      banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600',
      description: 'An epic voyage across spacetime.',
      releaseDate: new Date('2026-01-01'),
      formats: ['IMAX 3D', '2D'],
      status: 'NOW_SHOWING'
    });

    const orgUser = await mongoose.model('User').create({
      name: 'Show Producer',
      email: `producer_${Date.now()}@showpulse.com`,
      password: 'Password@123',
      role: 'ORGANIZER'
    });

    const event = await Event.create({
      title: 'Standup Laugh Fest Patna',
      slug: 'standup-laugh-patna',
      organizer: orgUser._id,
      category: 'STANDUP_COMEDY',
      artist: 'Zakir & Friends',
      venueName: 'SK Memorial Hall',
      address: 'Near Gandhi Maidan, Patna',
      city: 'Patna',
      date: new Date(Date.now() + 86400000),
      startTime: '07:30 PM',
      capacity: 200,
      poster: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800',
      banner: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1600',
      description: 'An evening of non-stop laughs.',
      ticketCategories: [{ name: 'Standard Pass', price: 499, capacity: 200, soldCount: 0 }],
      status: 'PUBLISHED'
    });

    const show = await Show.create({
      movie: movie._id,
      venue: venue._id,
      screen: screen._id,
      city: city._id,
      showType: 'MOVIE',
      date: new Date(),
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 14000000),
      bookedSeats: ['D4', 'D5'],
      priceTiers: [
        { category: 'RECLINER', price: 500 },
        { category: 'VIP', price: 350 },
        { category: 'PREMIUM', price: 250 },
        { category: 'REGULAR', price: 180 }
      ]
    });
    showId = show._id.toString();
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

  it('1. should recommend best contiguous seats for a show (BEST_VIEW)', async () => {
    const res = await fetch(`${baseUrl}/api/recommendations/seats?showId=${showId}&count=2&preference=BEST_VIEW`);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.recommendation);
    assert.strictEqual(body.data.recommendation.seats.length, 2);
    // Verified contiguous
    const [s1, s2] = body.data.recommendation.seats;
    assert.strictEqual(s1.row, s2.row);
    assert.strictEqual(s2.number - s1.number, 1);
  });

  it('2. should recommend VIP Recliner seats when preference is RECLINER', async () => {
    const res = await fetch(`${baseUrl}/api/recommendations/seats?showId=${showId}&count=2&preference=RECLINER`);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.recommendation.seats[0].row === 'A' || body.data.recommendation.seats[0].row === 'B');
  });

  it('3. should provide personalized recommendations feed', async () => {
    const res = await fetch(`${baseUrl}/api/recommendations/for-you?city=Patna`);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.recommendedMovies));
    assert.ok(Array.isArray(body.data.recommendedEvents));
  });

  it('4. should process natural language query with AI Assistant for movies', async () => {
    const res = await fetch(`${baseUrl}/api/ai/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Show me sci-fi movies in Patna',
        city: 'Patna'
      })
    });
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.responseText.length > 10);
    assert.ok(body.data.cards.movies.length >= 1);
    assert.strictEqual(body.data.cards.movies[0].title, 'Interstellar Odyssey');
  });

  it('5. should process natural language query for live comedy events', async () => {
    const res = await fetch(`${baseUrl}/api/ai/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Find standup comedy shows in Patna',
        city: 'Patna'
      })
    });
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.cards.events.length >= 1);
    assert.strictEqual(body.data.cards.events[0].title, 'Standup Laugh Fest Patna');
  });
});
