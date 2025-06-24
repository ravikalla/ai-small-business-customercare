# Load Testing Suite

This directory contains comprehensive load testing tools for the Small Business Chatbot application.

## Overview

The load testing suite includes multiple tools and scenarios to thoroughly test the application's performance under various load conditions.

## Tools Included

### 1. K6 Load Testing
- **File**: `k6-load-test.js`
- **Config**: `load-test-config.js`
- **Features**: 
  - Multiple test scenarios (light, medium, heavy, spike, stress)
  - Custom metrics and thresholds
  - Weighted endpoint testing
  - Performance monitoring integration

### 2. Artillery Load Testing
- **File**: `artillery-load-test.yml`
- **Features**:
  - YAML-based configuration
  - Multiple test phases
  - CSV data payloads
  - Environment-specific settings

### 3. Automated Test Runner
- **File**: `run-load-tests.sh`
- **Features**:
  - Runs both K6 and Artillery tests
  - Health checks before testing
  - Automatic results collection
  - Performance metrics gathering
  - Summary report generation

## Installation

### Prerequisites
```bash
# Install K6
# macOS
brew install k6

# Ubuntu/Debian
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Install Artillery
npm install -g artillery
```

## Usage

### Quick Start
```bash
# Run all tests against production
./run-load-tests.sh production

# Run all tests against local development
./run-load-tests.sh local
```

### Individual Tool Usage

#### K6 Testing
```bash
# Light load test
k6 run --env SCENARIO=light --env ENVIRONMENT=production k6-load-test.js

# Medium load test
k6 run --env SCENARIO=medium --env ENVIRONMENT=production k6-load-test.js

# Heavy load test
k6 run --env SCENARIO=heavy --env ENVIRONMENT=production k6-load-test.js

# Spike test
k6 run --env SCENARIO=spike --env ENVIRONMENT=production k6-load-test.js

# Stress test
k6 run --env SCENARIO=stress --env ENVIRONMENT=production k6-load-test.js
```

#### Artillery Testing
```bash
# Local environment
artillery run --environment local artillery-load-test.yml

# Production environment
artillery run --environment production artillery-load-test.yml

# Generate HTML report
artillery report results.json --output report.html
```

## Test Scenarios

### Light Load (5 users, 2 minutes)
- **Purpose**: Normal daily usage simulation
- **Virtual Users**: 5
- **Duration**: 2 minutes
- **Use Case**: Baseline performance testing

### Medium Load (25 users, 5 minutes)
- **Purpose**: Busy period simulation
- **Virtual Users**: 25
- **Duration**: 5 minutes
- **Use Case**: Peak business hours testing

### Heavy Load (100 users, 10 minutes)
- **Purpose**: High traffic simulation
- **Virtual Users**: 100
- **Duration**: 10 minutes
- **Use Case**: Maximum expected load testing

### Spike Test (200 users, 5 minutes)
- **Purpose**: Sudden traffic burst simulation
- **Virtual Users**: 200
- **Ramp Up**: 10 seconds
- **Use Case**: Social media viral effect testing

### Stress Test (500 users, 15 minutes)
- **Purpose**: Breaking point identification
- **Virtual Users**: 500
- **Duration**: 15 minutes
- **Use Case**: System limits discovery

## Performance Thresholds

| Metric | Threshold | Description |
|--------|-----------|-------------|
| Average Response Time | < 500ms | General responsiveness |
| 95th Percentile | < 1000ms | User experience quality |
| 99th Percentile | < 2000ms | Worst-case scenarios |
| Error Rate | < 5% | System reliability |
| Request Rate | > 10 req/s | Minimum throughput |

## Test Endpoints

The load tests cover these endpoint categories:

1. **Core API** (60% of traffic)
   - Health checks
   - Business operations
   - API information

2. **Performance Monitoring** (20% of traffic)
   - Metrics collection
   - Health status
   - System monitoring

3. **Integration Services** (10% of traffic)
   - Twilio status
   - External service checks

4. **Documentation/Debug** (10% of traffic)
   - API documentation
   - Debug endpoints
   - Route information

## Results Analysis

### Files Generated
- `k6_*_timestamp.json`: K6 test results
- `artillery_*_timestamp.json`: Artillery test results
- `artillery_*_timestamp.html`: Artillery HTML reports
- `metrics_*_timestamp.json`: Performance metrics snapshots
- `load_test_summary_timestamp.md`: Test summary

### Key Metrics to Review
1. **Response Times**: Average, P95, P99
2. **Error Rates**: HTTP errors, timeouts
3. **Throughput**: Requests per second
4. **Resource Usage**: Memory, CPU
5. **System Health**: Performance endpoint data

## Troubleshooting

### Common Issues

1. **Service Not Responding**
   ```bash
   # Check if service is running
   curl http://localhost:3000/health
   ```

2. **High Error Rates**
   - Check application logs
   - Verify database connectivity
   - Monitor resource usage

3. **Slow Response Times**
   - Check performance metrics
   - Monitor slow requests
   - Review resource utilization

### Performance Optimization Tips

1. **Database Optimization**
   - Add indexes for frequently queried fields
   - Optimize slow queries
   - Implement connection pooling

2. **Caching Strategy**
   - Implement response caching
   - Use Redis for session data
   - Cache expensive computations

3. **Resource Management**
   - Monitor memory leaks
   - Optimize garbage collection
   - Scale horizontally if needed

## Continuous Integration

To integrate with CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run Load Tests
  run: |
    cd tests/load
    ./run-load-tests.sh production
    # Upload results to artifacts
```

## Contributing

When adding new load tests:

1. Update test scenarios in `load-test-config.js`
2. Add new endpoints to the weighted list
3. Update thresholds based on requirements
4. Document new test scenarios in this README

## Performance Targets

### Production Environment
- **Concurrent Users**: Support 100+ simultaneous users
- **Response Time**: 95% of requests under 1 second
- **Availability**: 99.9% uptime during load tests
- **Error Rate**: Less than 1% under normal load

### Scaling Recommendations
- **Light Load**: Single instance sufficient
- **Medium Load**: Consider load balancer + 2 instances
- **Heavy Load**: Auto-scaling with 3+ instances
- **Stress Test**: Horizontal scaling required