# Claude Code Project Context

## Current Project Status
This is a Small Business Chatbot (SBC) WhatsApp AI Assistant application. The project has completed initial quality improvements and is now ready for the next major feature implementation.

## Next Implementation Priority: Conversational WhatsApp Interface

### Current Challenge
The application currently uses syntactical commands like `!register` and `!business` which feel unnatural. Need to implement a fully conversational interface where:
- Business owners can set up their AI assistant through natural conversation
- Customers can ask questions directly without special syntax
- Each WhatsApp number is dedicated to a specific business

### Implementation Tasks (From TODO List)
**High Priority:**
1. Implement non-syntactical conversational WhatsApp interface
2. Add user classification system (business owner vs customer)
3. Create natural language intent detection for business setup

**Medium Priority:**
4. Implement conversation state management and session tracking
5. Enhance AI response system with business-specific context
6. Add smart knowledge extraction from text and document uploads

### Technical Approach
- User classification based on phone number registration
- Natural language processing for intent detection
- Enhanced AI context system with business-specific knowledge
- Session management for conversation state tracking

### Key Files to Focus On
- `src/routes/webhooks.js` - WhatsApp webhook handler
- `src/services/whatsapp.js` - WhatsApp message processing
- `src/services/ai.js` - AI response generation
- `src/models/Business.js` - Business data model

### Example Implementation Flow
```
Business Owner → "Hi, I want to set up AI for my restaurant"
AI → "Hello! I'll help you set up your AI assistant. Tell me about your business."

Customer → "What are your hours?"
AI → "We're open daily from 9:00 AM to 10:00 PM."
```

## Development Guidelines
- Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
- No LLM attribution in commits
- Use TodoWrite/TodoRead tools to track progress
- Focus on natural, conversational user experience

## Recent Completed Work
- Quality improvements (error handling, testing, monitoring)
- Performance monitoring system
- API documentation with Swagger
- Documentation improvements with conversational examples