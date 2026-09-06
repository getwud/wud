Feature: WUD Personal API Tokens

  Scenario: Admin can create a read-scoped Personal API Token
    Given I set Content-Type header to application/json
    And I set body to {"name":"e2e-read-token","scopes":["read"]}
    When I POST to /api/profile/tokens
    Then response code should be 201
    And response body should be valid json
    And response body path $.token.name should be e2e-read-token
    And response body path $.rawSecret should be ^wud_.*
    And I store the value of body path $.rawSecret as readToken in scenario scope
    And I store the value of body path $.token.id as readTokenId in scenario scope

  Scenario: Read-scoped token can read containers but cannot trigger write actions
    Given I set Content-Type header to application/json
    And I set body to {"name":"e2e-scope-test","scopes":["read"]}
    When I POST to /api/profile/tokens
    Then response code should be 201
    And I store the value of body path $.rawSecret as testToken in scenario scope
    And I store the value of body path $.token.id as testTokenId in scenario scope
    Given I set bearer token to `testToken`
    When I GET /api/containers
    Then response code should be 200
    When I POST to /api/containers/watch
    Then response code should be 403
    And I have basic authentication credentials john and doe
    When I DELETE /api/profile/tokens/`testTokenId`
    Then response code should be 204

  Scenario: Write-scoped token can perform write actions
    Given I set Content-Type header to application/json
    And I set body to {"name":"e2e-write-token","scopes":["write"]}
    When I POST to /api/profile/tokens
    Then response code should be 201
    And I store the value of body path $.rawSecret as writeToken in scenario scope
    And I store the value of body path $.token.id as writeTokenId in scenario scope
    Given I set bearer token to `writeToken`
    When I POST to /api/containers/watch
    Then response code should be 200
    And I have basic authentication credentials john and doe
    When I DELETE /api/profile/tokens/`writeTokenId`
    Then response code should be 204

  Scenario: Revoked token cannot authenticate
    Given I set Content-Type header to application/json
    And I set body to {"name":"e2e-revoked-token","scopes":["read"]}
    When I POST to /api/profile/tokens
    Then response code should be 201
    And I store the value of body path $.rawSecret as revokedToken in scenario scope
    And I store the value of body path $.token.id as revokedTokenId in scenario scope
    When I DELETE /api/profile/tokens/`revokedTokenId`
    Then response code should be 204
    Given I set bearer token to `revokedToken`
    When I GET /api/containers
    Then response code should be 401

  Scenario: Invalid bearer token returns 401
    Given I set bearer token to wud_invalid_token_secret_12345
    When I GET /api/containers
    Then response code should be 401

  Scenario: Unauthenticated request returns 401
    Given I remove authorization header
    When I GET /api/containers
    Then response code should be 401
