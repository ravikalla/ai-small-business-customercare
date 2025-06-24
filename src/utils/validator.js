/**
 * Input Validation and Sanitization
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const logger = require('./logger');

class Validator {
  static sanitizeText(text, maxLength = 5000) {
    if (typeof text !== 'string') {
      return '';
    }

    // Remove null bytes and control characters except newlines/tabs
    let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
      logger.warn(`[VALIDATOR] Text truncated from ${text.length} to ${maxLength} characters`);
    }

    return sanitized;
  }

  static validateBusinessName(name) {
    const sanitized = this.sanitizeText(name, 100);

    if (!sanitized) {
      return { valid: false, error: 'Business name is required' };
    }

    if (sanitized.length < 2) {
      return { valid: false, error: 'Business name must be at least 2 characters' };
    }

    if (sanitized.length > 100) {
      return { valid: false, error: 'Business name must be less than 100 characters' };
    }

    // Check for valid characters (letters, numbers, spaces, common punctuation)
    if (!/^[a-zA-Z0-9\s\-_&.,!()]+$/.test(sanitized)) {
      return { valid: false, error: 'Business name contains invalid characters' };
    }

    return { valid: true, sanitized };
  }

  static validateKnowledgeContent(content) {
    const sanitized = this.sanitizeText(content, 10000);

    if (!sanitized) {
      return { valid: false, error: 'Knowledge content is required' };
    }

    if (sanitized.length < 5) {
      return { valid: false, error: 'Knowledge content must be at least 5 characters' };
    }

    if (sanitized.length > 10000) {
      return { valid: false, error: 'Knowledge content must be less than 10,000 characters' };
    }

    return { valid: true, sanitized };
  }

  static validateQuery(query) {
    const sanitized = this.sanitizeText(query, 500);

    if (!sanitized) {
      return { valid: false, error: 'Query is required' };
    }

    if (sanitized.length < 3) {
      return { valid: false, error: 'Query must be at least 3 characters' };
    }

    if (sanitized.length > 500) {
      return { valid: false, error: 'Query must be less than 500 characters' };
    }

    return { valid: true, sanitized };
  }

  static validateBusinessId(businessId) {
    if (typeof businessId !== 'string') {
      return { valid: false, error: 'Business ID must be a string' };
    }

    const sanitized = businessId.trim();

    if (!sanitized) {
      return { valid: false, error: 'Business ID is required' };
    }

    // Business ID format: letters/numbers/underscore, 5-50 chars
    if (!/^[a-zA-Z0-9_]+$/.test(sanitized)) {
      return { valid: false, error: 'Business ID contains invalid characters' };
    }

    if (sanitized.length < 5 || sanitized.length > 50) {
      return { valid: false, error: 'Business ID must be 5-50 characters' };
    }

    return { valid: true, sanitized };
  }

  static validateKnowledgeId(knowledgeId) {
    if (typeof knowledgeId !== 'string') {
      return { valid: false, error: 'Knowledge ID must be a string' };
    }

    const sanitized = knowledgeId.trim();

    if (!sanitized) {
      return { valid: false, error: 'Knowledge ID is required' };
    }

    // Knowledge ID format: kb_businessId_timestamp_random
    if (!/^kb_[a-zA-Z0-9_]+$/.test(sanitized)) {
      return { valid: false, error: 'Invalid knowledge ID format' };
    }

    return { valid: true, sanitized };
  }

  static validatePhoneNumber(phoneNumber) {
    if (typeof phoneNumber !== 'string') {
      return { valid: false, error: 'Phone number must be a string' };
    }

    // Remove all non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');

    if (!cleaned) {
      return { valid: false, error: 'Phone number is required' };
    }

    // Basic length validation (7-15 digits for international numbers)
    if (cleaned.length < 7 || cleaned.length > 15) {
      return { valid: false, error: 'Invalid phone number length' };
    }

    return { valid: true, sanitized: cleaned };
  }

  static validateFileName(filename) {
    if (typeof filename !== 'string') {
      return { valid: false, error: 'Filename must be a string' };
    }

    const sanitized = filename.trim();

    if (!sanitized) {
      return { valid: false, error: 'Filename is required' };
    }

    // Remove path traversal attempts
    if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
      return { valid: false, error: 'Filename contains invalid path characters' };
    }

    // Check for valid filename characters
    if (!/^[a-zA-Z0-9\-_.()\s]+$/.test(sanitized)) {
      return { valid: false, error: 'Filename contains invalid characters' };
    }

    if (sanitized.length > 255) {
      return { valid: false, error: 'Filename too long' };
    }

    return { valid: true, sanitized };
  }

  static validateFileType(filename, allowedTypes = ['.pdf', '.txt', '.doc', '.docx']) {
    const validation = this.validateFileName(filename);
    if (!validation.valid) {
      return validation;
    }

    const sanitized = validation.sanitized;
    const extension = sanitized.toLowerCase().substring(sanitized.lastIndexOf('.'));

    if (!allowedTypes.includes(extension)) {
      return {
        valid: false,
        error: `File type ${extension} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }

    return { valid: true, sanitized, extension };
  }

  static validateFileSize(size, maxSizeBytes = 10 * 1024 * 1024) {
    // 10MB default
    if (typeof size !== 'number' || size < 0) {
      return { valid: false, error: 'Invalid file size' };
    }

    if (size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    if (size > maxSizeBytes) {
      const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
      return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
    }

    return { valid: true };
  }

  static sanitizeForLog(text, maxLength = 100) {
    if (typeof text !== 'string') {
      return String(text);
    }

    // Remove sensitive patterns that might be in logs
    let sanitized = text
      .replace(/sk-[a-zA-Z0-9]{48}/g, 'sk-***REDACTED***') // OpenAI keys
      .replace(/pcsk_[a-zA-Z0-9_]{48}/g, 'pcsk_***REDACTED***') // Pinecone keys
      .replace(/\b\d{10,15}\b/g, '***PHONE***'); // Phone numbers

    // Truncate for logs
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }

    return sanitized;
  }

  static detectSuspiciousContent(text) {
    const suspiciousPatterns = [
      /javascript:/i,
      /<script/i,
      /on\w+\s*=/i, // Event handlers
      /data:text\/html/i,
      /vbscript:/i,
      /\bexec\b/i,
      /\beval\b/i,
      /\.\.\//, // Path traversal
      /\$\{.*\}/, // Template injection
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        logger.warn(`[VALIDATOR] Suspicious content detected: ${this.sanitizeForLog(text)}`);
        return true;
      }
    }

    return false;
  }

  static validateAndSanitize(type, value, options = {}) {
    switch (type) {
      case 'businessName':
        return this.validateBusinessName(value);

      case 'knowledgeContent':
        return this.validateKnowledgeContent(value);

      case 'query':
        return this.validateQuery(value);

      case 'businessId':
        return this.validateBusinessId(value);

      case 'knowledgeId':
        return this.validateKnowledgeId(value);

      case 'phoneNumber':
        return this.validatePhoneNumber(value);

      case 'fileName':
        return this.validateFileName(value);

      case 'fileType':
        return this.validateFileType(value, options.allowedTypes);

      case 'fileSize':
        return this.validateFileSize(value, options.maxSize);

      default:
        return { valid: false, error: `Unknown validation type: ${type}` };
    }
  }
}

module.exports = Validator;
