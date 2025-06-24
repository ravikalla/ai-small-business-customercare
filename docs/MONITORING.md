# Application Monitoring Guide

**Small Business Chatbot - WhatsApp AI Assistant**  
**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>

## Overview

This guide provides comprehensive instructions for monitoring the Small Business Chatbot application in production. The application includes built-in performance monitoring, health checks, and logging capabilities to ensure optimal operation.

## Table of Contents

- [Quick Start Monitoring](#quick-start-monitoring)
- [Built-in Monitoring Endpoints](#built-in-monitoring-endpoints)
- [Performance Metrics](#performance-metrics)
- [Health Checks](#health-checks)
- [Log Monitoring](#log-monitoring)
- [Automated Monitoring Setup](#automated-monitoring-setup)
- [AWS CloudWatch Integration](#aws-cloudwatch-integration)
- [Alert Configuration](#alert-configuration)
- [Load Testing & Performance](#load-testing--performance)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Scaling Recommendations](#scaling-recommendations)

## Quick Start Monitoring

### Essential Monitoring URLs

```bash
# Application Health
http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/health

# Performance Dashboard
http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/metrics

# Performance Health Check
http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/health

# Web-based Log Viewer
http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/logs
```

### One-Minute Health Check

<details>
<summary>Click to expand health check commands</summary>

```bash
# Quick health status
curl -s http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/health | jq '.status'

# Performance summary
curl -s http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/health | jq '.health.status'
```

</details>

## Built-in Monitoring Endpoints

### 1. Application Health Check

**Endpoint:** `GET /health`

**Response Example:**

<details>
<summary>Click to expand JSON response</summary>

```json
{
  "status": "healthy",
  "timestamp": "2025-06-24T17:30:00.000Z",
  "uptime": 3600,
  "version": "1.2.0",
  "environment": "production",
  "services": {
    "database": "connected",
    "vectorService": "operational",
    "twilio": "connected"
  }
}
```

</details>

**Monitoring:** Check every 1-2 minutes for service availability.

### 2. Performance Metrics Dashboard

**Endpoint:** `GET /api/performance/metrics`

**Key Metrics:**
- **Total Requests:** Number of requests processed
- **Response Times:** Average, P95, P99 percentiles
- **Memory Usage:** Heap, RSS, external memory
- **Error Rate:** Percentage of failed requests
- **Requests/Second:** Current throughput
- **Top Routes:** Most accessed endpoints

**Response Example:**

<details>
<summary>Click to expand JSON response</summary>

```json
{
  "success": true,
  "metrics": {
    "uptime": {
      "milliseconds": 3600000,
      "readable": "1h 0m 0s"
    },
    "requests": {
      "total": 1250,
      "byMethod": {"GET": 1100, "POST": 150},
      "byStatusCode": {"200": 1200, "404": 30, "500": 20},
      "errors": 50
    },
    "response_times": {
      "avg": 245.67,
      "min": 12.34,
      "max": 1234.56,
      "p95": 890.12,
      "p99": 1100.45
    },
    "memory": {
      "heapUsed": "45.67MB",
      "heapTotal": "67.89MB",
      "rss": "89.12MB"
    },
    "requestsPerSecond": "12.34",
    "errorRate": "4.00"
  }
}
```

</details>

### 3. Performance Health Check

**Endpoint:** `GET /api/performance/health`

**Health Status Levels:**
- **healthy:** All metrics within normal ranges
- **warning:** Some metrics approaching thresholds
- **critical:** Immediate attention required

**Response Example:**

<details>
<summary>Click to expand JSON response</summary>

```json
{
  "success": true,
  "health": {
    "status": "warning",
    "issues": [
      "High average response time",
      "Memory usage above 80%"
    ],
    "recommendations": [
      "Optimize slow endpoints",
      "Monitor memory leaks"
    ]
  },
  "metrics": {
    "avgResponseTime": 567.89,
    "errorRate": "3.50",
    "memoryUsage": "85.2%",
    "requestsPerSecond": "15.67"
  }
}
```

</details>

### 4. Slow Requests Analysis

**Endpoint:** `GET /api/performance/slow-requests?limit=10`

**Purpose:** Identify requests taking >500ms for optimization.

### 5. Top Routes Analysis

**Endpoint:** `GET /api/performance/top-routes?limit=10`

**Purpose:** Understand traffic patterns and optimize popular endpoints.

## Performance Metrics

### Key Performance Indicators (KPIs)

#### Response Time Thresholds
```
✅ Excellent: < 200ms average
🟡 Good:      < 500ms average  
🟠 Warning:   < 1000ms average
🔴 Critical:  > 1000ms average
```

#### Error Rate Thresholds
```
✅ Excellent: < 1%
🟡 Good:      < 5%
🟠 Warning:   < 10%
🔴 Critical:  > 10%
```

#### Memory Usage Thresholds
```
✅ Excellent: < 60%
🟡 Good:      < 80%
🟠 Warning:   < 90%
🔴 Critical:  > 90%
```

#### Throughput Benchmarks
```
✅ Low Load:    < 10 req/sec
🟡 Medium Load: 10-50 req/sec
🟠 High Load:   50-100 req/sec
🔴 Peak Load:   > 100 req/sec
```

### Business Metrics

Monitor these application-specific metrics:

<details>
<summary>Click to expand business monitoring commands</summary>

```bash
# Active businesses count
curl -s http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/businesses | jq '.businesses | length'

# Twilio service status
curl -s http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/twilio/status | jq '.status'
```

</details>

## Health Checks

### Automated Health Check Script

Create `scripts/health-check.sh`:

<details>
<summary>Click to expand health check script</summary>

```bash
#!/bin/bash
# Health Check Script for SBC Application
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

BASE_URL="http://ec2-54-86-8-77.compute-1.amazonaws.com:3000"
LOG_FILE="/var/log/sbc-health-check.log"
EMAIL_ALERT="admin@yourcompany.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo -e "$1"
}

check_health() {
    local health_status
    health_status=$(curl -s --max-time 10 "$BASE_URL/health" | jq -r '.status // "error"')
    
    if [ "$health_status" = "healthy" ]; then
        log_message "${GREEN}✅ Application Health: HEALTHY${NC}"
        return 0
    else
        log_message "${RED}🚨 Application Health: $health_status${NC}"
        return 1
    fi
}

check_performance() {
    local perf_status
    perf_status=$(curl -s --max-time 10 "$BASE_URL/api/performance/health" | jq -r '.health.status // "error"')
    
    case "$perf_status" in
        "healthy")
            log_message "${GREEN}✅ Performance: HEALTHY${NC}"
            return 0
            ;;
        "warning")
            log_message "${YELLOW}⚠️ Performance: WARNING${NC}"
            return 1
            ;;
        "critical")
            log_message "${RED}🚨 Performance: CRITICAL${NC}"
            return 2
            ;;
        *)
            log_message "${RED}❌ Performance: ERROR${NC}"
            return 3
            ;;
    esac
}

get_key_metrics() {
    local metrics
    metrics=$(curl -s --max-time 10 "$BASE_URL/api/performance/metrics" | jq '{
        total_requests: .metrics.requests.total,
        avg_response_time: .metrics.response_times.avg,
        error_rate: .metrics.errorRate,
        memory_used: .metrics.memory.heapUsed,
        requests_per_second: .metrics.requestsPerSecond
    }')
    
    log_message "📊 Key Metrics: $metrics"
}

send_alert() {
    local subject="$1"
    local message="$2"
    
    echo "$message" | mail -s "$subject" "$EMAIL_ALERT"
    log_message "📧 Alert sent: $subject"
}

main() {
    log_message "🔍 Starting health check..."
    
    local health_check=0
    local perf_check=0
    
    # Check application health
    if ! check_health; then
        health_check=1
        send_alert "SBC Alert: Application Health Issue" "Application health check failed. Please investigate immediately."
    fi
    
    # Check performance
    check_performance
    perf_status=$?
    
    if [ $perf_status -eq 2 ]; then
        send_alert "SBC Alert: Critical Performance Issue" "Performance is critical. Immediate action required."
    elif [ $perf_status -eq 1 ]; then
        send_alert "SBC Alert: Performance Warning" "Performance warning detected. Please review metrics."
    fi
    
    # Get current metrics
    get_key_metrics
    
    # Overall status
    if [ $health_check -eq 0 ] && [ $perf_status -eq 0 ]; then
        log_message "${GREEN}✅ Overall Status: ALL SYSTEMS HEALTHY${NC}"
    else
        log_message "${RED}🚨 Overall Status: ISSUES DETECTED${NC}"
    fi
    
    log_message "✅ Health check completed\n"
}

# Run main function
main
```

</details>

### Cron Job Setup

<details>
<summary>Click to expand cron job configuration</summary>

```bash
# Add to crontab (crontab -e)

# Health check every 5 minutes
*/5 * * * * /path/to/scripts/health-check.sh

# Daily summary report
0 9 * * * /path/to/scripts/daily-report.sh

# Weekly performance report
0 9 * * 1 /path/to/scripts/weekly-report.sh
```

</details>

## Log Monitoring

### Log Locations

#### PM2 Logs (on EC2 server)

<details>
<summary>Click to expand PM2 log commands</summary>

```bash
# Real-time application logs
pm2 logs sbc-system --timestamp

# Error logs only
pm2 logs sbc-system --err

# Specific number of lines
pm2 logs sbc-system --lines 100
```

</details>

#### AWS CloudWatch Log Groups
- `/aws/ec2/sbc-system/application` - Application logs
- `/aws/ec2/sbc-system/pm2-combined` - PM2 process logs  
- `/aws/ec2/sbc-system/system` - System logs

### Web-based Log Viewer

**URL:** `http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/logs`

**Features:**
- Real-time log streaming
- Filter by log level (ERROR, WARN, INFO)
- Auto-refresh capability
- Search functionality

### Log Analysis Commands

<details>
<summary>Click to expand log analysis commands</summary>

```bash
# SSH to EC2 instance
ssh -i your-key.pem ubuntu@ec2-54-86-8-77.compute-1.amazonaws.com

# View recent errors
pm2 logs sbc-system --lines 100 | grep "ERROR"

# View performance logs
pm2 logs sbc-system --lines 100 | grep "PERFORMANCE"

# View webhook activity
pm2 logs sbc-system --lines 100 | grep "WEBHOOK"

# View startup logs
pm2 logs sbc-system --lines 100 | grep "STARTUP"
```

</details>

## Automated Monitoring Setup

### 1. Uptime Monitoring with UptimeRobot

**Setup Steps:**
1. Sign up at [UptimeRobot](https://uptimerobot.com)
2. Create HTTP(s) monitor
3. URL: `http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/health`
4. Check interval: 5 minutes
5. Alert contacts: Email, SMS, Slack

### 2. Performance Monitoring Script

Create `scripts/performance-monitor.sh`:

<details>
<summary>Click to expand performance monitoring script</summary>

```bash
#!/bin/bash
# Performance Monitoring Script
# Runs continuously and alerts on issues

BASE_URL="http://ec2-54-86-8-77.compute-1.amazonaws.com:3000"
ALERT_EMAIL="admin@yourcompany.com"

# Thresholds
MAX_RESPONSE_TIME=1000
MAX_ERROR_RATE=5
MAX_MEMORY_PERCENT=85

monitor_performance() {
    local metrics
    metrics=$(curl -s "$BASE_URL/api/performance/metrics")
    
    local avg_time
    local error_rate
    local memory_used
    
    avg_time=$(echo "$metrics" | jq -r '.metrics.response_times.avg')
    error_rate=$(echo "$metrics" | jq -r '.metrics.errorRate | tonumber')
    
    # Check response time
    if (( $(echo "$avg_time > $MAX_RESPONSE_TIME" | bc -l) )); then
        echo "⚠️ High response time: ${avg_time}ms" | mail -s "SBC Alert: High Response Time" "$ALERT_EMAIL"
    fi
    
    # Check error rate
    if (( $(echo "$error_rate > $MAX_ERROR_RATE" | bc -l) )); then
        echo "⚠️ High error rate: ${error_rate}%" | mail -s "SBC Alert: High Error Rate" "$ALERT_EMAIL"
    fi
}

# Run monitoring loop
while true; do
    monitor_performance
    sleep 300  # Check every 5 minutes
done
```

</details>

### 3. Daily Report Script

Create `scripts/daily-report.sh`:

<details>
<summary>Click to expand daily report script</summary>

```bash
#!/bin/bash
# Daily Performance Report
# Sends summary of daily metrics

BASE_URL="http://ec2-54-86-8-77.compute-1.amazonaws.com:3000"
EMAIL="admin@yourcompany.com"

generate_report() {
    local metrics
    metrics=$(curl -s "$BASE_URL/api/performance/metrics")
    
    cat > /tmp/daily_report.txt << EOF
Daily Performance Report - $(date)
=====================================

Application Status: $(curl -s "$BASE_URL/health" | jq -r '.status')

Key Metrics:
- Total Requests: $(echo "$metrics" | jq -r '.metrics.requests.total')
- Average Response Time: $(echo "$metrics" | jq -r '.metrics.response_times.avg')ms
- Error Rate: $(echo "$metrics" | jq -r '.metrics.errorRate')%
- Memory Usage: $(echo "$metrics" | jq -r '.metrics.memory.heapUsed')
- Requests/Second: $(echo "$metrics" | jq -r '.metrics.requestsPerSecond')

Performance Health: $(curl -s "$BASE_URL/api/performance/health" | jq -r '.health.status')

Top Routes:
$(curl -s "$BASE_URL/api/performance/top-routes" | jq -r '.topRoutes[] | "\(.route): \(.count) requests"')

Slow Requests (>500ms):
$(curl -s "$BASE_URL/api/performance/slow-requests" | jq -r '.slowRequests[] | "\(.method) \(.route): \(.duration)"')

System Uptime: $(echo "$metrics" | jq -r '.metrics.uptime.readable')

=====================================
Report generated at: $(date)
EOF

    mail -s "SBC Daily Performance Report" "$EMAIL" < /tmp/daily_report.txt
}

generate_report
```

</details>

## AWS CloudWatch Integration

### CloudWatch Metrics Setup

<details>
<summary>Click to expand CloudWatch metrics configuration</summary>

```bash
# Install CloudWatch agent on EC2
sudo yum install amazon-cloudwatch-agent

# Configure custom metrics
aws logs put-metric-filter \
  --log-group-name "/aws/ec2/sbc-system/application" \
  --filter-name "ErrorCount" \
  --filter-pattern "ERROR" \
  --metric-transformations \
    metricName=ErrorCount,metricNamespace=SBC/Application,metricValue=1

aws logs put-metric-filter \
  --log-group-name "/aws/ec2/sbc-system/application" \
  --filter-name "PerformanceWarnings" \
  --filter-pattern "PERFORMANCE.*warning" \
  --metric-transformations \
    metricName=PerformanceWarnings,metricNamespace=SBC/Application,metricValue=1
```

</details>

### CloudWatch Alarms

<details>
<summary>Click to expand CloudWatch alarms configuration</summary>

```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "SBC-High-Error-Rate" \
  --alarm-description "Error rate above 5%" \
  --metric-name ErrorCount \
  --namespace SBC/Application \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# High CPU usage alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "SBC-High-CPU" \
  --alarm-description "CPU usage above 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0

# Low disk space alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "SBC-Low-Disk-Space" \
  --alarm-description "Disk usage above 90%" \
  --metric-name DiskSpaceUtilization \
  --namespace System/Linux \
  --statistic Average \
  --period 300 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

</details>

### CloudWatch Dashboard

Create a custom dashboard to visualize metrics:

<details>
<summary>Click to expand CloudWatch dashboard configuration</summary>

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/EC2", "CPUUtilization", "InstanceId", "i-1234567890abcdef0"],
          [".", "NetworkIn", ".", "."],
          [".", "NetworkOut", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "EC2 Instance Metrics"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '/aws/ec2/sbc-system/application'\n| fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 100",
        "region": "us-east-1",
        "title": "Recent Errors"
      }
    }
  ]
}
```

</details>

## Alert Configuration

### Alert Levels and Actions

#### 🟢 **INFO Alerts**
- **Triggers:** Application restarts, deployments
- **Action:** Log only
- **Recipients:** Development team

#### 🟡 **WARNING Alerts**
- **Triggers:** 
  - Response time > 500ms average
  - Error rate > 5%
  - Memory usage > 80%
- **Action:** Email notification
- **Recipients:** DevOps team

#### 🔴 **CRITICAL Alerts**
- **Triggers:**
  - Service down (health check fails)
  - Response time > 2s average
  - Error rate > 15%
  - Memory usage > 90%
- **Action:** Immediate notification (email + SMS)
- **Recipients:** On-call engineer, DevOps team

### Alert Notification Channels

#### Email Alerts

<details>
<summary>Click to expand email configuration</summary>

```bash
# Configure mail on EC2 instance
sudo apt-get install mailutils

# Test email
echo "Test alert from SBC monitoring" | mail -s "Test Alert" admin@yourcompany.com
```

</details>

#### Slack Integration

<details>
<summary>Click to expand Slack integration</summary>

```bash
# Slack webhook URL
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# Send Slack alert
send_slack_alert() {
    local message="$1"
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 SBC Alert: $message\"}" \
        "$SLACK_WEBHOOK"
}
```

</details>

#### SMS Alerts (via AWS SNS)

<details>
<summary>Click to expand SMS alerts configuration</summary>

```bash
# Create SNS topic
aws sns create-topic --name sbc-alerts

# Subscribe phone number
aws sns subscribe \
    --topic-arn arn:aws:sns:us-east-1:123456789012:sbc-alerts \
    --protocol sms \
    --notification-endpoint +1234567890

# Send SMS alert
aws sns publish \
    --topic-arn arn:aws:sns:us-east-1:123456789012:sbc-alerts \
    --message "SBC Critical Alert: Service is down"
```

</details>

## Load Testing & Performance

### Running Load Tests

The application includes comprehensive load testing tools:

<details>
<summary>Click to expand load testing commands</summary>

```bash
# Navigate to load test directory
cd tests/load

# Run all tests against production
./run-load-tests.sh production

# Run specific scenarios
npm run load:k6:light      # 5 users, 2 minutes
npm run load:k6:medium     # 25 users, 5 minutes  
npm run load:k6:heavy      # 100 users, 10 minutes

# Run Artillery tests
npm run load:artillery
```

</details>

### Performance Testing Schedule

#### Weekly Performance Tests

<details>
<summary>Click to expand weekly test configuration</summary>

```bash
# Add to crontab
0 2 * * 1 cd /path/to/sbc && npm run load:k6:light >> /var/log/sbc-load-test.log 2>&1
```

</details>

#### Pre-deployment Tests

<details>
<summary>Click to expand pre-deployment testing</summary>

```bash
# Run before major deployments
./tests/load/run-load-tests.sh production
```

</details>

### Performance Benchmarks

#### Response Time Targets
```
Login/Authentication:     < 300ms
Business Operations:      < 500ms
WhatsApp Webhook:        < 200ms
API Documentation:       < 1000ms
Performance Metrics:     < 100ms
```

#### Throughput Targets
```
Light Load:    5 req/sec   (baseline)
Medium Load:   25 req/sec  (normal business hours)
Heavy Load:    100 req/sec (peak usage)
```

#### Load Test Results Analysis

<details>
<summary>Click to expand load test analysis commands</summary>

```bash
# View load test results
ls -la tests/load/results/

# Analyze K6 results
jq '.metrics.http_req_duration.avg' tests/load/results/k6_light_production_*.json

# View Artillery HTML report
open tests/load/results/artillery_production_*.html
```

</details>

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. High Response Times

**Symptoms:**
- Average response time > 1s
- Performance health status: warning/critical

**Investigation:**

<details>
<summary>Click to expand investigation commands</summary>

```bash
# Check slow requests
curl -s http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/slow-requests

# Check system resources
ssh ubuntu@ec2-54-86-8-77.compute-1.amazonaws.com
top
df -h
free -m
```

</details>

**Solutions:**
- Restart PM2 process: `pm2 restart sbc-system`
- Check database connections
- Optimize slow queries
- Scale vertically (upgrade instance)

#### 2. High Error Rates

**Symptoms:**
- Error rate > 5%
- Failed requests in logs

**Investigation:**

<details>
<summary>Click to expand error investigation commands</summary>

```bash
# Check error logs
pm2 logs sbc-system --err --lines 50

# Check specific error types
curl -s http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/metrics | jq '.metrics.requests.byStatusCode'
```

</details>

**Solutions:**
- Review error logs for patterns
- Check external service connectivity (Twilio, OpenAI)
- Verify environment variables
- Check database connection

#### 3. Memory Issues

**Symptoms:**
- Memory usage > 85%
- Application restarts frequently

**Investigation:**

<details>
<summary>Click to expand memory investigation commands</summary>

```bash
# Check memory usage
curl -s http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/metrics | jq '.metrics.memory'

# System memory
ssh ubuntu@ec2-54-86-8-77.compute-1.amazonaws.com
free -m
```

</details>

**Solutions:**
- Restart application: `pm2 restart sbc-system`
- Review memory leaks in code
- Upgrade instance type
- Implement memory optimization

#### 4. Service Unavailable

**Symptoms:**
- Health check returns error
- Application not responding

**Investigation:**

<details>
<summary>Click to expand service investigation commands</summary>

```bash
# Check PM2 status
ssh ubuntu@ec2-54-86-8-77.compute-1.amazonaws.com
pm2 status

# Check application logs
pm2 logs sbc-system --lines 100
```

</details>

**Solutions:**

<details>
<summary>Click to expand service recovery commands</summary>

```bash
# Restart application
pm2 restart sbc-system

# If restart fails, check and fix issues then start
pm2 start ecosystem.config.js --env production

# Check system resources
df -h  # Disk space
free -m  # Memory
top  # CPU usage
```

</details>

### Emergency Response Procedures

#### Service Down Response
1. **Immediate Action (0-5 minutes):**
   - Check health endpoint
   - Restart PM2 process
   - Verify basic connectivity

2. **Investigation (5-15 minutes):**
   - Review error logs
   - Check system resources
   - Verify external dependencies

3. **Resolution (15-30 minutes):**
   - Apply fixes based on investigation
   - Test service functionality
   - Monitor for stability

4. **Post-Incident (30+ minutes):**
   - Document root cause
   - Implement preventive measures
   - Update monitoring thresholds

## Scaling Recommendations

### When to Scale

#### Vertical Scaling (Upgrade Instance)
**Triggers:**
- CPU usage > 70% sustained
- Memory usage > 85% sustained
- Response time > 1s consistently

**Actions:**
1. Stop application: `pm2 stop sbc-system`
2. Create AMI backup
3. Upgrade EC2 instance type
4. Restart application: `pm2 start ecosystem.config.js`

#### Horizontal Scaling (Multiple Instances)
**Triggers:**
- Requests/second > 50 sustained
- Single instance at capacity
- Need for high availability

**Actions:**
1. Set up Application Load Balancer
2. Create additional EC2 instances
3. Configure auto-scaling group
4. Update DNS/routing

#### Database Scaling
**Triggers:**
- Database response time > 100ms
- High query load
- Connection pool exhaustion

**Actions:**
1. Optimize slow queries
2. Add database indexes
3. Implement connection pooling
4. Consider read replicas

### Performance Optimization

#### Application Level
- Implement Redis caching
- Optimize database queries
- Add request/response compression
- Enable HTTP/2

#### Infrastructure Level
- Use CDN for static assets
- Implement load balancing
- Add monitoring and alerting
- Use reserved instances for cost optimization

## Monitoring Checklist

### Daily Checks
- [ ] Application health status
- [ ] Performance metrics review
- [ ] Error rate analysis
- [ ] Memory usage check
- [ ] Log review for issues

### Weekly Checks
- [ ] Performance trend analysis
- [ ] Load test execution
- [ ] Backup verification
- [ ] Security audit
- [ ] Capacity planning review

### Monthly Checks
- [ ] Performance baseline update
- [ ] Alert threshold review
- [ ] Infrastructure cost analysis
- [ ] Disaster recovery testing
- [ ] Documentation updates

## Support and Contacts

### Emergency Contacts
- **Primary On-call:** [Your phone number]
- **Secondary:** [Backup contact]
- **Email:** admin@yourcompany.com

### Escalation Procedures
1. **Level 1:** DevOps team member
2. **Level 2:** Senior engineer
3. **Level 3:** Engineering manager

### Resources
- **Application Repository:** https://github.com/ravikalla/ai-small-business-customercare
- **AWS Console:** [Your AWS account]
- **Monitoring Dashboard:** [CloudWatch dashboard URL]
- **Documentation:** [Internal wiki/confluence]

---

**Last Updated:** 2025-06-24  
**Version:** 1.0  
**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>