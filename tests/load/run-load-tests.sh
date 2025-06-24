#!/bin/bash

# Load Testing Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service is running
check_service() {
    local url="$1"
    print_status "Checking service health at $url..."
    
    if curl -s -f "$url/health" > /dev/null; then
        print_success "Service is running and healthy"
        return 0
    else
        print_error "Service is not responding at $url"
        return 1
    fi
}

# Function to run K6 tests
run_k6_tests() {
    local environment="$1"
    local base_url="$2"
    
    print_status "Running K6 load tests against $environment environment..."
    
    if ! command -v k6 &> /dev/null; then
        print_warning "K6 not installed. Skipping K6 tests."
        print_status "To install K6: https://k6.io/docs/getting-started/installation/"
        return 1
    fi
    
    local scenarios=("light" "medium" "heavy")
    
    for scenario in "${scenarios[@]}"; do
        print_status "Running K6 $scenario load test..."
        
        local output_file="$RESULTS_DIR/k6_${scenario}_${environment}_${TIMESTAMP}.json"
        
        if k6 run \
            --env SCENARIO="$scenario" \
            --env ENVIRONMENT="$environment" \
            --out json="$output_file" \
            "$SCRIPT_DIR/k6-load-test.js"; then
            print_success "K6 $scenario test completed. Results: $output_file"
        else
            print_error "K6 $scenario test failed"
        fi
        
        # Wait between tests
        sleep 10
    done
}

# Function to run Artillery tests
run_artillery_tests() {
    local environment="$1"
    
    print_status "Running Artillery load tests against $environment environment..."
    
    if ! command -v artillery &> /dev/null; then
        print_warning "Artillery not installed. Skipping Artillery tests."
        print_status "To install Artillery: npm install -g artillery"
        return 1
    fi
    
    local output_file="$RESULTS_DIR/artillery_${environment}_${TIMESTAMP}.json"
    
    if artillery run \
        --environment "$environment" \
        --output "$output_file" \
        "$SCRIPT_DIR/artillery-load-test.yml"; then
        print_success "Artillery test completed. Results: $output_file"
        
        # Generate HTML report
        local report_file="$RESULTS_DIR/artillery_${environment}_${TIMESTAMP}.html"
        artillery report "$output_file" --output "$report_file"
        print_success "Artillery HTML report generated: $report_file"
    else
        print_error "Artillery test failed"
    fi
}

# Function to collect performance metrics
collect_metrics() {
    local base_url="$1"
    local test_type="$2"
    
    print_status "Collecting performance metrics..."
    
    local metrics_file="$RESULTS_DIR/metrics_${test_type}_${TIMESTAMP}.json"
    
    if curl -s "$base_url/api/performance/metrics" > "$metrics_file"; then
        print_success "Performance metrics saved: $metrics_file"
        
        # Extract key metrics for quick review
        if command -v jq &> /dev/null; then
            echo
            print_status "Key Performance Metrics:"
            echo "Total Requests: $(jq -r '.metrics.requests.total // "N/A"' "$metrics_file")"
            echo "Average Response Time: $(jq -r '.metrics.response_times.avg // "N/A"' "$metrics_file")ms"
            echo "95th Percentile: $(jq -r '.metrics.response_times.p95 // "N/A"' "$metrics_file")ms"
            echo "Error Rate: $(jq -r '.metrics.errorRate // "N/A"' "$metrics_file")%"
            echo "Memory Usage: $(jq -r '.metrics.memory.heapUsed // "N/A"' "$metrics_file")"
            echo
        fi
    else
        print_warning "Could not collect performance metrics"
    fi
}

# Function to generate summary report
generate_summary() {
    print_status "Generating test summary..."
    
    local summary_file="$RESULTS_DIR/load_test_summary_${TIMESTAMP}.md"
    
    cat > "$summary_file" << EOF
# Load Test Summary

**Date:** $(date)
**Timestamp:** $TIMESTAMP

## Test Configuration
- Test Tool: K6 and Artillery
- Target Environment: $ENVIRONMENT
- Base URL: $BASE_URL

## Test Results
Results are stored in the following files:
- K6 Results: \`k6_*_${TIMESTAMP}.json\`
- Artillery Results: \`artillery_*_${TIMESTAMP}.json\`
- Performance Metrics: \`metrics_*_${TIMESTAMP}.json\`

## Key Findings
<!-- Add manual analysis here -->

## Recommendations
<!-- Add performance recommendations here -->

## Next Steps
1. Review detailed results in JSON files
2. Analyze performance bottlenecks
3. Optimize identified issues
4. Re-run tests to validate improvements

EOF

    print_success "Test summary generated: $summary_file"
}

# Main execution
main() {
    echo
    print_status "=== Small Business Chatbot Load Testing ==="
    echo
    
    # Parse command line arguments
    ENVIRONMENT="${1:-production}"
    
    case "$ENVIRONMENT" in
        "local")
            BASE_URL="http://localhost:3000"
            ;;
        "production")
            BASE_URL="http://ec2-54-86-8-77.compute-1.amazonaws.com:3000"
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT"
            print_status "Usage: $0 [local|production]"
            exit 1
            ;;
    esac
    
    print_status "Environment: $ENVIRONMENT"
    print_status "Target URL: $BASE_URL"
    print_status "Results Directory: $RESULTS_DIR"
    echo
    
    # Check if service is running
    if ! check_service "$BASE_URL"; then
        print_error "Service health check failed. Exiting."
        exit 1
    fi
    
    # Collect baseline metrics
    collect_metrics "$BASE_URL" "baseline"
    
    # Run load tests
    print_status "Starting load tests..."
    echo
    
    # Run K6 tests
    run_k6_tests "$ENVIRONMENT" "$BASE_URL"
    echo
    
    # Wait for system to stabilize
    print_status "Waiting for system to stabilize..."
    sleep 30
    
    # Run Artillery tests
    run_artillery_tests "$ENVIRONMENT"
    echo
    
    # Collect final metrics
    collect_metrics "$BASE_URL" "final"
    
    # Generate summary
    generate_summary
    
    echo
    print_success "Load testing completed!"
    print_status "Results are available in: $RESULTS_DIR"
    echo
}

# Run main function
main "$@"