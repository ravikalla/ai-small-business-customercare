/**
 * Cache Controller
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const cache = require('../utils/cache');
const { catchAsync } = require('../middleware/errorHandler');
const { ValidationError } = require('../errors/AppError');

class CacheController {
  constructor() {
    this.clearCache = catchAsync(this.clearCache.bind(this));
    this.getCacheStats = catchAsync(this.getCacheStats.bind(this));
    this.inspectCache = catchAsync(this.inspectCache.bind(this));
  }

  async clearCache(req, res) {
    const { type, businessId } = req.body;

    if (businessId) {
      const cleared = cache.clearBusinessCaches(businessId);
      res.json({
        success: true,
        message: `Cleared ${cleared} cache entries for business ${businessId}`,
      });
    } else if (type) {
      const validTypes = ['responses', 'embeddings', 'searches'];
      if (!validTypes.includes(type)) {
        throw new ValidationError(
          `Invalid cache type. Must be one of: ${validTypes.join(', ')}`,
          'type',
          type
        );
      }
      cache.clear(type);
      res.json({ success: true, message: `Cleared ${type} cache` });
    } else {
      cache.clear();
      res.json({ success: true, message: 'Cleared all caches' });
    }
  }

  async getCacheStats(req, res) {
    const stats = cache.getStats();
    res.json({ success: true, stats });
  }

  async inspectCache(req, res) {
    const { type } = req.query;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      caches: {},
    };

    // Validate type if provided
    const validTypes = ['responses', 'embeddings', 'searches'];
    if (type && !validTypes.includes(type)) {
      throw new ValidationError(
        `Invalid cache type. Must be one of: ${validTypes.join(', ')}`,
        'type',
        type
      );
    }

    // Inspect specific cache type or all
    const typesToInspect = type ? [type] : validTypes;

    typesToInspect.forEach(cacheType => {
      if (cache.caches && cache.caches[cacheType]) {
        result.caches[cacheType] = {
          size: cache.caches[cacheType].size,
          entries: [],
        };

        // Get first 10 entries with metadata
        let count = 0;
        for (const [key, entry] of cache.caches[cacheType].entries()) {
          if (count >= 10) {
            break;
          }

          result.caches[cacheType].entries.push({
            key: key.substring(0, 50) + (key.length > 50 ? '...' : ''),
            fullKey: key,
            timestamp: new Date(entry.timestamp).toISOString(),
            ttl: entry.ttl,
            accessCount: entry.accessCount || 0,
            lastAccessed: entry.lastAccessed ? new Date(entry.lastAccessed).toISOString() : null,
            valuePreview:
              typeof entry.value === 'string'
                ? entry.value.substring(0, 100) + (entry.value.length > 100 ? '...' : '')
                : JSON.stringify(entry.value).substring(0, 100),
          });
          count++;
        }
      }
    });

    res.json(result);
  }
}

module.exports = new CacheController();
