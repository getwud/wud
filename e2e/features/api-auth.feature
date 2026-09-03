Feature: WUD auth API Exposure

  Scenario: WUD must allow to get all available strategies
    When I GET /auth/strategies
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 2
    And response body path $[0].type should be basic
    And response body path $[0].name should be Login
    And response body path $[1].type should be oidc
    And response body path $[1].name should be mock

  Scenario: WUD must allow to get OIDC redirection url
    When I GET /auth/oidc/mock/redirect
    Then response code should be 200
    And response body should be valid json
    And response body path $.url should be ^http://.*/authorize\?.*

  Scenario: WUD must allow to login with basic auth
    When I POST to /auth/login
    Then response code should be 200
    And response body should be valid json
    And response body path $.username should be john

  Scenario: WUD must allow to get current user
    When I GET /auth/user
    Then response code should be 200
    And response body should be valid json
    And response body path $.username should be john

  Scenario: WUD must allow to logout
    When I POST to /auth/logout
    Then response code should be 200
    And response body should be valid json
