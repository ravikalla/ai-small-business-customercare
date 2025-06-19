# AWS EC2 Setup Checklist

**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>

## 🚀 Quick EC2 Deployment (15 minutes)

### Step 1: Launch EC2 Instance (5 minutes)

#### In AWS Console:
1. **Go to EC2 Dashboard** → Launch Instance
2. **Choose AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
3. **Instance Type**: t2.micro (Free tier eligible)
4. **Key Pair**: Create new or use existing (.pem file)
5. **Security Group**: Create with these rules:
   ```
   SSH (22): Your IP address
   HTTP (80): 0.0.0.0/0
   HTTPS (443): 0.0.0.0/0
   Custom TCP (3000): 0.0.0.0/0 (for testing)
   ```
6. **Storage**: 20GB gp2 (Free tier: up to 30GB)
7. **Launch Instance**

#### Quick Security Group Setup:
```bash
# If you need to modify security group later:
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

### Step 2: Connect to EC2 (2 minutes)

```bash
# Connect via SSH (replace with your details)
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Or use AWS Session Manager (if configured)
aws ssm start-session --target i-1234567890abcdef0
```

### Step 3: Run Deployment Script (8 minutes)

```bash
# On EC2 instance, run:
curl -sSL https://raw.githubusercontent.com/ravikalla/ai-small-business-customercare/main/deploy-aws.sh | bash

# Or manually:
wget https://github.com/ravikalla/ai-small-business-customercare/archive/main.zip
unzip main.zip
cd ai-small-business-customercare-main
chmod +x deploy-aws.sh
./deploy-aws.sh
```

## 📋 Pre-Deployment Checklist

### Required Information:
- [ ] **OpenAI API Key**: `sk-proj-...`
- [ ] **Pinecone API Key**: `pcsk_...`
- [ ] **Pinecone Environment**: `us-east-1`
- [ ] **Pinecone Index Name**: `sbc-businessdata`
- [ ] **Supabase URL**: `https://xyz.supabase.co`
- [ ] **Supabase Anon Key**: `eyJ...`
- [ ] **Twilio Account SID**: `ACxxxxxxxx...`
- [ ] **Twilio Auth Token**: `xxxxxxxx...`

### Optional:
- [ ] **Domain Name** (for SSL certificates)
- [ ] **DNS configured** (A record pointing to EC2 IP)

## 🔧 Manual Deployment Steps

If you prefer manual setup:

### 1. System Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 and Nginx
sudo npm install -g pm2
sudo apt install -y nginx git certbot python3-certbot-nginx
```

### 2. Application Setup
```bash
# Create app directory
sudo mkdir -p /var/www/sbc-system
sudo chown ubuntu:ubuntu /var/www/sbc-system
cd /var/www/sbc-system

# Clone repository
git clone https://github.com/ravikalla/ai-small-business-customercare.git .

# Install dependencies
npm install --production

# Setup environment
cp .env.example .env
nano .env  # Add your API keys
```

### 3. Process Management
```bash
# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'sbc-system',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '800M',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 4. Reverse Proxy
```bash
# Configure Nginx
sudo nano /etc/nginx/sites-available/sbc-system
# (Copy configuration from AWS_DEPLOYMENT_GUIDE.md)

# Enable site
sudo ln -s /etc/nginx/sites-available/sbc-system /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL Certificate (if domain available)
```bash
# Install SSL certificate
sudo certbot --nginx -d yourdomain.com
```

## 🧪 Testing Your Deployment

### Basic Health Check
```bash
# Test locally
curl http://localhost:3000/health

# Test externally (replace with your domain/IP)
curl http://your-domain-or-ip/health
```

### Register Test Business
```bash
curl -X POST http://your-domain-or-ip/api/businesses/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "AWS Test Business",
    "whatsappNumber": "whatsapp:+14155238886",
    "ownerPhone": "+1234567890"
  }'
```

### Test Webhook
```bash
curl -X POST http://your-domain-or-ip/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "AWS deployment"}'
```

## 🔍 Monitoring Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs sbc-system

# Monitor resources
pm2 monit

# Check system resources
htop
df -h
free -h

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
```

## 🛠 Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs sbc-system

# Check environment variables
cd /var/www/sbc-system
cat .env | grep -v '^#'

# Restart application
pm2 restart sbc-system
```

### Can't Access Externally
```bash
# Check security group allows HTTP/HTTPS
# Check Nginx is running
sudo systemctl status nginx

# Check firewall
sudo ufw status

# Test local connection
curl http://localhost:3000/health
```

### SSL Certificate Issues
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run
```

## 💰 Cost Monitoring

### AWS Free Tier Limits
- **EC2**: 750 hours/month (t2.micro)
- **Storage**: 30GB EBS
- **Data Transfer**: 15GB outbound/month

### Monitor Usage
```bash
# Check AWS billing dashboard
# Set up billing alerts for $1-5

# Monitor instance usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --statistics Average \
  --start-time 2024-06-19T00:00:00Z \
  --end-time 2024-06-20T00:00:00Z \
  --period 3600
```

## 🚀 Production Readiness

### Before Going Live:
- [ ] Domain configured with SSL
- [ ] Twilio webhook URL updated
- [ ] Database migration completed
- [ ] Monitoring setup (CloudWatch)
- [ ] Backup strategy implemented
- [ ] Security group properly configured
- [ ] Application logs rotating properly

### Performance Tuning:
```bash
# Optimize for t2.micro (1GB RAM)
# Monitor memory usage
pm2 monit

# If memory issues, consider:
# - Reducing cache sizes
# - Using external Redis cache
# - Upgrading to t3.small
```

## 📞 Support

### Getting Help:
- **AWS Support**: Basic support included with free tier
- **Application Issues**: Check logs with `pm2 logs sbc-system`
- **Twilio Issues**: Check Twilio Console logs
- **Technical Support**: ravi2523096+sbc@gmail.com

### Useful Resources:
- AWS EC2 Documentation: https://docs.aws.amazon.com/ec2/
- PM2 Documentation: https://pm2.keymetrics.io/docs/
- Nginx Documentation: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/getting-started/

---

🎉 **Your Small Business Customer Care System is now running on AWS!** 

**Next Steps:**
1. Configure Twilio webhook to your new URL
2. Register your first business via API
3. Test WhatsApp integration
4. Monitor performance and costs