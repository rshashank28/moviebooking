const express = require('express');
const router = express.Router();
const venueController = require('../controllers/venue.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// Public Venue & Show Routes
router.get('/venues', venueController.getVenues);
router.get('/shows/:id', venueController.getShowDetailsWithSeats);
router.get('/shows/:id/locked-seats', venueController.getActiveLocks);
router.post('/shows/:id/lock-seats', optionalAuth, venueController.lockShowSeats);
router.post('/shows/:id/unlock-seats', optionalAuth, venueController.unlockShowSeats);

// Protected Admin/Organizer Routes
router.post('/venues', authenticate, authorize('ADMIN', 'ORGANIZER'), venueController.createVenue);
router.post('/screens', authenticate, authorize('ADMIN', 'ORGANIZER'), venueController.createScreenWithSeats);
router.post('/shows', authenticate, authorize('ADMIN', 'ORGANIZER'), venueController.createShow);

module.exports = router;
