#!/bin/bash

# Multi-Business Deployment Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

set -e

echo "🚀 Deploying Multi-Business Small Business Customer Care System"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it with required environment variables."
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=("OPENAI_API_KEY" "PINECONE_API_KEY" "SUPABASE_URL" "SUPABASE_ANON_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build the application
echo "🔨 Building application..."
docker build -t sbc-app .

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.multi-business.yml down

# Start multi-business deployment
echo "🌟 Starting multi-business deployment..."
docker-compose -f docker-compose.multi-business.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 30

# Check health of all services
echo "🏥 Checking service health..."

services=("sbc-pizza-palace:3001" "sbc-coffee-shop:3002" "sbc-restaurant:3003")
for service in "${services[@]}"; do
    IFS=':' read -r container port <<< "$service"
    
    if curl -f "http://localhost:$port/health" > /dev/null 2>&1; then
        echo "✅ $container is healthy"
    else
        echo "❌ $container health check failed"
    fi
done

# Display QR codes for WhatsApp connections
echo ""
echo "📱 WhatsApp QR Codes:"
echo "===================="
echo "Business owners need to scan QR codes to connect their WhatsApp:"
echo ""
echo "Pizza Palace (Port 3001):"
echo "docker logs sbc-pizza-palace | grep -A 20 'QR Code'"
echo ""
echo "Coffee Shop (Port 3002):"
echo "docker logs sbc-coffee-shop | grep -A 20 'QR Code'"
echo ""
echo "Restaurant (Port 3003):"
echo "docker logs sbc-restaurant | grep -A 20 'QR Code'"

echo ""
echo "🎉 Multi-Business Deployment Complete!"
echo ""
echo "📊 Service URLs:"
echo "==============="
echo "Pizza Palace:    http://localhost:3001"
echo "Coffee Shop:     http://localhost:3002"
echo "Restaurant:      http://localhost:3003"
echo "Load Balancer:   http://localhost:80"
echo "Monitoring:      http://localhost:3000 (admin/admin123)"
echo ""
echo "📞 Business Owner Phone Numbers:"
echo "================================"
echo "Pizza Palace:    +1234567890"
echo "Coffee Shop:     +1987654321"
echo "Restaurant:      +1555666777"
echo ""
echo "💡 Next Steps:"
echo "=============="
echo "1. Each business owner should scan their QR code"
echo "2. Test registration: !register [Business Name]"
echo "3. Add knowledge: !add [content] or send documents"
echo "4. Customers can query: !business [businessId] [question]"
echo ""
echo "🔧 Management Commands:"
echo "======================"
echo "View logs:        docker-compose -f docker-compose.multi-business.yml logs [service]"
echo "Restart service:  docker-compose -f docker-compose.multi-business.yml restart [service]"
echo "Stop all:         docker-compose -f docker-compose.multi-business.yml down"
echo "Scale up:         docker-compose -f docker-compose.multi-business.yml up -d --scale sbc-pizza=2"