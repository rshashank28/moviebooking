const User = require('../models/User');
const Booking = require('../models/Booking');
const Wishlist = require('../models/Wishlist');
const Notification = require('../models/Notification');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const ApiResponse = require('../utils/apiResponse');

// Determine loyalty tier based on total points
const calculateTier = (points) => {
  if (points >= 2000) return { tier: 'PLATINUM', nextTier: null, pointsNeeded: 0, progress: 100 };
  if (points >= 1000) return { tier: 'GOLD', nextTier: 'PLATINUM', pointsNeeded: 2000 - points, progress: Math.round(((points - 1000) / 1000) * 100) };
  if (points >= 500) return { tier: 'SILVER', nextTier: 'GOLD', pointsNeeded: 1000 - points, progress: Math.round(((points - 500) / 500) * 100) };
  return { tier: 'BRONZE', nextTier: 'SILVER', pointsNeeded: 500 - points, progress: Math.round((points / 500) * 100) };
};

// @route   GET /api/user/dashboard
// @desc    Get complete user profile, tier, upcoming passes, and notifications
// @access  Private
const getDashboardOverview = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [user, bookings, wishlistItems, notifications] = await Promise.all([
      User.findById(userId),
      Booking.find({ user: userId })
        .populate('movie', 'title poster duration genres')
        .populate('event', 'title poster venueName date startTime')
        .populate('venue', 'name address')
        .populate('screen', 'name')
        .sort({ createdAt: -1 }),
      Wishlist.find({ user: userId })
        .populate('movie', 'title poster slug duration rating')
        .populate('event', 'title poster slug category artist date city venueName')
        .limit(6),
      Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(10)
    ]);

    const upcomingBookings = bookings.filter((b) => b.bookingStatus === 'CONFIRMED' && b.checkInStatus === 'NOT_CHECKED_IN');
    const pastBookings = bookings.filter((b) => b.bookingStatus !== 'CONFIRMED' || b.checkInStatus === 'CHECKED_IN');

    const tierInfo = calculateTier(user.loyaltyPoints || 0);

    return ApiResponse.success(res, 'Dashboard overview fetched', {
      user: user.toJSON(),
      tierInfo,
      stats: {
        totalBookings: bookings.length,
        upcomingPasses: upcomingBookings.length,
        wishlistCount: wishlistItems.length,
        loyaltyPoints: user.loyaltyPoints || 0
      },
      upcomingBookings,
      pastBookings,
      wishlistItems,
      notifications
    });
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/user/notifications/:id/read
// @desc    Mark single notification as read
// @access  Private
const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Notification.findOneAndUpdate({ _id: id, user: req.user._id }, { isRead: true });
    return ApiResponse.success(res, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardOverview,
  markNotificationRead
};
