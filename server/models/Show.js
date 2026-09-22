const mongoose = require('mongoose');

const showSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true
    },
    screen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Screen',
      required: true
    },
    city: {
      type: String,
      required: true
    },
    date: {
      type: String, // format YYYY-MM-DD for fast date matching
      required: true
    },
    startTime: {
      type: String, // e.g. "10:30 AM", "03:15 PM", "07:00 PM"
      required: true
    },
    endTime: {
      type: String,
      default: ''
    },
    format: {
      type: String,
      default: '2D'
    },
    language: {
      type: String,
      default: 'Hindi'
    },
    priceTiers: [
      {
        category: {
          type: String,
          enum: ['REGULAR', 'PREMIUM', 'VIP', 'RECLINER', 'COUPLE'],
          required: true
        },
        price: {
          type: Number,
          required: true
        }
      }
    ],
    totalSeats: {
      type: Number,
      default: 0
    },
    availableSeatsCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED'
    }
  },
  {
    timestamps: true
  }
);

showSchema.index({ movie: 1, city: 1, date: 1 });
showSchema.index({ venue: 1, date: 1 });
showSchema.index({ city: 1, date: 1 });
showSchema.index({ status: 1 });

const Show = mongoose.model('Show', showSchema);
module.exports = Show;
