Feature: WUD Watcher API Exposure

  Scenario: WUD must allow to get all Watchers state
    When I GET /api/watchers
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 1
    And response body path $[0].id should be docker.local
    And response body path $[0].type should be docker
    And response body path $[0].name should be local
    And response body path $[0].configuration.socket should be /var/run/docker.sock
    And response body path $[0].configuration.cron should be 0 * * * *
    And response body path $[0].configuration.watchbydefault should be false

  Scenario: WUD must allow to get specific Watcher state
    When I GET /api/watchers/docker/local
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be docker.local
    And response body path $.type should be docker
    And response body path $.name should be local
    And response body path $.configuration.socket should be /var/run/docker.sock
    And response body path $.configuration.cron should be 0 * * * *
    And response body path $.configuration.watchbydefault should be false