# Infrastructure as Code for SBC System

This directory contains automated deployment scripts and Infrastructure as Code (IaC) configurations for the Small Business Customer Care (SBC) System.

**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>

## 🚀 Quick Deployment Options

### Option 1: One-Click Node.js Script (Recommended for Quick Setup)

```bash
# Set your environment variables
export PINECONE_API_KEY="your-pinecone-api-key"
export PINECONE_ENVIRONMENT="aped-4627-b74a"
export PINECONE_INDEX_NAME="sbc-businessdata"
export SUPABASE_URL="https://lelsrnqukkhrfplfkqop.supabase.co"
export SUPABASE_ANON_KEY="your-supabase-anon-key"
export TWILIO_ACCOUNT_SID="your-twilio-account-sid"
export TWILIO_AUTH_TOKEN="your-twilio-auth-token"
export OPENAI_API_KEY="your-openai-api-key"

# Run deployment
cd infrastructure
node deploy-complete.js
```

### Option 2: Terraform (Recommended for Production)

```bash
# Initialize Terraform
cd infrastructure/terraform
terraform init

# Copy and update variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your actual values

# Plan deployment
terraform plan

# Deploy infrastructure
terraform apply
```

### Option 3: Manual Scripts (Educational/Debug)

```bash
# Use the scripts in the scripts/ directory
./scripts/create-iam-role-complete.sh
./scripts/setup-cloudwatch-complete.sh
```

## 📋 What Gets Deployed

### Infrastructure Components

1. **EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.micro (Free Tier eligible)
   - Auto-configured with application

2. **Security Group**
   - SSH (port 22)
   - HTTP (port 80)
   - HTTPS (port 443)
   - Application (port 3000)

3. **IAM Role & Policies**
   - CloudWatch permissions
   - Parameter Store access
   - EC2 permissions

4. **Parameter Store**
   - Secure storage for API keys
   - Environment configuration
   - Application settings

5. **CloudWatch Logging**
   - Application logs
   - System logs
   - PM2 process logs
   - Custom metrics

### Application Components

1. **Node.js Application**
   - Express.js server
   - PM2 process management
   - Auto-restart capabilities

2. **Database Integration**
   - Supabase PostgreSQL
   - Vector database (Pinecone)
   - Automated backups

3. **External Services**
   - Twilio WhatsApp integration
   - OpenAI API integration
   - Real-time webhooks

4. **Monitoring & Health Checks**
   - Automated health monitoring
   - Log aggregation
   - Performance metrics

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PINECONE_API_KEY` | Pinecone API key | `pcsk_...` |
| `PINECONE_ENVIRONMENT` | Pinecone environment | `aped-4627-b74a` |
| `PINECONE_INDEX_NAME` | Pinecone index name | `sbc-businessdata` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |

### Customization

#### Instance Size
```bash
# For higher traffic, use larger instances
export INSTANCE_TYPE="t3.small"  # or t3.medium, t3.large
```

#### Multiple Environments
```bash
# Deploy staging environment
export ENVIRONMENT="staging"
export PROJECT_NAME="sbc-system-staging"
```

#### Custom Region
```bash
export AWS_REGION="us-west-2"
```

## 📊 Monitoring & Management

### Health Checks

```bash
# Check application health
curl http://your-ec2-dns:3000/health

# Check detailed status
ssh -i your-key.pem ubuntu@your-ec2-dns
sudo /usr/local/bin/sbc-info.sh
```

### Logs

```bash
# View application logs
ssh -i your-key.pem ubuntu@your-ec2-dns
pm2 logs sbc-system

# View CloudWatch logs
# Go to AWS Console → CloudWatch → Log groups
```

### Scaling

```bash
# Scale up instance
aws ec2 modify-instance-attribute --instance-id i-xxx --instance-type t3.medium

# Add load balancer (for high traffic)
# Use Terraform modules for ALB setup
```

## 🔒 Security Best Practices

### Secrets Management

1. **Never commit secrets to Git**
2. **Use Parameter Store for sensitive data**
3. **Rotate API keys regularly**
4. **Use IAM roles instead of access keys**

### Network Security

1. **Restrict SSH access to your IP**
2. **Use HTTPS in production**
3. **Enable VPC flow logs**
4. **Regular security updates**

### Application Security

1. **Enable rate limiting**
2. **Validate all inputs**
3. **Use secure headers**
4. **Monitor for suspicious activity**

## 🚨 Troubleshooting

### Common Issues

#### Deployment Fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check permissions
aws iam list-attached-role-policies --role-name sbc-system-role
```

#### Application Not Starting
```bash
# SSH to instance and check logs
ssh -i your-key.pem ubuntu@your-ec2-dns
pm2 logs sbc-system
sudo tail -f /var/log/sbc-setup.log
```

#### Health Check Fails
```bash
# Check if services are running
pm2 status
sudo systemctl status nginx
curl http://localhost:3000/health
```

#### Parameter Store Issues
```bash
# Check if parameters exist
aws ssm get-parameters-by-path --path "/sbc/production"

# Check IAM permissions
aws iam simulate-principal-policy --policy-source-arn arn:aws:iam::account:role/sbc-system-role --action-names ssm:GetParameter --resource-arns "*"
```

### Debug Commands

```bash
# Full system check
ssh -i your-key.pem ubuntu@your-ec2-dns
sudo /usr/local/bin/sbc-info.sh

# Check environment variables
pm2 env 0

# Test database connections
curl http://localhost:3000/health | jq
```

## 📚 Additional Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [PM2 Process Manager](https://pm2.keymetrics.io/)
- [CloudWatch Agent Configuration](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html)

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Test your changes**
4. **Submit a pull request**

## 📄 License

This infrastructure code is part of the SBC System project.

---

For support or questions, contact: **Ravi Kalla** <ravi2523096+sbc@gmail.com>