#!/bin/bash

# Remote Log Monitoring Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

EC2_HOST="ec2-100-26-45-35.compute-1.amazonaws.com"
KEY_PATH="your-key.pem"  # Update this to your actual .pem file path

echo "🔍 Remote Application Monitoring"
echo "================================"

# Check if key file exists
if [ ! -f "$KEY_PATH" ]; then
    echo "❌ Key file not found: $KEY_PATH"
    echo "Please update KEY_PATH in this script to point to your .pem file"
    exit 1
fi

echo "📡 Connecting to: $EC2_HOST"
echo ""

# Function to run remote commands
run_remote() {
    ssh -i "$KEY_PATH" ubuntu@"$EC2_HOST" "$1"
}

echo "1️⃣ Application Status:"
echo "======================"
run_remote "pm2 status"
echo ""

echo "2️⃣ Last 20 Application Logs:"
echo "=========================="
run_remote "pm2 logs sbc-system --lines 20"
echo ""

echo "3️⃣ System Health:"
echo "================="
run_remote "free -h && df -h && uptime"
echo ""

echo "4️⃣ Nginx Status:"
echo "================"
run_remote "sudo systemctl status nginx --no-pager"
echo ""

echo "5️⃣ Recent Errors (if any):"
echo "=========================="
run_remote "pm2 logs sbc-system --lines 50 | grep -E 'ERROR|WARN|FAIL' | tail -10"
echo ""

echo "6️⃣ WhatsApp Activity (last 10):"
echo "=============================="
run_remote "pm2 logs sbc-system --lines 100 | grep -E 'WEBHOOK|TWILIO|WHATSAPP' | tail -10"
echo ""

echo "🔄 For real-time monitoring, run:"
echo "ssh -i $KEY_PATH ubuntu@$EC2_HOST 'pm2 logs sbc-system --timestamp'"