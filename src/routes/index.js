/**
 * Routes Index
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const express = require('express');
const router = express.Router();

// Import route modules
const healthRoutes = require('./health');
const businessRoutes = require('./business');
const twilioRoutes = require('./twilio');
const adminRoutes = require('./admin');
const webhookRoutes = require('./webhooks');
const loggingRoutes = require('./logging');
const performanceRoutes = require('./performance');

// Mount route modules
router.use('/', healthRoutes); // Root and health endpoints
router.use('/api/businesses', businessRoutes); // Business management
router.use('/api/twilio', twilioRoutes); // Twilio integration
router.use('/api/admin', adminRoutes); // Admin functions (backup, cache)
router.use('/api/logging', loggingRoutes); // Logging management
router.use('/api/performance', performanceRoutes); // Performance monitoring
router.use('/webhooks', webhookRoutes); // Webhook handlers

module.exports = router;
