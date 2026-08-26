import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# HTTP

![logo](http.svg)

The `http` trigger lets you send container update webhook notifications to custom HTTP/HTTPS endpoints.

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_HTTP_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP or HTTPS endpoint">
    Target webhook URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_HTTP_{trigger_name}_AUTH_BEARER"
    required={false}
    type="string">
    Bearer token for Bearer authentication
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_HTTP_{trigger_name}_AUTH_PASSWORD"
    required={false}
    type="string">
    Password for Basic authentication
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_HTTP_{trigger_name}_AUTH_TYPE"
    type="enum"
    required={false}
    defaultValue="BASIC"
    supported="`BASIC`, `BEARER`">
    Authentication type
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_HTTP_{trigger_name}_AUTH_USER"
    required={false}
    type="string">
    Username for Basic authentication
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_HTTP_{trigger_name}_METHOD"
    type="enum"
    required={false}
    defaultValue="POST"
    supported="`GET`, `POST`">
    HTTP request method
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_HTTP_{trigger_name}_PROXY"
    required={false}
    type="url"
    supported="Valid proxy URL">
    HTTP/HTTPS proxy URL
  </ConfigOption>
</ConfigList>
:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

### Examples

#### Send an HTTP POST webhook

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_HTTP_MYREMOTEHOST_URL=https://my-remote-host/new-version
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_HTTP_MYREMOTEHOST_URL="https://my-remote-host/new-version" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

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
