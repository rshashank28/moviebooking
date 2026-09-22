const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refund.controller');
const { authenticate } = require('../middleware/auth');

router.post('/cancel-booking', authenticate, refundController.cancelBooking);
router.get('/my-refunds', authenticate, refundController.getMyRefunds);

module.exports = router;
