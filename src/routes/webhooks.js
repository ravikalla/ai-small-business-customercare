/**
 * Twilio WhatsApp Webhook Routes
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const rateLimiter = require('../utils/rateLimiter');
const validator = require('../utils/validator');
const twilioWhatsAppService = require('../services/twilioWhatsAppService');
const businessService = require('../services/businessService');
const knowledgeService = require('../services/knowledgeService');
const aiService = require('../services/aiService');

class WebhookHandler {
  constructor() {
    this.setupRoutes();
  }

  setupRoutes() {
    /**
     * @swagger
     * /webhooks/twilio/whatsapp:
     *   post:
     *     tags: [Webhooks]
     *     summary: Twilio WhatsApp webhook handler
     *     description: Handles incoming WhatsApp messages from Twilio and routes them to appropriate business handlers
     *     requestBody:
     *       required: true
     *       content:
     *         application/x-www-form-urlencoded:
     *           schema:
     *             type: object
     *             properties:
     *               From:
     *                 type: string
     *                 description: Sender's WhatsApp number
     *                 example: "whatsapp:+15551234567"
     *               To:
     *                 type: string
     *                 description: Business WhatsApp number
     *                 example: "whatsapp:+15559876543"
     *               Body:
     *                 type: string
     *                 description: Message content
     *                 example: "What are your business hours?"
     *               MessageSid:
     *                 type: string
     *                 description: Twilio message identifier
     *                 example: "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
     *               NumMedia:
     *                 type: string
     *                 description: Number of media attachments
     *                 example: "0"
     *               ProfileName:
     *                 type: string
     *                 description: Sender's profile name
     *                 example: "John Doe"
     *     responses:
     *       200:
     *         description: Webhook processed successfully
     *         content:
     *           text/plain:
     *             schema:
     *               type: string
     *               example: "OK"
     *       403:
     *         description: Invalid webhook signature
     *         content:
     *           text/plain:
     *             schema:
     *               type: string
     *               example: "Forbidden"
     *       500:
     *         description: Internal server error
     *         content:
     *           text/plain:
     *             schema:
     *               type: string
     *               example: "Internal Server Error"
     */
    router.post('/twilio/whatsapp', this.handleTwilioWebhook.bind(this));

    /**
     * @swagger
     * /webhooks/status:
     *   get:
     *     tags: [Webhooks]
     *     summary: Get webhook service status
     *     description: Retrieve the current status of webhook endpoints and Twilio integration
     *     responses:
     *       200:
     *         description: Webhook status retrieved successfully
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
     *                 twilio:
     *                   type: object
     *                   properties:
     *                     isConnected:
     *                       type: boolean
     *                       example: true
     *                     messagesSent:
     *                       type: integer
     *                       example: 150
     *                     messagesReceived:
     *                       type: integer
     *                       example: 98
     *                 webhooks:
     *                   type: object
     *                   properties:
     *                     enabled:
     *                       type: boolean
     *                       example: true
     *                     endpoints:
     *                       type: array
     *                       items:
     *                         type: string
     *                       example: ["/webhooks/twilio/whatsapp"]
     *       500:
     *         description: Failed to retrieve webhook status
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.get('/status', this.getWebhookStatus.bind(this));

    /**
     * @swagger
     * /webhooks/test:
     *   post:
     *     tags: [Webhooks]
     *     summary: Test webhook endpoint
     *     description: Test endpoint to verify webhook functionality
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               message:
     *                 type: string
     *                 description: Test message
     *                 example: "Test webhook"
     *     responses:
     *       200:
     *         description: Test webhook successful
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: "ok"
     *                 message:
     *                   type: string
     *                   example: "Webhook is working"
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *                 receivedData:
     *                   type: object
     *                   description: Echo of received request data
     *       500:
     *         description: Test webhook failed
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.post('/test', this.handleTestWebhook.bind(this));
  }

  async handleTwilioWebhook(req, res) {
    try {
      logger.debug('[WEBHOOK] Received Twilio WhatsApp webhook');

      // Validate webhook signature for security
      const signature = req.headers['x-twilio-signature'];
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

      if (
        process.env.NODE_ENV === 'production' &&
        !twilioWhatsAppService.validateWebhookSignature(signature, url, req.body)
      ) {
        logger.warn('[WEBHOOK] Invalid webhook signature');
        return res.status(403).send('Forbidden');
      }

      // Extract message data from Twilio webhook
      const {
        From: from,
        To: to,
        Body: body,
        MessageSid: messageSid,
        NumMedia: numMedia,
        MediaUrl0: mediaUrl,
        MediaContentType0: mediaContentType,
        ProfileName: profileName,
      } = req.body;

      logger.info(`[WEBHOOK] Message from ${from} to ${to}: "${body || '[Media]'}"`);

      // Global rate limiting
      const phoneNumber = from.replace('whatsapp:', '');
      if (!rateLimiter.checkGlobal()) {
        logger.warn('[WEBHOOK] Global rate limit exceeded');
        await this.sendResponse(
          from,
          to,
          '⚠️ System is experiencing high load. Please try again in a few minutes.'
        );
        return res.status(200).send('OK');
      }

      // Route message to appropriate business handler
      await this.routeMessage({
        from,
        to,
        body,
        messageSid,
        numMedia: parseInt(numMedia) || 0,
        mediaUrl,
        mediaContentType,
        profileName,
        phoneNumber,
      });

      res.status(200).send('OK');
    } catch (error) {
      logger.error('[WEBHOOK] Error handling Twilio webhook:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  async routeMessage(messageData) {
    const { from, to, body, phoneNumber } = messageData;

    try {
      // Find business by WhatsApp number (the 'to' field)
      const business = twilioWhatsAppService.getBusinessByWhatsAppNumber(to);

      if (!business) {
        logger.warn(`[WEBHOOK] No business found for WhatsApp number ${to}`);
        await this.sendResponse(
          from,
          to,
          'This WhatsApp number is not associated with any business. Please contact support.'
        );
        return;
      }

      logger.debug(
        `[WEBHOOK] Routing message to business: ${business.businessName} (${business.businessId})`
      );

      // Check if sender is the business owner
      if (phoneNumber === business.ownerPhone.replace('+', '')) {
        await this.handleBusinessOwnerMessage(messageData, business);
      } else {
        await this.handleCustomerMessage(messageData, business);
      }
    } catch (error) {
      logger.error('[WEBHOOK] Error routing message:', error);
      await this.sendResponse(
        from,
        to,
        'Sorry, I encountered an error processing your message. Please try again.'
      );
    }
  }

  async handleBusinessOwnerMessage(messageData, business) {
    const { from, to, body, numMedia, mediaUrl, phoneNumber } = messageData;

    try {
      logger.info(`[WEBHOOK] Business owner message from ${business.businessName}`);

      // Parse command using the existing command parser
      const parsedCommand = this.parseCommand(body);

      // Handle business owner commands
      if (parsedCommand) {
        await this.processBusinessOwnerCommand(parsedCommand, messageData, business);
      } else if (numMedia > 0) {
        await this.handleMediaUpload(messageData, business);
      } else {
        await this.sendResponse(
          from,
          to,
          'Command not recognized. Send !help for available commands.'
        );
      }
    } catch (error) {
      logger.error(
        `[WEBHOOK] Error handling business owner message from ${business.businessName}:`,
        error
      );
      await this.sendResponse(from, to, 'Error processing your command. Please try again.');
    }
  }

  async handleCustomerMessage(messageData, business) {
    const { from, to, body, phoneNumber } = messageData;

    try {
      logger.info(`[WEBHOOK] Customer message for ${business.businessName}: "${body}"`);

      // Customer rate limiting
      if (!rateLimiter.checkCustomer(phoneNumber)) {
        const remaining = rateLimiter.getRemainingRequests('customer', phoneNumber);
        const resetTime = new Date(rateLimiter.getResetTime('customer', phoneNumber));
        await this.sendResponse(
          from,
          to,
          `⚠️ Rate limit exceeded. You can make ${remaining} more queries. Limit resets at ${resetTime.toLocaleTimeString()}.`
        );
        return;
      }

      // Validate and sanitize customer query
      const queryValidation = validator.validateAndSanitize('customerQuery', body);
      if (!queryValidation.valid) {
        logger.warn(`[WEBHOOK] Invalid customer query: ${queryValidation.error}`);
        await this.sendResponse(from, to, 'Please send a valid question about our business.');
        return;
      }

      const query = queryValidation.sanitized;

      // Record the query in business stats
      await businessService.recordQuery(business.businessId);

      // Send "thinking" message
      await this.sendResponse(from, to, '🤔 Let me search our knowledge base...');

      // Generate AI response
      const response = await aiService.generateResponse(query, business.businessId);

      // Send response to customer
      await this.sendResponse(from, to, response);

      logger.success(`[WEBHOOK] Customer query processed for ${business.businessName}`);
    } catch (error) {
      logger.error(
        `[WEBHOOK] Error handling customer message for ${business.businessName}:`,
        error
      );
      await this.sendResponse(
        from,
        to,
        "Sorry, I couldn't find information about that. Please try rephrasing your question."
      );
    }
  }

  async processBusinessOwnerCommand(parsedCommand, messageData, business) {
    const { from, to } = messageData;
    const { command, args } = parsedCommand;

    try {
      // Rate limiting for business owners
      if (!rateLimiter.checkBusinessOwner(business.ownerPhone)) {
        const remaining = rateLimiter.getRemainingRequests('businessOwner', business.ownerPhone);
        const resetTime = new Date(rateLimiter.getResetTime('businessOwner', business.ownerPhone));
        await this.sendResponse(
          from,
          to,
          `⚠️ Rate limit exceeded. You can make ${remaining} more requests. Limit resets at ${resetTime.toLocaleTimeString()}.`
        );
        return;
      }

      switch (command) {
        case 'add':
          await this.handleAddKnowledge(args, messageData, business);
          break;

        case 'list':
          await this.handleListKnowledge(messageData, business);
          break;

        case 'delete':
          await this.handleDeleteKnowledge(args, messageData, business);
          break;

        case 'help':
          await this.handleHelp(messageData, business);
          break;

        case 'clearcache':
          await this.handleClearCache(messageData, business);
          break;

        case 'inspect':
          await this.handleInspectCache(messageData, business);
          break;

        default:
          await this.sendResponse(
            from,
            to,
            `Unknown command: ${command}. Send !help for available commands.`
          );
      }
    } catch (error) {
      logger.error(`[WEBHOOK] Error processing business owner command ${command}:`, error);
      await this.sendResponse(from, to, 'Error processing command. Please try again.');
    }
  }

  async handleAddKnowledge(args, messageData, business) {
    const { from, to } = messageData;

    try {
      if (!args.trim()) {
        await this.sendResponse(
          from,
          to,
          'Please provide content. Format: !add [your knowledge text]'
        );
        return;
      }

      const contentValidation = validator.validateAndSanitize('knowledgeContent', args.trim());
      if (!contentValidation.valid) {
        await this.sendResponse(from, to, `❌ ${contentValidation.error}`);
        return;
      }

      if (validator.detectSuspiciousContent(contentValidation.sanitized)) {
        await this.sendResponse(
          from,
          to,
          '❌ Content contains suspicious elements and cannot be processed.'
        );
        return;
      }

      const result = await knowledgeService.addTextKnowledge(
        business.businessId,
        business.businessName,
        contentValidation.sanitized
      );

      if (result.success) {
        await businessService.updateKnowledgeCount(business.ownerPhone);
        await this.sendResponse(
          from,
          to,
          `✅ ${result.message}\n"${contentValidation.sanitized.substring(0, 100)}${contentValidation.sanitized.length > 100 ? '...' : ''}"`
        );
      } else {
        await this.sendResponse(from, to, `❌ ${result.message}`);
      }
    } catch (error) {
      logger.error(`[WEBHOOK] Error adding knowledge for ${business.businessName}:`, error);
      await this.sendResponse(from, to, '❌ Failed to add knowledge. Please try again.');
    }
  }

  async handleListKnowledge(messageData, business) {
    const { from, to } = messageData;

    try {
      const entries = await knowledgeService.getBusinessKnowledge(business.businessId);
      const stats = await knowledgeService.getKnowledgeStats(business.businessId);

      if (entries.length === 0) {
        await this.sendResponse(
          from,
          to,
          `📚 Your Knowledge Base (${business.businessName}):\n\nNo entries yet. Use !add [text] or send documents to get started!`
        );
        return;
      }

      let response = `📚 Your Knowledge Base (${business.businessName}):\n\n`;
      entries.slice(0, 10).forEach(entry => {
        const date = new Date(entry.addedAt).toLocaleDateString();
        response += `${entry.id}: ${entry.preview} (${entry.type}) - ${date}\n`;
      });

      if (entries.length > 10) {
        response += `\n... and ${entries.length - 10} more entries`;
      }

      response += `\n📊 Total: ${stats.total} entries (${stats.text} text, ${stats.documents} documents)`;

      await this.sendResponse(from, to, response);
    } catch (error) {
      logger.error(`[WEBHOOK] Error listing knowledge for ${business.businessName}:`, error);
      await this.sendResponse(from, to, '❌ Error retrieving knowledge list.');
    }
  }

  async handleDeleteKnowledge(args, messageData, business) {
    const { from, to } = messageData;

    try {
      if (!args.trim()) {
        await this.sendResponse(
          from,
          to,
          'Please provide a knowledge ID. Format: !delete [knowledge-id]'
        );
        return;
      }

      const idValidation = validator.validateAndSanitize('knowledgeId', args.trim());
      if (!idValidation.valid) {
        await this.sendResponse(from, to, `❌ ${idValidation.error}`);
        return;
      }

      const result = await knowledgeService.deleteKnowledge(
        business.businessId,
        idValidation.sanitized
      );

      if (result.success) {
        await businessService.updateKnowledgeCount(business.ownerPhone, -1);
        await this.sendResponse(from, to, `✅ ${result.message}`);
      } else {
        await this.sendResponse(from, to, `❌ ${result.message}`);
      }
    } catch (error) {
      logger.error(`[WEBHOOK] Error deleting knowledge for ${business.businessName}:`, error);
      await this.sendResponse(from, to, '❌ Error deleting knowledge entry.');
    }
  }

  async handleHelp(messageData, business) {
    const { from, to } = messageData;

    const help = `🔧 Available Commands for ${business.businessName}:

📝 *Knowledge Management:*
• !add [text] - Add text knowledge
• Send documents - Upload files (coming soon)
• !list - View your knowledge base
• !delete [id] - Remove knowledge entry

📊 *Information:*
• !help - Show this help message
• !clearcache - Clear cached responses
• !inspect - View cache status

💡 *Tips:*
- Customers can message this WhatsApp number directly
- All content is processed and made searchable
- Use descriptive text for better customer responses`;

    await this.sendResponse(from, to, help);
  }

  async handleClearCache(messageData, business) {
    const { from, to } = messageData;

    try {
      const cache = require('../utils/cache');
      const clearedCount = cache.clearBusinessCaches(business.businessId);

      await this.sendResponse(
        from,
        to,
        `🗑️ Cleared ${clearedCount} cached responses for ${business.businessName}. Fresh queries will now search updated knowledge base.`
      );
    } catch (error) {
      logger.error(`[WEBHOOK] Error clearing cache for ${business.businessName}:`, error);
      await this.sendResponse(from, to, '❌ Error clearing cache. Please try again.');
    }
  }

  async handleInspectCache(messageData, business) {
    const { from, to } = messageData;

    try {
      const cache = require('../utils/cache');
      const stats = cache.getStats();

      let response = `🔍 Cache Status (${business.businessName}):\n\n`;
      response += `📊 Stats:\n`;
      response += `• Hit Rate: ${stats.hitRate}\n`;
      response += `• Hits: ${stats.hits}, Misses: ${stats.misses}\n`;
      response += `• Total Saves: ${stats.saves}\n\n`;

      response += `💾 Cache Sizes:\n`;
      response += `• Responses: ${stats.cacheSize.responses}\n`;
      response += `• Searches: ${stats.cacheSize.searches}\n`;
      response += `• Embeddings: ${stats.cacheSize.embeddings}`;

      await this.sendResponse(from, to, response);
    } catch (error) {
      logger.error(`[WEBHOOK] Error inspecting cache for ${business.businessName}:`, error);
      await this.sendResponse(from, to, '❌ Error inspecting cache. Please try again.');
    }
  }

  async handleMediaUpload(messageData, business) {
    const { from, to } = messageData;
    // TODO: Implement media upload handling for Twilio
    await this.sendResponse(
      from,
      to,
      '📄 Media upload support coming soon! For now, please use !add [text] to add knowledge.'
    );
  }

  parseCommand(messageBody) {
    if (!messageBody) {
      return null;
    }

    // Normalize whitespace and line endings
    const normalized = messageBody
      .replace(/\r\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const commandMatch = normalized.match(/^!(\w+)(?:\s+(.*))?$/i);
    if (!commandMatch) {
      return null;
    }

    return {
      command: commandMatch[1].toLowerCase(),
      args: commandMatch[2] || '',
      normalized: normalized,
    };
  }

  async sendResponse(to, from, message) {
    try {
      const result = await twilioWhatsAppService.sendMessage(to, message, from);
      if (!result.success) {
        logger.error(`[WEBHOOK] Failed to send response: ${result.error}`);
      }
    } catch (error) {
      logger.error('[WEBHOOK] Error sending response:', error);
    }
  }

  async getWebhookStatus(req, res) {
    try {
      const stats = twilioWhatsAppService.getStats();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        twilio: stats,
        webhooks: {
          enabled: true,
          endpoints: ['/webhooks/twilio/whatsapp'],
        },
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error.message,
      });
    }
  }

  async handleTestWebhook(req, res) {
    try {
      logger.info('[WEBHOOK] Test webhook called');
      res.json({
        status: 'ok',
        message: 'Webhook is working',
        timestamp: new Date().toISOString(),
        receivedData: req.body,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error.message,
      });
    }
  }
}

// Initialize webhook handler
new WebhookHandler();

module.exports = router;
