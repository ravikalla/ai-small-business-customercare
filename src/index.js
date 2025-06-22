/**
 * Small Business Chatbot
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const database = require('./config/database');
const vectorService = require('./services/vectorService');
const backupManager = require('./utils/backup');
const twilioWhatsAppService = require('./services/twilioWhatsAppService');
const businessService = require('./services/businessService');
const knowledgeBaseModule = require('./modules/knowledgeBase');
const webhooksModule = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/knowledge', knowledgeBaseModule);
app.use('/webhooks', webhooksModule);

app.get('/', (req, res) => {
    const packageJson = require('../package.json');
    const deploymentTime = process.env.DEPLOYMENT_TIME || new Date().toISOString();
    
    res.json({ 
        message: 'Small Business Chatbot API is running!',
        version: packageJson.version,
        name: packageJson.name,
        author: packageJson.author,
        deploymentTime: deploymentTime,
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/health', async (req, res) => {
    try {
        const dbStatus = await database.getConnectionStatus();
        const vectorStatus = vectorService.isHealthy ? vectorService.isHealthy() : false;
        const twilioStatus = twilioWhatsAppService.isHealthy();
        
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbStatus,
            vectorDB: { isHealthy: vectorStatus },
            twilio: { isHealthy: twilioStatus },
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

// Backup management endpoints
app.post('/api/backup/create', async (req, res) => {
    try {
        const { type = 'full' } = req.body;
        const result = await backupManager.createBackup(type);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/backup/list', async (req, res) => {
    try {
        const backups = await backupManager.listBackups();
        res.json({ success: true, backups });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/backup/restore', async (req, res) => {
    try {
        const { backupPath, dryRun = false, skipExisting = true } = req.body;
        const result = await backupManager.restoreBackup(backupPath, { dryRun, skipExisting });
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/backup/export-sql', async (req, res) => {
    try {
        const result = await backupManager.exportToSupabaseDump();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Cache management endpoints
app.post('/api/cache/clear', async (req, res) => {
    try {
        const cache = require('./utils/cache');
        const { type, businessId } = req.body;
        
        if (businessId) {
            const cleared = cache.clearBusinessCaches(businessId);
            res.json({ success: true, message: `Cleared ${cleared} cache entries for business ${businessId}` });
        } else if (type) {
            cache.clear(type);
            res.json({ success: true, message: `Cleared ${type} cache` });
        } else {
            cache.clear();
            res.json({ success: true, message: 'Cleared all caches' });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/cache/stats', async (req, res) => {
    try {
        const cache = require('./utils/cache');
        const stats = cache.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/cache/inspect', async (req, res) => {
    try {
        const cache = require('./utils/cache');
        const { type } = req.query;
        
        const result = {
            success: true,
            timestamp: new Date().toISOString(),
            caches: {}
        };
        
        // Inspect specific cache type or all
        const typesToInspect = type ? [type] : ['responses', 'embeddings', 'searches'];
        
        typesToInspect.forEach(cacheType => {
            if (cache.caches[cacheType]) {
                result.caches[cacheType] = {
                    size: cache.caches[cacheType].size,
                    entries: []
                };
                
                // Get first 10 entries with metadata
                let count = 0;
                for (const [key, entry] of cache.caches[cacheType].entries()) {
                    if (count >= 10) break;
                    
                    result.caches[cacheType].entries.push({
                        key: key.substring(0, 50) + (key.length > 50 ? '...' : ''),
                        fullKey: key,
                        timestamp: new Date(entry.timestamp).toISOString(),
                        ttl: entry.ttl,
                        accessCount: entry.accessCount,
                        lastAccessed: new Date(entry.lastAccessed).toISOString(),
                        valuePreview: typeof entry.value === 'string' ? 
                            entry.value.substring(0, 100) + (entry.value.length > 100 ? '...' : '') :
                            JSON.stringify(entry.value).substring(0, 100)
                    });
                    count++;
                }
            }
        });
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Business management endpoints
app.post('/api/businesses/register', async (req, res) => {
    try {
        const { businessName, whatsappNumber, ownerPhone } = req.body;
        
        if (!businessName || !whatsappNumber || !ownerPhone) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: businessName, whatsappNumber, ownerPhone'
            });
        }

        // Register in business service
        const businessResult = await businessService.registerBusiness(ownerPhone, businessName);
        
        if (!businessResult.success) {
            return res.status(400).json(businessResult);
        }

        // Register in Twilio service
        const twilioResult = await twilioWhatsAppService.registerBusiness(
            businessResult.businessId,
            businessName,
            whatsappNumber,
            ownerPhone
        );

        if (!twilioResult.success) {
            return res.status(500).json({
                success: false,
                error: `Business registered but Twilio registration failed: ${twilioResult.error}`
            });
        }

        res.json({
            success: true,
            message: 'Business registered successfully',
            businessId: businessResult.businessId,
            whatsappNumber: whatsappNumber
        });

    } catch (error) {
        logger.error('[API] Error registering business:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/businesses', async (req, res) => {
    try {
        const businesses = twilioWhatsAppService.getAllBusinesses();
        res.json({
            success: true,
            businesses: businesses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/twilio/status', async (req, res) => {
    try {
        const stats = twilioWhatsAppService.getStats();
        res.json({
            success: true,
            ...stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

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
                    'pm2 logs sbc-system --timestamp'
                ]
            });
        }
        
        const logs = stdout.split('\\n').filter(line => line.trim()).slice(-lines);
        res.json({
            success: true,
            logs: logs,
            count: logs.length,
            timestamp: new Date().toISOString()
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
                    details: error.message 
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
                timestamp: new Date().toISOString()
            });
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
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
                    error: 'Failed to fetch metrics' 
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
                            version: sbcProcess.pm2_env.version || 'unknown'
                        },
                        timestamp: new Date().toISOString()
                    });
                } else {
                    res.status(404).json({ 
                        success: false, 
                        error: 'sbc-system process not found' 
                    });
                }
            } catch (parseError) {
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to parse PM2 data' 
                });
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
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
            logger.warn('[STARTUP] Database tables check failed (this is normal on first run):', error.message);
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

// Start the server
app.listen(PORT, async () => {
    logger.success(`[SERVER] Server running on port ${PORT}`);
    logger.info(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Initialize services after server starts
    await initializeServices();
});