#!/bin/bash

# Deployment Testing Script for SBC System
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

BASE_URL="http://ec2-100-26-45-35.compute-1.amazonaws.com:3000"

echo "🧪 Testing Small Business Customer Care System"
echo "Base URL: $BASE_URL"
echo "=================================================="

# Test 1: Health Check
echo ""
echo "1️⃣ Testing Health Endpoint..."
health_response=$(curl -s "$BASE_URL/health")
echo "Response: $health_response"

if echo "$health_response" | grep -q '"status":"ok"'; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
fi

# Test 2: Cache Stats
echo ""
echo "2️⃣ Testing Cache System..."
cache_response=$(curl -s "$BASE_URL/api/cache/stats")
echo "Response: $cache_response"

if echo "$cache_response" | grep -q '"success":true'; then
    echo "✅ Cache system working"
else
    echo "❌ Cache system failed"
fi

# Test 3: Business Registration
echo ""
echo "3️⃣ Testing Business Registration..."
register_response=$(curl -s -X POST "$BASE_URL/api/businesses/register" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Pizza Palace",
    "whatsappNumber": "whatsapp:+14155238886",
    "ownerPhone": "+1234567890"
  }')
echo "Response: $register_response"

if echo "$register_response" | grep -q '"success":true'; then
    echo "✅ Business registration working"
    # Extract business ID for next tests
    business_id=$(echo "$register_response" | grep -o '"businessId":"[^"]*"' | cut -d'"' -f4)
    echo "Business ID: $business_id"
else
    echo "❌ Business registration failed"
    business_id="testpizza"
fi

# Test 4: List Businesses
echo ""
echo "4️⃣ Testing Business List..."
list_response=$(curl -s "$BASE_URL/api/businesses")
echo "Response: $list_response"

if echo "$list_response" | grep -q '"success":true'; then
    echo "✅ Business listing working"
else
    echo "❌ Business listing failed"
fi

# Test 5: Add Knowledge (Text)
echo ""
echo "5️⃣ Testing Knowledge Addition..."
knowledge_response=$(curl -s -X POST "$BASE_URL/api/knowledge" \
  -H "Content-Type: application/json" \
  -d "{
    \"businessId\": \"$business_id\",
    \"content\": \"We serve delicious pizza with fresh ingredients. Open 9 AM to 9 PM daily. We offer delivery and takeout.\",
    \"type\": \"text\"
  }")
echo "Response: $knowledge_response"

if echo "$knowledge_response" | grep -q '"success":true'; then
    echo "✅ Knowledge addition working"
else
    echo "❌ Knowledge addition failed"
fi

# Test 6: Search Knowledge
echo ""
echo "6️⃣ Testing Knowledge Search..."
search_response=$(curl -s -X POST "$BASE_URL/api/knowledge/search" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"What are your opening hours?\",
    \"businessId\": \"$business_id\"
  }")
echo "Response: $search_response"

if echo "$search_response" | grep -q '"results"'; then
    echo "✅ Knowledge search working"
else
    echo "❌ Knowledge search failed"
fi

# Test 7: Webhook Connectivity
echo ""
echo "7️⃣ Testing Webhook Endpoint..."
webhook_response=$(curl -s -X POST "$BASE_URL/webhooks/test" \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook connectivity"}')
echo "Response: $webhook_response"

if echo "$webhook_response" | grep -q '"status"'; then
    echo "✅ Webhook endpoint working"
else
    echo "❌ Webhook endpoint failed"
fi

# Test 8: AI Response Generation
echo ""
echo "8️⃣ Testing AI Response Generation..."
ai_response=$(curl -s -X POST "$BASE_URL/api/ai/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"What time do you open?\",
    \"businessId\": \"$business_id\"
  }")
echo "Response: $ai_response"

if echo "$ai_response" | grep -q '"response"'; then
    echo "✅ AI response generation working"
else
    echo "❌ AI response generation failed (may need API keys)"
fi

echo ""
echo "=================================================="
echo "🎯 Test Summary Complete!"
echo "=================================================="