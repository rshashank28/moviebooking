const RefundService = require('../services/refund.service');
const Refund = require('../models/Refund');
const ApiResponse = require('../utils/apiResponse');

// @route   POST /api/refunds/cancel-booking
// @desc    Cancel a confirmed booking and initiate refund
// @access  Private
const cancelBooking = async (req, res, next) => {
  try {
    const { bookingId, reason } = req.body;
    if (!bookingId) {
      return ApiResponse.error(res, 'Booking ID is required', 400, 'ID_REQUIRED');
    }

    const result = await RefundService.cancelBooking(bookingId, req.user._id, reason);
    return ApiResponse.success(res, 'Booking cancelled and refund processed', result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 400, 'CANCELLATION_FAILED');
  }
};

// @route   GET /api/refunds/my-refunds
// @desc    Get user refund transaction history
// @access  Private
const getMyRefunds = async (req, res, next) => {
  try {
    const refunds = await Refund.find({ user: req.user._id })
      .populate('booking', 'bookingId bookingType movie event')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Refunds fetched', refunds);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  cancelBooking,
  getMyRefunds
};
