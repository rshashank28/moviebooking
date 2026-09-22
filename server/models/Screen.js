const mongoose = require('mongoose');

const screenSchema = new mongoose.Schema(
  {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true
    },
    name: {
      type: String,
      required: true // e.g. "Screen 1 - Atmos", "Audi 2 - IMAX"
    },
    screenType: {
      type: String,
      enum: ['STANDARD', 'IMAX', '4DX', 'DOLBY_ATMOS', 'GOLD_CLASS', 'OPEN_AIR'],
      default: 'DOLBY_ATMOS'
    },
    totalCapacity: {
      type: Number,
      default: 0
    },
    // Visual row layout configuration for seat generation
    layout: [
      {
        rowLabel: { type: String, required: true }, // e.g. "A", "B", "C"
        category: {
          type: String,
          enum: ['REGULAR', 'PREMIUM', 'VIP', 'RECLINER', 'COUPLE'],
          default: 'REGULAR'
        },
        seatCount: { type: Number, required: true },
        aisleGaps: [Number] // index after which space occurs, e.g. [4, 10]
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

screenSchema.index({ venue: 1 });

const Screen = mongoose.model('Screen', screenSchema);
module.exports = Screen;
