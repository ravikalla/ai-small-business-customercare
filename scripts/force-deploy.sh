#!/bin/bash

# Force Deployment Script - Run on EC2 Server
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

echo "🚀 Force Deployment to Latest Code"
echo "=================================="

cd /var/www/sbc-system

echo "Current status:"
git status

echo ""
echo "🔄 Resetting to latest main branch..."

# Reset any local changes
git reset --hard HEAD

# Fetch latest changes
git fetch origin

# Reset to latest main
git reset --hard origin/main

# Clean any untracked files
git clean -fd

echo ""
echo "📦 Installing dependencies..."
npm install --production

echo ""
echo "⚙️ Setting up environment..."
# Ensure NODE_ENV is set
if ! grep -q "NODE_ENV=production" .env 2>/dev/null; then
    echo "NODE_ENV=production" >> .env
fi

# Ensure logs directory exists
mkdir -p logs

echo ""
echo "🔄 Restarting application..."
pm2 restart sbc-system

echo ""
echo "✅ Deployment completed!"

echo ""
echo "📊 Verification:"
echo "==============="
echo "Package version:"
grep version package.json

echo ""
echo "New files check:"
ls -la fix-cloudwatch-logs.sh 2>/dev/null && echo "✅ fix-cloudwatch-logs.sh found" || echo "❌ fix-cloudwatch-logs.sh missing"
ls -la CLOUDWATCH_SETUP.md 2>/dev/null && echo "✅ CLOUDWATCH_SETUP.md found" || echo "❌ CLOUDWATCH_SETUP.md missing"

echo ""
echo "PM2 status:"
pm2 status

echo ""
echo "Health check:"
curl -s http://localhost:3000/health | jq -r '.status // "failed"'