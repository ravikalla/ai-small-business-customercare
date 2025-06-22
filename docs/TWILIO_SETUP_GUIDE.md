# Twilio WhatsApp Business API Setup Guide

**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>

## Overview

This guide explains how to integrate the Small Business Customer Care System with Twilio's WhatsApp Business API for multi-business support.

## Architecture

```
Customer WhatsApp → Twilio → Webhook → Your Server → AI Response → Twilio → Customer
Business Owner WhatsApp → Twilio → Webhook → Your Server → Command Processing
```

## Prerequisites

### 1. Twilio Account Setup
1. **Create Twilio Account**: https://www.twilio.com/try-twilio
2. **Get Account SID and Auth Token** from Twilio Console
3. **Enable WhatsApp Business API** (requires business verification)

### 2. WhatsApp Business API Access
- **Option A**: Use Twilio Sandbox (for testing)
- **Option B**: Apply for production WhatsApp Business API access

## Step-by-Step Setup

### Step 1: Twilio Console Configuration

1. **Login to Twilio Console**: https://console.twilio.com/
2. **Navigate to Messaging > WhatsApp**
3. **Get your Sandbox WhatsApp number** (starts with +1415...)

### Step 2: Webhook Configuration

1. **Configure Webhook URL in Twilio**:
   ```
   https://your-domain.com/webhooks/twilio/whatsapp
   ```

2. **Set HTTP Method**: POST

3. **Enable Status Callbacks** (optional):
   ```
   https://your-domain.com/webhooks/twilio/status
   ```

### Step 3: Environment Variables

Update your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Webhook Configuration  
WEBHOOK_BASE_URL=https://your-domain.com

# Other existing configurations...
OPENAI_API_KEY=sk-proj-...
PINECONE_API_KEY=pcsk_...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
```

### Step 4: Deploy Your Application

1. **Deploy to production server** (Heroku, AWS, DigitalOcean, etc.)
2. **Ensure HTTPS** is enabled (required by Twilio)
3. **Test webhook endpoint**:
   ```bash
   curl -X POST https://your-domain.com/webhooks/test
   ```

### Step 5: Register Multiple Businesses

Use the API to register multiple businesses:

```bash
# Register Business 1
curl -X POST https://your-domain.com/api/businesses/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Pizza Palace",
    "whatsappNumber": "whatsapp:+14155238886",
    "ownerPhone": "+1234567890"
  }'

# Register Business 2  
curl -X POST https://your-domain.com/api/businesses/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Coffee Corner",
    "whatsappNumber": "whatsapp:+14155238887", 
    "ownerPhone": "+1987654321"
  }'
```

## Testing the Integration

### Test 1: Webhook Connectivity

```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "message"}'
```

Expected response:
```json
{
  "status": "ok",
  "message": "Webhook is working",
  "timestamp": "2024-06-19T10:30:00.000Z"
}
```

### Test 2: System Health Check

```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-06-19T10:30:00.000Z",
  "database": { "status": "connected" },
  "vectorDB": { "isHealthy": true },
  "twilio": { "isHealthy": true },
  "uptime": 1234.5
}
```

### Test 3: Business Owner Commands

Send WhatsApp messages from business owner's phone:

1. **Join Twilio Sandbox**:
   - Send `join <sandbox-keyword>` to +1415...

2. **Test Commands**:
   ```
   !add We serve delicious pizza with fresh ingredients
   !list
   !help
   ```

### Test 4: Customer Queries

Send WhatsApp messages from customer's phone:

```
Hello, what are your hours?
Do you deliver to downtown?
What's on the menu today?
```

## Production Deployment

### 1. WhatsApp Business API Approval

**For Production Use**:
1. **Apply for WhatsApp Business API** through Twilio
2. **Provide business verification documents**
3. **Get dedicated WhatsApp phone numbers**
4. **Complete Facebook Business Manager setup**

### 2. Multiple Business Numbers

**Option A: Dedicated Numbers**
```javascript
// Each business gets its own WhatsApp number
const businesses = [
  { name: "Pizza Palace", number: "whatsapp:+12345678901" },
  { name: "Coffee Corner", number: "whatsapp:+12345678902" },
  { name: "Flower Shop", number: "whatsapp:+12345678903" }
];
```

**Option B: Single Number with Routing**
```javascript
// Route based on business context or customer selection
// Customers choose business: "Press 1 for Pizza, 2 for Coffee..."
```

### 3. Webhook Security

Enable webhook signature validation:

```javascript
// In production, always validate webhook signatures
if (process.env.NODE_ENV === 'production') {
    const isValid = twilioWhatsAppService.validateWebhookSignature(
        req.headers['x-twilio-signature'],
        webhookUrl,
        req.body
    );
    
    if (!isValid) {
        return res.status(403).send('Forbidden');
    }
}
```

## Monitoring & Analytics

### 1. Twilio Console Monitoring

- **Message Logs**: View all sent/received messages
- **Error Logs**: Monitor webhook failures
- **Usage Analytics**: Track message volume and costs

### 2. Application Monitoring

```bash
# Check Twilio service status
curl https://your-domain.com/api/twilio/status

