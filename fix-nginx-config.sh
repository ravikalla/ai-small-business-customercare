#!/bin/bash

# Fix Nginx Configuration Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

echo "🔧 Fixing Nginx configuration..."

# First, let's fix the main nginx.conf file to include rate limiting
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Create the corrected nginx.conf
sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
    # multi_accept on;
}

http {
    ##
    # Basic Settings
    ##
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    # server_tokens off;

    # server_names_hash_bucket_size 64;
    # server_name_in_redirect off;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ##
    # Rate Limiting (moved here from site config)
    ##
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    ##
    # SSL Settings
    ##
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3; # Dropping SSLv3, ref: POODLE
    ssl_prefer_server_ciphers on;

    ##
    # Logging Settings
    ##
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    ##
    # Gzip Settings
    ##
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    ##
    # Virtual Host Configs
    ##
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

# Now create the corrected site configuration (without rate limiting zone definition)
sudo tee /etc/nginx/sites-available/sbc-system > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    # Apply rate limiting (zone defined in main config)
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

    # Health check endpoint (bypass rate limiting)
    location /health {
        limit_req off;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Remove any existing symlink and create new one
sudo rm -f /etc/nginx/sites-enabled/sbc-system
sudo ln -s /etc/nginx/sites-available/sbc-system /etc/nginx/sites-enabled/

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test the configuration
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    # Restart Nginx
    echo "🔄 Restarting Nginx..."
    sudo systemctl restart nginx
    
    # Enable Nginx to start on boot
    echo "⚙️ Enabling Nginx service..."
    sudo systemctl enable nginx
    
    # Check status
    if sudo systemctl is-active --quiet nginx; then
        echo "✅ Nginx is running successfully"
        echo "🌐 You can now access your application at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
    else
        echo "❌ Nginx failed to start"
        sudo systemctl status nginx
    fi
else
    echo "❌ Nginx configuration test failed"
    echo "📋 Please check the configuration manually"
fi

echo ""
echo "🔧 Configuration files:"
echo "   Main config: /etc/nginx/nginx.conf"
echo "   Site config: /etc/nginx/sites-available/sbc-system"
echo ""
echo "📋 Useful commands:"
echo "   Test config: sudo nginx -t"
echo "   Restart:     sudo systemctl restart nginx"
echo "   Check logs:  sudo tail -f /var/log/nginx/error.log"