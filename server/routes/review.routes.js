const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, reviewController.addReview);
router.get('/:itemType/:itemId', reviewController.getItemReviews);

module.exports = router;
