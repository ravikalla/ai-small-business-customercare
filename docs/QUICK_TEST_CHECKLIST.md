# Quick Test Checklist

**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>

## 🚀 Quick Start Testing (5 minutes)

### Prerequisites ✅
- [ ] Node.js installed
- [ ] Git repository cloned
- [ ] `.env` file configured with at least:
  ```
  OPENAI_API_KEY=sk-proj-...
  PINECONE_API_KEY=pcsk_...
  SUPABASE_URL=https://...
  SUPABASE_ANON_KEY=eyJ...
  ```

### Step 1: Basic Setup
```bash
# 1. Install dependencies
npm install

# 2. Start server
npm start
```

### Step 2: Health Check (30 seconds)
```bash
# Test server health
curl http://localhost:3000/health

# Expected: All services healthy except Twilio (if not configured)
```

### Step 3: API Tests (2 minutes)
```bash
# Test business registration
curl -X POST http://localhost:3000/api/businesses/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Cafe",
    "whatsappNumber": "whatsapp:+14155238886", 
    "ownerPhone": "+1234567890"
  }'

# Test business listing
curl http://localhost:3000/api/businesses

# Test webhook
curl -X POST http://localhost:3000/webhooks/test
```

### Step 4: Integration Test (1 minute)
```bash
# Run automated tests
node test-twilio-integration.js
```

## 🔧 Twilio Testing (Additional 10 minutes)

### Prerequisites ✅
- [ ] Twilio account created
- [ ] Account SID and Auth Token obtained
- [ ] Environment variables added:
  ```
  TWILIO_ACCOUNT_SID=ACxxxxxxxx...
  TWILIO_AUTH_TOKEN=xxxxxxxx...
  ```

### Step 5: Twilio Health Check
```bash
# Restart server after adding Twilio credentials
npm start

# Check Twilio health
curl http://localhost:3000/health | grep twilio
```

### Step 6: Webhook Testing
```bash
# Test mock webhook
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM123&From=whatsapp:+1234567890&To=whatsapp:+14155238886&Body=!help"
```

## 📱 WhatsApp Testing (Additional 15 minutes)

### Prerequisites ✅
- [ ] Twilio Sandbox configured
- [ ] ngrok installed (for local testing)
- [ ] Webhook URL configured in Twilio Console

### Step 7: Setup Webhook
```bash
# Start ngrok
ngrok http 3000

# Copy HTTPS URL and configure in Twilio Console
# Webhook URL: https://abc123.ngrok.io/webhooks/twilio/whatsapp
```

### Step 8: WhatsApp Tests
```
From your phone to Twilio sandbox number:
1. join sandbox-keyword
2. !help
3. !add We serve great coffee and pastries
4. !list
```

## ✅ Success Criteria

### Must Pass ✅
- [ ] Server starts without errors
- [ ] Health check shows database and vector DB healthy
- [ ] Business registration works via API
- [ ] Webhook endpoint responds
- [ ] Integration tests pass

### Should Pass (with Twilio) ✅  
- [ ] Twilio health check passes
- [ ] Mock webhook processing works
- [ ] Business owner commands processed
- [ ] Customer queries generate AI responses

### Nice to Have ✅
- [ ] Actual WhatsApp messages work
- [ ] Multiple businesses can be registered
- [ ] Cache management works
- [ ] Rate limiting functions

## 🐛 Common Issues & Quick Fixes

### Server Won't Start
```bash
# Check port conflicts
lsof -i :3000
kill -9 <PID>

# Check environment variables
cat .env | grep -E "(OPENAI|PINECONE|SUPABASE)"
```

### Database Connection Failed
```bash
# Verify Supabase URL and key
curl "https://your-project.supabase.co/rest/v1/" \
  -H "apikey: your-anon-key"
```

### Twilio Connection Failed
```bash
# Test Twilio credentials
curl -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
  https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json
```

### AI Responses Not Working
```bash
# Test OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## 📊 Test Results Template

Copy and fill this out:

```
Date: ___________
Tester: ___________

✅ BASIC TESTS
- [ ] Server startup: ______
- [ ] Health check: ______  
- [ ] Business registration: ______
- [ ] Webhook test: ______
- [ ] Integration tests: ______

✅ TWILIO TESTS (if configured)
- [ ] Twilio health: ______
- [ ] Mock webhook: ______
- [ ] Command processing: ______

✅ WHATSAPP TESTS (if configured)  
- [ ] Sandbox connection: ______
- [ ] Business commands: ______
- [ ] Customer queries: ______
- [ ] AI responses: ______

Issues Found:
_________________________________
_________________________________

Overall Status: PASS / FAIL / PARTIAL
```

## 🚀 Ready for Production?

### Minimum Requirements ✅
- [ ] All basic tests pass
- [ ] Twilio integration works
- [ ] WhatsApp messaging works
- [ ] Multiple businesses tested
- [ ] Error handling verified
- [ ] Security features tested
- [ ] Performance acceptable
- [ ] Monitoring setup
- [ ] Backup procedures tested

### Go Live Checklist ✅
- [ ] Production environment variables
- [ ] HTTPS certificate installed
- [ ] Domain name configured
- [ ] Twilio webhook URL updated
- [ ] Production WhatsApp numbers
- [ ] Monitoring alerts configured
- [ ] Backup schedules active
- [ ] Documentation complete

---

**🎉 Congratulations!** If you've completed this checklist, your Small Business Customer Care System is ready for multi-business WhatsApp integration!