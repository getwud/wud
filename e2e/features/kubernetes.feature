@kubernetes
Feature: WUD Kubernetes Watcher

  # ─── NOTE ON SKIP TAG ────────────────────────────────────────────────────────
  # These scenarios require a running Kubernetes cluster (kind or k3s).
  # They are tagged @skip to be excluded from standard CI pipelines.
  # To run locally:
  #   1. Start kind: kind create cluster --name wud-test
  #   2. Apply test fixtures: kubectl apply -f e2e/fixtures/kubernetes/
  #   3. Deploy WUD with KUBERNETES watcher configured
  #   4. Run: npm test -- --tags "@kubernetes and not @skip"
  # ─────────────────────────────────────────────────────────────────────────────

  Scenario: WUD must expose the Kubernetes watcher via the API
    When I GET /api/watchers
    Then response code should be 200
    And response body should be valid json
    And response body path $[?(@.type=='kubernetes')].type should be kubernetes

  Scenario: WUD must expose the Kubernetes watcher detail
    When I GET /api/watchers/kubernetes/mycluster
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be kubernetes.mycluster
    And response body path $.type should be kubernetes
    And response body path $.name should be mycluster
    And response body path $.configuration.namespace should be .*
    And response body path $.configuration.cron should be 0 * * * *
    And response body path $.configuration.watchbydefault should be true

  Scenario: WUD must discover watched Deployments
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $[?(@.watcher=='mycluster')][0].image.tag.value should be .*

  Scenario: WUD must assign namespace as stack by default
    When I GET /api/containers
    Then response code should be 200
    And response body path $[?(@.watcher=='mycluster')][0].stack should not be null

  Scenario: WUD must discover watched StatefulSets
    When I GET /api/containers
    Then response code should be 200
    And response body path $[?(@.name=~'.*_statefulset_.*')][0].name should be .*_statefulset_.*

  Scenario: WUD must discover watched DaemonSets
    When I GET /api/containers
    Then response code should be 200
    And response body path $[?(@.name=~'.*_daemonset_.*')][0].name should be .*_daemonset_.*

  Scenario: WUD must discover watched CronJobs
    When I GET /api/containers
    Then response code should be 200
    And response body path $[?(@.name=~'.*_cronjob_.*')][0].name should be .*_cronjob_.*

