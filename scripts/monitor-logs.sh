#!/bin/bash

# Application Log Monitoring Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

EC2_HOST="${EC2_HOST:-ec2-54-86-8-77.compute-1.amazonaws.com}"
KEY_PATH="your-key.pem"  # Update this path to your actual .pem file

echo "🔍 Application Log Monitoring Commands"
echo "======================================"
echo ""

echo "1️⃣ SSH into your server:"
echo "ssh -i $KEY_PATH ubuntu@$EC2_HOST"
echo ""

echo "2️⃣ View real-time application logs:"
echo "pm2 logs sbc-system"
echo ""

echo "3️⃣ View last 50 lines of logs:"
echo "pm2 logs sbc-system --lines 50"
echo ""

echo "4️⃣ View logs with timestamps:"
echo "pm2 logs sbc-system --timestamp"
echo ""

echo "5️⃣ Filter specific log types:"
echo "pm2 logs sbc-system | grep ERROR"
echo "pm2 logs sbc-system | grep WEBHOOK"
echo "pm2 logs sbc-system | grep TWILIO"
echo "pm2 logs sbc-system | grep AI"
echo ""

echo "6️⃣ View system logs:"
echo "sudo journalctl -u nginx -f"
echo "sudo tail -f /var/log/nginx/access.log"
echo "sudo tail -f /var/log/nginx/error.log"
echo ""

echo "7️⃣ Monitor system resources:"
echo "htop"
echo "pm2 monit"
echo ""

echo "🚀 Quick Commands to Copy/Paste:"
echo "================================="
echo ""

# Generate the actual SSH command
echo "# Connect to server:"
echo "ssh -i $KEY_PATH ubuntu@$EC2_HOST"
echo ""

echo "# Once connected, run these commands:"
echo ""
echo "# Real-time logs:"
echo "pm2 logs sbc-system --timestamp"
echo ""
echo "# Application status:"
echo "pm2 status"
echo ""
echo "# System monitoring:"
echo "pm2 monit"
echo ""
echo "# Error logs only:"
echo "pm2 logs sbc-system | grep -E 'ERROR|WARN|FAIL'"
echo ""
echo "# WhatsApp activity:"
echo "pm2 logs sbc-system | grep -E 'WEBHOOK|TWILIO|WHATSAPP'"
echo ""
echo "# AI processing:"
echo "pm2 logs sbc-system | grep -E 'AI|VECTOR|PINECONE'"