/**
 * K6 Load Testing Script
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 * 
 * Usage:
 * k6 run --env SCENARIO=light tests/load/k6-load-test.js
 * k6 run --env SCENARIO=medium tests/load/k6-load-test.js
 * k6 run --env SCENARIO=heavy tests/load/k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
const config = require('./load-test-config.js');

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('total_requests');
const businessCreationTime = new Trend('business_creation_time');

// Test configuration
const scenario = __ENV.SCENARIO || 'light';
const environment = __ENV.ENVIRONMENT || 'production';
const testConfig = config.scenarios[scenario];
const envConfig = config.environments[environment];

export let options = {
  stages: [
    { duration: testConfig.rampUp, target: testConfig.vus },
    { duration: testConfig.duration, target: testConfig.vus },
    { duration: testConfig.rampDown, target: 0 }
  ],
  thresholds: {
    'http_req_duration': [`avg<${config.thresholds.http_req_duration.avg}`],
    'http_req_duration{name:API Info}': [`avg<${config.thresholds.http_req_duration.avg}`],
    'http_req_duration{name:Health Check}': [`avg<${config.thresholds.http_req_duration.avg * 0.5}`], // Health should be faster
    'http_req_failed': [`rate<${config.thresholds.http_req_failed.rate}`],
    'error_rate': [`rate<${config.thresholds.http_req_failed.rate}`],
  }
};

const BASE_URL = envConfig.baseURL;

// Weighted endpoint selection
function selectEndpoint() {
  const totalWeight = config.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of config.endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }
  
  return config.endpoints[0]; // Fallback
}

export function setup() {
  console.log(`Starting ${testConfig.name}`);
  console.log(`Description: ${testConfig.description}`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Virtual Users: ${testConfig.vus}`);
  console.log(`Duration: ${testConfig.duration}`);
  
  // Verify the service is running
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error(`Service health check failed: ${response.status}`);
  }
  
  console.log('Service health check passed');
  return { startTime: Date.now() };
}

export default function(data) {
  const endpoint = selectEndpoint();
  
  group(endpoint.name, function() {
    const url = `${BASE_URL}${endpoint.path}`;
    let response;
    
    // Make request based on method
    if (endpoint.method === 'POST' && endpoint.body) {
      response = http.post(url, JSON.stringify(endpoint.body), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: endpoint.name }
      });
    } else {
      response = http.get(url, {
        tags: { name: endpoint.name }
      });
    }
    
    // Record metrics
    requestCount.add(1);
    responseTime.add(response.timings.duration);
    
    // Check response
    const success = check(response, {
      'status is 200-299': (r) => r.status >= 200 && r.status < 300,
      'response time < 5s': (r) => r.timings.duration < 5000,
      'response has content': (r) => r.body.length > 0
    });
    
    if (!success) {
      errorRate.add(1);
      console.log(`Failed request to ${endpoint.name}: ${response.status}`);
    } else {
      errorRate.add(0);
    }
    
    // Special handling for business creation
    if (endpoint.name === 'Create Business') {
      businessCreationTime.add(response.timings.duration);
      
      // Additional checks for business creation
      check(response, {
        'business creation successful': (r) => r.status === 201 || r.status === 200,
        'business creation response has ID': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.businessId || body.id;
          } catch (e) {
            return false;
          }
        }
      });
    }
    
    // Performance monitoring checks
    if (endpoint.name === 'Performance Metrics' || endpoint.name === 'Performance Health') {
      check(response, {
        'performance endpoint responds': (r) => r.status === 200,
        'performance data is valid JSON': (r) => {
          try {
            JSON.parse(r.body);
            return true;
          } catch (e) {
            return false;
          }
        }
      });
    }
  });
  
  // Think time - simulate user behavior
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\nTest completed in ${duration} seconds`);
  
  // Get final performance metrics
  const metricsResponse = http.get(`${BASE_URL}/api/performance/metrics`);
  if (metricsResponse.status === 200) {
    try {
      const metrics = JSON.parse(metricsResponse.body);
      console.log('\nFinal Performance Metrics:');
      console.log(`Total Requests: ${metrics.metrics.requests.total}`);
      console.log(`Average Response Time: ${metrics.metrics.response_times.avg}ms`);
      console.log(`95th Percentile: ${metrics.metrics.response_times.p95}ms`);
      console.log(`Error Rate: ${metrics.metrics.errorRate}%`);
      console.log(`Memory Usage: ${metrics.metrics.memory.heapUsed}`);
    } catch (e) {
      console.log('Could not parse final metrics');
    }
  }
}