@customer @integration
Feature: Customer Query Processing
  As a customer
  I want to ask questions about businesses via WhatsApp
  So that I can get instant, accurate information

  Background:
    Given the SBC system is running
    And there is a registered business "Ravi's Restaurant" with ID "ravirest_5678"
    And the business has knowledge about:
      | content                                                    |
      | We serve authentic Indian cuisine including biryanis       |
      | Open Monday to Sunday from 11 AM to 10 PM                 |
      | We offer both vegetarian and non-vegetarian options       |
      | Home delivery available within 5 miles, minimum $25       |
      | We use only halal meat and fresh ingredients daily        |

  @smoke
  Scenario: Customer asks a simple question
    Given I am a customer with phone number "+15559876543"
    When I send a WhatsApp message "!business ravirest_5678 What cuisine do you serve?"
    Then I should receive an AI-generated response
    And the response should mention "Indian cuisine"
    And the response should be relevant and helpful
    And the response time should be under 5 seconds

  @semantic-search
  Scenario: Customer asks about specific dietary requirements
    Given I am a customer with phone number "+15559876543"
    When I send a WhatsApp message "!business ravirest_5678 Do you have vegan options?"
    Then I should receive an AI-generated response
    And the response should mention vegetarian options
    And the response should be contextually appropriate
    And the query should be logged for analytics

  @edge-cases
  Scenario: Customer asks about information not in knowledge base
    Given I am a customer with phone number "+15559876543"
    When I send a WhatsApp message "!business ravirest_5678 Do you serve ice cream?"
    Then I should receive a response indicating limited information
    And the response should suggest contacting the business directly
    And the response should be polite and helpful

  @validation
  Scenario: Customer uses invalid business ID
    Given I am a customer with phone number "+15559876543"
    When I send a WhatsApp message "!business invalid_id What are your hours?"
    Then I should receive an error message about business not found
    And no AI processing should occur
    And the error should be user-friendly

  @validation
  Scenario: Customer uses incorrect command format
    Given I am a customer with phone number "+15559876543"
    When I send a WhatsApp message "!business ravirest_5678"
    Then I should receive a message about proper command format
    And the message should include an example query

  @performance
  Scenario: Multiple customers querying simultaneously
    Given there are 10 customers with different phone numbers
    When they all send queries to "ravirest_5678" simultaneously
    Then all customers should receive responses within 10 seconds
    And all responses should be accurate and relevant
    And the system should handle the load without errors

  @caching
  Scenario: Repeated customer queries should use cache
    Given I am a customer with phone number "+15559876543"
    When I send a WhatsApp message "!business ravirest_5678 What are your hours?"
    And I wait 30 seconds
    And I send the same message again
    Then both responses should be identical
    And the second response should be faster
    And the cache hit should be recorded in metrics

  @multi-language
  Scenario Outline: Customer queries in different languages
    Given I am a customer with phone number "+15559876543"
    When I send a WhatsApp message "!business ravirest_5678 <query>"
    Then I should receive a response in the appropriate language
    And the response should be contextually correct

    Examples:
      | query                                    |
      | What food do you serve?                  |
      | ¿Qué tipo de comida sirven?             |
      | Quel type de cuisine servez-vous?        |