/**
 * Custom Application Error Classes
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Capture stack trace excluding the constructor call
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

/**
 * Validation error for invalid input data
 */
class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, 400);
    this.field = field;
    this.value = value;
    this.type = 'validation_error';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      type: this.type,
      field: this.field,
      value: this.value,
    };
  }
}

/**
 * Resource not found error
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = null) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(message, 404);
    this.resource = resource;
    this.resourceId = id;
    this.type = 'not_found_error';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      type: this.type,
      resource: this.resource,
      resourceId: this.resourceId,
    };
  }
}

/**
 * Authentication error
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.type = 'authentication_error';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      type: this.type,
    };
  }
}

/**
 * Authorization error
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.type = 'authorization_error';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      type: this.type,
    };
  }
}

/**
 * External service error (Twilio, OpenAI, Pinecone, etc.)
 */
class ExternalServiceError extends AppError {
  constructor(service, message, originalError = null) {
    super(`${service} service error: ${message}`, 503);
    this.service = service;
    this.originalError = originalError;
    this.type = 'external_service_error';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      type: this.type,
      service: this.service,
      ...(process.env.NODE_ENV === 'development' &&
        this.originalError && {
          originalError: this.originalError.message,
        }),
    };
  }
}

/**
 * Rate limiting error
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429);
    this.type = 'rate_limit_error';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      type: this.type,
    };
  }
}

/**
 * Database operation error
 */
class DatabaseError extends AppError {
  constructor(operation, message, originalError = null) {
    super(`Database ${operation} failed: ${message}`, 500);
    this.operation = operation;
    this.originalError = originalError;
    this.type = 'database_error';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      type: this.type,
      operation: this.operation,
      ...(process.env.NODE_ENV === 'development' &&
        this.originalError && {
          originalError: this.originalError.message,
        }),
    };
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ExternalServiceError,
  RateLimitError,
  DatabaseError,
};
