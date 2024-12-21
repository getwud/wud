Feature: WUD Authentications API Exposure

  Scenario: WUD must allow to get all Authentications state
    When I GET /api/authentications
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 1
    And response body path $[0].id should be basic.john
    And response body path $[0].type should be basic
    And response body path $[0].name should be john
    And response body path $[0].configuration.user should be john
    And response body path $[0].configuration.hash should be .\*.*.

  Scenario: WUD must allow to get specific Authentication state
    When I GET /api/authentications/basic/john
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be basic.john
    And response body path $.type should be basic
    And response body path $.name should be john
    And response body path $.configuration.user should be john
    And response body path $.configuration.hash should be .\*.*.
