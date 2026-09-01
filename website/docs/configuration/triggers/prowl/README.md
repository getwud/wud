---
title: Prowl
description: Send container update push notifications to iOS devices via Prowl in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Prowl (iOS Push)

<DocHero
  icon="lucide:smartphone"
  description="The Prowl trigger lets you send instant push notifications to iOS devices using the Prowl public API."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_PROWL_{trigger_name}_APIKEY"
    required={true}
    type="string">
    Prowl 40-character API key generated from your Prowl account
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PROWL_{trigger_name}_PRIORITY"
    required={false}
    type="integer"
    defaultValue="0"
    supported="-2 (Very Low), -1 (Moderate), 0 (Normal), 1 (High), 2 (Emergency)">
    Notification urgency priority level
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PROWL_{trigger_name}_APPLICATION"
    required={false}
    type="string"
    defaultValue="WUD">
    Application name displayed in the notification header
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PROWL_{trigger_name}_OPENURL"
    required={false}
    type="url">
    Optional URL attached to the notification that can be opened directly when tapped on iOS
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PROWL_{trigger_name}_URL"
    required={false}
    type="url"
    defaultValue="https://api.prowlapp.com/publicapi/add">
    Prowl API endpoint URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PROWL_{trigger_name}_PROVIDERKEY"
    required={false}
    type="string">
    Optional Prowl provider key if required by your developer account
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PROWL_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the dynamic container title
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Basic Prowl Alert

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_PROWL_IPHONE_APIKEY=abcdef1234567890abcdef1234567890abcdef12
      - WUD_TRIGGER_PROWL_IPHONE_PRIORITY=1
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_PROWL_IPHONE_APIKEY="abcdef1234567890abcdef1234567890abcdef12" \
  -e WUD_TRIGGER_PROWL_IPHONE_PRIORITY="1" \
  getwud/wud
```

</TabItem>
</Tabs>
