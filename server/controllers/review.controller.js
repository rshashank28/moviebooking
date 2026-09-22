const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Movie = require('../models/Movie');
const Event = require('../models/Event');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

// @route   POST /api/reviews
// @desc    Add review for movie or event with verified badge check
// @access  Private
const addReview = async (req, res, next) => {
  try {
    const { itemType = 'MOVIE', itemId, rating, title, comment } = req.body;
    const userId = req.user._id;

    if (!itemId || !rating || !comment) {
      return ApiResponse.error(res, 'Item ID, rating (1-10), and comment are required', 400, 'INVALID_INPUT');
    }

    // Check if user has an existing confirmed booking for this movie/event
    const bookingQuery = {
      user: userId,
      bookingStatus: 'CONFIRMED'
    };
    if (itemType === 'MOVIE') bookingQuery.movie = itemId;
    else bookingQuery.event = itemId;

    const priorBooking = await Booking.findOne(bookingQuery);
    const isVerifiedBooking = !!priorBooking;

    const review = await Review.create({
      user: userId,
      itemType,
      movie: itemType === 'MOVIE' ? itemId : undefined,
      event: itemType === 'EVENT' ? itemId : undefined,
      rating: Number(rating),
      title: title || '',
      comment: comment.trim(),
      isVerifiedBooking
    });

    // Recalculate average rating & review count for movie
    if (itemType === 'MOVIE') {
      const stats = await Review.aggregate([
        { $match: { movie: review.movie, status: 'APPROVED' } },
        {
          $group: {
            _id: '$movie',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 }
          }
        }
      ]);

      if (stats.length > 0) {
        await Movie.findByIdAndUpdate(itemId, {
          rating: Number(stats[0].avgRating.toFixed(1)),
          reviewCount: stats[0].count
        });
      }
    }

    // Award +20 bonus loyalty points for sharing a review
    await User.findByIdAndUpdate(userId, {
      $inc: { loyaltyPoints: 20 }
    });

    return ApiResponse.created(res, 'Review submitted successfully (+20 loyalty points awarded)', review);
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/reviews/:itemType/:itemId
// @desc    Get reviews for a movie or event
// @access  Public
const getItemReviews = async (req, res, next) => {
  try {
    const { itemType, itemId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const query = {
      itemType: itemType.toUpperCase(),
      status: 'APPROVED'
    };
    if (itemType.toUpperCase() === 'MOVIE') query.movie = itemId;
    else query.event = itemId;

    const skip = (Number(page) - 1) * Number(limit);
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('user', 'name avatar')
        .sort({ isVerifiedBooking: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Review.countDocuments(query)
    ]);

    return ApiResponse.paginated(res, 'Reviews fetched', reviews, page, limit, total);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addReview,
  getItemReviews
};
