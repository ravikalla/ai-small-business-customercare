#!/bin/bash

# BDD Test Runner Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

echo "🧪 SBC BDD Test Suite Runner"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create test reports directory
mkdir -p test-reports

# Function to run tests with error handling
run_tests() {
    local test_name="$1"
    local test_command="$2"
    local test_description="$3"
    
    echo -e "\n${BLUE}🚀 Running $test_name${NC}"
    echo -e "${YELLOW}Description: $test_description${NC}"
    echo "Command: $test_command"
    echo "----------------------------------------"
    
    if eval $test_command; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        return 1
    fi
}

# Main test execution
main() {
    local failed_tests=0
    local total_tests=0
    
    echo "Setting up test environment..."
    export NODE_ENV=test
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    echo -e "\n${BLUE}Starting BDD Test Suite...${NC}\n"
    
    # Smoke Tests (Critical functionality)
    run_tests "Smoke Tests" \
              "npm run test:smoke" \
              "Critical system functionality validation"
    ((total_tests++))
    if [ $? -ne 0 ]; then ((failed_tests++)); fi
    
    # API Tests
    run_tests "API Tests" \
              "npm run test:api" \
              "REST API endpoint validation"
    ((total_tests++))
    if [ $? -ne 0 ]; then ((failed_tests++)); fi
    
    # Business Registration Tests
    run_tests "Business Registration" \
              "npm run test:business" \
              "Business onboarding and registration flows"
    ((total_tests++))
    if [ $? -ne 0 ]; then ((failed_tests++)); fi
    
    # Knowledge Management Tests
    run_tests "Knowledge Management" \
              "npm run test:knowledge" \
              "Knowledge base CRUD operations and search"
    ((total_tests++))
    if [ $? -ne 0 ]; then ((failed_tests++)); fi
    
    # Webhook Processing Tests
    run_tests "Webhook Processing" \
              "npm run test:webhook" \
              "WhatsApp webhook handling and validation"
    ((total_tests++))
    if [ $? -ne 0 ]; then ((failed_tests++)); fi
    
    # Integration Tests
    run_tests "Integration Tests" \
              "npm run test:integration" \
              "End-to-end system integration validation"
    ((total_tests++))
    if [ $? -ne 0 ]; then ((failed_tests++)); fi
    
    # Generate comprehensive test report
    echo -e "\n${BLUE}📊 Generating Test Reports...${NC}"
    run_tests "Test Report Generation" \
              "npm run test:report" \
              "HTML and JUnit test reports"
    
    # Generate coverage report
    echo -e "\n${BLUE}📈 Generating Coverage Report...${NC}"
    run_tests "Coverage Analysis" \
              "npm run coverage" \
              "Code coverage analysis and reporting"
    
    # Final summary
    echo -e "\n${BLUE}===============================================${NC}"
    echo -e "${BLUE}🏁 Test Suite Execution Complete${NC}"
    echo -e "${BLUE}===============================================${NC}"
    
    echo -e "Total Test Categories: $total_tests"
    echo -e "Passed: $((total_tests - failed_tests))"
    echo -e "Failed: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
        echo -e "${GREEN}System is ready for deployment.${NC}"
        
        echo -e "\n${BLUE}📋 Available Reports:${NC}"
        echo -e "• HTML Report: ${YELLOW}test-reports/cucumber_report.html${NC}"
        echo -e "• JUnit XML: ${YELLOW}test-reports/cucumber_report.xml${NC}"
        echo -e "• Coverage: ${YELLOW}coverage/index.html${NC}"
        
        return 0
    else
        echo -e "\n${RED}❌ $failed_tests TEST CATEGORIES FAILED${NC}"
        echo -e "${RED}Please review the test output and fix issues before deployment.${NC}"
        
        echo -e "\n${YELLOW}💡 Debugging Tips:${NC}"
        echo -e "• Check test-reports/ for detailed failure information"
        echo -e "• Run specific test category: npm run test:[category]"
        echo -e "• Debug single scenario: npm test -- --name 'scenario name'"
        echo -e "• Enable debug logging: DEBUG=sbc:* npm test"
        
        return 1
    fi
}

# Help function
show_help() {
    echo "SBC BDD Test Suite Runner"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -s, --smoke    Run only smoke tests"
    echo "  -f, --fast     Run tests without coverage"
    echo "  -v, --verbose  Enable verbose output"
    echo ""
    echo "Examples:"
    echo "  $0              # Run full test suite"
    echo "  $0 --smoke      # Run only critical tests"
    echo "  $0 --fast       # Skip coverage generation"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--smoke)
            echo "🔥 Running Smoke Tests Only"
            npm run test:smoke
            exit $?
            ;;
        -f|--fast)
            echo "⚡ Fast Mode: Skipping coverage"
            export SKIP_COVERAGE=true
            ;;
        -v|--verbose)
            echo "📝 Verbose Mode Enabled"
            export DEBUG=sbc:*
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
    shift
done

# Run main function
main
exit $?