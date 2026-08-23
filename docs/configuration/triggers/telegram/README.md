# Telegram

![logo](telegram.png)

The `telegram` trigger lets you send real-time container update notifications via [Telegram](https://telegram.org/) bots.

### Variables

| Env var                                             | Required       | Description                                                                                             | Supported values                                               | Default value when missing |
|-----------------------------------------------------|:--------------:|---------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|----------------------------|
| `WUD_TRIGGER_TELEGRAM_{trigger_name}_BOTTOKEN`      | :red_circle:   | Telegram Bot API token                                                                                  | String                                                         |                            |
| `WUD_TRIGGER_TELEGRAM_{trigger_name}_CHATID`        | :red_circle:   | Target Telegram chat ID or channel username                                                             | String / Integer                                               |                            |
| `WUD_TRIGGER_TELEGRAM_{trigger_name}_DISABLETITLE`  | :white_circle: | Disable the default title heading to allow full custom message formatting                               | `true`, `false`                                                | `false`                    |
| `WUD_TRIGGER_TELEGRAM_{trigger_name}_MESSAGEFORMAT` | :white_circle: | Parse mode for custom message formatting                                                                | `Markdown`, `HTML`                                             | `Markdown`                 |
| `WUD_TRIGGER_TELEGRAM_{trigger_name}_PROXY`         | :white_circle: | Route Telegram API calls through a dedicated SOCKS5/HTTP proxy (all other WUD traffic remains direct)   | `socks5://user:pass@host:1080`, `http://user:pass@host:8118`   |                            |

?> This trigger also supports [common trigger configuration options](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Basic Configuration

<!-- tabs:start -->
#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_TELEGRAM_1_BOTTOKEN=0123456789:AApFzFLD0g0NVg8l0bZf55ex3sajC4Aw84Q
      - WUD_TRIGGER_TELEGRAM_1_CHATID=9876543210
```

#### **Docker**

```bash
docker run \
  -e WUD_TRIGGER_TELEGRAM_1_BOTTOKEN="0123456789:AApFzFLD0g0NVg8l0bZf55ex3sajC4Aw84Q" \
  -e WUD_TRIGGER_TELEGRAM_1_CHATID="9876543210" \
  ...
  getwud/wud
```
<!-- tabs:end -->

### How to create a bot and obtain the Bot Token
Use the official Telegram `@BotFather` bot to create a new bot and copy the HTTP API token. For step-by-step instructions, see [Generating a Telegram Bot Token](https://medium.com/geekculture/generate-telegram-token-for-bot-api-d26faf9bf064).

### How to find your Chat ID
To get your numeric Chat ID, send a message to `@userinfobot` or `@GetIDsBot` on Telegram, or follow [this Chat ID guide](https://www.alphr.com/find-chat-id-telegram/).

