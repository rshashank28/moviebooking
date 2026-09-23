const crypto = require('crypto');
const Razorpay = require('razorpay');
const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
  NODE_ENV
} = require('../config/env');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ShowSeat = require('../models/ShowSeat');
const Show = require('../models/Show');
const Event = require('../models/Event');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const SeatLockService = require('./seatLock.service');
const TicketService = require('./ticket.service');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';

let razorpayInstance = null;
try {
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
  }
} catch (err) {
  logger.warn(`Razorpay initialization note: ${err.message}`);
}

class PaymentService {
  /**
   * Get configured Razorpay instance
   */
  static getRazorpayInstance() {
    return razorpayInstance;
  }

  /**
   * Create Razorpay Order
   */
  static async createOrder(amount, receipt) {
    const amountInPaise = Math.round(amount * 100);
    const orderId = `order_${Math.random().toString(36).substring(2, 12)}`;

    // In production or with live test credentials
    if (razorpayInstance && RAZORPAY_KEY_ID !== 'rzp_test_showpulse_key') {
      try {
        const order = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt,
          payment_capture: 1
        });
        return order;
      } catch (err) {
        if (isProduction) {
          logger.error(`CRITICAL: Production Razorpay order creation failed: ${err.message}`);
          throw new Error(`Payment gateway error: ${err.message}`);
        }
        logger.warn(`Razorpay dev fallback order: ${err.message}`);
      }
    }

    if (isProduction && (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID === 'rzp_test_showpulse_key')) {
      throw new Error('Production payment provider credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) must be configured.');
    }

    // High fidelity dev/test order object
    return {
      id: orderId,
      entity: 'order',
      amount: amountInPaise,
      amount_paid: 0,
      amount_due: amountInPaise,
      currency: 'INR',
      receipt,
      status: 'created'
    };
  }

  /**
   * Verify Razorpay payment signature
   */
  static verifySignature(orderId, paymentId, signature) {
    // Only allow mock signatures when NOT in production
    if (!isProduction && signature && signature.startsWith('test_sig_')) {
      return true;
    }

    if (!RAZORPAY_KEY_SECRET) {
      if (isProduction) return false;
      return true;
    }

    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    return generatedSignature === signature;
  }

  /**
   * Verify Webhook signature
   */
  static verifyWebhookSignature(rawBody, signature) {
    const secret = RAZORPAY_WEBHOOK_SECRET || RAZORPAY_KEY_SECRET;
    if (!secret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Atomic payment confirmation and ticket fulfillment
   */
  static async processPaymentSuccess({
    bookingId,
    orderId,
    paymentId,
    signature,
    method = 'RAZORPAY'
  }) {
    // 1. Signature Verification
    const isSignatureValid = this.verifySignature(orderId, paymentId, signature);
    if (!isSignatureValid) {
      throw new Error('Payment signature verification failed. Possible payload tampering detected.');
    }

    const booking = await Booking.findOne({
      $or: [
        { bookingId },
        { 'payment.orderId': orderId }
      ]
    });

    if (!booking) {
      throw new Error(`Booking for order ${orderId} not found`);
    }

    // 2. Idempotency Check: Already confirmed
    if (booking.bookingStatus === 'CONFIRMED') {
      return { booking, alreadyProcessed: true };
    }

    // 3. Mark show-specific seats as permanently BOOKED in database
    if (booking.bookingType === 'MOVIE' && booking.show && booking.seats?.length > 0) {
      const show = await Show.findById(booking.show);
      if (show) {
        const seatIdentifiers = booking.seats.map((s) => s.seatIdentifier);

        // Update ShowSeat inventory for this show
        await ShowSeat.updateMany(
          { show: show._id, seatIdentifier: { $in: seatIdentifiers } },
          {
            status: 'BOOKED',
            bookedBy: booking.user,
            booking: booking._id,
            lockedBy: null,
            lockToken: null,
            lockedUntil: null
          }
        );

        // Update show booked seats and available count
        await Show.findByIdAndUpdate(show._id, {
          $addToSet: { bookedSeats: { $each: seatIdentifiers } },
          $inc: { availableSeatsCount: -seatIdentifiers.length }
        });

        // Release temporary Redis seat locks
        await SeatLockService.unlockSeats(show._id, seatIdentifiers, booking.user);
      }
    } else if (booking.bookingType === 'EVENT' && booking.event && booking.eventPasses?.length > 0) {
      // Increment event sold counts
      for (const pass of booking.eventPasses) {
        await Event.findOneAndUpdate(
          { _id: booking.event, 'ticketCategories.name': pass.categoryName },
          { $inc: { 'ticketCategories.$.soldCount': pass.quantity } }
        );
      }
    }

    // 4. Generate signed digital QR Pass
    const { qrCodeDataUrl, verificationToken } = await TicketService.generateQRCode(booking);

    // 5. Update Booking record
    booking.bookingStatus = 'CONFIRMED';
    booking.qrCodeData = qrCodeDataUrl;
    booking.qrVerificationToken = verificationToken;
    booking.payment = {
      orderId,
      paymentId,
      signature,
      status: 'PAID',
      method,
      paidAt: new Date()
    };
    await booking.save();

    // 6. Update/Create Payment record
    await Payment.findOneAndUpdate(
      { orderId },
      {
        paymentId,
        signature,
        status: 'CAPTURED',
        method
      },
      { upsert: true }
    );

    // 7. Deduct redeemed points & record in transaction ledger
    if (booking.pricing.loyaltyPointsRedeemed > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        booking.user,
        { $inc: { loyaltyPoints: -booking.pricing.loyaltyPointsRedeemed } },
        { new: true }
      );
      await LoyaltyTransaction.create({
        user: booking.user,
        booking: booking._id,
        type: 'REDEEMED',
        points: -booking.pricing.loyaltyPointsRedeemed,
        balanceAfter: updatedUser ? updatedUser.loyaltyPoints : 0,
        description: `Redeemed ${booking.pricing.loyaltyPointsRedeemed} points on ${booking.bookingId}`
      });
    }

    // 8. Increment Coupon usage count if coupon was applied
    if (booking.pricing.couponCode) {
      await Coupon.findOneAndUpdate(
        { code: booking.pricing.couponCode },
        { $inc: { usedCount: 1 } }
      );
    }

    // 9. Award Loyalty Points (10% of final amount spent in points)
    const pointsEarned = Math.max(10, Math.round(booking.pricing.finalAmount * 0.10));
    const userWithPoints = await User.findByIdAndUpdate(
      booking.user,
      { $inc: { loyaltyPoints: pointsEarned } },
      { new: true }
    );
    await LoyaltyTransaction.create({
      user: booking.user,
      booking: booking._id,
      type: 'EARNED',
      points: pointsEarned,
      balanceAfter: userWithPoints ? userWithPoints.loyaltyPoints : pointsEarned,
      description: `Earned ${pointsEarned} loyalty points from booking ${booking.bookingId}`
    });

    // 10. Check Referral Reward: If referred by another user and this is first booking
    const customer = await User.findById(booking.user);
    if (customer && customer.referredBy) {
      const priorConfirmedBookingsCount = await Booking.countDocuments({
        user: customer._id,
        bookingStatus: 'CONFIRMED',
        _id: { $ne: booking._id }
      });

      if (priorConfirmedBookingsCount === 0) {
        // Reward referrer with 50 loyalty points on friend's first successful booking
        const refUser = await User.findByIdAndUpdate(
          customer.referredBy,
          { $inc: { loyaltyPoints: 50 } },
          { new: true }
        );
        await LoyaltyTransaction.create({
          user: customer.referredBy,
          booking: booking._id,
          type: 'REFERRAL_BONUS',
          points: 50,
          balanceAfter: refUser ? refUser.loyaltyPoints : 50,
          description: `Referral reward for ${customer.name}'s first booking on ShowPulse`
        });
      }
    }

    // 11. Real-time notification broadcast via Socket.IO
    try {
      const io = getIO();
      io.to(`user:${booking.user}`).emit('booking_confirmed', {
        bookingId: booking.bookingId,
        finalAmount: booking.pricing.finalAmount,
        seats: booking.seats?.map((s) => s.seatIdentifier),
        pointsEarned
      });
    } catch (socketErr) {
      logger.debug(`Socket notification error: ${socketErr.message}`);
    }

    logger.info(`Booking ${booking.bookingId} confirmed & ticket generated.`);
    return { booking, pointsEarned };
  }
}

module.exports = PaymentService;
