const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/metrics', adminController.getAdminMetrics);
router.get('/users', adminController.getUsersList);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.get('/organizers', adminController.getOrganizersList);
router.patch('/organizers/:id/status', adminController.updateOrganizerStatus);
router.post('/movies', adminController.createMovie);
router.get('/coupons', adminController.getCoupons);
router.post('/coupons', adminController.createCoupon);

module.exports = router;
