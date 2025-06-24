// Mock dependencies before requiring the service
jest.mock('../../../src/models/Business');
jest.mock('../../../src/utils/logger');

const BusinessModel = require('../../../src/models/Business');
const businessService = require('../../../src/services/businessService');

describe('BusinessService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all BusinessModel mocks to default values
    BusinessModel.findByOwner.mockResolvedValue(null);
    BusinessModel.create.mockResolvedValue({});
    BusinessModel.findByBusinessId.mockResolvedValue(null);
    BusinessModel.updateKnowledgeCount.mockResolvedValue(null);
    BusinessModel.recordQuery.mockResolvedValue(null);
    BusinessModel.getActiveBusinesses.mockResolvedValue([]);
    BusinessModel.delete.mockResolvedValue(false);
    BusinessModel.getBusinessStats.mockResolvedValue([]);
  });

  describe('generateBusinessId', () => {
    test('should generate business ID with valid format', () => {
      const businessName = 'Test Restaurant & Cafe';
      const businessId = businessService.generateBusinessId(businessName);

      expect(businessId).toMatch(/^testrest_\d{4}$/);
      expect(businessId.length).toBeLessThanOrEqual(13);
    });

    test('should handle special characters in business name', () => {
      const businessName = 'ABC-123 @#$%';
      const businessId = businessService.generateBusinessId(businessName);

      expect(businessId).toMatch(/^abc123_\d{4}$/);
    });

    test('should handle empty business name', () => {
      const businessName = '';
      const businessId = businessService.generateBusinessId(businessName);

      expect(businessId).toMatch(/^_\d{4}$/);
    });
  });

  describe('registerBusiness', () => {
    test('should register new business successfully', async () => {
      const phoneNumber = '+15551234567';
      const businessName = 'Test Restaurant';
      const mockBusinessData = {
        businessId: 'testrest_1234',
        businessName,
        ownerPhone: phoneNumber,
        status: 'active',
      };

      BusinessModel.findByOwner.mockResolvedValue(null);
      BusinessModel.create.mockResolvedValue(mockBusinessData);

      const result = await businessService.registerBusiness(phoneNumber, businessName);

      expect(result.success).toBe(true);
      expect(result.businessId).toMatch(/^testrest_\d{4}$/);
      expect(result.businessName).toBe(businessName);
      expect(BusinessModel.findByOwner).toHaveBeenCalledWith(phoneNumber);
      expect(BusinessModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName,
          ownerPhone: phoneNumber,
          knowledgeCount: 0,
          status: 'active',
        })
      );
    });

    test('should reject registration for existing owner', async () => {
      const phoneNumber = '+15551234567';
      const businessName = 'Test Restaurant';
      const existingBusiness = { businessId: 'existing_123', businessName: 'Existing Business' };

      BusinessModel.findByOwner.mockResolvedValue(existingBusiness);

      const result = await businessService.registerBusiness(phoneNumber, businessName);

      expect(result.success).toBe(false);
      expect(result.message).toBe('You already have a registered business');
      expect(BusinessModel.create).not.toHaveBeenCalled();
    });

    test('should handle duplicate business ID error with retry', async () => {
      const phoneNumber = '+15551234567';
      const businessName = 'Test Restaurant';
      const duplicateError = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      duplicateError.message = 'duplicate key value violates unique constraint "business_id"';

      BusinessModel.findByOwner.mockResolvedValue(null);
      BusinessModel.create
        .mockRejectedValueOnce(duplicateError)
        .mockResolvedValueOnce({ businessId: 'testrest_5678', businessName });

      const result = await businessService.registerBusiness(phoneNumber, businessName);

      expect(result.success).toBe(true);
      expect(BusinessModel.create).toHaveBeenCalledTimes(2);
    });

    test('should handle duplicate owner phone error', async () => {
      const phoneNumber = '+15551234567';
      const businessName = 'Test Restaurant';
      const duplicateError = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      duplicateError.message = 'duplicate key value violates unique constraint "owner_phone"';

      BusinessModel.findByOwner.mockResolvedValue(null);
      BusinessModel.create.mockRejectedValue(duplicateError);

      const result = await businessService.registerBusiness(phoneNumber, businessName);

      expect(result.success).toBe(false);
      expect(result.message).toBe('You already have a registered business');
    });

    test('should handle general database errors', async () => {
      const phoneNumber = '+15551234567';
      const businessName = 'Test Restaurant';
      const generalError = new Error('Database connection failed');

      BusinessModel.findByOwner.mockResolvedValue(null);
      BusinessModel.create.mockRejectedValue(generalError);

      const result = await businessService.registerBusiness(phoneNumber, businessName);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Registration failed. Please try again.');
    });
  });

  describe('isOwnerRegistered', () => {
    test('should return true for registered owner', async () => {
      const phoneNumber = '+15551234567';
      const mockBusiness = { businessId: 'test_123' };

      BusinessModel.findByOwner.mockResolvedValue(mockBusiness);

      const result = await businessService.isOwnerRegistered(phoneNumber);

      expect(result).toBe(true);
      expect(BusinessModel.findByOwner).toHaveBeenCalledWith(phoneNumber);
    });

    test('should return false for unregistered owner', async () => {
      const phoneNumber = '+15551234567';

      BusinessModel.findByOwner.mockResolvedValue(null);

      const result = await businessService.isOwnerRegistered(phoneNumber);

      expect(result).toBe(false);
    });

    test('should return false on database error', async () => {
      const phoneNumber = '+15551234567';

      BusinessModel.findByOwner.mockRejectedValue(new Error('Database error'));

      const result = await businessService.isOwnerRegistered(phoneNumber);

      expect(result).toBe(false);
    });
  });

  describe('getBusinessByOwner', () => {
    test('should return business for valid owner', async () => {
      const phoneNumber = '+15551234567';
      const mockBusiness = { businessId: 'test_123', businessName: 'Test Business' };

      BusinessModel.findByOwner.mockResolvedValue(mockBusiness);

      const result = await businessService.getBusinessByOwner(phoneNumber);

      expect(result).toEqual(mockBusiness);
      expect(BusinessModel.findByOwner).toHaveBeenCalledWith(phoneNumber);
    });

    test('should return null for non-existent owner', async () => {
      const phoneNumber = '+15551234567';

      BusinessModel.findByOwner.mockResolvedValue(null);

      const result = await businessService.getBusinessByOwner(phoneNumber);

      expect(result).toBeNull();
    });

    test('should return null on database error', async () => {
      const phoneNumber = '+15551234567';

      BusinessModel.findByOwner.mockRejectedValue(new Error('Database error'));

      const result = await businessService.getBusinessByOwner(phoneNumber);

      expect(result).toBeNull();
    });
  });

  describe('getBusinessById', () => {
    test('should return business for valid ID', async () => {
      const businessId = 'test_123';
      const mockBusiness = { businessId, businessName: 'Test Business' };

      BusinessModel.findByBusinessId.mockResolvedValue(mockBusiness);

      const result = await businessService.getBusinessById(businessId);

      expect(result).toEqual(mockBusiness);
      expect(BusinessModel.findByBusinessId).toHaveBeenCalledWith(businessId);
    });

    test('should return null for non-existent business ID', async () => {
      const businessId = 'nonexistent_123';

      BusinessModel.findByBusinessId.mockResolvedValue(null);

      const result = await businessService.getBusinessById(businessId);

      expect(result).toBeNull();
    });

    test('should return null on database error', async () => {
      const businessId = 'test_123';

      BusinessModel.findByBusinessId.mockRejectedValue(new Error('Database error'));

      const result = await businessService.getBusinessById(businessId);

      expect(result).toBeNull();
    });
  });

  describe('updateKnowledgeCount', () => {
    test('should update knowledge count successfully', async () => {
      const phoneNumber = '+15551234567';
      const increment = 1;
      const mockBusiness = { businessId: 'test_123', businessName: 'Test Business' };

      BusinessModel.updateKnowledgeCount.mockResolvedValue(mockBusiness);

      const result = await businessService.updateKnowledgeCount(phoneNumber, increment);

      expect(result).toEqual(mockBusiness);
      expect(BusinessModel.updateKnowledgeCount).toHaveBeenCalledWith(phoneNumber, increment);
    });

    test('should use default increment of 1', async () => {
      const phoneNumber = '+15551234567';
      const mockBusiness = { businessId: 'test_123', businessName: 'Test Business' };

      BusinessModel.updateKnowledgeCount.mockResolvedValue(mockBusiness);

      await businessService.updateKnowledgeCount(phoneNumber);

      expect(BusinessModel.updateKnowledgeCount).toHaveBeenCalledWith(phoneNumber, 1);
    });

    test('should handle negative increments', async () => {
      const phoneNumber = '+15551234567';
      const increment = -1;
      const mockBusiness = { businessId: 'test_123', businessName: 'Test Business' };

      BusinessModel.updateKnowledgeCount.mockResolvedValue(mockBusiness);

      const result = await businessService.updateKnowledgeCount(phoneNumber, increment);

      expect(result).toEqual(mockBusiness);
      expect(BusinessModel.updateKnowledgeCount).toHaveBeenCalledWith(phoneNumber, increment);
    });

    test('should return null when business not found', async () => {
      const phoneNumber = '+15551234567';

      BusinessModel.updateKnowledgeCount.mockResolvedValue(null);

      const result = await businessService.updateKnowledgeCount(phoneNumber);

      expect(result).toBeNull();
    });

    test('should return null on database error', async () => {
      const phoneNumber = '+15551234567';

      BusinessModel.updateKnowledgeCount.mockRejectedValue(new Error('Database error'));

      const result = await businessService.updateKnowledgeCount(phoneNumber);

      expect(result).toBeNull();
    });
  });

  describe('recordQuery', () => {
    test('should record query successfully', async () => {
      const businessId = 'test_123';
      const mockBusiness = { businessId, businessName: 'Test Business' };

      BusinessModel.recordQuery.mockResolvedValue(mockBusiness);

      const result = await businessService.recordQuery(businessId);

      expect(result).toEqual(mockBusiness);
      expect(BusinessModel.recordQuery).toHaveBeenCalledWith(businessId);
    });

    test('should return null on database error', async () => {
      const businessId = 'test_123';

      BusinessModel.recordQuery.mockRejectedValue(new Error('Database error'));

      const result = await businessService.recordQuery(businessId);

      expect(result).toBeNull();
    });
  });

  describe('getAllBusinesses', () => {
    test('should return all active businesses', async () => {
      const mockBusinesses = [
        { businessId: 'test_123', businessName: 'Test Business 1' },
        { businessId: 'test_456', businessName: 'Test Business 2' },
      ];

      BusinessModel.getActiveBusinesses.mockResolvedValue(mockBusinesses);

      const result = await businessService.getAllBusinesses();

      expect(result).toEqual(mockBusinesses);
      expect(BusinessModel.getActiveBusinesses).toHaveBeenCalled();
    });

    test('should return empty array on database error', async () => {
      BusinessModel.getActiveBusinesses.mockRejectedValue(new Error('Database error'));

      const result = await businessService.getAllBusinesses();

      expect(result).toEqual([]);
    });
  });

  describe('deleteBusiness', () => {
    test('should delete business successfully', async () => {
      const phoneNumber = '+15551234567';

      BusinessModel.delete.mockResolvedValue(true);

      const result = await businessService.deleteBusiness(phoneNumber);

      expect(result).toBe(true);
      expect(BusinessModel.delete).toHaveBeenCalledWith(phoneNumber);
    });

    test('should return false when business not found', async () => {
      const phoneNumber = '+15551234567';

      BusinessModel.delete.mockResolvedValue(false);

      const result = await businessService.deleteBusiness(phoneNumber);

      expect(result).toBe(false);
    });

    test('should return false on database error', async () => {
      const phoneNumber = '+15551234567';

      BusinessModel.delete.mockRejectedValue(new Error('Database error'));

      const result = await businessService.deleteBusiness(phoneNumber);

      expect(result).toBe(false);
    });
  });

  describe('getBusinessStats', () => {
    test('should return business statistics', async () => {
      const mockStats = [
        { businessId: 'test_123', totalQueries: 10, knowledgeCount: 5 },
        { businessId: 'test_456', totalQueries: 20, knowledgeCount: 8 },
      ];

      BusinessModel.getBusinessStats.mockResolvedValue(mockStats);

      const result = await businessService.getBusinessStats();

      expect(result).toEqual(mockStats);
      expect(BusinessModel.getBusinessStats).toHaveBeenCalled();
    });

    test('should return empty array on database error', async () => {
      BusinessModel.getBusinessStats.mockRejectedValue(new Error('Database error'));

      const result = await businessService.getBusinessStats();

      expect(result).toEqual([]);
    });
  });

  describe('getBusinessByOwnerSync (deprecated)', () => {
    test('should return null and log warning', () => {
      const phoneNumber = '+15551234567';

      const result = businessService.getBusinessByOwnerSync(phoneNumber);

      expect(result).toBeNull();
    });
  });
});
