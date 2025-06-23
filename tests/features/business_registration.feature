@business @api
Feature: Business Registration
  As a small business owner
  I want to register my business through WhatsApp
  So that I can provide AI-powered customer support

  Background:
    Given the SBC system is running
    And the database is clean

  @smoke
  Scenario: Successful business registration via WhatsApp
    Given I am a business owner with phone number "+15551234567"
    When I send a WhatsApp message "!register Ravi's Indian Restaurant"
    Then I should receive a confirmation message
    And the business should be registered in the database
    And the business should have a unique business ID
    And I should receive instructions on how customers can query the business

  @validation
  Scenario: Registration with missing business name
    Given I am a business owner with phone number "+15551234567"
    When I send a WhatsApp message "!register"
    Then I should receive an error message "Please provide a business name. Format: !register [Business Name]"
    And no business should be created in the database

  @validation
  Scenario: Duplicate business registration
    Given I am a business owner with phone number "+15551234567"
    And I have already registered a business named "Ravi's Indian Restaurant"
    When I send a WhatsApp message "!register Another Restaurant"
    Then I should receive an error message about duplicate registration
    And only one business should exist for my phone number

  @api
  Scenario: Business registration via API endpoint
    Given I have valid business registration data
    When I POST to "/api/businesses" with:
      | businessName    | Ravi's Pizza Palace   |
      | whatsappNumber  | whatsapp:+14155238886 |
      | ownerPhone      | +15551234567          |
    Then the response status should be 200
    And the response should contain "success": true
    And the response should include a business ID
    And the business should be stored in the database

  @edge-cases
  Scenario Outline: Registration with various business name formats
    Given I am a business owner with phone number "+15551234567"
    When I send a WhatsApp message "!register <business_name>"
    Then I should receive a <result> message
    And the business creation should be <status>

    Examples:
      | business_name                    | result        | status     |
      | Valid Restaurant Name            | confirmation  | successful |
      | Restaurant@123                   | confirmation  | successful |
      | Very Long Business Name That Exceeds Normal Limits But Should Still Work | confirmation | successful |
      | 中文餐厅                          | confirmation  | successful |
      | Café & Bistro                    | confirmation  | successful |