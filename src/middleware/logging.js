/**
 * Logging Middleware
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const logger = require('../utils/enhancedLogger');

/**
 * Request logging middleware
 * Tracks request lifecycle and performance
 */
function requestLogging(req, res, next) {
  // Generate or extract request ID
  const requestId = req.headers['x-request-id'] || logger.generateRequestId();

  // Add request ID to request object
  req.requestId = requestId;

  // Set request ID in logger context
  logger.setRequestId(requestId);

  // Extract client information
  const clientIp =
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  const userAgent = req.headers['user-agent'];
  const referer = req.headers.referer || req.headers.referrer;

  // Start request tracking
  logger.startRequest(requestId, req.method, req.originalUrl, userAgent);

  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  let responseBody = null;
  let responseSize = 0;

  // Override response methods to capture response data
  res.send = function (body) {
    responseBody = body;
    responseSize = Buffer.byteLength(body || '', 'utf8');
    return originalSend.call(this, body);
  };

  res.json = function (obj) {
    responseBody = obj;
    const jsonString = JSON.stringify(obj);
    responseSize = Buffer.byteLength(jsonString, 'utf8');
    return originalJson.call(this, obj);
  };

  res.end = function (chunk, encoding) {
    if (chunk) {
      responseSize = Buffer.byteLength(chunk, encoding || 'utf8');
    }
    return originalEnd.call(this, chunk, encoding);
  };

  // Log when response finishes
  res.on('finish', () => {
    const duration = logger.endRequest(requestId, res.statusCode, responseSize);

    // Log additional request details
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      responseSize,
      clientIp,
      userAgent,
      referer,
      contentType: res.get('Content-Type'),
    });

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        duration,
        threshold: '1000ms',
      });
    }

    // Log errors
    if (res.statusCode >= 400) {
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';
      logger[logLevel]('Request failed', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        clientIp,
      });
    }
  });

  // Log when response is closed (client disconnected)
  res.on('close', () => {
    if (!res.finished) {
      logger.warn('Request closed by client', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        clientIp,
      });
    }
  });

  next();
}

/**
 * Error logging middleware
 * Logs unhandled errors with full context
 */
function errorLogging(err, req, res, next) {
  const requestId = req.requestId || 'unknown';

  logger.error('Unhandled error in request', {
    requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
    },
    user: req.user ? { id: req.user.id, email: req.user.email } : null,
  });

  next(err);
}

/**
 * Security event logging middleware
 * Logs security-related events
 */
function securityLogging(req, res, next) {
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Log suspicious activity
  const suspiciousPatterns = [
    /\/\.\.+\//, // Directory traversal
    /script>/i, // XSS attempts
    /union.*select/i, // SQL injection
    /\bOR\b.*\b=\b.*\bOR\b/i, // SQL injection
  ];

  const url = req.originalUrl;
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));

  if (isSuspicious) {
    logger.security('Suspicious request detected', {
      requestId: req.requestId,
      clientIp,
      url,
      userAgent: req.headers['user-agent'],
      method: req.method,
    });
  }

  // Log authentication attempts
  if (req.originalUrl.includes('/auth') || req.headers.authorization) {
    logger.security('Authentication attempt', {
      requestId: req.requestId,
      clientIp,
      url: req.originalUrl,
      hasAuth: Boolean(req.headers.authorization),
      authType: req.headers.authorization ? req.headers.authorization.split(' ')[0] : null,
    });
  }

  // Log admin access attempts
  if (req.originalUrl.includes('/admin')) {
    logger.security('Admin access attempt', {
      requestId: req.requestId,
      clientIp,
      url: req.originalUrl,
      userAgent: req.headers['user-agent'],
    });
  }

  next();
}

/**
 * Performance logging wrapper
 * Wraps functions to log performance metrics
 */
function performanceLogging(operationName, fn) {
  return async function (...args) {
    const startTime = Date.now();
    try {
      const result = await fn.apply(this, args);
      const duration = Date.now() - startTime;

      logger.performance(operationName, duration, {
        success: true,
        arguments: args.length,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.performance(operationName, duration, {
        success: false,
        error: error.message,
        arguments: args.length,
      });

      throw error;
    }
  };
}

/**
 * Database query logging
 */
function logDatabaseQuery(query, params, duration, error = null) {
  const logData = {
    query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
    paramCount: params ? params.length : 0,
    duration,
    success: !error,
  };

  if (error) {
    logData.error = {
      message: error.message,
      code: error.code,
    };
    logger.error('Database query failed', logData);
  } else {
    logger.database('Database query executed', logData);

    // Log slow queries
    if (duration > 1000) {
      logger.warn('Slow database query', logData);
    }
  }
}

/**
 * API rate limiting logging
 */
function logRateLimitHit(req, limit, remaining, resetTime) {
  logger.warn('Rate limit hit', {
    requestId: req.requestId,
    clientIp: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    url: req.originalUrl,
    limit,
    remaining,
    resetTime: new Date(resetTime).toISOString(),
  });
}

module.exports = {
  requestLogging,
  errorLogging,
  securityLogging,
  performanceLogging,
  logDatabaseQuery,
  logRateLimitHit,
};
