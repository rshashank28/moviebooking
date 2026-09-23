const mongoose = require('mongoose');

const showSeatSchema = new mongoose.Schema(
  {
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: [true, 'Show reference is required'],
      index: true
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      required: [true, 'Physical seat reference is required'],
      index: true
    },
    screen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Screen',
      required: true,
      index: true
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      index: true
    },
    seatIdentifier: {
      type: String,
      required: true,
      trim: true
    },
    row: {
      type: String,
      required: true,
      trim: true
    },
    number: {
      type: Number,
      required: true
    },
    category: {
      type: String,
      enum: ['RECLINER', 'VIP', 'PREMIUM', 'REGULAR'],
      default: 'REGULAR',
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'LOCKED', 'BOOKED', 'UNAVAILABLE'],
      default: 'AVAILABLE',
      index: true
    },
    lockedBy: {
      type: String,
      default: null
    },
    lockToken: {
      type: String,
      default: null
    },
    lockedUntil: {
      type: Date,
      default: null
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate show-seat inventory records
showSeatSchema.index({ show: 1, seat: 1 }, { unique: true });
showSeatSchema.index({ show: 1, seatIdentifier: 1 });
showSeatSchema.index({ show: 1, status: 1 });

const ShowSeat = mongoose.model('ShowSeat', showSeatSchema);

module.exports = ShowSeat;
