Feature: Docker rollback E2E isolation

  # Automatic rollback is opt-in per container (`wud.rollback.enable=true`).
  # The shared e2e run must never enable it globally: a gated update keeps the
  # previous container as `<name>-wud-old-<ts>`, which changes the container
  # count and image state every other scenario depends on.
  Scenario: The rollback feature must not archive the shared e2e fixtures
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 9
    And no container should be archived under a temporary rollback name
