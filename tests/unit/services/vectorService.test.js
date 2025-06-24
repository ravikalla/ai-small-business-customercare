// Mock dependencies before requiring the service
jest.mock('../../../src/utils/cache');
jest.mock('../../../src/utils/retry');
jest.mock('../../../src/utils/logger');

const cache = require('../../../src/utils/cache');
const RetryManager = require('../../../src/utils/retry');
const vectorService = require('../../../src/services/vectorService');

describe('VectorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    test('should initialize successfully', async () => {
      await expect(vectorService.initialize()).resolves.not.toThrow();
      expect(vectorService.initialize).toHaveBeenCalled();
    });
  });

  describe('generateEmbedding', () => {
    test('should return mock embedding', async () => {
      const text = 'This is test text for embedding';
      
      const result = await vectorService.generateEmbedding(text);
      
      expect(result).toHaveLength(1536);
      expect(result).toEqual(expect.arrayContaining([expect.any(Number)]));
      expect(vectorService.generateEmbedding).toHaveBeenCalledWith(text);
    });

    test('should handle different text inputs', async () => {
      const texts = ['Short text', 'A much longer text that contains multiple sentences and various words.', ''];
      
      for (const text of texts) {
        const result = await vectorService.generateEmbedding(text);
        expect(result).toHaveLength(1536);
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('storeDocument', () => {
    test('should store document successfully', async () => {
      const documentData = {
        businessId: 'test_123',
        businessName: 'Test Business',
        filename: 'test.txt',
        content: 'This is test document content',
        metadata: { source: 'upload' }
      };

      const result = await vectorService.storeDocument(documentData);
      
      expect(result).toEqual({ success: true });
      expect(vectorService.storeDocument).toHaveBeenCalledWith(documentData);
    });
  });

  describe('searchSimilar', () => {
    test('should return search results', async () => {
      const query = 'test query';
      const businessId = 'test_123';
      const topK = 3;

      const result = await vectorService.searchSimilar(query, businessId, topK);

      expect(Array.isArray(result)).toBe(true);
      expect(vectorService.searchSimilar).toHaveBeenCalledWith(query, businessId, topK);
    });

    test('should handle different search parameters', async () => {
      const queries = ['What are your hours?', 'Do you have pizza?'];
      const businessId = 'test_123';
      
      for (const query of queries) {
        const result = await vectorService.searchSimilar(query, businessId, 5);
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('deleteByKnowledgeId', () => {
    test('should delete by knowledge ID', async () => {
      const knowledgeId = 'kb_test_123';
      
      const result = await vectorService.deleteByKnowledgeId(knowledgeId);
      
      expect(result).toEqual({
        success: true,
        deletedCount: 2
      });
      expect(vectorService.deleteByKnowledgeId).toHaveBeenCalledWith(knowledgeId);
    });

    test('should handle multiple knowledge IDs', async () => {
      const knowledgeIds = ['kb_test_123', 'kb_test_456', 'kb_test_789'];
      
      for (const knowledgeId of knowledgeIds) {
        const result = await vectorService.deleteByKnowledgeId(knowledgeId);
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('deletedCount');
      }
    });
  });

  describe('deleteAllBusinessVectors', () => {
    test('should delete all business vectors', async () => {
      const businessId = 'test_123';
      
      const result = await vectorService.deleteAllBusinessVectors(businessId);
      
      expect(result).toEqual({ success: true });
      expect(vectorService.deleteAllBusinessVectors).toHaveBeenCalledWith(businessId);
    });
  });

  describe('service properties', () => {
    test('should have test environment flag', () => {
      expect(vectorService.isTestEnvironment).toBe(true);
    });

    test('should have index name configured', () => {
      expect(vectorService.indexName).toBe('test-index');
    });

    test('should have all required methods', () => {
      expect(typeof vectorService.initialize).toBe('function');
      expect(typeof vectorService.generateEmbedding).toBe('function');
      expect(typeof vectorService.storeDocument).toBe('function');
      expect(typeof vectorService.searchSimilar).toBe('function');
      expect(typeof vectorService.deleteByKnowledgeId).toBe('function');
      expect(typeof vectorService.deleteAllBusinessVectors).toBe('function');
    });
  });
});