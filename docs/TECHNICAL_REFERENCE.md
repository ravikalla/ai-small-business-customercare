# Technical Reference Guide

**Author:** Ravi Kalla (ravi2523096+sbc@gmail.com)  
**Last Updated:** June 18, 2024

## Quick Start Commands

### Development
```bash
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
```

### Production
```bash
NODE_ENV=production npm start
```

## Configuration Reference

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-proj-...              # OpenAI API key
PINECONE_API_KEY=pcsk_...               # Pinecone API key
PINECONE_ENVIRONMENT=us-east-1          # Pinecone environment
PINECONE_INDEX_NAME=sbc-businessdata    # Pinecone index name

# Optional
PORT=3000                               # Server port
NODE_ENV=development                    # Environment mode
```

### Pinecone Index Setup
```javascript
// Index Configuration
{
  name: "sbc-businessdata",
  dimension: 1536,        // OpenAI text-embedding-3-small
  metric: "cosine",       // Similarity metric
  cloud: "aws",           // Cloud provider
  region: "us-east-1"     // AWS region
}
```

## Command Reference

### Business Owner Commands
```
!register [BusinessName]          # Register new business
!add [text content]               # Add text knowledge  
!list                            # List knowledge entries
!delete [knowledgeId]            # Delete knowledge entry
!help                            # Show available commands
[Send PDF/TXT file]              # Upload document
```

### Customer Commands
```
!business [businessId] [question] # Query business knowledge
```

### Example Usage
```
# Business Registration
!register Pizza Palace

# Adding Knowledge
!add We are open Monday to Friday 9AM-6PM, closed weekends
!add Our specialty is wood-fired Neapolitan pizza

# Managing Knowledge
!list
!delete kb_pizzapal_1234567890_abc

# Customer Query
!business pizzapal_1234 What are your hours?
```

## API Reference

### REST Endpoints

#### Upload Document
```http
POST /api/knowledge/upload
Content-Type: multipart/form-data

{
  "document": [file],
  "businessId": "string",
  "businessName": "string"
}

Response:
{
  "message": "Document uploaded successfully",
  "filename": "document.pdf"
}
```

#### List Business Documents
```http
GET /api/knowledge/business/:businessId/documents

Response:
{
  "documents": ["file1.pdf", "file2.txt"]
}
```

#### Search Knowledge Base
```http
POST /api/knowledge/search
Content-Type: application/json

{
  "query": "What are your hours?",
  "businessId": "business123"
}

Response:
{
  "results": [
    {
      "content": "We are open Monday to Friday...",
      "score": 0.95,
      "filename": "hours.txt"
    }
  ]
}
```

## Code Structure Reference

### Main Application Files
```
src/
├── index.js                    # Express server setup
├── utils/logger.js             # Centralized logging
├── modules/
│   ├── whatsapp.js            # WhatsApp bot logic
│   └── knowledgeBase.js       # REST API routes
└── services/
    ├── vectorService.js       # Pinecone operations
    ├── aiService.js          # OpenAI interactions
    ├── businessService.js    # Business management
    └── knowledgeService.js   # Knowledge operations
```

### Key Classes and Methods

#### VectorService
```javascript
// Store document in vector database
await vectorService.storeDocument({
  businessId: "business123",
  businessName: "Pizza Palace", 
  filename: "menu.pdf",
  content: "extracted text...",
  metadata: { fileType: ".pdf" }
});

// Search for similar content
const results = await vectorService.searchSimilar(
  "What are your hours?",
  "business123", 
  3 // topK results
);
```

#### AIService
```javascript
// Generate AI response
const response = await aiService.generateResponse(
  "What are your hours?",
  "business123"
);

// Summarize document
const summary = await aiService.summarizeDocument(content);
```

#### BusinessService
```javascript
// Register new business
const result = await businessService.registerBusiness(
  "1234567890",      // phone number
  "Pizza Palace"     // business name
);

// Get business by owner
const business = businessService.getBusinessByOwner("1234567890");

