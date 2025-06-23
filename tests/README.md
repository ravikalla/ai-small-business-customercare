# BDD Test Suite for SBC (Small Business Chatbot) System

This directory contains a comprehensive Behavior-Driven Development (BDD) test suite using Cucumber.js for testing the WhatsApp AI Business Assistant platform.

## 📋 Overview

The test suite covers all major functionality of the SBC system:

- **Business Registration** - WhatsApp and API-based business onboarding
- **Knowledge Management** - Adding, listing, searching, and deleting business knowledge
- **Customer Queries** - AI-powered customer support via WhatsApp
- **Webhook Processing** - Twilio WhatsApp webhook handling and validation
- **System Health** - Monitoring, metrics, and service health checks

## 🏗️ Test Architecture

```
tests/
├── features/                    # Gherkin feature files
│   ├── business_registration.feature
│   ├── knowledge_management.feature
│   ├── customer_queries.feature
│   ├── webhook_processing.feature
│   └── system_health.feature
├── step_definitions/           # Step implementations
│   ├── business_registration_steps.js
│   ├── knowledge_management_steps.js
│   ├── customer_query_steps.js
│   ├── webhook_steps.js
│   └── system_health_steps.js
├── support/                   # Test support files
│   ├── world.js              # Test world constructor
│   └── hooks.js              # Before/After hooks
└── README.md                 # This file
```

## 🚀 Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Set up test environment variables
cp .env.example .env.test
```

### Test Commands

```bash
# Run all tests
npm test

# Run specific feature categories
npm run test:api           # API endpoint tests
npm run test:business      # Business registration tests
npm run test:knowledge     # Knowledge management tests
npm run test:webhook       # Webhook processing tests
npm run test:integration   # Integration tests
npm run test:smoke         # Smoke tests only

# Generate test reports
npm run test:report        # HTML report
npm run test:junit         # JUnit XML report

