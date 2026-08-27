---
title: HTTP Webhooks
description: Send container update webhook notifications to custom HTTP/HTTPS endpoints in What's Up Docker (WUD).
---

import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# HTTP Webhooks

![logo](http.svg)

The `http` trigger lets you dispatch container update webhook notifications to any custom HTTP/HTTPS endpoint or API.

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_HTTP_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP or HTTPS endpoint">
    Target webhook URL
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_HTTP_{trigger_name}_METHOD"
    type="enum"
    required={false}
    defaultValue="POST"
    supported="`GET`, `POST`">
    HTTP request method
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_HTTP_{trigger_name}_AUTH_TYPE"
    type="enum"
    required={false}
    defaultValue="BASIC"
    supported="`BASIC`, `BEARER`">
    Authentication mechanism
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_HTTP_{trigger_name}_AUTH_USER"
    required={false}
    type="string">
    Username for Basic authentication
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_HTTP_{trigger_name}_AUTH_PASSWORD"
    required={false}
    type="string">
    Password for Basic authentication
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_HTTP_{trigger_name}_AUTH_BEARER"
    required={false}
    type="string">
    Bearer token for Bearer authentication
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_HTTP_{trigger_name}_PROXY"
    required={false}
    type="url"
    supported="Valid HTTP/HTTPS proxy URL">
    HTTP/HTTPS proxy server URL
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Dispatch an Authenticated POST Webhook

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_HTTP_LOCAL_URL=https://api.example.com/webhooks/container-updates
      - WUD_TRIGGER_HTTP_LOCAL_METHOD=POST
      - WUD_TRIGGER_HTTP_LOCAL_AUTH_TYPE=BEARER
      - WUD_TRIGGER_HTTP_LOCAL_AUTH_BEARER=your_secret_bearer_token
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_HTTP_LOCAL_URL="https://api.example.com/webhooks/container-updates" \
  -e WUD_TRIGGER_HTTP_LOCAL_METHOD="POST" \
  -e WUD_TRIGGER_HTTP_LOCAL_AUTH_TYPE="BEARER" \
  -e WUD_TRIGGER_HTTP_LOCAL_AUTH_BEARER="your_secret_bearer_token" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📦 Webhook Payload Format

In `POST` mode, WUD transmits a JSON payload containing the discovered update:

```json
{
  "id": "31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816",
  "name": "homeassistant",
  "watcher": "local",
  "includeTags": "^\\d+\\.\\d+\\.\\d+$",
  "image": {
    "id": "sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6",
    "registry": {
      "url": "hub.docker.com"
    },
    "name": "homeassistant/home-assistant",
    "tag": {
      "value": "2024.6.4",
      "semver": true
    },
    "digest": {
      "watch": false,
      "repo": "sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72"
    },
    "architecture": "amd64",
    "os": "linux",
    "created": "2024-06-12T05:33:38.440Z"
  },
  "result": {
    "tag": "2024.6.5"
  },
  "updateAvailable": true
}
```