// Update knowledge count
await businessService.updateKnowledgeCount("1234567890", 1);
```

#### KnowledgeService
```javascript
// Add text knowledge
const result = await knowledgeService.addTextKnowledge(
  "business123",
  "Pizza Palace",
  "We are open 9AM-6PM"
);

// Add document knowledge
const result = await knowledgeService.addDocumentKnowledge(
  "business123",
  "Pizza Palace", 
  "menu.pdf",
  "extracted content...",
  ".pdf",
  { originalSize: 1024 }
);

// Get business knowledge
const entries = knowledgeService.getBusinessKnowledge("business123");

// Delete knowledge
const result = await knowledgeService.deleteKnowledge(
  "business123",
  "kb_business123_1234567890_abc"
);
```

## Data Structures

### Business Object
```javascript
{
  businessId: "pizzapal_1234",
  businessName: "Pizza Palace",
  ownerPhone: "1234567890", 
  registeredAt: "2024-06-18T18:30:00.000Z",
  knowledgeCount: 5,
  status: "active"
}
```

### Knowledge Entry
```javascript
{
  id: "kb_pizzapal_1234567890_abc",
  businessId: "pizzapal_1234",
  businessName: "Pizza Palace",
  type: "text|document|image",
  content: "We are open Monday to Friday...",
  filename: "hours.txt", // for documents
  metadata: {
    addedAt: "2024-06-18T18:30:00.000Z",
    source: "whatsapp",
    fileType: ".txt",
    originalSize: 256
  }
}
```

### Vector Document
```javascript
{
  id: "pizzapal_1234-hours.txt-0",
  values: [0.1, 0.2, 0.3, ...], // 1536 dimensions
  metadata: {
    businessId: "pizzapal_1234",
    businessName: "Pizza Palace",
    filename: "hours.txt", 
    content: "We are open Monday to Friday 9AM-6PM...",
    chunkIndex: 0
  }
}
```

## Logging Reference

### Log Categories
- `[FLOW]` - Message routing decisions
- `[OWNER]` - Business owner operations  
- `[REGISTRATION]` - Business registration
- `[MEDIA]` - Document processing
- `[TEXT]` - Text knowledge operations
- `[LIST]` - Knowledge listing
- `[DELETE]` - Knowledge deletion
- `[QUERY]` - Customer queries
- `[VECTOR]` - Vector database operations
- `[AI]` - AI service operations
- `[BUSINESS]` - Business management
- `[KNOWLEDGE]` - Knowledge management

### Using Logger
```javascript
const logger = require('../utils/logger');

logger.info('Important operation completed');
logger.debug('Detailed debug information');
logger.success('Operation completed successfully');
logger.warn('Non-critical issue occurred');
logger.error('Critical error occurred', error);
```

### Log Levels by Environment
- **Development:** All levels (INFO, DEBUG, SUCCESS, WARN, ERROR)
- **Production:** INFO, SUCCESS, WARN, ERROR only

## Monitoring & Operations

### Cache System Monitoring

The system includes a comprehensive caching layer for AI responses, vector search results, and embeddings.

#### Cache Inspection Methods

**1. REST API Endpoints:**
```bash
# Get cache statistics
curl http://localhost:3000/api/cache/stats

# Inspect cache contents (all types)
curl http://localhost:3000/api/cache/inspect

# Inspect specific cache type
curl "http://localhost:3000/api/cache/inspect?type=responses"
curl "http://localhost:3000/api/cache/inspect?type=searches" 
curl "http://localhost:3000/api/cache/inspect?type=embeddings"

# Clear all caches
curl -X POST http://localhost:3000/api/cache/clear

# Clear specific business caches
curl -X POST http://localhost:3000/api/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"businessId": "business123"}'
```

**2. WhatsApp Commands (Business Owners):**
```
!inspect          # View cache status and recent keys
!clearcache       # Clear all cached responses for fresh queries
```

#### Cache Types and TTL

| Cache Type | Purpose | TTL | Max Size |
|------------|---------|-----|----------|
| Responses | AI-generated answers | 1 hour | 1000 entries |
| Searches | Vector search results | 30 min | 500 entries |  
| Embeddings | Query embeddings | 24 hours | 5000 entries |

#### Cache Key Structure
```javascript
// Response cache keys (MD5 hashed)
"response:5e47be20aa94d81d5375fc43e864ac70"  // Hash of businessId + query

