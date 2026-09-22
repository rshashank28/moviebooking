const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/booking.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// Price calculation & booking creation
router.post('/calculate-price', optionalAuth, bookingController.calculatePrice);
router.post('/create', authenticate, bookingController.createBooking);

// User Bookings
router.get('/my-bookings', authenticate, bookingController.getMyBookings);
router.get('/:id', optionalAuth, bookingController.getBookingDetails);

// Ticket Gate Scanner Check-in
router.post('/tickets/scan-checkin', optionalAuth, bookingController.scanCheckInTicket);

module.exports = router;
