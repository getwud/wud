---
title: ntfy
description: Send container update push notifications via ntfy in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ntfy

<DocHero
  icon="ntfy"
  description="The ntfy trigger sends push notifications to any ntfy.sh topic or self-hosted ntfy server with priority levels, tags, and action buttons."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption name="WUD_TRIGGER_NTFY_{trigger_name}_TOPIC"
    required={true}
    type="string"
    supported="Valid ntfy topic name">
    Target ntfy topic name
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NTFY_{trigger_name}_URL"
    required={false}
    type="url"
    defaultValue="https://ntfy.sh"
    supported="Valid HTTP/HTTPS URL">
    ntfy server base URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NTFY_{trigger_name}_PRIORITY"
    required={false}
    type="integer"
    defaultValue="3"
    supported="Integer between `1` (min) and `5` (max) [see docs](https://docs.ntfy.sh/publish/#message-priority)">
    ntfy notification priority
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_NTFY_{trigger_name}_AUTH_TOKEN"
    required={false}
    type="string"
    supported="Bearer token">
    Access token (for Bearer authentication on protected topics)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NTFY_{trigger_name}_AUTH_USER"
    required={false}
    type="string">
    Username (for Basic authentication)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NTFY_{trigger_name}_AUTH_PASSWORD"
    required={false}
    type="string">
    Password (for Basic authentication)
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Public ntfy.sh Service

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_NTFY_LOCAL_TOPIC=my_unique_wud_topic
      - WUD_TRIGGER_NTFY_LOCAL_PRIORITY=3
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_NTFY_LOCAL_TOPIC="my_unique_wud_topic" \
  -e WUD_TRIGGER_NTFY_LOCAL_PRIORITY=3 \
  getwud/wud
```

</TabItem>
</Tabs>

### Self-Hosted Protected ntfy Server

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_NTFY_LOCAL_URL=https://ntfy.example.com
      - WUD_TRIGGER_NTFY_LOCAL_TOPIC=alerts
      - WUD_TRIGGER_NTFY_LOCAL_AUTH_TOKEN=tk_1234567890abcdef
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_NTFY_LOCAL_URL="https://ntfy.example.com" \
  -e WUD_TRIGGER_NTFY_LOCAL_TOPIC="alerts" \
  -e WUD_TRIGGER_NTFY_LOCAL_AUTH_TOKEN="tk_1234567890abcdef" \
  getwud/wud
```

</TabItem>
</Tabs>
