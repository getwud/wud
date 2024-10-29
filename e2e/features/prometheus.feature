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
      | containerName            | registry | registryUrl                                             | imageName                           | tag                | resultTag          | updateAvailable |
      | ecr_sub_sub_test         | ecr      | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | sub/sub/test                        | 1.0.0              | 2.0.0              | true            |
      | ecr_sub_test             | ecr      | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | sub/test                            | 1.0.0              | 2.0.0              | true            |
      | ecr_test                 | ecr      | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | test                                | 1.0.0              | 2.0.0              | true            |
      | ghcr_radarr              | ghcr     | https://ghcr.io/v2                                      | linuxserver/radarr                  | 3.2.1.5070-ls105   |5.14.0.9383-ls244    | true            |
      | gitlab_test              | gitlab   | https://registry.gitlab.com/v2                          | manfred-martin/docker-registry-test | 1.0.0              | 2.0.0              | true            |
      | hub_homeassistant_202161 | hub      | https://registry-1.docker.io/v2                         | homeassistant/home-assistant        | 2021.6.1           | 2024.10.4           | true            |
      | hub_homeassistant_latest | hub      | https://registry-1.docker.io/v2                         | homeassistant/home-assistant        | latest             | latest             | false           |
      | hub_nginx_120            | hub      | https://registry-1.docker.io/v2                         | library/nginx                       | 1.20-alpine        | 1.27-alpine        | true            |
      | hub_nginx_latest         | hub      | https://registry-1.docker.io/v2                         | library/nginx                       | latest             | latest             | true            |
      | hub_omnidb_latest        | hub      | https://registry-1.docker.io/v2                         | omnidbteam/omnidb                   | latest             | latest             | false           |
      | hub_pihole_57            | hub      | https://registry-1.docker.io/v2                         | pihole/pihole                       | v5.7               | v5.8.1             | true            |
      | hub_pihole_latest        | hub      | https://registry-1.docker.io/v2                         | pihole/pihole                       | latest             | latest             | false           |
      | hub_pyload_latest        | hub      | https://registry-1.docker.io/v2                         | writl/pyload                        | latest             | latest             | false           |
      | hub_traefik_245          | hub      | https://registry-1.docker.io/v2                         | library/traefik                     | 2.4.5              | 3.2.0             | true            |
      | hub_traefik_latest       | hub      | https://registry-1.docker.io/v2                         | library/traefik                     | latest             | latest             | false           |
      | hub_vaultwarden_1222     | hub      | https://registry-1.docker.io/v2                         | vaultwarden/server                  | 1.32.3-alpine      | 1.32.3-alpine      | false           |
      | hub_vaultwarden_latest   | hub      | https://registry-1.docker.io/v2                         | vaultwarden/server                  | latest             | latest             | false           |
      | hub_youtubedb_latest     | hub      | https://registry-1.docker.io/v2                         | jeeaaasustest/youtube-dl            | latest             | latest             | false           |
      | lscr_radarr              | lscr     | https://lscr.io/v2                                      | linuxserver/radarr                  | 3.2.1.5070-ls105   |5.14.0.9383-ls244    | true            |
      | quay_prometheus          | quay     | https://quay.io/v2                                      | prometheus/prometheus               | v2.52.0            |v2.55.0             | true            |
