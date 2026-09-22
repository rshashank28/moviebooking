const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    description: String,
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED'],
      default: 'PERCENTAGE'
    },
    discountValue: {
      type: Number,
      required: true // e.g. 20 for 20% or 100 for ₹100
    },
    maxDiscount: {
      type: Number,
      default: 200 // Max discount cap in ₹
    },
    minOrderAmount: {
      type: Number,
      default: 300
    },
    validFrom: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date,
      required: true
    },
    usageLimit: {
      type: Number,
      default: 1000
    },
    usedCount: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

couponSchema.index({ isActive: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
