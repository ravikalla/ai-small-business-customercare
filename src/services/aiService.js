/**
 * AI Response Generation Service
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const { OpenAI } = require('openai');
const logger = require('../utils/logger');
const RetryManager = require('../utils/retry');
const cache = require('../utils/cache');
const vectorService = require('./vectorService');

class AIService {
  constructor() {
    this.isTestEnvironment =
      process.env.NODE_ENV === 'test' ||
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === 'test-key';

    if (this.isTestEnvironment) {
      logger.info('[AI] Running in test mode - AI responses will be mocked');
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async generateResponse(query, businessId) {
    try {
      logger.info(`[AI] Generating response for business ${businessId}: "${query}"`);

      if (this.isTestEnvironment) {
        logger.info(`[AI] Test mode - returning mock response for query: "${query}"`);
        return `Test AI response for business ${businessId}: This is a mock response to the query "${query}".`;
      }

      // Check cache first
      const cachedResponse = cache.getCachedResponse(businessId, query);
      if (cachedResponse) {
        logger.info(`[AI] Using cached response for business ${businessId}`);
        return cachedResponse;
      }

      logger.debug(`[AI] Searching for relevant documents...`);
      const relevantDocs = await vectorService.searchSimilar(query, businessId, 3);

      if (relevantDocs.length === 0) {
        logger.warn(`[AI] No relevant documents found for business ${businessId}`);
        return "I don't have specific information about that in the business knowledge base. Please contact the business directly or try asking a different question.";
      }

      logger.info(`[AI] Found ${relevantDocs.length} relevant documents for context`);
      relevantDocs.forEach((doc, i) => {
        logger.debug(`[AI] Doc ${i + 1}: Score=${doc.score.toFixed(3)}, Source=${doc.filename}`);
      });

      const context = relevantDocs.map(doc => doc.content).join('\n\n');

      logger.debug(
        `[AI] Built context: ${context.length} characters from ${relevantDocs.length} sources`
      );

      const prompt = `You are a helpful AI assistant for a small business. Based STRICTLY on the following information from the business's knowledge base, please answer the customer's question accurately.

Context from business knowledge base:
${context}

Customer question: ${query}

CRITICAL Instructions:
- ONLY answer based on information explicitly mentioned in the provided context
- If the specific item/service asked about is NOT mentioned in the context, say "I don't have information about [specific item] in our knowledge base"
- DO NOT make assumptions or inferences beyond what is explicitly stated
- DO NOT answer "Yes" unless the exact item/service is clearly mentioned
- Be accurate first, helpful second
- If context mentions related items but not the specific item asked about, clarify the difference
- Example: If asked about "milk" but context only mentions "ice cream", say "I don't see milk specifically mentioned, but we do serve ice cream"

Response:`;

      logger.debug(`[AI] Sending request to OpenAI with prompt (${prompt.length} characters)`);
      const completion = await RetryManager.withCircuitBreaker(
        async () => {
          return await RetryManager.withRetry(
            async () => {
              return await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                  {
                    role: 'system',
                    content: 'You are a helpful customer service AI for a small business.',
                  },
                  { role: 'user', content: prompt },
                ],
                max_tokens: 300,
                temperature: 0.7,
              });
            },
            {
              maxAttempts: 3,
              delayMs: 1000,
              retryCondition: RetryManager.isRetryableError,
              operationName: 'openaiChatCompletion',
            }
          );
        },
        {
          operationName: 'openaiService',
          failureThreshold: 5,
          resetTimeoutMs: 60000,
        }
      );

      const response = completion.choices[0].message.content.trim();
      logger.info(
        `[AI] Generated response for business ${businessId}: ${response.length} characters`
      );
      logger.debug(`[AI] Response preview: "${response.substring(0, 100)}..."`);

      // Cache the response
      cache.cacheResponse(businessId, query, response);

      return response;
    } catch (error) {
      logger.error(`[AI] Error generating response for business ${businessId}:`, error);
      throw new Error('Failed to generate response');
    }
  }

  async summarizeDocument(content) {
    try {
      logger.info(`[AI] Summarizing document: ${content.length} characters`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful AI that summarizes business documents.' },
          {
            role: 'user',
            content: `Please provide a brief summary of the following document:\n\n${content}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.5,
      });

      const summary = completion.choices[0].message.content.trim();
      logger.info(`[AI] Generated summary: ${summary.length} characters`);
      return summary;
    } catch (error) {
      logger.error('[AI] Error summarizing document:', error);
      throw new Error('Failed to summarize document');
    }
  }
}

module.exports = new AIService();
