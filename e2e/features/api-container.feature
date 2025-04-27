Feature: WUD Container API Exposure
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 19

  Scenario Outline: WUD must allow to get all containers
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $[<index>].name should be <containerName>
    And response body path $[<index>].status should be running
    And response body path $[<index>].image.registry.name should be <registry>
    And response body path $[<index>].image.registry.url should be <registryUrl>
    And response body path $[<index>].image.name should be <imageName>
    And response body path $[<index>].image.tag.value should be <tag>
    And response body path $[<index>].result.tag should be <resultTag>
    And response body path $[<index>].updateAvailable should be <updateAvailable>
    Examples:
      | index | registry       | containerName            | registryUrl                                             | imageName                           | tag                | resultTag          | updateAvailable |
      | 0     | ecr.private    | ecr_sub_sub_test         | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | sub/sub/test                        | 1.0.0              | 2.0.0              | true            |
      | 1     | ecr.private    | ecr_sub_test             | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | sub/test                            | 1.0.0              | 2.0.0              | true            |
      | 2     | ecr.private    | ecr_test                 | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | test                                | 1.0.0              | 2.0.0              | true            |
      | 3     | ghcr.private   | ghcr_radarr              | https://ghcr.io/v2                                      | linuxserver/radarr                  | 5.14.0.9383-ls245  | 5.22.4.9896-ls272  | true            |
      | 4     | gitlab.private | gitlab_test              | https://registry.gitlab.com/v2                          | manfred-martin/docker-registry-test | 1.0.0              | 2.0.0              | true            |
      | 5     | hub.public     | hub_homeassistant_202161 | https://registry-1.docker.io/v2                         | homeassistant/home-assistant        | 2021.6.1           |2025.4.4           | true            |
      | 6     | hub.public     | hub_homeassistant_latest | https://registry-1.docker.io/v2                         | homeassistant/home-assistant        | latest             | latest             | false           |
      | 7     | hub.public     | hub_nginx_120            | https://registry-1.docker.io/v2                         | library/nginx                       | 1.20-alpine        | 1.28-alpine        | true            |
      | 8     | hub.public     | hub_nginx_latest         | https://registry-1.docker.io/v2                         | library/nginx                       | latest             | latest             | true            |
      | 9     | hub.public     | hub_omnidb_latest        | https://registry-1.docker.io/v2                         | omnidbteam/omnidb                   | latest             | latest             | true            |
      | 10    | hub.public     | hub_pihole_57            | https://registry-1.docker.io/v2                         | pihole/pihole                       | v5.7               | v5.8.1             | true            |
      | 11    | hub.public     | hub_pihole_latest        | https://registry-1.docker.io/v2                         | pihole/pihole                       | latest             | latest             | false           |
      | 12    | hub.public     | hub_pyload_latest        | https://registry-1.docker.io/v2                         | writl/pyload                        | latest             | latest             | false           |
      | 13    | hub.public     | hub_traefik_245          | https://registry-1.docker.io/v2                         | library/traefik                     | 2.4.5              | 3.3.6              | true            |
      | 14    | hub.public     | hub_traefik_latest       | https://registry-1.docker.io/v2                         | library/traefik                     | latest             | latest             | false           |
      | 15    | hub.public     | hub_vaultwarden_1222     | https://registry-1.docker.io/v2                         | vaultwarden/server                  | 1.33.2-alpine      | 1.33.2-alpine      | false           |
      | 16    | hub.public     | hub_vaultwarden_latest   | https://registry-1.docker.io/v2                         | vaultwarden/server                  | latest             | latest             | false           |
      | 17    | hub.public     | hub_youtubedb_latest     | https://registry-1.docker.io/v2                         | jeeaaasustest/youtube-dl            | latest             | latest             | false           |
      | 18    | lscr.private   | lscr_radarr              | https://lscr.io/v2                                      | linuxserver/radarr                  | 5.14.0.9383-ls245  | 5.22.4.9896-ls272  | true            |
      | 19    | quay.public    | quay_prometheus          | https://quay.io/v2                                      | prometheus/prometheus               | v2.52.0            | v3.3.0             | true            |

  Scenario: WUD must allow to get a container with semver
    Given I GET /api/containers
    And I store the value of body path $[0].id as containerId in scenario scope
    When I GET /api/containers/`containerId`
    Then response code should be 200
    And response body should be valid json
    And response body path $.watcher should be local
    And response body path $.name should be ecr_sub_sub_test
    And response body path $.image.registry.name should be ecr.private
    And response body path $.image.registry.url should be https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2
    And response body path $.image.name should be sub/sub/test
    And response body path $.image.tag.value should be 1.0.0
    And response body path $.image.architecture should be amd64
    And response body path $.image.os should be linux
    And response body path $.image.tag.semver should be true
    And response body path $.result.tag should be 2.0.0
    And response body path $.updateAvailable should be true

  Scenario: WUD must allow to get a container with digest
    Given I GET /api/containers
    And I store the value of body path $[8].id as containerId in scenario scope
    When I GET /api/containers/`containerId`
    Then response code should be 200
    And response body should be valid json
    And response body path $.watcher should be local
    And response body path $.name should be hub_nginx_latest
    And response body path $.image.registry.name should be hub.public
    And response body path $.image.registry.url should be https://registry-1.docker.io/v2
    And response body path $.image.name should be library/nginx
    And response body path $.image.tag.value should be latest
    And response body path $.image.architecture should be amd64
    And response body path $.image.os should be linux
    And response body path $.image.tag.value should be latest
    And response body path $.image.tag.semver should be false
    And response body path $.image.digest.value should be sha256:f94d6dd9b5761f33a21bb92848a1f70ea11a1c15f3a142c19a44ea3a4c545a4d
    And response body path $.result.tag should be latest
    And response body path $.result.digest should be sha256:69747b174b56bc170ca99a6d8e7a80e77a020c9702dda7e44a2154066a7a4dbe
    And response body path $.updateAvailable should be true

  Scenario: WUD must allow to get a container with its link
    Given I GET /api/containers
    And I store the value of body path $[5].id as containerId in scenario scope
    When I GET /api/containers/`containerId`
    Then response code should be 200
    And response body should be valid json
    And response body path $.link should be https://github.com/home-assistant/core/releases/tag/2021.6.1
    And response body path $.result.link should be https://github.com/home-assistant/core/releases/tag/2025.4.4

  Scenario: WUD must allow to trigger a watch on a container
    Given I GET /api/containers
    And I store the value of body path $[0].id as containerId in scenario scope
    When I POST to /api/containers/`containerId`/watch
    Then response code should be 200
    And response body should be valid json
    And response body path $.result.tag should be 2.0.0