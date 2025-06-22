# GitHub Actions CI/CD Setup Guide

**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>

## 🚀 Automated AWS EC2 Deployment with GitHub Actions

This guide sets up automated deployment from GitHub to your AWS EC2 instance whenever you push code changes.

## Overview

### What Gets Automated:
- ✅ **Continuous Integration**: Tests run on every push/PR
- ✅ **Automated Deployment**: Deploy to EC2 on successful push to main
- ✅ **Health Checks**: Verify deployment success
- ✅ **Security Scanning**: Check for secrets and vulnerabilities
- ✅ **Manual Deployment**: Trigger deployment manually when needed

### Workflow Files Created:
- `.github/workflows/deploy-aws.yml` - Main deployment workflow
- `.github/workflows/test.yml` - Testing and security checks

## Step-by-Step Setup

### Step 1: Configure GitHub Secrets

You need to add your EC2 connection details as GitHub secrets:

1. **Go to your GitHub repository**
2. **Click Settings** → **Secrets and variables** → **Actions**
3. **Click "New repository secret"** and add these secrets:

#### Required Secrets:

**EC2_HOST**
```
Value: YOUR-EC2-PUBLIC-IP
Example: 54.123.45.67
```

**EC2_USERNAME**
```
Value: ubuntu
```

**EC2_SSH_KEY**
```
Value: [Contents of your .pem file]

To get this:
1. Open your .pem file in a text editor
2. Copy EVERYTHING including:
   -----BEGIN RSA PRIVATE KEY-----
   [key content]
   -----END RSA PRIVATE KEY-----
3. Paste the entire content as the secret value
```

**EC2_SSH_PORT**
```
Value: 22
```

#### Optional Secrets (for advanced features):

**SLACK_WEBHOOK_URL** (for notifications)
```
Value: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Step 2: Verify GitHub Actions are Enabled

1. **Go to your repository** → **Actions tab**
2. **Enable Actions** if prompted
3. **Check permissions**: Settings → Actions → General
4. **Set permissions**: Allow all actions and reusable workflows

### Step 3: Test the Setup

#### Trigger First Deployment:

**Method 1: Push Changes**
```bash
# Make a small change and push
echo "# GitHub Actions Enabled" >> README.md
git add README.md
git commit -m "Enable GitHub Actions deployment"
git push origin main
```

**Method 2: Manual Trigger**
1. **Go to Actions tab** in your GitHub repository
2. **Click "Deploy to AWS EC2"** workflow
3. **Click "Run workflow"** → **Run workflow**

### Step 4: Monitor Deployment

1. **Go to Actions tab** in your repository
2. **Click on the running workflow**
3. **Monitor the deployment steps**:
   - ✅ Checkout code
   - ✅ Setup Node.js
   - ✅ Install dependencies
   - ✅ Run tests
   - ✅ Deploy to EC2
   - ✅ Health checks

### Expected Workflow Output:

```
✅ Checkout code
✅ Setup Node.js 18
✅ Install dependencies
✅ Run tests
✅ Deploy to EC2
    📥 Pulling latest changes from GitHub...
    📦 Installing dependencies...
    🔄 Restarting application...
    🏥 Checking application health...
    ✅ Application is healthy
    🌐 Checking Nginx...
    🎉 Deployment completed successfully!
```

## Workflow Features

### 1. Automated Testing
```yaml
# Runs on every push and PR
- Unit tests (if available)
- Integration tests
- Security audits
- Application startup tests
```

### 2. Deployment Pipeline
```yaml
# Only deploys on successful tests
- Pull latest code from GitHub
- Install/update dependencies
- Restart application with PM2
- Verify health checks
- Reload Nginx configuration
```

### 3. Security Checks
```yaml
# Scans for common issues
- npm audit for vulnerabilities
- Check for hardcoded secrets
- Validate environment configuration
```

## Customizing the Workflow

### Modify Deployment Script

Edit `.github/workflows/deploy-aws.yml` to customize:

```yaml
# Add custom deployment steps
script: |
  cd /var/www/sbc-system
  git pull origin main
  npm install --production
  
  # Your custom steps here
  npm run build  # if you have a build step
  npm run migrate  # if you have database migrations
  
  pm2 restart sbc-system
```

### Add Environment-Specific Deployments

```yaml
# Deploy to different environments
- name: Deploy to Staging
  if: github.ref == 'refs/heads/develop'
  # staging deployment steps

- name: Deploy to Production  
  if: github.ref == 'refs/heads/main'
  # production deployment steps
