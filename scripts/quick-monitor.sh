#!/bin/bash

# Quick Application Monitoring Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

BASE_URL="http://ec2-100-26-45-35.compute-1.amazonaws.com:3000"

echo "🔍 Quick Application Health Check"
echo "================================="

echo "1️⃣ Health Status:"
curl -s "$BASE_URL/health" | jq -r '.status, .database.status, .uptime'

echo ""
echo "2️⃣ Cache Performance:"
curl -s "$BASE_URL/api/cache/stats" | jq -r '.stats.hitRate, .stats.cacheSize'

echo ""
echo "3️⃣ Business Count:"
curl -s "$BASE_URL/api/businesses" | jq -r '.businesses | length'

echo ""
echo "4️⃣ Test Webhook:"
response=$(curl -s -X POST "$BASE_URL/webhooks/test" -H "Content-Type: application/json" -d '{"test": "monitor"}')
echo "$response" | jq -r '.status // "error"'

echo ""
echo "✅ Monitoring complete!"
echo "🔗 For detailed logs, SSH to: ubuntu@ec2-100-26-45-35.compute-1.amazonaws.com"