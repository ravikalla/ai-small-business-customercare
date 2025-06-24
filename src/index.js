/**
 * Small Business Chatbot
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('../config');
const logger = require('./utils/logger');
const database = require('./config/database');
const vectorService = require('./services/vectorService');
const backupManager = require('./utils/backup');
const twilioWhatsAppService = require('./services/twilioWhatsAppService');
const businessService = require('./services/businessService');
const knowledgeBaseModule = require('./modules/knowledgeBase');
const webhooksModule = require('./routes/webhooks');
const knowledgeService = require('./services/knowledgeService');
const aiService = require('./services/aiService');

// Import Swagger configuration
const { specs, swaggerUi, swaggerOptions } = require('./config/swagger');

// Import routes
const routes = require('./routes');

const app = express();

// Import middleware
const { globalErrorHandler, handleNotFound } = require('./middleware/errorHandler');
const {
  generalRateLimiter,
  configureHelmet,
  securityLogger,
  handlePreflight,
  limitRequestSize,
} = require('./middleware/security');
const { sanitizeInput } = require('./middleware/validation');
const { 
  requestLogging, 
  errorLogging, 
  securityLogging 
} = require('./middleware/logging');

// Use configuration system
const appConfig = config.get('app');
const securityConfig = config.get('security');

// Request logging middleware (early in the stack)
app.use(requestLogging);

// Security middleware
app.use(configureHelmet());
app.use(handlePreflight);
app.use(securityLogger);
app.use(securityLogging);
app.use(generalRateLimiter);
app.use(limitRequestSize('10mb'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors(securityConfig.cors));

// Input sanitization
app.use(sanitizeInput);

// API Documentation with Swagger - Debug setup
logger.info('Setting up Swagger documentation...');

// Simple test endpoint to verify routing works
app.get('/api-docs-simple', (req, res) => {
  logger.info('[SWAGGER] Simple test endpoint hit');
  res.send(`
    <html>
      <head><title>API Documentation Test</title></head>
      <body>
        <h1>API Documentation Test</h1>
        <p>This endpoint is working. Swagger specs available: ${!!specs}</p>
        <p>Paths count: ${specs ? Object.keys(specs.paths || {}).length : 0}</p>
        <pre>${JSON.stringify(specs?.info || {}, null, 2)}</pre>
      </body>
    </html>
  `);
});

// Manual Swagger UI setup
app.get('/api-docs', (req, res) => {
  logger.info('[SWAGGER] Main api-docs endpoint hit');
  try {
    const html = swaggerUi.generateHTML(specs, swaggerOptions.swaggerOptions);
    res.send(html);
  } catch (error) {
    logger.error('[SWAGGER] Error generating HTML:', error);
    res.status(500).json({ error: 'Failed to generate Swagger UI', details: error.message });
  }
});

// Alternative using middleware
app.get('/api-docs-alt', (req, res, next) => {
  logger.info('[SWAGGER] Alternative endpoint hit');
  next();
}, swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

logger.info('Swagger documentation setup complete');

// Debug endpoint to check Swagger specs
app.get('/debug/swagger', (req, res) => {
  try {
    res.json({
      message: 'Swagger configuration debug',
      swagger_url: `${req.protocol}://${req.get('host')}/api-docs`,
      specs_generated: !!specs,
      specs_info: specs ? {
        openapi: specs.openapi,
        title: specs.info?.title,
        version: specs.info?.version,
        paths_count: Object.keys(specs.paths || {}).length,
        tags_count: specs.tags?.length || 0
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate Swagger debug info',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint to verify Swagger UI components are working
app.get('/debug/swagger-test', (req, res) => {
  try {
    logger.info('[SWAGGER] Test endpoint called');
    res.json({
      message: 'Swagger test endpoint',
      swaggerUi_available: !!swaggerUi,
      specs_available: !!specs,
      serve_function: typeof swaggerUi.serve,
      setup_function: typeof swaggerUi.setup,
      specs_paths: specs ? Object.keys(specs.paths || {}).length : 0
    });
  } catch (error) {
    logger.error('[SWAGGER] Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to list all available routes
app.get('/debug/routes', (req, res) => {
  const routes = [
    'GET / - API information',
    'GET /health - Health check', 
    'GET /api-docs - Swagger API Documentation (main)',
    'GET /api-docs-alt - Swagger API Documentation (alternative)',
    'GET /api-docs-simple - Simple API docs test',
    'GET /debug/swagger - Swagger configuration debug',
    'GET /debug/swagger-test - Swagger components test',
    'GET /api/businesses - List businesses',
    'POST /api/businesses - Create business',
    'GET /api/twilio/status - Twilio status',
    'GET /api/admin/backup/list - List backups (requires auth)',
    'GET /api/logging/metrics - Logging metrics (requires auth)',
    'POST /webhooks/twilio/whatsapp - WhatsApp webhook',
    'GET /webhooks/status - Webhook status'
  ];
  
  res.json({
    message: 'Available API endpoints',
    swagger_url: `${req.protocol}://${req.get('host')}/api-docs`,
    endpoints: routes,
    timestamp: new Date().toISOString()
  });
});

// Mount all routes
app.use('/', routes);
app.use('/api/knowledge', knowledgeBaseModule);

// WhatsApp webhook endpoint
app.post('/api/webhook/whatsapp', async (req, res) => {
  try {
    logger.info('[WEBHOOK] Received WhatsApp webhook:', JSON.stringify(req.body, null, 2));

    const { From, To, Body, MessageSid } = req.body;

    if (!From || !Body || !To) {
      logger.warn('[WEBHOOK] Invalid webhook data - missing From, To, or Body');
      return res.status(400).send('Invalid webhook data');
    }

    // Extract phone numbers from WhatsApp format
    const customerPhone = From.replace('whatsapp:', '');
    const businessWhatsAppNumber = To;
    logger.info(
      `[WEBHOOK] Processing message from ${customerPhone} to ${businessWhatsAppNumber}: "${Body}"`
    );

    // Find business by WhatsApp number (for production with dedicated numbers)
    const targetBusiness =
      await businessService.getBusinessByWhatsAppNumber(businessWhatsAppNumber);
    if (!targetBusiness && !Body.toLowerCase().startsWith('!register')) {
      logger.warn(`[WEBHOOK] No business found for WhatsApp number: ${businessWhatsAppNumber}`);
      await twilioWhatsAppService.sendMessage(
        customerPhone,
        'Sorry, this business is not registered with our system.'
      );
      return res.status(200).send('OK');
    }

    // Handle business registration command
    if (Body.toLowerCase().startsWith('!register ')) {
      const businessName = Body.substring(10).trim();

      if (!businessName) {
        await twilioWhatsAppService.sendMessage(
          customerPhone,
          'Please provide a business name. Format: !register [Business Name]'
        );
        return res.status(200).send('OK');
      }

      logger.info(`[WEBHOOK] Registration request: "${businessName}" from ${customerPhone}`);

      // Register the business
      const businessResult = await businessService.registerBusiness(customerPhone, businessName);

      if (businessResult.success) {
        logger.success(
          `[WEBHOOK] Business registered: ${businessName} (ID: ${businessResult.businessId})`
        );

        // Register with Twilio service
        const twilioResult = await twilioWhatsAppService.registerBusiness(
          businessResult.businessId,
          businessName,
          To, // WhatsApp number
          customerPhone
        );

        if (twilioResult.success) {
          await twilioWhatsAppService.sendMessage(
            customerPhone,
            `🎉 Business "${businessName}" registered successfully!\n\nBusiness ID: ${businessResult.businessId}\n\nCustomers can now query your business using:\n!business ${businessResult.businessId} [question]\n\nUse !help for available commands.`
          );
        } else {
          await twilioWhatsAppService.sendMessage(
            customerPhone,
            `✅ Business registered in database but Twilio setup incomplete. Business ID: ${businessResult.businessId}`
          );
        }
      } else {
        logger.error(`[WEBHOOK] Registration failed: ${businessResult.message}`);
        await twilioWhatsAppService.sendMessage(
          customerPhone,
          `❌ Registration failed: ${businessResult.message}`
        );
      }
    } else {
      // Handle other commands and customer queries
      logger.info(`[WEBHOOK] Processing non-registration message: "${Body}"`);

      // Check what type of command this is
      const senderBusiness = await businessService.getBusinessByOwner(customerPhone);

      // Handle simple customer queries (production mode)
      if (targetBusiness && !Body.startsWith('!')) {
        logger.info(`[WEBHOOK] Simple customer query to ${targetBusiness.businessName}: "${Body}"`);

        // Record query and generate AI response
        await businessService.recordQuery(targetBusiness.businessId);
        const response = await aiService.generateResponse(Body, targetBusiness.businessId);
        await twilioWhatsAppService.sendMessage(customerPhone, response);
        return res.status(200).send('OK');
      } else if (Body.toLowerCase().startsWith('!business ')) {
        // This is always a customer query, regardless of who sends it
        logger.info(
          `[WEBHOOK] Customer query detected from ${senderBusiness ? 'business owner' : 'customer'}`
        );

        const parts = Body.split(' ');
        if (parts.length >= 3) {
          const businessId = parts[1];
          const query = parts.slice(2).join(' ');

          logger.info(`[WEBHOOK] Customer query for business ${businessId}: "${query}"`);

          // Record query and generate response
          await businessService.recordQuery(businessId);
          const response = await aiService.generateResponse(query, businessId);
          await twilioWhatsAppService.sendMessage(customerPhone, response);
        } else {
          await twilioWhatsAppService.sendMessage(
            customerPhone,
            'Please provide a valid query. Format: !business [ID] [your question]'
          );
        }
      } else if (senderBusiness && Body.startsWith('!')) {
        // This is a business owner management command
        logger.info(`[WEBHOOK] Business owner command from ${senderBusiness.businessName}`);

        // Parse the command
        const commandMatch = Body.match(/^!(\w+)(?:\s+(.*))?$/i);
        if (!commandMatch) {
          await twilioWhatsAppService.sendMessage(
            customerPhone,
            'Invalid command format. Use !help for available commands.'
          );
          return res.status(200).send('OK');
        }

        const command = commandMatch[1].toLowerCase();
        const args = commandMatch[2] || '';

        logger.info(`[WEBHOOK] Processing business owner command: ${command}`);

        switch (command) {
          case 'add':
            if (!args.trim()) {
              await twilioWhatsAppService.sendMessage(
                customerPhone,
                'Please provide content. Format: !add [your knowledge text]'
              );
            } else {
              logger.info(`[WEBHOOK] Adding knowledge for ${senderBusiness.businessName}`);
              const result = await knowledgeService.addTextKnowledge(
                senderBusiness.businessId,
                senderBusiness.businessName,
                args.trim()
              );

              if (result.success) {
                await businessService.updateKnowledgeCount(senderBusiness.ownerPhone);
                await twilioWhatsAppService.sendMessage(
                  customerPhone,
                  `✅ ${result.message}\n"${args.substring(0, 100)}${args.length > 100 ? '...' : ''}"`
                );
              } else {
                await twilioWhatsAppService.sendMessage(customerPhone, `❌ ${result.message}`);
              }
            }
            break;

          case 'list':
            logger.info(`[WEBHOOK] Listing knowledge for ${senderBusiness.businessName}`);
            const entries = await knowledgeService.getBusinessKnowledge(senderBusiness.businessId);
            const stats = await knowledgeService.getKnowledgeStats(senderBusiness.businessId);

            if (entries.length === 0) {
              await twilioWhatsAppService.sendMessage(
                customerPhone,
                `📚 Your Knowledge Base (${senderBusiness.businessName}):\n\nNo entries yet. Use !add [text] or send documents to get started!`
              );
            } else {
              let response = `📚 Your Knowledge Base (${senderBusiness.businessName}):\n\n`;
              entries.slice(0, 10).forEach(entry => {
                const date = new Date(entry.addedAt).toLocaleDateString();
                response += `${entry.id}: ${entry.preview} (${entry.type}) - ${date}\n`;
              });

              if (entries.length > 10) {
                response += `\n... and ${entries.length - 10} more entries`;
              }

              response += `\n📊 Total: ${stats.total} entries (${stats.text} text, ${stats.documents} documents)`;
              await twilioWhatsAppService.sendMessage(customerPhone, response);
            }
            break;

          case 'help':
            const help = `🔧 Available Commands for ${senderBusiness.businessName}:

📝 *Knowledge Management:*
• !add [text] - Add text knowledge
• Send PDF/TXT files - Upload documents
• !list - View your knowledge base
• !delete [id] - Remove knowledge entry

📊 *Information:*
• !help - Show this help message

💡 *Tips:*
- Customers can query your business using: !business ${senderBusiness.businessId} [question]
- All uploaded content is processed and made searchable`;
            await twilioWhatsAppService.sendMessage(customerPhone, help);
            break;

          case 'delete':
            if (!args.trim()) {
              await twilioWhatsAppService.sendMessage(
                customerPhone,
                'Please provide a knowledge ID. Format: !delete [knowledge-id]'
              );
            } else {
              const result = await knowledgeService.deleteKnowledge(
                senderBusiness.businessId,
                args.trim()
              );
              if (result.success) {
                await businessService.updateKnowledgeCount(senderBusiness.ownerPhone, -1);
                await twilioWhatsAppService.sendMessage(customerPhone, `✅ ${result.message}`);
              } else {
                await twilioWhatsAppService.sendMessage(customerPhone, `❌ ${result.message}`);
              }
            }
            break;

          default:
            await twilioWhatsAppService.sendMessage(
              customerPhone,
              `❌ Unknown command: ${command}\n\nUse !help for available commands.`
            );
        }
      } else {
        logger.debug(`[WEBHOOK] Unrecognized message format from ${customerPhone}`);
        await twilioWhatsAppService.sendMessage(
          customerPhone,
          'Welcome! Use !register [Business Name] to register your business, or !business [ID] [question] to query a business.'
        );
      }
    }

    res.status(200).send('OK');

    } catch (error) {
    logger.error('[WEBHOOK] Error processing WhatsApp webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Note: Root, health, business, admin, and twilio endpoints are now handled by structured routes

// Simple logs endpoint that definitely works
app.get('/simple-logs', (req, res) => {
  const { exec } = require('child_process');
  const lines = req.query.lines || 50;

  exec(`pm2 logs sbc-system --lines ${lines} --raw`, (error, stdout, stderr) => {
    if (error) {
      return res.json({
        success: false,
        error: 'PM2 logs failed',
        logs: [
          'Error accessing PM2 logs',
          'Please SSH to server for detailed logs:',
          'ssh -i your-key.pem ubuntu@your-ec2-public-dns',
          'pm2 logs sbc-system --timestamp',
        ],
      });
    }

    const logs = stdout
      .split('\\n')
      .filter(line => line.trim())
      .slice(-lines);
    res.json({
      success: true,
      logs: logs,
      count: logs.length,
      timestamp: new Date().toISOString(),
    });
  });
});

// Log monitoring endpoints
app.get('/api/logs', async (req, res) => {
  try {
    const { lines = 100, filter = '', level = 'all' } = req.query;
    const { exec } = require('child_process');

    exec(`pm2 logs sbc-system --lines ${lines} --raw`, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch logs',
          details: error.message,
        });
      }

      let logs = stdout.split('\n').filter(line => line.trim());

      // Filter by log level
      if (level !== 'all') {
        logs = logs.filter(log => log.includes(level.toUpperCase()));
      }

      // Filter by search term
      if (filter) {
        logs = logs.filter(log => log.toLowerCase().includes(filter.toLowerCase()));
      }

      res.json({
        success: true,
        logs: logs.slice(-lines),
        total: logs.length,
        filter: filter || null,
        level: level,
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Application metrics endpoint
app.get('/api/metrics', async (req, res) => {
  try {
    const { exec } = require('child_process');

    exec('pm2 jlist', (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch metrics',
        });
      }

      try {
        const processes = JSON.parse(stdout);
        const sbcProcess = processes.find(p => p.name === 'sbc-system');

        if (sbcProcess) {
          res.json({
            success: true,
            metrics: {
              name: sbcProcess.name,
              status: sbcProcess.pm2_env.status,
              uptime: sbcProcess.pm2_env.pm_uptime,
              restarts: sbcProcess.pm2_env.restart_time,
              memory: Math.round(sbcProcess.monit.memory / 1024 / 1024) + ' MB',
              cpu: sbcProcess.monit.cpu + '%',
              pid: sbcProcess.pid,
              version: sbcProcess.pm2_env.version || 'unknown',
            },
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'sbc-system process not found',
          });
        }
      } catch (parseError) {
        res.status(500).json({
          success: false,
          error: 'Failed to parse PM2 data',
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Simple log viewer page
app.get('/logs', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>SBC System - Log Viewer</title>
    <style>
        body { font-family: monospace; background: #1a1a1a; color: #fff; margin: 20px; }
        .header { margin-bottom: 20px; }
        .controls { margin-bottom: 20px; }
        .controls button { padding: 10px; margin-right: 10px; background: #007acc; color: white; border: none; cursor: pointer; }
        .logs { background: #222; padding: 15px; height: 70vh; overflow-y: auto; border: 1px solid #444; }
        .log-line { margin: 3px 0; padding: 3px; }
        .error { background: rgba(255,0,0,0.2); }
        .warn { background: rgba(255,255,0,0.2); }
        .info { background: rgba(0,255,255,0.2); }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 SBC System Logs</h1>
        <div id="status">Status: Loading...</div>
    </div>
    
    <div class="controls">
        <button onclick="loadLogs()">Refresh Logs</button>
        <button onclick="toggleAutoRefresh()" id="autoBtn">Auto Refresh: OFF</button>
        <button onclick="clearDisplay()">Clear</button>
    </div>
    
    <div id="logs" class="logs">Loading logs...</div>
    
    <script>
        let autoRefresh = false;
        let interval;
        
        async function loadLogs() {
            try {
                document.getElementById('status').textContent = 'Status: Loading...';
                const response = await fetch('/api/logs?lines=100');
                const data = await response.json();
                
                if (data.success) {
                    const logsDiv = document.getElementById('logs');
                    logsDiv.innerHTML = data.logs.map(line => {
                        let className = 'log-line';
                        if (line.includes('ERROR')) className += ' error';
                        else if (line.includes('WARN')) className += ' warn';
                        else if (line.includes('INFO')) className += ' info';
                        
                        return '<div class="' + className + '">' + line + '</div>';
                    }).join('');
                    
                    logsDiv.scrollTop = logsDiv.scrollHeight;
                    document.getElementById('status').textContent = 'Status: Updated at ' + new Date().toLocaleTimeString();
                } else {
                    document.getElementById('logs').innerHTML = 'Error loading logs: ' + data.error;
                    document.getElementById('status').textContent = 'Status: Error';
                }
            } catch (error) {
                document.getElementById('logs').innerHTML = 'Failed to load logs: ' + error.message;
                document.getElementById('status').textContent = 'Status: Connection Error';
            }
        }
        
        function toggleAutoRefresh() {
            autoRefresh = !autoRefresh;
            const btn = document.getElementById('autoBtn');
            
            if (autoRefresh) {
                btn.textContent = 'Auto Refresh: ON';
                btn.style.background = '#4CAF50';
                interval = setInterval(loadLogs, 5000);
            } else {
                btn.textContent = 'Auto Refresh: OFF';
                btn.style.background = '#007acc';
                clearInterval(interval);
            }
        }
        
        function clearDisplay() {
            document.getElementById('logs').innerHTML = '';
        }
        
        // Load logs on page load
        loadLogs();
    </script>
</body>
</html>
    `);
});

// Initialize services
async function initializeServices() {
  try {
    logger.info('[STARTUP] Initializing Small Business Care System...');

    // Initialize database connection
    logger.info('[STARTUP] Connecting to Supabase...');
    await database.connect();

    // Check/create database tables
    try {
      await database.createTables();
    } catch (error) {
      logger.warn(
        '[STARTUP] Database tables check failed (this is normal on first run):',
        error.message
      );
    }

    // Initialize vector service
    logger.info('[STARTUP] Initializing vector service...');
    await vectorService.initialize();

    // Initialize Twilio WhatsApp service
    logger.info('[STARTUP] Initializing Twilio WhatsApp service...');
    await twilioWhatsAppService.initialize();

    // Initialize backup system
    if (process.env.NODE_ENV === 'production') {
      logger.info('[STARTUP] Initializing backup system...');
      backupManager.scheduleBackups();
    } else {
      logger.info('[STARTUP] Backup system disabled in development mode');
    }

    logger.success('[STARTUP] All services initialized successfully!');

  } catch (error) {
    logger.error('[STARTUP] Failed to initialize services:', error);

    // Don't exit completely - let the app run but log the error
    logger.warn('[STARTUP] Some services may not be available');
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[SHUTDOWN] Received SIGTERM, shutting down gracefully...');

  try {
    await database.disconnect();
    logger.info('[SHUTDOWN] Database disconnected');
  } catch (error) {
    logger.error('[SHUTDOWN] Error disconnecting database:', error);
  }

  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('[SHUTDOWN] Received SIGINT, shutting down gracefully...');

  try {
    await database.disconnect();
    logger.info('[SHUTDOWN] Database disconnected');
  } catch (error) {
    logger.error('[SHUTDOWN] Error disconnecting database:', error);
  }

  process.exit(0);
});

// Error handling middleware (must be last)
app.use(handleNotFound);
app.use(errorLogging);
app.use(globalErrorHandler);

// Start the server
app.listen(appConfig.port, async () => {
  logger.success(`[SERVER] Server running on port ${appConfig.port}`);
  logger.info(`[SERVER] Environment: ${config.getEnvironment()}`);

  // Initialize services after server starts
  await initializeServices();
});
