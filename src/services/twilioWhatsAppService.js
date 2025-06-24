/**
 * Twilio WhatsApp Business API Service
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const twilio = require('twilio');
const logger = require('../utils/logger');
const rateLimiter = require('../utils/rateLimiter');
const RetryManager = require('../utils/retry');

class TwilioWhatsAppService {
  constructor() {
    this.client = null;
    this.businesses = new Map(); // whatsapp_number -> businessData
    this.isInitialized = false;
  }

  async initialize() {
    try {
      logger.info('[TWILIO] Initializing Twilio WhatsApp service...');

      // Validate required environment variables
      const requiredVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
      for (const varName of requiredVars) {
        if (!process.env[varName]) {
          throw new Error(`Missing required environment variable: ${varName}`);
        }
      }

      // Initialize Twilio client
      this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      // Test connection
      await this.testConnection();

      this.isInitialized = true;
      logger.success('[TWILIO] Twilio WhatsApp service initialized successfully');
    } catch (error) {
      logger.error('[TWILIO] Failed to initialize Twilio service:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await RetryManager.withRetry(
        async () => {
          const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
          logger.debug(`[TWILIO] Connected to account: ${account.friendlyName}`);
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'twilioConnectionTest',
        }
      );
    } catch (error) {
      logger.error('[TWILIO] Connection test failed:', error);
      throw new Error('Failed to connect to Twilio API');
    }
  }

  async registerBusiness(businessId, businessName, whatsappNumber, ownerPhone) {
    try {
      logger.info(
        `[TWILIO] Registering business ${businessName} with WhatsApp number ${whatsappNumber}`
      );

      // Validate WhatsApp number format
      if (!whatsappNumber.startsWith('whatsapp:+')) {
        whatsappNumber = `whatsapp:${whatsappNumber}`;
      }

      const businessData = {
        businessId,
        businessName,
        whatsappNumber,
        ownerPhone,
        registeredAt: new Date().toISOString(),
        status: 'active',
      };

      this.businesses.set(whatsappNumber, businessData);

      logger.success(
        `[TWILIO] Successfully registered business ${businessName} (${businessId}) with WhatsApp ${whatsappNumber}`
      );
      return { success: true, businessData };
    } catch (error) {
      logger.error(`[TWILIO] Error registering business ${businessName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendMessage(to, message, fromNumber = null) {
    try {
      if (!this.isInitialized) {
        throw new Error('Twilio service not initialized');
      }

      // Format WhatsApp number
      if (!to.startsWith('whatsapp:+')) {
        to = `whatsapp:${to}`;
      }

      // Use default WhatsApp number if not specified
      const from = fromNumber || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio Sandbox

      logger.debug(
        `[TWILIO] Sending message from ${from} to ${to}: "${message.substring(0, 50)}..."`
      );

      const result = await RetryManager.withRetry(
        async () => {
          return await this.client.messages.create({
            body: message,
            from: from,
            to: to,
          });
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'twilioSendMessage',
        }
      );

      logger.success(`[TWILIO] Message sent successfully. SID: ${result.sid}`);
      return { success: true, messageSid: result.sid };
    } catch (error) {
      logger.error(`[TWILIO] Error sending message to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendMediaMessage(to, mediaUrl, caption = '', fromNumber = null) {
    try {
      if (!this.isInitialized) {
        throw new Error('Twilio service not initialized');
      }

      // Format WhatsApp number
      if (!to.startsWith('whatsapp:+')) {
        to = `whatsapp:${to}`;
      }

      const from = fromNumber || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

      logger.debug(`[TWILIO] Sending media message from ${from} to ${to}`);

      const result = await RetryManager.withRetry(
        async () => {
          return await this.client.messages.create({
            body: caption,
            from: from,
            to: to,
            mediaUrl: [mediaUrl],
          });
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'twilioSendMediaMessage',
        }
      );

      logger.success(`[TWILIO] Media message sent successfully. SID: ${result.sid}`);
      return { success: true, messageSid: result.sid };
    } catch (error) {
      logger.error(`[TWILIO] Error sending media message to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  getBusinessByWhatsAppNumber(whatsappNumber) {
    // Normalize the number format
    if (!whatsappNumber.startsWith('whatsapp:+')) {
      whatsappNumber = `whatsapp:${whatsappNumber}`;
    }

    return this.businesses.get(whatsappNumber);
  }

  getBusinessByOwnerPhone(ownerPhone) {
    for (const [whatsappNumber, businessData] of this.businesses.entries()) {
      if (businessData.ownerPhone === ownerPhone) {
        return businessData;
      }
    }
    return null;
  }

  getAllBusinesses() {
    return Array.from(this.businesses.values());
  }

  async getMessageStatus(messageSid) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
      };
    } catch (error) {
      logger.error(`[TWILIO] Error fetching message status for ${messageSid}:`, error);
      return { status: 'unknown', error: error.message };
    }
  }

  async listPhoneNumbers() {
    try {
      const phoneNumbers = await this.client.incomingPhoneNumbers.list();
      return phoneNumbers.map(number => ({
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        capabilities: number.capabilities,
      }));
    } catch (error) {
      logger.error('[TWILIO] Error listing phone numbers:', error);
      return [];
    }
  }

  validateWebhookSignature(signature, url, params) {
    try {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      return twilio.validateRequest(authToken, signature, url, params);
    } catch (error) {
      logger.error('[TWILIO] Webhook signature validation failed:', error);
      return false;
    }
  }

  isHealthy() {
    return this.isInitialized && this.client !== null;
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      registeredBusinesses: this.businesses.size,
      businesses: this.getAllBusinesses().map(b => ({
        businessId: b.businessId,
        businessName: b.businessName,
        whatsappNumber: b.whatsappNumber,
        status: b.status,
      })),
    };
  }
}

module.exports = new TwilioWhatsAppService();
