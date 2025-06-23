@smoke
Feature: Smoke Tests - Critical System Functionality
  As a system administrator
  I want to verify critical system functionality
  So that I can ensure the system is working correctly

  Background:
    Given the SBC system is running

  @smoke @api
  Scenario: Health check endpoint responds correctly
    When I GET "/health"
    Then the response status should be 200
    And the response should contain "status": "ok"

  @smoke @business
  Scenario: Business registration API is functional
    Given I have valid business registration data
    When I POST to "/api/businesses" with:
      | businessName    | Test Smoke Restaurant |
      | whatsappNumber  | whatsapp:+14155238886 |
      | ownerPhone      | +15551234567          |
    Then the response status should be 200
    And the response should contain "success": true

  @smoke @knowledge
  Scenario: Knowledge search API is functional
    When I POST to "/api/knowledge/search" with:
      | businessId | test_business_123     |
      | query      | test query            |
      | topK       | 3                     |
    Then the response status should be 200
    And the response should contain "success": true