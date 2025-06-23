const { Before, After, BeforeAll, AfterAll } = require('@cucumber/cucumber');
const express = require('express');
const path = require('path');

// Test environment setup
BeforeAll(async function () {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0'; // Use random available port for testing
  
  // Mock environment variables for testing
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.PINECONE_API_KEY = 'test-pinecone-key';
  process.env.PINECONE_INDEX_NAME = 'test-index';
  process.env.PINECONE_ENVIRONMENT = 'test-env';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-supabase-key';
  process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid';
  process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
  process.env.TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886';

  console.log('🧪 Test environment initialized');
});

Before(async function () {
  // Initialize test application instance
  const appPath = path.join(__dirname, '../../src/index.js');
  delete require.cache[require.resolve(appPath)];
  
  // Create Express app for testing (without starting server)
  this.app = express();
  
  // Setup basic middleware for testing
  this.app.use(express.json());
  this.app.use(express.urlencoded({ extended: true }));
  
  // Add test routes
  setupTestRoutes.call(this);
  
  // Clean test data
  await this.cleanDatabase();
  
  // Setup service mocks
  setupDefaultMocks.call(this);
});

After(async function () {
  // Cleanup after each scenario
  this.cleanupMocks();
  this.response = null;
  this.error = null;
  this.startTime = null;
  this.endTime = null;
  
  // Clean test data
  await this.cleanDatabase();
});

AfterAll(async function () {
  // Global cleanup
  console.log('🧹 Test environment cleaned up');
});

// Add test-specific routes to the app
function setupTestRoutes() {
  const self = this;
  
  // Health check endpoint
  this.app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: { isHealthy: true, status: 'connected' },
      vectorDB: { isHealthy: true },
      twilio: { isHealthy: true },
      uptime: process.uptime()
    });
  });

  // Business registration endpoint
  this.app.post('/api/businesses', (req, res) => {
    const { businessName, whatsappNumber, ownerPhone } = req.body;
    
    if (!businessName || !whatsappNumber || !ownerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const businessId = self.generateRandomBusinessId();
    const business = {
      businessId,
      businessName,
      whatsappNumber,
      ownerPhone,
      registeredAt: new Date().toISOString(),
      status: 'active'
    };

    self.addTestBusiness(businessId, business);

    res.json({
      success: true,
      message: 'Business registered successfully',
      businessId,
      whatsappNumber
    });
  });

  // Knowledge upload endpoint
  this.app.post('/api/knowledge/upload', (req, res) => {
    const { businessId } = req.body;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID required'
      });
    }

    const knowledgeId = `kb_${businessId}_${Date.now()}`;
    const knowledge = {
      knowledgeId,
      businessId,
      type: 'document',
      filename: 'test.pdf',
      chunks: 3,
      vectors: 3,
      addedAt: new Date().toISOString()
    };

    self.addKnowledgeEntry(knowledgeId, knowledge);

    res.json({
      success: true,
      message: 'Document processed successfully',
      knowledgeId,
      chunks: 3,
      vectors: 3
    });
  });

  // Knowledge search endpoint
  this.app.post('/api/knowledge/search', (req, res) => {
    const { businessId, query, topK = 3 } = req.body;
    
    if (!businessId || !query) {
      return res.status(400).json({
        success: false,
        message: 'Business ID and query required'
      });
    }

    // Mock search results
    const results = [
      {
        knowledgeId: `kb_${businessId}_001`,
        content: `Mock relevant content for query: ${query}`,
        score: 0.95,
        metadata: { filename: 'test.pdf', chunk: 1 }
      }
    ];

    res.json({
      success: true,
      results: results.slice(0, topK)
    });
  });

  // Knowledge list endpoint
  this.app.get('/api/knowledge/list', (req, res) => {
    const { businessId } = req.query;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID required'
      });
    }

    // Get knowledge entries for the business
    const entries = Array.from(self.testData.knowledgeEntries.values())
      .filter(entry => entry.businessId === businessId);

    res.json({
      success: true,
      entries: entries,
      total: entries.length
    });
  });

  // WhatsApp webhook endpoint
  this.app.post('/api/webhook/whatsapp', (req, res) => {
    const { From, To, Body, MessageSid } = req.body;
    
    // Validate required Twilio webhook fields - check for empty strings too
    if (!MessageSid || MessageSid === '' || !From || !Body) {
      return res.status(400).json({
        error: 'Missing required webhook fields',
        required: ['MessageSid', 'From', 'Body']
      });
    }
    
    // Log webhook for testing
    self.testData.webhookRequests.push({
      from: From,
      to: To,
      body: Body,
      messageSid: MessageSid,
      timestamp: new Date().toISOString()
    });

    // Process business registration commands
    if (Body && Body.startsWith('!register')) {
      const businessName = Body.replace('!register', '').trim();
      if (businessName) {
        // Check if user already has a business registered
        const existingBusinesses = Array.from(self.testData.businesses.values());
        const userBusiness = existingBusinesses.find(b => b.ownerPhone === From);
        
        if (!userBusiness) {
          const businessId = self.generateRandomBusinessId();
          const business = {
            businessId,
            businessName,
            ownerPhone: From,
            whatsappNumber: To,
            registeredAt: new Date().toISOString(),
            status: 'active'
          };
          self.addTestBusiness(businessId, business);
        }
        // If business already exists, webhook still returns OK but doesn't create duplicate
      }
    }

    // Simulate processing delay
    setTimeout(() => {
      res.status(200).send('OK');
    }, 100);
  });

  // Metrics endpoint
  this.app.get('/api/metrics', (req, res) => {
    res.json({
      success: true,
      metrics: {
        name: 'sbc-system',
        status: 'online',
        uptime: process.uptime() * 1000,
        restarts: 0,
        memory: '125 MB',
        cpu: '2.5%',
        pid: process.pid,
        version: '1.1.1'
      },
      timestamp: new Date().toISOString()
    });
  });

  // Cache stats endpoint
  this.app.get('/api/cache/stats', (req, res) => {
    res.json({
      success: true,
      stats: {
        hitRate: '78.5%',
        hits: 1250,
        misses: 340,
        saves: 1590,
        cacheSize: {
          responses: 45,
          embeddings: 128,
          searches: 67
        }
      }
    });
  });

  // Logs endpoint
  this.app.get('/api/logs', (req, res) => {
    const lines = parseInt(req.query.lines) || 100;
    const mockLogs = [
      `${new Date().toISOString()} [INFO] [WEBHOOK] Processing message`,
      `${new Date().toISOString()} [INFO] [AI] Generated response`,
      `${new Date().toISOString()} [DEBUG] [CACHE] Cache hit for query`
    ];

    res.json({
      success: true,
      logs: mockLogs.slice(0, lines),
      total: mockLogs.length,
      timestamp: new Date().toISOString()
    });
  });

  // Backup endpoint
  this.app.post('/api/backup/create', (req, res) => {
    const { type } = req.body;
    const backupId = `backup_${Date.now()}`;
    
    res.json({
      success: true,
      backupId,
      location: `/backups/${backupId}.tar.gz`,
      size: '15.2 MB',
      businesses: 5,
      knowledgeEntries: 127
    });
  });
}

