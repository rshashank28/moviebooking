const Booking = require('../models/Booking');
const Refund = require('../models/Refund');
const Seat = require('../models/Seat');
const Show = require('../models/Show');
const Notification = require('../models/Notification');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');

class RefundService {
  /**
   * Process booking cancellation and create refund record
   */
  static async cancelBooking(bookingId, userId, reason = 'User requested cancellation') {
    const booking = await Booking.findOne({
      bookingId,
      user: userId
    }).populate('show');

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.bookingStatus === 'CANCELLED') {
      throw new Error('This booking has already been cancelled');
    }

    if (booking.bookingStatus !== 'CONFIRMED') {
      throw new Error('Only confirmed bookings can be cancelled');
    }

    if (booking.checkInStatus === 'CHECKED_IN') {
      throw new Error('Cannot cancel a ticket that has already been used for gate entry');
    }

    // Default refund policy: 75% refund if cancelled before showtime
    const refundPercentage = 75;
    const originalAmount = booking.pricing.finalAmount;
    const refundAmount = Math.round((originalAmount * refundPercentage) / 100);

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const refundId = `SP-REF-${Date.now().toString().slice(-4)}${randomSuffix}`;

    // 1. Mark booking as CANCELLED
    booking.bookingStatus = 'CANCELLED';
    booking.cancellation = {
      isCancelled: true,
      cancelledAt: new Date(),
      refundAmount,
      reason
    };
    await booking.save();

    // 2. Release seats back to available in DB
    if (booking.bookingType === 'MOVIE' && booking.show && booking.seats?.length > 0) {
      const show = await Show.findById(booking.show._id || booking.show);
      if (show) {
        const seatIdentifiers = booking.seats.map((s) => s.seatIdentifier);
        await Seat.updateMany(
          { screen: show.screen, seatIdentifier: { $in: seatIdentifiers } },
          { isAvailable: true }
        );

        await Show.findByIdAndUpdate(show._id, {
          $inc: { availableSeatsCount: seatIdentifiers.length }
        });
      }
    }

    // 3. Create Refund Record
    const refundDoc = await Refund.create({
      refundId,
      booking: booking._id,
      user: userId,
      originalAmount,
      refundAmount,
      refundPercentage,
      reason,
      status: 'PROCESSED'
    });

    // 4. Create in-app Notification
    await Notification.create({
      user: userId,
      title: 'Booking Cancelled & Refund Initiated',
      message: `Your booking ${booking.bookingId} has been cancelled. A refund of ₹${refundAmount} has been processed to your payment method.`,
      type: 'REFUND_PROCESSED',
      link: `/dashboard`
    });

    // 5. Broadcast real-time update
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notification', {
        title: 'Refund Processed',
        message: `₹${refundAmount} refunded for ${booking.bookingId}`
      });
    } catch (e) {
      logger.debug(`Socket notification error: ${e.message}`);
    }

    logger.info(`Booking ${booking.bookingId} cancelled. Refund ${refundId} of ₹${refundAmount} processed.`);
    return {
      success: true,
      booking,
      refund: refundDoc
    };
  }
}

module.exports = RefundService;
