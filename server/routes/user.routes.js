const express = require('express');
const router = express.Router();
const userDashboardController = require('../controllers/userDashboard.controller');
const { authenticate } = require('../middleware/auth');

router.get('/dashboard', authenticate, userDashboardController.getDashboardOverview);
router.patch('/notifications/:id/read', authenticate, userDashboardController.markNotificationRead);

module.exports = router;
