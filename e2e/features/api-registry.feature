Feature: WUD Registry API Exposure

  Scenario: WUD must allow to get all Registries
    When I GET /api/registries
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 39

    And response body path $[0].id should be acr.private
    And response body path $[0].type should be acr
    And response body path $[0].name should be private
    And response body path $[0].configuration.clientid should be 89dcf54b-ef99-4dc1-bebb-8e0eacafdac8
    And response body path $[0].configuration.clientsecret should be .\*.*.

    And response body path $[1].id should be alibaba.private
    And response body path $[1].type should be alibaba
    And response body path $[1].name should be private
    And response body path $[1].configuration.password should be .\*.*.

    And response body path $[2].id should be alibaba.public
    And response body path $[2].type should be alibaba
    And response body path $[2].name should be public

    And response body path $[3].id should be codeberg.public
    And response body path $[3].type should be codeberg
    And response body path $[3].name should be public
    And response body path $[3].configuration.url should be https://codeberg.org

    And response body path $[4].id should be dhi.private
    And response body path $[4].type should be dhi
    And response body path $[4].name should be private
    And response body path $[4].configuration.token should be .\*.*.

    And response body path $[5].id should be docr.private
    And response body path $[5].type should be docr
    And response body path $[5].name should be private
    And response body path $[5].configuration.token should be .\*.*.

    And response body path $[6].id should be docr.public
    And response body path $[6].type should be docr
    And response body path $[6].name should be public

    And response body path $[7].id should be ecr.private
    And response body path $[7].type should be ecr
    And response body path $[7].name should be private
    And response body path $[7].configuration.region should be eu-west-1
    And response body path $[7].configuration.accesskeyid should be .\*.*.
    And response body path $[7].configuration.secretaccesskey should be .\*.*.

    And response body path $[8].id should be ecr.public
    And response body path $[8].type should be ecr
    And response body path $[8].name should be public

    And response body path $[9].id should be elastic.public
    And response body path $[9].type should be elastic
    And response body path $[9].name should be public
    And response body path $[9].configuration.url should be https://docker.elastic.co

    And response body path $[10].id should be forgejo.public
    And response body path $[10].type should be forgejo
    And response body path $[10].name should be public
    And response body path $[10].configuration.url should be https://code.forgejo.org

    And response body path $[11].id should be gcr.private
    And response body path $[11].type should be gcr
    And response body path $[11].name should be private
    And response body path $[11].configuration.clientemail should be gcr@wud-test.iam.gserviceaccount.com
    And response body path $[11].configuration.privatekey should be .\*.*.

    And response body path $[12].id should be gcr.public
    And response body path $[12].type should be gcr
    And response body path $[12].name should be public

    And response body path $[13].id should be ghcr.private
    And response body path $[13].type should be ghcr
    And response body path $[13].name should be private

    And response body path $[14].id should be ghcr.public
    And response body path $[14].type should be ghcr
    And response body path $[14].name should be public

    And response body path $[15].id should be gitlab.private
    And response body path $[15].type should be gitlab
    And response body path $[15].name should be private

    And response body path $[16].id should be gitlab.public
    And response body path $[16].type should be gitlab
    And response body path $[16].name should be public

    And response body path $[17].id should be harbor.private
    And response body path $[17].type should be harbor
    And response body path $[17].name should be private
    And response body path $[17].configuration.password should be .\*.*.

    And response body path $[18].id should be harbor.public
    And response body path $[18].type should be harbor
    And response body path $[18].name should be public

    And response body path $[19].id should be hub.public
    And response body path $[19].type should be hub
    And response body path $[19].name should be public

    And response body path $[20].id should be icr.private
    And response body path $[20].type should be icr
    And response body path $[20].name should be private
    And response body path $[20].configuration.apikey should be .\*.*.

    And response body path $[21].id should be icr.public
    And response body path $[21].type should be icr
    And response body path $[21].name should be public

    And response body path $[22].id should be jfrog.private
    And response body path $[22].type should be jfrog
    And response body path $[22].name should be private
    And response body path $[22].configuration.password should be .\*.*.

    And response body path $[23].id should be jfrog.public
    And response body path $[23].type should be jfrog
    And response body path $[23].name should be public

    And response body path $[24].id should be linode.private
    And response body path $[24].type should be linode
    And response body path $[24].name should be private
    And response body path $[24].configuration.password should be .\*.*.

    And response body path $[25].id should be linode.public
    And response body path $[25].type should be linode
    And response body path $[25].name should be public

    And response body path $[26].id should be lscr.private
    And response body path $[26].type should be lscr
    And response body path $[26].name should be private

    And response body path $[27].id should be lscr.public
    And response body path $[27].type should be lscr
    And response body path $[27].name should be public

    And response body path $[28].id should be nexus.private
    And response body path $[28].type should be nexus
    And response body path $[28].name should be private
    And response body path $[28].configuration.password should be .\*.*.

    And response body path $[29].id should be nexus.public
    And response body path $[29].type should be nexus
    And response body path $[29].name should be public

    And response body path $[30].id should be ocir.private
    And response body path $[30].type should be ocir
    And response body path $[30].name should be private
    And response body path $[30].configuration.password should be .\*.*.

    And response body path $[31].id should be ocir.public
    And response body path $[31].type should be ocir
    And response body path $[31].name should be public

    And response body path $[32].id should be proget.private
    And response body path $[32].type should be proget
    And response body path $[32].name should be private
    And response body path $[32].configuration.password should be .\*.*.

    And response body path $[33].id should be proget.public
    And response body path $[33].type should be proget
    And response body path $[33].name should be public

    And response body path $[34].id should be quay.public
    And response body path $[34].type should be quay
    And response body path $[34].name should be public

    And response body path $[35].id should be scaleway.private
    And response body path $[35].type should be scaleway
    And response body path $[35].name should be private
    And response body path $[35].configuration.secretkey should be .\*.*.

    And response body path $[36].id should be scaleway.public
    And response body path $[36].type should be scaleway
    And response body path $[36].name should be public

    And response body path $[37].id should be trueforge.private
    And response body path $[37].type should be trueforge
    And response body path $[37].name should be private

    And response body path $[38].id should be trueforge.public
    And response body path $[38].type should be trueforge
    And response body path $[38].name should be public

  Scenario: WUD must allow to get specific Registry state
    When I GET /api/registries/acr/private
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be acr.private
    And response body path $.type should be acr
    And response body path $.name should be private
    And response body path $.configuration.clientid should be 89dcf54b-ef99-4dc1-bebb-8e0eacafdac8
    And response body path $.configuration.clientsecret should be .\*.*.

  Scenario Outline: WUD must allow to get specific Registry state for new registries
    When I GET /api/registries/<type>/<name>
    Then response code should be 200
    And response body should be valid json
    And response body path $.id should be <type>.<name>
    And response body path $.type should be <type>
    And response body path $.name should be <name>
    Examples:
      | type     | name    |
      | alibaba  | private |
      | dhi      | private |
      | docr     | private |
      | elastic  | public  |
      | harbor   | private |
      | icr      | private |
      | jfrog    | private |
      | linode   | private |
      | nexus    | private |
      | ocir     | private |
      | proget   | private |
      | scaleway | private |