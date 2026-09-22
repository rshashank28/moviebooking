const mongoose = require('mongoose');

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['EARNED', 'REDEEMED', 'WELCOME_BONUS', 'REFERRAL_BONUS', 'CANCELLATION_REVERSAL'],
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    }
  },
  {
    timestamps: true
  }
);

loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });

const LoyaltyTransaction = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
module.exports = LoyaltyTransaction;
