/**
 * Global Error Handling Middleware
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const logger = require('../utils/logger');
const { AppError } = require('../errors/AppError');

/**
 * Global error handling middleware
 * Handles all errors in the application and sends appropriate responses
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log the error with context
  logError(err, req);

  // Handle operational errors (known errors)
  if (err instanceof AppError && err.isOperational) {
    return sendErrorResponse(res, err);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    const validationError = handleValidationError(err);
    return sendErrorResponse(res, validationError);
  }

  if (err.name === 'CastError') {
    const castError = handleCastError(err);
    return sendErrorResponse(res, castError);
  }

  if (err.code === 11000) {
    const duplicateError = handleDuplicateFieldError(err);
    return sendErrorResponse(res, duplicateError);
  }

  if (err.name === 'JsonWebTokenError') {
    const jwtError = handleJWTError(err);
    return sendErrorResponse(res, jwtError);
  }

  if (err.name === 'TokenExpiredError') {
    const expiredError = handleJWTExpiredError(err);
    return sendErrorResponse(res, expiredError);
  }

  // Handle unknown/programming errors
  const unknownError = handleUnknownError(err);
  return sendErrorResponse(res, unknownError);
};

/**
 * Log error with context information
 */
const logError = (err, req) => {
  const errorContext = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query,
  };

  if (err instanceof AppError && err.isOperational) {
    logger.warn('[ERROR] Operational error occurred:', errorContext);
  } else {
    logger.error('[ERROR] Programming error occurred:', errorContext);
  }
};

/**
 * Send error response to client
 */
const sendErrorResponse = (res, err) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Ensure error is an AppError instance
  if (!(err instanceof AppError)) {
    err = new AppError('Internal server error', 500, false);
  }

  const response = {
    success: false,
    error: {
      message: err.message,
      type: err.type || 'unknown_error',
      statusCode: err.statusCode,
      timestamp: err.timestamp,
    },
  };

  // Add development-only information
  if (isDevelopment) {
    response.error.stack = err.stack;

    if (err.field) {
      response.error.field = err.field;
    }
    if (err.value) {
      response.error.value = err.value;
    }
    if (err.resource) {
      response.error.resource = err.resource;
    }
    if (err.resourceId) {
      response.error.resourceId = err.resourceId;
    }
    if (err.service) {
      response.error.service = err.service;
    }
    if (err.operation) {
      response.error.operation = err.operation;
    }
  }

  // Set appropriate status code
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json(response);
};

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = err => {
  const { ValidationError } = require('../errors/AppError');
  const errors = Object.values(err.errors).map(val => val.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new ValidationError(message);
};

/**
 * Handle Mongoose cast errors (invalid ObjectId, etc.)
 */
const handleCastError = err => {
  const { ValidationError } = require('../errors/AppError');
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ValidationError(message, err.path, err.value);
};

/**
 * Handle duplicate field errors
 */
const handleDuplicateFieldError = err => {
  const { ValidationError } = require('../errors/AppError');
  const value = err.keyValue ? Object.values(err.keyValue)[0] : 'unknown';
  const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'unknown';
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new ValidationError(message, field, value);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  const { AuthenticationError } = require('../errors/AppError');
  return new AuthenticationError('Invalid token. Please log in again!');
};

/**
 * Handle JWT expired errors
 */
const handleJWTExpiredError = () => {
  const { AuthenticationError } = require('../errors/AppError');
  return new AuthenticationError('Your token has expired! Please log in again.');
};

/**
 * Handle unknown/programming errors
 */
const handleUnknownError = err => {
  logger.error('[CRITICAL] Unknown error occurred:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message;

  return new AppError(message, 500, false);
};

/**
 * Catch async errors middleware
 * Wraps async route handlers to catch errors and pass them to error handling middleware
 */
const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle 404 errors for undefined routes
 */
const handleNotFound = (req, res, next) => {
  const { NotFoundError } = require('../errors/AppError');
  const err = new NotFoundError(`Route ${req.originalUrl}`, req.method);
  next(err);
};

module.exports = {
  globalErrorHandler,
  catchAsync,
  handleNotFound,
  logError,
  sendErrorResponse,
};
