const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    screen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Screen',
      required: true
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true
    },
    row: {
      type: String,
      required: true // e.g. "A"
    },
    number: {
      type: Number,
      required: true // e.g. 1, 2, 3
    },
    seatIdentifier: {
      type: String,
      required: true // e.g. "A1", "A2"
    },
    category: {
      type: String,
      enum: ['REGULAR', 'PREMIUM', 'VIP', 'RECLINER', 'COUPLE', 'ACCESSIBLE'],
      default: 'REGULAR'
    },
    columnPosition: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

seatSchema.index({ screen: 1, seatIdentifier: 1 }, { unique: true });
seatSchema.index({ screen: 1, category: 1 });

const Seat = mongoose.model('Seat', seatSchema);
module.exports = Seat;
