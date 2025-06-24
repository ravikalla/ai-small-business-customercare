module.exports = {
  app: {
    name: 'SBC WhatsApp AI Assistant',
    version: process.env.npm_package_version || '1.0.0',
    env: 'development',
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    console: true,
    file: process.env.LOG_FILE_ENABLED === 'true',
    format: 'combined',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // More lenient for development
    message: 'Too many requests from this IP, please try again later.',
  },

  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 300000, // 5 minutes
    enabled: true,
  },

  security: {
    cors: {
      origin: true, // Allow all origins in development
      credentials: true,
    },
    helmet: {
      contentSecurityPolicy: false, // Disabled for development
    },
  },

  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo',
      maxTokens: 150,
      temperature: 0.7,
    },
  },

  vector: {
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
      indexName: process.env.PINECONE_INDEX_NAME,
    },
  },

  database: {
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      retryAttempts: 3,
      retryDelay: 1000,
    },
  },

  messaging: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
    },
  },

  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    intervalHours: parseInt(process.env.BACKUP_INTERVAL_HOURS) || 24,
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
  },
};
