import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';

# Discord

![logo](discord.svg)

The `discord` trigger lets you send real-time container update notifications to Discord channels using webhooks.

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_DISCORD_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTPS URL">
    Discord incoming webhook URL.
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DISCORD_{trigger_name}_AVATARURL"
    required={false}
    type="url"
    supported="Valid HTTPS URL">
    Avatar image URL for the webhook bot.
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DISCORD_{trigger_name}_BOTUSERNAME"
    required={false}
    type="string"
    defaultValue="WUD">
    Bot username displayed in the Discord channel.
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DISCORD_{trigger_name}_CARDCOLOR"
    required={false}
    type="integer"
    defaultValue="65280">
    Embed card color in decimal format (`65280` is green).
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DISCORD_{trigger_name}_CARDLABEL"
    required={false}
    type="string">
    Optional label or tag to include in the message.
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

### Examples

#### Send notifications to a Discord channel

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_DISCORD_1_URL=https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
      - WUD_TRIGGER_DISCORD_1_BOTUSERNAME=WUD
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_DISCORD_1_URL="https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz" \
  -e WUD_TRIGGER_DISCORD_1_BOTUSERNAME="WUD" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### How to create a Discord webhook

Follow the [official Discord webhook guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) to create a webhook URL in your server settings.
