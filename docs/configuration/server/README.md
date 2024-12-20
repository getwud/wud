# Server

You can adjust the server configuration with the following environment variables.

### Variables

| Env var                    | Required       | Description                                                                  | Supported values                         | Default value when missing       |
| -------------------------- |:--------------:|----------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------- | 
| `WUD_SERVER_ENABLED`       | :white_circle: | If REST API must be exposed                                                  | `true`, `false`                          | `true`                           |
| `WUD_SERVER_PORT`          | :white_circle: | Http listener port                                                           | from `0` to `65535`                      | `3000`                           |
| `WUD_SERVER_TLS_ENABLED`   | :white_circle: | Enable HTTPS+TLS                                                             | `true`, `false`                          | `false`                          |
| `WUD_SERVER_TLS_KEY`       | :white_circle: | TLS server key (required when `WUD_SERVER_TLS_ENABLED` is enabled)           | File path to the key file                |                                  |
| `WUD_SERVER_TLS_CERT`      | :white_circle: | TLS server certificate (required when `WUD_SERVER_TLS_ENABLED` is enabled)   | File path to the cert file               |                                  |
| `WUD_SERVER_CORS_ENABLED`  | :white_circle: | Enable [CORS](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS) Requests  | `true`, `false`                          | `false`                          |
| `WUD_SERVER_CORS_ORIGIN`   | :white_circle: | Supported CORS origin                                                        |                                          | `*`                              |
| `WUD_SERVER_CORS_METHODS`  | :white_circle: | Supported CORS methods                                                       | Comma separated list of valid HTTP verbs | `GET,HEAD,PUT,PATCH,POST,DELETE` |
| `WUD_SERVER_FEATURE_DELETE`| :white_circle: | If deleting operations are enabled through API & UI                          | `true`, `false`                          | `true`                           |

### Examples

#### Disable http listener

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_SERVER_ENABLED=false
```
#### **Docker**
```bash
docker run \
  -e WUD_SERVER_ENABLED=false \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Set http listener port to 8080

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_SERVER_PORT=8080
```
#### **Docker**
```bash
docker run \
  -e WUD_SERVER_PORT=8080 \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Enable HTTPS

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_SERVER_TLS_ENABLED=true
      - WUD_SERVER_TLS_KEY=/wud_certs/server.key
      - WUD_SERVER_TLS_CERT=/wud_certs/server.crt
```
#### **Docker**
```bash
docker run \
  -e "WUD_SERVER_TLS_ENABLED=true" \
  -e "WUD_SERVER_TLS_KEY=/wud_certs/server.key" \
  -e "WUD_SERVER_TLS_CERT=/wud_certs/server.crt" \
  ...
  getwud/wud
```
<!-- tabs:end -->
