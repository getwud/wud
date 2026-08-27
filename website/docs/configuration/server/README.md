import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Server

You can adjust the HTTP server configuration with the following environment variables.

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_SERVER_BASEPATH"
    required={false}
    type="url"
    defaultValue="/"
    supported="Valid URL path ending with `/`">
    Base path when running behind a prefix-stripping reverse proxy (e.g., `/wud/`)
  </ConfigOption>

  <ConfigOption
    name="WUD_SERVER_CORS_ENABLED"
    required={false}
    type="boolean"
    defaultValue="false">
    Enable [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) requests
  </ConfigOption>

  <ConfigOption
    name="WUD_SERVER_CORS_METHODS"
    required={false}
    type="url"
    defaultValue="GET,HEAD,PUT,PATCH,POST,DELETE"
    supported="Comma-separated list of valid HTTP verbs">
    Allowed CORS HTTP methods
  </ConfigOption>

  <ConfigOption
    name="WUD_SERVER_CORS_ORIGIN"
    required={false}
    type="string"
    defaultValue="*">
    Allowed CORS origins
  </ConfigOption>

  <ConfigOption
    name="WUD_SERVER_ENABLED"
    required={false}
    type="boolean"
    defaultValue="true">
    Whether to expose the HTTP server and REST API
  </ConfigOption>

  <ConfigOption
    name="WUD_SERVER_FEATURE_DELETE"
    required={false}
    type="boolean"
    defaultValue="true">
    Whether delete operations are permitted via the API and UI
  </ConfigOption>

  <ConfigOption name="WUD_SERVER_PORT"
    type="integer"
    required={false}
    defaultValue="3000"
    supported="`0` to `65535`">
    HTTP listening port
  </ConfigOption>

  <ConfigOption name="WUD_SERVER_TLS_CERT"
    type="path"
    required={false}
    supported="File path">
    Path to TLS server certificate file (required when TLS is enabled)
  </ConfigOption>

  <ConfigOption
    name="WUD_SERVER_TLS_ENABLED"
    required={false}
    type="boolean"
    defaultValue="false">
    Enable HTTPS/TLS
  </ConfigOption>

  <ConfigOption name="WUD_SERVER_TLS_KEY"
    type="path"
    required={false}
    supported="File path">
    Path to TLS server private key file (required when TLS is enabled)
  </ConfigOption>
</ConfigList>
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
