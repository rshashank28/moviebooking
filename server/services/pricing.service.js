const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Event = require('../models/Event');
const Coupon = require('../models/Coupon');
const User = require('../models/User');

const MOVIE_CONVENIENCE_FEE_PER_TICKET = 30;
const EVENT_CONVENIENCE_FEE_PER_TICKET = 40;
const GST_RATE_ON_CONVENIENCE_FEE = 0.18; // 18%

class PricingService {
  /**
   * Calculate movie show booking price breakdown
   */
  static async calculateMoviePricing({
    showId,
    seatIdentifiers,
    couponCode = null,
    loyaltyPointsToRedeem = 0,
    userId = null
  }) {
    const show = await Show.findById(showId).populate('screen');
    if (!show) {
      throw new Error('Show not found');
    }

    if (!seatIdentifiers || seatIdentifiers.length === 0) {
      throw new Error('No seats selected');
    }

    // Retrieve seat records from DB to ensure authentic categories
    const seats = await Seat.find({
      screen: show.screen._id,
      seatIdentifier: { $in: seatIdentifiers }
    });

    if (seats.length !== seatIdentifiers.length) {
      throw new Error('One or more selected seats are invalid');
    }

    // Build price map from Show priceTiers
    const priceMap = new Map();
    (show.priceTiers || []).forEach((t) => {
      priceMap.set(t.category, t.price);
    });

    let baseAmount = 0;
    const enrichedSeats = seats.map((seat) => {
      const price = priceMap.get(seat.category) || 200;
      baseAmount += price;
      return {
        seatIdentifier: seat.seatIdentifier,
        row: seat.row,
        number: seat.number,
        category: seat.category,
        price
      };
    });

    // Convenience fee & GST
    const ticketCount = seatIdentifiers.length;
    const convenienceFee = ticketCount * MOVIE_CONVENIENCE_FEE_PER_TICKET;
    const taxAmount = Math.round(convenienceFee * GST_RATE_ON_CONVENIENCE_FEE);

    let subtotal = baseAmount + convenienceFee + taxAmount;
    let discountAmount = 0;
    let validatedCoupon = null;

    // Validate and apply coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
      });

      if (coupon && baseAmount >= coupon.minOrderAmount) {
        if (coupon.discountType === 'PERCENTAGE') {
          const rawDiscount = (baseAmount * coupon.discountValue) / 100;
          discountAmount = Math.min(rawDiscount, coupon.maxDiscount || rawDiscount);
        } else {
          discountAmount = Math.min(coupon.discountValue, baseAmount);
        }
        discountAmount = Math.round(discountAmount);
        validatedCoupon = coupon.code;
      }
    }

    // Validate loyalty points redemption
    let loyaltyDiscount = 0;
    let validLoyaltyPointsRedeemed = 0;

    if (loyaltyPointsToRedeem > 0 && userId) {
      const user = await User.findById(userId);
      if (user && user.loyaltyPoints > 0) {
        const maxRedeemable = Math.min(
          user.loyaltyPoints,
          loyaltyPointsToRedeem,
          Math.floor(baseAmount * 0.20) // max 20% of base amount can be paid with points
        );
        validLoyaltyPointsRedeemed = maxRedeemable;
        loyaltyDiscount = maxRedeemable; // 1 pt = ₹1
      }
    }

    const finalAmount = Math.max(0, subtotal - discountAmount - loyaltyDiscount);

    return {
      baseAmount,
      convenienceFee,
      taxAmount,
      discountAmount,
      couponCode: validatedCoupon,
      loyaltyPointsRedeemed: validLoyaltyPointsRedeemed,
      loyaltyDiscount,
      finalAmount,
      enrichedSeats
    };
  }

  /**
   * Calculate live event booking price breakdown
   */
  static async calculateEventPricing({
    eventId,
    passes, // [{ categoryName, quantity }]
    couponCode = null,
    loyaltyPointsToRedeem = 0,
    userId = null
  }) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    let baseAmount = 0;
    let totalPassCount = 0;
    const enrichedPasses = [];

    for (const item of passes) {
      const cat = event.ticketCategories.find((c) => c.name === item.categoryName);
      if (!cat) {
        throw new Error(`Invalid pass category: ${item.categoryName}`);
      }
      const quantity = Math.max(1, parseInt(item.quantity, 10));
      const lineTotal = cat.price * quantity;
      baseAmount += lineTotal;
      totalPassCount += quantity;
      enrichedPasses.push({
        categoryName: cat.name,
        quantity,
        pricePerPass: cat.price
      });
    }

    const convenienceFee = totalPassCount * EVENT_CONVENIENCE_FEE_PER_TICKET;
    const taxAmount = Math.round(convenienceFee * GST_RATE_ON_CONVENIENCE_FEE);
    const subtotal = baseAmount + convenienceFee + taxAmount;

    let discountAmount = 0;
    let validatedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
      });

      if (coupon && baseAmount >= coupon.minOrderAmount) {
        if (coupon.discountType === 'PERCENTAGE') {
          const rawDiscount = (baseAmount * coupon.discountValue) / 100;
          discountAmount = Math.min(rawDiscount, coupon.maxDiscount || rawDiscount);
        } else {
          discountAmount = Math.min(coupon.discountValue, baseAmount);
        }
        discountAmount = Math.round(discountAmount);
        validatedCoupon = coupon.code;
      }
    }

    let loyaltyDiscount = 0;
    let validLoyaltyPointsRedeemed = 0;

    if (loyaltyPointsToRedeem > 0 && userId) {
      const user = await User.findById(userId);
      if (user && user.loyaltyPoints > 0) {
        const maxRedeemable = Math.min(
          user.loyaltyPoints,
          loyaltyPointsToRedeem,
          Math.floor(baseAmount * 0.20)
        );
        validLoyaltyPointsRedeemed = maxRedeemable;
        loyaltyDiscount = maxRedeemable;
      }
    }

    const finalAmount = Math.max(0, subtotal - discountAmount - loyaltyDiscount);

    return {
      baseAmount,
      convenienceFee,
      taxAmount,
      discountAmount,
      couponCode: validatedCoupon,
      loyaltyPointsRedeemed: validLoyaltyPointsRedeemed,
      loyaltyDiscount,
      finalAmount,
      enrichedPasses
    };
  }
}

module.exports = PricingService;
