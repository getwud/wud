# HTTP

The `http` trigger lets you send container update webhook notifications to custom HTTP/HTTPS endpoints.

### Variables

| Env var                                         |    Required    | Description                                       | Supported values             | Default value when missing |
|-------------------------------------------------|:--------------:|---------------------------------------------------|------------------------------|----------------------------| 
| `WUD_TRIGGER_HTTP_{trigger_name}_URL`           |  :red_circle:  | Target webhook URL                                | Valid HTTP or HTTPS endpoint |                            |
| `WUD_TRIGGER_HTTP_{trigger_name}_METHOD`        | :white_circle: | HTTP request method                               | `GET`, `POST`                | `POST`                     |
| `WUD_TRIGGER_HTTP_{trigger_name}_AUTH_TYPE`     | :white_circle: | Authentication type                               | `BASIC`, `BEARER`            | `BASIC`                    |
| `WUD_TRIGGER_HTTP_{trigger_name}_AUTH_USER`     | :white_circle: | Username for Basic authentication                 | String                       |                            |
| `WUD_TRIGGER_HTTP_{trigger_name}_AUTH_PASSWORD` | :white_circle: | Password for Basic authentication                 | String                       |                            |
| `WUD_TRIGGER_HTTP_{trigger_name}_AUTH_BEARER`   | :white_circle: | Bearer token for Bearer authentication            | String                       |                            |
| `WUD_TRIGGER_HTTP_{trigger_name}_PROXY`         | :white_circle: | HTTP/HTTPS proxy URL                              | Valid proxy URL              |                            |

?> This trigger also supports [common trigger configuration options](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Send an HTTP POST webhook

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_HTTP_MYREMOTEHOST_URL=https://my-remote-host/new-version
```
#### **Docker**
```bash
docker run \
  -e WUD_TRIGGER_HTTP_MYREMOTEHOST_URL="https://my-remote-host/new-version" \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Example POST payload (JSON)
```json
{
  "id": "31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816",
  "name": "homeassistant",
  "watcher": "local",
  "includeTags": "^\\d+\\.\\d+\\.\\d+$",
  "image": {
    "id": "sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6",
    "registry": {
      "url": "123456789.dkr.ecr.eu-west-1.amazonaws.com"
    },
    "name": "test",
    "tag": {
      "value": "2021.6.4",
      "semver": true
    },
    "digest": {
      "watch": false,
      "repo": "sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72"
    },
    "architecture": "amd64",
    "os": "linux",
    "created": "2021-06-12T05:33:38.440Z"
  },
  "result": {
    "tag": "2021.6.5"
  },
  "updateAvailable": true
}
```

