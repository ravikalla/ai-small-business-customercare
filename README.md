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
- `PINECONE_ENVIRONMENT`: Your Pinecone environment
- `PINECONE_INDEX_NAME`: Your Pinecone index name

3. Create Pinecone index:
- Create an index with dimension 1536 (for OpenAI embeddings)
- Use cosine similarity metric

4. Start the application:
```bash
npm run dev
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
1. Scan QR code when starting the app
2. Customers can query using: `!business [businessId] [question]`
3. Example: `!business restaurant123 What are your opening hours?`

## API Endpoints

- `POST /api/knowledge/upload` - Upload business documents
- `GET /api/knowledge/business/:businessId/documents` - List business documents
- `POST /api/knowledge/search` - Search knowledge base

## Architecture

- **Express.js** - Web framework
- **Pinecone** - Vector database for document storage
- **OpenAI** - Embeddings and chat completion
- **WhatsApp Web.js** - WhatsApp integration
- **Multer** - File upload handling