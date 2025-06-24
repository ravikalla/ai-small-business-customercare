/**
 * Knowledge Repository - Data Access Layer for Supabase
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const database = require('../config/database');
const logger = require('../utils/logger');
const RetryManager = require('../utils/retry');

class KnowledgeRepository {
  constructor() {
    this.tableName = 'knowledge_entries';
  }

  async create(knowledgeData) {
    try {
      const client = database.getClient();

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .insert([
              {
                knowledge_id: knowledgeData.knowledgeId,
                business_id: knowledgeData.businessId,
                business_name: knowledgeData.businessName,
                type: knowledgeData.type,
                filename: knowledgeData.filename,
                file_type: knowledgeData.fileType,
                content_preview: knowledgeData.contentPreview,
                metadata: knowledgeData.metadata || {},
              },
            ])
            .select()
            .single();
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'knowledgeCreate',
        }
      );

      if (error) {
        throw error;
      }

      logger.debug(`[KNOWLEDGE_MODEL] Created knowledge entry: ${data.knowledge_id}`);
      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error('[KNOWLEDGE_MODEL] Error creating knowledge entry:', error);
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
            .order('created_at', { ascending: false });
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'knowledgeFindByBusiness',
        }
      );

      if (error) {
        throw error;
      }

      return data.map(row => this.mapFromDatabase(row));
    } catch (error) {
      logger.error(`[KNOWLEDGE_MODEL] Error finding knowledge by business ${businessId}:`, error);
      throw error;
    }
  }

  async findByKnowledgeId(knowledgeId) {
    try {
      const client = database.getClient();

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .select('*')
            .eq('knowledge_id', knowledgeId)
            .single();
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'knowledgeFindById',
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
      logger.error(`[KNOWLEDGE_MODEL] Error finding knowledge by ID ${knowledgeId}:`, error);
      throw error;
    }
  }

  async delete(knowledgeId, businessId) {
    try {
      const client = database.getClient();

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .delete()
            .eq('knowledge_id', knowledgeId)
            .eq('business_id', businessId)
            .select();
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'knowledgeDelete',
        }
      );

      if (error) {
        throw error;
      }

      logger.debug(`[KNOWLEDGE_MODEL] Deleted knowledge entry: ${knowledgeId}`);
      return data.length > 0;
    } catch (error) {
      logger.error(`[KNOWLEDGE_MODEL] Error deleting knowledge ${knowledgeId}:`, error);
      throw error;
    }
  }

  async getKnowledgeStats(businessId) {
    try {
      const client = database.getClient();

      // Get all knowledge entries for the business
      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client.from(this.tableName).select('type').eq('business_id', businessId);
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'knowledgeGetStats',
        }
      );

      if (error) {
        throw error;
      }

      // Count by type client-side
      const stats = {
        total: data.length,
        text: 0,
        documents: 0,
        images: 0,
      };

      data.forEach(row => {
        if (stats.hasOwnProperty(row.type)) {
          stats[row.type]++;
        }
      });

      return stats;
    } catch (error) {
      logger.error(`[KNOWLEDGE_MODEL] Error getting knowledge stats for ${businessId}:`, error);
      throw error;
    }
  }

  async getBusinessKnowledgePreview(businessId, limit = 10) {
    try {
      const client = database.getClient();

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .select('knowledge_id, type, filename, content_preview, created_at')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })
            .limit(limit);
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'knowledgeGetPreview',
        }
      );

      if (error) {
        throw error;
      }

      return data.map(row => ({
        id: row.knowledge_id,
        type: row.type,
        preview:
          row.type === 'text'
            ? (row.content_preview || '').substring(0, 100) +
              ((row.content_preview || '').length > 100 ? '...' : '')
            : row.filename,
        addedAt: row.created_at,
      }));
    } catch (error) {
      logger.error(`[KNOWLEDGE_MODEL] Error getting knowledge preview for ${businessId}:`, error);
      throw error;
    }
  }

  async deleteByBusinessId(businessId) {
    try {
      const client = database.getClient();

      const { data, error } = await RetryManager.withRetry(
        async () => {
          return await client
            .from(this.tableName)
            .delete()
            .eq('business_id', businessId)
            .select('knowledge_id');
        },
        {
          maxAttempts: 3,
          delayMs: 500,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'knowledgeDeleteByBusiness',
        }
      );

      if (error) {
        throw error;
      }

      logger.debug(
        `[KNOWLEDGE_MODEL] Deleted ${data.length} knowledge entries for business ${businessId}`
      );
      return data.map(row => row.knowledge_id);
    } catch (error) {
      logger.error(`[KNOWLEDGE_MODEL] Error deleting knowledge for business ${businessId}:`, error);
      throw error;
    }
  }

  // Map database row to application format
  mapFromDatabase(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.knowledge_id,
      knowledgeId: row.knowledge_id,
      businessId: row.business_id,
      businessName: row.business_name,
      type: row.type,
      filename: row.filename,
      fileType: row.file_type,
      contentPreview: row.content_preview,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = new KnowledgeRepository();