# View registered businesses
curl https://your-domain.com/api/businesses

# Monitor webhook health
curl https://your-domain.com/webhooks/status
```

### 3. Business Performance

```javascript
// Track metrics per business
{
  "businessId": "pizza_palace_123",
  "metrics": {
    "totalQueries": 1250,
    "responseTime": "1.2s",
    "customerSatisfaction": 4.8,
    "knowledgeBaseSize": 45
  }
}
```

## Scaling Considerations

### 1. Message Volume Limits

- **Twilio Sandbox**: 200 messages/day
- **Production**: Varies by plan (10K-1M+ messages/month)

### 2. Rate Limiting

```javascript
// Current rate limits in the system:
const rateLimits = {
  global: "500 requests/hour",
  customer: "10 queries/hour", 
  businessOwner: "30 commands/hour",
  mediaUpload: "5 files/hour"
};
```

### 3. Cost Optimization

- **WhatsApp Business API**: ~$0.005-0.01 per message
- **Optimize AI calls**: Cache responses, batch operations
- **Monitor usage**: Set up billing alerts

## Troubleshooting

### Common Issues

**1. Webhook Not Receiving Messages**
```bash
# Check webhook URL is accessible
curl -I https://your-domain.com/webhooks/twilio/whatsapp

# Verify Twilio webhook configuration
# Check HTTPS certificate is valid
```

**2. Authentication Errors**
```bash
# Verify Twilio credentials
curl -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
  https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json
```

**3. Message Delivery Failures**
```bash
# Check message status
curl -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
  https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages/{MessageSid}.json
```

### Debug Logs

Enable debug logging:
```bash
# Set log level to debug
export LOG_LEVEL=debug

# View webhook logs
tail -f logs/webhook.log | grep TWILIO
```

## Migration from WhatsApp Web.js

### 1. Data Migration

Existing business data in Supabase remains unchanged:
- Business registrations
- Knowledge base entries  
- Customer queries history

### 2. Code Changes

**Before (WhatsApp Web.js)**:
```javascript
await message.reply("Hello from business!");
```

**After (Twilio)**:
```javascript
await twilioWhatsAppService.sendMessage(
    customerPhone, 
    "Hello from business!", 
    businessWhatsAppNumber
);
```

### 3. Feature Parity

| Feature | WhatsApp Web.js | Twilio API | Status |
|---------|-----------------|------------|---------|
| Text Messages | ✅ | ✅ | Complete |
| Media Upload | ✅ | ⏳ | In Progress |
| Business Commands | ✅ | ✅ | Complete |
| Multi-Business | ❌ | ✅ | New Feature |
| Production Ready | ❌ | ✅ | Improved |

## Next Steps

1. **Complete media upload support** for Twilio webhooks
2. **Add business dashboard** for self-service management
3. **Implement billing and subscriptions** for SaaS model
4. **Add analytics and reporting** features
5. **Scale to 100+ businesses** with automated onboarding

## Support

For technical support with this integration:
- **Email**: ravi2523096+sbc@gmail.com
- **Documentation**: Check TECHNICAL_REFERENCE.md
- **Twilio Support**: https://support.twilio.com/