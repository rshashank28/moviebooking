const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlist.controller');
const { authenticate } = require('../middleware/auth');

router.post('/toggle', authenticate, wishlistController.toggleWishlist);
router.get('/', authenticate, wishlistController.getWishlist);

module.exports = router;
