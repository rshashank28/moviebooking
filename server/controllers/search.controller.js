const Movie = require('../models/Movie');
const Event = require('../models/Event');
const Venue = require('../models/Venue');
const ApiResponse = require('../utils/apiResponse');

// @route   GET /api/search
// @desc    Global debounced search across Movies, Events, Artists, and Venues
// @access  Public
const globalSearch = async (req, res, next) => {
  try {
    const { q, city } = req.query;

    if (!q || q.trim().length === 0) {
      return ApiResponse.success(res, 'Search query empty', {
        movies: [],
        events: [],
        venues: [],
        totalResults: 0
      });
    }

    const regex = new RegExp(q.trim(), 'i');

    const movieQuery = {
      $or: [
        { title: regex },
        { genres: { $in: [regex] } },
        { languages: { $in: [regex] } },
        { 'cast.name': regex }
      ]
    };

    const eventQuery = {
      $or: [
        { title: regex },
        { artist: regex },
        { category: regex },
        { venueName: regex }
      ]
    };
    if (city) {
      eventQuery.city = new RegExp(`^${city}$`, 'i');
    }

    const venueQuery = {
      $or: [
        { name: regex },
        { address: regex }
      ]
    };
    if (city) {
      venueQuery.city = new RegExp(`^${city}$`, 'i');
    }

    const [movies, events, venues] = await Promise.all([
      Movie.find(movieQuery).limit(8).select('title slug poster genres languages duration rating ageRating'),
      Event.find(eventQuery).limit(8).select('title slug poster banner category artist date startTime city venueName ticketCategories'),
      Venue.find(venueQuery).limit(6).select('name slug address city amenities')
    ]);

    const totalResults = movies.length + events.length + venues.length;

    return ApiResponse.success(res, 'Search results fetched', {
      query: q,
      movies,
      events,
      venues,
      totalResults
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  globalSearch
};
