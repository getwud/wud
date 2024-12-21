# Http

The `http` trigger lets you send container update notifications via HTTP.

#### Variables

| Env var                                         |    Required    | Description                                       | Supported values             | Default value when missing |
|-------------------------------------------------|:--------------:|---------------------------------------------------|------------------------------|----------------------------| 
| `WUD_TRIGGER_HTTP_{trigger_name}_URL`           |  :red_circle:  | The URL of the webhook                            | Valid http or https endpoint |                            |
| `WUD_TRIGGER_HTTP_{trigger_name}_METHOD`        | :white_circle: | The HTTP method to use                            | `GET`, `POST`                | `POST`                     |
| `WUD_TRIGGER_HTTP_{trigger_name}_AUTH_TYPE`     | :white_circle: | The Auth type (among )                            | `BASIC`, `BEARER`            | `BASIC`                    |
| `WUD_TRIGGER_HTTP_{trigger_name}_AUTH_USER`     | :white_circle: | The Auth user if BASIC Auth is enabled            |                              |                            |
| `WUD_TRIGGER_HTTP_{trigger_name}_AUTH_PASSWORD` | :white_circle: | The Auth user password if `BASIC` Auth is enabled |                              |                            |
| `WUD_TRIGGER_HTTP_{trigger_name}_AUTH_BEARER`   | :white_circle: | The Auth bearer token if `BEARER` Auth is enabled |                              |                            |
| `WUD_TRIGGER_HTTP_{trigger_name}_PROXY`         | :white_circle: | The HTTP Proxy                                    |                              |                            |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Post an HTTP request to an existing server 

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

#### Example of payload (POST request)
```json
{
  "id":"31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816",
  "name":"homeassistant",
  "watcher":"local",
  "includeTags":"^\\d+\\.\\d+.\\d+$",
  "image":{
    "id":"sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6",
    "registry":{
      "url":"123456789.dkr.ecr.eu-west-1.amazonaws.com"
    },
    "name":"test",
    "tag":{
      "value":"2021.6.4",
      "semver":true
    },
    "digest":{
      "watch":false,
      "repo":"sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72"
    },
    "architecture":"amd64",
    "os":"linux",
    "created":"2021-06-12T05:33:38.440Z"
  },
  "result":{
    "tag":"2021.6.5"
  },
  "updateAvailable": true
}
```
