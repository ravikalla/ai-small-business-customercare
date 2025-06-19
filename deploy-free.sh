#!/bin/bash

# Free Deployment Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

echo "🚀 Deploying Small Business Customer Care System (Free Hosting)"

# Check if git repo is clean
if [[ `git status --porcelain` ]]; then
  echo "⚠️ Uncommitted changes detected. Commit first:"
  git status --porcelain
  exit 1
fi

echo "🔧 Choose deployment platform:"
echo "1) Railway (Recommended - $5/month credit)"
echo "2) Render (Free with sleep)"
echo "3) Cyclic (Free serverless)"
read -p "Enter choice (1-3): " choice

case $choice in
  1)
    echo "🚂 Deploying to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo "📦 Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Deploy
    railway login
    railway init
    railway up
    
    echo "✅ Deployed to Railway!"
    echo "🔗 Set webhook URL: https://your-app.railway.app/webhooks/twilio/whatsapp"
    ;;
    
  2)
    echo "🎨 Deploying to Render..."
    
    # Create render.yaml if it doesn't exist
    if [ ! -f render.yaml ]; then
        cat > render.yaml << 'EOF'
services:
  - type: web
    name: sbc-system
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
EOF
    fi
    
    git add render.yaml
    git commit -m "Add Render deployment config"
    git push
    
    echo "✅ Ready for Render deployment!"
    echo "📋 Next steps:"
    echo "1. Go to render.com"
    echo "2. Connect your GitHub repo"
    echo "3. Add environment variables"
    echo "4. Deploy"
    ;;
    
  3)
    echo "🔄 Deploying to Cyclic..."
    
    # Check if Cyclic CLI is installed
    if ! command -v cyclic &> /dev/null; then
        echo "📦 Installing Cyclic CLI..."
        npm install -g @cyclic/cli
    fi
    
    # Deploy
    npx cyclic-cli@latest deploy
    
    echo "✅ Deployed to Cyclic!"
    echo "🔗 Set webhook URL: https://your-app.cyclic.app/webhooks/twilio/whatsapp"
    ;;
    
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📋 Post-Deployment Checklist:"
echo "1. Add environment variables in hosting dashboard"
echo "2. Update Twilio webhook URL"
echo "3. Test deployment: curl https://your-app-url/health"
echo "4. Register test business via API"
echo "5. Test WhatsApp integration"
echo ""
echo "🔐 Required Environment Variables:"
echo "- OPENAI_API_KEY"
echo "- PINECONE_API_KEY" 
echo "- PINECONE_ENVIRONMENT"
echo "- PINECONE_INDEX_NAME"
echo "- SUPABASE_URL"
echo "- SUPABASE_ANON_KEY"
echo "- TWILIO_ACCOUNT_SID"
echo "- TWILIO_AUTH_TOKEN"
echo "- WEBHOOK_BASE_URL (set to your app URL)"