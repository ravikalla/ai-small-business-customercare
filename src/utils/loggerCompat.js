/**
 * Logger Compatibility Layer
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 *
 * This module provides backward compatibility with the existing logger interface
 * while delegating to the enhanced logger for improved functionality.
 */

const enhancedLogger = require('./enhancedLogger');

// Backward compatibility wrapper that maintains the static method interface
class Logger {
  static formatMessage(level, message, ...args) {
    // Convert old format to new metadata format
    const metadata = {};
    if (args.length > 0) {
      metadata.additionalData = args;
    }
    return enhancedLogger.formatMessage(level, message, metadata);
  }

  static writeToFile(logMessage) {
    // This is handled automatically by the enhanced logger
    return enhancedLogger.writeToFile('app', logMessage);
  }

  static info(message, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.info(message, metadata);
  }

  static error(message, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.error(message, metadata);
  }

  static warn(message, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.warn(message, metadata);
  }

  static debug(message, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.debug(message, metadata);
  }

  static success(message, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.success(message, metadata);
  }

  static webhook(message, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.webhook(message, metadata);
  }

  static ai(message, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.ai(message, metadata);
  }

  static twilio(message, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.twilio(message, metadata);
  }

  // Additional methods from enhanced logger
  static trace(message, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.trace(message, metadata);
  }

  static security(event, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.security(event, metadata);
  }

  static performance(operation, duration, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.performance(operation, duration, metadata);
  }

  static business(message, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.business(message, metadata);
  }

  static database(message, ...args) {
    const metadata = args.length > 0 ? { additionalData: args } : {};
    enhancedLogger.database(message, metadata);
  }

  // Utility methods
  static getMetrics() {
    return enhancedLogger.getMetrics();
  }

  static setLogLevel(level) {
    return enhancedLogger.setLogLevel(level);
  }

  static clearMetrics() {
    return enhancedLogger.clearMetrics();
  }

  static generateRequestId() {
    return enhancedLogger.generateRequestId();
  }

  static setRequestId(requestId) {
    return enhancedLogger.setRequestId(requestId);
  }

  static startRequest(requestId, method, url, userAgent) {
    return enhancedLogger.startRequest(requestId, method, url, userAgent);
  }

  static endRequest(requestId, statusCode, responseSize) {
    return enhancedLogger.endRequest(requestId, statusCode, responseSize);
  }
}

module.exports = Logger;
