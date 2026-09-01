---
title: Bark
description: Send container update push notifications to iOS devices via Bark in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Bark (iOS Push)

<DocHero
  icon="lucide:bell-ring"
  description="The Bark trigger lets you send native iOS push notifications to your iPhone or iPad using the Bark server or cloud service."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_BARK_{trigger_name}_DEVICEKEY"
    required={true}
    type="string">
    Bark device key provided by your iOS Bark application
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_BARK_{trigger_name}_URL"
    required={false}
    type="url"
    defaultValue="https://api.day.app"
    supported="Valid HTTP/HTTPS Bark server URL">
    Bark server URL (defaults to official public server, or your self-hosted Bark instance)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_BARK_{trigger_name}_GROUP"
    required={false}
    type="string"
    defaultValue="WUD">
    Notification group name for notification clustering on iOS
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_BARK_{trigger_name}_ICON"
    required={false}
    type="url">
    Custom icon image URL to display on the iOS notification
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_BARK_{trigger_name}_SOUND"
    required={false}
    type="string">
    Custom alert ringtone/sound name available in Bark
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_BARK_{trigger_name}_BADGE"
    required={false}
    type="integer">
    Optional numeric badge count displayed on the Bark application icon
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_BARK_{trigger_name}_URLTOOPEN"
    required={false}
    type="url">
    URL to open when clicking the notification (defaults to the container changelog/registry link)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_BARK_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the notification title
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Basic Push Notification

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_BARK_IPHONE_DEVICEKEY=your_bark_device_key_here
      - WUD_TRIGGER_BARK_IPHONE_GROUP=Homelab
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_BARK_IPHONE_DEVICEKEY="your_bark_device_key_here" \
  -e WUD_TRIGGER_BARK_IPHONE_GROUP="Homelab" \
  getwud/wud
```

</TabItem>
</Tabs>
