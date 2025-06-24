# Small Business Chatbot

A Node.js application that enables small businesses to create AI-powered WhatsApp chatbots using their own knowledge base.

**Author:** Ravi Kalla (ravi2523096+sbc@gmail.com)

## Features

### How It Works - Simple Example

**Step 1: Business Setup** *(Business Owner's WhatsApp)*

| Who | Message |
|-----|---------|
| **Business Owner:** | Hi, I want to set up AI for my restaurant "Indian PizzaHut" |
| **AI Assistant:** | Hello! I'll help you set up your AI assistant. Tell me about your business. |
| **Business Owner:** | We are a restaurant. We're open 9AM to 10PM daily. We serve Indian-style pizzas and fusion dishes. |
| **Business Owner:** | [Uploads menu PDF] |
| **AI Assistant:** | Perfect! Your menu and business info have been saved. Your AI assistant is now ready to help customers! |

**Step 2: Customer Experience** *(Customer's WhatsApp)*

| Who | Message |
|-----|---------|
| **Customer:** | Hi! What breakfast options do you have? |
| **PizzaHut AI:** | Good morning! We serve 'Pani Puri Pizza' and 'Masala Dosa Pizza' between 9AM-11AM. Our breakfast menu includes Indian fusion items perfect for morning cravings. Would you like to see our full menu? |
| **Customer:** | What are your hours? |
| **PizzaHut AI:** | We're open daily from 9:00 AM to 10:00 PM. You can place orders anytime during these hours! |
| **Customer:** | Do you deliver to downtown? |
| **PizzaHut AI:** | Yes! We deliver to downtown within 30 minutes. Delivery fee is $5 for orders under $50. |

**Key Benefits:**
- **Zero Training Required**: Customers use natural language, no special commands needed
- **Instant Setup**: Register your business and upload knowledge in minutes  
- **24/7 Availability**: Your AI assistant never sleeps, never takes breaks
- **Cost Savings**: Reduce customer service staff while improving response times

### Quality Assurance & Monitoring
- **Performance Monitoring**: Real-time metrics and health checks ([View Metrics](http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/metrics))
- **API Documentation**: Interactive Swagger UI documentation ([View API Docs](http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api-docs))
- **Comprehensive Testing**: Unit tests and load testing suite
- **Error Handling**: Robust error handling with structured logging
- **Security**: Rate limiting, input validation, and security headers
- **Automated Monitoring**: Health checks, alerts, and daily reports

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
- `OPENAI_API_KEY`: Your OpenAI API key
- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_ENVIRONMENT`: Your Pinecone environment (e.g., `us-east-1`)
- `PINECONE_INDEX_NAME`: Your Pinecone index name
- `NODE_ENV`: Set to `production` for production deployment

3. Create Pinecone index:
- Create an index with dimension 1536 (for OpenAI embeddings)
- Use cosine similarity metric
- Choose appropriate cloud and region

4. Start the application:

**Development:**
```bash
npm run dev
```

**Production:**
```bash
NODE_ENV=production npm start
```

## Usage

### Upload Knowledge Base
```bash
curl -X POST http://localhost:3000/api/knowledge/upload \
  -F "document=@your-file.pdf" \
  -F "businessId=business123" \
  -F "businessName=Your Business Name"
```

### Search Knowledge Base
```bash
curl -X POST http://localhost:3000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What are your business hours?", "businessId": "business123"}'
```

### WhatsApp Integration

#### For Business Owners:
1. Scan QR code when starting the app
2. Register your business: `!register [Business Name]`
3. Add knowledge: `!add [text content]`
4. Upload documents via WhatsApp attachments (PDF, TXT)
5. Manage knowledge: `!list`, `!delete [id]`, `!help`

#### For Customers:
1. Query using: `!business [businessId] [question]`
2. Example: `!business restaurant123 What are your opening hours?`
3. Get AI-powered responses from business knowledge base

## API Documentation

The application provides comprehensive API documentation through Swagger UI:

**Interactive API Documentation:** [http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api-docs](http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api-docs)

All endpoints, request/response schemas, and example usage are documented in the Swagger interface.

## Monitoring & Health Checks

### Quick Health Check
```bash
curl http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/health
```

### Performance Monitoring
- **Real-time Metrics**: [http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/metrics](http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/metrics)
- **Performance Health**: [http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/health](http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/health)
- **Log Viewer**: [http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/logs](http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/logs)

### Automated Monitoring Scripts
```bash
# Health check
./scripts/health-check.sh

# Start continuous monitoring
./scripts/performance-monitor.sh start

# Generate daily report
./scripts/daily-report.sh
```

### Load Testing
```bash
# Run load tests
cd tests/load
./run-load-tests.sh production

# Specific load scenarios
npm run load:k6:light
npm run load:k6:medium
npm run load:k6:heavy
```

For complete monitoring documentation, see [docs/MONITORING.md](./docs/MONITORING.md).

## Architecture

- **Express.js** - Web framework
- **Pinecone** - Vector database for document storage
- **OpenAI** - Embeddings and chat completion
- **Twilio WhatsApp Business API** - Multi-business WhatsApp integration
- **Supabase PostgreSQL** - Data persistence and business management
- **PM2** - Process management for production
- **Nginx** - Reverse proxy with rate limiting
- **GitHub Actions** - Automated CI/CD pipeline

## Deployment

### AWS EC2 Deployment
Automated deployment to AWS EC2 with GitHub Actions:

1. **Configure GitHub Secrets:**
   - `EC2_HOST` - Your EC2 public IP
   - `EC2_USERNAME` - `ubuntu`
   - `EC2_SSH_KEY` - Your .pem file contents
   - `EC2_SSH_PORT` - `22`

2. **Deploy:**
   - Push to main branch triggers automatic deployment
   - Manual deployment available in Actions tab
   - Health checks and rollback on failure

3. **Monitor:**
   - PM2 dashboard: `pm2 monit`
   - Application logs: `pm2 logs sbc-system`
   - Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### CloudWatch Logging Setup

Set up enterprise-grade centralized logging with AWS CloudWatch:

**Quick Setup (2 commands):**
```bash
# 1. Create IAM role (run locally)
curl -O https://raw.githubusercontent.com/ravikalla/ai-small-business-customercare/main/scripts/create-iam-role-complete.sh
chmod +x create-iam-role-complete.sh && ./create-iam-role-complete.sh

# 2. Setup CloudWatch (run on EC2)
curl -O https://raw.githubusercontent.com/ravikalla/ai-small-business-customercare/main/scripts/setup-cloudwatch-complete.sh
chmod +x setup-cloudwatch-complete.sh && ./setup-cloudwatch-complete.sh
```

**Features:**
- ✅ Automated log discovery and configuration
- ✅ Real-time log streaming to CloudWatch
- ✅ System, application, and PM2 log monitoring
- ✅ Advanced log querying with CloudWatch Insights
- ✅ Cost-effective log retention policies

For detailed instructions, see [CLOUDWATCH_SETUP.md](docs/CLOUDWATCH_SETUP.md)

For GitHub Actions deployment setup, see [GITHUB_ACTIONS_SETUP.md](docs/GITHUB_ACTIONS_SETUP.md)

## 🔧 Configuration

### Environment Variables for Scripts

The automation scripts use environment variables for flexibility:

```bash
# Set your EC2 DNS (replace with your actual DNS)
export EC2_HOST="ec2-54-86-8-77.compute-1.amazonaws.com"
export BASE_URL="http://ec2-54-86-8-77.compute-1.amazonaws.com:3000"

# Run any script with your configuration
./scripts/test-deployment.sh
./scripts/quick-monitor.sh
```

**Available Scripts:**
- `scripts/test-deployment.sh` - Test application endpoints
- `scripts/quick-monitor.sh` - Quick health monitoring  
- `scripts/monitor-logs.sh` - Log monitoring commands
- `scripts/remote-monitor.sh` - Remote server monitoring

## 📁 Project Structure

```
sbc-system/
├── README.md                 # Main project documentation
├── package.json             # Node.js dependencies and scripts
├── src/                     # Application source code
│   ├── index.js             # Main application entry point
│   ├── config/              # Configuration files
│   ├── models/              # Data models
│   ├── routes/              # API routes
│   ├── services/            # Business logic services
│   └── utils/               # Utility functions
├── docs/                    # Documentation files
│   ├── CLOUDWATCH_SETUP.md  # CloudWatch logging setup
│   ├── GITHUB_ACTIONS_SETUP.md # CI/CD deployment setup
│   ├── TWILIO_SETUP_GUIDE.md # WhatsApp integration guide
│   └── ...                  # Other documentation
├── scripts/                 # Automation and deployment scripts
│   ├── setup-cloudwatch-complete.sh # CloudWatch automation
│   ├── create-iam-role-complete.sh  # IAM role automation
│   └── ...                  # Other scripts
├── config/                  # Configuration files
│   ├── nginx.conf           # Nginx configuration
│   ├── Dockerfile           # Docker configuration
│   └── ...                  # Other config files
├── data/                    # Sample data files
└── migrations/              # Database migration scripts
```

## 🚀 Future Improvements & Roadmap

### 🔧 Technical Enhancements

#### Scalability Improvements
| Area | Current | Planned Enhancement | Benefits |
|------|---------|-------------------|----------|
| **Infrastructure** | Single EC2 instance | AWS Fargate/Lambda for webhooks | Auto-scaling, lower ops overhead, cost elasticity |
| **Vector Search** | Basic chunking | Sliding windows + sentence-level chunking | Improved retrieval accuracy for multi-topic docs |
| **Caching** | In-memory JS Map | Redis (ElastiCache) with LRU/TTL | More granular control, better performance |
| **Service Mesh** | Direct service calls | Istio/Linkerd for microservices | Better observability, secure communication |
| **API Management** | Express.js middleware | Amazon API Gateway | Built-in rate limiting, auth, caching |
| **Async Processing** | Synchronous embedding | SQS + worker pools | Non-blocking uploads for large documents |
| **Deployments** | Basic GitHub Actions | Blue/Green + feature flags | Zero downtime, safer production releases |

#### Performance Optimizations
- **Vector Search**: Implement hierarchical indexing for faster similarity search
- **Database**: Add read replicas and connection pooling for high concurrency
- **CDN**: CloudFront integration for static assets and API caching
- **Monitoring**: Advanced APM with distributed tracing (AWS X-Ray)

### 🔐 Security Enhancements

#### Data Protection
| Layer | Current | Planned | Impact |
|-------|---------|---------|--------|
| **Database** | Encryption at rest | Row-level encryption | Protection against DB compromise |
| **AI Safety** | Basic validation | Hallucination detection + content filtering | Prevents harmful customer-facing responses |
| **Webhooks** | HMAC verification | Nonce + timestamp replay protection | Stronger webhook endpoint security |
| **Access Control** | Phone-based auth | OAuth 2.0/SAML integration | Enterprise SSO compatibility |

#### Compliance & Auditing
- **GDPR Compliance**: Data deletion workflows and user consent management
- **Audit Trails**: Comprehensive logging for all data access and modifications
- **Encryption**: End-to-end encryption for sensitive business communications

### 📊 Business Intelligence Features

#### Management Dashboard
- **Usage Analytics**: Real-time metrics on query volume, response accuracy, cost optimization
- **Business Insights**: Customer interaction patterns, popular queries, knowledge gaps
- **Cost Management**: Per-business billing, usage forecasting, cost optimization recommendations
- **Knowledge Analytics**: Document effectiveness scoring, auto-suggestions for content gaps

#### Enterprise Features
| Capability | Status | Priority | Description |
|------------|--------|----------|-------------|
| **Multi-language Support** | ❌ | High | GPT-4 with localized system prompts |
| **RBAC (Role-Based Access)** | ❌ | High | Owner/Editor/Viewer roles for team collaboration |
| **SLA Monitoring** | 🔄 | Medium | Error budgets, uptime SLAs, automated alerts |
| **White-label Solution** | ❌ | Medium | Custom branding for reseller partnerships |
| **API Rate Limiting** | ✅ | - | Tiered pricing with usage-based limits |

### 🌐 Platform Expansion

#### Channel Integration
- **Slack Integration**: Extend beyond WhatsApp to internal team communications
- **Microsoft Teams**: Enterprise chat platform support
- **Web Widget**: Embeddable chat widget for business websites
- **Voice Integration**: Twilio Voice API for phone support automation

#### Advanced AI Capabilities
- **Multimodal Support**: Image and document analysis for richer knowledge bases
- **Conversation Memory**: Context persistence across multiple customer interactions
- **Intent Classification**: Advanced routing for complex multi-step queries
- **A/B Testing**: Response optimization through automated testing

### 🏗️ Architecture Evolution

#### Microservices Migration Path
```
Current: Monolithic Node.js app
Phase 1: Extract knowledge service → Separate container
Phase 2: Extract AI service → Independent scaling
Phase 3: Event-driven architecture → Full decoupling
Phase 4: Service mesh → Production-grade observability
```

#### Data Architecture Improvements
- **Event Sourcing**: Audit-friendly data changes with full history
- **CQRS**: Separate read/write models for optimized performance
- **Data Lake**: Long-term analytics storage with S3 + Athena
- **Real-time Streaming**: Kinesis for live usage analytics

### 💼 Business Model Enhancements

#### Monetization Features
- **Tiered Pricing**: Free tier → Pro → Enterprise with feature gating
- **Usage-based Billing**: Per-query pricing with volume discounts
- **White-label Licensing**: Revenue sharing for implementation partners
- **Marketplace**: Template knowledge bases for common business types

#### Growth & Marketing
- **Self-service Onboarding**: Automated setup with guided tutorials
- **Integration Marketplace**: Pre-built connectors for popular business tools
- **Case Studies**: Success metrics and ROI demonstrations
- **Partner Program**: Channel partnerships with business consultants

### 📈 Success Metrics & KPIs

#### Technical Metrics
- **Uptime**: Target 99.99% availability with <100ms p95 latency
- **Cost Efficiency**: <$0.01 per query with 90%+ cache hit rate
- **Scalability**: Support 10,000+ concurrent businesses
- **Security**: Zero data breaches, SOC 2 Type II compliance

#### Business Metrics  
- **Customer Satisfaction**: >4.5/5 average response accuracy rating
- **Business Growth**: 50%+ reduction in customer support costs
- **Platform Growth**: 1000+ active businesses by end of year
- **Revenue**: $100K ARR with sustainable unit economics

## 📋 Contributing

See our [Issues](https://github.com/ravikalla/ai-small-business-customercare/issues) for current development priorities and planned enhancements. We welcome contributions in all areas:

- 🐛 **Bug Reports**: Help us identify and fix issues
- ✨ **Feature Requests**: Suggest new capabilities and improvements  
- 🔧 **Technical Improvements**: Performance, security, and scalability enhancements
- 📖 **Documentation**: Help improve setup guides and technical documentation
- 🧪 **Testing**: Expand test coverage and automated quality checks

### Development Priorities (Q1 2025)
1. **Redis Caching Layer** - Replace in-memory cache with Redis/ElastiCache
2. **Admin Dashboard** - Web interface for business management and analytics
3. **Blue/Green Deployments** - Zero-downtime deployment pipeline
4. **Multi-language Support** - Localized AI responses for global markets
5. **Enterprise SSO** - OAuth 2.0 integration for team-based access
