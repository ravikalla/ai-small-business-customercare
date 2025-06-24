// Mock dependencies before requiring the service
jest.mock('../../../src/models/Knowledge');
jest.mock('../../../src/services/vectorService');
jest.mock('../../../src/utils/cache');
jest.mock('../../../src/utils/logger');

const KnowledgeModel = require('../../../src/models/Knowledge');
const vectorService = require('../../../src/services/vectorService');
const cache = require('../../../src/utils/cache');
const knowledgeService = require('../../../src/services/knowledgeService');

describe('KnowledgeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset KnowledgeModel mocks
    KnowledgeModel.create.mockResolvedValue({});
    KnowledgeModel.findByKnowledgeId.mockResolvedValue(null);
    KnowledgeModel.getBusinessKnowledgePreview.mockResolvedValue([]);
    KnowledgeModel.delete.mockResolvedValue(false);
    KnowledgeModel.getKnowledgeStats.mockResolvedValue({ total: 0, text: 0, documents: 0, images: 0 });
    KnowledgeModel.deleteByBusinessId.mockResolvedValue([]);
    
    // Reset vectorService mocks
    vectorService.storeDocument.mockResolvedValue({ success: true });
    vectorService.deleteByKnowledgeId.mockResolvedValue({ success: true, deletedCount: 1 });
    vectorService.deleteAllBusinessVectors.mockResolvedValue({ success: true });
    
    // Reset cache mocks
    cache.clearBusinessCaches.mockReturnValue(undefined);
  });

  describe('generateKnowledgeId', () => {
    test('should generate knowledge ID with correct format', () => {
      const businessId = 'test_123';
      const knowledgeId = knowledgeService.generateKnowledgeId(businessId);
      
      expect(knowledgeId).toMatch(/^kb_test_123_\d+_[a-z0-9]{3}$/);
    });

    test('should generate unique IDs for multiple calls', () => {
      const businessId = 'test_123';
      const id1 = knowledgeService.generateKnowledgeId(businessId);
      const id2 = knowledgeService.generateKnowledgeId(businessId);
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('addTextKnowledge', () => {
    test('should add text knowledge successfully', async () => {
      const businessId = 'test_123';
      const businessName = 'Test Business';
      const content = 'This is test knowledge content';
      const mockKnowledgeData = {
        knowledgeId: 'kb_test_123_1234567890_abc',
        businessId,
        businessName,
        type: 'text'
      };

      KnowledgeModel.create.mockResolvedValue(mockKnowledgeData);
      vectorService.storeDocument.mockResolvedValue({ success: true });

      const result = await knowledgeService.addTextKnowledge(businessId, businessName, content);

      expect(result.success).toBe(true);
      expect(result.knowledgeId).toMatch(/^kb_test_123_\d+_[a-z0-9]{3}$/);
      expect(result.message).toContain('Added to knowledge base');
      
      expect(KnowledgeModel.create).toHaveBeenCalledWith(expect.objectContaining({
        businessId,
        businessName,
        type: 'text',
        filename: null,
        fileType: null,
        contentPreview: content
      }));
      
      expect(vectorService.storeDocument).toHaveBeenCalledWith(expect.objectContaining({
        businessId,
        businessName,
        content,
        filename: expect.stringMatching(/^text_kb_test_123/)
      }));
    });

    test('should handle long content with preview truncation', async () => {
      const businessId = 'test_123';
      const businessName = 'Test Business';
      const longContent = 'A'.repeat(1000);

      KnowledgeModel.create.mockResolvedValue({});
      vectorService.storeDocument.mockResolvedValue({ success: true });

      await knowledgeService.addTextKnowledge(businessId, businessName, longContent);

      expect(KnowledgeModel.create).toHaveBeenCalledWith(expect.objectContaining({
        contentPreview: 'A'.repeat(500) + '...'
      }));
    });

    test('should handle metadata correctly', async () => {
      const businessId = 'test_123';
      const businessName = 'Test Business';
      const content = 'Test content';
      const metadata = { category: 'faq', custom: 'value' };

      KnowledgeModel.create.mockResolvedValue({});
      vectorService.storeDocument.mockResolvedValue({ success: true });

      await knowledgeService.addTextKnowledge(businessId, businessName, content, metadata);

      expect(KnowledgeModel.create).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({
          source: 'whatsapp', // Service always sets this
          category: 'faq',
          custom: 'value',
          addedAt: expect.any(String),
          fullContentLength: content.length
        })
      }));
    });

    test('should handle database errors', async () => {
      const businessId = 'test_123';
      const businessName = 'Test Business';
      const content = 'Test content';

      KnowledgeModel.create.mockRejectedValue(new Error('Database error'));

      const result = await knowledgeService.addTextKnowledge(businessId, businessName, content);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to add knowledge entry');
    });

    test('should handle vector service errors', async () => {
      const businessId = 'test_123';
      const businessName = 'Test Business';
      const content = 'Test content';

      KnowledgeModel.create.mockResolvedValue({});
      vectorService.storeDocument.mockRejectedValue(new Error('Vector service error'));

      const result = await knowledgeService.addTextKnowledge(businessId, businessName, content);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to add knowledge entry');
    });
  });

  describe('addDocumentKnowledge', () => {
    test('should add document knowledge successfully', async () => {
      const businessId = 'test_123';
      const businessName = 'Test Business';
      const filename = 'test.pdf';
      const content = 'PDF content here';
      const fileType = 'pdf';

      KnowledgeModel.create.mockResolvedValue({});
      vectorService.storeDocument.mockResolvedValue({ success: true });

      const result = await knowledgeService.addDocumentKnowledge(
        businessId, businessName, filename, content, fileType
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain(`Document "${filename}" added`);
      
      expect(KnowledgeModel.create).toHaveBeenCalledWith(expect.objectContaining({
        businessId,
        businessName,
        type: 'document',
        filename,
        fileType,
        contentPreview: content
      }));
    });

    test('should handle document processing errors', async () => {
      const businessId = 'test_123';
      const businessName = 'Test Business';
      const filename = 'test.pdf';
      const content = 'PDF content';
      const fileType = 'pdf';

      KnowledgeModel.create.mockRejectedValue(new Error('Processing error'));

      const result = await knowledgeService.addDocumentKnowledge(
        businessId, businessName, filename, content, fileType
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to process document');
    });
  });

  describe('getBusinessKnowledge', () => {
    test('should return business knowledge entries', async () => {
      const businessId = 'test_123';
      const mockEntries = [
        { knowledgeId: 'kb_1', type: 'text', contentPreview: 'Text 1' },
        { knowledgeId: 'kb_2', type: 'document', filename: 'doc.pdf' }
      ];

      KnowledgeModel.getBusinessKnowledgePreview.mockResolvedValue(mockEntries);

      const result = await knowledgeService.getBusinessKnowledge(businessId);

      expect(result).toEqual(mockEntries);
      expect(KnowledgeModel.getBusinessKnowledgePreview).toHaveBeenCalledWith(businessId);
    });

    test('should return empty array on error', async () => {
      const businessId = 'test_123';

      KnowledgeModel.getBusinessKnowledgePreview.mockRejectedValue(new Error('Database error'));

      const result = await knowledgeService.getBusinessKnowledge(businessId);

      expect(result).toEqual([]);
    });
  });

  describe('deleteKnowledge', () => {
    test('should delete knowledge successfully', async () => {
      const businessId = 'test_123';
      const knowledgeId = 'kb_test_123_1234567890_abc';
      const mockEntry = { knowledgeId, businessId, type: 'text' };

      KnowledgeModel.findByKnowledgeId.mockResolvedValue(mockEntry);
      KnowledgeModel.delete.mockResolvedValue(true);
      vectorService.deleteByKnowledgeId.mockResolvedValue({ 
        success: true, 
        deletedCount: 3 
      });
      cache.clearBusinessCaches.mockResolvedValue();

      const result = await knowledgeService.deleteKnowledge(businessId, knowledgeId);

      expect(result.success).toBe(true);
      expect(result.message).toContain(`Deleted knowledge entry ${knowledgeId}`);
      
      expect(KnowledgeModel.findByKnowledgeId).toHaveBeenCalledWith(knowledgeId);
      expect(KnowledgeModel.delete).toHaveBeenCalledWith(knowledgeId, businessId);
      expect(vectorService.deleteByKnowledgeId).toHaveBeenCalledWith(knowledgeId);
      expect(cache.clearBusinessCaches).toHaveBeenCalledWith(businessId);
    });

    test('should reject deletion for non-existent entry', async () => {
      const businessId = 'test_123';
      const knowledgeId = 'kb_nonexistent';

      KnowledgeModel.findByKnowledgeId.mockResolvedValue(null);

      const result = await knowledgeService.deleteKnowledge(businessId, knowledgeId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Knowledge entry not found or access denied');
      expect(KnowledgeModel.delete).not.toHaveBeenCalled();
    });

    test('should reject deletion for entry from different business', async () => {
      const businessId = 'test_123';
      const knowledgeId = 'kb_test_456_1234567890_abc';
      const mockEntry = { knowledgeId, businessId: 'test_456', type: 'text' };

      KnowledgeModel.findByKnowledgeId.mockResolvedValue(mockEntry);

      const result = await knowledgeService.deleteKnowledge(businessId, knowledgeId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Knowledge entry not found or access denied');
      expect(KnowledgeModel.delete).not.toHaveBeenCalled();
    });

    test('should handle database deletion failure', async () => {
      const businessId = 'test_123';
      const knowledgeId = 'kb_test_123_1234567890_abc';
      const mockEntry = { knowledgeId, businessId, type: 'text' };

      KnowledgeModel.findByKnowledgeId.mockResolvedValue(mockEntry);
      KnowledgeModel.delete.mockResolvedValue(false);

      const result = await knowledgeService.deleteKnowledge(businessId, knowledgeId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to delete knowledge entry');
    });

    test('should continue even if vector deletion fails', async () => {
      const businessId = 'test_123';
      const knowledgeId = 'kb_test_123_1234567890_abc';
      const mockEntry = { knowledgeId, businessId, type: 'text' };

      KnowledgeModel.findByKnowledgeId.mockResolvedValue(mockEntry);
      KnowledgeModel.delete.mockResolvedValue(true);
      vectorService.deleteByKnowledgeId.mockRejectedValue(new Error('Vector error'));
      cache.clearBusinessCaches.mockResolvedValue();

      const result = await knowledgeService.deleteKnowledge(businessId, knowledgeId);

      expect(result.success).toBe(true);
      expect(result.message).toContain(`Deleted knowledge entry ${knowledgeId}`);
    });

    test('should continue even if cache clearing fails', async () => {
      const businessId = 'test_123';
      const knowledgeId = 'kb_test_123_1234567890_abc';
      const mockEntry = { knowledgeId, businessId, type: 'text' };

      KnowledgeModel.findByKnowledgeId.mockResolvedValue(mockEntry);
      KnowledgeModel.delete.mockResolvedValue(true);
      vectorService.deleteByKnowledgeId.mockResolvedValue({ success: true, deletedCount: 1 });
      cache.clearBusinessCaches.mockImplementation(() => {
        throw new Error('Cache error');
      });

      const result = await knowledgeService.deleteKnowledge(businessId, knowledgeId);

      expect(result.success).toBe(true);
      expect(result.message).toContain(`Deleted knowledge entry ${knowledgeId}`);
    });
  });

  describe('getKnowledgeStats', () => {
    test('should return knowledge statistics', async () => {
      const businessId = 'test_123';
      const mockStats = {
        total: 10,
        text: 6,
        documents: 4,
        images: 0
      };

      KnowledgeModel.getKnowledgeStats.mockResolvedValue(mockStats);

      const result = await knowledgeService.getKnowledgeStats(businessId);

      expect(result).toEqual(mockStats);
      expect(KnowledgeModel.getKnowledgeStats).toHaveBeenCalledWith(businessId);
    });

    test('should return default stats on error', async () => {
      const businessId = 'test_123';

      KnowledgeModel.getKnowledgeStats.mockRejectedValue(new Error('Database error'));

      const result = await knowledgeService.getKnowledgeStats(businessId);

      expect(result).toEqual({
        total: 0,
        text: 0,
        documents: 0,
        images: 0
      });
    });
  });

  describe('getKnowledgeById', () => {
    test('should return knowledge entry by ID', async () => {
      const knowledgeId = 'kb_test_123_1234567890_abc';
      const mockEntry = { knowledgeId, businessId: 'test_123', type: 'text' };

      KnowledgeModel.findByKnowledgeId.mockResolvedValue(mockEntry);

      const result = await knowledgeService.getKnowledgeById(knowledgeId);

      expect(result).toEqual(mockEntry);
      expect(KnowledgeModel.findByKnowledgeId).toHaveBeenCalledWith(knowledgeId);
    });

    test('should return null on error', async () => {
      const knowledgeId = 'kb_test_123_1234567890_abc';

      KnowledgeModel.findByKnowledgeId.mockRejectedValue(new Error('Database error'));

      const result = await knowledgeService.getKnowledgeById(knowledgeId);

      expect(result).toBeNull();
    });
  });

  describe('deleteAllBusinessKnowledge', () => {
    test('should delete all business knowledge successfully', async () => {
      const businessId = 'test_123';
      const deletedIds = ['kb_1', 'kb_2', 'kb_3'];

      KnowledgeModel.deleteByBusinessId.mockResolvedValue(deletedIds);
      vectorService.deleteAllBusinessVectors.mockResolvedValue({ success: true });

      const result = await knowledgeService.deleteAllBusinessKnowledge(businessId);

      expect(result).toEqual(deletedIds);
      expect(KnowledgeModel.deleteByBusinessId).toHaveBeenCalledWith(businessId);
      expect(vectorService.deleteAllBusinessVectors).toHaveBeenCalledWith(businessId);
    });

    test('should continue even if vector deletion fails', async () => {
      const businessId = 'test_123';
      const deletedIds = ['kb_1', 'kb_2'];

      KnowledgeModel.deleteByBusinessId.mockResolvedValue(deletedIds);
      vectorService.deleteAllBusinessVectors.mockRejectedValue(new Error('Vector error'));

      const result = await knowledgeService.deleteAllBusinessKnowledge(businessId);

      expect(result).toEqual(deletedIds);
    });

    test('should return empty array on error', async () => {
      const businessId = 'test_123';

      KnowledgeModel.deleteByBusinessId.mockRejectedValue(new Error('Database error'));

      const result = await knowledgeService.deleteAllBusinessKnowledge(businessId);

      expect(result).toEqual([]);
    });
  });
});