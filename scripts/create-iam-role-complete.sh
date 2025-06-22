#!/bin/bash
#
# Complete IAM Role Creation and EC2 Assignment for CloudWatch
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
#

set -e  # Exit on any error

# Configuration
ROLE_NAME="SBC-Prod-CloudWatch-Role"
PROFILE_NAME="SBC-Prod-CloudWatch-Profile"
POLICY_FILE="cloudwatch-iam-policy.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    # Check policy file
    if [ ! -f "$POLICY_FILE" ]; then
        log_warning "Policy file $POLICY_FILE not found. Creating it..."
        create_policy_file
    fi
    
    log_success "Prerequisites checked"
}

# Create policy file if it doesn't exist
create_policy_file() {
    cat << 'EOF' > "$POLICY_FILE"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudwatch:PutMetricData",
                "ec2:DescribeVolumes",
                "ec2:DescribeTags",
                "logs:PutLogEvents",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogStreams"
            ],
            "Resource": "*"
        }
    ]
}
EOF
    log_success "Created policy file: $POLICY_FILE"
}

# Create IAM role
create_iam_role() {
    log_info "Creating IAM role: $ROLE_NAME"
    
    # Create role
    if aws iam get-role --role-name "$ROLE_NAME" &> /dev/null; then
        log_warning "Role $ROLE_NAME already exists"
    else
        aws iam create-role --role-name "$ROLE_NAME" \
            --assume-role-policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": { "Service": "ec2.amazonaws.com" },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }' > /dev/null
        log_success "Created IAM role: $ROLE_NAME"
    fi
}

# Create and attach custom policy
create_and_attach_policy() {
    log_info "Creating custom CloudWatch policy..."
    
    # Try to create policy, get existing if it already exists
    POLICY_ARN=$(aws iam create-policy \
        --policy-name "SBC-CloudWatch-Custom-Policy" \
        --policy-document "file://$POLICY_FILE" \
        --query 'Policy.Arn' --output text 2>/dev/null || \
        aws iam list-policies --query "Policies[?PolicyName=='SBC-CloudWatch-Custom-Policy'].Arn" --output text)
    
    if [ -z "$POLICY_ARN" ]; then
        log_error "Failed to create or find policy"
        exit 1
    fi
    
    log_success "Policy ARN: $POLICY_ARN"
    
    # Attach policy to role
    log_info "Attaching policy to role..."
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn "$POLICY_ARN" || log_warning "Policy may already be attached"
    
    log_success "Policy attached to role"
}

# Create instance profile
create_instance_profile() {
    log_info "Creating instance profile: $PROFILE_NAME"
    
    # Create instance profile
    if aws iam get-instance-profile --instance-profile-name "$PROFILE_NAME" &> /dev/null; then
        log_warning "Instance profile $PROFILE_NAME already exists"
    else
        aws iam create-instance-profile \
            --instance-profile-name "$PROFILE_NAME" > /dev/null
        log_success "Created instance profile: $PROFILE_NAME"
    fi
    
    # Add role to instance profile
    log_info "Adding role to instance profile..."
    aws iam add-role-to-instance-profile \
        --instance-profile-name "$PROFILE_NAME" \
        --role-name "$ROLE_NAME" 2>/dev/null || log_warning "Role may already be in profile"
    
    log_success "Role added to instance profile"
}

# Find EC2 instances that might need the role
find_ec2_instances() {
    log_info "Looking for EC2 instances..."
    
    # Get all running instances
    INSTANCES=$(aws ec2 describe-instances \
        --filters "Name=instance-state-name,Values=running" \
        --query "Reservations[].Instances[].[InstanceId,Tags[?Key=='Name'].Value|[0],IamInstanceProfile.Arn]" \
        --output text)
    
    if [ -z "$INSTANCES" ]; then
        log_warning "No running EC2 instances found"
        return 1
    fi
    
    echo
    log_info "Found running EC2 instances:"
    echo "$INSTANCES" | while read -r instance_id name profile; do
        if [ "$profile" = "None" ] || [ -z "$profile" ]; then
            echo "  • $instance_id ($name) - No IAM role attached"
        else
            echo "  • $instance_id ($name) - Has IAM role: $profile"
        fi
    done
    echo
    
    return 0
}

