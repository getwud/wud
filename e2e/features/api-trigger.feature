Feature: WUD Trigger API Exposure

  Scenario: WUD must allow to get all Triggers state
    When I GET /api/triggers
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 3

  Scenario: WUD must expose the Docker trigger rollback configuration
    When I GET /api/triggers/docker/e2e
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be docker.e2e
    And response body path $.type should be docker
    And response body path $.name should be e2e
    And response body path $.configuration.threshold should be all
    And response body path $.configuration.rollback should be true
    And response body path $.configuration.rollbackwindow should be 300000
    And response body path $.configuration.rollbackinterval should be 10000
    And response body path $.configuration.rollbackgrace should be 10000

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
    And response body path $.configuration.simpletitle should be New \$\{container.updateKind.kind\} found for container \$\{container.name\}
    And response body path $.configuration.batchtitle should be \$\{containers.length\} updates available
    And response body path $.configuration.mock should be mock

  Scenario: WUD must allow to get MQTT trigger state
    When I GET /api/triggers/mqtt/e2e
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be mqtt.e2e
    And response body path $.type should be mqtt
    And response body path $.name should be e2e
    And response body path $.configuration.url should be mqtt://mosquitto:1883
    And response body path $.configuration.topic should be wud/container
    And response body path $.configuration.hass.enabled should be true
    And response body path $.configuration.hass.discovery should be true
