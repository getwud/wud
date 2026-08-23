# Slack

![logo](slack.png)

The `slack` trigger lets you post container update notifications to a Slack channel.

### Variables

| Env var                                         |    Required    | Description                                                               | Supported values | Default value when missing |
| ----------------------------------------------- | :------------: | ------------------------------------------------------------------------- | ---------------- | -------------------------- |
| `WUD_TRIGGER_SLACK_{trigger_name}_TOKEN`        |  :red_circle:  | Slack Bot / User OAuth token (e.g., `xoxb-...` or `xoxp-...`)             | String           |                            |
| `WUD_TRIGGER_SLACK_{trigger_name}_CHANNEL`      |  :red_circle:  | Target Slack channel name (without `#`) or channel ID                     | String           |                            |
| `WUD_TRIGGER_SLACK_{trigger_name}_DISABLETITLE` | :white_circle: | Disable the default title heading to allow full custom message formatting | `true`, `false`  | `false`                    |

!> The Slack channel must already exist on your workspace; WUD will not create it automatically.

?> This trigger also supports [common trigger configuration options](configuration/triggers/?id=common-trigger-configuration).

### Examples

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_SLACK_LOCAL_TOKEN=xoxb-123456789-abcdef
      - WUD_TRIGGER_SLACK_LOCAL_CHANNEL=wud-notifications
```

#### **Docker**

```bash
docker run \
  -e WUD_TRIGGER_SLACK_LOCAL_TOKEN="xoxb-123456789-abcdef" \
  -e WUD_TRIGGER_SLACK_LOCAL_CHANNEL="wud-notifications" \
  ...
  getwud/wud
```

<!-- tabs:end -->
