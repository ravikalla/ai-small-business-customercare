# CloudWatch Logs Setup Guide

**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>

## 🔍 CloudWatch Logs Configuration for SBC System

This guide sets up centralized logging for your Small Business Customer Care System using AWS CloudWatch.

## Prerequisites

- AWS EC2 instance running SBC System
- AWS CLI configured (or use AWS Console)
- Appropriate IAM permissions

## 🚀 Quick Setup (Automated)

### Option A: Complete Automation (Recommended)

**Step 1: Create IAM Role (Run locally with AWS CLI configured)**
```bash
# Download and run the IAM setup script
curl -O https://raw.githubusercontent.com/ravikalla/ai-small-business-customercare/main/create-iam-role-complete.sh
chmod +x create-iam-role-complete.sh
./create-iam-role-complete.sh
```

**Step 2: Setup CloudWatch on EC2 (SSH to your server)**
```bash
# Download and run the complete setup script
curl -O https://raw.githubusercontent.com/ravikalla/ai-small-business-customercare/main/setup-cloudwatch-complete.sh
chmod +x setup-cloudwatch-complete.sh
./setup-cloudwatch-complete.sh
```

**That's it!** The scripts will:
- ✅ Create IAM roles and policies automatically
- ✅ Attach roles to your EC2 instances interactively
- ✅ Auto-discover your application logs
- ✅ Install and configure CloudWatch agent
- ✅ Set up proper permissions
- ✅ Start monitoring immediately

---

## 📋 Manual Setup (Step-by-Step)

### Step 1: Create IAM Role for CloudWatch

#### Option A: Using AWS Console

1. **Go to IAM Console** → **Roles** → **Create role**
2. **Select:** "AWS service" → "EC2"
3. **Attach policies:**
   - `CloudWatchAgentServerPolicy`
   - Or create custom policy using `cloudwatch-iam-policy.json`
4. **Name:** `SBC-Prod-CloudWatch-Role`
5. **Create role**

#### Option B: Using AWS CLI

```bash
# Create IAM role
aws iam create-role --role-name SBC-Prod-CloudWatch-Role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": { "Service": "ec2.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Create instance profile
aws iam create-instance-profile --instance-profile-name SBC-Prod-CloudWatch-Profile

# Add role to instance profile
aws iam add-role-to-instance-profile \
  --instance-profile-name SBC-Prod-CloudWatch-Profile \
  --role-name SBC-Prod-CloudWatch-Role

# Attach CloudWatch policy
aws iam attach-role-policy \
  --role-name SBC-Prod-CloudWatch-Role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
```

### Step 2: Attach IAM Role to EC2 Instance

#### Using AWS Console:
1. **EC2 Console** → **Instances** → Select your instance
2. **Actions** → **Security** → **Modify IAM role**
3. **Select:** `SBC-Prod-CloudWatch-Role`
4. **Save**

#### Using AWS CLI:
```bash
# Get your instance ID
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=your-instance-name" \
  --query "Reservations[0].Instances[0].InstanceId" --output text)

# Associate IAM instance profile
aws ec2 associate-iam-instance-profile \
  --instance-id $INSTANCE_ID \
  --iam-instance-profile Name=SBC-Prod-CloudWatch-Profile
```

### Step 3: Install CloudWatch Agent on EC2

SSH to your EC2 instance and run:

```bash
# SSH to your server
ssh -i your-key.pem ubuntu@ec2-100-26-45-35.compute-1.amazonaws.com

# Copy and run the complete setup script (recommended)
curl -O https://raw.githubusercontent.com/ravikalla/ai-small-business-customercare/main/setup-cloudwatch-complete.sh
chmod +x setup-cloudwatch-complete.sh
./setup-cloudwatch-complete.sh

# Or use the basic setup script
curl -O https://raw.githubusercontent.com/ravikalla/ai-small-business-customercare/main/setup-cloudwatch.sh
chmod +x setup-cloudwatch.sh
./setup-cloudwatch.sh
```

**Or run manually:**

