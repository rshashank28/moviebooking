const Venue = require('../models/Venue');
const Screen = require('../models/Screen');
const Seat = require('../models/Seat');
const ShowSeat = require('../models/ShowSeat');
const Show = require('../models/Show');
const Movie = require('../models/Movie');
const ApiResponse = require('../utils/apiResponse');
const { getRedisClient } = require('../config/redis');
const SeatLockService = require('../services/seatLock.service');

// @route   GET /api/venues
// @desc    Get venues by city
// @access  Public
const getVenues = async (req, res, next) => {
  try {
    const { city } = req.query;
    const filter = { status: 'ACTIVE' };
    if (city) filter.city = new RegExp(`^${city}$`, 'i');

    const venues = await Venue.find(filter).sort({ name: 1 });
    return ApiResponse.success(res, 'Venues fetched successfully', venues);
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/venues
// @desc    Create new venue
// @access  Admin / Organizer
const createVenue = async (req, res, next) => {
  try {
    const { name, city, address, state, postalCode, amenities, location, contactPhone } = req.body;
    const slug = `${name}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const venue = await Venue.create({
      name,
      slug,
      city,
      address,
      state,
      postalCode,
      amenities: amenities || ['Parking', 'Food Court', 'Wheelchair Accessible', 'Dolby Atmos'],
      location,
      contactPhone,
      organizer: req.user ? req.user._id : null
    });

    return ApiResponse.created(res, 'Venue created successfully', venue);
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/screens
// @desc    Create screen and generate auditorium seat map layout
// @access  Admin / Organizer
const createScreenWithSeats = async (req, res, next) => {
  try {
    const { venueId, name, screenType, layout } = req.body;

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return ApiResponse.error(res, 'Venue not found', 404, 'VENUE_NOT_FOUND');
    }

    // Default auditorium layout if not provided
    const defaultLayout = layout || [
      { rowLabel: 'A', category: 'RECLINER', seatCount: 8, aisleGaps: [4] },
      { rowLabel: 'B', category: 'VIP', seatCount: 12, aisleGaps: [4, 8] },
      { rowLabel: 'C', category: 'VIP', seatCount: 12, aisleGaps: [4, 8] },
      { rowLabel: 'D', category: 'PREMIUM', seatCount: 14, aisleGaps: [4, 10] },
      { rowLabel: 'E', category: 'PREMIUM', seatCount: 14, aisleGaps: [4, 10] },
      { rowLabel: 'F', category: 'REGULAR', seatCount: 16, aisleGaps: [4, 12] },
      { rowLabel: 'G', category: 'REGULAR', seatCount: 16, aisleGaps: [4, 12] },
    ];

    let totalCapacity = 0;
    defaultLayout.forEach((r) => { totalCapacity += r.seatCount; });

    const screen = await Screen.create({
      venue: venue._id,
      name: name || 'Audi 1 - Dolby Atmos',
      screenType: screenType || 'DOLBY_ATMOS',
      totalCapacity,
      layout: defaultLayout
    });

    // Bulk generate physical Seat records
    const seatDocs = [];
    for (const rowConfig of defaultLayout) {
      for (let i = 1; i <= rowConfig.seatCount; i++) {
        seatDocs.push({
          screen: screen._id,
          venue: venue._id,
          row: rowConfig.rowLabel,
          number: i,
          seatIdentifier: `${rowConfig.rowLabel}${i}`,
          category: rowConfig.category,
          columnPosition: i
        });
      }
    }

    await Seat.insertMany(seatDocs);

    return ApiResponse.created(res, 'Screen and seat matrix generated successfully', {
      screen,
      totalSeatsGenerated: seatDocs.length
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/shows
// @desc    Schedule a movie show and generate show-specific seat inventory
// @access  Admin / Organizer
const createShow = async (req, res, next) => {
  try {
    const {
      movieId,
      venueId,
      screenId,
      city,
      date,
      startTime,
      endTime,
      format,
      language,
      priceTiers
    } = req.body;

    const [movie, venue, screen] = await Promise.all([
      Movie.findById(movieId),
      Venue.findById(venueId),
      Screen.findById(screenId)
    ]);

    if (!movie || !venue || !screen) {
      return ApiResponse.error(res, 'Invalid movie, venue, or screen reference', 400, 'INVALID_REFERENCE');
    }

    const defaultPriceTiers = priceTiers || [
      { category: 'REGULAR', price: 180 },
      { category: 'PREMIUM', price: 250 },
      { category: 'VIP', price: 350 },
      { category: 'RECLINER', price: 500 }
    ];

    const show = await Show.create({
      movie: movie._id,
      venue: venue._id,
      screen: screen._id,
      city: city || venue.city,
      date,
      startTime,
      endTime: endTime || '',
      format: format || '2D',
      language: language || 'Hindi',
      priceTiers: defaultPriceTiers,
      totalSeats: screen.totalCapacity,
      availableSeatsCount: screen.totalCapacity,
      status: 'SCHEDULED'
    });

    // Generate show-specific ShowSeat inventory records
    const physicalSeats = await Seat.find({ screen: screen._id });
    const priceMap = new Map();
    defaultPriceTiers.forEach((tier) => priceMap.set(tier.category, tier.price));

    if (physicalSeats.length > 0) {
      const showSeatDocs = physicalSeats.map((seat) => ({
        show: show._id,
        seat: seat._id,
        screen: screen._id,
        venue: venue._id,
        seatIdentifier: seat.seatIdentifier,
        row: seat.row,
        number: seat.number,
        category: seat.category,
        price: priceMap.get(seat.category) || 200,
        status: 'AVAILABLE'
      }));

      await ShowSeat.insertMany(showSeatDocs);
    }

    return ApiResponse.created(res, 'Show scheduled successfully with inventory initialized', show);
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/shows/:id
// @desc    Get show details with venue, movie, screen and show-specific seat inventory with live lock state
// @access  Public
const getShowDetailsWithSeats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const show = await Show.findById(id)
      .populate('movie', 'title poster banner duration ageRating languages formats genres')
      .populate('venue', 'name address location amenities city')
      .populate('screen', 'name screenType layout totalCapacity');

    if (!show) {
      return ApiResponse.error(res, 'Show not found', 404, 'SHOW_NOT_FOUND');
    }

    // Retrieve show-specific seat inventory
    let showSeats = await ShowSeat.find({ show: show._id }).sort({ row: 1, number: 1 });

    // Fallback/auto-population for pre-existing shows without ShowSeat documents
    if (showSeats.length === 0) {
      const physicalSeats = await Seat.find({ screen: show.screen._id }).sort({ row: 1, number: 1 });
      const priceMap = new Map();
      (show.priceTiers || []).forEach((t) => priceMap.set(t.category, t.price));

      if (physicalSeats.length > 0) {
        const docs = physicalSeats.map((s) => ({
          show: show._id,
          seat: s._id,
          screen: show.screen._id,
          venue: show.venue?._id,
          seatIdentifier: s.seatIdentifier,
          row: s.row,
          number: s.number,
          category: s.category,
          price: priceMap.get(s.category) || 200,
          status: show.bookedSeats?.includes(s.seatIdentifier) ? 'BOOKED' : 'AVAILABLE'
        }));
        await ShowSeat.insertMany(docs);
        showSeats = await ShowSeat.find({ show: show._id }).sort({ row: 1, number: 1 });
      }
    }

    // Query active Redis lock keys for this show to determine current real-time lock status
    const redis = getRedisClient();
    const lockKeys = await redis.keys(`seat:lock:${show._id}:*`);
    const lockedSeatIds = new Set();

    for (const key of lockKeys) {
      const parts = key.split(':');
      const seatId = parts[parts.length - 1];
      lockedSeatIds.add(seatId);
    }

    // Enrich show seats with real-time lock status
    const enrichedSeats = showSeats.map((seat) => {
      const isLockedInRedis = lockedSeatIds.has(seat.seatIdentifier);
      let effectiveStatus = seat.status;

      if (seat.status === 'BOOKED') {
        effectiveStatus = 'BOOKED';
      } else if (isLockedInRedis || (seat.status === 'LOCKED' && seat.lockedUntil && new Date(seat.lockedUntil) > new Date())) {
        effectiveStatus = 'LOCKED';
      } else {
        effectiveStatus = 'AVAILABLE';
      }

      return {
        _id: seat._id,
        seatIdentifier: seat.seatIdentifier,
        row: seat.row,
        number: seat.number,
        category: seat.category,
        price: seat.price,
        status: effectiveStatus
      };
    });

    return ApiResponse.success(res, 'Show and seat map loaded successfully', {
      show,
      screenLayout: show.screen.layout,
      seats: enrichedSeats
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/shows/:id/lock-seats
// @desc    Lock seats atomically with Redis & Socket.IO broadcast
// @access  Public / Authenticated
const lockShowSeats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { seatIdentifiers, sessionId, lockToken } = req.body;

    if (!seatIdentifiers || !Array.isArray(seatIdentifiers) || seatIdentifiers.length === 0) {
      return ApiResponse.error(res, 'Please provide at least one seat to lock', 400, 'INVALID_SEATS');
    }

    if (seatIdentifiers.length > 10) {
      return ApiResponse.error(res, 'You can book a maximum of 10 seats at once', 400, 'MAX_SEATS_EXCEEDED');
    }

    // Determine user or session identity
    const userId = req.user ? req.user._id.toString() : (sessionId || req.ip || 'guest_user');

    const result = await SeatLockService.lockSeats(id, seatIdentifiers, userId, 600, lockToken);
    return ApiResponse.success(res, 'Seats locked successfully for 10 minutes', result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 400, 'LOCK_FAILED');
  }
};

// @route   POST /api/shows/:id/unlock-seats
// @desc    Release locked seats atomically
// @access  Public / Authenticated
const unlockShowSeats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { seatIdentifiers, sessionId, lockToken } = req.body;

    if (!seatIdentifiers || !Array.isArray(seatIdentifiers)) {
      return ApiResponse.error(res, 'Invalid seat identifiers', 400, 'INVALID_SEATS');
    }

    const userId = req.user ? req.user._id.toString() : (sessionId || req.ip || 'guest_user');

    const result = await SeatLockService.unlockSeats(id, seatIdentifiers, userId, lockToken);
    return ApiResponse.success(res, 'Seats unlocked', result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 400, 'UNLOCK_FAILED');
  }
};

// @route   GET /api/shows/:id/locked-seats
// @desc    Get all active locks for a show
// @access  Public
const getActiveLocks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const locks = await SeatLockService.getActiveLocks(id);
    return ApiResponse.success(res, 'Active locks fetched', locks);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVenues,
  createVenue,
  createScreenWithSeats,
  createShow,
  getShowDetailsWithSeats,
  lockShowSeats,
  unlockShowSeats,
  getActiveLocks
};