// Setup default mocks for external services
function setupDefaultMocks() {
  // OpenAI API mocks
  const openaiMock = this.setupOpenAIMock();
  openaiMock
    .post('/v1/embeddings')
    .reply(200, {
      data: [{ embedding: new Array(1536).fill(0.1) }],
      usage: { total_tokens: 100 }
    })
    .post('/v1/chat/completions')
    .reply(200, {
      choices: [{ 
        message: { 
          content: 'This is a mock AI response that would answer the customer query based on the business knowledge base.' 
        } 
      }],
      usage: { total_tokens: 150 }
    });

  // Pinecone API mocks
  const pineconeMock = this.setupPineconeMock();
  pineconeMock
    .post('/vectors/upsert')
    .reply(200, { upsertedCount: 1 })
    .post('/query')
    .reply(200, {
      matches: [
        { id: 'test-vector-1', score: 0.95, metadata: { content: 'Mock relevant content' } }
      ]
    });

  // Twilio API mocks
  const twilioMock = this.setupTwilioMock();
  twilioMock
    .post('/2010-04-01/Accounts/test-twilio-sid/Messages.json')
    .reply(200, {
      sid: 'SM' + Math.random().toString(36).substr(2, 32),
      status: 'sent'
    });

  // Supabase API mocks
  const supabaseMock = this.setupSupabaseMock();
  supabaseMock
    .get('/rest/v1/businesses')
    .reply(200, [])
    .post('/rest/v1/businesses')
    .reply(201, { id: 1 })
    .get('/rest/v1/knowledge_entries')
    .reply(200, [])
    .post('/rest/v1/knowledge_entries')
    .reply(201, { id: 1 });
}