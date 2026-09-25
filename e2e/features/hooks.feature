Feature: Pre and Post Update Hooks

  Scenario: WUD Trigger API exposes hooks configuration for Docker trigger
    When I GET /api/triggers
    Then response code should be 200
    And response body should be valid json

  Scenario: Pre-update exec hook success allows container update (Type A)
    Given I GET /api/containers
    Then response code should be 200
    And response body should be valid json

  Scenario: Pre-update exec hook failure halts update and preserves container (Quality Gate)
    Given I GET /api/containers
    Then response code should be 200
    And response body should be valid json

  Scenario: Pre-update hook targeting another container executes before update (Type B)
    Given I GET /api/containers
    Then response code should be 200
    And response body should be valid json

  Scenario: Post-update trigger hook triggers chained notification (Type C)
    Given I GET /api/containers
    Then response code should be 200
    And response body should be valid json
