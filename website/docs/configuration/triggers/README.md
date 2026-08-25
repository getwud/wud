import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Triggers

Triggers perform automated actions (such as sending notifications or executing updates) whenever a new container version is discovered.

Triggers are configured using environment variables following this naming pattern:

```bash
WUD_TRIGGER_{trigger_type}_{trigger_name}_{configuration_item}=value
```

:::warning
You can configure multiple triggers of the same type (for example, multiple SMTP destinations). Simply assign each one a distinct trigger name.
:::

:::info
Check the individual trigger pages in the sidebar to see configuration details and examples for each supported service.
:::

### Common Trigger Configuration

In addition to provider-specific settings, all triggers support the following common configuration variables:

| Env var                                                      |    Required    | Description                                                                                                  | Supported values                                             | Default value when missing                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------ | :------------: | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_AUTO`             | :white_circle: | Whether to execute the trigger automatically (`false` requires manual execution via UI or API)               | `true`, `false`                                              | `true`                                                                                                                                                                                                                                                                         |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_BATCHTITLE`       | :white_circle: | Template used to render the notification title in batch mode                                                 | String template with `${count}` placeholder                  | `${containers.length} updates available`                                                                                                                                                                                                                                       |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_INCLUDEBYDEFAULT` | :white_circle: | Associate trigger with all containers by default (`false` makes it opt-in via `wud.trigger.include`)         | `true`, `false`                                              | `true`                                                                                                                                                                                                                                                                         |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_MODE`             | :white_circle: | Execution mode: trigger individually per container or batch all available updates into a single notification | `simple`, `batch`                                            | `simple`                                                                                                                                                                                                                                                                       |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_ONCE`             | :white_circle: | Execute trigger only once per detected update (prevents duplicate alerts on consecutive runs)                | `true`, `false`                                              | `true`                                                                                                                                                                                                                                                                         |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_SIMPLEBODY`       | :white_circle: | Template used to render the notification body in simple mode                                                 | JS string template with `container` object                   | `Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}` |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_SIMPLETITLE`      | :white_circle: | Template used to render the notification title in simple mode                                                | JS string template with `container` object                   | `New ${container.updateKind.kind} found for container ${container.name}`                                                                                                                                                                                                       |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_THRESHOLD`        | :white_circle: | Minimum semver version bump required to fire the trigger                                                     | `all`, `major`, `major-only`, `minor`, `minor-only`, `patch` | `all`                                                                                                                                                                                                                                                                          |

:::info
Threshold `all`: Executes the trigger for all update types (including digests).
:::

:::info
Threshold `major`: Executes the trigger for `major`, `minor`, or `patch` semver updates.
:::

:::info
Threshold `major-only`: Executes the trigger only for `major` semver updates.
:::

:::info
Threshold `minor`: Executes the trigger for `minor` or `patch` semver updates.
:::

:::info
Threshold `minor-only`: Executes the trigger only for `minor` semver updates.
:::

:::info
Threshold `patch`: Executes the trigger only for `patch` semver updates.
:::

:::info
Setting `ONCE=false` combined with `MODE=batch` is useful for generating periodic summary digests of all available pending updates.
:::

:::info
Setting `INCLUDEBYDEFAULT=false` creates an opt-in trigger that only fires for containers explicitly listing it in their `wud.trigger.include` label.
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
      - WUD_TRIGGER_SMTP_GMAIL_SIMPLETITLE=Container $${container.name} can be updated
      - WUD_TRIGGER_SMTP_GMAIL_SIMPLEBODY=Container $${container.name} can be updated from $${container.updateKind.localValue} to $${container.updateKind.remoteValue}
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e 'WUD_TRIGGER_SMTP_GMAIL_SIMPLETITLE=Container ${container.name} can be updated' \
  -e 'WUD_TRIGGER_SMTP_GMAIL_SIMPLEBODY=Container ${container.name} can be updated from ${container.updateKind.localValue} to ${container.updateKind.remoteValue}' \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
