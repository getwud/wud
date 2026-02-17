Feature: WUD Registry API Exposure

  Scenario: WUD must allow to get all Registries
    When I GET /api/registries
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 10

    And response body path $[0].id should be acr.private
    And response body path $[0].type should be acr
    And response body path $[0].name should be private
    And response body path $[0].configuration.clientid should be 89dcf54b-ef99-4dc1-bebb-8e0eacafdac8
    And response body path $[0].configuration.clientsecret should be .\*.*.


    And response body path $[1].id should be codeberg.public
    And response body path $[1].type should be codeberg
    And response body path $[1].name should be public
    And response body path $[1].configuration.url should be https://codeberg.org

    And response body path $[2].id should be ecr.private
    And response body path $[2].type should be ecr
    And response body path $[2].name should be private
    And response body path $[2].configuration.region should be eu-west-1
    And response body path $[2].configuration.accesskeyid should be .\*.*.
    And response body path $[2].configuration.secretaccesskey should be .\*.*.

    And response body path $[3].id should be gcr.private
    And response body path $[3].type should be gcr
    And response body path $[3].name should be private
    And response body path $[3].configuration.clientemail should be gcr@wud-test.iam.gserviceaccount.com
    And response body path $[3].configuration.privatekey should be .\*.*.

    And response body path $[4].id should be ghcr.private
    And response body path $[4].type should be ghcr
    And response body path $[4].name should be private

    And response body path $[5].id should be gitlab.private
    And response body path $[5].type should be gitlab
    And response body path $[5].name should be private

    And response body path $[6].id should be hub.public
    And response body path $[6].type should be hub
    And response body path $[6].name should be public

    And response body path $[7].id should be lscr.private
    And response body path $[7].type should be lscr
    And response body path $[7].name should be private

    And response body path $[8].id should be quay.public
    And response body path $[8].type should be quay
    And response body path $[8].name should be public

    And response body path $[9].id should be trueforge.private
    And response body path $[9].type should be trueforge
    And response body path $[9].name should be private

  Scenario: WUD must allow to get specific Registry state
    When I GET /api/registries/acr/private
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be acr.private
    And response body path $.type should be acr
    And response body path $.name should be private
    And response body path $.configuration.clientid should be 89dcf54b-ef99-4dc1-bebb-8e0eacafdac8
    And response body path $.configuration.clientsecret should be .\*.*.