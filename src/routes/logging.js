/**
 * Logging Management Routes
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { basicAuth } = require('../middleware/security');

// Apply basic auth to all logging management routes
router.use(basicAuth);

/**
 * @swagger
 * /api/logging/metrics:
 *   get:
 *     tags: [Logging]
 *     summary: Get logging metrics
 *     description: Retrieve current logging system metrics and statistics
 *     security:
 *       - BasicAuth: []
 *     responses:
 *       200:
 *         description: Logging metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     logCounts:
 *                       type: object
 *                       properties:
 *                         error:
 *                           type: integer
 *                           example: 5
 *                         warn:
 *                           type: integer
 *                           example: 12
 *                         info:
 *                           type: integer
 *                           example: 150
 *                         debug:
 *                           type: integer
 *                           example: 300
 *                     totalLogs:
 *                       type: integer
 *                       example: 467
 *                     errorRate:
 *                       type: string
 *                       example: "1.07"
 *                     activeRequests:
 *                       type: integer
 *                       example: 3
 *                     logLevel:
 *                       type: string
 *                       example: "info"
 *                     structuredLogging:
 *                       type: boolean
 *                       example: false
 *                     fileLogging:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Authentication required
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = logger.getMetrics();
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/logging/level:
 *   put:
 *     tags: [Logging]
 *     summary: Set log level
 *     description: Change the current logging level
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - level
 *             properties:
 *               level:
 *                 type: string
 *                 enum: [error, warn, info, debug, trace]
 *                 description: New log level
 *                 example: "debug"
 *     responses:
 *       200:
 *         description: Log level updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Log level changed to debug"
 *                 previousLevel:
 *                   type: string
 *                   example: "info"
 *                 newLevel:
 *                   type: string
 *                   example: "debug"
 *       400:
 *         description: Invalid log level
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 */
router.put('/level', (req, res) => {
  try {
    const { level } = req.body;

    if (!level) {
      return res.status(400).json({
        success: false,
        error: 'Log level is required',
      });
    }

    const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        error: `Invalid log level. Valid levels: ${validLevels.join(', ')}`,
      });
    }

    const previousMetrics = logger.getMetrics();
    const previousLevel = previousMetrics.logLevel;

    logger.setLogLevel(level);

    res.json({
      success: true,
      message: `Log level changed to ${level}`,
      previousLevel,
      newLevel: level,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/logging/clear-metrics:
 *   post:
 *     tags: [Logging]
 *     summary: Clear logging metrics
 *     description: Reset all logging metrics and counters
 *     security:
 *       - BasicAuth: []
 *     responses:
 *       200:
 *         description: Logging metrics cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logging metrics cleared"
 *                 previousMetrics:
 *                   type: object
 *                   description: Metrics before clearing
 *       401:
 *         description: Authentication required
 */
router.post('/clear-metrics', (req, res) => {
  try {
    const previousMetrics = logger.getMetrics();
    logger.clearMetrics();

    res.json({
      success: true,
      message: 'Logging metrics cleared',
      previousMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/logging/test:
 *   post:
 *     tags: [Logging]
 *     summary: Test logging functionality
 *     description: Generate test log entries at different levels
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               level:
 *                 type: string
 *                 enum: [error, warn, info, debug, trace, success]
 *                 description: Log level to test
 *                 example: "info"
 *               message:
 *                 type: string
 *                 description: Custom test message
 *                 example: "This is a test log message"
 *               metadata:
 *                 type: object
 *                 description: Additional metadata to include
 *     responses:
 *       200:
 *         description: Test log generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Test log generated at info level"
 *                 testData:
 *                   type: object
 *                   description: Information about the test log
 *       401:
 *         description: Authentication required
 */
router.post('/test', (req, res) => {
  try {
    const { level = 'info', message = 'Test log message', metadata = {} } = req.body;

    const testMessage = `[TEST] ${message}`;
    const testMetadata = {
      ...metadata,
      testTimestamp: new Date().toISOString(),
      requestId: req.requestId,
      testRequest: true,
    };

    // Generate test log based on level
    switch (level) {
      case 'error':
        logger.error(testMessage, testMetadata);
        break;
      case 'warn':
        logger.warn(testMessage, testMetadata);
        break;
      case 'info':
        logger.info(testMessage, testMetadata);
        break;
      case 'debug':
        logger.debug(testMessage, testMetadata);
        break;
      case 'trace':
        logger.trace(testMessage, testMetadata);
        break;
      case 'success':
        logger.success(testMessage, testMetadata);
        break;
      default:
        logger.info(testMessage, testMetadata);
    }

    res.json({
      success: true,
      message: `Test log generated at ${level} level`,
      testData: {
        level,
        message: testMessage,
        metadata: testMetadata,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
