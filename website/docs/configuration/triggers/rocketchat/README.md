---
title: Rocket.Chat
description: Post container update notifications to Rocket.Chat channels or direct messages in What's Up Docker (WUD).
---

import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Rocket.Chat

![logo](rocketchat.svg)

The `rocketchat` trigger lets you post container update notifications to a [Rocket.Chat](https://rocket.chat/) channel or direct message using Personal Access Tokens (PAT).

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS URL">
    Rocket.Chat workspace URL (e.g. `https://chat.example.com`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_USER_ID"
    required={true}
    type="string">
    User ID of the sending account
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_AUTH_TOKEN"
    required={true}
    type="string">
    Personal Access Token (PAT) of the sending account
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_CHANNEL"
    type="string"
    required={true}
    supported="Channel ID (`6561ce603d237c33797650d7`), channel name (`#example`), or username (`@example`)">
    Destination channel or user
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_ALIAS"
    required={false}
    type="string">
    Custom sender display name (requires `message-impersonate` permission on the bot account)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_AVATAR"
    required={false}
    type="url"
    supported="Valid HTTP/HTTPS image URL">
    Custom sender avatar image URL
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_EMOJI"
    type="string"
    required={false}
    supported="Emoji shortcode (e.g. `:whale:`)">
    Custom sender avatar emoji
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Disable the default title heading to allow full custom message formatting
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_PARSE_URLS"
    required={false}
    type="boolean"
    defaultValue="true">
    Generate link previews when message contains URLs
  </ConfigOption>
</ConfigList>

:::warning[Channel Pre-creation Required]
The destination channel must already exist on your Rocket.Chat workspace; WUD will not create missing channels automatically.
:::

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Post to a Public Channel

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_ROCKETCHAT_LOCAL_URL=https://chat.example.com
      - WUD_TRIGGER_ROCKETCHAT_LOCAL_USER_ID=myUserId123
      - WUD_TRIGGER_ROCKETCHAT_LOCAL_AUTH_TOKEN=mySecretPatToken
      - WUD_TRIGGER_ROCKETCHAT_LOCAL_CHANNEL=#devops-alerts
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_ROCKETCHAT_LOCAL_URL="https://chat.example.com" \
  -e WUD_TRIGGER_ROCKETCHAT_LOCAL_USER_ID="myUserId123" \
  -e WUD_TRIGGER_ROCKETCHAT_LOCAL_AUTH_TOKEN="mySecretPatToken" \
  -e WUD_TRIGGER_ROCKETCHAT_LOCAL_CHANNEL="#devops-alerts" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Generating a Personal Access Token

1. Log in to Rocket.Chat and click your avatar (top left) > **My Account**.
2. Select **Personal Access Tokens**.
3. Enter a token name (e.g. `WUD`) and click **Add**.
4. Copy the generated **User ID** and **Token** values into your WUD configuration.
