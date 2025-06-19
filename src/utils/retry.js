/**
 * Retry Utility for API Resilience
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const logger = require('./logger');

class RetryManager {
    static async withRetry(operation, options = {}) {
        const {
            maxAttempts = 3,
            delayMs = 1000,
            backoffMultiplier = 2,
            retryCondition = (error) => true,
            operationName = 'operation'
        } = options;

        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                logger.debug(`[RETRY] ${operationName}: Attempt ${attempt}/${maxAttempts}`);
                const result = await operation();
                
                if (attempt > 1) {
                    logger.info(`[RETRY] ${operationName}: Succeeded on attempt ${attempt}`);
                }
                
                return result;
            } catch (error) {
                lastError = error;
                
                if (attempt === maxAttempts || !retryCondition(error)) {
                    logger.error(`[RETRY] ${operationName}: Final attempt failed`, error);
                    throw error;
                }
                
                const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
                logger.warn(`[RETRY] ${operationName}: Attempt ${attempt} failed, retrying in ${delay}ms`, error.message);
                
                await this.sleep(delay);
            }
        }
        
        throw lastError;
    }

    static async withCircuitBreaker(operation, options = {}) {
        const {
            failureThreshold = 5,
            resetTimeoutMs = 60000,
            operationName = 'operation'
        } = options;

        if (!this.circuitBreakers) {
            this.circuitBreakers = new Map();
        }

        const breaker = this.circuitBreakers.get(operationName) || {
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failureCount: 0,
            lastFailureTime: null
        };

        this.circuitBreakers.set(operationName, breaker);

        // Check if circuit breaker should reset
        if (breaker.state === 'OPEN' && 
            Date.now() - breaker.lastFailureTime > resetTimeoutMs) {
            breaker.state = 'HALF_OPEN';
            logger.info(`[CIRCUIT] ${operationName}: Circuit breaker reset to HALF_OPEN`);
        }

        // Reject if circuit is open
        if (breaker.state === 'OPEN') {
            const error = new Error(`Circuit breaker OPEN for ${operationName}`);
            error.code = 'CIRCUIT_BREAKER_OPEN';
            throw error;
        }

        try {
            const result = await operation();
            
            // Reset on success
            if (breaker.state === 'HALF_OPEN') {
                breaker.state = 'CLOSED';
                breaker.failureCount = 0;
                logger.info(`[CIRCUIT] ${operationName}: Circuit breaker CLOSED after successful operation`);
            }
            
            return result;
        } catch (error) {
            breaker.failureCount++;
            breaker.lastFailureTime = Date.now();
            
            if (breaker.failureCount >= failureThreshold) {
                breaker.state = 'OPEN';
                logger.error(`[CIRCUIT] ${operationName}: Circuit breaker OPENED after ${breaker.failureCount} failures`);
            }
            
            throw error;
        }
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static isRetryableError(error) {
        // Network errors, timeouts, 5xx server errors
        const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
        const retryableHttpCodes = [429, 500, 502, 503, 504];
        
        return retryableCodes.includes(error.code) || 
               retryableHttpCodes.includes(error.status) ||
               retryableHttpCodes.includes(error.response?.status);
    }
}

module.exports = RetryManager;