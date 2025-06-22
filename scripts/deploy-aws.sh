#!/bin/bash

# AWS EC2 Deployment Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

set -e

echo "🚀 AWS EC2 Deployment for Small Business Customer Care System"
echo "=============================================================="

# Check if we're on EC2 instance
if [ ! -f /etc/cloud/cloud.cfg ]; then
    echo "❌ This script should be run on an AWS EC2 instance"
    echo "💡 Use this script after SSH'ing into your EC2 instance"
    exit 1
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please don't run this script as root"
    echo "💡 Run as ubuntu user: su - ubuntu"
    exit 1
fi

echo "📋 This script will:"
echo "   ✓ Install Node.js, PM2, Nginx"
echo "   ✓ Clone your application"
echo "   ✓ Set up production environment"
echo "   ✓ Configure reverse proxy"
echo "   ✓ Set up SSL certificates"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Node.js
install_nodejs() {
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    echo "✅ Node.js installed: $(node --version)"
    echo "✅ NPM installed: $(npm --version)"
}

# Function to install PM2
install_pm2() {
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
    echo "✅ PM2 installed: $(pm2 --version)"
}

# Function to install Nginx
install_nginx() {
    echo "📦 Installing Nginx..."
    sudo apt install -y nginx
    echo "✅ Nginx installed: $(nginx -v 2>&1)"
}

# Function to install Certbot
install_certbot() {
    echo "📦 Installing Certbot for SSL..."
    sudo apt install -y certbot python3-certbot-nginx
    echo "✅ Certbot installed"
}

# Start deployment
echo "🔄 Starting deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Git if not present
if ! command_exists git; then
    echo "📦 Installing Git..."
    sudo apt install -y git
fi

# Install Node.js if not present
if ! command_exists node; then
    install_nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install PM2 if not present
if ! command_exists pm2; then
    install_pm2
else
    echo "✅ PM2 already installed: $(pm2 --version)"
fi

# Install Nginx if not present
if ! command_exists nginx; then
    install_nginx
else
    echo "✅ Nginx already installed: $(nginx -v 2>&1)"
fi

# Install Certbot if not present
if ! command_exists certbot; then
    install_certbot
else
    echo "✅ Certbot already installed"
fi

# Create application directory
APP_DIR="/var/www/sbc-system"
echo "📁 Setting up application directory: $APP_DIR"

if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
fi

cd $APP_DIR

# Clone or update repository
if [ ! -d ".git" ]; then
    echo "📥 Cloning repository..."
    git clone https://github.com/ravikalla/ai-small-business-customercare.git .
else
    echo "🔄 Updating repository..."
    git pull origin main
fi

# Install dependencies
echo "📦 Installing application dependencies..."
npm install --production

# Create logs directory
mkdir -p logs

# Set up environment variables
if [ ! -f ".env" ]; then
    echo "⚙️ Setting up environment variables..."
    cp .env.example .env
    
    echo ""
    echo "🔐 Please configure your .env file with the following:"
    echo "   - OPENAI_API_KEY"
    echo "   - PINECONE_API_KEY"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo "   - TWILIO_ACCOUNT_SID"
    echo "   - TWILIO_AUTH_TOKEN"
    echo ""
    read -p "Press Enter to edit .env file..."
    nano .env
else
    echo "✅ .env file already exists"
fi

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'sbc-system',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '800M',
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
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup
echo "⚙️ Setting up PM2 startup..."
pm2 startup | grep "sudo env" | bash

# Get domain name for Nginx configuration
echo ""
echo "🌐 Domain Configuration"
echo "======================="
echo "Do you have a domain name pointing to this server?"
echo "1) Yes, I have a domain"
echo "2) No, use server IP for testing"
read -p "Choose option (1-2): " domain_choice

case $domain_choice in
    1)
        read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN_NAME
        SERVER_NAME="$DOMAIN_NAME www.$DOMAIN_NAME"
        USE_SSL=true
        ;;
    2)
        DOMAIN_NAME=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
        SERVER_NAME="$DOMAIN_NAME"
        USE_SSL=false
        echo "Using IP address: $DOMAIN_NAME"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Configure Nginx
echo "⚙️ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/sbc-system > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/sbc-system /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    sudo systemctl restart nginx
    sudo systemctl enable nginx
else
    echo "❌ Nginx configuration error"
    exit 1
fi

# Set up SSL if domain is provided
if [ "$USE_SSL" = true ]; then
    echo "🔒 Setting up SSL certificate..."
    if sudo certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME; then
        echo "✅ SSL certificate installed successfully"
        
        # Update .env with HTTPS URL
        sed -i "s|WEBHOOK_BASE_URL=.*|WEBHOOK_BASE_URL=https://$DOMAIN_NAME|" .env
        pm2 restart sbc-system
    else
        echo "⚠️ SSL setup failed, continuing with HTTP"
        # Update .env with HTTP URL  
        sed -i "s|WEBHOOK_BASE_URL=.*|WEBHOOK_BASE_URL=http://$DOMAIN_NAME|" .env
        pm2 restart sbc-system
    fi
else
    # Update .env with IP address
    sed -i "s|WEBHOOK_BASE_URL=.*|WEBHOOK_BASE_URL=http://$DOMAIN_NAME|" .env
    pm2 restart sbc-system
fi

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Test the deployment
echo "🧪 Testing deployment..."
sleep 5

if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Application is running locally"
else
    echo "❌ Application health check failed"
    echo "📋 Check logs: pm2 logs sbc-system"
fi

if [ "$USE_SSL" = true ]; then
    TEST_URL="https://$DOMAIN_NAME"
else
    TEST_URL="http://$DOMAIN_NAME"
fi

if curl -f $TEST_URL/health > /dev/null 2>&1; then
    echo "✅ Application is accessible externally"
else
    echo "⚠️ External access test failed (may need DNS propagation time)"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "📊 Application Status:"
echo "   Local URL:  http://localhost:3000"
echo "   Public URL: $TEST_URL"
echo "   Webhook URL: $TEST_URL/webhooks/twilio/whatsapp"
echo ""
echo "🔧 Management Commands:"
echo "   Check status:  pm2 status"
echo "   View logs:     pm2 logs sbc-system"
echo "   Restart app:   pm2 restart sbc-system"
echo "   Update app:    cd $APP_DIR && git pull && npm install && pm2 restart sbc-system"
echo ""
echo "📋 Next Steps:"
echo "   1. Configure Twilio webhook URL: $TEST_URL/webhooks/twilio/whatsapp"
echo "   2. Test business registration: curl -X POST $TEST_URL/api/businesses/register"
echo "   3. Monitor logs: pm2 logs sbc-system"
echo "   4. Set up monitoring and backups"
echo ""
echo "🚀 Your Small Business Customer Care System is ready!"