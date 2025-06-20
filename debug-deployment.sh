#!/bin/bash

# Debug Deployment Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

echo "🔍 Debugging Deployment Issues"
echo "=============================="

echo "Current directory: $(pwd)"
echo "Current user: $(whoami)"
echo "Date: $(date)"

echo ""
echo "1️⃣ Git Repository Status:"
echo "========================="
cd /var/www/sbc-system
echo "Current directory: $(pwd)"
echo "Git status:"
git status

echo ""
echo "Git remote:"
git remote -v

echo ""
echo "Current branch:"
git branch

echo ""
echo "Last 5 commits:"
git log --oneline -5

echo ""
echo "2️⃣ File Timestamps:"
echo "==================="
echo "Recent files (should have today's date):"
ls -la | head -10

echo ""
echo "3️⃣ Application Status:"
echo "======================"
echo "PM2 Status:"
pm2 status

echo ""
echo "Package.json version:"
grep version package.json

echo ""
echo "4️⃣ Test Manual Git Pull:"
echo "========================"
echo "Attempting git pull..."
git pull origin main

echo ""
echo "5️⃣ Check for new files:"
echo "======================="
echo "Looking for recent files..."
ls -la fix-cloudwatch-logs.sh 2>/dev/null && echo "✅ fix-cloudwatch-logs.sh found" || echo "❌ fix-cloudwatch-logs.sh missing"
ls -la CLOUDWATCH_SETUP.md 2>/dev/null && echo "✅ CLOUDWATCH_SETUP.md found" || echo "❌ CLOUDWATCH_SETUP.md missing"
ls -la create-log-groups.sh 2>/dev/null && echo "✅ create-log-groups.sh found" || echo "❌ create-log-groups.sh missing"

echo ""
echo "6️⃣ GitHub Actions Deployment Check:"
echo "===================================="
echo "Checking if deployment actually runs git pull..."
echo "Last .env update (should be recent if deployment ran):"
ls -la .env

echo ""
echo "Environment NODE_ENV:"
grep NODE_ENV .env 2>/dev/null || echo "NODE_ENV not set in .env"

echo ""
echo "7️⃣ Recommendations:"
echo "==================="
echo "If git pull above worked and files appeared:"
echo "  → GitHub Actions deployment script has an issue"
echo ""
echo "If git pull failed:"
echo "  → Git repository issue on server"
echo "  → May need to re-clone repository"
echo ""
echo "If files still missing after successful pull:"
echo "  → Check git branch and repository state"