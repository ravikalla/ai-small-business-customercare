/**
 * Vector Database Service
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
const logger = require('../utils/logger');
const RetryManager = require('../utils/retry');
const cache = require('../utils/cache');

class VectorService {
  constructor() {
    this.isTestEnvironment =
      process.env.NODE_ENV === 'test' ||
      !process.env.PINECONE_API_KEY ||
      process.env.PINECONE_API_KEY === 'test-key';

    if (this.isTestEnvironment) {
      logger.info('[VECTOR] Running in test mode - vector operations will be mocked');
      this.pinecone = null;
      this.openai = null;
    } else {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    this.indexName = process.env.PINECONE_INDEX_NAME || 'small-business-kb';
  }

  async initialize() {
    try {
      if (this.isTestEnvironment) {
        logger.info('[VECTOR] Test mode - skipping real vector service initialization');
        return;
      }
      this.index = this.pinecone.index(this.indexName);
      logger.success('Vector service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize vector service:', error);
    }
  }

  async generateEmbedding(text) {
    // Return mock embedding in test mode
    if (this.isTestEnvironment) {
      logger.debug(`[VECTOR] Test mode - returning mock embedding for ${text.length} characters`);
      return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }

    // Check cache first
    const cachedEmbedding = cache.getCachedEmbedding(text);
    if (cachedEmbedding) {
      logger.debug(`[VECTOR] Using cached embedding for ${text.length} characters`);
      return cachedEmbedding;
    }

    const embedding = await RetryManager.withRetry(
      async () => {
        logger.debug(`[VECTOR] Generating embedding for ${text.length} characters`);
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
        });
        logger.debug(
          `[VECTOR] Successfully generated embedding with ${response.data[0].embedding.length} dimensions`
        );
        return response.data[0].embedding;
      },
      {
        maxAttempts: 3,
        delayMs: 1000,
        retryCondition: RetryManager.isRetryableError,
        operationName: 'generateEmbedding',
      }
    );

    // Cache the embedding
    cache.cacheEmbedding(text, embedding);
    return embedding;
  }

  async storeDocument({ businessId, businessName, filename, content, metadata }) {
    try {
      logger.info(
        `[VECTOR] Storing document: ${filename} for business ${businessId} (${businessName})`
      );
      logger.debug(`[VECTOR] Document content: ${content.length} characters`);

      if (this.isTestEnvironment) {
        logger.info(`[VECTOR] Test mode - simulating document storage for ${filename}`);
        return;
      }

      if (!this.index) {
        await this.initialize();
      }

      const chunks = this.chunkText(content, 1000);
      logger.info(`[VECTOR] Split document into ${chunks.length} chunks`);

      const vectors = [];

      for (let i = 0; i < chunks.length; i++) {
        logger.debug(
          `[VECTOR] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`
        );
        const embedding = await this.generateEmbedding(chunks[i]);
        vectors.push({
          id: `${businessId}-${filename}-${i}`,
          values: embedding,
          metadata: {
            businessId,
            businessName,
            filename,
            content: chunks[i],
            chunkIndex: i,
            ...metadata,
          },
        });
      }

      logger.info(`[VECTOR] Upserting ${vectors.length} vectors to Pinecone index`);
      await RetryManager.withRetry(
        async () => {
          return await this.index.upsert(vectors);
        },
        {
          maxAttempts: 3,
          delayMs: 2000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'pineconeUpsert',
        }
      );
      logger.success(`[VECTOR] Successfully stored ${vectors.length} chunks for ${filename}`);
    } catch (error) {
      logger.error(`[VECTOR] Error storing document ${filename}:`, error);
      throw error;
    }
  }

  async searchSimilar(query, businessId, topK = 5) {
    try {
      logger.info(`[VECTOR] Searching for "${query}" in business ${businessId} (top ${topK})`);

      if (this.isTestEnvironment) {
        logger.info(`[VECTOR] Test mode - returning mock search results for "${query}"`);
        return [
          {
            content: `Mock search result for query: ${query}`,
            score: 0.85,
            filename: 'test-document.txt',
          },
        ];
      }

      // Check cache first
      const cachedResults = cache.getCachedSearchResults(businessId, query);
      if (cachedResults) {
        logger.debug(`[VECTOR] Using cached search results for "${query}"`);
        return cachedResults;
      }

      if (!this.index) {
        await this.initialize();
      }

      logger.debug(`[VECTOR] Generating query embedding for: "${query.substring(0, 50)}..."`);
      const queryEmbedding = await this.generateEmbedding(query);

      logger.debug(`[VECTOR] Querying Pinecone index with filter: businessId=${businessId}`);
      const searchResponse = await RetryManager.withRetry(
        async () => {
          return await this.index.query({
            vector: queryEmbedding,
            topK,
            filter: { businessId },
            includeMetadata: true,
          });
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'pineconeQuery',
        }
      );

      logger.info(`[VECTOR] Found ${searchResponse.matches.length} similar documents`);

      if (searchResponse.matches.length > 0) {
        searchResponse.matches.forEach((match, i) => {
          logger.debug(
            `[VECTOR] Match ${i + 1}: Score=${match.score.toFixed(3)}, File=${match.metadata.filename}, Content="${match.metadata.content?.substring(0, 100)}..."`
          );
        });
      } else {
        logger.warn(`[VECTOR] No matching documents found for business ${businessId}`);
      }

      const results = searchResponse.matches.map(match => ({
        content: match.metadata.content,
        score: match.score,
        filename: match.metadata.filename,
      }));

      // Cache the results
      cache.cacheSearchResults(businessId, query, results);
      return results;
    } catch (error) {
      logger.error(`[VECTOR] Error searching vectors for business ${businessId}:`, error);
      throw error;
    }
  }

  async getBusinessDocuments(businessId) {
    try {
      logger.info(`[VECTOR] Fetching all documents for business ${businessId}`);

      if (this.isTestEnvironment) {
        logger.info(`[VECTOR] Test mode - returning mock documents for business ${businessId}`);
        return ['test-document.txt', 'sample-file.pdf'];
      }

      if (!this.index) {
        await this.initialize();
      }

      const response = await this.index.query({
        vector: new Array(1536).fill(0),
        topK: 1000,
        filter: { businessId },
        includeMetadata: true,
      });

      logger.debug(`[VECTOR] Retrieved ${response.matches.length} document chunks`);

      const uniqueFiles = new Set();
      response.matches.forEach(match => {
        if (match.metadata.filename) {
          uniqueFiles.add(match.metadata.filename);
        }
      });

      logger.info(`[VECTOR] Found ${uniqueFiles.size} unique documents for business ${businessId}`);
      return Array.from(uniqueFiles);
    } catch (error) {
      logger.error(`[VECTOR] Error fetching business documents for ${businessId}:`, error);
      throw error;
    }
  }

  async deleteDocument(businessId, filename) {
    try {
      logger.info(`[VECTOR] Deleting document: ${filename} for business ${businessId}`);

      if (this.isTestEnvironment) {
        logger.info(`[VECTOR] Test mode - simulating document deletion for ${filename}`);
        return { success: true, deletedCount: 3 };
      }

      if (!this.index) {
        await this.initialize();
      }

      // Find all vector IDs that match the business and filename pattern
      // Vector IDs are formatted as: ${businessId}-${filename}-${chunkIndex}
      const vectorIds = [];

      // Query to find matching vectors
      const searchResponse = await RetryManager.withRetry(
        async () => {
          return await this.index.query({
            vector: new Array(1536).fill(0), // Dummy vector for search
            topK: 10000, // Large number to get all matches
            filter: {
              businessId,
              filename,
            },
            includeMetadata: false, // We only need IDs
          });
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'pineconeQueryForDelete',
        }
      );

      // Extract vector IDs
      searchResponse.matches.forEach(match => {
        vectorIds.push(match.id);
      });

      if (vectorIds.length === 0) {
        logger.warn(
          `[VECTOR] No vectors found to delete for ${filename} in business ${businessId}`
        );
        return { success: true, deletedCount: 0 };
      }

      logger.info(`[VECTOR] Found ${vectorIds.length} vector chunks to delete for ${filename}`);

      // Delete the vectors
      await RetryManager.withRetry(
        async () => {
          return await this.index.deleteMany(vectorIds);
        },
        {
          maxAttempts: 3,
          delayMs: 2000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'pineconeDelete',
        }
      );

      logger.success(
        `[VECTOR] Successfully deleted ${vectorIds.length} vector chunks for ${filename}`
      );
      return { success: true, deletedCount: vectorIds.length };
    } catch (error) {
      logger.error(`[VECTOR] Error deleting document ${filename}:`, error);
      return { success: false, error: error.message };
    }
  }

  async deleteByKnowledgeId(knowledgeId) {
    try {
      logger.info(`[VECTOR] Deleting vectors for knowledge ID: ${knowledgeId}`);

      if (this.isTestEnvironment) {
        logger.info(`[VECTOR] Test mode - simulating knowledge deletion for ${knowledgeId}`);
        return { success: true, deletedCount: 2 };
      }

      if (!this.index) {
        await this.initialize();
      }

      // Find all vector IDs that contain the knowledge ID
      // For text knowledge: filename is `text_${knowledgeId}`
      // For documents: we need to search by metadata or use a different approach

      const vectorIds = [];

      // Query to find matching vectors by metadata or filename pattern
      const searchResponse = await RetryManager.withRetry(
        async () => {
          return await this.index.query({
            vector: new Array(1536).fill(0), // Dummy vector for search
            topK: 10000, // Large number to get all matches
            filter: {}, // No filter, we'll check metadata
            includeMetadata: true,
          });
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'pineconeQueryForKnowledgeDelete',
        }
      );

      // Filter matches that contain our knowledge ID
      searchResponse.matches.forEach(match => {
        if (
          match.id.includes(knowledgeId) ||
          (match.metadata &&
            match.metadata.filename &&
            match.metadata.filename.includes(knowledgeId))
        ) {
          vectorIds.push(match.id);
        }
      });

      if (vectorIds.length === 0) {
        logger.warn(`[VECTOR] No vectors found to delete for knowledge ID ${knowledgeId}`);
        return { success: true, deletedCount: 0 };
      }

      logger.info(
        `[VECTOR] Found ${vectorIds.length} vector chunks to delete for knowledge ${knowledgeId}`
      );

      // Delete the vectors
      await RetryManager.withRetry(
        async () => {
          return await this.index.deleteMany(vectorIds);
        },
        {
          maxAttempts: 3,
          delayMs: 2000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'pineconeDeleteKnowledge',
        }
      );

      logger.success(
        `[VECTOR] Successfully deleted ${vectorIds.length} vector chunks for knowledge ${knowledgeId}`
      );
      return { success: true, deletedCount: vectorIds.length };
    } catch (error) {
      logger.error(`[VECTOR] Error deleting knowledge ${knowledgeId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async deleteAllBusinessVectors(businessId) {
    try {
      logger.info(`[VECTOR] Deleting all vectors for business: ${businessId}`);

      if (!this.index) {
        await this.initialize();
      }

      // Delete all vectors for the business using filter
      await RetryManager.withRetry(
        async () => {
          return await this.index.deleteMany({
            filter: { businessId },
          });
        },
        {
          maxAttempts: 3,
          delayMs: 2000,
          retryCondition: RetryManager.isRetryableError,
          operationName: 'pineconeDeleteAllBusiness',
        }
      );

      logger.success(`[VECTOR] Successfully deleted all vectors for business ${businessId}`);
      return { success: true };
    } catch (error) {
      logger.error(`[VECTOR] Error deleting all vectors for business ${businessId}:`, error);
      return { success: false, error: error.message };
    }
  }

  chunkText(text, maxChunkSize) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxChunkSize) {
        currentChunk += sentence + '. ';
      } else {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence + '. ';
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

module.exports = new VectorService();
