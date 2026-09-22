const express = require('express');
const router = express.Router();
const organizerController = require('../controllers/organizer.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('ORGANIZER', 'ADMIN'));

router.get('/stats', organizerController.getOrganizerStats);
router.post('/events', organizerController.createOrganizerEvent);
router.get('/export-csv', organizerController.exportSalesCSV);

module.exports = router;
