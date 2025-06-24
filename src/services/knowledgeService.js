/**
 * Knowledge Base Management Service (Supabase)
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const logger = require('../utils/logger');
const KnowledgeModel = require('../models/Knowledge');
const vectorService = require('./vectorService');

class KnowledgeService {
  constructor() {
    // No need to load from files anymore - data is in Supabase
  }

  generateKnowledgeId(businessId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 5);
    return `kb_${businessId}_${timestamp}_${random}`;
  }

  async addTextKnowledge(businessId, businessName, content, metadata = {}) {
    try {
      logger.info(
        `[KNOWLEDGE] Adding text knowledge for ${businessName} (${content.length} chars)`
      );

      const knowledgeId = this.generateKnowledgeId(businessId);
      logger.debug(`[KNOWLEDGE] Generated knowledge ID: ${knowledgeId}`);

      const knowledgeData = {
        knowledgeId,
        businessId,
        businessName,
        type: 'text',
        filename: null,
        fileType: null,
        contentPreview: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        metadata: {
          ...metadata,
          addedAt: new Date().toISOString(),
          source: 'whatsapp',
          fullContentLength: content.length,
        },
      };

      // Store in Supabase database
      await KnowledgeModel.create(knowledgeData);

      // Store in vector database with full content
      logger.debug(`[KNOWLEDGE] Storing in vector database: ${knowledgeId}`);
      await vectorService.storeDocument({
        businessId,
        businessName,
        filename: `text_${knowledgeId}`,
        content,
        metadata: knowledgeData.metadata,
      });

      logger.success(
        `[KNOWLEDGE] Successfully added text knowledge: ${knowledgeId} for ${businessName}`
      );
      return {
        success: true,
        knowledgeId,
        message: `Added to knowledge base (ID: ${knowledgeId})`,
      };
    } catch (error) {
      logger.error(`[KNOWLEDGE] Error adding text knowledge for ${businessName}:`, error);
      return {
        success: false,
        message: 'Failed to add knowledge entry',
      };
    }
  }

  async addDocumentKnowledge(businessId, businessName, filename, content, fileType, metadata = {}) {
    try {
      logger.info(`[KNOWLEDGE] Adding document knowledge for ${businessName}: ${filename}`);

      const knowledgeId = this.generateKnowledgeId(businessId);
      logger.debug(`[KNOWLEDGE] Generated knowledge ID: ${knowledgeId}`);

      const knowledgeData = {
        knowledgeId,
        businessId,
        businessName,
        type: 'document',
        filename,
        fileType,
        contentPreview: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        metadata: {
          ...metadata,
          addedAt: new Date().toISOString(),
          source: 'whatsapp',
          fullContentStored: true,
          fullContentLength: content.length,
        },
      };

      // Store in Supabase database
      await KnowledgeModel.create(knowledgeData);

      // Store full content in vector database
      logger.debug(`[KNOWLEDGE] Storing document in vector database: ${knowledgeId}`);
      await vectorService.storeDocument({
        businessId,
        businessName,
        filename,
        content,
        metadata: knowledgeData.metadata,
      });

      logger.success(
        `[KNOWLEDGE] Successfully added document knowledge: ${knowledgeId} for ${businessName}`
      );
      return {
        success: true,
        knowledgeId,
        message: `Document "${filename}" added to knowledge base (ID: ${knowledgeId})`,
      };
    } catch (error) {
      logger.error(`[KNOWLEDGE] Error adding document knowledge for ${businessName}:`, error);
      return {
        success: false,
        message: 'Failed to process document',
      };
    }
  }

  async getBusinessKnowledge(businessId) {
    try {
      return await KnowledgeModel.getBusinessKnowledgePreview(businessId);
    } catch (error) {
      logger.error(`[KNOWLEDGE] Error getting business knowledge for ${businessId}:`, error);
      return [];
    }
  }

  async deleteKnowledge(businessId, knowledgeId) {
    try {
      // Verify the knowledge entry exists and belongs to the business
      const entry = await KnowledgeModel.findByKnowledgeId(knowledgeId);

      if (!entry || entry.businessId !== businessId) {
        return {
          success: false,
          message: 'Knowledge entry not found or access denied',
        };
      }

      // Delete from Supabase
      const deleted = await KnowledgeModel.delete(knowledgeId, businessId);

      if (!deleted) {
        return {
          success: false,
          message: 'Failed to delete knowledge entry',
        };
      }

      // Delete from vector database
      logger.debug(`[KNOWLEDGE] Deleting vectors for knowledge ${knowledgeId}`);
      try {
        const vectorResult = await vectorService.deleteByKnowledgeId(knowledgeId);
        if (vectorResult.success) {
          logger.success(
            `[KNOWLEDGE] Deleted ${vectorResult.deletedCount} vector chunks for ${knowledgeId}`
          );
        } else {
          logger.warn(
            `[KNOWLEDGE] Failed to delete vectors for ${knowledgeId}: ${vectorResult.error}`
          );
        }
      } catch (vectorError) {
        logger.error(`[KNOWLEDGE] Error deleting vectors for ${knowledgeId}:`, vectorError);
        // Don't fail the overall operation if vector deletion fails
      }

      // Clear related caches to prevent stale responses
      logger.debug(`[KNOWLEDGE] Clearing caches for business ${businessId}`);
      try {
        const cache = require('../utils/cache');
        cache.clearBusinessCaches(businessId);
        logger.success(`[KNOWLEDGE] Cleared caches for business ${businessId}`);
      } catch (cacheError) {
        logger.warn(`[KNOWLEDGE] Error clearing caches: ${cacheError.message}`);
      }

      logger.success(`[KNOWLEDGE] Successfully deleted knowledge entry: ${knowledgeId}`);
      return {
        success: true,
        message: `Deleted knowledge entry ${knowledgeId}`,
      };
    } catch (error) {
      logger.error(`[KNOWLEDGE] Error deleting knowledge ${knowledgeId}:`, error);
      return {
        success: false,
        message: 'Failed to delete knowledge entry',
      };
    }
  }

  async getKnowledgeStats(businessId) {
    try {
      return await KnowledgeModel.getKnowledgeStats(businessId);
    } catch (error) {
      logger.error(`[KNOWLEDGE] Error getting knowledge stats for ${businessId}:`, error);
      return {
        total: 0,
        text: 0,
        documents: 0,
        images: 0,
      };
    }
  }

  // Additional utility methods for Supabase version

  async getKnowledgeById(knowledgeId) {
    try {
      return await KnowledgeModel.findByKnowledgeId(knowledgeId);
    } catch (error) {
      logger.error(`[KNOWLEDGE] Error getting knowledge by ID ${knowledgeId}:`, error);
      return null;
    }
  }

  async deleteAllBusinessKnowledge(businessId) {
    try {
      const deletedIds = await KnowledgeModel.deleteByBusinessId(businessId);
      logger.info(
        `[KNOWLEDGE] Deleted ${deletedIds.length} knowledge entries for business ${businessId}`
      );

      // Delete from vector database
      logger.debug(`[KNOWLEDGE] Deleting all vectors for business ${businessId}`);
      try {
        const vectorResult = await vectorService.deleteAllBusinessVectors(businessId);
        if (vectorResult.success) {
          logger.success(`[KNOWLEDGE] Deleted all vector chunks for business ${businessId}`);
        } else {
          logger.warn(
            `[KNOWLEDGE] Failed to delete vectors for business ${businessId}: ${vectorResult.error}`
          );
        }
      } catch (vectorError) {
        logger.error(`[KNOWLEDGE] Error deleting vectors for business ${businessId}:`, vectorError);
        // Don't fail the overall operation if vector deletion fails
      }

      return deletedIds;
    } catch (error) {
      logger.error(`[KNOWLEDGE] Error deleting all knowledge for business ${businessId}:`, error);
      return [];
    }
  }
}

module.exports = new KnowledgeService();
