# ntfy

![logo](ntfy.png)

The `ntfy` trigger lets you send container update push notifications via [ntfy](https://ntfy.sh/).

### Variables

| Env var                                         |    Required    | Description                               | Supported values                                                                       | Default value when missing |
|-------------------------------------------------|:--------------:|-------------------------------------------|----------------------------------------------------------------------------------------|----------------------------| 
| `WUD_TRIGGER_NTFY_{trigger_name}_TOPIC`         | :red_circle:   | Target ntfy topic name                    | String                                                                                 |                            |
| `WUD_TRIGGER_NTFY_{trigger_name}_URL`           | :white_circle: | ntfy server base URL                      | Valid HTTP or HTTPS URL                                                                | `https://ntfy.sh`          |
| `WUD_TRIGGER_NTFY_{trigger_name}_PRIORITY`      | :white_circle: | ntfy notification priority                | Integer between `1` (min) and `5` (max) [see docs](https://docs.ntfy.sh/publish/#message-priority) | `3` (default)     |
| `WUD_TRIGGER_NTFY_{trigger_name}_AUTH_USER`     | :white_circle: | Username (for Basic authentication)       | String                                                                                 |                            |
| `WUD_TRIGGER_NTFY_{trigger_name}_AUTH_PASSWORD` | :white_circle: | Password (for Basic authentication)       | String                                                                                 |                            |
| `WUD_TRIGGER_NTFY_{trigger_name}_AUTH_TOKEN`    | :white_circle: | Access token (for Bearer authentication)  | String                                                                                 |                            |

?> This trigger also supports [common trigger configuration options](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Publish to the public ntfy.sh service

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_NTFY_SH_TOPIC=my_secret_topic_name
```
#### **Docker**
```bash
docker run \
  -e WUD_TRIGGER_NTFY_SH_TOPIC="my_secret_topic_name" \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Publish to a self-hosted ntfy instance with Basic authentication

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_NTFY_PRIVATE_URL=https://ntfy.example.com
      - WUD_TRIGGER_NTFY_PRIVATE_TOPIC=my_secret_topic_name
      - WUD_TRIGGER_NTFY_PRIVATE_AUTH_USER=john
      - WUD_TRIGGER_NTFY_PRIVATE_AUTH_PASSWORD=mysecretpassword
```
#### **Docker**
```bash
docker run \
  -e WUD_TRIGGER_NTFY_PRIVATE_URL="https://ntfy.example.com" \
  -e WUD_TRIGGER_NTFY_PRIVATE_TOPIC="my_secret_topic_name" \
  -e WUD_TRIGGER_NTFY_PRIVATE_AUTH_USER="john" \
  -e WUD_TRIGGER_NTFY_PRIVATE_AUTH_PASSWORD="mysecretpassword" \
  ...
  getwud/wud
```
<!-- tabs:end -->

