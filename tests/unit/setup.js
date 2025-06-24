// Jest globals are automatically available

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.PINECONE_API_KEY = 'test-pinecone-key';
process.env.PINECONE_INDEX_NAME = 'test-index';
process.env.PINECONE_ENVIRONMENT = 'test-env';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-supabase-key';
process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
process.env.TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886';

// Global test utilities
global.mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

global.mockRequest = (body = {}, query = {}, params = {}) => {
  return {
    body,
    query,
    params,
    headers: {},
    ip: '127.0.0.1',
  };
};

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  success: jest.fn(),
}));

// Mock database repositories
jest.mock('../../src/repositories/BusinessRepository', () => ({
  findByOwner: jest.fn(),
  create: jest.fn(),
  findByBusinessId: jest.fn(),
  updateKnowledgeCount: jest.fn(),
  recordQuery: jest.fn(),
  getActiveBusinesses: jest.fn(),
  delete: jest.fn(),
  getBusinessStats: jest.fn(),
}));

jest.mock('../../src/repositories/KnowledgeRepository', () => ({
  create: jest.fn(),
  findByKnowledgeId: jest.fn(),
  getBusinessKnowledgePreview: jest.fn(),
  delete: jest.fn(),
  getKnowledgeStats: jest.fn(),
  deleteByBusinessId: jest.fn(),
}));

// Mock old model paths for backward compatibility
jest.mock('../../src/models/Business', () => require('../../src/repositories/BusinessRepository'));
jest.mock('../../src/models/Knowledge', () =>
  require('../../src/repositories/KnowledgeRepository')
);

// Mock services
jest.mock('../../src/services/vectorService', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  storeDocument: jest.fn().mockResolvedValue({ success: true }),
  searchSimilar: jest.fn().mockResolvedValue([]),
  deleteByKnowledgeId: jest.fn().mockResolvedValue({ success: true, deletedCount: 2 }),
  deleteAllBusinessVectors: jest.fn().mockResolvedValue({ success: true }),
  generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  isTestEnvironment: true,
  indexName: 'test-index',
}));

// Mock utilities
jest.mock('../../src/utils/cache', () => ({
  getCachedResponse: jest.fn(),
  cacheResponse: jest.fn(),
  getCachedEmbedding: jest.fn(),
  cacheEmbedding: jest.fn(),
  getCachedSearch: jest.fn(),
  cacheSearch: jest.fn(),
  clearBusinessCaches: jest.fn(),
  clear: jest.fn(),
  getStats: jest.fn(),
}));

jest.mock('../../src/utils/retry', () => ({
  withRetry: jest.fn(),
  withCircuitBreaker: jest.fn(),
  isRetryableError: jest.fn(),
}));

// Mock external dependencies
jest.mock('twilio', () =>
  jest.fn(() => ({
    api: {
      accounts: jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue({
          friendlyName: 'Test Account',
        }),
      }),
    },
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'SM1234567890',
        status: 'sent',
      }),
    },
  }))
);

// Global test timeout
jest.setTimeout(10000);
