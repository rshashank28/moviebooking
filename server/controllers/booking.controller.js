const Booking = require('../models/Booking');
const Show = require('../models/Show');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const User = require('../models/User');
const PricingService = require('../services/pricing.service');
const PaymentService = require('../services/payment.service');
const TicketService = require('../services/ticket.service');
const SeatLockService = require('../services/seatLock.service');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

// @route   POST /api/bookings/calculate-price
// @desc    Calculate authoritative booking price with fee, coupon, and points
// @access  Public / Authenticated
const calculatePrice = async (req, res, next) => {
  try {
    const {
      bookingType = 'MOVIE',
      showId,
      eventId,
      seatIdentifiers,
      passes,
      couponCode,
      loyaltyPointsToRedeem
    } = req.body;

    const userId = req.user ? req.user._id : null;

    if (bookingType === 'MOVIE') {
      const pricing = await PricingService.calculateMoviePricing({
        showId,
        seatIdentifiers,
        couponCode,
        loyaltyPointsToRedeem,
        userId
      });
      return ApiResponse.success(res, 'Price calculated', pricing);
    } else {
      const pricing = await PricingService.calculateEventPricing({
        eventId,
        passes,
        couponCode,
        loyaltyPointsToRedeem,
        userId
      });
      return ApiResponse.success(res, 'Price calculated', pricing);
    }
  } catch (err) {
    return ApiResponse.error(res, err.message, 400, 'CALCULATION_FAILED');
  }
};

// @route   POST /api/bookings/create
// @desc    Initiate booking and create Razorpay payment order
// @access  Private
const createBooking = async (req, res, next) => {
  try {
    const {
      bookingType = 'MOVIE',
      showId,
      eventId,
      seatIdentifiers,
      passes,
      couponCode,
      loyaltyPointsToRedeem,
      lockToken
    } = req.body;

    const userId = req.user._id;
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const bookingId = `SP-${bookingType === 'MOVIE' ? 'MOV' : 'EVT'}-${Date.now().toString().slice(-4)}${randomSuffix}`;

    let pricingResult = null;
    let movieRef = null;
    let showRef = null;
    let eventRef = null;
    let venueRef = null;
    let screenRef = null;

    if (bookingType === 'MOVIE') {
      const show = await Show.findById(showId);
      if (!show) {
        return ApiResponse.error(res, 'Show not found', 404, 'SHOW_NOT_FOUND');
      }

      // Verify active seat lock ownership before initiating booking
      await SeatLockService.verifyLockOwnership(showId, seatIdentifiers, userId, lockToken);

      pricingResult = await PricingService.calculateMoviePricing({
        showId,
        seatIdentifiers,
        couponCode,
        loyaltyPointsToRedeem,
        userId
      });

      movieRef = show.movie;
      showRef = show._id;
      venueRef = show.venue;
      screenRef = show.screen;
    } else {
      const event = await Event.findById(eventId);
      if (!event) {
        return ApiResponse.error(res, 'Event not found', 404, 'EVENT_NOT_FOUND');
      }

      // Check event capacity before initiating
      if (passes && Array.isArray(passes)) {
        for (const pass of passes) {
          const category = event.ticketCategories.find((c) => c.name === pass.categoryName);
          if (!category) {
            return ApiResponse.error(res, `Invalid ticket category: ${pass.categoryName}`, 400, 'INVALID_CATEGORY');
          }
          if ((category.soldCount || 0) + parseInt(pass.quantity, 10) > category.capacity) {
            return ApiResponse.error(res, `Pass category ${pass.categoryName} is sold out or does not have enough capacity`, 400, 'CAPACITY_EXCEEDED');
          }
        }
      }

      pricingResult = await PricingService.calculateEventPricing({
        eventId,
        passes,
        couponCode,
        loyaltyPointsToRedeem,
        userId
      });

      eventRef = event._id;
    }

    // Create Razorpay Order with authoritative server total
    const razorpayOrder = await PaymentService.createOrder(
      pricingResult.finalAmount,
      bookingId
    );

    // Save initial Booking record in INITIATED / PENDING_PAYMENT state
    // Note: Loyalty points are NOT deducted here; they are deducted upon verified payment confirmation
    const booking = await Booking.create({
      bookingId,
      user: userId,
      bookingType,
      movie: movieRef,
      event: eventRef,
      show: showRef,
      venue: venueRef,
      screen: screenRef,
      seats: pricingResult.enrichedSeats || [],
      eventPasses: pricingResult.enrichedPasses || [],
      pricing: {
        baseAmount: pricingResult.baseAmount,
        convenienceFee: pricingResult.convenienceFee,
        taxAmount: pricingResult.taxAmount,
        discountAmount: pricingResult.discountAmount,
        couponCode: pricingResult.couponCode,
        loyaltyPointsRedeemed: pricingResult.loyaltyPointsRedeemed,
        loyaltyDiscount: pricingResult.loyaltyDiscount,
        finalAmount: pricingResult.finalAmount
      },
      payment: {
        orderId: razorpayOrder.id,
        status: 'PENDING'
      },
      bookingStatus: 'INITIATED'
    });

    // Create initial Payment record
    await Payment.create({
      orderId: razorpayOrder.id,
      user: userId,
      booking: booking._id,
      amount: pricingResult.finalAmount,
      currency: 'INR',
      status: 'CREATED'
    });

    return ApiResponse.created(res, 'Booking initiated', {
      bookingId: booking.bookingId,
      razorpayOrder,
      pricing: booking.pricing
    });
  } catch (err) {
    return ApiResponse.error(res, err.message, 400, 'BOOKING_CREATION_FAILED');
  }
};

