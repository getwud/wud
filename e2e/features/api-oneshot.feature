Feature: WUD one-shot headless mode

  # The one-shot CLI (WUD_RUN_MODE=oneshot) runs a single scan inside the
  # running e2e WUD container so it reuses the real Docker socket and the
  # local fixtures (hub_nginx_latest is an intentionally outdated tag).
  # stdout must carry the JSON contract, logs must go to stderr.

  Scenario: WUD one-shot watch outputs API-compatible JSON and exits 0
    When I run the WUD one-shot watch command
    Then the one-shot exit code should be 0
    And the one-shot stdout should be a valid JSON array
    And the one-shot stdout should contain the container hub_nginx_latest with an available update

  Scenario: WUD one-shot watch exits 1 with --fail-on-update when updates are available
    When I run the WUD one-shot watch command with --fail-on-update
    Then the one-shot exit code should be 1
    And the one-shot stdout should be a valid JSON array
    And the one-shot stdout should contain the container hub_nginx_latest with an available update

  Scenario: WUD one-shot triggers are invoked when WUD_TRIGGER_* is configured
    When I run the WUD one-shot watch command
    Then the one-shot stdout should be a valid JSON array
    And the one-shot stderr should contain the mock trigger invocation

  Scenario: WUD one-shot version prints the WUD version
    When I run the WUD one-shot version command
    Then the one-shot exit code should be 0
    And the one-shot stdout should match the WUD version pattern

  Scenario: WUD one-shot help prints the usage and exits 0
    When I run the WUD one-shot --help command
    Then the one-shot exit code should be 0