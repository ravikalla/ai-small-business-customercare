/**
 * Business Repository - Data Access Layer for Supabase
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const database = require('../config/database');
const logger = require('../utils/logger');
const RetryManager = require('../utils/retry');

class BusinessRepository {
  constructor() {
    this.tableName = 'businesses';
  }

  async create(businessData) {
    try {
      const client = database.getClient();

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .insert([
              {
                business_id: businessData.businessId,
                business_name: businessData.businessName,
                owner_phone: businessData.ownerPhone,
                knowledge_count: businessData.knowledgeCount || 0,
                status: businessData.status || 'active',
                metadata: businessData.metadata || {},
              },
            ])
            .select()
            .single();
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'businessCreate',
        }
      );

      if (error) {
        throw error;
      }

      logger.debug(`[BUSINESS_MODEL] Created business: ${data.business_id}`);
      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error('[BUSINESS_MODEL] Error creating business:', error);
      throw error;
    }
  }

  async findByOwner(phoneNumber) {
    try {
      const client = database.getClient();

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .select('*')
            .eq('owner_phone', phoneNumber)
            .eq('status', 'active')
            .single();
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'businessFindByOwner',
        }
      );

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error(`[BUSINESS_MODEL] Error finding business by owner ${phoneNumber}:`, error);
      throw error;
    }
  }

  async findByBusinessId(businessId) {
    try {
      const client = database.getClient();

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .select('*')
            .eq('business_id', businessId)
            .eq('status', 'active')
            .single();
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'businessFindById',
        }
      );

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error(`[BUSINESS_MODEL] Error finding business by ID ${businessId}:`, error);
      throw error;
    }
  }

  async updateKnowledgeCount(phoneNumber, increment = 1) {
    try {
      const client = database.getClient();

      // First, get current business data
      const currentBusiness = await this.findByOwner(phoneNumber);
      if (!currentBusiness) {
        throw new Error(`Business not found for phone ${phoneNumber}`);
      }

      const newKnowledgeCount = Math.max(0, currentBusiness.knowledgeCount + increment);
      const currentMetadata = currentBusiness.metadata || {};
      const newMetadata = {
        ...currentMetadata,
        totalUploads: (currentMetadata.totalUploads || 0) + (increment > 0 ? 1 : 0),
        lastUpload: increment > 0 ? new Date().toISOString() : currentMetadata.lastUpload,
      };

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .update({
              knowledge_count: newKnowledgeCount,
              last_activity: new Date().toISOString(),
              metadata: newMetadata,
            })
            .eq('owner_phone', phoneNumber)
            .select()
            .single();
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'businessUpdateKnowledgeCount',
        }
      );

      if (error) {
        throw error;
      }

      logger.debug(`[BUSINESS_MODEL] Updated knowledge count for ${phoneNumber}: +${increment}`);
      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error(`[BUSINESS_MODEL] Error updating knowledge count for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async recordQuery(businessId) {
    try {
      const client = database.getClient();

      // First, get current business data
      const currentBusiness = await this.findByBusinessId(businessId);
      if (!currentBusiness) {
        throw new Error(`Business not found for ID ${businessId}`);
      }

      const currentMetadata = currentBusiness.metadata || {};
      const newMetadata = {
        ...currentMetadata,
        totalQueries: (currentMetadata.totalQueries || 0) + 1,
        lastQuery: new Date().toISOString(),
      };

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .update({
              last_activity: new Date().toISOString(),
              metadata: newMetadata,
            })
            .eq('business_id', businessId)
            .select()
            .single();
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'businessRecordQuery',
        }
      );

      if (error) {
        throw error;
      }

      logger.debug(`[BUSINESS_MODEL] Recorded query for business ${businessId}`);
      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error(`[BUSINESS_MODEL] Error recording query for ${businessId}:`, error);
      throw error;
    }
  }

  async getActiveBusinesses() {
    try {
      const client = database.getClient();

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .select('*')
            .eq('status', 'active')
            .order('registered_at', { ascending: false });
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'businessGetActive',
        }
      );

      if (error) {
        throw error;
      }

      return data.map(row => this.mapFromDatabase(row));
    } catch (error) {
      logger.error('[BUSINESS_MODEL] Error getting active businesses:', error);
      throw error;
    }
  }

  async delete(phoneNumber) {
    try {
      const client = database.getClient();

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .update({ status: 'inactive' })
            .eq('owner_phone', phoneNumber)
            .select();
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'businessDelete',
        }
      );

      if (error) {
        throw error;
      }

      logger.debug(`[BUSINESS_MODEL] Soft deleted business for ${phoneNumber}`);
      return data.length > 0;
    } catch (error) {
      logger.error(`[BUSINESS_MODEL] Error deleting business for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async getBusinessStats() {
    try {
      const client = database.getClient();

      // Get basic counts by status
      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client.from(this.tableName).select('status, knowledge_count, metadata');
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'businessGetStats',
        }
      );

      if (error) {
        throw error;
      }

      // Aggregate the data client-side
      const stats = {};

      data.forEach(business => {
        const status = business.status;
        if (!stats[status]) {
          stats[status] = {
            count: 0,
            total_knowledge: 0,
            total_uploads: 0,
            total_queries: 0,
          };
        }

        stats[status].count += 1;
        stats[status].total_knowledge += business.knowledge_count || 0;
        stats[status].total_uploads += business.metadata?.totalUploads || 0;
        stats[status].total_queries += business.metadata?.totalQueries || 0;
      });

      // Convert to array format for compatibility
      return Object.entries(stats).map(([status, data]) => ({
        status,
        count: data.count,
        total_knowledge: data.total_knowledge,
        total_uploads: data.total_uploads,
        total_queries: data.total_queries,
      }));
    } catch (error) {
      logger.error('[BUSINESS_MODEL] Error getting business stats:', error);
      throw error;
    }
  }

  // Map database row to application format
  mapFromDatabase(row) {
    if (!row) {
      return null;
    }

    return {
      businessId: row.business_id,
      businessName: row.business_name,
      ownerPhone: row.owner_phone,
      registeredAt: row.registered_at,
      knowledgeCount: row.knowledge_count,
      status: row.status,
      lastActivity: row.last_activity,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = new BusinessRepository();
