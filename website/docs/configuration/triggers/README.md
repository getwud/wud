---
title: Triggers
description: Overview of container update triggers, notification providers, and automations in What's Up Docker (WUD).
---

import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Triggers

Triggers perform automated actions (such as sending notifications or executing updates) whenever a new container version is discovered.

Triggers are configured using environment variables following this naming pattern:

```bash
WUD_TRIGGER_{trigger_type}_{trigger_name}_{configuration_item}=value
```

:::info[Multiple Instances Supported]
You can configure multiple triggers of the same type (for example, multiple SMTP or Discord destinations). Simply assign each one a distinct `{trigger_name}` identifier (e.g. `WUD_TRIGGER_DISCORD_DEV_URL`, `WUD_TRIGGER_DISCORD_PROD_URL`).
:::

---

## 📂 Trigger Categories

WUD supports 17+ triggers organized into three functional categories:

- **⚡ [Auto-Update & Orchestration](./docker/README.md)**: Automatically pull new images and recreate containers or trigger orchestrator restarts ([Docker](./docker/README.md), [Docker Compose](./docker-compose/README.md), [Nomad](./nomad/README.md)).
- **🔔 [Notifications & Chat](./discord/README.md)**: Send rich alert messages with update details ([Apprise](./apprise/README.md), [Discord](./discord/README.md), [Gotify](./gotify/README.md), [IFTTT](./ifttt/README.md), [Ntfy](./ntfy/README.md), [Pushover](./pushover/README.md), [Rocket.Chat](./rocketchat/README.md), [Slack](./slack/README.md), [SMTP Email](./smtp/README.md), [Telegram](./telegram/README.md)).
- **🛠 [Webhooks & Automation Pipelines](./http/README.md)**: Integrate with custom automation flows, Home Assistant, and message brokers ([Command](./command/README.md), [HTTP Webhooks](./http/README.md), [Kafka](./kafka/README.md), [MQTT](./mqtt/README.md)).

---

## Common Trigger Configuration

In addition to provider-specific settings, all triggers support the following common configuration variables:

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_AUTO"
    required={false}
    type="boolean"
    defaultValue="true">
    Whether to execute the trigger automatically (`false` requires manual execution via UI or API)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_BATCHTITLE"
    required={false}
    type="string"
    defaultValue="${containers.length} updates available"
    supported="String template with `${count}` placeholder">
    Template used to render the notification title in batch mode
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_INCLUDEBYDEFAULT"
    required={false}
    type="boolean"
    defaultValue="true">
    Associate trigger with all containers by default (`false` makes it opt-in via `wud.trigger.include`)
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_{trigger_type}_{trigger_name}_MODE"
    type="enum"
    required={false}
    defaultValue="simple"
    supported="`simple`, `batch`">
    Execution mode: trigger individually per container or batch all available updates into a single notification
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_ONCE"
    required={false}
    type="boolean"
    defaultValue="true">
    Execute trigger only once per detected update (prevents duplicate alerts on consecutive runs)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_SIMPLEBODY"
    required={false}
    type="string"
    defaultValue="Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? &quot;\\n&quot; + container.result.link : &quot;&quot;}"
    supported="JS string template with `container` object">
    Template used to render the notification body in simple mode
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_SIMPLETITLE"
    required={false}
    type="string"
    defaultValue="New ${container.updateKind.kind} found for container ${container.name}"
    supported="JS string template with `container` object">
    Template used to render the notification title in simple mode
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_{trigger_type}_{trigger_name}_THRESHOLD"
    type="enum"
    required={false}
    defaultValue="all"
    supported="`all`, `major`, `major-only`, `minor`, `minor-only`, `patch`">
    Minimum semver version bump required to fire the trigger
  </ConfigOption>
</ConfigList>

### Threshold Values

- **`all`**: Executes the trigger for all update types (including digests).
- **`major`**: Executes the trigger for `major`, `minor`, or `patch` semver updates.
- **`major-only`**: Executes the trigger only for `major` semver updates.
- **`minor`**: Executes the trigger for `minor` or `patch` semver updates.
- **`minor-only`**: Executes the trigger only for `minor` semver updates.
- **`patch`**: Executes the trigger only for `patch` semver updates.

---

## 🚀 Examples

### Customizing Notification Content

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_SMTP_GMAIL_SIMPLETITLE=Container $${container.name} can be updated
      - WUD_TRIGGER_SMTP_GMAIL_SIMPLEBODY=Container $${container.name} can be updated from $${container.updateKind.localValue} to $${container.updateKind.remoteValue}
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e 'WUD_TRIGGER_SMTP_GMAIL_SIMPLETITLE=Container ${container.name} can be updated' \
  -e 'WUD_TRIGGER_SMTP_GMAIL_SIMPLEBODY=Container ${container.name} can be updated from ${container.updateKind.localValue} to ${container.updateKind.remoteValue}' \
  getwud/wud
```

</TabItem>
</Tabs>
