---
title: Triggers
description: Overview of container update triggers, notification providers, and automations in WUD (What's Up Docker?).
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

WUD supports 30+ triggers organized into three functional categories:

- **⚡ [Auto-Update & Orchestration](./docker/README.md)**: Automatically pull new images and recreate containers or trigger orchestrator restarts ([Docker](./docker/README.md), [Docker Compose](./docker-compose/README.md), [Nomad](./nomad/README.md)).
- **🔔 [Notifications & Chat](./discord/README.md)**: Send rich alert messages with update details ([Apprise](./apprise/README.md), [Bark](./bark/README.md), [Discord](./discord/README.md), [Gotify](./gotify/README.md), [IFTTT](./ifttt/README.md), [Matrix](./matrix/README.md), [Mattermost](./mattermost/README.md), [Ntfy](./ntfy/README.md), [Opsgenie](./opsgenie/README.md), [PagerDuty](./pagerduty/README.md), [Prowl](./prowl/README.md), [Pushover](./pushover/README.md), [Rocket.Chat](./rocketchat/README.md), [Signal](./signal/README.md), [Slack](./slack/README.md), [SMTP Email](./smtp/README.md), [Telegram](./telegram/README.md), [WhatsApp](./whatsapp/README.md), [Zulip](./zulip/README.md)).
- **🛠 [Webhooks & Automation Pipelines](./http/README.md)**: Integrate with custom automation flows, Home Assistant, and message brokers ([AMQP (RabbitMQ)](./amqp/README.md), [Command](./command/README.md), [GitHub Actions](./githubactions/README.md), [GitLab CI](./gitlabci/README.md), [Home Assistant](./homeassistant/README.md), [HTTP Webhooks](./http/README.md), [Kafka](./kafka/README.md), [MQTT](./mqtt/README.md), [NATS](./nats/README.md), [Uptime Kuma](./uptimekuma/README.md)).

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
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_EVENTS"
    required={false}
    type="string"
    defaultValue="available"
    supported="Comma-separated string of `available`, `pre`, `success`, `failure`, `rollback`">
    Subscribed container update lifecycle events. Can be overridden per container via `wud.trigger.events` or `wud.trigger.<name>.events`.
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_FAILUREBODY"
    required={false}
    type="string"
    defaultValue="Container ${container.name} update failed: ${error}"
    supported="JS string template with `container` object and `error` string">
    Template used to render the notification body when an update fails
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_FAILURETITLE"
    required={false}
    type="string"
    defaultValue="Update FAILED for ${container.name}"
    supported="JS string template with `container` object">
    Template used to render the notification title when an update fails
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_INCLUDEBYDEFAULT"
    required={false}
    type="boolean"
    defaultValue="true">
    Associate trigger with all containers by default (`false` makes it opt-in via container labels or `wud.trigger.include`)
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
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_ONDIGEST"
    required={false}
    type="boolean"
    defaultValue="true">
    Enable or disable notifications when only the image digest has changed (without semver tag bump)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_ROLLBACKBODY"
    required={false}
    type="string"
    defaultValue="Container ${name} was rolled back from ${newImageRef} to ${oldImageRef} (reason: ${reason})."
    supported="JS string template with `name`, `scope`, `status`, `reason`, `oldImageRef`, `newImageRef`, `archiveName`, `error_step`, `error_message`, `services` and `container`">
    Template used to render the body of a rollback notification (both success and failure are produced by the same template)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_ROLLBACKTITLE"
    required={false}
    type="string"
    defaultValue="Rollback of ${name}"
    supported="JS string template with `name`, `scope`, `status`, `reason`, `oldImageRef`, `newImageRef`, `archiveName`, `error_step`, `error_message`, `services` and `container`">
    Template used to render the title of a rollback notification
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

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_SUCCESSBODY"
    required={false}
    type="string"
    defaultValue="Container ${container.name} has been successfully updated."
    supported="JS string template with `container` object">
    Template used to render the notification body when an update is successful
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_{trigger_type}_{trigger_name}_SUCCESSTITLE"
    required={false}
    type="string"
    defaultValue="Update SUCCESS for ${container.name}"
    supported="JS string template with `container` object">
    Template used to render the notification title when an update is successful
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

## 📝 Template Placeholders & Variables

Trigger titles and bodies (`SIMPLETITLE`, `SIMPLEBODY`, `BATCHTITLE`, `BATCHBODY`, `SUCCESSTITLE`, `SUCCESSBODY`, `FAILURETITLE`, `FAILUREBODY`, `ROLLBACKTITLE`, `ROLLBACKBODY`) are evaluated as JavaScript template literals against the container update data.

### Simple Mode Variables

In simple mode (`MODE=simple`), all container properties are accessible via the `container` object:

| Property | Description | Example |
| :--- | :--- | :--- |
| `container.name` | Monitored container name | `nginx` |
| `container.watcher` | Watcher or host name that discovered the container | `local`, `host1`, `prod` |
| `container.id` | Unique container ID | `9d5fa8b3c10a` |
| `container.updateKind.kind` | Update category (`tag` or `digest`) | `tag` |
| `container.updateKind.localValue` | Current local tag or short digest | `1.25.0` |
| `container.updateKind.remoteValue` | Target remote tag or short digest | `1.26.0` |
| `container.updateKind.semverDiff` | Semver difference level | `major`, `minor`, `patch` |
| `container.result.link` | Changelog or registry link (if available) | `https://...` |

:::tip[Multi-Host Notifications]
When monitoring multiple Docker daemons or remote hosts using distinct watchers (e.g. `WUD_WATCHER_HOST1_...`, `WUD_WATCHER_HOST2_...`), include `$${container.watcher}` in your `SIMPLEBODY` or `SIMPLETITLE` to identify which host discovered the update.
:::

### Batch Mode Variables

In batch mode (`MODE=batch`), multiple container updates are grouped into a single notification:

| Property | Description | Example |
| :--- | :--- | :--- |
| `containers` | Array of updated `container` objects | `[ { name: 'web', ... }, ... ]` |
| `containers.length` | Total number of containers with available updates | `3` |

---

## 🎯 Container Trigger Filtering & Precedence

You can control which triggers execute for a given container by attaching labels (or annotations/metadata) directly to your workload.

### Precedence Order

When evaluating whether a trigger applies to a container, WUD checks rules in the following 3-level order:

| Level | Rule | Example Label | Effect |
| :--- | :--- | :--- | :--- |
| **1. Specific Trigger** (Highest) | `wud.trigger.<type>.<name>.enabled` | `wud.trigger.docker.autoupdate.enabled=true` | Explicitly enables or disables this specific trigger instance, ignoring all lower-level settings. |
| **2. Trigger Type** | `wud.trigger.<type>.enabled` | `wud.trigger.docker.enabled=false` | Enables or disables all triggers of that type (e.g. all `docker` updaters or all `telegram` notifications). |
| **3. Global Filters & Defaults** | `wud.trigger.include` / `wud.trigger.exclude` / `INCLUDEBYDEFAULT` | `wud.trigger.include=docker.autoupdate` | Evaluates legacy include/exclude lists. If no labels apply, falls back to the trigger's `INCLUDEBYDEFAULT` configuration. |

:::info[Supported Prefixes]
Labels can be formatted using `wud.trigger.<...>` (Docker / Docker Compose), `getwud.app/trigger.<...>` (Kubernetes, Swarm, Nomad), or `trigger.<...>`.
:::

### Concrete Use Case: Targeted Auto-Update Opt-In

A common workflow is to keep auto-updates disabled globally, while selectively enabling auto-updates for specific containers:

1. **Configure your auto-update trigger with `INCLUDEBYDEFAULT=false`**:

   ```bash
   # Update trigger is registered, but does NOT run on containers by default
   WUD_TRIGGER_DOCKER_AUTOUPDATE_AUTO=true
   WUD_TRIGGER_DOCKER_AUTOUPDATE_INCLUDEBYDEFAULT=false

   # Notification triggers remain enabled by default
   WUD_TRIGGER_TELEGRAM_NOTIFY_AUTO=true
   WUD_TRIGGER_TELEGRAM_NOTIFY_INCLUDEBYDEFAULT=true
   ```

2. **Opt-in specific containers using the granular label**:

   ```yaml
   services:
     web:
       image: nginx:latest
       labels:
         # Only this container is auto-updated; telegram notifications still fire for all containers
         - "wud.trigger.docker.autoupdate.enabled=true"

     database:
       image: postgres:16
       # No label: will receive telegram notification, but will NOT be auto-updated
   ```

:::tip[Granular Labels vs wud.trigger.include]
The legacy `wud.trigger.include` label acts as an exclusive allowlist: setting `wud.trigger.include=docker.autoupdate` would disable all other triggers (including Telegram notifications) for that container. Granular labels (`wud.trigger.<type>.<name>.enabled=true|false`) allow targeted opt-in or opt-out without interfering with other triggers.
:::

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
      - WUD_TRIGGER_SMTP_GMAIL_SIMPLEBODY=Container $${container.name} on host $${container.watcher} can be updated from $${container.updateKind.localValue} to $${container.updateKind.remoteValue}
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e 'WUD_TRIGGER_SMTP_GMAIL_SIMPLETITLE=Container ${container.name} can be updated' \
  -e 'WUD_TRIGGER_SMTP_GMAIL_SIMPLEBODY=Container ${container.name} on host ${container.watcher} can be updated from ${container.updateKind.localValue} to ${container.updateKind.remoteValue}' \
  getwud/wud
```

</TabItem>
</Tabs>
