# AWS EC2 Deployment Guide

**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>

## 🚀 AWS Free Tier Deployment

### AWS Free Tier Limits
- **EC2**: 750 hours/month (t2.micro or t3.micro)
- **Storage**: 30GB EBS
- **Data Transfer**: 15GB/month
- **Duration**: 12 months from account creation

## Prerequisites

### 1. AWS Account Setup
- [ ] AWS account created
- [ ] EC2 instance launched (t2.micro/t3.micro)
- [ ] Security group configured
- [ ] Key pair (.pem file) downloaded

### 2. EC2 Instance Requirements
```bash
# Recommended configuration:
Instance Type: t2.micro (1 vCPU, 1GB RAM)
OS: Ubuntu 22.04 LTS (free tier eligible)
Storage: 20GB GP2 (free tier includes 30GB)
Security Group: Allow HTTP (80), HTTPS (443), SSH (22)
```

## Step-by-Step Deployment

### Step 1: Connect to Your EC2 Instance

```bash
# Connect via SSH
ssh -i your-key.pem ubuntu@your-ec2-ip

# Or use AWS Session Manager (if configured)
aws ssm start-session --target i-1234567890abcdef0
```

### Step 2: Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install SSL certificates (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# Verify installations
node --version
npm --version
pm2 --version
nginx -v
```

### Step 3: Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /var/www/sbc-system
sudo chown ubuntu:ubuntu /var/www/sbc-system
cd /var/www/sbc-system

# Clone repository
git clone https://github.com/ravikalla/ai-small-business-customercare.git .

# Install dependencies
npm install --production

# Create logs directory
mkdir -p logs

# Set up environment variables
cp .env.example .env
nano .env  # Edit with your API keys
```

### Step 4: Configure Environment Variables

```bash
# Edit .env file
nano .env
```

```bash
# Production Environment Variables
NODE_ENV=production
PORT=3000

# API Keys
OPENAI_API_KEY=sk-proj-your-key-here
PINECONE_API_KEY=pcsk_your-key-here
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=sbc-businessdata

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...your-key-here

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Webhook (will be your domain)
WEBHOOK_BASE_URL=https://your-domain.com
```

### Step 5: Configure PM2 for Process Management

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'sbc-system',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

### Step 6: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/sbc-system
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

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
        proxy_read_timeout 86400;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/sbc-system /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

### Step 7: Set Up SSL Certificate (Free)

```bash
# Install SSL certificate with Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Verify auto-renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

### Step 8: Configure Firewall

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Check firewall status
sudo ufw status
```

## Domain Configuration

### Option 1: Use a Free Domain

```bash
# Get free domain from:
# - Freenom (discontinued for new registrations)
# - No-IP (free subdomain)
# - DuckDNS (free subdomain)

# Example with No-IP:
# 1. Register at no-ip.com
# 2. Create hostname: yourbusiness.ddns.net
# 3. Point to your EC2 IP address
```

### Option 2: Use AWS Route 53

```bash
# Register domain through AWS Route 53
# Or transfer existing domain
# Configure A record pointing to EC2 IP
```

### Option 3: Use EC2 IP Address (Testing)

```bash
# For testing, you can use EC2 IP directly
WEBHOOK_BASE_URL=http://your-ec2-ip

# Note: Twilio requires HTTPS for production
```

## Monitoring and Management

### PM2 Management Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs sbc-system

# Restart application
pm2 restart sbc-system

# Stop application
pm2 stop sbc-system

# Monitor resources
pm2 monit
```

### System Monitoring

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check application health
curl http://localhost:3000/health

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Database Migration

```bash
# Run database migration on first deployment
cd /var/www/sbc-system

# If using Supabase, run the migration SQL
# Copy content from migrations/001_initial_schema.sql
# Run in Supabase SQL editor

# Test database connection
curl http://localhost:3000/health | jq '.database'
```

## Testing the Deployment

### 1. Test Health Endpoint

```bash
# Local test
curl http://localhost:3000/health

