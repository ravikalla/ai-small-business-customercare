# Multi-Business Owner Architecture Options

**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>

## Current State
- Single WhatsApp Web session per server instance
- One business owner per deployment
- Shared database (Supabase) supports multiple businesses

## Architecture Options for Multiple Business Owners

### Option 1: Multi-Instance Deployment (Immediate Solution)

#### Implementation
```bash
# Deploy separate instances
docker run -p 3001:3000 -e BUSINESS_OWNER_PHONE=+1234567890 sbc-app
docker run -p 3002:3000 -e BUSINESS_OWNER_PHONE=+1987654321 sbc-app
docker run -p 3003:3000 -e BUSINESS_OWNER_PHONE=+1555666777 sbc-app
```

#### Load Balancer Configuration
```nginx
upstream sbc_backends {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002; 
    server 127.0.0.1:3003;
}

server {
    listen 80;
    location /api/customer/ {
        proxy_pass http://sbc_backends;
        proxy_set_header X-Business-Query $business_id;
    }
}
```

#### Pros & Cons
**Pros:**
- Quick implementation with current codebase
- Complete business isolation
- Fault tolerance (one business down ≠ all down)
- Easy to scale horizontally

**Cons:**
- Higher resource usage
- Complex deployment management
- Need load balancer for customer queries

---

### Option 2: WhatsApp Business API Integration

#### Prerequisites
- WhatsApp Business API access (Meta verification required)
- Webhook endpoints for message handling
- Phone number verification for each business

#### Architecture Changes
```javascript
// src/services/whatsappBusinessAPI.js
class WhatsAppBusinessAPI {
    constructor() {
        this.businesses = new Map(); // businessId -> API credentials
    }

    async registerBusiness(businessId, phoneNumberId, accessToken) {
        this.businesses.set(businessId, {
            phoneNumberId,
            accessToken,
            webhookUrl: `${process.env.BASE_URL}/webhook/${businessId}`
        });
    }

    async sendMessage(businessId, to, message) {
        const business = this.businesses.get(businessId);
        const response = await fetch(
            `https://graph.facebook.com/v17.0/${business.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${business.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: to,
                    text: { body: message }
                })
            }
        );
        return response.json();
    }
}
```

#### Webhook Handler
```javascript
// src/routes/webhooks.js
app.post('/webhook/:businessId', async (req, res) => {
    const { businessId } = req.params;
    const { entry } = req.body;
    
    for (const change of entry[0].changes) {
        if (change.field === 'messages') {
            for (const message of change.value.messages) {
                await processMessage(businessId, message);
            }
        }
    }
    
    res.sendStatus(200);
});
```

#### Pros & Cons
**Pros:**
- Official WhatsApp Business solution
- Supports unlimited business numbers
- Better reliability and features
- Webhook-based (no browser automation)

**Cons:**
- Requires Meta Business verification
- Monthly costs per phone number
- Complex setup and approval process
- API rate limits and restrictions

---

### Option 3: Shared WhatsApp Session with Routing

#### Implementation
```javascript
// src/services/multiBusinessWhatsApp.js
class MultiBusinessWhatsAppManager {
    constructor() {
        this.businesses = new Map(); // phone -> businessId
        this.client = null;
    }

    async initialize() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: { headless: true }
        });

        this.client.on('message_create', async (message) => {
            const contact = await message.getContact();
            const businessId = this.businesses.get(contact.number);
            
            if (businessId) {
                await this.routeToBusinessHandler(businessId, message);
            } else {
                await this.handleUnregisteredUser(message);
            }
        });

        await this.client.initialize();
    }

    async registerBusinessOwner(phoneNumber, businessId) {
        this.businesses.set(phoneNumber, businessId);
        logger.info(`Registered business owner ${phoneNumber} for ${businessId}`);
    }

    async routeToBusinessHandler(businessId, message) {
        // Route to appropriate business logic
        const business = await businessService.getBusinessById(businessId);
        
        if (business) {
            await this.handleBusinessOwnerMessage(business, message);
        }
    }
}
```

#### Pros & Cons
**Pros:**
- Single WhatsApp connection
- Lower resource usage
- Simpler deployment

**Cons:**
- Single point of failure
- All businesses affected if connection drops
- Complex message routing logic
- Limited to one WhatsApp number for the service

---

### Option 4: Hybrid SaaS Platform

#### Multi-Tenant Architecture
```javascript
// src/services/tenantManager.js
class TenantManager {
    constructor() {
        this.tenants = new Map(); // tenantId -> config
    }

    async createTenant(businessOwner) {
        const tenantId = generateTenantId();
        const config = {
            businessOwner,
            whatsappSession: `tenant_${tenantId}`,
            databaseSchema: `tenant_${tenantId}`,
            port: await this.getAvailablePort()
        };

        // Spawn new instance for this tenant
        await this.deployTenantInstance(tenantId, config);
        this.tenants.set(tenantId, config);
        
        return { tenantId, config };
    }

    async deployTenantInstance(tenantId, config) {
        const docker = new Docker();
        
        await docker.run('sbc-app', [], process.stdout, {
            Env: [
                `TENANT_ID=${tenantId}`,
                `BUSINESS_OWNER_PHONE=${config.businessOwner.phone}`,
                `PORT=${config.port}`,
                `DB_SCHEMA=${config.databaseSchema}`
            ],
            PortBindings: {
                '3000/tcp': [{ HostPort: config.port.toString() }]
            }
        });
    }
}
```

---

## Recommended Implementation Plan

### Phase 1: Multi-Instance Deployment (Immediate)
1. **Containerize current application**
2. **Add environment-based business configuration**
3. **Deploy multiple instances with load balancer**
4. **Update customer query routing**

### Phase 2: WhatsApp Business API (3-6 months)
1. **Apply for WhatsApp Business API access**
2. **Implement webhook handlers**
3. **Migrate existing businesses to API**
4. **Add self-service business registration**

### Phase 3: Full SaaS Platform (6-12 months)
1. **Build tenant management system**
2. **Add billing and subscription management**
3. **Implement automated deployment**
4. **Create business owner dashboard**

## Technical Requirements

### Database Schema Updates
```sql
-- Add tenant isolation
ALTER TABLE businesses ADD COLUMN tenant_id UUID;
ALTER TABLE knowledge_entries ADD COLUMN tenant_id UUID;

-- Add tenant management
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    business_owner_phone VARCHAR(20) UNIQUE,
    whatsapp_session_id VARCHAR(100),
    instance_port INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Infrastructure Requirements
- **Load Balancer:** Nginx/HAProxy for request routing
- **Container Orchestration:** Docker Compose or Kubernetes
- **Service Discovery:** For dynamic instance management
- **Monitoring:** Per-instance health checks and metrics

### Cost Considerations
- **Option 1:** $10-20/month per business (VPS costs)
- **Option 2:** $50+/month per business (WhatsApp API fees)
- **Option 3:** Single instance cost but complexity overhead
- **Option 4:** Platform development cost + ongoing infrastructure

## Next Steps
1. **Immediate:** Implement Option 1 for current clients
2. **Plan:** Start WhatsApp Business API application process
3. **Design:** Full SaaS architecture for future scaling