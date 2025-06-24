/**
 * Health Routes
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const express = require('express');
const router = express.Router();
const HealthController = require('../controllers/HealthController');

/**
 * @swagger
 * /:
 *   get:
 *     tags: [Health]
 *     summary: Get API information
 *     description: Returns basic information about the API including version, uptime, and environment
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Small Business Chatbot API is running!"
 *                 version:
 *                   type: string
 *                   example: "1.1.1"
 *                 name:
 *                   type: string
 *                   example: "small-business-chatbot"
 *                 author:
 *                   type: string
 *                   example: "Ravi Kalla"
 *                 deploymentTime:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: integer
 *                   description: Server uptime in seconds
 *                   example: 3600
 *                 nodeVersion:
 *                   type: string
 *                   example: "v18.17.0"
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
router.get('/', HealthController.getRoot);

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     description: Returns the health status of all system components
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: object
 *                   properties:
 *                     isConnected:
 *                       type: boolean
 *                       example: true
 *                 vectorDB:
 *                   type: object
 *                   properties:
 *                     isHealthy:
 *                       type: boolean
 *                       example: true
 *                 twilio:
 *                   type: object
 *                   properties:
 *                     isHealthy:
 *                       type: boolean
 *                       example: true
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 3600.123
 *       500:
 *         description: Health check failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 */
router.get('/health', HealthController.getHealth);

module.exports = router;
