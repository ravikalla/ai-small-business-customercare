/**
 * Performance Monitoring Middleware
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const logger = require('../utils/logger');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byRoute: {},
        byStatusCode: {},
        errors: 0
      },
      response_times: {
        avg: 0,
        min: Infinity,
        max: 0,
        p95: 0,
        p99: 0,
        samples: []
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      },
      cpu: {
        usage: 0,
        loadAverage: []
      }
    };

    this.startTime = Date.now();
    this.requestHistory = [];
    
    // Start periodic memory and CPU monitoring
    this.startSystemMonitoring();
  }

  // Middleware for request performance tracking
  trackRequest() {
    return (req, res, next) => {
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage();

      // Track request start
      req.performanceData = {
        startTime,
        startMemory,
        requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Override res.end to capture completion metrics
      const originalEnd = res.end;
      res.end = (...args) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds
        const endMemory = process.memoryUsage();

        // Update metrics
        this.updateRequestMetrics(req, res, duration, startMemory, endMemory);

        // Call original end
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  updateRequestMetrics(req, res, duration, startMemory, endMemory) {
    const { method, route, originalUrl } = req;
    const { statusCode } = res;
    const routePath = route?.path || originalUrl;

    // Update request counts
    this.metrics.requests.total++;
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
    this.metrics.requests.byRoute[routePath] = (this.metrics.requests.byRoute[routePath] || 0) + 1;
    this.metrics.requests.byStatusCode[statusCode] = (this.metrics.requests.byStatusCode[statusCode] || 0) + 1;

    if (statusCode >= 400) {
      this.metrics.requests.errors++;
    }

    // Update response time metrics
    this.updateResponseTimeMetrics(duration);

    // Track memory usage difference
    const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;

    // Store request data for analysis
    const requestData = {
      timestamp: Date.now(),
      method,
      route: routePath,
      statusCode,
      duration,
      memoryDiff,
      requestId: req.performanceData.requestId
    };

    this.requestHistory.push(requestData);

    // Keep only last 1000 requests in memory
    if (this.requestHistory.length > 1000) {
      this.requestHistory.shift();
    }

    // Log slow requests
    if (duration > 1000) { // Log requests taking more than 1 second
      logger.warn('[PERFORMANCE] Slow request detected', {
        requestId: req.performanceData.requestId,
        method,
        route: routePath,
        duration: `${duration.toFixed(2)}ms`,
        statusCode,
        memoryDiff: `${(memoryDiff / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }

  updateResponseTimeMetrics(duration) {
    this.metrics.response_times.samples.push(duration);

    // Keep only last 1000 samples for percentile calculations
    if (this.metrics.response_times.samples.length > 1000) {
      this.metrics.response_times.samples.shift();
    }

    // Update min/max
    this.metrics.response_times.min = Math.min(this.metrics.response_times.min, duration);
    this.metrics.response_times.max = Math.max(this.metrics.response_times.max, duration);

    // Calculate average
    const samples = this.metrics.response_times.samples;
    this.metrics.response_times.avg = samples.reduce((sum, time) => sum + time, 0) / samples.length;

    // Calculate percentiles
    if (samples.length > 0) {
      const sorted = [...samples].sort((a, b) => a - b);
      this.metrics.response_times.p95 = this.calculatePercentile(sorted, 0.95);
      this.metrics.response_times.p99 = this.calculatePercentile(sorted, 0.99);
    }
  }

  calculatePercentile(sortedArray, percentile) {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[index] || 0;
  }

  startSystemMonitoring() {
    // Monitor system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);

    // Initial capture
    this.updateSystemMetrics();
  }

  updateSystemMetrics() {
    // Memory metrics
    const memUsage = process.memoryUsage();
    this.metrics.memory = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    };

    // CPU metrics
    const cpuUsage = process.cpuUsage();
    this.metrics.cpu = {
      usage: cpuUsage,
      loadAverage: require('os').loadavg()
    };

    // Log memory warnings
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    if (memoryUsagePercent > 85) {
      logger.warn('[PERFORMANCE] High memory usage detected', {
        heapUsed: `${heapUsedMB.toFixed(2)}MB`,
        heapTotal: `${heapTotalMB.toFixed(2)}MB`,
        usagePercent: `${memoryUsagePercent.toFixed(2)}%`
      });
    }
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    
    return {
      uptime: {
        milliseconds: uptime,
        readable: this.formatUptime(uptime)
      },
      requests: this.metrics.requests,
      response_times: {
        avg: Math.round(this.metrics.response_times.avg * 100) / 100,
        min: Math.round(this.metrics.response_times.min * 100) / 100,
        max: Math.round(this.metrics.response_times.max * 100) / 100,
        p95: Math.round(this.metrics.response_times.p95 * 100) / 100,
        p99: Math.round(this.metrics.response_times.p99 * 100) / 100
      },
      memory: {
        heapUsed: `${(this.metrics.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(this.metrics.memory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(this.metrics.memory.external / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(this.metrics.memory.rss / 1024 / 1024).toFixed(2)}MB`
      },
      cpu: this.metrics.cpu,
      requestsPerSecond: this.calculateRequestsPerSecond(),
      errorRate: this.calculateErrorRate(),
      timestamp: new Date().toISOString()
    };
  }

  calculateRequestsPerSecond() {
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    return uptimeSeconds > 0 ? (this.metrics.requests.total / uptimeSeconds).toFixed(2) : 0;
  }

  calculateErrorRate() {
    const total = this.metrics.requests.total;
    return total > 0 ? ((this.metrics.requests.errors / total) * 100).toFixed(2) : 0;
  }

  getSlowRequests(limit = 10) {
    return this.requestHistory
      .filter(req => req.duration > 500) // Requests taking more than 500ms
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(req => ({
        ...req,
        duration: `${req.duration.toFixed(2)}ms`,
        memoryDiff: `${(req.memoryDiff / 1024 / 1024).toFixed(2)}MB`,
        timestamp: new Date(req.timestamp).toISOString()
      }));
  }

  getTopRoutes(limit = 10) {
    return Object.entries(this.metrics.requests.byRoute)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([route, count]) => ({ route, count }));
  }

  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  reset() {
    this.metrics = {
      requests: { total: 0, byMethod: {}, byRoute: {}, byStatusCode: {}, errors: 0 },
      response_times: { avg: 0, min: Infinity, max: 0, p95: 0, p99: 0, samples: [] },
      memory: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
      cpu: { usage: 0, loadAverage: [] }
    };
    this.requestHistory = [];
    this.startTime = Date.now();
    logger.info('[PERFORMANCE] Metrics reset');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = {
  performanceMonitor,
  trackRequest: () => performanceMonitor.trackRequest()
};