#!/bin/bash

# Local Testing Startup Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

echo "🚀 Starting Small Business Customer Care System for Testing"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your API keys before testing"
    echo "   Required: OPENAI_API_KEY, PINECONE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY"
    echo "   Optional for testing: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN"
    exit 1
fi

# Load environment variables
source .env

# Validate critical environment variables
required_vars=("OPENAI_API_KEY" "PINECONE_API_KEY" "SUPABASE_URL" "SUPABASE_ANON_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   %s\n' "${missing_vars[@]}"
    echo "📝 Please update your .env file"
    exit 1
fi

echo "✅ Environment variables validated"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server in background
echo "🌟 Starting server on port ${PORT:-3000}..."
npm start &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to initialize..."
sleep 10

# Run tests
echo "🧪 Running integration tests..."
node test-twilio-integration.js

# Test results
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed!"
    echo ""
    echo "📋 Next Steps for Full Testing:"
    echo "1. Set up Twilio credentials in .env (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)"
    echo "2. Configure Twilio webhook URL to point to your server"
    echo "3. Test with actual WhatsApp messages"
    echo ""
    echo "🔧 Server Management:"
    echo "Stop server: kill $SERVER_PID"
    echo "View logs:   tail -f logs/app.log"
    echo "Health check: curl http://localhost:${PORT:-3000}/health"
else
    echo ""
    echo "❌ Some tests failed. Check the output above for details."
fi

# Keep server running for manual testing
echo ""
echo "🖥️  Server is running at http://localhost:${PORT:-3000}"
echo "Press Ctrl+C to stop the server"
wait $SERVER_PID