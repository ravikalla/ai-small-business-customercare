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
    res.json({ message: 'Small Business Chatbot API is running!' });
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

// Log viewer HTML page
app.get('/logs', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SBC System - Log Viewer</title>
    <style>
        body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; background: #1a1a1a; color: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .controls { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
        .controls select, .controls input, .controls button { padding: 8px; border-radius: 4px; border: 1px solid #444; background: #333; color: #fff; }
        .controls button { background: #007acc; cursor: pointer; }
        .controls button:hover { background: #005a9e; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 20px; }
        .metric { background: #333; padding: 10px; border-radius: 4px; text-align: center; }
        .metric-value { font-size: 1.2em; font-weight: bold; color: #4CAF50; }
        .logs-container { background: #222; border: 1px solid #444; border-radius: 4px; height: 60vh; overflow-y: auto; padding: 10px; }
        .log-line { margin: 2px 0; padding: 4px; border-radius: 2px; }
        .log-error { background: rgba(244, 67, 54, 0.2); }
        .log-warn { background: rgba(255, 193, 7, 0.2); }
        .log-info { background: rgba(33, 150, 243, 0.2); }
        .log-success { background: rgba(76, 175, 80, 0.2); }
        .auto-refresh { color: #4CAF50; }
        .status-online { color: #4CAF50; }
        .status-stopped { color: #f44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 SBC System Log Viewer</h1>
        <div id="lastUpdate">Last updated: Never</div>
    </div>
    
    <div id="metrics" class="metrics"></div>
    
    <div class="controls">
        <label>Lines: <select id="lines">
            <option value="50">50</option>
            <option value="100" selected>100</option>
            <option value="200">200</option>
            <option value="500">500</option>
        </select></label>
        
        <label>Level: <select id="level">
            <option value="all">All</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
        </select></label>
        
        <label>Filter: <input type="text" id="filter" placeholder="Search logs..." /></label>
        
        <button onclick="refreshLogs()">Refresh</button>
        <button onclick="toggleAutoRefresh()" id="autoRefreshBtn">Auto Refresh: OFF</button>
        <button onclick="clearLogs()">Clear</button>
    </div>
    
    <div id="logs" class="logs-container"></div>
    
    <script>
        let autoRefreshInterval = null;
        let isAutoRefresh = false;
        
        async function fetchMetrics() {
            try {
                const response = await fetch('/api/metrics');
                const data = await response.json();
                
                if (data.success) {
                    const metrics = data.metrics;
                    document.getElementById('metrics').innerHTML = \`
                        <div class="metric">
                            <div>Status</div>
                            <div class="metric-value status-\${metrics.status}">\${metrics.status.toUpperCase()}</div>
                        </div>
                        <div class="metric">
                            <div>Memory</div>
                            <div class="metric-value">\${metrics.memory}</div>
                        </div>
                        <div class="metric">
                            <div>CPU</div>
                            <div class="metric-value">\${metrics.cpu}</div>
                        </div>
                        <div class="metric">
                            <div>Restarts</div>
                            <div class="metric-value">\${metrics.restarts}</div>
                        </div>
                        <div class="metric">
                            <div>PID</div>
                            <div class="metric-value">\${metrics.pid}</div>
                        </div>
                    \`;
                }
            } catch (error) {
                console.error('Failed to fetch metrics:', error);
            }
        }
        
        async function refreshLogs() {
            const lines = document.getElementById('lines').value;
            const level = document.getElementById('level').value;
            const filter = document.getElementById('filter').value;
            
            try {
                const params = new URLSearchParams({ lines, level, filter });
                const response = await fetch(\`/api/logs?\${params}\`);
                const data = await response.json();
                
                if (data.success) {
                    const logsContainer = document.getElementById('logs');
                    logsContainer.innerHTML = data.logs.map(log => {
                        let className = 'log-line';
                        if (log.includes('ERROR')) className += ' log-error';
                        else if (log.includes('WARN')) className += ' log-warn';
                        else if (log.includes('INFO')) className += ' log-info';
                        else if (log.includes('SUCCESS')) className += ' log-success';
                        
                        return \`<div class="\${className}">\${log}</div>\`;
                    }).join('');
                    
                    logsContainer.scrollTop = logsContainer.scrollHeight;
                    document.getElementById('lastUpdate').textContent = \`Last updated: \${new Date().toLocaleTimeString()}\`;
                }
            } catch (error) {
                console.error('Failed to refresh logs:', error);
            }
        }
        
        function toggleAutoRefresh() {
            isAutoRefresh = !isAutoRefresh;
            const btn = document.getElementById('autoRefreshBtn');
            
            if (isAutoRefresh) {
                btn.textContent = 'Auto Refresh: ON';
                btn.className = 'auto-refresh';
                autoRefreshInterval = setInterval(() => {
                    refreshLogs();
                    fetchMetrics();
                }, 3000);
            } else {
                btn.textContent = 'Auto Refresh: OFF';
                btn.className = '';
                clearInterval(autoRefreshInterval);
            }
        }
        
        function clearLogs() {
            document.getElementById('logs').innerHTML = '';
        }
        
        // Initial load
        refreshLogs();
        fetchMetrics();
        
        // Refresh metrics every 10 seconds
        setInterval(fetchMetrics, 10000);
    </script>
</body>
</html>
    `;
    res.send(html);
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