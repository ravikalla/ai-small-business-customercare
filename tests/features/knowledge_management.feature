@knowledge @api
Feature: Knowledge Base Management
  As a business owner
  I want to manage my business knowledge base
  So that customers can get accurate information about my business

  Background:
    Given the SBC system is running
    And I am a registered business owner with business ID "testbiz_1234"
    And my business name is "Test Restaurant"

  @smoke
  Scenario: Adding text knowledge via WhatsApp
    Given I am authenticated as a business owner
    When I send a WhatsApp message "!add We serve authentic Indian cuisine with fresh ingredients daily"
    Then I should receive a confirmation message
    And the knowledge should be stored in the database
    And the knowledge should be vectorized in Pinecone
    And the knowledge should be searchable

  @document-upload
  Scenario: Uploading document knowledge via API
    Given I have a PDF document with menu information
    When I POST to "/api/knowledge/upload" with the document
    And the business ID "testbiz_1234"
    Then the response status should be 200
    And the document should be processed and chunked
    And the chunks should be vectorized
    And the knowledge should be searchable

  @knowledge-retrieval
  Scenario: Listing business knowledge
    Given I have added several knowledge entries:
      | type     | content                                    |
      | text     | We serve authentic Indian cuisine          |
      | text     | Open daily from 11 AM to 10 PM           |
      | document | menu.pdf                                   |
    When I send a WhatsApp message "!list"
    Then I should receive a formatted list of knowledge entries
    And the list should include entry IDs and content previews
    And the list should show statistics about total entries

  @knowledge-deletion
  Scenario: Deleting knowledge entry
    Given I have a knowledge entry with ID "kb_testbiz_1234_001"
    When I send a WhatsApp message "!delete kb_testbiz_1234_001"
    Then I should receive a confirmation message
    And the knowledge entry should be removed from the database
    And the knowledge entry should be removed from Pinecone
    And the entry should no longer appear in knowledge list

  @validation
  Scenario: Adding empty knowledge
    Given I am authenticated as a business owner
    When I send a WhatsApp message "!add"
    Then I should receive an error message "Please provide content. Format: !add [your knowledge text]"
    And no knowledge should be added to the database

  @validation
  Scenario: Deleting non-existent knowledge
    Given I am authenticated as a business owner
    When I send a WhatsApp message "!delete invalid_id"
    Then I should receive an error message about knowledge not found
    And no changes should be made to the database

  @api
  Scenario: Searching knowledge via API
    Given I have knowledge entries about:
      | content                                |
      | We serve vegetarian and vegan options  |
      | Our signature dish is butter chicken   |
      | We offer catering services             |
    When I POST to "/api/knowledge/search" with:
      | businessId | testbiz_1234                    |
      | query      | Do you have vegetarian food?   |
      | topK       | 3                               |
    Then the response status should be 200
    And the response should contain relevant knowledge entries
    And the entries should be ranked by relevance score
    And the response should include metadata

  @integration
  Scenario: Knowledge workflow - Add, List, Search, Delete
    Given I am authenticated as a business owner
    When I add knowledge: "We offer home delivery within 5 miles"
    And I add knowledge: "Minimum order for delivery is $25"
    And I list my knowledge entries
    And I search for "delivery information"
    And I delete the first knowledge entry
    And I list my knowledge entries again
    Then the workflow should complete successfully
    And the final list should contain only the remaining entry