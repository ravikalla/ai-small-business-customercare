/**
 * Performance Monitoring Routes
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const express = require('express');
const { performanceMonitor } = require('../middleware/performanceMonitoring');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/performance/metrics:
 *   get:
 *     summary: Get application performance metrics
 *     tags: [Performance]
 *     responses:
 *       200:
 *         description: Performance metrics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     uptime:
 *                       type: object
 *                       properties:
 *                         milliseconds:
 *                           type: number
 *                         readable:
 *                           type: string
 *                           example: "2h 15m 30s"
 *                     requests:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         byMethod:
 *                           type: object
 *                         byRoute:
 *                           type: object
 *                         errors:
 *                           type: number
 *                     response_times:
 *                       type: object
 *                       properties:
 *                         avg:
 *                           type: number
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 *                         p95:
 *                           type: number
 *                         p99:
 *                           type: number
 *                     memory:
 *                       type: object
 *                       properties:
 *                         heapUsed:
 *                           type: string
 *                         heapTotal:
 *                           type: string
 *                         rss:
 *                           type: string
 *                     requestsPerSecond:
 *                       type: string
 *                     errorRate:
 *                       type: string
 */
router.get('/metrics', (req, res) => {
  try {
    logger.info('[PERFORMANCE] Metrics requested');
    const metrics = performanceMonitor.getMetrics();
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[PERFORMANCE] Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/slow-requests:
 *   get:
 *     summary: Get slowest requests
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of slow requests to return
 *     responses:
 *       200:
 *         description: List of slowest requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 slowRequests:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       method:
 *                         type: string
 *                       route:
 *                         type: string
 *                       duration:
 *                         type: string
 *                       statusCode:
 *                         type: number
 *                       timestamp:
 *                         type: string
 */
router.get('/slow-requests', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    logger.info(`[PERFORMANCE] Slow requests requested (limit: ${limit})`);
    
    const slowRequests = performanceMonitor.getSlowRequests(limit);
    
    res.json({
      success: true,
      slowRequests,
      count: slowRequests.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[PERFORMANCE] Error getting slow requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve slow requests',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/top-routes:
 *   get:
 *     summary: Get most frequently accessed routes
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top routes to return
 *     responses:
 *       200:
 *         description: List of most accessed routes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 topRoutes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       route:
 *                         type: string
 *                       count:
 *                         type: number
 */
router.get('/top-routes', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    logger.info(`[PERFORMANCE] Top routes requested (limit: ${limit})`);
    
    const topRoutes = performanceMonitor.getTopRoutes(limit);
    
    res.json({
      success: true,
      topRoutes,
      count: topRoutes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[PERFORMANCE] Error getting top routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve top routes',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/reset:
 *   post:
 *     summary: Reset performance metrics
 *     tags: [Performance]
 *     responses:
 *       200:
 *         description: Metrics reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/reset', (req, res) => {
  try {
    logger.info('[PERFORMANCE] Metrics reset requested');
    performanceMonitor.reset();
    
    res.json({
      success: true,
      message: 'Performance metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[PERFORMANCE] Error resetting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset performance metrics',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/health:
 *   get:
 *     summary: Get performance health status
 *     tags: [Performance]
 *     responses:
 *       200:
 *         description: Performance health data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 health:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, warning, critical]
 *                     issues:
 *                       type: array
 *                       items:
 *                         type: string
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/health', (req, res) => {
  try {
    logger.info('[PERFORMANCE] Performance health check requested');
    const metrics = performanceMonitor.getMetrics();
    
    const health = {
      status: 'healthy',
      issues: [],
      recommendations: []
    };

    // Check response times
    if (metrics.response_times.avg > 1000) {
      health.status = 'warning';
      health.issues.push('High average response time');
      health.recommendations.push('Consider optimizing slow endpoints');
    }

    if (metrics.response_times.p95 > 2000) {
      health.status = 'critical';
      health.issues.push('Very high 95th percentile response time');
      health.recommendations.push('Investigate slow requests and optimize performance');
    }

    // Check error rate
    const errorRate = parseFloat(metrics.errorRate);
    if (errorRate > 5) {
      health.status = 'warning';
      health.issues.push(`High error rate: ${errorRate}%`);
      health.recommendations.push('Review error logs and fix failing requests');
    }

    if (errorRate > 15) {
      health.status = 'critical';
    }

    // Check memory usage
    const heapUsed = parseFloat(metrics.memory.heapUsed);
    const heapTotal = parseFloat(metrics.memory.heapTotal);
    const memoryUsage = (heapUsed / heapTotal) * 100;

    if (memoryUsage > 80) {
      health.status = 'warning';
      health.issues.push(`High memory usage: ${memoryUsage.toFixed(1)}%`);
      health.recommendations.push('Monitor memory leaks and optimize memory usage');
    }

    if (memoryUsage > 90) {
      health.status = 'critical';
    }

    // Check requests per second (basic load check)
    const rps = parseFloat(metrics.requestsPerSecond);
    if (rps > 100) {
      health.recommendations.push('High traffic detected - consider scaling if performance degrades');
    }

    res.json({
      success: true,
      health,
      metrics: {
        avgResponseTime: metrics.response_times.avg,
        errorRate: metrics.errorRate,
        memoryUsage: `${memoryUsage.toFixed(1)}%`,
        requestsPerSecond: metrics.requestsPerSecond
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[PERFORMANCE] Error getting performance health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance health',
      details: error.message
    });
  }
});

module.exports = router;