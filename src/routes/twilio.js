/**
 * Twilio Routes
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const express = require('express');
const router = express.Router();
const BusinessController = require('../controllers/BusinessController');

// Get Twilio status and statistics
router.get('/status', BusinessController.getTwilioStatus);

module.exports = router;
