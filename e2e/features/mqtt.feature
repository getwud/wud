Feature: MQTT Trigger and Home Assistant Auto-Discovery

  Background:
    Given I connect to the MQTT broker

  Scenario: WUD publishes connection status to MQTT
    Then an MQTT message should be published on topic "wud/container/status"
    And the MQTT message on topic "wud/container/status" should equal "online"
    And an MQTT message should be published on topic "homeassistant/binary_sensor/wud_container_status/config"
    And the MQTT message on topic "homeassistant/binary_sensor/wud_container_status/config" should be valid json
    And the MQTT message on topic "homeassistant/binary_sensor/wud_container_status/config" path "unique_id" should be "wud_container_status"
    And the MQTT message on topic "homeassistant/binary_sensor/wud_container_status/config" path "device_class" should be "connectivity"
    And the MQTT message on topic "homeassistant/binary_sensor/wud_container_status/config" path "state_topic" should be "wud/container/status"
    And the MQTT message on topic "homeassistant/binary_sensor/wud_container_status/config" path "device.identifiers[0]" should be "wud"

  Scenario: WUD publishes global container count sensors to MQTT
    Then an MQTT message should be published on topic "wud/container/total_count"
    And the MQTT message on topic "wud/container/total_count" should equal "9"
    And an MQTT message should be published on topic "wud/container/update_count"
    And the MQTT message on topic "wud/container/update_count" should match "^\d+$"
    And an MQTT message should be published on topic "wud/container/update_status"
    And the MQTT message on topic "wud/container/update_status" should equal "true"

  Scenario: WUD publishes global count sensors discovery to Home Assistant
    Then an MQTT message should be published on topic "homeassistant/sensor/wud_container_total_count/config"
    And the MQTT message on topic "homeassistant/sensor/wud_container_total_count/config" path "unique_id" should be "wud_container_total_count"
    And the MQTT message on topic "homeassistant/sensor/wud_container_total_count/config" path "name" should be "Total container count"
    And the MQTT message on topic "homeassistant/sensor/wud_container_total_count/config" path "state_topic" should be "wud/container/total_count"
    And an MQTT message should be published on topic "homeassistant/sensor/wud_container_update_count/config"
    And the MQTT message on topic "homeassistant/sensor/wud_container_update_count/config" path "unique_id" should be "wud_container_update_count"
    And the MQTT message on topic "homeassistant/sensor/wud_container_update_count/config" path "name" should be "Total container update count"
    And the MQTT message on topic "homeassistant/sensor/wud_container_update_count/config" path "state_topic" should be "wud/container/update_count"
    And an MQTT message should be published on topic "homeassistant/binary_sensor/wud_container_update_status/config"
    And the MQTT message on topic "homeassistant/binary_sensor/wud_container_update_status/config" path "unique_id" should be "wud_container_update_status"
    And the MQTT message on topic "homeassistant/binary_sensor/wud_container_update_status/config" path "name" should be "Total container update status"

  Scenario: WUD publishes per-watcher sensors to MQTT
    Then an MQTT message should be published on topic "wud/container/local/total_count"
    And the MQTT message on topic "wud/container/local/total_count" should equal "9"
    And an MQTT message should be published on topic "wud/container/local/update_count"
    And the MQTT message on topic "wud/container/local/update_count" should match "^\d+$"
    And an MQTT message should be published on topic "wud/container/local/update_status"
    And the MQTT message on topic "wud/container/local/update_status" should equal "true"
    And an MQTT message should be published on topic "wud/container/local/running"
    And the MQTT message on topic "wud/container/local/running" should equal "false"

  Scenario: WUD publishes per-watcher sensors discovery to Home Assistant
    Then an MQTT message should be published on topic "homeassistant/sensor/wud_container_local_total_count/config"
    And the MQTT message on topic "homeassistant/sensor/wud_container_local_total_count/config" path "unique_id" should be "wud_container_local_total_count"
    And the MQTT message on topic "homeassistant/sensor/wud_container_local_total_count/config" path "device.identifiers[0]" should be "wud_local"
    And the MQTT message on topic "homeassistant/sensor/wud_container_local_total_count/config" path "device.name" should be "wud (local)"
    And an MQTT message should be published on topic "homeassistant/sensor/wud_container_local_update_count/config"
    And the MQTT message on topic "homeassistant/sensor/wud_container_local_update_count/config" path "unique_id" should be "wud_container_local_update_count"
    And the MQTT message on topic "homeassistant/sensor/wud_container_local_update_count/config" path "device.identifiers[0]" should be "wud_local"
    And an MQTT message should be published on topic "homeassistant/binary_sensor/wud_container_local_update_status/config"
    And the MQTT message on topic "homeassistant/binary_sensor/wud_container_local_update_status/config" path "unique_id" should be "wud_container_local_update_status"
    And the MQTT message on topic "homeassistant/binary_sensor/wud_container_local_update_status/config" path "device.identifiers[0]" should be "wud_local"
    And an MQTT message should be published on topic "homeassistant/binary_sensor/wud_container_local_running/config"
    And the MQTT message on topic "homeassistant/binary_sensor/wud_container_local_running/config" path "unique_id" should be "wud_container_local_running"
    And the MQTT message on topic "homeassistant/binary_sensor/wud_container_local_running/config" path "device.identifiers[0]" should be "wud_local"

  Scenario Outline: WUD publishes container update entity discovery to Home Assistant
    Then an MQTT message should be published on topic "homeassistant/update/<entityId>/config"
    And the MQTT message on topic "homeassistant/update/<entityId>/config" should be valid json
    And the MQTT message on topic "homeassistant/update/<entityId>/config" path "unique_id" should be "<entityId>"
    And the MQTT message on topic "homeassistant/update/<entityId>/config" path "state_topic" should be "<stateTopic>"
    And the MQTT message on topic "homeassistant/update/<entityId>/config" path "latest_version_topic" should be "<stateTopic>"
    And the MQTT message on topic "homeassistant/update/<entityId>/config" path "command_topic" should be "<commandTopic>"
    And the MQTT message on topic "homeassistant/update/<entityId>/config" path "payload_install" should be "INSTALL"
    And the MQTT message on topic "homeassistant/update/<entityId>/config" path "icon" should be "<icon>"
    And the MQTT message on topic "homeassistant/update/<entityId>/config" path "device.identifiers[0]" should be "wud_local"
    Examples:
      | entityId                                     | stateTopic                                  | commandTopic                                        | icon                 |
      | wud_container_local_hub_alpine_latest        | wud/container/local/hub_alpine_latest       | wud/container/local/hub_alpine_latest/install       | mdi:linux            |
      | wud_container_local_hub_nginx_latest         | wud/container/local/hub_nginx_latest        | wud/container/local/hub_nginx_latest/install        | mdi:server-network   |
      | wud_container_local_hub_homeassistant_202161| wud/container/local/hub_homeassistant_202161| wud/container/local/hub_homeassistant_202161/install| mdi:home-assistant   |
      | wud_container_local_quay_prometheus         | wud/container/local/quay_prometheus        | wud/container/local/quay_prometheus/install         | mdi:chart-areaspline |

  Scenario Outline: WUD publishes container state payloads to MQTT
    Then an MQTT message should be published on topic "<topic>"
    And the MQTT message on topic "<topic>" should be valid json
    And the MQTT message on topic "<topic>" path "name" should be "<containerName>"
    And the MQTT message on topic "<topic>" path "watcher" should be "local"
    And the MQTT message on topic "<topic>" path "update_available" should be <update_available>
    Examples:
      | topic                                 | containerName            | update_available |
      | wud/container/local/hub_alpine_latest | hub_alpine_latest        | false            |
      | wud/container/local/hub_nginx_latest  | hub_nginx_latest         | true             |
