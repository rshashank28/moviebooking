const Wishlist = require('../models/Wishlist');
const ApiResponse = require('../utils/apiResponse');

// @route   POST /api/wishlist/toggle
// @desc    Add or remove item from user wishlist
// @access  Private
const toggleWishlist = async (req, res, next) => {
  try {
    const { itemType, itemId } = req.body;
    const userId = req.user._id;

    if (!itemType || !itemId) {
      return ApiResponse.error(res, 'Item type and ID required', 400, 'INVALID_INPUT');
    }

    const query = { user: userId };
    if (itemType === 'MOVIE') query.movie = itemId;
    else query.event = itemId;

    const existing = await Wishlist.findOne(query);

    if (existing) {
      await Wishlist.findByIdAndDelete(existing._id);
      return ApiResponse.success(res, 'Removed from wishlist', { isWishlisted: false });
    } else {
      await Wishlist.create({
        user: userId,
        itemType,
        movie: itemType === 'MOVIE' ? itemId : undefined,
        event: itemType === 'EVENT' ? itemId : undefined
      });
      return ApiResponse.success(res, 'Saved to wishlist', { isWishlisted: true });
    }
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/wishlist
// @desc    Get all wishlisted items
// @access  Private
const getWishlist = async (req, res, next) => {
  try {
    const items = await Wishlist.find({ user: req.user._id })
      .populate('movie', 'title poster slug duration rating genres ageRating')
      .populate('event', 'title poster slug category artist date startTime city venueName ticketCategories')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Wishlist items retrieved', items);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  toggleWishlist,
  getWishlist
};
