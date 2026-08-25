import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Server

You can adjust the HTTP server configuration with the following environment variables.

### Variables

| Env var                     |    Required    | Description                                                                    | Supported values                         | Default value when missing       |
| --------------------------- | :------------: | ------------------------------------------------------------------------------ | ---------------------------------------- | -------------------------------- |
| `WUD_SERVER_ENABLED`        | :white_circle: | Whether to expose the HTTP server and REST API                                 | `true`, `false`                          | `true`                           |
| `WUD_SERVER_PORT`           | :white_circle: | HTTP listening port                                                            | `0` to `65535`                           | `3000`                           |
| `WUD_SERVER_TLS_ENABLED`    | :white_circle: | Enable HTTPS/TLS                                                               | `true`, `false`                          | `false`                          |
| `WUD_SERVER_TLS_KEY`        | :white_circle: | Path to TLS server private key file (required when TLS is enabled)             | File path                                |                                  |
| `WUD_SERVER_TLS_CERT`       | :white_circle: | Path to TLS server certificate file (required when TLS is enabled)             | File path                                |                                  |
| `WUD_SERVER_CORS_ENABLED`   | :white_circle: | Enable [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) requests | `true`, `false`                          | `false`                          |
| `WUD_SERVER_CORS_ORIGIN`    | :white_circle: | Allowed CORS origins                                                           | String                                   | `*`                              |
| `WUD_SERVER_CORS_METHODS`   | :white_circle: | Allowed CORS HTTP methods                                                      | Comma-separated list of valid HTTP verbs | `GET,HEAD,PUT,PATCH,POST,DELETE` |
| `WUD_SERVER_FEATURE_DELETE` | :white_circle: | Whether delete operations are permitted via the API and UI                     | `true`, `false`                          | `true`                           |
| `WUD_SERVER_BASEPATH`       | :white_circle: | Base path when running behind a prefix-stripping reverse proxy (e.g., `/wud/`) | Valid URL path ending with `/`           | `/`                              |

### Examples

#### Disable HTTP server

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_SERVER_ENABLED=false
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_SERVER_ENABLED=false \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

#### Set HTTP port to 8080

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_SERVER_PORT=8080
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_SERVER_PORT=8080 \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

#### Run behind a reverse proxy subpath

When WUD is served under a subpath (e.g., `https://example.com/wud/`) by a prefix-stripping reverse proxy, set `WUD_SERVER_BASEPATH` to that subpath so the UI and API calls resolve correctly.

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_SERVER_BASEPATH=/wud/
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e "WUD_SERVER_BASEPATH=/wud/" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

Example Caddy configuration (prefix-stripping):

```
handle_path /wud/* {
    reverse_proxy localhost:3000
}
```

#### Enable HTTPS

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

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

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e "WUD_SERVER_TLS_ENABLED=true" \
  -e "WUD_SERVER_TLS_KEY=/wud_certs/server.key" \
  -e "WUD_SERVER_TLS_CERT=/wud_certs/server.crt" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
