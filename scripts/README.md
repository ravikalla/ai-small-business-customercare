# Monitoring Scripts

This directory contains automated monitoring scripts for the Small Business Chatbot application.

## Scripts Overview

### 🔍 health-check.sh
**Purpose:** Comprehensive health check script that verifies application status and performance.

**Usage:**
```bash
./scripts/health-check.sh
```

**Features:**
- Application health verification
- Performance status checking
- Key metrics collection
- Automatic alerting via email
- Colored console output
- Detailed logging

**Setup:**
```bash
# Run manually
./scripts/health-check.sh

# Add to crontab for automated checks
*/5 * * * * /path/to/sbc/scripts/health-check.sh

# Configure email alerts
# Edit the EMAIL_ALERT variable in the script
```

### 📊 daily-report.sh
**Purpose:** Generates comprehensive daily performance reports.

**Usage:**
```bash
./scripts/daily-report.sh
```

**Features:**
- Complete performance summary
- Traffic analysis
- Error rate reporting
- Memory utilization tracking
- Top routes analysis
- Slow request identification
- Business metrics
- Email delivery

**Setup:**
```bash
# Run manually
./scripts/daily-report.sh

# Schedule daily reports
0 9 * * * /path/to/sbc/scripts/daily-report.sh

# Configure email recipient
# Edit the EMAIL variable in the script
```

### ⚡ performance-monitor.sh
**Purpose:** Continuous performance monitoring daemon with real-time alerting.

**Usage:**
```bash
# Start monitoring
./scripts/performance-monitor.sh start

# Check status
./scripts/performance-monitor.sh status

# Stop monitoring
./scripts/performance-monitor.sh stop

# Restart monitoring
./scripts/performance-monitor.sh restart
```

**Features:**
- Continuous monitoring (every minute)
- Real-time threshold checking
- Alert cooldown to prevent spam
- Configurable thresholds
- Daemon mode operation
- PID file management
- Signal handling for clean shutdown

**Configuration:**
Edit the following variables in the script:
```bash
MAX_RESPONSE_TIME=1000      # milliseconds
MAX_ERROR_RATE=5            # percentage  
MAX_MEMORY_PERCENT=85       # percentage
ALERT_EMAIL="your@email.com"
```

## Installation and Setup

### 1. Prerequisites
```bash
# Install required tools
sudo apt-get update
sudo apt-get install curl jq bc mailutils

# For macOS
brew install curl jq
```

### 2. Configure Email Alerts
```bash
# Ubuntu/Debian - Configure postfix
sudo apt-get install postfix mailutils
sudo dpkg-reconfigure postfix

# Test email functionality
echo "Test email" | mail -s "Test Subject" your@email.com
```

### 3. Set Up Automated Monitoring
```bash
# Edit crontab
crontab -e

# Add monitoring schedules
*/5 * * * * /path/to/sbc/scripts/health-check.sh
0 9 * * * /path/to/sbc/scripts/daily-report.sh

# Start continuous monitoring
./scripts/performance-monitor.sh start
```

### 4. Configure Log Rotation
```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/sbc-monitoring << EOF
/var/log/sbc-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
```

## Monitoring Schedule Recommendations

### Production Environment
```bash
# Health checks every 5 minutes
*/5 * * * * /path/to/sbc/scripts/health-check.sh

# Daily reports at 9 AM
0 9 * * * /path/to/sbc/scripts/daily-report.sh

# Weekly summary on Mondays at 9 AM
0 9 * * 1 /path/to/sbc/scripts/weekly-summary.sh

# Start performance monitor on boot
@reboot /path/to/sbc/scripts/performance-monitor.sh start
```

### Development Environment
```bash
# Health checks every 15 minutes
*/15 * * * * /path/to/sbc/scripts/health-check.sh

# Daily reports (optional)
0 18 * * * /path/to/sbc/scripts/daily-report.sh
```

## Log Files

### Default Log Locations
- Health Check: `/var/log/sbc-health-check.log`
- Performance Monitor: `/var/log/sbc-performance-monitor.log`
- Daily Reports: `/tmp/sbc_daily_report_YYYYMMDD.txt`

