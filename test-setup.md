# Testing Module 1: WhatsApp Knowledge Base Handler

## Prerequisites
1. Create `.env` file with your API keys:
```bash
cp .env.example .env
```

2. Required API keys:
- `OPENAI_API_KEY` - From OpenAI dashboard
- `PINECONE_API_KEY` - From Pinecone console
- `PINECONE_ENVIRONMENT` - Your Pinecone environment
- `PINECONE_INDEX_NAME` - Your Pinecone index name

## Test Plan

### Phase 1: Business Registration
1. Start the app: `npm run dev`
2. Scan WhatsApp QR code
3. Send message: `!register MyTestRestaurant`
4. Verify registration confirmation

### Phase 2: Text Knowledge Addition
1. Send: `!add We are open Monday to Friday 9AM-6PM`
2. Verify knowledge entry confirmation with ID
3. Send: `!add Our specialty is wood-fired pizza`
4. Check knowledge is stored

### Phase 3: Document Upload
1. Send a PDF file through WhatsApp
2. Verify processing message appears
3. Check successful upload confirmation
4. Send a TXT file
5. Verify text extraction works

### Phase 4: Knowledge Management
1. Send: `!list`
2. Verify all entries are shown
3. Send: `!delete [knowledge-id]`
4. Confirm deletion works
5. Send: `!help`
6. Check command list displays

### Phase 5: Customer Query Test
1. From different phone, send: `!business [your-business-id] What are your hours?`
2. Verify AI response uses uploaded knowledge

## Expected Results

✅ Business registration creates unique ID
✅ Text knowledge stored with confirmations  
✅ PDF/TXT files processed and stored
✅ Knowledge list shows all entries
✅ Delete removes entries
✅ Help shows available commands
✅ Customer queries get AI responses

## Troubleshooting

If WhatsApp doesn't connect:
- Check internet connection
- Ensure phone is connected to same network
- Try restarting the app

If file upload fails:
- Check file size (WhatsApp limits)
- Verify supported formats (PDF, TXT)
- Check temp directory permissions

If API errors occur:
- Verify API keys in .env
- Check Pinecone index exists
- Confirm OpenAI account has credits