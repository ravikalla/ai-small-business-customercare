#!/bin/bash

# Create IAM Role for CloudWatch - Run this locally (not on EC2)
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

echo "🔐 Creating IAM Role for CloudWatch"
echo "===================================="

# Create trust policy for EC2
cat > trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

# Create IAM role
echo "Creating IAM role..."
aws iam create-role \
    --role-name SBC-Prod-CloudWatch-Role \
    --assume-role-policy-document file://trust-policy.json

# Attach CloudWatch policy
echo "Attaching CloudWatch policy..."
aws iam attach-role-policy \
    --role-name SBC-Prod-CloudWatch-Role \
    --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

# Create instance profile
echo "Creating instance profile..."
aws iam create-instance-profile \
    --instance-profile-name SBC-Prod-CloudWatch-Profile

# Add role to instance profile
echo "Adding role to instance profile..."
aws iam add-role-to-instance-profile \
    --instance-profile-name SBC-Prod-CloudWatch-Profile \
    --role-name SBC-Prod-CloudWatch-Role

echo "✅ IAM role created successfully!"
echo ""
echo "Next step: Attach this role to your EC2 instance"
echo "AWS Console → EC2 → Instance → Actions → Security → Modify IAM role"
echo "Select: SBC-Prod-CloudWatch-Profile"

# Clean up
rm trust-policy.json