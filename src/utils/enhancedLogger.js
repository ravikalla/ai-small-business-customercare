/**
 * Comprehensive Logging System
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EnhancedLogger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logDir = path.join(process.cwd(), 'logs');
    this.logLevel = process.env.LOG_LEVEL || (this.isProduction ? 'info' : 'debug');
    this.enableFileLogging = process.env.ENABLE_FILE_LOGGING !== 'false';
    this.enableStructuredLogging = process.env.ENABLE_STRUCTURED_LOGGING === 'true';
    this.maxLogFileSize = parseInt(process.env.MAX_LOG_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default
    this.maxLogFiles = parseInt(process.env.MAX_LOG_FILES) || 5;

    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      success: 2,
      debug: 3,
      trace: 4,
    };

    this.logFiles = {
      app: path.join(this.logDir, 'app.log'),
      error: path.join(this.logDir, 'error.log'),
      access: path.join(this.logDir, 'access.log'),
      security: path.join(this.logDir, 'security.log'),
      performance: path.join(this.logDir, 'performance.log'),
    };

    this.currentRequestId = null;
    this.requestStartTimes = new Map();
    this.metrics = {
      logCounts: {
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
        trace: 0,
      },
      totalLogs: 0,
      errorRate: 0,
      lastLogTime: null,
    };

    this.ensureLogDirectory();
    this.startMetricsCollection();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  shouldLog(level) {
    const currentLevelValue = this.logLevels[this.logLevel] || 2;
    const messageLevelValue = this.logLevels[level] || 2;
    return messageLevelValue <= currentLevelValue;
  }

  generateRequestId() {
    return crypto.randomBytes(8).toString('hex');
  }

  setRequestId(requestId) {
    this.currentRequestId = requestId;
  }

  startRequest(requestId, method, url, userAgent = null) {
    if (!requestId) {
      requestId = this.generateRequestId();
    }
    this.setRequestId(requestId);
    this.requestStartTimes.set(requestId, Date.now());

    if (this.enableStructuredLogging) {
      this.logStructured('info', 'request_start', {
        requestId,
        method,
        url,
        userAgent,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.info(`[REQUEST] Started ${method} ${url}`, { requestId, userAgent });
    }

    return requestId;
  }

  endRequest(requestId, statusCode, responseSize = 0) {
    const startTime = this.requestStartTimes.get(requestId);
    let duration = 0;

    if (startTime) {
      duration = Date.now() - startTime;
      this.requestStartTimes.delete(requestId);
    }

    const logData = {
      requestId,
      statusCode,
      duration,
      responseSize,
      timestamp: new Date().toISOString(),
    };

    if (this.enableStructuredLogging) {
      this.logStructured('info', 'request_end', logData);
    } else {
      this.info(`[REQUEST] Completed ${statusCode} in ${duration}ms`, logData);
    }

    // Log to access log file
    this.writeToFile(
      'access',
      `${new Date().toISOString()} ${requestId} ${statusCode} ${duration}ms ${responseSize}b`
    );

    return duration;
  }

  formatMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const requestId = this.currentRequestId || metadata.requestId || '-';

    if (this.enableStructuredLogging) {
      return JSON.stringify({
        timestamp,
        level: level.toUpperCase(),
        message,
        requestId,
        metadata,
        environment: process.env.NODE_ENV || 'development',
        service: 'small-business-chatbot',
      });
    }
    const metadataStr =
      Object.keys(metadata).length > 0 ? ' ' + JSON.stringify(metadata, null, 0) : '';
    return `${timestamp} [${level.toUpperCase()}] [${requestId}] ${message}${metadataStr}`;
  }

  logStructured(level, event, data = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      event,
      requestId: this.currentRequestId || data.requestId || '-',
      data,
      environment: process.env.NODE_ENV || 'development',
      service: 'small-business-chatbot',
    };

    const logMessage = JSON.stringify(logEntry);
    this.outputLog(level, logMessage);
    this.updateMetrics(level);
  }

  writeToFile(logType, message) {
    if (!this.enableFileLogging) {
      return;
    }

    try {
      const logFile = this.logFiles[logType] || this.logFiles.app;

      // Check file size and rotate if necessary
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > this.maxLogFileSize) {
          this.rotateLogFile(logFile);
        }
      }

      fs.appendFileSync(logFile, message + '\n');
    } catch (error) {
      console.error(`Failed to write to ${logType} log:`, error.message);
    }
  }

  rotateLogFile(logFile) {
    try {
      const ext = path.extname(logFile);
      const base = path.basename(logFile, ext);
      const dir = path.dirname(logFile);

      // Rotate existing files
      for (let i = this.maxLogFiles - 1; i >= 1; i--) {
        const oldFile = path.join(dir, `${base}.${i}${ext}`);
        const newFile = path.join(dir, `${base}.${i + 1}${ext}`);

        if (fs.existsSync(oldFile)) {
          if (i === this.maxLogFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest file
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Rotate current file
      const rotatedFile = path.join(dir, `${base}.1${ext}`);
      fs.renameSync(logFile, rotatedFile);
    } catch (error) {
      console.error('Failed to rotate log file:', error.message);
    }
  }

  outputLog(level, message) {
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](message);

    this.writeToFile('app', message);

    // Write errors to separate error log
    if (level === 'error') {
      this.writeToFile('error', message);
    }
  }

  updateMetrics(level) {
    this.metrics.logCounts[level] = (this.metrics.logCounts[level] || 0) + 1;
    this.metrics.totalLogs++;
    this.metrics.lastLogTime = new Date().toISOString();

    // Calculate error rate
    const errorCount = this.metrics.logCounts.error || 0;
    this.metrics.errorRate =
      this.metrics.totalLogs > 0 ? ((errorCount / this.metrics.totalLogs) * 100).toFixed(2) : 0;
  }

  startMetricsCollection() {
    // Log metrics every 5 minutes in production
    if (this.isProduction) {
      setInterval(
        () => {
          this.logStructured('info', 'metrics_report', this.metrics);
        },
        5 * 60 * 1000
      );
    }
  }

  // Standard logging methods
  error(message, metadata = {}) {
    if (!this.shouldLog('error')) {
      return;
    }
    const logMessage = this.formatMessage('error', message, metadata);
    this.outputLog('error', logMessage);
    this.updateMetrics('error');
  }

  warn(message, metadata = {}) {
    if (!this.shouldLog('warn')) {
      return;
    }
    const logMessage = this.formatMessage('warn', message, metadata);
    this.outputLog('warn', logMessage);
    this.updateMetrics('warn');
  }

  info(message, metadata = {}) {
    if (!this.shouldLog('info')) {
      return;
    }
    const logMessage = this.formatMessage('info', message, metadata);
    this.outputLog('info', logMessage);
    this.updateMetrics('info');
  }

  debug(message, metadata = {}) {
    if (!this.shouldLog('debug')) {
      return;
    }
    const logMessage = this.formatMessage('debug', message, metadata);
    this.outputLog('debug', logMessage);
    this.updateMetrics('debug');
  }

  trace(message, metadata = {}) {
    if (!this.shouldLog('trace')) {
      return;
    }
    const logMessage = this.formatMessage('trace', message, metadata);
    this.outputLog('trace', logMessage);
    this.updateMetrics('trace');
  }

  success(message, metadata = {}) {
    if (!this.shouldLog('success')) {
      return;
    }
    const logMessage = this.formatMessage('success', message, metadata);
    this.outputLog('success', logMessage);
    this.updateMetrics('info'); // Count as info for metrics
  }

  // Specialized logging methods
  security(event, metadata = {}) {
    const message = `Security Event: ${event}`;
    const logMessage = this.formatMessage('warn', message, metadata);
    this.outputLog('warn', logMessage);
    this.writeToFile('security', logMessage);
    this.updateMetrics('warn');
  }

  performance(operation, duration, metadata = {}) {
    const message = `Performance: ${operation} completed in ${duration}ms`;
    const logMessage = this.formatMessage('info', message, { duration, ...metadata });
    this.outputLog('info', logMessage);
    this.writeToFile('performance', logMessage);
    this.updateMetrics('info');
  }

  webhook(message, metadata = {}) {
    this.info(`[WEBHOOK] ${message}`, metadata);
  }

  ai(message, metadata = {}) {
    this.info(`[AI] ${message}`, metadata);
  }

  twilio(message, metadata = {}) {
    this.info(`[TWILIO] ${message}`, metadata);
  }

  business(message, metadata = {}) {
    this.info(`[BUSINESS] ${message}`, metadata);
  }

  database(message, metadata = {}) {
    this.info(`[DATABASE] ${message}`, metadata);
  }

  // Utility methods
  getMetrics() {
    return {
      ...this.metrics,
      activeRequests: this.requestStartTimes.size,
      logLevel: this.logLevel,
      structuredLogging: this.enableStructuredLogging,
      fileLogging: this.enableFileLogging,
    };
  }

  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.logLevel = level;
      this.info(`Log level changed to ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  clearMetrics() {
    this.metrics = {
      logCounts: {
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
        trace: 0,
      },
      totalLogs: 0,
      errorRate: 0,
      lastLogTime: null,
    };
    this.info('Logging metrics cleared');
  }
}

// Create a singleton instance
const logger = new EnhancedLogger();

module.exports = logger;
