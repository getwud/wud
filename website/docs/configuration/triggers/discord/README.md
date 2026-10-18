---
title: Discord
description: Send container update notifications to Discord channels in WUD (What's Up Docker?).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Discord

<DocHero
  icon="discord"
  description="The discord trigger lets you send real-time container update notifications to Discord channels using incoming webhooks."
/>

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

---

## 🛡️ Upgrade Risk & Multi-Version Formatting (WUD Hub)

When connected to WUD Hub, Discord notifications are enhanced with automated risk analysis and multi-version upgrade insights.

### Risk Score Color Badges

The embed card border automatically reflects the evaluated risk level:

- 🟢 **Green / Low (`#2eb886` / `3061894`)**: Routine patch or minor release with no detected breaking changes (`🛡️ LOW`).
- 🟠 **Orange / Medium (`#e67e22` / `15105570`)**: Moderate update that may include deprecation notices or notable dependency bumps (`⚠️ MEDIUM`).
- 🔴 **Red / High & Critical (`#e74c3c` / `15158332`)**: High-risk updates (`⚡ HIGH`) or critical updates (`🚨 CRITICAL`) containing breaking changes, altered environment variables, or database migrations.
- 🟣 **Purple / Locked (`#9b59b6` / `10175195`)**: Multi-version leap requiring plan activation or in-depth review (`🔒 LOCKED`).

### Rich Embed Fields

When risk analysis is available, the Discord embed includes structured fields:

- **Risk Level**: Displays the risk indicator emoji and status (e.g. `🛡️ LOW`, `⚠️ MEDIUM`, `⚡ HIGH`, `🚨 CRITICAL`, `🔒 LOCKED`).
- **Skipped Versions**: Highlights intermediate releases skipped during the upgrade with tag progression (e.g. `+2 versions (1.0.0 ➔ 1.2.0)`).
- **Summary**: Concise synopsis of changes from the release changelog.
- **Breaking Changes**: Bullet list (`• ...`) of detected breaking changes between the current and target versions.
- **DB / Storage Impact**: High-visibility alert for schema migrations or storage alterations.
- **Release Notes**: Direct link to the upstream changelog.
- **Review Update Button**: Markdown link button (`[ 🔍 Review Update in WUD ](url)`) deep-linking into the WUD web UI to inspect the upgrade journey and run pre-flight safety checks.
