/**
 * Load Testing Configuration
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

module.exports = {
  // Base configuration
  baseURL: process.env.LOAD_TEST_URL || 'http://localhost:3000',
  
  // Test scenarios
  scenarios: {
    // Light load test - normal usage
    light: {
      name: 'Light Load Test',
      duration: '2m',
      vus: 5, // Virtual users
      rampUp: '30s',
      rampDown: '30s',
      description: 'Simulates normal daily usage'
    },
    
    // Medium load test - busy periods
    medium: {
      name: 'Medium Load Test', 
      duration: '5m',
      vus: 25,
      rampUp: '1m',
      rampDown: '1m',
      description: 'Simulates busy period traffic'
    },
    
    // Heavy load test - peak traffic
    heavy: {
      name: 'Heavy Load Test',
      duration: '10m', 
      vus: 100,
      rampUp: '2m',
      rampDown: '2m',
      description: 'Simulates peak traffic conditions'
    },
    
    // Spike test - sudden traffic bursts
    spike: {
      name: 'Spike Test',
      duration: '5m',
      vus: 200,
      rampUp: '10s',
      rampDown: '10s', 
      description: 'Tests handling of sudden traffic spikes'
    },
    
    // Stress test - find breaking point
    stress: {
      name: 'Stress Test',
      duration: '15m',
      vus: 500,
      rampUp: '5m',
      rampDown: '5m',
      description: 'Identifies system breaking point'
    }
  },

  // Performance thresholds
  thresholds: {
    // Response time thresholds
    http_req_duration: {
      avg: 500,    // Average response time < 500ms
      p95: 1000,   // 95th percentile < 1s
      p99: 2000,   // 99th percentile < 2s
      max: 5000    // Maximum response time < 5s
    },
    
    // Error rate thresholds
    http_req_failed: {
      rate: 0.05   // Error rate < 5%
    },
    
    // Request rate thresholds
    http_reqs: {
      rate: 10     // Minimum 10 requests per second
    }
  },

  // Test endpoints with weights (probability of being called)
  endpoints: [
    { path: '/', method: 'GET', weight: 10, name: 'API Info' },
    { path: '/health', method: 'GET', weight: 15, name: 'Health Check' },
    { path: '/api/businesses', method: 'GET', weight: 20, name: 'List Businesses' },
    { path: '/api/twilio/status', method: 'GET', weight: 10, name: 'Twilio Status' },
    { path: '/api/performance/metrics', method: 'GET', weight: 5, name: 'Performance Metrics' },
    { path: '/api/performance/health', method: 'GET', weight: 5, name: 'Performance Health' },
    { path: '/debug/routes', method: 'GET', weight: 5, name: 'Debug Routes' },
    // Business creation (lower weight as it's more resource intensive)
    { path: '/api/businesses', method: 'POST', weight: 3, name: 'Create Business', 
      body: {
        businessName: 'Load Test Business',
        ownerPhone: '+15551234567',
        description: 'Test business for load testing'
      }
    }
  ],

  // Environment-specific settings
  environments: {
    local: {
      baseURL: 'http://localhost:3000',
      maxVus: 50
    },
    staging: {
      baseURL: 'http://staging.example.com',
      maxVus: 100
    },
    production: {
      baseURL: 'http://ec2-54-86-8-77.compute-1.amazonaws.com:3000',
      maxVus: 200
    }
  }
};