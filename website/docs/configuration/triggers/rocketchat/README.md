import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Rocket.Chat

![logo](rocketchat.png)

The `rocketchat` trigger lets you post container update notifications to a Rocket.Chat channel or direct message.

### Variables

| Env var                                              |    Required    | Description                                                                                         | Supported values                                                                             | Default value when missing |
| ---------------------------------------------------- | :------------: | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------- |
| `WUD_TRIGGER_ROCKETCHAT_{trigger_name}_URL`          |  :red_circle:  | Rocket.Chat workspace URL (e.g., `https://chat.example.com`)                                        | Valid HTTP/HTTPS URL                                                                         |                            |
| `WUD_TRIGGER_ROCKETCHAT_{trigger_name}_USER_ID`      |  :red_circle:  | User ID of the account sending notifications (found when generating a Personal Access Token)        | String                                                                                       |                            |
| `WUD_TRIGGER_ROCKETCHAT_{trigger_name}_AUTH_TOKEN`   |  :red_circle:  | Personal Access Token (PAT) of the sending account                                                  | String                                                                                       |                            |
| `WUD_TRIGGER_ROCKETCHAT_{trigger_name}_CHANNEL`      |  :red_circle:  | Destination channel or user                                                                         | Channel ID (`6561ce603d237c33797650d7`), channel name (`#example`), or username (`@example`) |                            |
| `WUD_TRIGGER_ROCKETCHAT_{trigger_name}_ALIAS`        | :white_circle: | Custom sender display name (requires `message-impersonate` permission, typically on the `bot` role) | String                                                                                       |                            |
| `WUD_TRIGGER_ROCKETCHAT_{trigger_name}_AVATAR`       | :white_circle: | Custom sender avatar image URL (requires `message-impersonate` permission)                          | Valid HTTP/HTTPS image URL                                                                   |                            |
| `WUD_TRIGGER_ROCKETCHAT_{trigger_name}_EMOJI`        | :white_circle: | Custom sender avatar emoji (e.g., `:whale:`)                                                        | Emoji shortcode                                                                              |                            |
| `WUD_TRIGGER_ROCKETCHAT_{trigger_name}_PARSE_URLS`   | :white_circle: | Generate link previews when the message contains URLs                                               | `true`, `false`                                                                              | `true`                     |
| `WUD_TRIGGER_ROCKETCHAT_{trigger_name}_DISABLETITLE` | :white_circle: | Disable the default title heading to allow full custom message formatting                           | `true`, `false`                                                                              | `false`                    |

:::warning
The destination Rocket.Chat channel must already exist on the workspace; WUD will not create it automatically.
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