# Attach role to EC2 instance
attach_role_to_instance() {
    local instance_id="$1"
    
    log_info "Attaching IAM role to instance: $instance_id"
    
    # Check if instance already has a role
    EXISTING_PROFILE=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --query "Reservations[0].Instances[0].IamInstanceProfile.Arn" \
        --output text 2>/dev/null || echo "None")
    
    if [ "$EXISTING_PROFILE" != "None" ] && [ -n "$EXISTING_PROFILE" ]; then
        log_warning "Instance $instance_id already has IAM profile: $EXISTING_PROFILE"
        read -p "Do you want to replace it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping instance $instance_id"
            return 0
        fi
        
        # Disassociate existing profile
        log_info "Removing existing IAM profile..."
        aws ec2 disassociate-iam-instance-profile --instance-id "$instance_id" || true
        sleep 5
    fi
    
    # Associate new profile
    aws ec2 associate-iam-instance-profile \
        --instance-id "$instance_id" \
        --iam-instance-profile Name="$PROFILE_NAME"
    
    log_success "IAM role attached to instance: $instance_id"
}

# Interactive instance selection
select_instance() {
    if ! find_ec2_instances; then
        return 1
    fi
    
    # Get instances without roles
    INSTANCES_WITHOUT_ROLE=$(aws ec2 describe-instances \
        --filters "Name=instance-state-name,Values=running" \
        --query "Reservations[].Instances[?!IamInstanceProfile].[InstanceId,Tags[?Key=='Name'].Value|[0]]" \
        --output text)
    
    if [ -z "$INSTANCES_WITHOUT_ROLE" ]; then
        log_info "All running instances already have IAM roles attached."
        read -p "Do you want to replace an existing role? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Please specify the instance ID manually:"
            read -p "Instance ID: " INSTANCE_ID
            if [ -n "$INSTANCE_ID" ]; then
                attach_role_to_instance "$INSTANCE_ID"
            fi
        fi
        return 0
    fi
    
    log_info "Instances without IAM roles:"
    echo "$INSTANCES_WITHOUT_ROLE" | nl -w2 -s'. '
    echo
    
    read -p "Enter the number of the instance to attach the role to (or 'all' for all instances): " SELECTION
    
    if [ "$SELECTION" = "all" ]; then
        echo "$INSTANCES_WITHOUT_ROLE" | while read -r instance_id name; do
            attach_role_to_instance "$instance_id"
        done
    elif [[ "$SELECTION" =~ ^[0-9]+$ ]]; then
        INSTANCE_ID=$(echo "$INSTANCES_WITHOUT_ROLE" | sed -n "${SELECTION}p" | awk '{print $1}')
        if [ -n "$INSTANCE_ID" ]; then
            attach_role_to_instance "$INSTANCE_ID"
        else
            log_error "Invalid selection"
            return 1
        fi
    else
        log_error "Invalid selection"
        return 1
    fi
}

# Print setup summary
print_summary() {
    echo
    log_success "=== IAM Role Setup Complete ==="
    echo
    log_info "Created Resources:"
    log_info "  • IAM Role: $ROLE_NAME"
    log_info "  • Instance Profile: $PROFILE_NAME"
    log_info "  • Custom Policy: SBC-CloudWatch-Custom-Policy"
    echo
    log_info "Next Steps:"
    log_info "  1. SSH to your EC2 instance"
    log_info "  2. Run the CloudWatch setup script:"
    log_info "     curl -O https://raw.githubusercontent.com/ravikalla/ai-small-business-customercare/main/setup-cloudwatch-complete.sh"
    log_info "     chmod +x setup-cloudwatch-complete.sh"
    log_info "     ./setup-cloudwatch-complete.sh"
    echo
    log_info "Manual Commands (if needed):"
    log_info "  • Check IAM role: aws iam get-role --role-name $ROLE_NAME"
    log_info "  • List policies: aws iam list-attached-role-policies --role-name $ROLE_NAME"
    echo
}

# Main execution
main() {
    echo
    log_info "=== SBC CloudWatch IAM Role Setup ==="
    log_info "This script will create and configure IAM roles for CloudWatch logging"
    echo
    
    check_prerequisites
    create_iam_role
    create_and_attach_policy
    create_instance_profile
    
    # Ask if user wants to attach to EC2 instance
    echo
    read -p "Do you want to attach this role to an EC2 instance now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        select_instance
    else
        log_info "Skipping EC2 instance attachment"
        log_info "You can attach manually later via AWS Console:"
        log_info "EC2 → Instance → Actions → Security → Modify IAM role → Select: $ROLE_NAME"
    fi
    
    print_summary
    log_success "IAM setup completed successfully! 🎉"
}

# Run main function
main "$@"