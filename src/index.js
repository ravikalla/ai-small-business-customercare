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