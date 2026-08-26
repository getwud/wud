import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Telegram

![logo](telegram.svg)

The `telegram` trigger lets you send real-time container update notifications via [Telegram](https://telegram.org/) bots.

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_TELEGRAM_{trigger_name}_BOTTOKEN"
    required={true}
    type="string">
    Telegram Bot API token
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_TELEGRAM_{trigger_name}_CHATID"
    required={true}
    type="integer"
    supported="String / Integer">
    Target Telegram chat ID or channel username
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_TELEGRAM_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Disable the default title heading to allow full custom message formatting
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_TELEGRAM_{trigger_name}_MESSAGEFORMAT"
    type="enum"
    required={false}
    defaultValue="Markdown"
    supported="`Markdown`, `HTML`">
    Parse mode for custom message formatting
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_TELEGRAM_{trigger_name}_PROXY"
    required={false}
    type="url"
    supported="`socks5://user:pass@host:1080`, `http://user:pass@host:8118`">
    Route Telegram API calls through a dedicated SOCKS5/HTTP proxy (all other WUD traffic remains direct)
  </ConfigOption>
</ConfigList>
:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

### Examples

#### Basic Configuration

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_TELEGRAM_1_BOTTOKEN=0123456789:AApFzFLD0g0NVg8l0bZf55ex3sajC4Aw84Q
      - WUD_TRIGGER_TELEGRAM_1_CHATID=9876543210
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_TELEGRAM_1_BOTTOKEN="0123456789:AApFzFLD0g0NVg8l0bZf55ex3sajC4Aw84Q" \
  -e WUD_TRIGGER_TELEGRAM_1_CHATID="9876543210" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### How to create a bot and obtain the Bot Token

Use the official Telegram `@BotFather` bot to create a new bot and copy the HTTP API token. For step-by-step instructions, see [Generating a Telegram Bot Token](https://medium.com/geekculture/generate-telegram-token-for-bot-api-d26faf9bf064).

### How to find your Chat ID

To get your numeric Chat ID, send a message to `@userinfobot` or `@GetIDsBot` on Telegram, or follow [this Chat ID guide](https://www.alphr.com/find-chat-id-telegram/).