# External test
curl https://your-domain.com/health
```

### 2. Test Business Registration

```bash
curl -X POST https://your-domain.com/api/businesses/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "AWS Test Business",
    "whatsappNumber": "whatsapp:+14155238886",
    "ownerPhone": "+1234567890"
  }'
```

### 3. Test Webhook

```bash
curl -X POST https://your-domain.com/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "AWS deployment"}'
```

### 4. Configure Twilio Webhook

In Twilio Console, set webhook URL to:
```
https://your-domain.com/webhooks/twilio/whatsapp
```

## Security Best Practices

### 1. EC2 Security Group

```bash
# Recommended security group rules:
SSH (22): Your IP only
HTTP (80): 0.0.0.0/0 (will redirect to HTTPS)
HTTPS (443): 0.0.0.0/0
```

### 2. System Security

```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Configure automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Disable root login
sudo passwd -l root

# Configure fail2ban (optional)
sudo apt install fail2ban
```

### 3. Application Security

```bash
# Set proper file permissions
sudo chown -R ubuntu:ubuntu /var/www/sbc-system
chmod 600 .env  # Protect environment variables

# Use non-root user for application
# PM2 already runs as ubuntu user
```

## Backup Strategy

### 1. Code Backup

```bash
# Set up automatic git backups
cd /var/www/sbc-system

# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
cd /var/www/sbc-system
git add .
git commit -m "Automated backup $(date)"
git push origin main
EOF

chmod +x backup.sh

# Schedule with cron
crontab -e
# Add: 0 2 * * * /var/www/sbc-system/backup.sh
```

### 2. Database Backup

```bash
# Supabase handles backups automatically
# For additional backups, use Supabase CLI or APIs
```

### 3. Environment Variables Backup

```bash
# Backup .env file (encrypted)
cp .env .env.backup
gpg -c .env.backup  # Encrypt and store safely
```

## Cost Optimization

### Free Tier Monitoring

```bash
# Monitor AWS usage
aws ce get-cost-and-usage \
  --time-period Start=2024-06-01,End=2024-06-30 \
  --granularity MONTHLY \
  --metrics BlendedCost

# Set up billing alerts in AWS Console
```

### Resource Optimization

```bash
# Optimize application for low memory
# Current setup uses ~200-300MB RAM
# Leaves ~700MB for system processes

# Monitor memory usage
pm2 monit

# If memory issues, consider:
# - Reducing cache sizes in src/utils/cache.js
# - Using swap file (not recommended for production)
```

## Troubleshooting

### Common Issues

**1. Application Won't Start**
```bash
# Check logs
pm2 logs sbc-system

# Check environment variables
cat .env | grep -v '^#' | grep -v '^$'

# Test Node.js
node --version
npm --version
```

**2. Nginx Issues**
```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

**3. SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Check certificate expiry
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

**4. Memory Issues**
```bash
# Check memory usage
free -h

# Check swap usage
swapon --show

# If needed, create swap file (temporary solution)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Auto-Deployment Script

Create an automated deployment script:

```bash
# Create deployment script
cat > deploy-aws.sh << 'EOF'
#!/bin/bash

echo "🚀 Deploying to AWS EC2..."

# Pull latest changes
git pull origin main

# Install/update dependencies
npm install --production

# Restart application
pm2 restart sbc-system

# Check status
pm2 status

echo "✅ Deployment complete!"
echo "🔗 Application URL: https://your-domain.com"
EOF

chmod +x deploy-aws.sh
```

## Scaling Considerations

### When to Upgrade

**Upgrade from t2.micro if:**
- Memory usage consistently > 80%
- CPU usage consistently > 80%
- Response times > 2 seconds
- Multiple business failures

**Next tier options:**
- t3.small (2 vCPU, 2GB RAM) - ~$15/month
- Load balancer for high availability
- RDS for managed database

---

This guide will get your Small Business Customer Care System running on AWS EC2 free tier with production-ready configuration, SSL certificates, and proper monitoring! 🚀