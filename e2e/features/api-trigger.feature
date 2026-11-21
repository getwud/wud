Feature: WUD Trigger API Exposure

  Scenario: WUD must allow to get all Triggers state
    When I GET /api/triggers
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 3
    And response body path $[0].id should be docker.e2e
    And response body path $[0].type should be docker
    And response body path $[0].name should be e2e
    And response body path $[0].supportsSimulation should be false
    And response body path $[1].id should be mock.example
    And response body path $[1].type should be mock
    And response body path $[1].name should be example
    And response body path $[1].supportsSimulation should be true
    And response body path $[1].configuration.threshold should be all
    And response body path $[1].configuration.mode should be simple
    And response body path $[1].configuration.once should be true
    And response body path $[1].configuration.simpletitle should be New \$\{container.updateKind.kind\} found for container \$\{container.name\}
    And response body path $[1].configuration.batchtitle should be \$\{containers.length\} updates available
    And response body path $[1].configuration.mock should be mock
    And response body path $[2].id should be mqtt.e2e
    And response body path $[2].type should be mqtt
    And response body path $[2].name should be e2e
    And response body path $[2].supportsSimulation should be true

  Scenario: WUD must allow to get specific Triggers state
    When I GET /api/triggers/mock/example
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be mock.example
    And response body path $.type should be mock
    And response body path $.name should be example
    And response body path $.supportsSimulation should be true
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
    And response body path $.supportsSimulation should be true
    And response body path $.configuration.url should be mqtt://mosquitto:1883
    And response body path $.configuration.topic should be wud/container
    And response body path $.configuration.hass.enabled should be true
    And response body path $.configuration.hass.discovery should be true

  Scenario: WUD must reject test simulation on non-notification action triggers with 403
    Given I set Content-Type header to application/json
    And I set body to {"name":"container_test","watcher":"local"}
    When I POST to /api/triggers/docker/e2e
    Then response code should be 403
    And response body should be valid json
    And response body path $.error should be Forbidden

  Scenario: WUD must reject invalid simulation payload with 400
    Given I set Content-Type header to application/json
    And I set body to {"name":"bad/container#topic","result":{"link":"javascript:alert(1)"}}
    When I POST to /api/triggers/mock/example
    Then response code should be 400
    And response body should be valid json
    And response body path $.error should be Bad Request

  Scenario: WUD must allow test simulation on notification triggers with valid payload
    Given I set Content-Type header to application/json
    And I set body to {"id":"123456789","name":"container_test","watcher":"local","updateKind":{"kind":"tag","localValue":"1.0.0","remoteValue":"2.0.0","semverDiff":"major"},"result":{"link":"https://example.com/releases/2.0.0"}}
    When I POST to /api/triggers/mock/example
    Then response code should be 200
    And response body should be valid json
