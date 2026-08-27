---
title: Telegram
description: Send container update notifications via Telegram bots in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Telegram

<DocHero
  icon="telegram"
  description="The telegram trigger delivers container update alerts directly to Telegram chats, groups, or channels via Telegram Bot API."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_TELEGRAM_{trigger_name}_BOTTOKEN"
    required={true}
    type="string"
    supported="Bot token from `@BotFather`">
    Telegram Bot API HTTP access token
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_TELEGRAM_{trigger_name}_CHATID"
    required={true}
    type="string"
    supported="Numeric chat ID (e.g. `987654321`) or `@channelusername`">
    Target Telegram chat ID or channel username
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_TELEGRAM_{trigger_name}_MESSAGEFORMAT"
    type="enum"
    required={false}
    defaultValue="Markdown"
    supported="`Markdown`, `HTML`">
    Message formatting parse mode
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_TELEGRAM_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Disable the default title heading to allow full custom message formatting
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_TELEGRAM_{trigger_name}_PROXY"
    required={false}
    type="url"
    supported="`socks5://user:pass@host:1080`, `http://user:pass@host:8118`">
    Route Telegram API calls through a dedicated SOCKS5/HTTP proxy
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Basic Telegram Notification

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_TELEGRAM_LOCAL_BOTTOKEN=123456789:AApFzFLD0g0NVg8l0bZf55ex3sajC4Aw84Q
      - WUD_TRIGGER_TELEGRAM_LOCAL_CHATID=987654321
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_TELEGRAM_LOCAL_BOTTOKEN="123456789:AApFzFLD0g0NVg8l0bZf55ex3sajC4Aw84Q" \
  -e WUD_TRIGGER_TELEGRAM_LOCAL_CHATID="987654321" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide

### 1. Create a Bot & Obtain a Bot Token
1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts to choose a bot name and username.
3. Copy the HTTP API token provided by BotFather into `WUD_TRIGGER_TELEGRAM_{trigger_name}_BOTTOKEN`.

### 2. Find Your Chat ID
1. Send a message to your newly created bot or add it to your target group.
2. Start a chat with [@userinfobot](https://t.me/userinfobot) or [@GetIDsBot](https://t.me/GetIDsBot) to see your numeric Chat ID.
3. Set your Chat ID as `WUD_TRIGGER_TELEGRAM_{trigger_name}_CHATID`.
