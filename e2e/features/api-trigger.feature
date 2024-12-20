Feature: WUD Trigger API Exposure

  Scenario: WUD must allow to get all Triggers state
    When I GET /api/triggers
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 1
    And response body path $[0].id should be mock.example
    And response body path $[0].type should be mock
    And response body path $[0].name should be example
    And response body path $[0].configuration.threshold should be all
    And response body path $[0].configuration.mode should be simple
    And response body path $[0].configuration.once should be true
    And response body path $[0].configuration.simpletitle should be New \$\{kind\} found for container \$\{name\}
    And response body path $[0].configuration.batchtitle should be \$\{count\} updates available
    And response body path $[0].configuration.mock should be mock

  Scenario: WUD must allow to get specific Triggers state
    When I GET /api/triggers/mock/example
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be mock.example
    And response body path $.type should be mock
    And response body path $.name should be example
    And response body path $.configuration.threshold should be all
    And response body path $.configuration.mode should be simple
    And response body path $.configuration.once should be true
    And response body path $.configuration.simpletitle should be New \$\{kind\} found for container \$\{name\}
    And response body path $.configuration.batchtitle should be \$\{count\} updates available
    And response body path $.configuration.mock should be mock
