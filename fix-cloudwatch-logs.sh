#!/bin/bash

# CloudWatch Logs Troubleshooting and Fix Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

echo "🔍 CloudWatch Logs Troubleshooting Script"
echo "=========================================="

# Check 1: IAM Role
echo ""
echo "1️⃣ Checking IAM Role..."
ROLE_CHECK=$(curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/ 2>/dev/null)
if [ -z "$ROLE_CHECK" ]; then
    echo "❌ No IAM role attached to this EC2 instance"
    echo "   Solution: Attach CloudWatch IAM role in AWS Console"
    echo "   EC2 → Instance → Actions → Security → Modify IAM role"
else
    echo "✅ IAM role found: $ROLE_CHECK"
fi

# Check 2: CloudWatch Agent Status
echo ""
echo "2️⃣ Checking CloudWatch Agent..."
if systemctl is-active --quiet amazon-cloudwatch-agent; then
    echo "✅ CloudWatch agent is running"
else
    echo "❌ CloudWatch agent is not running"
    echo "   Attempting to start agent..."
    sudo systemctl start amazon-cloudwatch-agent
    sudo systemctl enable amazon-cloudwatch-agent
fi

# Check 3: Log Files
echo ""
echo "3️⃣ Checking Log Files..."

# Application logs
APP_LOG="/var/www/sbc-system/logs/app.log"
if [ -f "$APP_LOG" ]; then
    echo "✅ Application log exists: $APP_LOG"
    echo "   Size: $(stat -c%s "$APP_LOG") bytes"
    echo "   Last modified: $(stat -c%y "$APP_LOG")"
else
    echo "❌ Application log missing: $APP_LOG"
    echo "   Creating log file and directory..."
    sudo mkdir -p /var/www/sbc-system/logs
    sudo touch "$APP_LOG"
    sudo chown ubuntu:ubuntu /var/www/sbc-system/logs/app.log
    echo "✅ Created application log file"
fi

# PM2 logs
PM2_OUT_LOG="$HOME/.pm2/logs/sbc-system-out.log"
PM2_ERR_LOG="$HOME/.pm2/logs/sbc-system-error.log"

if [ -f "$PM2_OUT_LOG" ]; then
    echo "✅ PM2 output log exists: $PM2_OUT_LOG"
else
    echo "❌ PM2 output log missing: $PM2_OUT_LOG"
    echo "   This usually means PM2 process isn't running correctly"
fi

if [ -f "$PM2_ERR_LOG" ]; then
    echo "✅ PM2 error log exists: $PM2_ERR_LOG"
else
    echo "❌ PM2 error log missing: $PM2_ERR_LOG"
fi

# Nginx logs
if [ -f "/var/log/nginx/access.log" ]; then
    echo "✅ Nginx access log exists"
else
    echo "❌ Nginx access log missing"
fi

if [ -f "/var/log/nginx/error.log" ]; then
    echo "✅ Nginx error log exists"
else
    echo "❌ Nginx error log missing"
fi

# Check 4: CloudWatch Agent Configuration
echo ""
echo "4️⃣ Checking CloudWatch Agent Configuration..."
CONFIG_FILE="/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json"
if [ -f "$CONFIG_FILE" ]; then
    echo "✅ CloudWatch config exists: $CONFIG_FILE"
    # Validate JSON
    if python3 -m json.tool "$CONFIG_FILE" > /dev/null 2>&1; then
        echo "✅ Configuration JSON is valid"
    else
        echo "❌ Configuration JSON is invalid"
        echo "   Recreating configuration..."
        
        # Recreate the configuration file
        sudo tee "$CONFIG_FILE" > /dev/null << 'EOF'
{
    "agent": {
        "run_as_user": "cwagent"
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/www/sbc-system/logs/app.log",
                        "log_group_name": "/aws/ec2/sbc-system/application",
                        "log_stream_name": "{instance_id}/application.log",
                        "timezone": "UTC"
                    },
                    {
                        "file_path": "/var/log/nginx/access.log",
                        "log_group_name": "/aws/ec2/sbc-system/nginx",
                        "log_stream_name": "{instance_id}/nginx-access.log",
                        "timezone": "UTC"
                    },
                    {
                        "file_path": "/var/log/nginx/error.log",
                        "log_group_name": "/aws/ec2/sbc-system/nginx",
                        "log_stream_name": "{instance_id}/nginx-error.log",
                        "timezone": "UTC"
                    }
                ]
            }
        }
    }
}
EOF
        echo "✅ Configuration recreated"
    fi
else
    echo "❌ CloudWatch config missing: $CONFIG_FILE"
    echo "   Run the setup-cloudwatch.sh script first"
fi

# Check 5: Generate Test Logs
echo ""
echo "5️⃣ Generating Test Logs..."

# Generate application activity
echo "   Generating application logs..."
curl -s http://localhost:3000/health > /dev/null
curl -s http://localhost:3000/api/businesses > /dev/null
curl -s http://localhost:3000/api/cache/stats > /dev/null

# Add some manual logs
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [INFO] CloudWatch test log entry" | sudo tee -a "$APP_LOG" > /dev/null
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [ERROR] CloudWatch test error entry" | sudo tee -a "$APP_LOG" > /dev/null

echo "✅ Test logs generated"

# Check 6: Restart Agent
echo ""
echo "6️⃣ Restarting CloudWatch Agent..."
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a stop -m ec2 -s

sleep 2

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a start -m ec2 -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

if [ $? -eq 0 ]; then
    echo "✅ CloudWatch agent restarted successfully"
else
    echo "❌ Failed to restart CloudWatch agent"
fi

# Check 7: Agent Logs
echo ""
echo "7️⃣ Checking Agent Logs for Errors..."
echo "Recent agent log entries:"
sudo tail -20 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log

# Check 8: Final Status
echo ""
echo "8️⃣ Final Status Check..."
if systemctl is-active --quiet amazon-cloudwatch-agent; then
    echo "✅ CloudWatch agent is running"
    echo "✅ Agent PID: $(pgrep amazon-cloudwatch-agent)"
else
    echo "❌ CloudWatch agent is not running"
fi

echo ""
echo "🔍 Troubleshooting Summary:"
echo "=========================="
echo ""
echo "If log groups still don't appear in 5-10 minutes:"
echo ""
echo "1. Check AWS region in CloudWatch console"
echo "2. Verify IAM permissions include:"
echo "   - logs:CreateLogGroup"
echo "   - logs:CreateLogStream"
echo "   - logs:PutLogEvents"
echo ""
echo "3. Check agent logs for specific errors:"
echo "   sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log"
echo ""
echo "4. Verify AWS credentials:"
echo "   aws sts get-caller-identity"
echo ""
echo "5. Manual log group creation:"
echo "   aws logs create-log-group --log-group-name '/aws/ec2/sbc-system/application'"
echo ""
echo "💡 Remember: Log groups appear only after the first log entry is sent!"
echo "   It may take 5-10 minutes for initial setup."