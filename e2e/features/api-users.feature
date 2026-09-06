Feature: WUD User Management API

  Scenario: Admin can list all users
    When I GET /api/users
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array
    And response body path $[0].username should be john
    And response body path $[0].role should be admin

  Scenario: Admin can create, update, and delete a local user
    Given I set Content-Type header to application/json
    And I set body to {"username":"alice","password":"alicepassword123","role":"ro"}
    When I POST to /api/users
    Then response code should be 201
    And response body should be valid json
    And response body path $.username should be alice
    And response body path $.role should be ro
    And I store the value of body path $.id as aliceId in scenario scope
    Given I set body to {"role":"rw"}
    When I PUT /api/users/`aliceId`
    Then response code should be 200
    And response body path $.role should be rw
    When I DELETE /api/users/`aliceId`
    Then response code should be 204

  Scenario: Non-admin user cannot access user management
    Given I set Content-Type header to application/json
    And I set body to {"username":"bob","password":"bobpassword123","role":"ro"}
    When I POST to /api/users
    Then response code should be 201
    And I store the value of body path $.id as bobId in scenario scope
    Given I have basic authentication credentials bob and bobpassword123
    When I GET /api/users
    Then response code should be 403
    When I POST to /api/users
    Then response code should be 403
    Given I have basic authentication credentials john and doe
    When I DELETE /api/users/`bobId`
    Then response code should be 204
