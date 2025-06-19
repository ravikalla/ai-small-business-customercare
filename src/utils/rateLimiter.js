/**
 * Rate Limiting System
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const logger = require('./logger');

class RateLimiter {
    constructor() {
        this.limits = new Map();
        this.config = {
            // Per phone number limits
            businessOwner: {
                windowMs: 60000,        // 1 minute window
                maxRequests: 30,        // 30 requests per minute
                maxUploads: 5           // 5 document uploads per minute
            },
            customer: {
                windowMs: 60000,        // 1 minute window
                maxRequests: 10         // 10 queries per minute
            },
            // Global limits
            global: {
                windowMs: 60000,        // 1 minute window
                maxRequests: 500        // 500 total requests per minute
            }
        };
        
        this.startCleanupTimer();
    }

    getKey(type, identifier) {
        return `${type}:${identifier}`;
    }

    isAllowed(type, identifier, action = 'request') {
        const config = this.config[type];
        if (!config) {
            logger.warn(`[RATE_LIMIT] Unknown rate limit type: ${type}`);
            return true;
        }

        const key = this.getKey(type, identifier);
        const now = Date.now();
        
        let limit = this.limits.get(key);
        if (!limit) {
            limit = {
                requests: [],
                uploads: [],
                windowStart: now
            };
            this.limits.set(key, limit);
        }

        // Clean old requests outside the window
        const windowStart = now - config.windowMs;
        limit.requests = limit.requests.filter(timestamp => timestamp > windowStart);
        if (limit.uploads) {
            limit.uploads = limit.uploads.filter(timestamp => timestamp > windowStart);
        }

        // Check limits based on action
        let currentCount, maxCount;
        
        if (action === 'upload' && type === 'businessOwner') {
            currentCount = limit.uploads.length;
            maxCount = config.maxUploads;
        } else {
            currentCount = limit.requests.length;
            maxCount = config.maxRequests;
        }

        if (currentCount >= maxCount) {
            logger.warn(`[RATE_LIMIT] Rate limit exceeded for ${type}:${identifier} (${action}): ${currentCount}/${maxCount}`);
            return false;
        }

        // Record the request
        if (action === 'upload' && type === 'businessOwner') {
            limit.uploads.push(now);
        } else {
            limit.requests.push(now);
        }

        logger.debug(`[RATE_LIMIT] ${type}:${identifier} (${action}): ${currentCount + 1}/${maxCount}`);
        return true;
    }

    // Business owner rate limiting
    checkBusinessOwner(phoneNumber, action = 'request') {
        return this.isAllowed('businessOwner', phoneNumber, action);
    }

    // Customer rate limiting
    checkCustomer(phoneNumber) {
        return this.isAllowed('customer', phoneNumber, 'request');
    }

    // Global rate limiting
    checkGlobal() {
        return this.isAllowed('global', 'all', 'request');
    }

    getRemainingRequests(type, identifier, action = 'request') {
        const config = this.config[type];
        if (!config) return -1;

        const key = this.getKey(type, identifier);
        const limit = this.limits.get(key);
        
        if (!limit) {
            return action === 'upload' && type === 'businessOwner' 
                ? config.maxUploads 
                : config.maxRequests;
        }

        const now = Date.now();
        const windowStart = now - config.windowMs;
        
        if (action === 'upload' && type === 'businessOwner') {
            const activeUploads = limit.uploads.filter(timestamp => timestamp > windowStart);
            return Math.max(0, config.maxUploads - activeUploads.length);
        } else {
            const activeRequests = limit.requests.filter(timestamp => timestamp > windowStart);
            return Math.max(0, config.maxRequests - activeRequests.length);
        }
    }

    getResetTime(type, identifier) {
        const config = this.config[type];
        if (!config) return 0;

        const key = this.getKey(type, identifier);
        const limit = this.limits.get(key);
        
        if (!limit || limit.requests.length === 0) {
            return 0;
        }

        const oldestRequest = Math.min(...limit.requests);
        return oldestRequest + config.windowMs;
    }

    // Cleanup expired entries
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, limit] of this.limits.entries()) {
            const [type] = key.split(':');
            const config = this.config[type];
            
            if (!config) continue;

            const windowStart = now - config.windowMs;
            const oldRequestCount = limit.requests.length;
            const oldUploadCount = limit.uploads ? limit.uploads.length : 0;

            limit.requests = limit.requests.filter(timestamp => timestamp > windowStart);
            if (limit.uploads) {
                limit.uploads = limit.uploads.filter(timestamp => timestamp > windowStart);
            }

            // Remove empty entries
            if (limit.requests.length === 0 && (!limit.uploads || limit.uploads.length === 0)) {
                this.limits.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`[RATE_LIMIT] Cleanup: removed ${cleaned} expired entries`);
        }
    }

    startCleanupTimer() {
        setInterval(() => {
            this.cleanup();
        }, 60000); // Cleanup every minute
    }

    getStats() {
        const stats = {
            totalEntries: this.limits.size,
            activeBusinessOwners: 0,
            activeCustomers: 0,
            totalRequests: 0,
            totalUploads: 0
        };

        for (const [key, limit] of this.limits.entries()) {
            const [type] = key.split(':');
            
            if (type === 'businessOwner') {
                stats.activeBusinessOwners++;
            } else if (type === 'customer') {
                stats.activeCustomers++;
            }
            
            stats.totalRequests += limit.requests.length;
            if (limit.uploads) {
                stats.totalUploads += limit.uploads.length;
            }
        }

        return stats;
    }

    reset(type = null, identifier = null) {
        if (type && identifier) {
            const key = this.getKey(type, identifier);
            this.limits.delete(key);
            logger.info(`[RATE_LIMIT] Reset limits for ${key}`);
        } else if (type) {
            const keysToDelete = [];
            for (const key of this.limits.keys()) {
                if (key.startsWith(`${type}:`)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => this.limits.delete(key));
            logger.info(`[RATE_LIMIT] Reset all ${type} limits (${keysToDelete.length} entries)`);
        } else {
            this.limits.clear();
            logger.info(`[RATE_LIMIT] Reset all limits`);
        }
    }
}

module.exports = new RateLimiter();