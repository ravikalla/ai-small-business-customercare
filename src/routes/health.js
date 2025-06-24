/**
 * Health Routes
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const express = require('express');
const router = express.Router();
const HealthController = require('../controllers/HealthController');

// Root endpoint
router.get('/', HealthController.getRoot);

// Health check endpoint
router.get('/health', HealthController.getHealth);

module.exports = router;
