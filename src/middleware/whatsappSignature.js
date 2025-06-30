/**
 * WhatsApp Webhook Signature Validation Middleware
 * Author: Gemini
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const { AuthenticationError } = require('../errors/AppError');
const config = require('../../config');

const validateWhatsAppSignature = (req, res, next) => {
  if (config.is('development') || config.is('test')) {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    logger.warn('[SECURITY] Missing WhatsApp signature header (x-hub-signature-256)');
    return next(new AuthenticationError('Missing webhook signature.'));
  }

  try {
    const signatureHash = signature.split('=')[1];
    const expectedHash = crypto
      .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
      .update(req.rawBody)
      .digest('hex');

    if (signatureHash !== expectedHash) {
      logger.warn('[SECURITY] Invalid WhatsApp signature');
      return next(new AuthenticationError('Invalid webhook signature.'));
    }

    next();
  } catch (error) {
    logger.error('[SECURITY] Error validating WhatsApp signature:', error);
    next(new AuthenticationError('Signature validation failed.'));
  }
};

module.exports = validateWhatsAppSignature;
