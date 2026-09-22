const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    bookingType: {
      type: String,
      enum: ['MOVIE', 'EVENT'],
      default: 'MOVIE'
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie'
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show'
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue'
    },
    screen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Screen'
    },
    seats: [
      {
        seatIdentifier: { type: String, required: true },
        row: String,
        number: Number,
        category: String,
        price: Number
      }
    ],
    eventPasses: [
      {
        categoryName: String,
        quantity: Number,
        pricePerPass: Number
      }
    ],
    pricing: {
      baseAmount: { type: Number, required: true },
      convenienceFee: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      couponCode: { type: String, default: null },
      loyaltyPointsRedeemed: { type: Number, default: 0 },
      loyaltyDiscount: { type: Number, default: 0 },
      finalAmount: { type: Number, required: true }
    },
    payment: {
      orderId: String,
      paymentId: String,
      signature: String,
      status: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
        default: 'PENDING'
      },
      method: {
        type: String,
        default: 'RAZORPAY'
      },
      paidAt: Date
    },
    bookingStatus: {
      type: String,
      enum: ['INITIATED', 'CONFIRMED', 'CANCELLED', 'EXPIRED'],
      default: 'INITIATED'
    },
    qrCodeData: String, // Base64 data URL
    qrVerificationToken: String,
    checkInStatus: {
      type: String,
      enum: ['NOT_CHECKED_IN', 'CHECKED_IN'],
      default: 'NOT_CHECKED_IN'
    },
    checkInTime: Date,
    cancellation: {
      isCancelled: { type: Boolean, default: false },
      cancelledAt: Date,
      refundAmount: Number,
      reason: String
    }
  },
  {
    timestamps: true
  }
);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1 });
bookingSchema.index({ bookingStatus: 1 });
bookingSchema.index({ qrVerificationToken: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
