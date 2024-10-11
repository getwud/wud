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
<<<<<<< HEAD
      | containerName            | registry       | registryUrl                                             | imageName                           | tag                | resultTag          | updateAvailable |
      | ecr_sub_sub_test         | ecr.private    | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | sub/sub/test                        | 1.0.0              | 2.0.0              | true            |
      | ecr_sub_test             | ecr.private    | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | sub/test                            | 1.0.0              | 2.0.0              | true            |
      | ecr_test                 | ecr.private    | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | test                                | 1.0.0              | 2.0.0              | true            |
      | ghcr_radarr              | ghcr.private   | https://ghcr.io/v2                                      | linuxserver/radarr                  | 5.14.0.9383-ls245  |5.26.2.10099-ls277   | true            |
      | gitlab_test              | gitlab.private | https://registry.gitlab.com/v2                          | manfred-martin/docker-registry-test | 1.0.0              | 2.0.0              | true            |
      | hub_homeassistant_202161 | hub.public     | https://registry-1.docker.io/v2                         | homeassistant/home-assistant        | 2021.6.1           |2025.7.1           | true            |
      | hub_homeassistant_latest | hub.public     | https://registry-1.docker.io/v2                         | homeassistant/home-assistant        | latest             | latest             | false           |
      | hub_nginx_120            | hub.public     | https://registry-1.docker.io/v2                         | library/nginx                       | 1.20-alpine        | 1.29-alpine        | true            |
      | hub_nginx_latest         | hub.public     | https://registry-1.docker.io/v2                         | library/nginx                       | latest             | latest             | true            |
      | hub_omnidb_latest        | hub.public     | https://registry-1.docker.io/v2                         | omnidbteam/omnidb                   | latest             | latest             | false           |
      | hub_pihole_57            | hub.public     | https://registry-1.docker.io/v2                         | pihole/pihole                       | v5.7               | v5.8.1             | true            |
      | hub_pihole_latest        | hub.public     | https://registry-1.docker.io/v2                         | pihole/pihole                       | latest             | latest             | false           |
      | hub_pyload_latest        | hub.public     | https://registry-1.docker.io/v2                         | writl/pyload                        | latest             | latest             | false           |
      | hub_traefik_245          | hub.public     | https://registry-1.docker.io/v2                         | library/traefik                     | 2.4.5              | 3.4.3              | true            |
      | hub_traefik_latest       | hub.public     | https://registry-1.docker.io/v2                         | library/traefik                     | latest             | latest             | false           |
      | hub_vaultwarden_1222     | hub.public     | https://registry-1.docker.io/v2                         | vaultwarden/server                  | 1.34.1-alpine      | 1.34.1-alpine      | false           |
      | hub_vaultwarden_latest   | hub.public     | https://registry-1.docker.io/v2                         | vaultwarden/server                  | latest             | latest             | false           |
      | hub_youtubedb_latest     | hub.public     | https://registry-1.docker.io/v2                         | jeeaaasustest/youtube-dl            | latest             | latest             | false           |
      | lscr_radarr              | lscr.private   | https://lscr.io/v2                                      | linuxserver/radarr                  | 5.14.0.9383-ls245  |5.26.2.10099-ls277   | true            |
      | quay_prometheus          | quay.public    | https://quay.io/v2                                      | prometheus/prometheus               | v2.52.0            |v3.4.2              | true            |
=======
      | containerName            | registry | registryUrl                                             | imageName                           | tag                | resultTag          | updateAvailable |
      | ecr_sub_sub_test         | ecr      | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | sub/sub/test                        | 1.0.0              | 2.0.0              | true            |
      | ecr_sub_test             | ecr      | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | sub/test                            | 1.0.0              | 2.0.0              | true            |
      | ecr_test                 | ecr      | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | test                                | 1.0.0              | 2.0.0              | true            |
      | ghcr_radarr              | ghcr     | https://ghcr.io/v2                                      | linuxserver/radarr                  | 3.2.1.5070-ls105   |5.11.0.9244-ls241    | true            |
      | gitlab_test              | gitlab   | https://registry.gitlab.com/v2                          | manfred-martin/docker-registry-test | 1.0.0              | 2.0.0              | true            |
      | hub_homeassistant_202161 | hub      | https://registry-1.docker.io/v2                         | homeassistant/home-assistant        | 2021.6.1           | 2024.10.2           | true            |
      | hub_homeassistant_latest | hub      | https://registry-1.docker.io/v2                         | homeassistant/home-assistant        | latest             | latest             | false           |
      | hub_nginx_120            | hub      | https://registry-1.docker.io/v2                         | library/nginx                       | 1.20-alpine        | 1.27-alpine        | true            |
      | hub_nginx_latest         | hub      | https://registry-1.docker.io/v2                         | library/nginx                       | latest             | latest             | true            |
      | hub_omnidb_latest        | hub      | https://registry-1.docker.io/v2                         | omnidbteam/omnidb                   | latest             | latest             | false           |
      | hub_pihole_57            | hub      | https://registry-1.docker.io/v2                         | pihole/pihole                       | v5.7               | v5.8.1             | true            |
      | hub_pihole_latest        | hub      | https://registry-1.docker.io/v2                         | pihole/pihole                       | latest             | latest             | false           |
      | hub_pyload_latest        | hub      | https://registry-1.docker.io/v2                         | writl/pyload                        | latest             | latest             | false           |
      | hub_traefik_245          | hub      | https://registry-1.docker.io/v2                         | library/traefik                     | 2.4.5              | 3.1.6             | true            |
      | hub_traefik_latest       | hub      | https://registry-1.docker.io/v2                         | library/traefik                     | latest             | latest             | false           |
      | hub_vaultwarden_1222     | hub      | https://registry-1.docker.io/v2                         | vaultwarden/server                  | 1.32.1-alpine      | 1.32.1-alpine      | false           |
      | hub_vaultwarden_latest   | hub      | https://registry-1.docker.io/v2                         | vaultwarden/server                  | latest             | latest             | false           |
      | hub_youtubedb_latest     | hub      | https://registry-1.docker.io/v2                         | jeeaaasustest/youtube-dl            | latest             | latest             | false           |
      | lscr_radarr              | lscr     | https://lscr.io/v2                                      | linuxserver/radarr                  | 3.2.1.5070-ls105   |5.11.0.9244-ls241    | true            |
      | quay_prometheus          | quay     | https://quay.io/v2                                      | prometheus/prometheus               | v2.52.0            |v2.54.1             | true            |
>>>>>>> ab7cf7c (:star: [WATCHER] - Add support for alternative lookup registry url (useful when pulling from registry cache))
