# Small Business Chatbot

A Node.js application that enables small businesses to create AI-powered WhatsApp chatbots using their own knowledge base.

**Author:** Ravi Kalla (ravi2523096+sbc@gmail.com)

## Features

### Module 1: Knowledge Base Management
- Upload business documents (PDF, TXT, DOC, DOCX)
- Automatic text extraction and processing
- Vector storage using Pinecone
- Document chunking for optimal retrieval

### Module 2: WhatsApp AI Chatbot
- WhatsApp Web integration
- Natural language query processing
- Context-aware responses using business knowledge
- Multi-business support

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

## API Endpoints

- `POST /api/knowledge/upload` - Upload business documents
- `GET /api/knowledge/business/:businessId/documents` - List business documents
- `POST /api/knowledge/search` - Search knowledge base

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
curl -O https://raw.githubusercontent.com/ravikalla/ai-small-business-customercare/main/create-iam-role-complete.sh
chmod +x create-iam-role-complete.sh && ./create-iam-role-complete.sh

# 2. Setup CloudWatch (run on EC2)
curl -O https://raw.githubusercontent.com/ravikalla/ai-small-business-customercare/main/setup-cloudwatch-complete.sh
chmod +x setup-cloudwatch-complete.sh && ./setup-cloudwatch-complete.sh
```

**Features:**
- ✅ Automated log discovery and configuration
- ✅ Real-time log streaming to CloudWatch
- ✅ System, application, and PM2 log monitoring
- ✅ Advanced log querying with CloudWatch Insights
- ✅ Cost-effective log retention policies

For detailed instructions, see [CLOUDWATCH_SETUP.md](CLOUDWATCH_SETUP.md)

For GitHub Actions deployment setup, see [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)