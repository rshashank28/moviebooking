const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    originalAmount: {
      type: Number,
      required: true
    },
    refundAmount: {
      type: Number,
      required: true
    },
    refundPercentage: {
      type: Number,
      default: 75 // Default 75% refund policy
    },
    reason: {
      type: String,
      default: 'Customer requested cancellation'
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'FAILED'],
      default: 'PROCESSED'
    },
    processedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

refundSchema.index({ user: 1 });
refundSchema.index({ booking: 1 });

const Refund = mongoose.model('Refund', refundSchema);
module.exports = Refund;
