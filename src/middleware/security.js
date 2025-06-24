/**
 * Security Middleware
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const config = require('../../config');
const { RateLimitError, AuthenticationError } = require('../errors/AppError');
const logger = require('../utils/logger');

/**
 * Configure rate limiting based on environment
 */
const createRateLimiter = (options = {}) => {
  const rateLimitConfig = config.get('rateLimit');
  
  const limiter = rateLimit({
    windowMs: options.windowMs || rateLimitConfig.windowMs,
    max: options.max || rateLimitConfig.max,
    message: options.message || rateLimitConfig.message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      logger.warn(`[SECURITY] Rate limit exceeded for IP: ${req.ip}, URL: ${req.originalUrl}`);
      next(new RateLimitError(rateLimitConfig.message));
    },
    skip: (req) => {
      // Skip rate limiting for health checks in development
      if (config.is('development') && req.path === '/health') {
        return true;
      }
      return false;
    }
  });

  return limiter;
};

/**
 * General rate limiter for all requests
 */
const generalRateLimiter = createRateLimiter();

/**
 * Strict rate limiter for sensitive endpoints
 */
const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many requests to this endpoint, please try again later.'
});

/**
 * Webhook rate limiter (more lenient for Twilio)
 */
const webhookRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Webhook rate limit exceeded.'
});

/**
 * Configure Helmet security headers
 */
const configureHelmet = () => {
  const securityConfig = config.get('security.helmet');
  
  return helmet({
    contentSecurityPolicy: securityConfig.contentSecurityPolicy,
    crossOriginEmbedderPolicy: false, // Disable for API
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  });
};

/**
 * Validate Twilio webhook signature
 */
const validateTwilioSignature = (req, res, next) => {
  // Skip validation in development/test environments
  if (config.is('development') || config.is('test')) {
    return next();
  }

  const crypto = require('crypto');
  const twilioConfig = config.get('messaging.twilio');
  
  const signature = req.headers['x-twilio-signature'];
  if (!signature) {
    logger.warn('[SECURITY] Missing Twilio signature header');
    return next(new AuthenticationError('Missing webhook signature'));
  }

  try {
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const body = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha1', twilioConfig.authToken)
      .update(url + body)
      .digest('base64');

    const providedSignature = signature.replace('sha1=', '');

    if (expectedSignature !== providedSignature) {
      logger.warn('[SECURITY] Invalid Twilio signature');
      return next(new AuthenticationError('Invalid webhook signature'));
    }

    next();
  } catch (error) {
    logger.error('[SECURITY] Error validating Twilio signature:', error);
    next(new AuthenticationError('Signature validation failed'));
  }
};

/**
 * Request logging for security monitoring
 */
const securityLogger = (req, res, next) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    contentLength: req.get('Content-Length') || 0
  };

  // Log suspicious patterns
  const suspiciousPatterns = [
    /admin/i,
    /phpmyadmin/i,
    /\.php$/i,
    /wp-admin/i,
    /\.env$/i,
    /config\.json$/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.originalUrl) || pattern.test(req.get('User-Agent') || '')
  );

  if (isSuspicious) {
    logger.warn('[SECURITY] Suspicious request detected:', logData);
  } else if (config.is('development')) {
    logger.debug('[SECURITY] Request:', logData);
  }

  next();
};

/**
 * Basic authentication for admin endpoints
 */
const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return next(new AuthenticationError('Authentication required'));
  }

  try {
    const credentials = Buffer.from(auth.slice(6), 'base64').toString().split(':');
    const [username, password] = credentials;

    // In production, these should come from environment variables
    const validUsername = process.env.ADMIN_USERNAME || 'admin';
    const validPassword = process.env.ADMIN_PASSWORD || 'password123';

    if (username !== validUsername || password !== validPassword) {
      return next(new AuthenticationError('Invalid credentials'));
    }

    next();
  } catch (error) {
    next(new AuthenticationError('Invalid authentication format'));
  }
};

/**
 * CORS preflight handler
 */
const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Twilio-Signature');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    return res.sendStatus(200);
  }
  next();
};

/**
 * Request size limiter
 */
const limitRequestSize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      logger.warn(`[SECURITY] Request too large: ${contentLength} bytes from ${req.ip}`);
      return next(new ValidationError(`Request too large. Maximum size: ${maxSize}`));
    }

    next();
  };
};

/**
 * Parse size string to bytes
 */
const parseSize = (size) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
  
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
};

module.exports = {
  generalRateLimiter,
  strictRateLimiter,
  webhookRateLimiter,
  configureHelmet,
  validateTwilioSignature,
  securityLogger,
  basicAuth,
  handlePreflight,
  limitRequestSize
};