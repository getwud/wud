# MQTT

![logo](mqtt.png)

The `mqtt` trigger lets you publish container update notifications to an MQTT broker.

### Variables

| Env var                                                  |    Required    | Description                                                                                   | Supported values                              | Default value when missing |
| -------------------------------------------------------- | :------------: | --------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------- |
| `WUD_TRIGGER_MQTT_{trigger_name}_URL`                    |  :red_circle:  | URL of the MQTT broker                                                                        | Valid `mqtt`, `mqtts`, `tcp`, `ws`, `wss` URL |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_USER`                   | :white_circle: | MQTT broker username                                                                          | String                                        |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_PASSWORD`               | :white_circle: | MQTT broker password                                                                          | String                                        |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_CLIENTID`               | :white_circle: | MQTT client ID to use                                                                         | String                                        | `wud_$random`              |
| `WUD_TRIGGER_MQTT_{trigger_name}_TOPIC`                  | :white_circle: | Base topic to which updates are published                                                     | String                                        | `wud/container`            |
| `WUD_TRIGGER_MQTT_{trigger_name}_HASS_ENABLED`           | :white_circle: | Enable [Home Assistant](https://www.home-assistant.io/) integration and publish state updates | `true`, `false`                               | `false`                    |
| `WUD_TRIGGER_MQTT_{trigger_name}_HASS_DISCOVERY`         | :white_circle: | Enable [Home Assistant](https://www.home-assistant.io/) MQTT Auto-Discovery                   | `true`, `false`                               | `false`                    |
| `WUD_TRIGGER_MQTT_{trigger_name}_HASS_PREFIX`            | :white_circle: | Discovery prefix topic for Home Assistant                                                     | String                                        | `homeassistant`            |
| `WUD_TRIGGER_MQTT_{trigger_name}_HASS_DEVICEID`          | :white_circle: | Device identifier in Home Assistant                                                           | String                                        | `wud`                      |
| `WUD_TRIGGER_MQTT_{trigger_name}_HASS_DEVICENAME`        | :white_circle: | Device display name in Home Assistant                                                         | String                                        | `wud`                      |
| `WUD_TRIGGER_MQTT_{trigger_name}_TLS_CACHAIN`            | :white_circle: | Path to CA certificate chain PEM file (when using a private Certificate Authority)            | File path                                     |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_TLS_CLIENTCERT`         | :white_circle: | Path to client certificate PEM file (when using mutual TLS authentication)                    | File path                                     |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_TLS_CLIENTKEY`          | :white_circle: | Path to client private key PEM file (when using mutual TLS authentication)                    | File path                                     |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_TLS_REJECTUNAUTHORIZED` | :white_circle: | Whether to reject untrusted server certificates                                               | `true`, `false`                               | `true`                     |

?> This trigger supports [common trigger configuration options](configuration/triggers/?id=common-trigger-configuration) and runs in `simple` mode only.

?> Want to customize the entity name and icon in Home Assistant? \
[Use the `wud.display.name` and `wud.display.icon` labels](configuration/watchers/?id=labels).

### Examples

#### Publish to a local Mosquitto broker

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_MQTT_MOSQUITTO_URL=mqtt://localhost:1883
```

#### **Docker**

```bash
docker run \
  -e WUD_TRIGGER_MQTT_MOSQUITTO_URL="mqtt://localhost:1883" \
  ...
  getwud/wud
```

<!-- tabs:end -->

#### Publish with mutual TLS (mTLS)

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_MQTT_MOSQUITTO_URL=mqtts://localhost:8883
      - WUD_TRIGGER_MQTT_MOSQUITTO_TLS_CLIENTKEY=/wud/mqtt/client-key.pem
      - WUD_TRIGGER_MQTT_MOSQUITTO_TLS_CLIENTCERT=/wud/mqtt/client-cert.pem
      - WUD_TRIGGER_MQTT_MOSQUITTO_TLS_CACHAIN=/wud/mqtt/ca.pem
    volumes:
      - /mosquitto/tls/client/client-key.pem:/wud/mqtt/client-key.pem:ro
      - /mosquitto/tls/client/client-cert.pem:/wud/mqtt/client-cert.pem:ro
      - /mosquitto/tls/ca.pem:/wud/mqtt/ca.pem:ro
```

#### **Docker**

