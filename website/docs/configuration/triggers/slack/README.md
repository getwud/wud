import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Slack

![logo](slack.svg)

The `slack` trigger lets you post container update notifications to a Slack channel.

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_SLACK_{trigger_name}_CHANNEL"
    required={true}
    type="string">
    Target Slack channel name (without `#`) or channel ID
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_SLACK_{trigger_name}_TOKEN"
    required={true}
    type="email">
    Slack Bot / User OAuth token (e.g., `xoxb-...` or `xoxp-...`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SLACK_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Disable the default title heading to allow full custom message formatting
  </ConfigOption>
</ConfigList>
:::warning[The Slack channel must already exist on your workspace; WUD will not create it automatically.]
:::

:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
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
      - WUD_TRIGGER_SLACK_LOCAL_TOKEN=xoxb-123456789-abcdef
      - WUD_TRIGGER_SLACK_LOCAL_CHANNEL=wud-notifications
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_SLACK_LOCAL_TOKEN="xoxb-123456789-abcdef" \
  -e WUD_TRIGGER_SLACK_LOCAL_CHANNEL="wud-notifications" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
