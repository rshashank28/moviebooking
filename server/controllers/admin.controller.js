const User = require('../models/User');
const Organizer = require('../models/Organizer');
const Movie = require('../models/Movie');
const Event = require('../models/Event');
const Venue = require('../models/Venue');
const Show = require('../models/Show');
const Booking = require('../models/Booking');
const Coupon = require('../models/Coupon');
const Refund = require('../models/Refund');
const ApiResponse = require('../utils/apiResponse');

// @route   GET /api/admin/metrics
// @desc    Executive platform overview & revenue analytics
// @access  Admin only
const getAdminMetrics = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalOrganizers,
      totalMovies,
      totalEvents,
      totalVenues,
      totalShows,
      bookings,
      refunds
    ] = await Promise.all([
      User.countDocuments(),
      Organizer.countDocuments(),
      Movie.countDocuments(),
      Event.countDocuments(),
      Venue.countDocuments(),
      Show.countDocuments(),
      Booking.find({ bookingStatus: 'CONFIRMED' }),
      Refund.find()
    ]);

    let totalGMV = 0;
    let totalTickets = 0;

    bookings.forEach((b) => {
      totalGMV += b.pricing?.finalAmount || 0;
      totalTickets += (b.seats?.length || 0) + (b.eventPasses?.reduce((acc, p) => acc + (p.quantity || 0), 0) || 0);
    });

    const totalRefundsAmount = refunds.reduce((acc, r) => acc + (r.refundAmount || 0), 0);
    const platformCommission = Math.round(totalGMV * 0.05); // 5% platform commission

    return ApiResponse.success(res, 'Admin metrics fetched', {
      overview: {
        totalGMV,
        platformCommission,
        totalRefundsAmount,
        totalTickets,
        totalBookings: bookings.length,
        totalUsers,
        totalOrganizers,
        totalMovies,
        totalEvents,
        totalVenues,
        totalShows
      },
      recentBookings: bookings.slice(-10).reverse()
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/admin/users
// @desc    List all platform users with filtering
// @access  Admin only
const getUsersList = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role && role !== 'ALL') query.role = role;
    if (status && status !== 'ALL') query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query)
    ]);

    return ApiResponse.paginated(res, 'Users fetched', users, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/admin/users/:id/status
// @desc    Toggle user status (ACTIVE / SUSPENDED)
// @access  Admin only
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return ApiResponse.error(res, 'Invalid status', 400, 'INVALID_STATUS');
    }

    const user = await User.findByIdAndUpdate(id, { status }, { new: true });
    return ApiResponse.success(res, `User status updated to ${status}`, user);
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/admin/organizers
// @desc    List organizer applications & approvals
// @access  Admin only
const getOrganizersList = async (req, res, next) => {
  try {
    const organizers = await Organizer.find()
      .populate('user', 'name email phone status')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Organizers fetched', organizers);
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/admin/organizers/:id/status
// @desc    Approve or reject organizer application
// @access  Admin only
const updateOrganizerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const organizer = await Organizer.findByIdAndUpdate(id, { status }, { new: true });
    return ApiResponse.success(res, `Organizer status updated to ${status}`, organizer);
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/admin/movies
// @desc    Publish a new movie
// @access  Admin only
const createMovie = async (req, res, next) => {
  try {
    const {
      title,
      poster,
      banner,
      description,
      genres,
      languages,
      duration,
      releaseDate,
      trailerUrl,
      ageRating,
      formats,
      rating
    } = req.body;

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const movie = await Movie.create({
      title,
      slug,
      poster: poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
      banner: banner || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop',
      description,
      genres: Array.isArray(genres) ? genres : ['Action', 'Drama'],
      languages: Array.isArray(languages) ? languages : ['Hindi', 'English'],
      duration: Number(duration) || 150,
      releaseDate: new Date(releaseDate || Date.now()),
      trailerUrl: trailerUrl || '',
      ageRating: ageRating || 'UA',
      formats: Array.isArray(formats) ? formats : ['2D', '3D', 'IMAX 3D'],
      rating: Number(rating) || 8.5,
      status: 'NOW_SHOWING'
    });

    return ApiResponse.created(res, 'Movie created successfully', movie);
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/admin/coupons
// @desc    List all coupons
// @access  Admin only
const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return ApiResponse.success(res, 'Coupons fetched', coupons);
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/admin/coupons
// @desc    Create new discount coupon
// @access  Admin only
const createCoupon = async (req, res, next) => {
  try {
    const { code, description, discountType, discountValue, maxDiscount, minOrderAmount, validUntil } = req.body;

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      discountType: discountType || 'PERCENTAGE',
      discountValue: Number(discountValue),
      maxDiscount: Number(maxDiscount) || 200,
      minOrderAmount: Number(minOrderAmount) || 300,
      validUntil: new Date(validUntil || Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    });

    return ApiResponse.created(res, 'Coupon created successfully', coupon);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminMetrics,
  getUsersList,
  toggleUserStatus,
  getOrganizersList,
  updateOrganizerStatus,
  createMovie,
  getCoupons,
  createCoupon
};
