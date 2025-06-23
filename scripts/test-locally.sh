#!/bin/bash

# Local Test Runner for Development
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

echo "🧪 Running SBC Tests Locally"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set test environment
export NODE_ENV=test

echo -e "\n${BLUE}🔧 Setting up test environment...${NC}"

# Create test directories
mkdir -p test-reports

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo -e "\n${BLUE}🚀 Running smoke tests...${NC}"
if npm run test:smoke; then
    echo -e "${GREEN}✅ Smoke tests passed${NC}"
else
    echo -e "${RED}❌ Smoke tests failed${NC}"
    exit 1
fi

echo -e "\n${BLUE}🧪 Running all BDD tests...${NC}"
if npm test; then
    echo -e "${GREEN}✅ All BDD tests passed${NC}"
else
    echo -e "${RED}❌ BDD tests failed${NC}"
    exit 1
fi

echo -e "\n${BLUE}📊 Generating test reports...${NC}"
npm run test:report

echo -e "\n${GREEN}🎉 All tests completed successfully!${NC}"
echo -e "\n${BLUE}📋 Reports available:${NC}"
echo -e "• HTML Report: ${YELLOW}test-reports/cucumber_report.html${NC}"
echo -e "• JSON Report: ${YELLOW}test-reports/cucumber_report.json${NC}"

echo -e "\n${BLUE}💡 To run specific test categories:${NC}"
echo -e "• npm run test:smoke    # Critical functionality only"
echo -e "• npm run test:api      # API endpoint tests"
echo -e "• npm run test:business # Business registration tests"
echo -e "• npm run test:knowledge # Knowledge management tests"
echo -e "• npm run test:webhook  # Webhook processing tests"