```bash
# Update system
sudo apt-get update -y

# Download CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Create configuration (copy from setup-cloudwatch.sh)
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a start -m ec2 -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

### Step 4: Verify Setup

1. **Check agent status:**
```bash
sudo systemctl status amazon-cloudwatch-agent
```

2. **Check CloudWatch Console:**
   - Go to **CloudWatch** → **Logs** → **Log groups**
   - Look for these log groups:
     - `/aws/ec2/sbc-system/application`
     - `/aws/ec2/sbc-system/nginx`
     - `/aws/ec2/sbc-system/pm2`

3. **Test logging:**
```bash
# Generate some application activity
curl http://localhost:3000/health
curl http://localhost:3000/api/businesses
```

## Log Groups and Streams

### Application Logs
- **Log Group:** `/aws/ec2/sbc-system/application`
- **Source:** `/var/www/sbc-system/logs/app.log`
- **Contains:** Application events, API calls, errors

### Nginx Logs
- **Log Group:** `/aws/ec2/sbc-system/nginx`
- **Sources:** 
  - `/var/log/nginx/access.log` (HTTP requests)
  - `/var/log/nginx/error.log` (Nginx errors)

### PM2 Logs
- **Log Group:** `/aws/ec2/sbc-system/pm2`
- **Sources:**
  - `~/.pm2/logs/sbc-system-out.log` (Application stdout)
  - `~/.pm2/logs/sbc-system-error.log` (Application stderr)

## CloudWatch Features

### 1. Log Insights
Query your logs with SQL-like syntax:

```sql
# Find all errors in the last hour
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20

# WhatsApp webhook activity
fields @timestamp, @message
| filter @message like /WEBHOOK/
| sort @timestamp desc
| limit 50

# AI response performance
fields @timestamp, @message
| filter @message like /AI.*response/
| sort @timestamp desc
```

### 2. Create Alarms

**High Error Rate Alarm:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "SBC-High-Error-Rate" \
  --alarm-description "High error rate in SBC application" \
  --metric-name "ErrorCount" \
  --namespace "SBC/Application" \
  --statistic "Sum" \
  --period 300 \
  --threshold 10 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 2
```

### 3. Custom Metrics

The CloudWatch agent also collects system metrics:
- CPU utilization
- Memory usage  
- Disk space
- Network activity

## Dashboard Setup

Create a CloudWatch dashboard to monitor your application:

1. **CloudWatch Console** → **Dashboards** → **Create dashboard**
2. **Add widgets for:**
   - Log insights queries
   - EC2 metrics (CPU, Memory)
   - Custom application metrics
   - Error rate trends

## Log Retention and Costs

**Set log retention to control costs:**

```bash
# Set retention to 30 days for all log groups
aws logs put-retention-policy \
  --log-group-name "/aws/ec2/sbc-system/application" \
  --retention-in-days 30

aws logs put-retention-policy \
  --log-group-name "/aws/ec2/sbc-system/nginx" \
  --retention-in-days 14

aws logs put-retention-policy \
  --log-group-name "/aws/ec2/sbc-system/pm2" \
  --retention-in-days 7
```

## Troubleshooting

### Agent Not Starting
```bash
# Check agent logs
sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log

# Restart agent
sudo systemctl restart amazon-cloudwatch-agent
```

### Logs Not Appearing
1. **Check IAM permissions** - Instance needs CloudWatch permissions
2. **Verify log file paths** exist and are readable
3. **Check agent configuration** syntax
4. **Ensure log files have content**

### Permission Issues
```bash
# Make sure log files are readable
sudo chmod 644 /var/www/sbc-system/logs/app.log
sudo chmod 644 /var/log/nginx/*.log
```

## Benefits

✅ **Centralized Logging** - All logs in one place
✅ **Real-time Monitoring** - Live log streaming  
✅ **Advanced Queries** - SQL-like log analysis
✅ **Alerting** - Automated notifications on issues
✅ **Retention Control** - Manage storage costs
✅ **Integration** - Works with other AWS services

---

🎉 **Your SBC System now has enterprise-grade logging with CloudWatch!**

Access your logs at: https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups