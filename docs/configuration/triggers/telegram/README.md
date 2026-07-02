# Telegram

![logo](telegram.png)

The `telegram` trigger lets you send realtime notifications using [Telegram](https://telegram.org/) bots.

### Variables

| Env var                                        | Required       | Description   | Supported values                                                                                   | Default value when missing  |
|------------------------------------------------|:--------------:|---------------| -------------------------------------------------------------------------------------------------- |-----------------------------|
| `WUD_TRIGGER_TELEGRAM_{trigger_name}_BOTTOKEN` | :red_circle:   | The Bot token |                                                                                                    |                             |
| `WUD_TRIGGER_TELEGRAM_{trigger_name}_CHATID`   | :red_circle:   | The Chat ID   |                                                                                                    |                             |
| `WUD_TRIGGER_TELEGRAM_{trigger_name}_DISABLETITLE`   |  :white_circle:  | Disable title to have full control over the message formatting   |    `true`, `false`| `false`  |
| `WUD_TRIGGER_TELEGRAM_{trigger_name}_MESSAGEFORMAT`   | :white_circle: | Send the message as markdown or as html (useful for custom message formatting) | `Markdown`, `HTML`  | `Markdown` |
| `WUD_TRIGGER_TELEGRAM_{trigger_name}_PROXY`   | :white_circle: | Route Telegram API calls through a dedicated SOCKS5/HTTP proxy (all other WUD traffic stays direct) | `socks5://user:pass@host:1080`, `http://user:pass@host:8118`  |  |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Configuration
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

### How to create a bot and get the bot token

[Follow this tutorial](https://medium.com/geekculture/generate-telegram-token-for-bot-api-d26faf9bf064)

### How to get the chat id

[Follow this tutorial](https://www.alphr.com/find-chat-id-telegram/)
