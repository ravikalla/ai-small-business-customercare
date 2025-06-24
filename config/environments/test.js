module.exports = {
  app: {
    name: 'SBC WhatsApp AI Assistant',
    version: process.env.npm_package_version || '1.0.0',
    env: 'test',
    port: process.env.PORT || 0, // Use random port for testing
    host: '0.0.0.0',
  },

  logging: {
    level: 'error', // Minimal logging during tests
    console: false,
    file: false,
    format: 'simple',
  },

  rateLimit: {
    windowMs: 1000, // Very short window for tests
    max: 1000, // High limit for tests
    message: 'Too many requests from this IP, please try again later.',
  },

  cache: {
    ttl: 1000, // Short TTL for tests
    enabled: false, // Disable caching for consistent test results
  },

  security: {
    cors: {
      origin: true,
      credentials: true,
    },
    helmet: {
      contentSecurityPolicy: false,
    },
  },

  ai: {
    openai: {
      apiKey: 'test-openai-key',
      model: 'gpt-3.5-turbo',
      maxTokens: 50,
      temperature: 0.1,
    },
  },

  vector: {
    pinecone: {
      apiKey: 'test-pinecone-key',
      environment: 'test-env',
      indexName: 'test-index',
    },
  },

  database: {
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-supabase-key',
      retryAttempts: 1,
      retryDelay: 100,
    },
  },

  messaging: {
    twilio: {
      accountSid: 'test-twilio-sid',
      authToken: 'test-twilio-token',
      whatsappNumber: 'whatsapp:+14155238886',
    },
  },

  backup: {
    enabled: false, // Disable backups during testing
    retentionDays: 1,
    intervalHours: 1,
    schedule: '* * * * *',
  },
};