### Log Management
```bash
# View recent health check logs
tail -f /var/log/sbc-health-check.log

# View performance monitor logs
tail -f /var/log/sbc-performance-monitor.log

# Search for alerts
grep -i "alert\|critical\|warning" /var/log/sbc-*.log

# Check last 24 hours of activity
find /var/log -name "sbc-*.log" -exec grep "$(date --date='1 day ago' '+%Y-%m-%d')" {} \;
```

## Alert Configuration

### Email Recipients
Update the email addresses in each script:
```bash
# health-check.sh
EMAIL_ALERT="admin@yourcompany.com"

# daily-report.sh  
EMAIL="admin@yourcompany.com"

# performance-monitor.sh
ALERT_EMAIL="admin@yourcompany.com"
```

### Alert Thresholds
Customize thresholds based on your requirements:
```bash
# Response time alerts
MAX_RESPONSE_TIME=1000  # 1 second

# Error rate alerts
MAX_ERROR_RATE=5        # 5%

# Memory usage alerts
MAX_MEMORY_PERCENT=85   # 85%
```

### Alert Cooldown
Prevent alert spam by configuring cooldown periods:
```bash
# performance-monitor.sh
ALERT_COOLDOWN=300      # 5 minutes between similar alerts
```

## Troubleshooting

### Common Issues

#### 1. Email Not Sending
```bash
# Test mail configuration
echo "Test" | mail -s "Test" your@email.com

# Check mail logs
tail -f /var/log/mail.log

# Reconfigure postfix
sudo dpkg-reconfigure postfix
```

#### 2. Permission Denied
```bash
# Make scripts executable
chmod +x /path/to/sbc/scripts/*.sh

# Check log directory permissions
sudo mkdir -p /var/log
sudo chown $USER /var/log/sbc-*.log
```

#### 3. Curl Connection Errors
```bash
# Test connectivity
curl -v http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/health

# Check firewall rules
sudo ufw status

# Verify service is running
pm2 status
```

#### 4. JSON Parsing Errors
```bash
# Test jq installation
echo '{"test": "value"}' | jq .

# Install jq if missing
sudo apt-get install jq
```

### Debug Mode
Run scripts with debug output:
```bash
# Enable debug mode
bash -x ./scripts/health-check.sh

# Add debug logging to scripts
set -x  # Add to script for verbose output
```

## Integration with External Services

### Slack Notifications
Add Slack integration to scripts:
```bash
# Add to scripts
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

send_slack_alert() {
    local message="$1"
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 SBC Alert: $message\"}" \
        "$SLACK_WEBHOOK"
}
```

### PagerDuty Integration
For critical alerts:
```bash
# PagerDuty API integration
PAGERDUTY_ROUTING_KEY="your-routing-key"

send_pagerduty_alert() {
    local message="$1"
    curl -X POST "https://events.pagerduty.com/v2/enqueue" \
        -H "Content-Type: application/json" \
        -d "{
            \"routing_key\": \"$PAGERDUTY_ROUTING_KEY\",
            \"event_action\": \"trigger\",
            \"payload\": {
                \"summary\": \"SBC Alert: $message\",
                \"source\": \"sbc-monitoring\",
                \"severity\": \"critical\"
            }
        }"
}
```

## Best Practices

### 1. Security
- Store sensitive information in environment variables
- Use secure email configurations
- Implement proper file permissions
- Regular security updates

### 2. Reliability
- Test all scripts before production deployment
- Implement error handling and retries
- Use monitoring for the monitoring scripts
- Regular backup of monitoring configurations

### 3. Performance
- Avoid excessive monitoring frequency
- Implement efficient alerting strategies
- Use appropriate timeouts for HTTP requests
- Clean up old log files regularly

### 4. Maintenance
- Regular review of alert thresholds
- Update scripts for new application features
- Document all customizations
- Version control for monitoring configurations

## Support

For issues with monitoring scripts:
1. Check application logs
2. Verify script permissions
3. Test individual components
4. Review configuration variables
5. Contact: Ravi Kalla <ravi2523096+sbc@gmail.com>

---

**Last Updated:** 2025-06-24  
**Version:** 1.0  
**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>