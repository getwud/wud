# Discord
![logo](discord.png)

The `discord` trigger lets you send realtime notifications using [Discord](https://discord.com/) bots.

### Variables

| Env var                                          | Required       | Description                              | Supported values      | Default value when missing  |
|--------------------------------------------------|:--------------:|------------------------------------------|-----------------------|-----------------------------|
| `WUD_TRIGGER_DISCORD_{trigger_name}_URL`         | :red_circle:   | The Discord webhook URL                  | HTTPS URL             |                             |
| `WUD_TRIGGER_DISCORD_{trigger_name}_BOTUSERNAME` | :white_circle: | The bot username                         |                       | WUD                         |
| `WUD_TRIGGER_DISCORD_{trigger_name}_CARDCOLOR`   | :white_circle: | Color of the message card                | Color in decimal base | 65280                       |
| `WUD_TRIGGER_DISCORD_{trigger_name}_CARDLABEL`   | :white_circle: | Optional label to display in the message | String                |                             |

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
      - WUD_TRIGGER_DISCORD_1_URL=https://discord.com/api/webhooks/123/456
      - WUD_TRIGGER_DISCORD_1_BOTUSERNAME=WUD
```

#### **Docker**
```bash
docker run \
  -e WUD_TRIGGER_DISCORD_1_URL="https://discord.com/api/webhooks/123/456" \
  -e WUD_TRIGGER_DISCORD_1_BOTUSERNAME="WUD" \
  ...
  getwud/wud
```
<!-- tabs:end -->

### How to create a Discord webhook
[Follow this tutorial](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
