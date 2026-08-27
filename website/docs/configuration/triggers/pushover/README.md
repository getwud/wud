---
title: Pushover
description: Send container update push notifications via Pushover in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Pushover

<DocHero
  icon="pushover"
  description="The pushover trigger sends instant push notifications to Android, iOS, and desktop devices via the Pushover API."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_PUSHOVER_{trigger_name}_USER"
    required={true}
    type="string"
    supported="30-character Pushover User Key">
    Pushover User Key (or Delivery Group Key)
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_PUSHOVER_{trigger_name}_TOKEN"
    required={true}
    type="string"
    supported="30-character Application API Token">
    Pushover Application API token
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PUSHOVER_{trigger_name}_DEVICE"
    required={false}
    type="string"
    supported="[Pushover device identifiers](https://pushover.net/api#identifiers)">
    Target device name(s) (comma-separated, e.g. `phone,tablet`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PUSHOVER_{trigger_name}_PRIORITY"
    required={false}
    type="integer"
    defaultValue="0"
    supported="Integer between `-2` and `2` [see docs](https://pushover.net/api#priority)">
    Notification priority level (`-2`: lowest, `-1`: quiet, `0`: normal, `1`: high, `2`: emergency)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PUSHOVER_{trigger_name}_SOUND"
    required={false}
    type="string"
    defaultValue="pushover"
    supported="[Supported Pushover sounds](https://pushover.net/api#sounds)">
    Notification alert sound
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PUSHOVER_{trigger_name}_HTML"
    required={false}
    type="integer"
    defaultValue="0"
    supported="`1` (enable HTML), `0` (plain text)">
    Enable HTML formatting in message body
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PUSHOVER_{trigger_name}_TTL"
    required={false}
    type="integer"
    supported="Seconds (e.g. `86400`)">
    Message Time-to-Live in seconds
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PUSHOVER_{trigger_name}_RETRY"
    required={false}
    type="integer"
    supported="Minimum 30 seconds">
    Notification retry interval in seconds (only when priority=`2`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PUSHOVER_{trigger_name}_EXPIRE"
    required={false}
    type="integer"
    supported="Maximum 86400 seconds">
    Notification expiration time in seconds (only when priority=`2`)
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
      - WUD_TRIGGER_PUSHOVER_LOCAL_USER=uQiRzpo4DXghDmr9QzzfQu27cmVRsG
      - WUD_TRIGGER_PUSHOVER_LOCAL_TOKEN=azGDORePK8gMaC0QOYAMyEEuzJnyUi
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_PUSHOVER_LOCAL_USER="uQiRzpo4DXghDmr9QzzfQu27cmVRsG" \
  -e WUD_TRIGGER_PUSHOVER_LOCAL_TOKEN="azGDORePK8gMaC0QOYAMyEEuzJnyUi" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Obtaining Pushover Credentials

1. Log in to your [Pushover Dashboard](https://pushover.net/) and copy your **User Key** (top right).
2. Scroll down to **Your Applications** and click **Create an Application / API Token**.
3. Name your application `WUD` and click **Create Application**.
4. Copy the generated **API Token** and set it as `WUD_TRIGGER_PUSHOVER_{trigger_name}_TOKEN`.
