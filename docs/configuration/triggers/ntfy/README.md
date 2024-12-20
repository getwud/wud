# Ntfy
![logo](ntfy.png)

The `ntfy` trigger lets you send container update notifications via [Ntfy](https://ntfy.sh/).

### Variables

| Env var                                         |    Required    | Description                               | Supported values                                                                       | Default value when missing |
|-------------------------------------------------|:--------------:|-------------------------------------------|----------------------------------------------------------------------------------------|----------------------------| 
| `WUD_TRIGGER_NTFY_{trigger_name}_AUTH_PASSWORD` | :white_circle: | Password (if basic auth is enabled)       |                                                                                        |                            |
| `WUD_TRIGGER_NTFY_{trigger_name}_AUTH_TOKEN`    | :white_circle: | Bearer token (if bearer auth is enabled)  |                                                                                        |                            |
| `WUD_TRIGGER_NTFY_{trigger_name}_AUTH_USER`     | :white_circle: | User (if basic auth is enabled)           |                                                                                        |                            |
| `WUD_TRIGGER_NTFY_{trigger_name}_PRIORITY`      | :white_circle: | The Ntfy message priority                 | Integer between `0` and `5` [see here](https://docs.ntfy.sh/publish/#message-priority) |                            |
| `WUD_TRIGGER_NTFY_{trigger_name}_TOPIC`         | :red_circle:   | The Ntfy topic name                       |                                                                                        |                            |
| `WUD_TRIGGER_NTFY_{trigger_name}_URL`           | :red_circle:   | The Ntfy server url                       | The `http` or `https` gotify server address                                            | `https://notify.sh`        |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Configure the trigger to publish to the official public ntfy service

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_NTFY_SH_TOPIC=xxxxyyyyzzzz
```
#### **Docker**
```bash
docker run \
  -e WUD_TRIGGER_NTFY_SH_TOPIC="xxxxyyyyzzzz" \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Configure the trigger to publish to a private ntfy service with basic auth enabled

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_NTFY_PRIVATE_URL=http://ntfy.local
      - WUD_TRIGGER_NTFY_PRIVATE_TOPIC=xxxxyyyyzzzz
      - WUD_TRIGGER_NTFY_PRIVATE_AUTH_USER=john
      - WUD_TRIGGER_NTFY_PRIVATE_AUTH_PASSWORD=doe
```
#### **Docker**
```bash
docker run \
  -e WUD_TRIGGER_NTFY_PRIVATE_URL="http://ntfy.local" \
  -e WUD_TRIGGER_NTFY_PRIVATE_TOPIC="xxxxyyyyzzzz" \
  -e WUD_TRIGGER_NTFY_PRIVATE_AUTH_USER="john" \
  -e WUD_TRIGGER_NTFY_PRIVATE_AUTH_PASSWORD="doe" \
  ...
  getwud/wud
```
<!-- tabs:end -->
