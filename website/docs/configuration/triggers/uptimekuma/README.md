---
title: Uptime Kuma
description: Push container update statuses and alerts to Uptime Kuma Push Monitors in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Uptime Kuma (Push Monitor)

<DocHero
  icon="simple-icons:uptimekuma"
  description="The Uptime Kuma trigger sends push monitor heartbeats and status updates to your Uptime Kuma instance whenever container updates are processed."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_UPTIMEKUMA_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS Uptime Kuma push monitor URL (e.g. https://kuma.example.com/api/push/YOUR_KEY)">
    Uptime Kuma push monitor endpoint URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_UPTIMEKUMA_{trigger_name}_STATUS"
    required={false}
    type="enum"
    defaultValue="up"
    supported="`up`, `down`">
    Reported monitor status
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_UPTIMEKUMA_{trigger_name}_MSG"
    required={false}
    type="string">
    Custom status message displayed in Uptime Kuma (defaults to the rendered container update title and body)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_UPTIMEKUMA_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the notification title in default status message
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Basic Uptime Kuma Push Monitor

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_UPTIMEKUMA_HEARTBEAT_URL=https://kuma.example.com/api/push/abcdef123456789
      - WUD_TRIGGER_UPTIMEKUMA_HEARTBEAT_STATUS=up
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_UPTIMEKUMA_HEARTBEAT_URL="https://kuma.example.com/api/push/abcdef123456789" \
  -e WUD_TRIGGER_UPTIMEKUMA_HEARTBEAT_STATUS="up" \
  getwud/wud
```

</TabItem>
</Tabs>
