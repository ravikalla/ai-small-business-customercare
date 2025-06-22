# Complete Testing Guide

**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>

## Testing Overview

This guide covers testing the Small Business Customer Care System with Twilio WhatsApp Business API integration at different levels: local development, integration testing, and production testing.

## Prerequisites

### Required Accounts & Setup
1. **Twilio Account** with WhatsApp API access
2. **OpenAI API Key** for AI responses
3. **Pinecone Account** for vector database
4. **Supabase Project** for main database
5. **WhatsApp Business Account** or personal WhatsApp for testing

### Environment Setup
```bash
# 1. Clone and install dependencies
git clone https://github.com/ravikalla/ai-small-business-customercare.git
cd ai-small-business-customercare
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your API keys (see below)

# 3. Set up database
# Run the migration script in Supabase
```

### Environment Variables Required
```bash
# Essential for testing
OPENAI_API_KEY=sk-proj-your-key-here
PINECONE_API_KEY=pcsk_your-key-here
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=sbc-businessdata
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...your-key-here

# Twilio (use sandbox for testing)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Local testing
PORT=3000
NODE_ENV=development
```

## Testing Levels

## 1. Local Development Testing

### Start the Application
```bash
# Terminal 1 - Start the server
npm start

# Terminal 2 - Watch logs
tail -f logs/app.log | grep -E "(TWILIO|WEBHOOK|ERROR)"
```

### Test Server Health
```bash
# Check all services are running
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-06-19T10:30:00.000Z",
  "database": { "status": "connected" },
  "vectorDB": { "isHealthy": true },
  "twilio": { "isHealthy": true },
  "uptime": 123.45
}
```

### Run Integration Test Suite
```bash
# Run the automated test suite
node test-twilio-integration.js

# Expected output:
🧪 Testing Twilio WhatsApp Integration
1️⃣ Testing Health Check...
✅ Twilio service is healthy
2️⃣ Testing Webhook Status...
✅ Webhook endpoint is accessible
...
🎉 Twilio Integration Test Complete!
```

## 2. API Testing

### Test Business Registration
```bash
# Register a test business
curl -X POST http://localhost:3000/api/businesses/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Pizza Palace",
    "whatsappNumber": "whatsapp:+14155238886",
    "ownerPhone": "+1234567890"
  }'

# Expected response:
{
  "success": true,
  "message": "Business registered successfully",
  "businessId": "testpizza_1234",
  "whatsappNumber": "whatsapp:+14155238886"
}
```

### Test Business Listing
```bash
# List all registered businesses
curl http://localhost:3000/api/businesses

# Expected response:
{
  "success": true,
  "businesses": [
    {
      "businessId": "testpizza_1234",
      "businessName": "Test Pizza Palace",
      "whatsappNumber": "whatsapp:+14155238886",
      "ownerPhone": "+1234567890",
      "status": "active"
    }
  ]
}
```

### Test Cache Management
```bash
# Check cache status
curl http://localhost:3000/api/cache/stats

# Clear cache
curl -X POST http://localhost:3000/api/cache/clear

# Inspect cache contents
curl "http://localhost:3000/api/cache/inspect?type=responses"
```

## 3. Webhook Testing

### Test Webhook Connectivity
```bash
# Test basic webhook
curl -X POST http://localhost:3000/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook connectivity"}'

# Check webhook status
curl http://localhost:3000/webhooks/status
```

### Simulate Twilio Webhook Messages

#### Business Owner Command Test
```bash
# Simulate business owner sending !help command
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM123&From=whatsapp:+1234567890&To=whatsapp:+14155238886&Body=!help"

# Simulate adding knowledge
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM124&From=whatsapp:+1234567890&To=whatsapp:+14155238886&Body=!add We serve delicious pizza with fresh ingredients"
```

#### Customer Query Test
```bash
# Simulate customer query
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM125&From=whatsapp:+15551234567&To=whatsapp:+14155238886&Body=What are your hours?"
```

## 4. Twilio Sandbox Testing

### Setup Twilio Sandbox

1. **Login to Twilio Console**: https://console.twilio.com/
2. **Go to Messaging > Try it out > Send a WhatsApp message**
3. **Note your sandbox number**: Usually `+1 (415) 523-8886`
4. **Get sandbox keyword**: Usually something like `join <keyword>`

### Configure Webhook in Twilio
```
Webhook URL: https://your-ngrok-url.ngrok.io/webhooks/twilio/whatsapp
HTTP Method: POST
```

### Use ngrok for Local Testing
```bash
# Install ngrok (if not already installed)
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Expose local server
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this as webhook URL in Twilio Console
```

### Test with Real WhatsApp

#### Step 1: Join Sandbox
```
From your phone, send to +1 (415) 523-8886:
join <your-sandbox-keyword>
```

#### Step 2: Register Business Owner
```
Send to sandbox number:
First register yourself as business owner using the API (see API testing above)
```

#### Step 3: Test Business Owner Commands
```
!help
!add We serve authentic Italian pizza made with fresh ingredients
!list
!inspect
```

#### Step 4: Test Customer Queries
```
From a different phone number:
What kind of pizza do you serve?
Are you open now?
Do you deliver?
```

## 5. Production Testing

### Deploy to Production

#### Option A: Heroku
```bash
# Install Heroku CLI
heroku create your-app-name
heroku config:set TWILIO_ACCOUNT_SID=ACxxx...
heroku config:set TWILIO_AUTH_TOKEN=xxx...
heroku config:set OPENAI_API_KEY=sk-proj-...
# ... set all environment variables

git push heroku main
```

#### Option B: DigitalOcean/AWS
```bash
# Deploy to your preferred cloud provider
# Ensure HTTPS is enabled (required by Twilio)
# Set up proper domain name
```