// Search cache keys (MD5 hashed)  
"search:5e47be20aa94d81d5375fc43e864ac70"   // Hash of businessId + query

// Embedding cache keys (MD5 hashed)
"embedding:c8acc6be73436e7c610c16f4f8d14ee0" // Hash of text content
```

#### Cache Invalidation Strategy

**Automatic Invalidation:**
- When knowledge is deleted: All response and search caches cleared
- TTL expiration: Individual entries auto-expire
- Memory pressure: LRU eviction when max size reached

**Manual Invalidation:**
- Business owners can use `!clearcache` command
- Admins can use REST API endpoints
- Complete cache clear via `/api/cache/clear`

#### Monitoring Cache Performance

**Key Metrics to Monitor:**
```javascript
{
  "hits": 15,           // Cache hits
  "misses": 8,          // Cache misses  
  "saves": 23,          // Items saved to cache
  "hitRate": "65.22%",  // Hit rate percentage
  "cacheSize": {
    "responses": 12,    // Cached AI responses
    "embeddings": 45,   // Cached embeddings
    "searches": 8       // Cached search results
  }
}
```

**Log Patterns to Watch:**
```bash
# Cache hits (good)
[DEBUG] [CACHE] Hit responses: response:abc123... (accessed 3 times)

# Cache misses (normal for new queries)  
[DEBUG] [CACHE] Miss responses: response:def456...

# Cache clears (after knowledge changes)
[DEBUG] [CACHE] Cleared ALL 15 cached entries due to business change

# Cache evictions (memory management)
[DEBUG] [CACHE] Evicted oldest responses: response:old123...
```

#### Cache Troubleshooting

**Problem: Low hit rate**
- Check if queries are too varied
- Verify cache TTL settings
- Monitor cache eviction frequency

**Problem: Stale responses after knowledge updates**
- Verify cache invalidation is triggered
- Check knowledge deletion flow
- Use `!clearcache` to force refresh

**Problem: Memory usage concerns**
- Monitor cache sizes via `/api/cache/stats`
- Adjust max size limits if needed
- Check cleanup interval (5 minutes default)

## Troubleshooting Guide

### Common Issues

#### WhatsApp Connection
```bash
# Issue: QR code not appearing
# Solution: Check internet connection, restart app

# Issue: Messages not being received
# Solution: Check phone connection, verify QR scan
```

#### Vector Database
```bash
# Issue: Pinecone connection failed
# Solution: Verify API key and environment in .env

# Issue: Index not found
# Solution: Create index with correct name and dimensions
```

#### AI Responses
```bash
# Issue: No relevant documents found
# Solution: Check business ID, verify knowledge upload

# Issue: OpenAI API error
# Solution: Verify API key, check account credits
```

### Debug Commands
```bash
# Check environment variables
echo $OPENAI_API_KEY
echo $PINECONE_API_KEY

# Test with curl
curl -X POST http://localhost:3000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "businessId": "test123"}'
```

## Performance Considerations

### Vector Search Optimization
- Use appropriate topK values (3-5 for most cases)
- Filter by businessId to reduce search space
- Monitor search latency and adjust as needed

### Memory Management
- Text chunking keeps vectors under 1000 characters
- Temporary files are cleaned up after processing
- JSON data is kept minimal with metadata only

### Rate Limiting
- OpenAI API has rate limits (check current plan)
- Pinecone has query limits (check current plan)
- WhatsApp Web has message rate limits

## Security Best Practices

### API Key Management
- Never commit API keys to version control
- Use environment variables for all secrets
- Rotate API keys regularly

### Data Protection
- Business data is isolated by businessId
- No cross-business data access
- Local JSON files are not web-accessible

### Input Validation
- All user inputs are validated and sanitized
- File uploads are restricted to safe types
- Command inputs are parsed safely

---

*This technical reference provides implementation details and troubleshooting guidance for developers working with the system.*