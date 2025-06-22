# Small Business AI Customer Care System - Design Document

**Author:** Ravi Kalla (ravi2523096+sbc@gmail.com)  
**Version:** 1.0  
**Date:** June 18, 2024

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Module Design](#module-design)
4. [Data Flow](#data-flow)
5. [API Design](#api-design)
6. [Database Schema](#database-schema)
7. [Security Considerations](#security-considerations)
8. [Deployment](#deployment)
9. [Logging & Monitoring](#logging--monitoring)
10. [Future Enhancements](#future-enhancements)

## System Overview

### Purpose
The Small Business AI Customer Care System enables small business owners to create intelligent WhatsApp chatbots using their own knowledge base. The system provides two main modules:
- **Module 1:** Knowledge Base Management via WhatsApp
- **Module 2:** AI-powered Customer Support via WhatsApp

### Key Features
- WhatsApp-based business registration and management
- Document upload and text knowledge entry via WhatsApp
- Vector-based knowledge storage and retrieval
- AI-powered customer responses using OpenAI
- Multi-business support with isolated knowledge bases
- Comprehensive logging and monitoring

### Technology Stack
- **Backend:** Node.js, Express.js
- **WhatsApp Integration:** whatsapp-web.js
- **Vector Database:** Pinecone
- **AI/ML:** OpenAI (text-embedding-3-small, gpt-3.5-turbo)
- **Document Processing:** pdf-parse
- **Data Storage:** JSON files (local), Pinecone (vectors)

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Node.js App   │    │   Pinecone      │
│   (Interface)   │◄──►│   (Core Logic)  │◄──►│   (Vectors)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   OpenAI API    │
                       │   (AI/ML)       │
                       └─────────────────┘
```

### Component Architecture
```
src/
├── index.js                 # Application entry point
├── utils/
│   └── logger.js            # Centralized logging utility
├── modules/
│   ├── whatsapp.js          # WhatsApp bot logic
│   └── knowledgeBase.js     # REST API endpoints
├── services/
│   ├── vectorService.js     # Pinecone operations
│   ├── aiService.js         # OpenAI interactions
│   ├── businessService.js   # Business management
│   └── knowledgeService.js  # Knowledge management
└── data/
    ├── businesses.json      # Business registrations
    └── knowledge.json       # Knowledge metadata
```

## Module Design

### Module 1: Knowledge Base Handler

#### Business Registration Flow
```
User: !register MyRestaurant
├── Validate business name
├── Check if already registered
├── Generate unique business ID
├── Store business data
└── Send confirmation with commands
```

#### Knowledge Addition Flow
```
Text Knowledge: !add [content]
├── Validate content
├── Generate knowledge ID
├── Store locally and in vector DB
└── Send confirmation

Document Upload: [Send PDF/TXT file]
├── Download and validate file
├── Extract text content
├── Chunk and vectorize content
├── Store in Pinecone
└── Send confirmation
```

#### Knowledge Management Commands
- `!list` - View all knowledge entries
- `!delete [id]` - Remove knowledge entry
- `!help` - Show available commands

### Module 2: Customer Support

#### Customer Query Flow
```
Customer: !business [businessId] [question]
├── Extract business ID and query
├── Validate business exists
├── Search vector database for relevant content
├── Generate AI response using OpenAI
└── Send response to customer
```

## Data Flow

### Knowledge Storage Flow
```
Business Owner Input
        ↓
Text Extraction/Processing
        ↓
Content Chunking (1000 chars)
        ↓
Generate Embeddings (OpenAI)
        ↓
Store in Pinecone (vectors)
        ↓
Store Metadata (local JSON)
```

### Customer Query Flow
```
Customer Query
        ↓
Generate Query Embedding
        ↓
Search Pinecone (similarity)
        ↓
Retrieve Top 3 Matches
        ↓
Build Context for AI
        ↓
Generate Response (OpenAI)
        ↓
Send to Customer
```

## API Design

### REST Endpoints

#### Knowledge Management
```javascript
POST /api/knowledge/upload
- Purpose: Upload business documents
- Body: { businessId, businessName, file }
- Response: { success, knowledgeId, message }

GET /api/knowledge/business/:businessId/documents
- Purpose: List business documents
- Response: { documents: [filenames] }

POST /api/knowledge/search
- Purpose: Search knowledge base
- Body: { query, businessId }
- Response: { results: [matches] }
```

### WhatsApp Commands

#### Business Owner Commands
```
!register [BusinessName]     # Register new business
!add [text content]          # Add text knowledge
!list                        # List all knowledge
!delete [knowledgeId]        # Delete knowledge entry
!help                        # Show help
[Send Document]              # Upload document
```

#### Customer Commands
```
!business [businessId] [question]  # Query business knowledge
```

## Database Schema

### Business Data Structure
```javascript
{
  "phoneNumber": {
    "businessId": "string",
    "businessName": "string", 
    "ownerPhone": "string",
    "registeredAt": "ISO8601",
    "knowledgeCount": "number",
    "status": "active"
  }
}
```

### Knowledge Entry Structure
```javascript
{
  "knowledgeId": {
    "id": "string",
    "businessId": "string", 
    "businessName": "string",
    "type": "text|document|image",
    "content": "string",
    "filename": "string", // for documents
    "metadata": {
      "addedAt": "ISO8601",
      "source": "whatsapp",
      "fileType": "string",
      "originalSize": "number"
    }
  }
}
```

### Pinecone Vector Structure
```javascript
{
  "id": "businessId-filename-chunkIndex",
  "values": [1536 dimensional vector],
  "metadata": {
    "businessId": "string",
    "businessName": "string", 
    "filename": "string",
    "content": "string",
    "chunkIndex": "number"
  }
}
```

## Security Considerations

### Authentication
- Business owners identified by WhatsApp phone number
- No password-based authentication required
- Business registration creates trusted relationship

### Data Protection
- Each business has isolated knowledge base
- Vector search filtered by businessId
- Local data stored in JSON files (not exposed via API)

### API Security
- Environment variables for API keys
- No sensitive data in logs (production mode)
- Input validation for all user inputs

### WhatsApp Security
- Message filtering to prevent spam
- Command validation and sanitization
- File upload restrictions (PDF, TXT only)

## Deployment

### Environment Setup
```bash
# Required Environment Variables
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=pcsk_...
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=sbc-businessdata
PORT=3000
NODE_ENV=production
```

### Pinecone Index Configuration
```javascript
{
  name: "sbc-businessdata",
  dimension: 1536,
  metric: "cosine",
  cloud: "aws",
  region: "us-east-1"
}
```

### Production Deployment
```bash
# Install dependencies
npm install

# Start application
NODE_ENV=production npm start
```

### File Structure
```
/Users/ravikalla/Desktop/projects/sbc/
├── package.json
├── .env
├── .gitignore
├── README.md
├── DESIGN.md
├── src/
├── data/           # Created at runtime
├── temp/           # Temporary file processing
└── uploads/        # Legacy (not used in WhatsApp flow)
```

## Logging & Monitoring

### Log Categories
- `[FLOW]` - Message routing and processing
- `[OWNER]` - Business owner operations
- `[REGISTRATION]` - Business registration
- `[MEDIA]` - Document upload processing
- `[TEXT]` - Text knowledge management
- `[LIST]` - Knowledge listing operations
- `[DELETE]` - Knowledge deletion
- `[QUERY]` - Customer queries
- `[VECTOR]` - Vector database operations
- `[AI]` - AI service operations
- `[BUSINESS]` - Business management
- `[KNOWLEDGE]` - Knowledge base operations

### Log Levels
- `INFO` - Important operations
- `DEBUG` - Detailed processing (dev only)
- `SUCCESS` - Successful operations
- `WARN` - Non-critical issues
- `ERROR` - Critical failures

### Log Format
```
[LEVEL] TIMESTAMP: [CATEGORY] Message with context
```

Example:
```
[INFO] 2024-06-18T18:30:00.000Z: [REGISTRATION] Successfully registered business: MyRestaurant (rest_001) for 1234567890
```

## Future Enhancements

### Planned Features
1. **Image Description Support**
   - Allow business owners to upload images with descriptions
   - Store image metadata and descriptions in knowledge base

2. **Advanced Analytics**
   - Customer query analytics
   - Popular questions tracking
   - Business performance metrics

3. **Multi-language Support**
   - Support for multiple languages in queries and responses
   - Language detection and appropriate responses

4. **Webhook Integration**
   - REST API webhooks for external integrations
   - Real-time notifications for new queries

5. **Advanced AI Features**
   - Conversation memory for multi-turn dialogs
   - Sentiment analysis for customer satisfaction
   - Auto-categorization of queries

### Technical Improvements
1. **Database Migration**
   - Move from JSON files to proper database (PostgreSQL/MongoDB)
   - Implement proper schema and relationships

2. **Caching Layer**
   - Redis integration for frequently accessed data
   - Cache embeddings and AI responses

3. **Message Queue**
   - Implement async processing for large documents
   - Queue system for handling high message volume

4. **Load Balancing**
   - Horizontal scaling support
   - Multiple WhatsApp session management

### Scalability Considerations
1. **Multi-tenant Architecture**
   - Support for multiple WhatsApp numbers
   - Business account management

2. **Performance Optimization**
   - Vector search optimization
   - Response caching strategies

3. **Monitoring & Alerting**
   - Health checks and uptime monitoring
   - Error rate and performance alerts

## Integration Points

### External Services
- **OpenAI API** - Text embeddings and chat completion
- **Pinecone** - Vector storage and similarity search
- **WhatsApp Web** - Message sending and receiving

### Configuration Management
- Environment-based configuration
- Feature flags for development/production
- API rate limiting and quotas

### Error Handling
- Graceful degradation for API failures
- Retry mechanisms for transient failures
- User-friendly error messages

---

*This design document serves as the authoritative reference for the Small Business AI Customer Care System architecture and implementation.*