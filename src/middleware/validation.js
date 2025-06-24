/**
 * Validation Middleware
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const { ValidationError } = require('../errors/AppError');

/**
 * Validate required fields in request body
 */
const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!req.body[field] || req.body[field] === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      return next(new ValidationError(message, missingFields[0]));
    }
    
    next();
  };
};

/**
 * Validate business ID format
 */
const validateBusinessId = (req, res, next) => {
  const { businessId } = req.params || req.body;
  
  if (!businessId) {
    return next(new ValidationError('Business ID is required', 'businessId'));
  }
  
  // Business ID should be alphanumeric with underscores, 3-50 characters
  const businessIdRegex = /^[a-zA-Z0-9_]{3,50}$/;
  if (!businessIdRegex.test(businessId)) {
    return next(new ValidationError(
      'Business ID must be 3-50 characters long and contain only letters, numbers, and underscores',
      'businessId',
      businessId
    ));
  }
  
  next();
};

/**
 * Validate WhatsApp phone number format
 */
const validateWhatsAppNumber = (req, res, next) => {
  const { whatsappNumber } = req.body;
  
  if (!whatsappNumber) {
    return next(new ValidationError('WhatsApp number is required', 'whatsappNumber'));
  }
  
  // WhatsApp number should start with whatsapp: and have valid phone format
  const whatsappRegex = /^whatsapp:\+[1-9]\d{10,14}$/;
  if (!whatsappRegex.test(whatsappNumber)) {
    return next(new ValidationError(
      'Invalid WhatsApp number format. Expected format: whatsapp:+1234567890',
      'whatsappNumber',
      whatsappNumber
    ));
  }
  
  next();
};

/**
 * Validate phone number format
 */
const validatePhoneNumber = (req, res, next) => {
  const { ownerPhone } = req.body;
  
  if (!ownerPhone) {
    return next(new ValidationError('Owner phone number is required', 'ownerPhone'));
  }
  
  // Phone number should start with + and have 10-15 digits
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  if (!phoneRegex.test(ownerPhone)) {
    return next(new ValidationError(
      'Invalid phone number format. Expected format: +1234567890',
      'ownerPhone',
      ownerPhone
    ));
  }
  
  next();
};

/**
 * Validate business name
 */
const validateBusinessName = (req, res, next) => {
  const { businessName } = req.body;
  
  if (!businessName) {
    return next(new ValidationError('Business name is required', 'businessName'));
  }
  
  // Business name should be 2-100 characters
  if (businessName.length < 2 || businessName.length > 100) {
    return next(new ValidationError(
      'Business name must be between 2 and 100 characters',
      'businessName',
      businessName
    ));
  }
  
  // Check for potentially harmful content
  const forbiddenPatterns = /<script|javascript:|data:/i;
  if (forbiddenPatterns.test(businessName)) {
    return next(new ValidationError(
      'Business name contains invalid characters',
      'businessName',
      businessName
    ));
  }
  
  next();
};

/**
 * Validate knowledge content
 */
const validateKnowledgeContent = (req, res, next) => {
  const { content } = req.body;
  
  if (!content) {
    return next(new ValidationError('Knowledge content is required', 'content'));
  }
  
  // Content should be 10-5000 characters
  if (content.length < 10 || content.length > 5000) {
    return next(new ValidationError(
      'Knowledge content must be between 10 and 5000 characters',
      'content',
      content
    ));
  }
  
  next();
};

/**
 * Validate query parameters
 */
const validateQueryParams = (allowedParams) => {
  return (req, res, next) => {
    const invalidParams = Object.keys(req.query).filter(
      param => !allowedParams.includes(param)
    );
    
    if (invalidParams.length > 0) {
      return next(new ValidationError(
        `Invalid query parameters: ${invalidParams.join(', ')}. Allowed: ${allowedParams.join(', ')}`,
        'query'
      ));
    }
    
    next();
  };
};

/**
 * Sanitize input data
 */
const sanitizeInput = (req, res, next) => {
  // Remove potentially dangerous HTML tags and scripts
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

module.exports = {
  validateRequiredFields,
  validateBusinessId,
  validateWhatsAppNumber,
  validatePhoneNumber,
  validateBusinessName,
  validateKnowledgeContent,
  validateQueryParams,
  sanitizeInput
};