// @route   POST /api/payments/verify
// @desc    Verify Razorpay payment signature & confirm booking
// @access  Private
const verifyPayment = async (req, res, next) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body;

    const result = await PaymentService.processPaymentSuccess({
      bookingId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      method: method || 'RAZORPAY'
    });

    return ApiResponse.success(res, 'Payment verified and booking confirmed', result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 400, 'PAYMENT_VERIFICATION_FAILED');
  }
};

// @route   POST /api/payments/webhook
// @desc    Handle asynchronous Razorpay payment & refund webhook events
// @access  Public (Signature Verified)
const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || req.body;

    // Verify webhook signature
    const isValid = PaymentService.verifyWebhookSignature(rawBody, signature);
    if (!isValid && process.env.NODE_ENV === 'production') {
      logger.warn('Razorpay webhook signature verification failed');
      return res.status(400).json({ status: 'invalid_signature' });
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventType = event.event;
    logger.info(`Received Razorpay webhook event: ${eventType}`);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const booking = await Booking.findOne({ 'payment.orderId': orderId });
        if (booking && booking.bookingStatus !== 'CONFIRMED') {
          await PaymentService.processPaymentSuccess({
            bookingId: booking.bookingId,
            orderId,
            paymentId: paymentId || `pay_${Date.now()}`,
            signature: signature || 'webhook_verified',
            method: paymentEntity?.method || 'RAZORPAY'
          });
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (orderId) {
        await Booking.findOneAndUpdate(
          { 'payment.orderId': orderId, bookingStatus: 'INITIATED' },
          { bookingStatus: 'EXPIRED', 'payment.status': 'FAILED' }
        );
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    logger.error(`Webhook processing error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
};

// @route   GET /api/bookings/my-bookings
// @desc    Get logged in user bookings
// @access  Private
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('movie', 'title poster duration genres languages ageRating')
      .populate('event', 'title poster venueName date startTime')
      .populate('venue', 'name address city')
      .populate('screen', 'name screenType')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'User bookings retrieved', bookings);
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/bookings/:id
// @desc    Get single booking pass details with IDOR protection & PII sanitization
// @access  Private / Public (by bookingId)
const getBookingDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findOne({
      $or: [
        { bookingId: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])
      ]
    })
      .populate('movie', 'title poster banner duration genres languages ageRating')
      .populate('event', 'title poster banner venueName address date startTime terms organizer')
      .populate('venue', 'name address city location amenities organizer')
      .populate('screen', 'name screenType')
      .populate('user', 'name email phone');

    if (!booking) {
      return ApiResponse.error(res, 'Booking not found', 404, 'BOOKING_NOT_FOUND');
    }

    // IDOR and PII authorization check:
    const currentUser = req.user;
    const isOwner = currentUser && booking.user && booking.user._id.toString() === currentUser._id.toString();
    const isAdmin = currentUser && currentUser.role === 'ADMIN';
    const isOrganizer = currentUser && currentUser.role === 'ORGANIZER' && (
      (booking.event && booking.event.organizer?.toString() === currentUser._id.toString()) ||
      (booking.venue && booking.venue.organizer?.toString() === currentUser._id.toString())
    );

    // If unauthenticated or accessing someone else's booking, sanitize sensitive PII
    if (!isOwner && !isAdmin && !isOrganizer) {
      const sanitizedBooking = booking.toObject();
      if (sanitizedBooking.user) {
        sanitizedBooking.user = {
          name: sanitizedBooking.user.name
        };
      }
      return ApiResponse.success(res, 'Booking details fetched', sanitizedBooking);
    }

    return ApiResponse.success(res, 'Booking details fetched', booking);
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/tickets/scan-checkin
// @desc    Gate Check-in QR verification scanner
// @access  Organizer / Admin
const scanCheckInTicket = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required to scan tickets', 401, 'UNAUTHORIZED');
    }

    const result = await TicketService.scanAndCheckInTicket(token, req.user);

    if (!result.isValid) {
      return ApiResponse.error(res, result.message, 400, result.status, result);
    }

    return ApiResponse.success(res, result.message, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500, 'SCAN_ERROR');
  }
};

module.exports = {
  calculatePrice,
  createBooking,
  verifyPayment,
  handleRazorpayWebhook,
  getMyBookings,
  getBookingDetails,
  scanCheckInTicket
};
