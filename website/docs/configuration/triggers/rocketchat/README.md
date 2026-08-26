import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Rocket.Chat

![logo](rocketchat.svg)

The `rocketchat` trigger lets you post container update notifications to a Rocket.Chat channel or direct message.

### Variables

<ConfigList>
  <ConfigOption name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_AUTH_TOKEN"
    required={true}
    type="email">
    Personal Access Token (PAT) of the sending account
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_CHANNEL"
    type="enum"
    required={true}
    supported="Channel ID (`6561ce603d237c33797650d7`), channel name (`#example`), or username (`@example`)">
    Destination channel or user
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS URL">
    Rocket.Chat workspace URL (e.g., `https://chat.example.com`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_USER_ID"
    required={true}
    type="string">
    User ID of the account sending notifications (found when generating a Personal Access Token)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_ALIAS"
    required={false}
    type="string">
    Custom sender display name (requires `message-impersonate` permission, typically on the `bot` role)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_AVATAR"
    required={false}
    type="url"
    supported="Valid HTTP/HTTPS image URL">
    Custom sender avatar image URL (requires `message-impersonate` permission)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Disable the default title heading to allow full custom message formatting
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_EMOJI"
    type="string"
    required={false}
    supported="Emoji shortcode">
    Custom sender avatar emoji (e.g., `:whale:`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ROCKETCHAT_{trigger_name}_PARSE_URLS"
    required={false}
    type="boolean"
    defaultValue="true">
    Generate link previews when the message contains URLs
  </ConfigOption>
</ConfigList>
:::warning[The destination Rocket.Chat channel must already exist on the workspace; WUD will not create it automatically.]
:::

:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

:::info
See the [Rocket.Chat API documentation](https://developer.rocket.chat/apidocs/post-message) for additional details.
:::

### Examples

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_ROCKETCHAT_LOCAL_URL=https://chat.example.com
      - WUD_TRIGGER_ROCKETCHAT_LOCAL_USER_ID=jDdn8oh9BfJKnWdDY
      - WUD_TRIGGER_ROCKETCHAT_LOCAL_AUTH_TOKEN=Rbqz90hnkRyVwRfcmE5PzkP5Pqwml_fo7ZUXzxv2_zx
      - WUD_TRIGGER_ROCKETCHAT_LOCAL_CHANNEL=#wud
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_ROCKETCHAT_LOCAL_URL="https://chat.example.com" \
  -e WUD_TRIGGER_ROCKETCHAT_LOCAL_USER_ID="jDdn8oh9BfJKnWdDY" \
  -e WUD_TRIGGER_ROCKETCHAT_LOCAL_AUTH_TOKEN="Rbqz90hnkRyVwRfcmE5PzkP5Pqwml_fo7ZUXzxv2_zx" \
  -e WUD_TRIGGER_ROCKETCHAT_LOCAL_CHANNEL="#wud" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### How to obtain User ID and Personal Access Token

1. Log in to your Rocket.Chat workspace with the bot or sender account.
2. Click your avatar in the sidebar and select **Profile** (or **My Account**).
3. Select **Personal Access Tokens** in the left menu.
4. Enter a name for the token, check **Ignore Two-Factor Authentication**, and click **Add**.
5. Confirm your password or 2FA code.
6. Copy both the generated **User ID** and **Token** values.
