const express = require('express');
const router = express.Router();
const aiAssistantController = require('../controllers/aiAssistant.controller');

router.post('/assistant', aiAssistantController.processUserQuery);

module.exports = router;
