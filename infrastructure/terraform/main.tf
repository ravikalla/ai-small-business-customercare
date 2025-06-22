# Complete Terraform Infrastructure for SBC System
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "sbc-system"
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "key_pair_name" {
  description = "EC2 Key Pair name"
  type        = string
  default     = "sbc-system-key"
}

# Sensitive variables for Parameter Store
variable "pinecone_api_key" {
  description = "Pinecone API Key"
  type        = string
  sensitive   = true
}

variable "pinecone_environment" {
  description = "Pinecone Environment"
  type        = string
  default     = "aped-4627-b74a"
}

variable "pinecone_index_name" {
  description = "Pinecone Index Name"
  type        = string
  default     = "sbc-businessdata"
}

variable "supabase_url" {
  description = "Supabase URL"
  type        = string
}

variable "supabase_anon_key" {
  description = "Supabase Anonymous Key"
  type        = string
  sensitive   = true
}

variable "twilio_account_sid" {
  description = "Twilio Account SID"
  type        = string
  sensitive   = true
}

variable "twilio_auth_token" {
  description = "Twilio Auth Token"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  sensitive   = true
}

# Data sources
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group
resource "aws_security_group" "sbc_sg" {
  name_prefix = "${var.project_name}-sg"
  description = "Security group for ${var.project_name}"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Application Port"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-sg"
    Environment = var.environment
  }
}

# IAM Role for EC2
resource "aws_iam_role" "sbc_role" {
  name = "${var.project_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-role"
    Environment = var.environment
  }
}

# IAM Policy
resource "aws_iam_policy" "sbc_policy" {
  name        = "${var.project_name}-policy"
  description = "Policy for ${var.project_name}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "ec2:DescribeVolumes",
          "ec2:DescribeTags",
          "logs:PutLogEvents",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogStreams",
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-policy"
    Environment = var.environment
  }
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "sbc_policy_attachment" {
  policy_arn = aws_iam_policy.sbc_policy.arn
  role       = aws_iam_role.sbc_role.name
}

# Instance Profile
resource "aws_iam_instance_profile" "sbc_profile" {
  name = "${var.project_name}-profile"
  role = aws_iam_role.sbc_role.name

  tags = {
    Name        = "${var.project_name}-profile"
    Environment = var.environment
  }
}

# Parameter Store values
resource "aws_ssm_parameter" "node_env" {
  name  = "/sbc/${var.environment}/node-env"
  type  = "String"
  value = var.environment
}

resource "aws_ssm_parameter" "port" {
  name  = "/sbc/${var.environment}/port"
  type  = "String"
  value = "3000"
}

resource "aws_ssm_parameter" "pinecone_api_key" {
  name  = "/sbc/${var.environment}/pinecone-api-key"
  type  = "SecureString"
  value = var.pinecone_api_key
}

resource "aws_ssm_parameter" "pinecone_environment" {
  name  = "/sbc/${var.environment}/pinecone-environment"
  type  = "String"
  value = var.pinecone_environment
}

resource "aws_ssm_parameter" "pinecone_index_name" {
  name  = "/sbc/${var.environment}/pinecone-index-name"
  type  = "String"
  value = var.pinecone_index_name
}

resource "aws_ssm_parameter" "supabase_url" {
  name  = "/sbc/${var.environment}/supabase-url"
  type  = "String"
  value = var.supabase_url
}

resource "aws_ssm_parameter" "supabase_anon_key" {
  name  = "/sbc/${var.environment}/supabase-anon-key"
  type  = "SecureString"
  value = var.supabase_anon_key
}

resource "aws_ssm_parameter" "twilio_account_sid" {
  name  = "/sbc/${var.environment}/twilio-account-sid"
  type  = "SecureString"
  value = var.twilio_account_sid
}

resource "aws_ssm_parameter" "twilio_auth_token" {
  name  = "/sbc/${var.environment}/twilio-auth-token"
  type  = "SecureString"
  value = var.twilio_auth_token
}

resource "aws_ssm_parameter" "openai_api_key" {
  name  = "/sbc/${var.environment}/openai-api-key"
  type  = "SecureString"
  value = var.openai_api_key
}

# User Data Script
locals {
  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    project_name = var.project_name
    environment  = var.environment
  }))
}

# EC2 Instance
resource "aws_instance" "sbc_instance" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.sbc_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.sbc_profile.name
  user_data              = local.user_data

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  tags = {
    Name        = var.project_name
    Environment = var.environment
  }

  # Ensure all Parameter Store values exist before launching instance
  depends_on = [
    aws_ssm_parameter.node_env,
    aws_ssm_parameter.port,
    aws_ssm_parameter.pinecone_api_key,
    aws_ssm_parameter.pinecone_environment,
    aws_ssm_parameter.pinecone_index_name,
    aws_ssm_parameter.supabase_url,
    aws_ssm_parameter.supabase_anon_key,
    aws_ssm_parameter.twilio_account_sid,
    aws_ssm_parameter.twilio_auth_token,
    aws_ssm_parameter.openai_api_key
  ]
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "sbc_application" {
  name              = "/aws/ec2/sbc-system/application"
  retention_in_days = 30

  tags = {
    Name        = "${var.project_name}-application-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "sbc_system" {
  name              = "/aws/ec2/sbc-system/system"
  retention_in_days = 14

  tags = {
    Name        = "${var.project_name}-system-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "sbc_pm2" {
  name              = "/aws/ec2/sbc-system/pm2-combined"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-pm2-logs"
    Environment = var.environment
  }
}

# Outputs
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.sbc_instance.id
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.sbc_instance.public_ip
}

output "instance_public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.sbc_instance.public_dns
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.sbc_sg.id
}

output "health_check_url" {
  description = "Health check URL"
  value       = "http://${aws_instance.sbc_instance.public_ip}:3000/health"
}

output "api_url" {
  description = "API base URL"
  value       = "http://${aws_instance.sbc_instance.public_ip}:3000/api"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ${var.key_pair_name}.pem ubuntu@${aws_instance.sbc_instance.public_ip}"
}