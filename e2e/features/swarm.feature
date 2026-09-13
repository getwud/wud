@swarm
Feature: WUD Docker Swarm Watcher

  Scenario: WUD must expose the Swarm watcher via the API
    When I GET /api/watchers
    Then response code should be 200
    And response body should be valid json
    And response body path $[?(@.type=='swarm')].type should be swarm

  Scenario: WUD must expose the Swarm watcher detail
    When I GET /api/watchers/swarm/test
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be swarm.test
    And response body path $.type should be swarm
    And response body path $.name should be test
    And response body path $.configuration.cron should be 0 * * * *
    And response body path $.configuration.watchbydefault should be true

  Scenario: WUD must discover watched Swarm services with stack and labels
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $[?(@.name=='swarm-demo_web')].name should be swarm-demo_web
    And response body path $[?(@.name=='swarm-demo_web')].displayName should be Swarm Nginx Web
    And response body path $[?(@.name=='swarm-demo_web')].stack should be swarm-demo

  Scenario: WUD must discover second service in the stack
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $[?(@.name=='swarm-demo_redis')].name should be swarm-demo_redis
    And response body path $[?(@.name=='swarm-demo_redis')].displayName should be Swarm Redis Cache
    And response body path $[?(@.name=='swarm-demo_redis')].stack should be swarm-demo

  Scenario: WUD must ignore services with watch=false
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 2
