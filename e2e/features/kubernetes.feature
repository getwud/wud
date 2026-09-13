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
    And response body path $.configuration.namespace should be default
    And response body path $.configuration.cron should be 0 * * * *
    And response body path $.configuration.watchbydefault should be true

  Scenario: WUD must discover watched Deployments
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $[?(@.name=='default_deployment_test-deployment_app')].name should be default_deployment_test-deployment_app

  Scenario: WUD must assign namespace as stack by default
    When I GET /api/containers
    Then response code should be 200
    And response body path $[?(@.name=='default_deployment_test-deployment_app')].stack should be default

  Scenario: WUD must discover watched StatefulSets
    When I GET /api/containers
    Then response code should be 200
    And response body path $[?(@.name=='default_statefulset_test-statefulset_stateful-app')].name should be default_statefulset_test-statefulset_stateful-app

  Scenario: WUD must discover watched DaemonSets
    When I GET /api/containers
    Then response code should be 200
    And response body path $[?(@.name=='default_daemonset_test-daemonset_daemon-app')].name should be default_daemonset_test-daemonset_daemon-app

  Scenario: WUD must discover watched CronJobs
    When I GET /api/containers
    Then response code should be 200
    And response body path $[?(@.name=='default_cronjob_test-cronjob_cron-app')].name should be default_cronjob_test-cronjob_cron-app

