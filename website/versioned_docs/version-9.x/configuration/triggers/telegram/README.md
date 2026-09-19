---
title: Telegram
description: Send container update notifications via Telegram bots in WUD (What's Up Docker?).
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
    name="WUD_TRIGGER_TELEGRAM_{trigger_name}_MESSAGE_THREAD_ID"
    required={false}
    type="integer | string"
    supported="Numeric message thread ID (e.g. `42`)">
    Unique identifier for the target message thread (topic) of the forum supergroup
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

### Send Notifications to a Topic (Forum Supergroup)

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_TELEGRAM_LOCAL_BOTTOKEN=123456789:AApFzFLD0g0NVg8l0bZf55ex3sajC4Aw84Q
      - WUD_TRIGGER_TELEGRAM_LOCAL_CHATID=-1001234567890
      - WUD_TRIGGER_TELEGRAM_LOCAL_MESSAGE_THREAD_ID=42
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_TELEGRAM_LOCAL_BOTTOKEN="123456789:AApFzFLD0g0NVg8l0bZf55ex3sajC4Aw84Q" \
  -e WUD_TRIGGER_TELEGRAM_LOCAL_CHATID="-1001234567890" \
  -e WUD_TRIGGER_TELEGRAM_LOCAL_MESSAGE_THREAD_ID="42" \
  getwud/wud
```

</TabItem>
<TabItem value="container-label" label="Per-Container Override">

```yaml
services:
  my-app:
    image: my-app:1.2.0
    labels:
      - wud.trigger.telegram.local.message_thread_id=42
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

### 3. Find Your Message Thread ID (Topic)

If you are posting to a specific topic within a forum supergroup:

1. In Telegram Desktop, right-click the topic and select **Copy Link to Topic**.
2. The copied link will be in the format `https://t.me/c/1234567890/42`.
3. The last number (`42`) is the `MESSAGE_THREAD_ID`.
