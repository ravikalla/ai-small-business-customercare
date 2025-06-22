#!/bin/bash
# User Data Script for SBC System
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

set -e

# Configuration
PROJECT_NAME="${project_name}"
ENVIRONMENT="${environment}"
APP_DIR="/var/www/$PROJECT_NAME"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a /var/log/sbc-setup.log
}

log "Starting SBC system setup..."

# Update system
log "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install required packages
log "Installing required packages..."
apt-get install -y \
    nodejs \
    npm \
    nginx \
    awscli \
    git \
    curl \
    wget \
    unzip \
    jq \
    htop

# Install PM2 globally
log "Installing PM2..."
npm install -g pm2

# Create application directory
log "Setting up application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clone application repository
log "Cloning application repository..."
git clone https://github.com/ravikalla/ai-small-business-customercare.git .

# Install application dependencies
log "Installing application dependencies..."
npm install --production

# Create environment loading script
log "Creating environment loading script..."
cat > load-env-from-ssm.sh << 'EOF'
#!/bin/bash
# Load environment variables from AWS Systems Manager Parameter Store

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Loading environment variables from Parameter Store..."

export NODE_ENV=$(aws ssm get-parameter --name "/sbc/production/node-env" --query "Parameter.Value" --output text 2>/dev/null || echo "production")
export PORT=$(aws ssm get-parameter --name "/sbc/production/port" --query "Parameter.Value" --output text 2>/dev/null || echo "3000")
export PINECONE_API_KEY=$(aws ssm get-parameter --name "/sbc/production/pinecone-api-key" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
export PINECONE_ENVIRONMENT=$(aws ssm get-parameter --name "/sbc/production/pinecone-environment" --query "Parameter.Value" --output text 2>/dev/null || echo "")
export PINECONE_INDEX_NAME=$(aws ssm get-parameter --name "/sbc/production/pinecone-index-name" --query "Parameter.Value" --output text 2>/dev/null || echo "")
export SUPABASE_URL=$(aws ssm get-parameter --name "/sbc/production/supabase-url" --query "Parameter.Value" --output text 2>/dev/null || echo "")
export SUPABASE_ANON_KEY=$(aws ssm get-parameter --name "/sbc/production/supabase-anon-key" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
export TWILIO_ACCOUNT_SID=$(aws ssm get-parameter --name "/sbc/production/twilio-account-sid" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
export TWILIO_AUTH_TOKEN=$(aws ssm get-parameter --name "/sbc/production/twilio-auth-token" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
export OPENAI_API_KEY=$(aws ssm get-parameter --name "/sbc/production/openai-api-key" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")
export WEBHOOK_BASE_URL="http://$(curl -s http://169.254.169.254/latest/meta-data/public-hostname)/"

log "Environment variables loaded successfully"
EOF

chmod +x load-env-from-ssm.sh

# Create ecosystem configuration for PM2
log "Creating PM2 ecosystem configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'sbc-system',
    script: 'src/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    time: true,
    restart_delay: 4000,
    max_memory_restart: '200M'
  }]
};
EOF

# Create logs directory
log "Creating logs directory..."
mkdir -p logs

# Load environment variables and start application
log "Loading environment variables and starting application..."
source ./load-env-from-ssm.sh

# Start application with PM2
log "Starting application with PM2..."
pm2 start ecosystem.config.js --env production
pm2 save

# Configure PM2 to start on boot
log "Configuring PM2 startup..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save

# Download and install CloudWatch agent
log "Installing CloudWatch agent..."
wget -O /tmp/amazon-cloudwatch-agent.deb \
    https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i /tmp/amazon-cloudwatch-agent.deb

# Create CloudWatch agent configuration
log "Configuring CloudWatch agent..."
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
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
                    },
                    {
                        "file_path": "/var/www/sbc-system/logs/combined.log",
                        "log_group_name": "/aws/ec2/sbc-system/application",
                        "log_stream_name": "{instance_id}",
                        "timezone": "UTC"
                    },
                    {
                        "file_path": "/var/www/sbc-system/logs/out.log",
                        "log_group_name": "/aws/ec2/sbc-system/pm2-combined",
                        "log_stream_name": "{instance_id}-out",
                        "timezone": "UTC"
                    },
                    {
                        "file_path": "/var/www/sbc-system/logs/error.log",
                        "log_group_name": "/aws/ec2/sbc-system/pm2-combined",
                        "log_stream_name": "{instance_id}-error",
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

# Set up log file permissions
log "Setting up log file permissions..."
usermod -a -G syslog cwagent
usermod -a -G ubuntu cwagent
chmod 644 /var/log/syslog
chgrp syslog /var/log/syslog

# Start CloudWatch agent
log "Starting CloudWatch agent..."
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Enable CloudWatch agent to start on boot
systemctl enable amazon-cloudwatch-agent

# Configure Nginx (basic configuration)
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/sbc-system << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/sbc-system /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t && systemctl restart nginx
systemctl enable nginx

# Create health check script
log "Creating health check script..."
cat > /usr/local/bin/sbc-health-check.sh << 'EOF'
#!/bin/bash
# SBC System Health Check

HEALTH_URL="http://localhost:3000/health"
LOG_FILE="/var/log/sbc-health-check.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Check application health
HEALTH_RESPONSE=$(curl -s --max-time 10 $HEALTH_URL 2>/dev/null)
if [ $? -eq 0 ]; then
    STATUS=$(echo $HEALTH_RESPONSE | jq -r '.status' 2>/dev/null)
    if [ "$STATUS" = "ok" ]; then
        log "✅ Application is healthy"
        exit 0
    else
        log "⚠️ Application responded but status is not OK: $STATUS"
        exit 1
    fi
else
    log "❌ Application is not responding"
    log "Attempting to restart PM2..."
    pm2 restart sbc-system
    sleep 10
    
    # Check again after restart
    HEALTH_RESPONSE=$(curl -s --max-time 10 $HEALTH_URL 2>/dev/null)
    if [ $? -eq 0 ]; then
        log "✅ Application recovered after restart"
        exit 0
    else
        log "❌ Application still not responding after restart"
        exit 1
    fi
fi
EOF

chmod +x /usr/local/bin/sbc-health-check.sh

# Set up cron job for health checks
log "Setting up health check cron job..."
echo "*/5 * * * * /usr/local/bin/sbc-health-check.sh" | crontab -

# Create system information script
log "Creating system information script..."
cat > /usr/local/bin/sbc-info.sh << 'EOF'
#!/bin/bash
# SBC System Information

echo "=== SBC System Information ==="
echo "Date: $(date)"
echo "Hostname: $(hostname)"
echo "Public IP: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "Public DNS: $(curl -s http://169.254.169.254/latest/meta-data/public-hostname)"
echo ""
echo "=== Application Status ==="
pm2 status
echo ""
echo "=== Health Check ==="
curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
echo ""
echo "=== System Resources ==="
free -h
df -h
echo ""
echo "=== Recent Logs ==="
pm2 logs sbc-system --lines 10 --nostream
EOF

chmod +x /usr/local/bin/sbc-info.sh

# Wait for application to fully start
log "Waiting for application to start..."
sleep 30

# Run initial health check
log "Running initial health check..."
/usr/local/bin/sbc-health-check.sh

# Set proper ownership
log "Setting proper ownership..."
chown -R ubuntu:ubuntu $APP_DIR
chown -R ubuntu:ubuntu /home/ubuntu

# Create completion marker
log "Creating completion marker..."
touch /var/log/sbc-setup-complete

log "SBC system setup completed successfully!"
log "Health check URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-hostname):3000/health"
log "API URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-hostname):3000/api"

# Run system info script
/usr/local/bin/sbc-info.sh | tee -a /var/log/sbc-setup.log