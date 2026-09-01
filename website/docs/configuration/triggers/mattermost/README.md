---
title: Mattermost
description: Send container update notifications to Mattermost channels in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Mattermost

<DocHero
  icon="simple-icons:mattermost"
  description="The Mattermost trigger lets you send container update notifications to Mattermost channels using incoming webhooks."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_MATTERMOST_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS Mattermost incoming webhook URL">
    Mattermost incoming webhook URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MATTERMOST_{trigger_name}_CHANNEL"
    required={false}
    type="string">
    Target channel name (e.g. `town-square`, `@username`) to override the webhook default
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MATTERMOST_{trigger_name}_USERNAME"
    required={false}
    type="string"
    defaultValue="WUD">
    Display username for the notification bot
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MATTERMOST_{trigger_name}_ICONURL"
    required={false}
    type="url">
    Custom icon image URL for the bot
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MATTERMOST_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the notification title in message bodies
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Basic Webhook Notification

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_MATTERMOST_DEV_URL=https://mattermost.example.com/hooks/abcdef123456789
      - WUD_TRIGGER_MATTERMOST_DEV_CHANNEL=devops
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_MATTERMOST_DEV_URL="https://mattermost.example.com/hooks/abcdef123456789" \
  -e WUD_TRIGGER_MATTERMOST_DEV_CHANNEL="devops" \
  getwud/wud
```

</TabItem>
</Tabs>
