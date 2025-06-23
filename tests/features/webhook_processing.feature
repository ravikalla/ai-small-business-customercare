@webhook @integration
Feature: WhatsApp Webhook Processing
  As the SBC system
  I want to process WhatsApp webhooks reliably
  So that all messages are handled correctly and efficiently

  Background:
    Given the SBC system is running
    And Twilio webhook endpoint is configured
    And the system can receive webhook requests

  @smoke
  Scenario: Processing valid Twilio webhook
    Given I receive a Twilio webhook with:
      | MessageSid  | SM1234567890abcdef               |
      | AccountSid  | AC1234567890abcdef               |
      | From        | whatsapp:+15551234567            |
      | To          | whatsapp:+14155238886            |
      | Body        | !register Test Restaurant        |
      | NumMedia    | 0                                |
    When the webhook is processed
    Then the response status should be 200
    And the response body should be "OK"
    And the message should be processed correctly
    And appropriate action should be taken based on message content

  @security
  Scenario: Webhook signature verification
    Given I have a valid Twilio webhook request
    But the webhook signature is invalid
    When the webhook is processed
    Then the request should be rejected
    And the response status should be 401
    And no message processing should occur

  @error-handling
  Scenario: Processing webhook with missing required fields
    Given I receive a Twilio webhook missing required fields:
      | MessageSid  |                                  |
      | From        | whatsapp:+15551234567            |
      | Body        | !register Test Restaurant        |
    When the webhook is processed
    Then the response status should be 400
    And an error should be logged
    And no message processing should occur

  @rate-limiting
  Scenario: Rate limiting webhook requests
    Given I am sending webhooks from the same phone number
    When I send 100 webhook requests within 1 minute
    Then some requests should be rate limited
    And rate limit responses should be returned
    And the system should remain stable

  @timeout-handling
  Scenario: Webhook processing timeout
    Given I receive a webhook that requires AI processing
    And the AI service is slow to respond
    When the webhook processing takes longer than 4 seconds
    Then the webhook should still respond within 5 seconds
    And the processing should continue asynchronously
    And the user should receive a follow-up message

  @business-owner-commands
  Scenario Outline: Processing different business owner commands
    Given I am a registered business owner with phone "+15551234567"
    When I send a webhook with message "<command>"
    Then the command should be recognized as "<command_type>"
    And appropriate processing should occur
    And I should receive a relevant response

    Examples:
      | command                                    | command_type    |
      | !add We serve fresh pasta daily            | add_knowledge   |
      | !list                                      | list_knowledge  |
      | !delete kb_test_001                        | delete_knowledge|
      | !help                                      | help            |

  @customer-queries
  Scenario Outline: Processing customer query formats
    Given there is a business with ID "testbiz_123"
    When I send a webhook with message "<query>"
    Then the message should be recognized as a customer query
    And AI processing should be triggered
    And a relevant response should be generated

    Examples:
      | query                                                    |
      | !business testbiz_123 What are your hours?              |
      | !business testbiz_123 Do you deliver?                   |
      | !business testbiz_123 What vegetarian options do you have? |

  @async-processing
  Scenario: Asynchronous message processing for complex queries
    Given I receive a webhook with a complex customer query
    When the query requires extensive AI processing
    Then the webhook should respond immediately with "OK"
    And the processing should continue in the background
    And the customer should receive the AI response via separate message
    And the processing should complete within 30 seconds

  @media-handling
  Scenario: Processing webhooks with media attachments
    Given I receive a webhook with media attachment
    And the sender is a registered business owner
    When the webhook contains a PDF document
    Then the document should be processed for knowledge extraction
    And the webhook should respond with "OK"
    And the business owner should receive confirmation of document processing