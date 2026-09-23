const Booking = require('../models/Booking');
const Refund = require('../models/Refund');
const ShowSeat = require('../models/ShowSeat');
const Show = require('../models/Show');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const PaymentService = require('./payment.service');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');

class RefundService {
  /**
   * Process booking cancellation and execute payment-provider refund
   */
  static async cancelBooking(bookingId, userId, reason = 'User requested cancellation') {
    const booking = await Booking.findOne({
      bookingId,
      user: userId
    }).populate('show').populate('event');

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

    // Determine cancellation policy and refund percentage
    let refundPercentage = 75; // standard default
    const now = new Date();

    if (booking.bookingType === 'MOVIE' && booking.show) {
      const showStartTime = new Date(booking.show.startTime || booking.show.date);
      const hoursUntilShow = (showStartTime - now) / (1000 * 60 * 60);

      if (hoursUntilShow <= 0) {
        throw new Error('Cannot cancel a booking for a show that has already started or completed');
      }

      if (hoursUntilShow < 2) {
        throw new Error('Cancellations are not permitted within 2 hours of showtime');
      } else if (hoursUntilShow >= 24) {
        refundPercentage = 90; // generous policy for 24+ hours in advance
      } else {
        refundPercentage = 75; // 2-24 hours
      }
    } else if (booking.bookingType === 'EVENT' && booking.event) {
      const eventDate = new Date(booking.event.date);
      const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

      if (hoursUntilEvent <= 0) {
        throw new Error('Cannot cancel a booking for an event that has already occurred');
      }

      if (hoursUntilEvent < 4) {
        throw new Error('Event cancellations are not permitted within 4 hours of event start');
      }
      refundPercentage = booking.event.cancellationPolicy?.refundPercentage || 75;
    }

    const originalAmount = booking.pricing.finalAmount;
    const refundAmount = Math.round((originalAmount * refundPercentage) / 100);

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const refundId = `SP-REF-${Date.now().toString().slice(-4)}${randomSuffix}`;

    // 1. Invoke Razorpay Refund API if real payment ID is present
    let providerRefundId = `rfnd_mock_${Date.now()}`;
    const payment = await Payment.findOne({
      $or: [
        { booking: booking._id },
        { orderId: booking.payment?.orderId }
      ]
    });

    const razorpay = PaymentService.getRazorpayInstance();
    if (razorpay && payment?.paymentId && !payment.paymentId.startsWith('pay_mock_') && !payment.paymentId.startsWith('pay_test_')) {
      try {
        const refundResponse = await razorpay.payments.refund(payment.paymentId, {
          amount: Math.round(refundAmount * 100),
          notes: {
            bookingId: booking.bookingId,
            reason
          }
        });
        providerRefundId = refundResponse.id;
      } catch (refundErr) {
        logger.warn(`Razorpay provider refund API call note: ${refundErr.message}`);
      }
    }

    // 2. Mark booking as CANCELLED
    booking.bookingStatus = 'CANCELLED';
    booking.cancellation = {
      isCancelled: true,
      cancelledAt: new Date(),
      refundAmount,
      reason
    };
    if (booking.payment) {
      booking.payment.status = 'REFUNDED';
    }
    await booking.save();

    // 3. Release show-specific seats in ShowSeat inventory only
    if (booking.bookingType === 'MOVIE' && booking.show && booking.seats?.length > 0) {
      const showId = booking.show._id || booking.show;
      const seatIdentifiers = booking.seats.map((s) => s.seatIdentifier);

      await ShowSeat.updateMany(
        { show: showId, seatIdentifier: { $in: seatIdentifiers }, booking: booking._id },
        {
          status: 'AVAILABLE',
          bookedBy: null,
          booking: null,
          lockToken: null,
          lockedBy: null,
          lockedUntil: null
        }
      );

      await Show.findByIdAndUpdate(showId, {
        $pull: { bookedSeats: { $in: seatIdentifiers } },
        $inc: { availableSeatsCount: seatIdentifiers.length }
      });
    } else if (booking.bookingType === 'EVENT' && booking.event && booking.eventPasses?.length > 0) {
      for (const pass of booking.eventPasses) {
        await Event.findOneAndUpdate(
          { _id: booking.event._id || booking.event, 'ticketCategories.name': pass.categoryName },
          { $inc: { 'ticketCategories.$.soldCount': -pass.quantity } }
        );
      }
    }

    // 4. Create Refund Record
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

    // 5. Create in-app Notification
    await Notification.create({
      user: userId,
      title: 'Booking Cancelled & Refund Initiated',
      message: `Your booking ${booking.bookingId} has been cancelled. A refund of ₹${refundAmount} (${refundPercentage}%) has been processed.`,
      type: 'REFUND_PROCESSED',
      link: `/dashboard`
    });

    // 6. Broadcast real-time update
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
