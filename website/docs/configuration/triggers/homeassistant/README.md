---
title: Home Assistant (Webhook)
description: Send container update webhooks to Home Assistant automations in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Home Assistant (Webhook)

<DocHero
  icon="simple-icons:homeassistant"
  description="The Home Assistant Webhook trigger sends structured JSON payloads to Home Assistant automation webhooks whenever container updates are detected."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_HOMEASSISTANT_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS Home Assistant webhook URL (e.g. http://homeassistant.local:8123/api/webhook/YOUR_WEBHOOK_ID)">
    Home Assistant incoming webhook URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_HOMEASSISTANT_{trigger_name}_EVENT"
    required={false}
    type="string"
    defaultValue="wud_container_update">
    Custom event name included in the webhook payload
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_HOMEASSISTANT_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the notification title in payload
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 📦 Webhook Payload Format

When a container update occurs, WUD sends an HTTP `POST` request with `Content-Type: application/json`:

```json
{
  "event": "wud_container_update",
  "mode": "simple",
  "title": "New tag found for container nginx",
  "message": "Container nginx running with tag 1.24 can be updated to tag 1.25",
  "container": {
    "name": "nginx",
    "watcher": "local",
    "image": {
      "name": "nginx",
      "tag": { "value": "1.24", "semver": true }
    },
    "result": {
      "link": "https://hub.docker.com/_/nginx"
    }
  }
}
```

---

## 🚀 Examples

### Basic Webhook Automation

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_HOMEASSISTANT_HA_URL=http://homeassistant.local:8123/api/webhook/wud_container_update_hook
      - WUD_TRIGGER_HOMEASSISTANT_HA_EVENT=wud_container_update
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_HOMEASSISTANT_HA_URL="http://homeassistant.local:8123/api/webhook/wud_container_update_hook" \
  -e WUD_TRIGGER_HOMEASSISTANT_HA_EVENT="wud_container_update" \
  getwud/wud
```

</TabItem>
</Tabs>
