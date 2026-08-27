---
title: Slack
description: Send container update notifications to Slack channels in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Slack

<DocHero
  icon="slack"
  description="The slack trigger posts rich message notifications to Slack channels using incoming webhooks."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption name="WUD_TRIGGER_SLACK_{trigger_name}_TOKEN"
    required={true}
    type="string"
    supported="`xoxb-...` or `xoxp-...`">
    Slack Bot or User OAuth access token
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SLACK_{trigger_name}_CHANNEL"
    required={true}
    type="string"
    supported="Channel name (`wud-updates`) or Channel ID (`C12345678`)">
    Target Slack channel name (without `#`) or channel ID
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SLACK_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Disable the default title heading to allow full custom message formatting
  </ConfigOption>
</ConfigList>

:::warning[Channel & Bot Membership]
The target Slack channel must already exist, and the WUD bot must be invited to private channels (`/invite @BotName`) for messages to post successfully.
:::

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Post Notifications to a Slack Channel

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_SLACK_LOCAL_TOKEN=xoxb-123456789-abcdef
      - WUD_TRIGGER_SLACK_LOCAL_CHANNEL=wud-notifications
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_SLACK_LOCAL_TOKEN="xoxb-123456789-abcdef" \
  -e WUD_TRIGGER_SLACK_LOCAL_CHANNEL="wud-notifications" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Creating a Slack Bot Token

1. Go to the [Slack API Apps Console](https://api.slack.com/apps) and click **Create New App** > **From scratch**.
2. Under **OAuth & Permissions** > **Scopes**, add the `chat:write` and `chat:write.public` bot token scopes.
3. Install the app to your workspace and copy the generated **Bot User OAuth Token** (`xoxb-...`).
4. Set the token as `WUD_TRIGGER_SLACK_{trigger_name}_TOKEN`.
