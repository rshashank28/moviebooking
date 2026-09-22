const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendation.controller');
const { optionalAuth } = require('../middleware/auth');

router.get('/seats', recommendationController.getSmartSeatRecommendation);
router.get('/for-you', optionalAuth, recommendationController.getPersonalizedRecommendations);

module.exports = router;
