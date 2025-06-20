#!/bin/bash

# CloudWatch Logs Setup Script for SBC System
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

echo "🔍 Setting up CloudWatch Logs for SBC System"
echo "============================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -y

# Install CloudWatch agent
echo "🔧 Installing CloudWatch agent..."
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Create CloudWatch agent configuration
echo "⚙️ Creating CloudWatch agent configuration..."
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null << 'EOF'
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
                        "timezone": "UTC",
                        "timestamp_format": "%Y-%m-%d %H:%M:%S"
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
                    },
                    {
                        "file_path": "/home/ubuntu/.pm2/logs/sbc-system-out.log",
                        "log_group_name": "/aws/ec2/sbc-system/pm2",
                        "log_stream_name": "{instance_id}/pm2-out.log",
                        "timezone": "UTC"
                    },
                    {
                        "file_path": "/home/ubuntu/.pm2/logs/sbc-system-error.log",
                        "log_group_name": "/aws/ec2/sbc-system/pm2",
                        "log_stream_name": "{instance_id}/pm2-error.log",
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
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60,
                "totalcpu": false
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "diskio": {
                "measurement": [
                    "io_time"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            },
            "netstat": {
                "measurement": [
                    "tcp_established",
                    "tcp_time_wait"
                ],
                "metrics_collection_interval": 60
            },
            "swap": {
                "measurement": [
                    "swap_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

# Create logs directory if it doesn't exist
echo "📁 Creating logs directory..."
sudo mkdir -p /var/www/sbc-system/logs
sudo chown ubuntu:ubuntu /var/www/sbc-system/logs

# Start CloudWatch agent
echo "🚀 Starting CloudWatch agent..."
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a start \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Enable CloudWatch agent to start on boot
echo "⚙️ Enabling CloudWatch agent on boot..."
sudo systemctl enable amazon-cloudwatch-agent

# Show status
echo "📊 CloudWatch agent status:"
sudo systemctl status amazon-cloudwatch-agent --no-pager

echo ""
echo "✅ CloudWatch Logs setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Attach CloudWatch IAM role to EC2 instance"
echo "2. Check CloudWatch Logs console in AWS"
echo "3. Set up log insights and alarms"
echo ""
echo "🔗 Log Groups created:"
echo "   - /aws/ec2/sbc-system/application"
echo "   - /aws/ec2/sbc-system/nginx"  
echo "   - /aws/ec2/sbc-system/pm2"
echo ""