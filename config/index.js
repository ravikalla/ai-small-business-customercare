const path = require('path');

/**
 * Configuration loader that loads environment-specific configurations
 * Based on NODE_ENV environment variable
 */
class ConfigLoader {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.config = this.loadConfig();
  }

  /**
   * Load configuration based on current environment
   * @returns {Object} Configuration object
   */
  loadConfig() {
    try {
      const configPath = path.join(__dirname, 'environments', `${this.env}.js`);
      const config = require(configPath);

      // Validate required configuration
      this.validateConfig(config);

      return config;
    } catch (error) {
      console.error(`Failed to load configuration for environment: ${this.env}`);
      console.error(error.message);

      // Fallback to development config
      if (this.env !== 'development') {
        console.warn('Falling back to development configuration');
        return require('./environments/development.js');
      }

      throw error;
    }
  }

  /**
   * Validate required configuration fields
   * @param {Object} config - Configuration object to validate
   */
  validateConfig(config) {
    const required = ['app.port', 'logging.level'];

    for (const field of required) {
      const value = this.getNestedValue(config, field);
      if (value === undefined || value === null) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }

    // Validate environment-specific requirements
    if (this.env === 'production') {
      this.validateProductionConfig(config);
    }
  }

  /**
   * Validate production-specific configuration
   * @param {Object} config - Configuration object to validate
   */
  validateProductionConfig(config) {
    const productionRequired = [
      'ai.openai.apiKey',
      'database.supabase.url',
      'messaging.twilio.accountSid',
    ];

    for (const field of productionRequired) {
      const value = this.getNestedValue(config, field);
      if (!value || value.includes('your_') || value.includes('_here')) {
        console.warn(`Production configuration warning: ${field} appears to use placeholder value`);
      }
    }
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} path - Dot-separated path
   * @returns {*} Value at path or undefined
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Get configuration for specific section
   * @param {string} section - Configuration section name
   * @returns {Object} Section configuration
   */
  get(section) {
    if (!section) {
      return this.config;
    }

    const value = this.getNestedValue(this.config, section);
    if (value === undefined) {
      throw new Error(`Configuration section not found: ${section}`);
    }

    return value;
  }

  /**
   * Check if running in specific environment
   * @param {string} environment - Environment name to check
   * @returns {boolean} True if current environment matches
   */
  is(environment) {
    return this.env === environment;
  }

  /**
   * Get current environment name
   * @returns {string} Current environment
   */
  getEnvironment() {
    return this.env;
  }
}

// Export singleton instance
module.exports = new ConfigLoader();
