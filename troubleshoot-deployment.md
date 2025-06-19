# Deployment Troubleshooting Guide

## 🚨 Current Issue: SSH Connection Timeout

The deployment is failing with `dial tcp ***:***: i/o timeout`, which means GitHub Actions cannot establish an SSH connection to your EC2 instance.

## 🔍 Step-by-Step Fix

### 1. Check EC2 Instance Status

**AWS Console:**
1. Go to EC2 Dashboard
2. Click "Instances"
3. Find your instance
4. Status should be "Running" (green)
5. Note the **Public IPv4 address**

### 2. Fix Security Group (Most Likely Issue)

**AWS Console:**
1. EC2 → Instances → Select your instance
2. Click "Security" tab
3. Click on the Security Group name
4. Click "Edit inbound rules"
5. Click "Add rule"
6. Configure:
   - **Type:** SSH
   - **Protocol:** TCP
   - **Port Range:** 22
   - **Source:** 0.0.0.0/0
   - **Description:** GitHub Actions SSH access
7. Click "Save rules"

**AWS CLI Alternative:**
```bash
# Replace with your security group ID
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0
```

### 3. Verify GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions

**Check these secrets exist and are correct:**

**EC2_HOST:**
- Value: Your EC2 public IP (e.g., `54.123.45.67`)
- NOT the private IP or DNS name

**EC2_USERNAME:**
- Value: `ubuntu` (for Ubuntu instances)
- Value: `ec2-user` (for Amazon Linux)

**EC2_SSH_KEY:**
- Complete contents of your .pem file
- Must include the BEGIN and END lines:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...your key content...
-----END RSA PRIVATE KEY-----
```

**EC2_SSH_PORT:**
- Value: `22`

### 4. Test SSH Connection Manually

From your local machine:
```bash
# Test SSH connection
ssh -i your-key.pem ubuntu@YOUR-EC2-PUBLIC-IP

# If this fails, the problem is with EC2/Security Group
# If this works, the problem is with GitHub secrets
```

### 5. Check Network ACLs (Advanced)

If security group is correct but still failing:
1. EC2 → Network ACLs
2. Find the Network ACL associated with your subnet
3. Ensure inbound rules allow SSH (port 22) from 0.0.0.0/0

### 6. Verify EC2 Key Pair

Make sure:
- The key pair used to launch EC2 matches your .pem file
- The .pem file permissions are correct: `chmod 400 your-key.pem`

## 🛠️ Quick Commands to Check

### Check if EC2 is reachable:
```bash
# From your local machine
nmap -p 22 YOUR-EC2-PUBLIC-IP

# Should show: 22/tcp open ssh
# If closed/filtered: Security group issue
```

### Test SSH with verbose output:
```bash
ssh -v -i your-key.pem ubuntu@YOUR-EC2-PUBLIC-IP
```

## 🎯 Most Common Solutions

### Solution 1: Security Group Fix (90% of cases)
Add SSH inbound rule to security group as described in step 2.

### Solution 2: Wrong IP Address
Ensure `EC2_HOST` secret contains the **public IP**, not private IP.

### Solution 3: Wrong Key Format
Ensure `EC2_SSH_KEY` contains the complete .pem file with BEGIN/END lines.

### Solution 4: Instance Not Running
Start your EC2 instance if it's stopped.

## 🔄 After Fixing

1. Update GitHub secrets if needed
2. Go to repository → Actions tab
3. Click "Deploy to AWS EC2" workflow
4. Click "Re-run failed jobs"

## 📞 Need Help?

If you're still having issues:
1. Share the output of: `nmap -p 22 YOUR-EC2-PUBLIC-IP`
2. Confirm your security group has SSH rule for 0.0.0.0/0
3. Verify you can SSH manually from your local machine

---

**Most likely fix:** Add SSH rule to security group allowing 0.0.0.0/0 on port 22.