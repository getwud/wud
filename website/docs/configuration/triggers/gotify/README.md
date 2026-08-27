---
title: Gotify
description: Send container update notifications to a Gotify push server in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Gotify

<DocHero
  icon="gotify"
  description="The gotify trigger sends real-time push notifications to self-hosted Gotify servers and clients."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_GOTIFY_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS URL">
    Gotify server base URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GOTIFY_{trigger_name}_TOKEN"
    required={true}
    type="string"
    supported="Valid Gotify application token">
    Gotify application token
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GOTIFY_{trigger_name}_PRIORITY"
    required={false}
    type="integer"
    defaultValue="5"
    supported="Integer >= `0`">
    Gotify notification priority level (0–10)
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Push Notifications to Gotify

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_GOTIFY_LOCAL_URL=http://gotify.example.com
      - WUD_TRIGGER_GOTIFY_LOCAL_TOKEN=AWp8A.TbBO3xpn4
      - WUD_TRIGGER_GOTIFY_LOCAL_PRIORITY=5
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_GOTIFY_LOCAL_URL="http://gotify.example.com" \
  -e WUD_TRIGGER_GOTIFY_LOCAL_TOKEN="AWp8A.TbBO3xpn4" \
  -e WUD_TRIGGER_GOTIFY_LOCAL_PRIORITY=5 \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Obtaining a Gotify Token

1. Log in to your **Gotify Web UI** as an administrator.
2. Navigate to the **Apps** tab and click **Create Application**.
3. Name your app (e.g. `WUD`) and click **Create**.
4. Copy the generated **Token** and set it as `WUD_TRIGGER_GOTIFY_{trigger_name}_TOKEN`.
