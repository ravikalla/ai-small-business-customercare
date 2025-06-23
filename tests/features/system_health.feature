@system @health @api
Feature: System Health and Monitoring
  As a system administrator
  I want to monitor the health of the SBC system
  So that I can ensure reliable service for all users

  Background:
    Given the SBC system is running

  @smoke
  Scenario: Health check endpoint responds correctly
    When I GET "/health"
    Then the response status should be 200
    And the response should contain "status": "ok"
    And the response should include system uptime
    And the response should include database status
    And the response should include external service status

  @database
  Scenario: Database connectivity check
    When I check the database health
    Then the database should be connected
    And the connection should be healthy
    And the response time should be under 1 second
    And the database URL should be properly configured

  @external-services
  Scenario: External service health checks
    When I check external service connectivity
    Then Supabase should be reachable and healthy
    And Pinecone should be reachable and healthy
    And OpenAI API should be reachable
    And Twilio API should be reachable
    And all services should respond within acceptable timeouts

  @metrics
  Scenario: System metrics endpoint
    When I GET "/api/metrics"
    Then the response status should be 200
    And the response should include application metrics:
      | metric     | type    |
      | uptime     | number  |
      | memory     | string  |
      | cpu        | string  |
      | status     | string  |
      | restarts   | number  |

  @performance
  Scenario: System performance under load
    Given the system is handling normal traffic
    When I simulate 100 concurrent health check requests
    Then all requests should complete successfully
    And the average response time should be under 100ms
    And the system should remain stable
    And no errors should be logged

  @caching
  Scenario: Cache system health
    When I GET "/api/cache/stats"
    Then the response status should be 200
    And the response should include cache statistics:
      | metric     | type    |
      | hitRate    | string  |
      | hits       | number  |
      | misses     | number  |
      | cacheSize  | object  |

  @logging
  Scenario: Log system functionality
    When I GET "/api/logs?lines=10"
    Then the response status should be 200
    And the response should contain recent log entries
    And logs should be properly formatted
    And log levels should be correctly set

  @error-handling
  Scenario: Graceful error handling for service failures
    Given external services may be temporarily unavailable
    When Pinecone service is unreachable
    And I make requests to knowledge endpoints
    Then the system should respond with appropriate error messages
    And the system should not crash
    And errors should be properly logged
    And retry mechanisms should be triggered

  @backup
  Scenario: Backup system health
    When I POST to "/api/backup/create" with type "health-check"
    Then the response status should be 200
    And a backup should be created successfully
    And the backup should include all necessary data
    And backup metadata should be stored

  @monitoring
  Scenario: System monitoring and alerting
    Given monitoring systems are configured
    When system metrics exceed thresholds
    Then appropriate alerts should be triggered
    And monitoring data should be collected
    And system health should be tracked over time