#!/bin/bash
#
# Complete CloudWatch Setup Automation Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
# 
# This script automates the entire CloudWatch logging setup process including:
# - Installing CloudWatch agent
# - Creating proper configuration
# - Setting up permissions
# - Auto-discovering application logs
# - Starting services
#

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on EC2
check_ec2() {
    log_info "Checking if running on EC2..."
    if curl -s --max-time 3 http://169.254.169.254/latest/meta-data/instance-id > /dev/null 2>&1; then
        INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
        log_success "Running on EC2 instance: $INSTANCE_ID"
        return 0
    else
        log_error "This script must be run on an EC2 instance"
        exit 1
    fi
}

# Check IAM role
check_iam_role() {
    log_info "Checking IAM role configuration..."
    
    if curl -s --max-time 5 http://169.254.169.254/latest/meta-data/iam/security-credentials/ > /dev/null 2>&1; then
        ROLE_NAME=$(curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/)
        if [ -n "$ROLE_NAME" ]; then
            log_success "IAM role found: $ROLE_NAME"
            return 0
        fi
    fi
    
    log_error "No IAM role attached to this EC2 instance!"
    log_error "Please attach an IAM role with CloudWatch permissions before running this script."
    log_error "Required permissions: CloudWatchAgentServerPolicy or custom policy with logs:* permissions"
    exit 1
}

# Install CloudWatch agent
install_cloudwatch_agent() {
    log_info "Installing CloudWatch agent..."
    
    # Update system
    sudo apt-get update -y
    
    # Download and install CloudWatch agent
    if [ ! -f /tmp/amazon-cloudwatch-agent.deb ]; then
        log_info "Downloading CloudWatch agent..."
        wget -O /tmp/amazon-cloudwatch-agent.deb \
            https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
    fi
    
    log_info "Installing CloudWatch agent package..."
    sudo dpkg -i /tmp/amazon-cloudwatch-agent.deb
    
    log_success "CloudWatch agent installed"
}

# Create cwagent user if it doesn't exist
setup_cwagent_user() {
    log_info "Setting up cwagent user..."
    
    if ! id cwagent > /dev/null 2>&1; then
        log_info "Creating cwagent user..."
        sudo useradd -r -s /sbin/nologin cwagent
    else
        log_info "cwagent user already exists"
    fi
    
    # Add cwagent to necessary groups
    sudo usermod -a -G syslog cwagent
    sudo usermod -a -G ubuntu cwagent  # For accessing application logs
    
    log_success "cwagent user configured"
}

