Feature: Prometheus exposure

  Scenario: WUD must expose prometheus metrics
    When I GET /metrics
    Then response code should be 200
    And response body should contain wud_watcher_total
    And response body should contain wud_registry_response
    And response body should contain wud_trigger_count
    And response body should contain process_cpu_user_seconds_total
    And response body should contain nodejs_eventloop_lag_seconds
    And response body should contain wud_containers{id=

  Scenario Outline: WUD must expose watched containers
    When I GET /metrics
    Then response code should be 200
    And response body should contain name="<containerName>"
    And response body should contain image_registry_name="<registry>"
    And response body should contain image_registry_url="<registryUrl>"
    And response body should contain image_name="<imageName>"
    And response body should contain image_tag_value="<tag>"
    And response body should contain result_tag="<resultTag>"
    And response body should contain update_available="<updateAvailable>"
    Examples:
      | containerName            | registry       | registryUrl                                             | imageName                           | tag                | resultTag          | updateAvailable |
      # | ecr_sub_sub_test         | ecr.private    | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | sub/sub/test                        | 1.0.0              | 2.0.0              | true            |
      | ghcr_radarr              | ghcr.private   | https://ghcr.io/v2                                      | linuxserver/radarr                  | 5.14.0.9383-ls245  | 6.0.4.10291-ls290  | false           |

      | hub_homeassistant_202161 | hub.public     | https://registry-1.docker.io/v2                         | homeassistant/home-assistant        | 2021.6.1           | 2026.1.2           | false           |
      | hub_homeassistant_latest | hub.public     | https://registry-1.docker.io/v2                         | homeassistant/home-assistant        | latest             | latest             | false           |
      | hub_nginx_120            | hub.public     | https://registry-1.docker.io/v2                         | library/nginx                       | 1.20-alpine        | 1.29-alpine        | false           |
      | hub_nginx_latest         | hub.public     | https://registry-1.docker.io/v2                         | library/nginx                       | latest             | latest             | true            |
      | hub_traefik_245          | hub.public     | https://registry-1.docker.io/v2                         | library/traefik                     | 2.4.5              | 3.6.7              | false           |
      | lscr_radarr              | lscr.private   | https://lscr.io/v2                                      | linuxserver/radarr                  | 5.14.0.9383-ls245  | 6.0.4.10291-ls290 | true            |
      | quay_prometheus          | quay.public    | https://quay.io/v2                                      | prometheus/prometheus               | v2.52.0            | v3.9.1             | true            |