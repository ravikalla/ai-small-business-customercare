/**
 * Health Controller
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const database = require('../config/database');
const vectorService = require('../services/vectorService');
const twilioWhatsAppService = require('../services/twilioWhatsAppService');
const { catchAsync } = require('../middleware/errorHandler');

class HealthController {
  constructor() {
    this.getRoot = catchAsync(this.getRoot.bind(this));
    this.getHealth = catchAsync(this.getHealth.bind(this));
  }

  async getRoot(req, res) {
    const packageJson = require('../../package.json');
    const deploymentTime = process.env.DEPLOYMENT_TIME || new Date().toISOString();

    res.json({
      message: 'Small Business Chatbot API is running!',
      version: packageJson.version,
      name: packageJson.name,
      author: packageJson.author,
      deploymentTime: deploymentTime,
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
    });
  }

  async getHealth(req, res) {
    const dbStatus = await database.getConnectionStatus();
    const vectorStatus = vectorService.isHealthy ? vectorService.isHealthy() : false;
    const twilioStatus = twilioWhatsAppService.isHealthy();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      vectorDB: { isHealthy: vectorStatus },
      twilio: { isHealthy: twilioStatus },
      uptime: process.uptime(),
    });
  }
}

module.exports = new HealthController();