# Auto-discover application logs
discover_app_logs() {
    log_info "Auto-discovering application logs..."
    
    APP_LOGS=()
    
    # Common Node.js application log locations
    if [ -d "/var/www" ]; then
        for app_dir in /var/www/*/; do
            if [ -d "${app_dir}logs" ]; then
                log_info "Found logs directory: ${app_dir}logs"
                for log_file in "${app_dir}logs"/*.log; do
                    if [ -f "$log_file" ]; then
                        APP_LOGS+=("$log_file")
                        log_info "Found log file: $log_file"
                    fi
                done
            fi
        done
    fi
    
    # Check for PM2 logs
    if [ -d "$HOME/.pm2/logs" ]; then
        log_info "Found PM2 logs directory"
        for log_file in "$HOME/.pm2/logs"/*.log; do
            if [ -f "$log_file" ]; then
                APP_LOGS+=("$log_file")
                log_info "Found PM2 log file: $log_file"
            fi
        done
    fi
    
    log_success "Discovered ${#APP_LOGS[@]} application log files"
}

# Create CloudWatch configuration
create_cloudwatch_config() {
    log_info "Creating CloudWatch agent configuration..."
    
    # Create configuration directory
    sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc
    
    # Generate configuration JSON
    cat << 'EOF' | sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "cwagent"
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/syslog",
                        "log_group_name": "/aws/ec2/sbc-system/system",
                        "log_stream_name": "{instance_id}",
                        "timezone": "UTC"
                    }
                ]
            }
        }
    },
    "metrics": {
        "namespace": "SBC/EC2",
        "metrics_collected": {
            "cpu": {
                "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": ["used_percent"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "mem": {
                "measurement": ["mem_used_percent"],
                "metrics_collection_interval": 60
            },
            "netstat": {
                "measurement": ["tcp_established", "tcp_time_wait"],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF
    
    # Add application logs to configuration
    if [ ${#APP_LOGS[@]} -gt 0 ]; then
        log_info "Adding application logs to configuration..."
        
        # Create a temporary Python script to modify JSON
        cat << 'PYTHON_SCRIPT' > /tmp/add_logs.py
import json
import sys

config_file = "/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json"

# Read current config
with open(config_file, 'r') as f:
    config = json.load(f)

# Application logs to add
app_logs = [
PYTHON_SCRIPT
        
        # Add each discovered log file
        for log_file in "${APP_LOGS[@]}"; do
            # Determine log group name based on file path
            if [[ "$log_file" == *"app.log"* ]]; then
                log_group="/aws/ec2/sbc-system/application"
            elif [[ "$log_file" == *"combined"* ]] || [[ "$log_file" == *"pm2"* ]]; then
                log_group="/aws/ec2/sbc-system/pm2-combined"
            elif [[ "$log_file" == *"error"* ]]; then
                log_group="/aws/ec2/sbc-system/errors"
            else
                log_group="/aws/ec2/sbc-system/misc"
            fi
            
            echo "    {\"file_path\": \"$log_file\", \"log_group_name\": \"$log_group\", \"log_stream_name\": \"{instance_id}\", \"timezone\": \"UTC\"}," >> /tmp/add_logs.py
        done
        
        cat << 'PYTHON_SCRIPT' >> /tmp/add_logs.py
]

# Add each log to the configuration
for log_entry in app_logs:
    if log_entry.strip():  # Skip empty entries
        log_config = {
            "file_path": log_entry["file_path"],
            "log_group_name": log_entry["log_group_name"], 
            "log_stream_name": log_entry["log_stream_name"],
            "timezone": log_entry["timezone"]
        }
        config["logs"]["logs_collected"]["files"]["collect_list"].append(log_config)

# Write updated config
with open(config_file, 'w') as f:
    json.dump(config, f, indent=4)

print("Configuration updated with application logs")
PYTHON_SCRIPT
        
        # Run the Python script
        sudo python3 /tmp/add_logs.py
        rm /tmp/add_logs.py
    fi
    
    log_success "CloudWatch configuration created"
}

# Fix permissions for log files
fix_log_permissions() {
    log_info "Fixing log file permissions..."
    
    # Fix system log permissions
    sudo chmod 640 /var/log/syslog
    sudo chgrp syslog /var/log/syslog
    
    # Fix application log permissions
    for log_file in "${APP_LOGS[@]}"; do
        if [ -f "$log_file" ]; then
            log_info "Setting permissions for: $log_file"
            sudo chmod 644 "$log_file"
            
            # Set directory permissions too
            log_dir=$(dirname "$log_file")
            sudo chmod 755 "$log_dir"
        fi
    done
    
    log_success "Log permissions configured"
}

# Start CloudWatch agent
start_cloudwatch_agent() {
    log_info "Starting CloudWatch agent..."
    
    # Stop any existing agent
    sudo systemctl stop amazon-cloudwatch-agent 2>/dev/null || true
    
    # Start agent with new configuration
    sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
        -a fetch-config -m ec2 -s \
        -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
    
    # Enable auto-start
    sudo systemctl enable amazon-cloudwatch-agent
    
    # Wait a moment and check status
    sleep 5
    
    if sudo systemctl is-active --quiet amazon-cloudwatch-agent; then
        log_success "CloudWatch agent is running"
    else
        log_error "CloudWatch agent failed to start"
        log_info "Checking logs..."
        sudo tail -20 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
        exit 1
    fi
}

# Verify setup
verify_setup() {
    log_info "Verifying CloudWatch setup..."
    
    # Check agent status
    if sudo systemctl is-active --quiet amazon-cloudwatch-agent; then
        log_success "✓ CloudWatch agent is running"
    else
        log_error "✗ CloudWatch agent is not running"
        return 1
    fi
    
    # Check configuration
    if [ -f "/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json" ]; then
        log_success "✓ Configuration file exists"
    else
        log_error "✗ Configuration file missing"
        return 1
    fi
    
    # Check recent logs for errors
    if sudo tail -10 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log | grep -q "ERROR\|FATAL"; then
        log_warning "⚠ Recent errors found in agent logs"
        log_info "Recent logs:"
        sudo tail -10 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
    else
        log_success "✓ No recent errors in agent logs"
    fi
    
    return 0
}

# Print summary
print_summary() {
    echo
    log_success "=== CloudWatch Setup Complete ==="
    echo
    log_info "Log Groups Created:"
    log_info "  • /aws/ec2/sbc-system/system (system logs)"
    log_info "  • /aws/ec2/sbc-system/application (app logs)"
    log_info "  • /aws/ec2/sbc-system/pm2-combined (PM2 logs)"
    log_info "  • /aws/ec2/sbc-system/errors (error logs)"
    echo
    log_info "Next Steps:"
    log_info "  1. Check CloudWatch Console: https://console.aws.amazon.com/cloudwatch/"
    log_info "  2. Navigate to Logs → Log groups"
    log_info "  3. Set up log retention policies to control costs"
    log_info "  4. Create CloudWatch alarms for error monitoring"
    log_info "  5. Set up CloudWatch dashboard for monitoring"
    echo
    log_info "Useful Commands:"
    log_info "  • Check agent status: sudo systemctl status amazon-cloudwatch-agent"
    log_info "  • View agent logs: sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log"
    log_info "  • Restart agent: sudo systemctl restart amazon-cloudwatch-agent"
    echo
}

# Main execution
main() {
    echo
    log_info "=== SBC CloudWatch Complete Setup ==="
    log_info "This script will automatically configure CloudWatch logging for your SBC system"
    echo
    
    # Pre-flight checks
    check_ec2
    check_iam_role
    
    # Main setup steps
    install_cloudwatch_agent
    setup_cwagent_user
    discover_app_logs
    create_cloudwatch_config
    fix_log_permissions
    start_cloudwatch_agent
    
    # Verification
    if verify_setup; then
        print_summary
        log_success "CloudWatch setup completed successfully! 🎉"
    else
        log_error "Setup completed with warnings. Please check the issues above."
        exit 1
    fi
}

# Run main function
main "$@"