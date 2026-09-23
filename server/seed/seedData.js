const City = require('../models/City');
const Category = require('../models/Category');
const Movie = require('../models/Movie');
const Event = require('../models/Event');
const Venue = require('../models/Venue');
const Screen = require('../models/Screen');
const Seat = require('../models/Seat');
const Show = require('../models/Show');
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const logger = require('../utils/logger');

const seedAllData = async () => {
  logger.info('Beginning database seeding...');

  // 1. Seed Cities
  const citiesData = [
    { name: 'Patna', slug: 'patna', state: 'Bihar', isPopular: true, coordinates: { lat: 25.5941, lng: 85.1376 } },
    { name: 'Delhi-NCR', slug: 'delhi-ncr', state: 'Delhi', isPopular: true, coordinates: { lat: 28.7041, lng: 77.1025 } },
    { name: 'Mumbai', slug: 'mumbai', state: 'Maharashtra', isPopular: true, coordinates: { lat: 19.0760, lng: 72.8777 } },
    { name: 'Bengaluru', slug: 'bangalore', state: 'Karnataka', isPopular: true, coordinates: { lat: 12.9716, lng: 77.5946 } },
    { name: 'Hyderabad', slug: 'hyderabad', state: 'Telangana', isPopular: true, coordinates: { lat: 17.3850, lng: 78.4867 } },
    { name: 'Kolkata', slug: 'kolkata', state: 'West Bengal', isPopular: true, coordinates: { lat: 22.5726, lng: 88.3639 } },
    { name: 'Chennai', slug: 'chennai', state: 'Tamil Nadu', isPopular: true, coordinates: { lat: 13.0827, lng: 80.2707 } },
    { name: 'Pune', slug: 'pune', state: 'Maharashtra', isPopular: true, coordinates: { lat: 18.5204, lng: 73.8567 } }
  ];

  await City.deleteMany({});
  const seededCities = await City.insertMany(citiesData);
  logger.info(`Seeded ${seededCities.length} Cities.`);

  // 2. Seed Categories
  const categoriesData = [
    { name: 'Action', slug: 'action', type: 'MOVIE_GENRE', icon: 'Flame' },
    { name: 'Sci-Fi', slug: 'sci-fi', type: 'MOVIE_GENRE', icon: 'Sparkles' },
    { name: 'Drama', slug: 'drama', type: 'MOVIE_GENRE', icon: 'Drama' },
    { name: 'Comedy', slug: 'comedy', type: 'MOVIE_GENRE', icon: 'Smile' },
    { name: 'Thriller', slug: 'thriller', type: 'MOVIE_GENRE', icon: 'Eye' },
    { name: 'Live Concerts', slug: 'concerts', type: 'EVENT_CATEGORY', icon: 'Music' },
    { name: 'Standup Comedy', slug: 'standup', type: 'EVENT_CATEGORY', icon: 'Mic2' },
    { name: 'Sports Matches', slug: 'sports', type: 'EVENT_CATEGORY', icon: 'Trophy' },
    { name: 'Theatre & Plays', slug: 'theatre', type: 'EVENT_CATEGORY', icon: 'Theater' }
  ];

  await Category.deleteMany({});
  await Category.insertMany(categoriesData);

  // 3. Seed Demo Users & Organizer
  await User.deleteMany({ email: { $in: ['admin@showpulse.com', 'organizer@showpulse.com', 'user@showpulse.com', 'customer@showpulse.com'] } });
  
  const adminUser = await User.create({
    name: 'ShowPulse Master Admin',
    email: 'admin@showpulse.com',
    password: 'Password@123',
    phone: '+919999900001',
    role: 'ADMIN',
    loyaltyPoints: 1000
  });

  const demoOrganizerUser = await User.create({
    name: 'Aura Live Entertainment',
    email: 'organizer@showpulse.com',
    password: 'Password@123',
    phone: '+919999900002',
    role: 'ORGANIZER',
    loyaltyPoints: 500
  });

  const demoCustomerUser = await User.create({
    name: 'Rahul Sharma',
    email: 'customer@showpulse.com',
    password: 'Password@123',
    phone: '+919999900003',
    role: 'CUSTOMER',
    loyaltyPoints: 350
  });

  await Organizer.deleteMany({ user: demoOrganizerUser._id });
  const demoOrganizer = await Organizer.create({
    user: demoOrganizerUser._id,
    organizationName: 'Aura Live Global',
    businessEmail: 'organizer@showpulse.com',
    businessPhone: '+919999900002',
    website: 'https://auralive.io',
    address: { street: 'Boring Road', city: 'Patna', state: 'Bihar' }
  });

  // 4. Seed Movies
  const moviesData = [
    {
      title: 'Kalki 2898 AD: Chronicles',
      slug: 'kalki-2898-ad',
      poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop',
      description: 'A modern avatar descends to protect the futuristic world of Kashi in an epic clash between mythology and dystopian cyberpunk technology.',
      genres: ['Sci-Fi', 'Action', 'Mythology'],
      languages: ['Hindi', 'Telugu', 'Tamil', 'English'],
      duration: 180,
      releaseDate: new Date('2026-06-27'),
      trailerUrl: 'https://www.youtube.com/watch?v=kalki_sample',
      cast: [
        { name: 'Prabhas', role: 'Bhairava', photo: '' },
        { name: 'Amitabh Bachchan', role: 'Ashwatthama', photo: '' },
        { name: 'Deepika Padukone', role: 'SUM-80', photo: '' }
      ],
      crew: [{ name: 'Nag Ashwin', role: 'Director' }],
      ageRating: 'UA 16+',
      formats: ['2D', '3D', 'IMAX 3D', 'Dolby Cinema'],
      rating: 9.3,
      reviewCount: 4200,
      status: 'NOW_SHOWING',
      isTrending: true
    },
    {
      title: 'Interstellar: Remastered 70mm',
      slug: 'interstellar-remastered',
      poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1600&auto=format&fit=crop',
      description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity survival across dimensional gravitational spacetime.',
      genres: ['Sci-Fi', 'Drama', 'Adventure'],
      languages: ['English', 'Hindi'],
      duration: 169,
      releaseDate: new Date('2026-05-15'),
      cast: [
        { name: 'Matthew McConaughey', role: 'Cooper', photo: '' },
        { name: 'Anne Hathaway', role: 'Brand', photo: '' }
      ],
      crew: [{ name: 'Christopher Nolan', role: 'Director' }],
      ageRating: 'UA',
      formats: ['IMAX 3D', '2D', '4DX'],
      rating: 9.7,
      reviewCount: 15400,
      status: 'NOW_SHOWING',
      isTrending: true
    },
    {
      title: 'Stree 3: Return of the Spirit',
      slug: 'stree-3',
      poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop',
      description: 'The terrifying comic ghost legend returns to Chanderi with double the laughs, scares, and spine-chilling twists.',
      genres: ['Comedy', 'Horror'],
      languages: ['Hindi'],
      duration: 145,
      releaseDate: new Date('2026-08-15'),
      cast: [
        { name: 'Rajkummar Rao', role: 'Vicky', photo: '' },
        { name: 'Shraddha Kapoor', role: 'The Mystery Woman', photo: '' },
        { name: 'Pankaj Tripathi', role: 'Rudra', photo: '' }
      ],
      crew: [{ name: 'Amar Kaushik', role: 'Director' }],
      ageRating: 'UA 13+',
      formats: ['2D', '4DX'],
      rating: 8.9,
      reviewCount: 3100,
      status: 'NOW_SHOWING',
      isTrending: true
    }
  ];

  await Movie.deleteMany({});
  const seededMovies = await Movie.insertMany(moviesData);
  logger.info(`Seeded ${seededMovies.length} Movies.`);

  // 5. Seed Events
  const eventsData = [
    {
      title: 'Arijit Singh Soulful Arena Live 2026',
      slug: 'arijit-singh-live-patna',
      organizer: demoOrganizerUser._id,
      category: 'CONCERTS',
      artist: 'Arijit Singh',
      venueName: 'Patliputra Sports Complex Arena',
      address: 'Kankarbagh, Patna',
      city: 'Patna',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      startTime: '06:30 PM',
      endTime: '10:30 PM',
      ticketCategories: [
        { name: 'Silver Standing', price: 999, capacity: 500, soldCount: 120, description: 'General access field standing' },
        { name: 'Gold Seated', price: 2499, capacity: 300, soldCount: 95, description: 'Numbered tiered seat with clear stage view' },
        { name: 'VIP Lounge Pass', price: 4999, capacity: 100, soldCount: 40, description: 'Front of stage, complimentary F&B lounge' }
      ],
      capacity: 900,
      poster: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1600&auto=format&fit=crop',
      description: 'Experience an unforgettable musical night with the melody king Arijit Singh performing his greatest Bollywood blockbusters and acoustic ballads live.',
      terms: ['Age limit: 5+', 'No outside food or drinks allowed', 'Valid government ID required at entry'],
      cancellationPolicy: { isAllowed: true, cutoffHours: 48, refundPercentage: 75 },
      status: 'PUBLISHED',
      isTrending: true,
      isFeatured: true
    },
    {
      title: 'Zakir Khan: Live & Raw Comedy Tour',
      slug: 'zakir-khan-live-comedy',
      organizer: demoOrganizerUser._id,
      category: 'STANDUP_COMEDY',
      artist: 'Zakir Khan',
      venueName: 'SK Memorial Auditorium',
      address: 'Gandhi Maidan North, Patna',
      city: 'Patna',
      date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      startTime: '07:00 PM',
      endTime: '09:00 PM',
      ticketCategories: [
        { name: 'Balcony Tier', price: 499, capacity: 200, soldCount: 180, description: 'Upper auditorium view' },
        { name: 'Executive Front', price: 999, capacity: 150, soldCount: 120, description: 'Front orchestra rows' }
      ],
      capacity: 350,
      poster: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?q=80&w=800&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1600&auto=format&fit=crop',
      description: 'The Sakht Launda brings his brand-new standup special with hilarious reflections on life, family, romance, and growing up.',
      status: 'PUBLISHED',
      isTrending: true
    }
  ];

  await Event.deleteMany({});
  const seededEvents = await Event.insertMany(eventsData);
  logger.info(`Seeded ${seededEvents.length} Events.`);

  // 6. Seed Venues & Screens
  await Venue.deleteMany({});
  await Screen.deleteMany({});
  await Seat.deleteMany({});
  await Show.deleteMany({});

  const venue1 = await Venue.create({
    name: 'Cinepolis Mall of Patna',
    slug: 'cinepolis-mall-of-patna',
    city: 'Patna',
    address: 'Mall of Patna, Fraser Road',
    state: 'Bihar',
    amenities: ['Dolby Atmos', 'Recliner Lounge', 'Gourmet Food', 'Wheelchair Access', 'M-Ticket'],
    contactPhone: '+91 612 2500111'
  });

  const venue2 = await Venue.create({
    name: 'PVR INOX Regent Fun Cinema',
    slug: 'pvr-inox-regent-patna',
    city: 'Patna',
    address: 'East Gandhi Maidan, Patna',
    state: 'Bihar',
    amenities: ['4K Laser Projection', 'Dolby Atmos', 'Food Court', 'Free Parking']
  });

  // Create Screens & Seats for Venue 1
  const screenLayout = [
    { rowLabel: 'A', category: 'RECLINER', seatCount: 8, aisleGaps: [4] },
    { rowLabel: 'B', category: 'VIP', seatCount: 10, aisleGaps: [5] },
    { rowLabel: 'C', category: 'VIP', seatCount: 10, aisleGaps: [5] },
    { rowLabel: 'D', category: 'PREMIUM', seatCount: 12, aisleGaps: [4, 8] },
    { rowLabel: 'E', category: 'PREMIUM', seatCount: 12, aisleGaps: [4, 8] },
    { rowLabel: 'F', category: 'REGULAR', seatCount: 14, aisleGaps: [4, 10] },
    { rowLabel: 'G', category: 'REGULAR', seatCount: 14, aisleGaps: [4, 10] },
  ];

  let screenCap = 0;
  screenLayout.forEach((r) => { screenCap += r.seatCount; });

  const screen1 = await Screen.create({
    venue: venue1._id,
    name: 'Screen 1 - Dolby Atmos 4K',
    screenType: 'DOLBY_ATMOS',
    totalCapacity: screenCap,
    layout: screenLayout
  });

  // Generate Seat Documents
  const seatDocs = [];
  for (const row of screenLayout) {
    for (let i = 1; i <= row.seatCount; i++) {
      seatDocs.push({
        screen: screen1._id,
        venue: venue1._id,
        row: row.rowLabel,
        number: i,
        seatIdentifier: `${row.rowLabel}${i}`,
        category: row.category,
        columnPosition: i
      });
    }
  }
  const insertedSeats = await Seat.insertMany(seatDocs);
  logger.info(`Generated ${insertedSeats.length} auditorium seats for Screen 1.`);

  // 7. Seed Shows for Today & Tomorrow
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const showtimes = ['10:00 AM', '01:30 PM', '05:00 PM', '08:45 PM', '11:15 PM'];
  const showDocs = [];

  for (const dateStr of [todayStr, tomorrowStr]) {
    for (let i = 0; i < showtimes.length; i++) {
      const movieToSchedule = seededMovies[i % seededMovies.length];
      showDocs.push({
        movie: movieToSchedule._id,
        venue: venue1._id,
        screen: screen1._id,
        city: 'Patna',
        date: dateStr,
        startTime: showtimes[i],
        format: i % 2 === 0 ? '3D' : '2D',
        language: 'Hindi',
        priceTiers: [
          { category: 'REGULAR', price: 180 },
          { category: 'PREMIUM', price: 240 },
          { category: 'VIP', price: 340 },
          { category: 'RECLINER', price: 480 }
        ],
        totalSeats: screenCap,
        availableSeatsCount: screenCap,
        status: 'SCHEDULED'
      });
    }
  }

  const ShowSeat = require('../models/ShowSeat');
  await ShowSeat.deleteMany({});
  const insertedShows = await Show.insertMany(showDocs);

  // Generate show-specific seat inventory for all shows
  const showSeatDocs = [];
  const priceMap = new Map([
    ['REGULAR', 180],
    ['PREMIUM', 240],
    ['VIP', 340],
    ['RECLINER', 480]
  ]);

  for (const show of insertedShows) {
    for (const seat of insertedSeats) {
      showSeatDocs.push({
        show: show._id,
        seat: seat._id,
        screen: screen1._id,
        venue: venue1._id,
        seatIdentifier: seat.seatIdentifier,
        row: seat.row,
        number: seat.number,
        category: seat.category,
        price: priceMap.get(seat.category) || 200,
        status: 'AVAILABLE'
      });
    }
  }

  await ShowSeat.insertMany(showSeatDocs);
  logger.info(`Seeded ${insertedShows.length} Shows with ${showSeatDocs.length} ShowSeat inventory records for Patna.`);
  logger.info('Database seeding completed successfully!');
};

module.exports = { seedAllData };
