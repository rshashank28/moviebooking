const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/booking.controller');
const { authenticate } = require('../middleware/auth');

router.post('/verify', authenticate, bookingController.verifyPayment);

module.exports = router;
