Feature: Authenticated registry push notifications

  Background:
    Given I set Content-Type header to application/vnd.docker.distribution.events.v2+json

  Scenario: Registry notifications reject a missing receiver secret
    Given I remove authorization header
    And I set body to {"events":[]}
    When I POST to /api/events/registry/gitlab/e2e
    Then response code should be 401

  Scenario: Registry notifications reject an incorrect receiver secret
    Given I set bearer token to incorrect-registry-secret
    And I set body to {"events":[]}
    When I POST to /api/events/registry/gitlab/e2e
    Then response code should be 401

  Scenario: A receiver secret authenticates independently of UI credentials
    Given I set bearer token to registry-e2e-secret
    And I set body to {"events":[]}
    When I POST to /api/events/registry/gitlab/e2e
    Then response code should be 202
    And response body path $.accepted should be 0

  Scenario: Registry notifications reject a malformed envelope
    Given I set bearer token to registry-e2e-secret
    And I set body to {"events":"invalid"}
    When I POST to /api/events/registry/gitlab/e2e
    Then response code should be 400

  Scenario: Deleted manifests never schedule an image check
    Given I set bearer token to registry-e2e-secret
    And I set body to {"events":[{"action":"delete","target":{"repository":"apps/test","tag":"latest"}}]}
    When I POST to /api/events/registry/gitlab/e2e
    Then response code should be 202
    And response body path $.accepted should be 0

  Scenario: Pushes outside the configured registry never schedule an image check
    Given I set bearer token to registry-e2e-secret
    And I set body to {"events":[{"action":"push","target":{"repository":"apps/test","tag":"latest","digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","mediaType":"application/vnd.oci.image.manifest.v1+json","url":"https://other.example.com/v2/apps/test/manifests/latest"}}]}
    When I POST to /api/events/registry/gitlab/e2e
    Then response code should be 202
    And response body path $.accepted should be 0

  Scenario: Unconfigured registry receivers remain unavailable
    Given I set bearer token to registry-e2e-secret
    And I set body to {"events":[]}
    When I POST to /api/events/registry/gitlab/unconfigured
    Then response code should be 404
