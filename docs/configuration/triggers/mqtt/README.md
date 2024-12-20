# Mqtt
![logo](mqtt.png)

The `mqtt` trigger lets you send container update notifications to an MQTT broker.

### Variables

| Env var                                                  | Required       | Description                                                                                         | Supported values                    | Default value when missing |
|----------------------------------------------------------|:--------------:|-----------------------------------------------------------------------------------------------------|-------------------------------------|----------------------------| 
| `WUD_TRIGGER_MQTT_{trigger_name}_URL`                    | :red_circle:   | The URL of the MQTT broker                                                                          | Valid mqtt, mqtts, tcp, ws, wss url |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_USER`                   | :white_circle: | The username if broker authentication is enabled                                                    |                                     |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_PASSWORD`               | :white_circle: | The password if broker authentication is enabled                                                    |                                     |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_CLIENTID`               | :white_circle: | The Mqtt client Id to use                                                                           |                                     | `wud_$random`              |
| `WUD_TRIGGER_MQTT_{trigger_name}_TOPIC`                  | :white_circle: | The base topic where the updates are published to                                                   |                                     | `wud/container`            |
| `WUD_TRIGGER_MQTT_{trigger_name}_HASS_ENABLED`           | :white_circle: | Enable [Home-assistant](https://www.home-assistant.io/) integration and deliver additional topics   | `true`, `false`                     | `false`                    |
| `WUD_TRIGGER_MQTT_{trigger_name}_HASS_DISCOVERY`         | :white_circle: | Enable [Home-assistant](https://www.home-assistant.io/) integration including discovery             | `true`, `false`                     | `false`                    |
| `WUD_TRIGGER_MQTT_{trigger_name}_HASS_PREFIX`            | :white_circle: | Base topic for hass entity discovery                                                                |                                     | `homeassistant`            |
| `WUD_TRIGGER_MQTT_{trigger_name}_TLS_CACHAIN`            | :white_circle: | The path to the file containing the server CA chain (when TLS with a private Certificate Authority) | Any valid file path                 |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_TLS_CLIENTCERT`         | :white_circle: | The path to the file containing the client public certificate (when TLS mutual authzentication)     | Any valid file path                 |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_TLS_CLIENTKEY`          | :white_circle: | The path to the file containing the client private key (when TLS mutual authzentication)            | Any valid file path                 |                            |
| `WUD_TRIGGER_MQTT_{trigger_name}_TLS_REJECTUNAUTHORIZED` | :white_circle: | Accept or reject when the TLS server certificate cannot be trusted                                  | `true`, `false`                     | `true`                     |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration). but only supports the `simple` mode.

?> You want to customize the name & icon of the Home-Assistant entity? \
[Use the `wud.display.name` and `wud.display.icon` labels](configuration/watchers/?id=labels).

### Examples

#### Post a message to a local mosquitto broker

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

#### Post a message to a local mosquitto broker with mTLS enabled

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
      - /mosquitto/tls/client/client-key.pem:/wud/mqtt/client-key.pem
      - /mosquitto/tls/client/client-cert.pem:/wud/mqtt/client-cert.pem
      - /mosquitto/tls/ca.pem:/wud/mqtt/ca.pem
```

#### **Docker**
```bash
docker run \
    -e WUD_TRIGGER_MQTT_MOSQUITTO_URL="mqtts://localhost:8883" \
    -e WUD_TRIGGER_MQTT_MOSQUITTO_TLS_CLIENTKEY="/wud/mqtt/client-key.pem" \
    -e WUD_TRIGGER_MQTT_MOSQUITTO_TLS_CLIENTCERT="/wud/mqtt/client-cert.pem" \
    -e WUD_TRIGGER_MQTT_MOSQUITTO_TLS_CACHAIN="/wud/mqtt/ca.pem" \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Post a message to a maqiatto broker

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_MQTT_MAQIATTO_URL=tcp://maqiatto.com:1883
      - WUD_TRIGGER_MQTT_MAQIATTO_USER=john@doe.com
      - WUD_TRIGGER_MQTT_MAQIATTO_PASSWORD=mysecretpassword
      - WUD_TRIGGER_MQTT_MAQIATTO_TOPIC=john@doe.com/wud/image
```

#### **Docker**
```bash
docker run \
    -e WUD_TRIGGER_MQTT_MAQIATTO_URL="tcp://maqiatto.com:1883" \
    -e WUD_TRIGGER_MQTT_MAQIATTO_USER="john@doe.com" \
    -e WUD_TRIGGER_MQTT_MAQIATTO_PASSWORD="mysecretpassword" \
    -e WUD_TRIGGER_MQTT_MAQIATTO_TOPIC="john@doe.com/wud/image" \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Example of sent message
```json
{
  "id":"31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816",
  "name":"homeassistant",
  "watcher":"local",
  "include_tags":"^\\d+\\.\\d+.\\d+$",
  "image_id":"sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6",
  "image_registry_url":"123456789.dkr.ecr.eu-west-1.amazonaws.com",
  "image_name":"test",
  "image_tag_value":"2021.6.4",
  "image_tag_semver":true,
  "image_digest_watch":false,
  "image_digest_repo":"sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72",
  "image_architecture":"amd64",
  "image_os":"linux",
  "image_created":"2021-06-12T05:33:38.440Z",
  "result_tag":"2021.6.5",
  "updateAvailable":"2021.6.5"
}
```

### Home-Assistant integration
![logo](hass.png)

WUD can be easily integrated into [Home-Assistant](https://www.home-assistant.io/) using [MQTT Discovery](https://www.home-assistant.io/docs/mqtt/discovery/).

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

#### Check that mqtt integration is properly configured.
![image](hass_01.png)

#### A WUD device is automatically added to the hass registry
![image](hass_02.png)

#### Entities are automatically created (per Docker image)
![image](hass_03.png)

Entities are [binary_sensors](https://www.home-assistant.io/integrations/binary_sensor/) whose state is true when an update is available.

#### Entities
![image](hass_04.png)

Entities expose all the details of the container as attributes:
- Current version
- New version
- Registry
- Architecture
- OS
- Size
- ...
