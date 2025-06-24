/**
 * Twilio Routes
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const express = require('express');
const router = express.Router();
const BusinessController = require('../controllers/BusinessController');

/**
 * @swagger
 * /api/twilio/status:
 *   get:
 *     tags: [Twilio]
 *     summary: Get Twilio service status
 *     description: Retrieve the current status and statistics of the Twilio WhatsApp service
 *     responses:
 *       200:
 *         description: Twilio service status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: "connected"
 *                 twilioStatus:
 *                   type: object
 *                   properties:
 *                     accountSid:
 *                       type: string
 *                       example: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *                     isConnected:
 *                       type: boolean
 *                       example: true
 *                     lastCheck:
 *                       type: string
 *                       format: date-time
 *                 whatsappStatus:
 *                   type: object
 *                   properties:
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     registeredNumbers:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["whatsapp:+15551234567"]
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     messagesSent:
 *                       type: integer
 *                       example: 150
 *                     messagesReceived:
 *                       type: integer
 *                       example: 98
 *                     lastActivity:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Failed to retrieve Twilio status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/status', BusinessController.getTwilioStatus);

module.exports = router;
