---
title: Discord
description: Send container update notifications to Discord channels in What's Up Docker (WUD).
---

import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Discord

![logo](discord.svg)

The `discord` trigger lets you send real-time container update notifications to Discord channels using incoming webhooks.

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_DISCORD_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTPS Discord webhook URL">
    Discord incoming webhook URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DISCORD_{trigger_name}_AVATARURL"
    required={false}
    type="url"
    supported="Valid HTTPS URL">
    Avatar image URL for the webhook bot
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DISCORD_{trigger_name}_BOTUSERNAME"
    required={false}
    type="string"
    defaultValue="WUD">
    Bot username displayed in the Discord channel
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DISCORD_{trigger_name}_CARDCOLOR"
    required={false}
    type="integer"
    defaultValue="65280">
    Embed card border color in decimal format (e.g. `65280` is green)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DISCORD_{trigger_name}_CARDLABEL"
    required={false}
    type="string">
    Optional label or environment tag to include in the embed message
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
      - WUD_TRIGGER_DISCORD_LOCAL_URL=https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
      - WUD_TRIGGER_DISCORD_LOCAL_BOTUSERNAME=WUD
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_DISCORD_LOCAL_URL="https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz" \
  -e WUD_TRIGGER_DISCORD_LOCAL_BOTUSERNAME="WUD" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Creating a Discord Webhook

1. Open your Discord server and navigate to **Server Settings** > **Integrations** > **Webhooks**.
2. Click **New Webhook** and select the channel where update notifications should be posted.
3. Copy the **Webhook URL** and configure it as `WUD_TRIGGER_DISCORD_{trigger_name}_URL`.
4. For additional details, see the [official Discord webhook guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks).
