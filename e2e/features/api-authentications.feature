Feature: WUD Authentications API Exposure

  Scenario: WUD must allow to get all Authentications state
    When I GET /api/authentications
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 2
    And response body path $[0].id should be basic.john
    And response body path $[0].type should be basic
    And response body path $[0].name should be john
    And response body path $[0].configuration.user should be john
    And response body path $[0].configuration.hash should be .\*.*.
    And response body path $[1].id should be oidc.mock
    And response body path $[1].type should be oidc
    And response body path $[1].name should be mock
    And response body path $[1].configuration.clientid should be t\*.*t
    And response body path $[1].configuration.clientsecret should be t\*.*t

  Scenario: WUD must allow to get specific Basic Authentication state
    When I GET /api/authentications/basic/john
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be basic.john
    And response body path $.type should be basic
    And response body path $.name should be john
    And response body path $.configuration.user should be john
    And response body path $.configuration.hash should be .\*.*.

  Scenario: WUD must allow to get specific OIDC Authentication state
    When I GET /api/authentications/oidc/mock
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be oidc.mock
    And response body path $.type should be oidc
    And response body path $.name should be mock
    And response body path $.configuration.clientid should be t\*.*t
    And response body path $.configuration.clientsecret should be t\*.*t
