Feature: WUD Container API Exposure

  Scenario: WUD must return correct container count
    When I GET /api/containers
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 9

  # Test one representative container per registry type + update pattern
  Scenario Outline: WUD must handle different registry types and update patterns
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
      | index | registry       | containerName            | registryUrl                                             | imageName                    | tag               | resultTag         | updateAvailable | testCase                     |
      | 1     | ghcr.private   | ghcr_radarr              | https://ghcr.io/v2                                      | linuxserver/radarr           | 5.14.0.9383-ls245 | 7.0.3.10918-ls328 | true            | GHCR complex semver update   |
      | 3     | hub.public     | hub_alpine_latest        | https://registry-1.docker.io/v2                         | library/alpine               | latest            | latest            | false           | Hub latest tag no update     |
      | 4     | hub.public     | hub_homeassistant_202161 | https://registry-1.docker.io/v2                         | homeassistant/home-assistant | 2021.6.1          | 2026.11.2         | true            | Hub date-based versioning    |
      | 5     | hub.public     | hub_nginx_latest         | https://registry-1.docker.io/v2                         | library/nginx                | latest            | latest            | true            | Hub latest tag digest update |
      | 6     | lscr.private   | lscr_radarr              | https://lscr.io/v2                                      | linuxserver/radarr           | 5.14.0.9383-ls245 | 7.0.3.10918-ls328 | true            | LSCR complex semver update   |
      | 7     | quay.public    | quay_prometheus          | https://quay.io/v2                                      | prometheus/prometheus        | v2.52.0           | v3.16.0           | true            | Quay semver major update     |

    @ci-only
    Examples:
      | index | registry       | containerName            | registryUrl                                             | imageName                    | tag               | resultTag         | updateAvailable | testCase                     |
      | 2     | gitlab.private | gitlab_test              | https://registry.gitlab.com/v2                          | gitlab-org/gitlab-runner     | v16.0.0           | v16.1.0           | true            | GitLab semver update         |

  # Test detailed container inspection (semver)
  @ci-only
  Scenario: WUD must provide detailed container information for semver containers
    Given I GET /api/containers
    And I store the value of body path $[2].id as containerId in scenario scope
    When I GET /api/containers/`containerId`
    Then response code should be 200
    And response body should be valid json
    And response body path $.watcher should be local
    And response body path $.name should be gitlab_test
    And response body path $.image.registry.name should be gitlab.private
    And response body path $.image.tag.semver should be true
    And response body path $.result.tag should be v16.1.0
    And response body path $.updateAvailable should be true

  # Test detailed container inspection (digest)
  Scenario: WUD must provide detailed container information for digest-based containers
    Given I GET /api/containers
    And I store the value of body path $[5].id as containerId in scenario scope
    When I GET /api/containers/`containerId`
    Then response code should be 200
    And response body should be valid json
    And response body path $.watcher should be local
    And response body path $.name should be hub_nginx_latest
    And response body path $.image.tag.semver should be false
    And response body path $.image.digest.value should be sha256:4aacdcf186934dcb02f642579314075910f1855590fd3039d8fa4c9f96e48315
    And response body path $.result.digest should be sha256:5b9ebb95001cc4f5242fbc3e1a9ac76d313c8ba197c7e5803a77d3f7879f0cda
    And response body path $.updateAvailable should be true

  # Test link functionality
  Scenario: WUD must generate correct links for containers with link templates
    Given I GET /api/containers
    And I store the value of body path $[4].id as containerId in scenario scope
    When I GET /api/containers/`containerId`
    Then response code should be 200
    And response body should be valid json
    And response body path $.link should be https://github.com/home-assistant/core/releases/tag/2021.6.1
    And response body path $.result.link should be https://github.com/home-assistant/core/releases/tag/2026.11.2

  # Test watch trigger functionality
  @ci-only
  Scenario: WUD must allow triggering container watch
    Given I GET /api/containers
    And I store the value of body path $[2].id as containerId in scenario scope
    When I POST to /api/containers/`containerId`/watch
    Then response code should be 200
    And response body should be valid json
    And response body path $.result.tag should be v16.1.0
  # Batch trigger endpoint (run a trigger once for several containers)
  Scenario: WUD must run a batch-capable trigger once for several containers
    Given I GET /api/containers
    And I store the value of body path $[2].id as containerId in scenario scope
    And I set Content-Type header to application/json
    And I set body to {"containers":["`containerId`"]}
    When I POST to /api/containers/triggers/mock/example
    Then response code should be 200
    And response body should be valid json

  Scenario: WUD must reject a batch trigger run without containers with 400
    Given I set Content-Type header to application/json
    And I set body to {"containers":[]}
    When I POST to /api/containers/triggers/docker/e2e
    Then response code should be 400
    And response body should be valid json
    And response body path $.error should be Bad Request

  Scenario: WUD must reject a batch trigger run on an unknown trigger with 404
    Given I set Content-Type header to application/json
    And I set body to {"containers":["unknown"]}
    When I POST to /api/containers/triggers/unknown/unknown
    Then response code should be 404
    And response body should be valid json
    And response body path $.message should be Trigger not found

  Scenario: WUD must reject a batch trigger run on a trigger without batch support with 400
    Given I set Content-Type header to application/json
    And I set body to {"containers":["unknown"]}
    When I POST to /api/containers/triggers/mqtt/e2e
    Then response code should be 400
    And response body should be valid json
    And response body path $.message should be Trigger mqtt.e2e does not support batch execution