# Run with coverage
npm run coverage
```

### Test Tags

Tests are organized with tags for selective execution:

- `@smoke` - Critical functionality tests
- `@api` - API endpoint tests
- `@business` - Business registration features
- `@knowledge` - Knowledge management features
- `@webhook` - Webhook processing features
- `@integration` - End-to-end integration tests
- `@performance` - Performance and load tests
- `@security` - Security validation tests

## 📝 Feature Coverage

### Business Registration (`@business`)

**Scenarios:**
- ✅ Successful business registration via WhatsApp
- ✅ Registration with missing business name
- ✅ Duplicate business registration prevention
- ✅ API endpoint registration
- ✅ Various business name formats

**Key Validations:**
- Business ID generation and uniqueness
- Database storage verification
- Error message handling
- Customer instruction delivery

### Knowledge Management (`@knowledge`)

**Scenarios:**
- ✅ Adding text knowledge via WhatsApp
- ✅ Document upload and processing
- ✅ Knowledge listing and statistics
- ✅ Knowledge deletion and cleanup
- ✅ API-based knowledge search
- ✅ Complete knowledge workflow

**Key Validations:**
- Vector storage in Pinecone
- Database persistence
- Search functionality
- Cache invalidation

### Customer Queries (`@customer`)

**Scenarios:**
- ✅ Simple customer questions
- ✅ Semantic search validation
- ✅ Information not in knowledge base
- ✅ Invalid business ID handling
- ✅ Performance under load
- ✅ Caching behavior
- ✅ Multi-language support

**Key Validations:**
- AI response generation
- Response time requirements (<5s)
- Cache hit tracking
- Error handling

### Webhook Processing (`@webhook`)

**Scenarios:**
- ✅ Valid Twilio webhook processing
- ✅ Signature verification
- ✅ Missing field handling
- ✅ Rate limiting
- ✅ Timeout handling
- ✅ Command recognition
- ✅ Media attachment processing

**Key Validations:**
- Security verification
- Performance requirements
- Error handling
- Async processing

### System Health (`@system`)

**Scenarios:**
- ✅ Health check endpoints
- ✅ Database connectivity
- ✅ External service health
- ✅ Performance under load
- ✅ Cache system monitoring
- ✅ Error handling
- ✅ Backup functionality

**Key Validations:**
- Service availability
- Response time monitoring
- Error recovery
- Metrics collection

## 🔧 Test Configuration

### Environment Variables

Test-specific environment variables in `.env.test`:

```bash
NODE_ENV=test
PORT=0  # Random available port
OPENAI_API_KEY=test-openai-key
PINECONE_API_KEY=test-pinecone-key
# ... other test configurations
```

### Mock Services

The test suite includes comprehensive mocking for external services:

- **OpenAI API** - Embeddings and chat completions
- **Pinecone** - Vector operations
- **Twilio** - Message sending and webhooks
- **Supabase** - Database operations

### Test Data Management

- Isolated test data per scenario
- Automatic cleanup between tests
- Realistic test data generation
- Mock business and customer creation

## 📊 Test Reports

### HTML Reports

```bash
npm run test:report
open test-reports/cucumber_report.html
```

### Coverage Reports

```bash
npm run coverage
open coverage/index.html
```

### JUnit XML (CI/CD)

```bash
npm run test:junit
# Outputs to: test-reports/cucumber_report.xml
```

## 🎯 Best Practices

### Writing New Tests

1. **Use Given-When-Then structure**:
   ```gherkin
   Given the system is in a known state
   When I perform an action
   Then I should see the expected result
   ```

2. **Keep scenarios focused**:
   - One scenario per behavior
   - Clear, descriptive scenario names
   - Minimal setup required

3. **Use appropriate tags**:
   ```gherkin
   @smoke @api
   Scenario: Critical API functionality
   ```

4. **Write maintainable step definitions**:
   - Reusable steps across features
   - Clear parameter handling
   - Proper error assertions

### Test Data Strategy

- Use realistic but anonymized data
- Generate unique IDs for each test run
- Clean up test data after each scenario
- Mock external service responses

### Performance Considerations

- Mock external services for speed
- Use parallel test execution where possible
- Set appropriate timeouts
- Monitor test execution time

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
- name: Run BDD Tests
  run: |
    npm install
    npm run test:junit
    npm run coverage

- name: Publish Test Results
  uses: dorny/test-reporter@v1
  with:
    name: BDD Test Results
    path: test-reports/cucumber_report.xml
    reporter: java-junit
```

### Quality Gates

- All smoke tests must pass
- Minimum 80% test coverage
- No critical security vulnerabilities
- Performance tests within thresholds

## 🤝 Contributing to Tests

1. **Adding New Features**:
   - Create feature file in `tests/features/`
   - Implement step definitions
   - Add appropriate tags
   - Update documentation

2. **Test Guidelines**:
   - Follow existing naming conventions
   - Add both positive and negative test cases
   - Include edge cases and error conditions
   - Maintain test independence

3. **Review Checklist**:
   - [ ] Feature file follows Gherkin best practices
   - [ ] Step definitions are reusable
   - [ ] Appropriate mocking for external services
   - [ ] Test data cleanup implemented
   - [ ] Performance considerations addressed

## 📈 Metrics and Monitoring

The test suite tracks:

- Test execution time
- Coverage percentage
- Failure rates by feature
- Performance benchmarks
- Mock service call counts

## 🔍 Debugging Tests

### Common Issues

1. **Test timeouts**:
   ```bash
   # Increase timeout in cucumber.js
   setDefaultTimeout(60000);
   ```

2. **Mock service conflicts**:
   ```bash
   # Clear nocks between tests
   this.cleanupMocks();
   ```

3. **Database state**:
   ```bash
   # Verify cleanup in hooks
   await this.cleanDatabase();
   ```

### Debug Commands

```bash
# Run single scenario
npm test -- --name "Successful business registration"

# Debug with verbose output
DEBUG=sbc:* npm test

# Run with Node debugger
node --inspect-brk node_modules/.bin/cucumber-js
```

This BDD test suite ensures comprehensive coverage of the SBC system while maintaining maintainability and providing clear documentation of system behavior.