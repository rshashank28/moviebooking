const Movie = require('../models/Movie');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const SeatRecommenderService = require('../services/seatRecommender.service');
const ApiResponse = require('../utils/apiResponse');

// @route   GET /api/recommendations/seats
// @desc    Get smart seat recommendations for a show
// @access  Public
const getSmartSeatRecommendation = async (req, res, next) => {
  try {
    const { showId, count = 2, preference = 'BEST_VIEW' } = req.query;

    if (!showId) {
      return ApiResponse.error(res, 'showId is required', 400, 'SHOW_ID_REQUIRED');
    }

    const result = await SeatRecommenderService.recommendSeats(
      showId,
      parseInt(count, 10) || 2,
      preference
    );

    if (!result) {
      return ApiResponse.error(
        res,
        'No contiguous seats available matching criteria',
        404,
        'NO_SEATS_FOUND'
      );
    }

    return ApiResponse.success(res, 'Smart seats recommended successfully', result);
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/recommendations/for-you
// @desc    Personalized recommendations based on user genre/city affinity & trending items
// @access  Public (Optional auth for personalized profile)
const getPersonalizedRecommendations = async (req, res, next) => {
  try {
    const city = req.query.city || 'Patna';
    let preferredGenres = ['Action', 'Sci-Fi', 'Thriller'];

    if (req.user) {
      const userBookings = await Booking.find({ user: req.user._id })
        .populate('movie', 'genres')
        .sort({ createdAt: -1 })
        .limit(10);

      const genreCounts = {};
      userBookings.forEach((b) => {
        if (b.movie?.genres) {
          b.movie.genres.forEach((g) => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
        }
      });

      const topGenres = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]);
      if (topGenres.length > 0) {
        preferredGenres = topGenres;
      }
    }

    // Find recommended movies matching preferred genres
    const recommendedMovies = await Movie.find({
      genres: { $in: preferredGenres },
      status: 'NOW_SHOWING'
    })
      .sort({ rating: -1, releaseDate: -1 })
      .limit(6);

    // Find trending events in city
    const recommendedEvents = await Event.find({
      city: { $regex: new RegExp(city, 'i') },
      status: 'PUBLISHED'
    })
      .sort({ date: 1 })
      .limit(6);

    return ApiResponse.success(res, 'Personalized recommendations generated', {
      preferredGenres,
      recommendedMovies,
      recommendedEvents
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSmartSeatRecommendation,
  getPersonalizedRecommendations
};
