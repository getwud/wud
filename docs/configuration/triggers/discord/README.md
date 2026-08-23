# Discord

![logo](discord.png)

The `discord` trigger lets you send real-time container update notifications to Discord channels using webhooks.

### Variables

| Env var                                          | Required       | Description                              | Supported values      | Default value when missing  |
|--------------------------------------------------|:--------------:|------------------------------------------|-----------------------|-----------------------------|
| `WUD_TRIGGER_DISCORD_{trigger_name}_URL`         | :red_circle:   | Discord incoming webhook URL             | Valid HTTPS URL       |                             |
| `WUD_TRIGGER_DISCORD_{trigger_name}_BOTUSERNAME` | :white_circle: | Bot username displayed in Discord        | String                | `WUD`                       |
| `WUD_TRIGGER_DISCORD_{trigger_name}_AVATARURL`   | :white_circle: | Avatar image URL for the webhook bot     | Valid HTTPS URL       |                             |
| `WUD_TRIGGER_DISCORD_{trigger_name}_CARDCOLOR`   | :white_circle: | Embed card color in decimal format       | Decimal integer       | `65280` (green)             |
| `WUD_TRIGGER_DISCORD_{trigger_name}_CARDLABEL`   | :white_circle: | Optional label/tag to include in message | String                |                             |

?> This trigger also supports [common trigger configuration options](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Send notifications to a Discord channel

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_DISCORD_1_URL=https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
      - WUD_TRIGGER_DISCORD_1_BOTUSERNAME=WUD
```

#### **Docker**
```bash
docker run \
  -e WUD_TRIGGER_DISCORD_1_URL="https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz" \
  -e WUD_TRIGGER_DISCORD_1_BOTUSERNAME="WUD" \
  ...
  getwud/wud
```
<!-- tabs:end -->

### How to create a Discord webhook
Follow the [official Discord webhook guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) to create a webhook URL in your server settings.

