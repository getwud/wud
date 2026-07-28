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
    And I resolve the latest version for image "<imageName>" on registry "<registry>" with strategy "<strategy>" and pattern "<pattern>" and value "<resultTag>" as "EXPECTED_TAG"
    Then response code should be 200
    And response body should contain name="<containerName>"
    And response body should contain image_registry_name="<registry>"
    And response body should contain image_registry_url="<registryUrl>"
    And response body should contain image_name="<imageName>"
    And response body should contain image_tag_value="<tag>"
    And response body should have substituted "result_tag=\"`EXPECTED_TAG`\""
    And response body should contain update_available="<updateAvailable>"
    Examples:
      | containerName            | registry       | registryUrl                                             | imageName                    | tag               | resultTag | updateAvailable | strategy | pattern                    |
      # | ecr_sub_sub_test         | ecr.private    | https://229211676173.dkr.ecr.eu-west-1.amazonaws.com/v2 | sub/sub/test                 | 1.0.0             | 2.0.0     | true            | static   | .*                         |
      | ghcr_radarr              | ghcr.private   | https://ghcr.io/v2                                      | linuxserver/radarr           | 5.14.0.9383-ls245 | ignored   | false           | dynamic  | ^\d+\.\d+\.\d+\.\d+-ls\d+$ |
      | hub_homeassistant_202161 | hub.public     | https://registry-1.docker.io/v2                         | homeassistant/home-assistant | 2021.6.1          | ignored   | false           | dynamic  | ^\d+\.\d+\.\d+$            |
      | hub_homeassistant_latest | hub.public     | https://registry-1.docker.io/v2                         | homeassistant/home-assistant | latest            | latest    | false           | static   | .*                         |
      | hub_nginx_120            | hub.public     | https://registry-1.docker.io/v2                         | library/nginx                | 1.20-alpine       | ignored   | false           | dynamic  | ^\d+\.\d+-alpine$          |
      | hub_nginx_latest         | hub.public     | https://registry-1.docker.io/v2                         | library/nginx                | latest            | latest    | true            | static   | .*                         |
      | hub_traefik_245          | hub.public     | https://registry-1.docker.io/v2                         | library/traefik              | 2.4.5             | ignored   | false           | dynamic  | ^\d+\.\d+\.\d+$            |
      | lscr_radarr              | lscr.private   | https://lscr.io/v2                                      | linuxserver/radarr           | 5.14.0.9383-ls245 | ignored   | true            | dynamic  | ^\d+\.\d+\.\d+\.\d+-ls\d+$ |
      | quay_prometheus          | quay.public    | https://quay.io/v2                                      | prometheus/prometheus        | v2.52.0           | ignored   | true            | dynamic  | ^v\d+\.\d+\.\d+$           |
