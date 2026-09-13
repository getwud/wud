@nomad
Feature: WUD Nomad Watcher

  Scenario: WUD must expose the Nomad watcher via the API
    When I GET /api/watchers
    Then response code should be 200
    And response body should be valid json
    And response body path $[?(@.type=='nomad')].type should be nomad

  Scenario: WUD must expose the Nomad watcher detail
    When I GET /api/watchers/nomad/test
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be nomad.test
    And response body path $.type should be nomad
    And response body path $.name should be test
    And response body path $.configuration.cron should be 0 * * * *
    And response body path $.configuration.watchbydefault should be true

  Scenario: WUD must discover watched Nomad service tasks
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $[?(@.name=='default_web-service_frontend_nginx')].name should be default_web-service_frontend_nginx
    And response body path $[?(@.name=='default_web-service_frontend_nginx')].displayName should be Nomad Nginx
    And response body path $[?(@.name=='default_web-service_frontend_nginx')].stack should be nomad-demo

  Scenario: WUD must discover multi-task service containers
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $[?(@.name=='default_multi-app_cache_redis')].name should be default_multi-app_cache_redis
    And response body path $[?(@.name=='default_multi-app_cache_redis')].displayName should be Nomad Redis

  Scenario: WUD must ignore tasks with wud.watch=false
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 2