### Configure Production Webhook
```
Webhook URL: https://your-domain.com/webhooks/twilio/whatsapp
```

### Test Production Deployment
```bash
# Health check
curl https://your-domain.com/health

# Register production business
curl -X POST https://your-domain.com/api/businesses/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Real Pizza Business",
    "whatsappNumber": "whatsapp:+your-production-number",
    "ownerPhone": "+your-real-phone"
  }'
```

## 6. Multi-Business Testing

### Register Multiple Businesses
```bash
# Business 1
curl -X POST http://localhost:3000/api/businesses/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Pizza Palace",
    "whatsappNumber": "whatsapp:+14155238886",
    "ownerPhone": "+1234567890"
  }'

# Business 2  
curl -X POST http://localhost:3000/api/businesses/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Coffee Corner", 
    "whatsappNumber": "whatsapp:+14155238887",
    "ownerPhone": "+1987654321"
  }'
```

### Test Message Routing
```bash
# Test routing to Business 1
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -d "From=whatsapp:+1234567890&To=whatsapp:+14155238886&Body=!add Pizza knowledge"

# Test routing to Business 2
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -d "From=whatsapp:+1987654321&To=whatsapp:+14155238887&Body=!add Coffee knowledge"
```

## 7. Load Testing

### Simple Load Test
```bash
# Install Apache Bench
sudo apt-get install apache2-utils  # Ubuntu
brew install httpie  # macOS

# Test webhook load
ab -n 100 -c 10 -p test-data.json -T application/json \
  http://localhost:3000/webhooks/test

# Test business registration load
ab -n 50 -c 5 -p register-data.json -T application/json \
  http://localhost:3000/api/businesses/register
```

### Monitor Performance
```bash
# Monitor logs during load test
tail -f logs/app.log | grep -E "(ERROR|WARN|RATE_LIMIT)"

# Check cache performance
curl http://localhost:3000/api/cache/stats
```

## 8. Error Testing

### Test Rate Limiting
```bash
# Spam requests to trigger rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
    -d "From=whatsapp:+15551234567&To=whatsapp:+14155238886&Body=test query $i"
  sleep 1
done
```

### Test Invalid Inputs
```bash
# Test invalid business registration
curl -X POST http://localhost:3000/api/businesses/register \
  -H "Content-Type: application/json" \
  -d '{"businessName": "", "whatsappNumber": "invalid"}'

# Test malicious content
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -d "From=whatsapp:+1234567890&To=whatsapp:+14155238886&Body=!add <script>alert('xss')</script>"
```

### Test Database Failures
```bash
# Temporarily break database connection
# Monitor error handling and recovery
```

## 9. Debugging & Troubleshooting

### Common Issues & Solutions

**1. Webhook Not Receiving Messages**
```bash
# Check webhook URL accessibility
curl -I https://your-domain.com/webhooks/twilio/whatsapp

# Verify Twilio webhook configuration
# Check server logs for incoming requests
```

**2. Authentication Errors**
```bash
# Test Twilio credentials
curl -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
  https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json
```

**3. Database Connection Issues**
```bash
# Test database connectivity
curl http://localhost:3000/health | jq '.database'
```

### Debug Logging
```bash
# Enable debug mode
export LOG_LEVEL=debug
npm start

# Filter specific logs
tail -f logs/app.log | grep WEBHOOK
tail -f logs/app.log | grep TWILIO
tail -f logs/app.log | grep ERROR
```

### Monitor Resources
```bash
# Check memory usage
ps aux | grep node

# Check CPU usage
top -p $(pgrep -f "node.*index.js")

# Check disk space
df -h
```

## 10. Test Automation

### Create Test Scripts
```bash
# Create automated test suite
mkdir tests
cat > tests/integration.test.js << 'EOF'
const axios = require('axios');
const { testTwilioIntegration } = require('../test-twilio-integration');

describe('Twilio Integration', () => {
  test('should pass integration tests', async () => {
    await testTwilioIntegration();
  });
});
EOF

# Run with Jest
npm test
```

### Continuous Testing
```bash
# Set up testing in CI/CD pipeline
# Add to GitHub Actions or similar
```

## Test Checklist

### ✅ Pre-Production Checklist

- [ ] All environment variables configured
- [ ] Database migration completed
- [ ] Twilio credentials verified
- [ ] Webhook URL configured in Twilio
- [ ] Health check passes
- [ ] Business registration works
- [ ] Business owner commands work
- [ ] Customer queries get AI responses
- [ ] Rate limiting functions
- [ ] Cache invalidation works
- [ ] Multi-business routing works
- [ ] Error handling works
- [ ] Load testing passed
- [ ] Security validation works

### 🚀 Production Deployment Checklist

- [ ] HTTPS enabled
- [ ] Production Twilio credentials
- [ ] Production WhatsApp numbers
- [ ] Monitoring setup
- [ ] Backup procedures tested
- [ ] Error alerts configured
- [ ] Performance monitoring
- [ ] Security audit completed

## Getting Help

### If Tests Fail

1. **Check Prerequisites**: Ensure all API keys are valid
2. **Verify Environment**: Check `.env` file configuration
3. **Review Logs**: Look for specific error messages
4. **Test Individual Components**: Isolate the failing component
5. **Contact Support**: ravi2523096+sbc@gmail.com

### Useful Commands

```bash
# Quick health check
curl http://localhost:3000/health | jq '.'

# Quick business list
curl http://localhost:3000/api/businesses | jq '.businesses'

# Quick cache stats
curl http://localhost:3000/api/cache/stats | jq '.stats'

# Quick webhook test
curl -X POST http://localhost:3000/webhooks/test | jq '.'
```

---

This comprehensive testing guide ensures your Twilio WhatsApp Business API integration works correctly at all levels, from local development to production deployment.