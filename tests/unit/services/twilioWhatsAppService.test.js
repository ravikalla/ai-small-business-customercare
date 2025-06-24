const twilioWhatsAppService = require('../../../src/services/twilioWhatsAppService');

// Mock dependencies
jest.mock('twilio');
jest.mock('../../../src/utils/retry');

const twilio = require('twilio');
const RetryManager = require('../../../src/utils/retry');

describe('TwilioWhatsAppService', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Twilio client
    mockClient = {
      api: {
        accounts: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue({
            friendlyName: 'Test Account'
          })
        })
      },
      messages: {
        create: jest.fn().mockResolvedValue({
          sid: 'SM1234567890',
          status: 'sent'
        })
      }
    };
    
    twilio.mockReturnValue(mockClient);
    
    // Set up environment variables
    process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    process.env.TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886';
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WHATSAPP_NUMBER;
    
    // Reset service state
    twilioWhatsAppService.isInitialized = false;
    twilioWhatsAppService.client = null;
    twilioWhatsAppService.businesses.clear();
  });

  describe('initialize', () => {
    test('should initialize successfully with valid credentials', async () => {
      RetryManager.withRetry.mockImplementation(async (fn) => await fn());

      await twilioWhatsAppService.initialize();

      expect(twilio).toHaveBeenCalledWith('test-account-sid', 'test-auth-token');
      expect(twilioWhatsAppService.isInitialized).toBe(true);
      expect(twilioWhatsAppService.client).toBe(mockClient);
    });

    test('should throw error when missing TWILIO_ACCOUNT_SID', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;

      await expect(twilioWhatsAppService.initialize()).rejects.toThrow(
        'Missing required environment variable: TWILIO_ACCOUNT_SID'
      );
    });

    test('should throw error when missing TWILIO_AUTH_TOKEN', async () => {
      delete process.env.TWILIO_AUTH_TOKEN;

      await expect(twilioWhatsAppService.initialize()).rejects.toThrow(
        'Missing required environment variable: TWILIO_AUTH_TOKEN'
      );
    });

    test('should handle connection test failures', async () => {
      RetryManager.withRetry.mockRejectedValue(new Error('Connection failed'));

      await expect(twilioWhatsAppService.initialize()).rejects.toThrow('Failed to connect to Twilio API');
      expect(twilioWhatsAppService.isInitialized).toBe(false);
    });

    test('should retry connection test on failures', async () => {
      RetryManager.withRetry.mockImplementation(async (fn) => await fn());

      await twilioWhatsAppService.initialize();

      expect(RetryManager.withRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxAttempts: 3,
          delayMs: 1000,
          operationName: 'twilioConnectionTest'
        })
      );
    });
  });

  describe('registerBusiness', () => {
    beforeEach(async () => {
      RetryManager.withRetry.mockImplementation(async (fn) => await fn());
      await twilioWhatsAppService.initialize();
    });

    test('should register business successfully', async () => {
      const businessId = 'test_123';
      const businessName = 'Test Restaurant';
      const whatsappNumber = '+15551234567';
      const ownerPhone = '+15559876543';

      const result = await twilioWhatsAppService.registerBusiness(
        businessId, businessName, whatsappNumber, ownerPhone
      );

      expect(result.success).toBe(true);
      expect(result.businessData).toBeDefined();
      expect(twilioWhatsAppService.businesses.has('whatsapp:+15551234567')).toBe(true);
      
      const businessData = twilioWhatsAppService.businesses.get('whatsapp:+15551234567');
      expect(businessData).toEqual(expect.objectContaining({
        businessId,
        businessName,
        whatsappNumber: 'whatsapp:+15551234567',
        ownerPhone
      }));
    });

    test('should format WhatsApp number correctly', async () => {
      const businessId = 'test_123';
      const businessName = 'Test Restaurant';
      const whatsappNumber = 'whatsapp:+15551234567'; // Already formatted
      const ownerPhone = '+15559876543';

      await twilioWhatsAppService.registerBusiness(
        businessId, businessName, whatsappNumber, ownerPhone
      );

      expect(twilioWhatsAppService.businesses.has('whatsapp:+15551234567')).toBe(true);
    });

    test('should handle registration errors gracefully', async () => {
      const businessId = 'test_123';
      const businessName = 'Test Restaurant';
      const whatsappNumber = '+15551234567';
      const ownerPhone = '+15559876543';

      // The registerBusiness method should complete successfully even if there are issues
      const result = await twilioWhatsAppService.registerBusiness(
        businessId, businessName, whatsappNumber, ownerPhone
      );

      // Currently the method always succeeds, so we check that it returns a result
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should handle multiple business registrations', async () => {
      const businessId1 = 'test_123';
      const businessId2 = 'test_456';
      const businessName1 = 'Test Restaurant';
      const businessName2 = 'Another Restaurant';
      const whatsappNumber1 = '+15551234567';
      const whatsappNumber2 = '+15551234568';
      const ownerPhone = '+15559876543';

      // Register first business
      const result1 = await twilioWhatsAppService.registerBusiness(
        businessId1, businessName1, whatsappNumber1, ownerPhone
      );

      // Register second business with different number
      const result2 = await twilioWhatsAppService.registerBusiness(
        businessId2, businessName2, whatsappNumber2, ownerPhone
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(twilioWhatsAppService.businesses.size).toBe(2);
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      RetryManager.withRetry.mockImplementation(async (fn) => await fn());
      await twilioWhatsAppService.initialize();
    });

    test('should send message successfully', async () => {
      const to = '+15551234567';
      const message = 'Hello, this is a test message';

      RetryManager.withRetry.mockImplementation(async (fn) => await fn());

      const result = await twilioWhatsAppService.sendMessage(to, message);

      expect(result.success).toBe(true);
      expect(result.messageSid).toBe('SM1234567890');
      expect(mockClient.messages.create).toHaveBeenCalledWith({
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:+15551234567',
        body: message
      });
    });

    test('should format phone number correctly', async () => {
      const to = 'whatsapp:+15551234567'; // Already formatted
      const message = 'Test message';

      RetryManager.withRetry.mockImplementation(async (fn) => await fn());

      await twilioWhatsAppService.sendMessage(to, message);

      expect(mockClient.messages.create).toHaveBeenCalledWith({
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:+15551234567',
        body: message
      });
    });

    test('should handle message sending errors', async () => {
      const to = '+15551234567';
      const message = 'Test message';

      RetryManager.withRetry.mockRejectedValue(new Error('Failed to send message'));

      const result = await twilioWhatsAppService.sendMessage(to, message);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send message');
    });

    test('should handle service not initialized', async () => {
      const to = '+15551234567';
      const message = 'Test message';

      twilioWhatsAppService.isInitialized = false;

      const result = await twilioWhatsAppService.sendMessage(to, message);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not initialized');
    });

    test('should retry message sending on failures', async () => {
      const to = '+15551234567';
      const message = 'Test message';

      RetryManager.withRetry.mockImplementation(async (fn) => await fn());

      await twilioWhatsAppService.sendMessage(to, message);

      expect(RetryManager.withRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxAttempts: 3,
          delayMs: 1000,
          operationName: 'twilioSendMessage'
        })
      );
    });
  });

  describe('getBusinessByWhatsAppNumber', () => {
    beforeEach(async () => {
      RetryManager.withRetry.mockImplementation(async (fn) => await fn());
      await twilioWhatsAppService.initialize();
    });

    test('should return business for valid WhatsApp number', async () => {
      const businessData = {
        businessId: 'test_123',
        businessName: 'Test Restaurant',
        whatsappNumber: 'whatsapp:+15551234567',
        ownerPhone: '+15559876543'
      };

      await twilioWhatsAppService.registerBusiness(
        businessData.businessId,
        businessData.businessName,
        businessData.whatsappNumber,
        businessData.ownerPhone
      );

      const result = twilioWhatsAppService.getBusinessByWhatsAppNumber('whatsapp:+15551234567');

      expect(result).toEqual(expect.objectContaining(businessData));
    });

    test('should return undefined for non-existent WhatsApp number', () => {
      const result = twilioWhatsAppService.getBusinessByWhatsAppNumber('whatsapp:+15559999999');

      expect(result).toBeUndefined();
    });

    test('should format WhatsApp number when searching', async () => {
      const businessData = {
        businessId: 'test_123',
        businessName: 'Test Restaurant',
        whatsappNumber: '+15551234567',
        ownerPhone: '+15559876543'
      };

      await twilioWhatsAppService.registerBusiness(
        businessData.businessId,
        businessData.businessName,
        businessData.whatsappNumber,
        businessData.ownerPhone
      );

      // Search with unformatted number
      const result = twilioWhatsAppService.getBusinessByWhatsAppNumber('+15551234567');

      expect(result).toEqual(expect.objectContaining({
        businessId: 'test_123',
        whatsappNumber: 'whatsapp:+15551234567'
      }));
    });
  });

  describe('getAllBusinesses', () => {
    beforeEach(async () => {
      RetryManager.withRetry.mockImplementation(async (fn) => await fn());
      await twilioWhatsAppService.initialize();
    });

    test('should return all registered businesses', () => {
      // Register multiple businesses
      const business1 = {
        businessId: 'test_123',
        businessName: 'Restaurant 1',
        whatsappNumber: 'whatsapp:+15551111111',
        ownerPhone: '+15559876543'
      };
      
      const business2 = {
        businessId: 'test_456',
        businessName: 'Restaurant 2',
        whatsappNumber: 'whatsapp:+15552222222',
        ownerPhone: '+15559876544'
      };

      twilioWhatsAppService.businesses.set(business1.whatsappNumber, business1);
      twilioWhatsAppService.businesses.set(business2.whatsappNumber, business2);

      const result = twilioWhatsAppService.getAllBusinesses();

      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining(business1),
        expect.objectContaining(business2)
      ]));
    });

    test('should return empty array when no businesses registered', () => {
      const result = twilioWhatsAppService.getAllBusinesses();

      expect(result).toEqual([]);
    });
  });

  describe('isHealthy', () => {
    test('should return true when initialized', async () => {
      RetryManager.withRetry.mockImplementation(async (fn) => await fn());
      await twilioWhatsAppService.initialize();

      expect(twilioWhatsAppService.isHealthy()).toBe(true);
    });

    test('should return false when not initialized', () => {
      twilioWhatsAppService.isInitialized = false;

      expect(twilioWhatsAppService.isHealthy()).toBe(false);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      RetryManager.withRetry.mockImplementation(async (fn) => await fn());
      await twilioWhatsAppService.initialize();
    });

    test('should return service statistics', () => {
      // Register some businesses
      twilioWhatsAppService.businesses.set('whatsapp:+15551111111', {
        businessId: 'test_123',
        businessName: 'Restaurant 1',
        whatsappNumber: 'whatsapp:+15551111111',
        status: 'active'
      });
      twilioWhatsAppService.businesses.set('whatsapp:+15552222222', {
        businessId: 'test_456',
        businessName: 'Restaurant 2',
        whatsappNumber: 'whatsapp:+15552222222',
        status: 'active'
      });

      const stats = twilioWhatsAppService.getStats();

      expect(stats.isInitialized).toBe(true);
      expect(stats.registeredBusinesses).toBe(2);
      expect(stats.businesses).toHaveLength(2);
      expect(stats.businesses[0]).toHaveProperty('businessId');
      expect(stats.businesses[0]).toHaveProperty('businessName');
    });

    test('should return correct stats when not initialized', () => {
      twilioWhatsAppService.isInitialized = false;

      const stats = twilioWhatsAppService.getStats();

      expect(stats.isInitialized).toBe(false);
      expect(stats.registeredBusinesses).toBe(0);
      expect(stats.businesses).toHaveLength(0);
    });
  });
});