```bash
docker run \
  -e WUD_TRIGGER_MQTT_MOSQUITTO_URL="mqtts://localhost:8883" \
  -e WUD_TRIGGER_MQTT_MOSQUITTO_TLS_CLIENTKEY="/wud/mqtt/client-key.pem" \
  -e WUD_TRIGGER_MQTT_MOSQUITTO_TLS_CLIENTCERT="/wud/mqtt/client-cert.pem" \
  -e WUD_TRIGGER_MQTT_MOSQUITTO_TLS_CACHAIN="/wud/mqtt/ca.pem" \
  -v /mosquitto/tls/client/client-key.pem:/wud/mqtt/client-key.pem:ro \
  -v /mosquitto/tls/client/client-cert.pem:/wud/mqtt/client-cert.pem:ro \
  -v /mosquitto/tls/ca.pem:/wud/mqtt/ca.pem:ro \
  ...
  getwud/wud
```

<!-- tabs:end -->

#### Publish to Maqiatto broker

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_MQTT_MAQIATTO_URL=tcp://maqiatto.com:1883
      - WUD_TRIGGER_MQTT_MAQIATTO_USER=john@example.com
      - WUD_TRIGGER_MQTT_MAQIATTO_PASSWORD=mysecretpassword
      - WUD_TRIGGER_MQTT_MAQIATTO_TOPIC=john@example.com/wud/image
```

#### **Docker**

```bash
docker run \
  -e WUD_TRIGGER_MQTT_MAQIATTO_URL="tcp://maqiatto.com:1883" \
  -e WUD_TRIGGER_MQTT_MAQIATTO_USER="john@example.com" \
  -e WUD_TRIGGER_MQTT_MAQIATTO_PASSWORD="mysecretpassword" \
  -e WUD_TRIGGER_MQTT_MAQIATTO_TOPIC="john@example.com/wud/image" \
  ...
  getwud/wud
```

<!-- tabs:end -->

#### Example published MQTT message

```json
{
  "id": "31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816",
  "name": "homeassistant",
  "watcher": "local",
  "include_tags": "^\\d+\\.\\d+\\.\\d+$",
  "image_id": "sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6",
  "image_registry_url": "123456789.dkr.ecr.eu-west-1.amazonaws.com",
  "image_name": "test",
  "image_tag_value": "2021.6.4",
  "image_tag_semver": true,
  "image_digest_watch": false,
  "image_digest_repo": "sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72",
  "image_architecture": "amd64",
  "image_os": "linux",
  "image_created": "2021-06-12T05:33:38.440Z",
  "result_tag": "2021.6.5",
  "updateAvailable": true
}
```

### Home Assistant Integration

![logo](hass.png)

WUD integrates seamlessly into [Home Assistant](https://www.home-assistant.io/) using [MQTT Discovery](https://www.home-assistant.io/docs/mqtt/discovery/).

By default, WUD registers itself as the Home Assistant device `wud`. Use `HASS_DEVICEID` and `HASS_DEVICENAME` to customize the device identifier and display name.

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_MQTT_MOSQUITTO_URL=mqtt://localhost:1883
      - WUD_TRIGGER_MQTT_MOSQUITTO_HASS_ENABLED=true
      - WUD_TRIGGER_MQTT_MOSQUITTO_HASS_DISCOVERY=true
```

#### **Docker**

```bash
docker run \
  -e WUD_TRIGGER_MQTT_MOSQUITTO_URL="mqtt://localhost:1883" \
  -e WUD_TRIGGER_MQTT_MOSQUITTO_HASS_ENABLED="true" \
  -e WUD_TRIGGER_MQTT_MOSQUITTO_HASS_DISCOVERY="true" \
  ...
  getwud/wud
```

<!-- tabs:end -->

#### 1. Confirm MQTT integration in Home Assistant

![image](hass_01.png)

#### 2. WUD device automatically appears in Home Assistant device registry

![image](hass_02.png)

#### 3. Binary sensors are automatically created per Docker container

![image](hass_03.png)

Entities are [binary sensors](https://www.home-assistant.io/integrations/binary_sensor/) whose state turns `on` when an update is available.

#### 4. Container attributes exposed

![image](hass_04.png)

Entities expose complete container details as state attributes:

- Current version
- New version
- Registry
- Architecture
- OS
- Created date