```

### Add Slack Notifications

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Advanced Configuration

### Multi-Environment Setup

Create separate workflows for different environments:

```
.github/workflows/
├── deploy-staging.yml    # Deploys develop branch to staging
├── deploy-production.yml # Deploys main branch to production
└── test.yml             # Runs tests on all branches
```

### Database Migrations

Add database migration steps:

```yaml
- name: Run Database Migrations
  run: |
    cd /var/www/sbc-system
    # Add your migration commands here
    # npm run migrate
    # or SQL scripts if needed
```

### Health Check Improvements

Enhanced health checking:

```yaml
- name: Comprehensive Health Check
  run: |
    # Test multiple endpoints
    curl -f http://localhost:3000/health
    curl -f http://localhost:3000/api/businesses
    
    # Test Twilio webhook
    curl -X POST http://localhost:3000/webhooks/test
    
    # Check PM2 status
    pm2 status | grep "online"
```

### Rollback on Failure

Add automatic rollback:

```yaml
- name: Rollback on Failure
  if: failure()
  run: |
    echo "Deployment failed, rolling back..."
    git checkout HEAD~1
    npm install --production
    pm2 restart sbc-system
```

## Troubleshooting

### Common Issues:

**1. SSH Connection Failed**
```
Error: Host key verification failed
Solution: 
- Verify EC2_HOST is correct IP address
- Check EC2_SSH_KEY contains complete private key
- Ensure security group allows SSH from GitHub IPs
```

**2. Permission Denied**
```
Error: Permission denied (publickey)
Solution:
- Verify EC2_USERNAME is "ubuntu"
- Check .pem key format in EC2_SSH_KEY secret
- Ensure key pair matches EC2 instance
```

**3. Application Not Starting**
```
Error: Health check failed
Solution:
- Check PM2 logs: pm2 logs sbc-system
- Verify environment variables in .env
- Check application dependencies
```

**4. Nginx Configuration Error**
```
Error: nginx -t failed
Solution:
- SSH to EC2 and run: sudo nginx -t
- Check /var/log/nginx/error.log
- Verify site configuration is correct
```

### Debug Deployment

Add debug steps to workflow:

```yaml
- name: Debug Information
  run: |
    echo "Current directory: $(pwd)"
    echo "Git status: $(git status --short)"
    echo "PM2 status:"
    pm2 status
    echo "Nginx status:"
    sudo systemctl status nginx
    echo "Application logs:"
    pm2 logs sbc-system --lines 10
```

## Security Best Practices

### 1. Protect Secrets
- ✅ Never commit API keys to repository
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate SSH keys regularly
- ✅ Limit SSH access to specific IPs if possible

### 2. Secure Deployment
- ✅ Use dedicated deployment user
- ✅ Limit sudo permissions
- ✅ Monitor deployment logs
- ✅ Implement deployment approval for production

### 3. Environment Variables
```yaml
# Don't expose secrets in logs
- name: Deploy Application
  env:
    SENSITIVE_VAR: ${{ secrets.SENSITIVE_VAR }}
  run: |
    echo "Deploying..." # Don't echo sensitive variables
```

## Monitoring and Notifications

### GitHub Actions Monitoring
- **Actions tab**: View all workflow runs
- **Email notifications**: Automatic on failure
- **Status badges**: Add to README.md

### Application Monitoring
```yaml
# Add monitoring checks
- name: Post-Deployment Monitoring
  run: |
    # Check application metrics
    curl http://localhost:3000/api/cache/stats
    
    # Verify business registration works
    curl -X POST http://localhost:3000/api/businesses/register \
      -H "Content-Type: application/json" \
      -d '{"businessName":"Test","whatsappNumber":"whatsapp:+14155238886","ownerPhone":"+1234567890"}'
```

## Cost Considerations

### GitHub Actions Usage
- **Free tier**: 2,000 minutes/month for public repos
- **Private repos**: 500 minutes/month (free tier)
- **Cost**: $0.008/minute after free tier

### Optimizing Usage
```yaml
# Skip deployment on documentation changes
on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

## Next Steps

### 1. Set Up Monitoring
- Add application performance monitoring
- Set up log aggregation
- Configure alerting for failures

### 2. Implement Blue-Green Deployment
- Zero-downtime deployments
- Automated rollback on health check failure
- Load balancer configuration

### 3. Multi-Instance Deployment
- Deploy to multiple EC2 instances
- Load balancing configuration
- Database clustering

---

🎉 **Your automated CI/CD pipeline is now ready!** 

Every time you push code to the main branch, it will automatically:
1. Run tests and security checks
2. Deploy to your AWS EC2 instance
3. Restart the application
4. Verify everything is working
5. Notify you of success or failure

**Push your first automated deployment:**
```bash
git add .
git commit -m "Add GitHub Actions CI/CD pipeline"
git push origin main
```