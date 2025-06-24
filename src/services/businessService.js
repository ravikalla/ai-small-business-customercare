/**
 * Business Management Service (Supabase)
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const logger = require('../utils/logger');
const BusinessRepository = require('../repositories/BusinessRepository');

class BusinessService {
  constructor() {
    // No need to load from files anymore - data is in Supabase
  }

  generateBusinessId(businessName) {
    const prefix = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 8);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}_${timestamp}`;
  }

  async registerBusiness(phoneNumber, businessName) {
    logger.info(`[BUSINESS] Registration attempt: ${businessName} for ${phoneNumber}`);

    try {
      // Check if owner is already registered
      const existingBusiness = await BusinessRepository.findByOwner(phoneNumber);
      if (existingBusiness) {
        logger.warn(`[BUSINESS] Registration failed: ${phoneNumber} already has a business`);
        return { success: false, message: 'You already have a registered business' };
      }

      const businessId = this.generateBusinessId(businessName);
      logger.debug(`[BUSINESS] Generated business ID: ${businessId} for ${businessName}`);

      const businessData = {
        businessId,
        businessName,
        ownerPhone: phoneNumber,
        knowledgeCount: 0,
        status: 'active',
        metadata: {
          totalUploads: 0,
          totalQueries: 0,
          lastUpload: null,
          lastQuery: null,
        },
      };

      const createdBusiness = await BusinessRepository.create(businessData);

      logger.success(
        `[BUSINESS] Successfully registered: ${businessName} (${businessId}) for ${phoneNumber}`
      );
      return {
        success: true,
        businessId,
        businessName,
        message: `Business "${businessName}" registered successfully with ID: ${businessId}`,
      };
    } catch (error) {
      logger.error(`[BUSINESS] Error registering business for ${phoneNumber}:`, error);

      // Handle duplicate key errors
      if (error.code === '23505') {
        // PostgreSQL unique violation
        if (error.message.includes('owner_phone')) {
          return { success: false, message: 'You already have a registered business' };
        } else if (error.message.includes('business_id')) {
          // Retry with different ID
          logger.warn(`[BUSINESS] Business ID conflict, retrying for ${phoneNumber}`);
          return await this.registerBusiness(phoneNumber, businessName);
        }
      }

      return { success: false, message: 'Registration failed. Please try again.' };
    }
  }

  async isOwnerRegistered(phoneNumber) {
    try {
      const business = await BusinessRepository.findByOwner(phoneNumber);
      return business !== null;
    } catch (error) {
      logger.error(`[BUSINESS] Error checking if owner registered ${phoneNumber}:`, error);
      return false;
    }
  }

  async getBusinessByOwner(phoneNumber) {
    try {
      return await BusinessRepository.findByOwner(phoneNumber);
    } catch (error) {
      logger.error(`[BUSINESS] Error getting business by owner ${phoneNumber}:`, error);
      return null;
    }
  }

  async getBusinessById(businessId) {
    try {
      return await BusinessRepository.findByBusinessId(businessId);
    } catch (error) {
      logger.error(`[BUSINESS] Error getting business by ID ${businessId}:`, error);
      return null;
    }
  }

  async updateKnowledgeCount(phoneNumber, increment = 1) {
    try {
      const result = await BusinessRepository.updateKnowledgeCount(phoneNumber, increment);
      if (result) {
        logger.debug(
          `[BUSINESS] Updated knowledge count for ${result.businessName}: ${increment > 0 ? '+' : ''}${increment}`
        );
      } else {
        logger.warn(
          `[BUSINESS] Cannot update knowledge count: business not found for ${phoneNumber}`
        );
      }
      return result;
    } catch (error) {
      logger.error(`[BUSINESS] Error updating knowledge count for ${phoneNumber}:`, error);
      return null;
    }
  }

  async recordQuery(businessId) {
    try {
      const result = await BusinessRepository.recordQuery(businessId);
      if (result) {
        logger.debug(`[BUSINESS] Recorded query for business ${result.businessName}`);
      }
      return result;
    } catch (error) {
      logger.error(`[BUSINESS] Error recording query for ${businessId}:`, error);
      return null;
    }
  }

  async getAllBusinesses() {
    try {
      return await BusinessRepository.getActiveBusinesses();
    } catch (error) {
      logger.error('[BUSINESS] Error getting all businesses:', error);
      return [];
    }
  }

  async deleteBusiness(phoneNumber) {
    try {
      const success = await BusinessRepository.delete(phoneNumber);
      if (success) {
        logger.info(`[BUSINESS] Soft deleted business for ${phoneNumber}`);
      }
      return success;
    } catch (error) {
      logger.error(`[BUSINESS] Error deleting business for ${phoneNumber}:`, error);
      return false;
    }
  }

  async getBusinessStats() {
    try {
      return await BusinessRepository.getBusinessStats();
    } catch (error) {
      logger.error('[BUSINESS] Error getting business stats:', error);
      return [];
    }
  }

  // Backward compatibility - synchronous version that calls async
  getBusinessByOwnerSync(phoneNumber) {
    // This is a temporary bridge for existing synchronous calls
    // In production, all calls should be properly awaited
    logger.warn(
      '[BUSINESS] Using deprecated synchronous getBusinessByOwner - please update to async'
    );
    return null; // Return null to force proper async handling
  }
}

module.exports = new BusinessService();
