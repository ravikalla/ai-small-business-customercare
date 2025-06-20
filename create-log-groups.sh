#!/bin/bash

# Manual CloudWatch Log Groups Creation
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

echo "📋 Creating CloudWatch Log Groups Manually"
echo "==========================================="

# Check if AWS CLI is configured
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
if aws sts get-caller-identity > /dev/null 2>&1; then
    echo "✅ AWS credentials are configured"
    aws sts get-caller-identity
else
    echo "❌ AWS credentials not configured"
    echo "   Configure with: aws configure"
    exit 1
fi

# Create log groups
echo ""
echo "📂 Creating log groups..."

# Application logs
echo "Creating /aws/ec2/sbc-system/application..."
aws logs create-log-group --log-group-name "/aws/ec2/sbc-system/application" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Application log group created"
else
    echo "ℹ️ Application log group already exists or failed to create"
fi

# Nginx logs
echo "Creating /aws/ec2/sbc-system/nginx..."
aws logs create-log-group --log-group-name "/aws/ec2/sbc-system/nginx" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Nginx log group created"
else
    echo "ℹ️ Nginx log group already exists or failed to create"
fi

# PM2 logs
echo "Creating /aws/ec2/sbc-system/pm2..."
aws logs create-log-group --log-group-name "/aws/ec2/sbc-system/pm2" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ PM2 log group created"
else
    echo "ℹ️ PM2 log group already exists or failed to create"
fi

# Set retention policies
echo ""
echo "⏰ Setting retention policies..."

aws logs put-retention-policy --log-group-name "/aws/ec2/sbc-system/application" --retention-in-days 30
aws logs put-retention-policy --log-group-name "/aws/ec2/sbc-system/nginx" --retention-in-days 14
aws logs put-retention-policy --log-group-name "/aws/ec2/sbc-system/pm2" --retention-in-days 7

echo "✅ Retention policies set"

# List created log groups
echo ""
echo "📋 Listing log groups..."
aws logs describe-log-groups --log-group-name-prefix "/aws/ec2/sbc-system" --query 'logGroups[*].[logGroupName,retentionInDays]' --output table

echo ""
echo "🎉 Log groups created successfully!"
echo ""
echo "🔗 View in AWS Console:"
echo "https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups"