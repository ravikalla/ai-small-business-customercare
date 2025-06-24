/**
 * Intelligent Caching System
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const crypto = require('crypto');
const logger = require('./logger');

class CacheManager {
  constructor() {
    this.caches = {
      responses: new Map(), // AI responses cache
      embeddings: new Map(), // Embeddings cache
      searches: new Map(), // Vector search results cache
    };
    this.stats = {
      hits: 0,
      misses: 0,
      saves: 0,
    };

    // Cache configuration
    this.config = {
      responses: {
        ttl: 3600000, // 1 hour for AI responses
        maxSize: 1000,
      },
      embeddings: {
        ttl: 86400000, // 24 hours for embeddings
        maxSize: 5000,
      },
      searches: {
        ttl: 1800000, // 30 minutes for search results
        maxSize: 500,
      },
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  generateKey(type, ...parts) {
    const keyString = parts.join('|');
    return `${type}:${crypto.createHash('md5').update(keyString).digest('hex')}`;
  }

  set(cacheType, key, value, customTtl = null) {
    if (!this.caches[cacheType]) {
      logger.warn(`[CACHE] Unknown cache type: ${cacheType}`);
      return false;
    }

    const cache = this.caches[cacheType];
    const config = this.config[cacheType];
    const ttl = customTtl || config.ttl;

    // Check cache size and evict if necessary
    if (cache.size >= config.maxSize) {
      this.evictOldest(cacheType);
    }

    const entry = {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    cache.set(key, entry);
    this.stats.saves++;

    logger.debug(`[CACHE] Cached ${cacheType}: ${key} (TTL: ${ttl}ms)`);
    return true;
  }

  get(cacheType, key) {
    if (!this.caches[cacheType]) {
      return null;
    }

    const cache = this.caches[cacheType];
    const entry = cache.get(key);

    if (!entry) {
      this.stats.misses++;
      logger.debug(`[CACHE] Miss ${cacheType}: ${key}`);
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key);
      this.stats.misses++;
      logger.debug(`[CACHE] Expired ${cacheType}: ${key}`);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    logger.debug(`[CACHE] Hit ${cacheType}: ${key} (accessed ${entry.accessCount} times)`);
    return entry.value;
  }

  // AI Response Caching
  cacheResponse(businessId, query, response) {
    const key = this.generateKey('response', businessId, query.toLowerCase().trim());
    return this.set('responses', key, response);
  }

  getCachedResponse(businessId, query) {
    const key = this.generateKey('response', businessId, query.toLowerCase().trim());
    return this.get('responses', key);
  }

  // Embedding Caching
  cacheEmbedding(text, embedding) {
    const key = this.generateKey('embedding', text);
    return this.set('embeddings', key, embedding);
  }

  getCachedEmbedding(text) {
    const key = this.generateKey('embedding', text);
    return this.get('embeddings', key);
  }

  // Search Results Caching
  cacheSearchResults(businessId, query, results) {
    const key = this.generateKey('search', businessId, query.toLowerCase().trim());
    return this.set('searches', key, results);
  }

  getCachedSearchResults(businessId, query) {
    const key = this.generateKey('search', businessId, query.toLowerCase().trim());
    return this.get('searches', key);
  }

  evictOldest(cacheType) {
    const cache = this.caches[cacheType];
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      logger.debug(`[CACHE] Evicted oldest ${cacheType}: ${oldestKey}`);
    }
  }

  cleanup() {
    const now = Date.now();
    let totalEvicted = 0;

    for (const [cacheType, cache] of Object.entries(this.caches)) {
      const config = this.config[cacheType];
      const keysToDelete = [];

      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => cache.delete(key));
      totalEvicted += keysToDelete.length;
    }

    if (totalEvicted > 0) {
      logger.info(`[CACHE] Cleanup completed: ${totalEvicted} expired entries removed`);
    }
  }

  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, 300000); // Cleanup every 5 minutes
  }

  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
        : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: {
        responses: this.caches.responses.size,
        embeddings: this.caches.embeddings.size,
        searches: this.caches.searches.size,
      },
    };
  }

  clear(cacheType = null) {
    if (cacheType && this.caches[cacheType]) {
      this.caches[cacheType].clear();
      logger.info(`[CACHE] Cleared ${cacheType} cache`);
    } else {
      for (const cache of Object.values(this.caches)) {
        cache.clear();
      }
      this.stats = { hits: 0, misses: 0, saves: 0 };
      logger.info(`[CACHE] Cleared all caches`);
    }
  }

  clearBusinessCaches(businessId) {
    let clearedCount = 0;

    // Clear ALL caches completely when any business knowledge changes
    // This ensures no stale data and handles edge cases with MD5 hashed keys

    // Clear all response caches
    const responseCount = this.caches.responses.size;
    this.caches.responses.clear();
    clearedCount += responseCount;

    // Clear all search caches
    const searchCount = this.caches.searches.size;
    this.caches.searches.clear();
    clearedCount += searchCount;

    // Keep embeddings cache as it's content-based, not business-specific

    logger.debug(
      `[CACHE] Cleared ALL ${clearedCount} cached entries (responses: ${responseCount}, searches: ${searchCount}) due to business ${businessId} knowledge change`
    );
    return clearedCount;
  }

  // More targeted cache clearing for specific business (future improvement)
  clearBusinessCachesTargeted(businessId) {
    const clearedCount = 0;

    // Store mapping of hash to original components for targeted clearing
    // This would require modifying the cache structure to store metadata
    // For now, we use the broader approach above

    return clearedCount;
  }
}

module.exports = new CacheManager();
