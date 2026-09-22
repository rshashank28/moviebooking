const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const catalogRoutes = require('./catalog.routes');
const venueRoutes = require('./venue.routes');
const bookingRoutes = require('./booking.routes');
const paymentRoutes = require('./payment.routes');
const refundRoutes = require('./refund.routes');
const searchRoutes = require('./search.routes');
const wishlistRoutes = require('./wishlist.routes');
const reviewRoutes = require('./review.routes');
const userRoutes = require('./user.routes');
const organizerRoutes = require('./organizer.routes');
const adminRoutes = require('./admin.routes');
const recommendationRoutes = require('./recommendation.routes');
const aiRoutes = require('./aiAssistant.routes');

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/refunds', refundRoutes);
router.use('/search', searchRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/reviews', reviewRoutes);
router.use('/user', userRoutes);
router.use('/organizer', organizerRoutes);
router.use('/admin', adminRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/ai', aiRoutes);
router.use('/', catalogRoutes);
router.use('/', venueRoutes);

module.exports = router;
