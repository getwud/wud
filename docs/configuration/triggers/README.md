# Triggers

Triggers are responsible for performing actions when a new container version is found.
  
Triggers are enabled using environment variables.

```bash
WUD_TRIGGER_{{ trigger_type }}_{{trigger_name }}_{{ trigger_configuration_item }}=XXX
```

!> Multiple triggers of the same type can be configured (for example multiple Smtp addresses).  
You just need to give them different names.

?> See the _Triggers_ subsection to discover which triggers are implemented and how to use them.

### Common trigger configuration
All implemented triggers, in addition to their specific configuration, also support the following common configuration variables.

| Env var                                                 |    Required    | Description                                                                                   | Supported values                                                                                                        | Default value when missing                                                                                                                                                                          |
|---------------------------------------------------------|:--------------:|-----------------------------------------------------------------------------------------------|----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_AUTO`        | :white_circle: | `true` to automatically execute the trigger. `false` to manually execute it (from UI, API...) | `true`, `false`                              | `true`                                                                                                                                                                                                                                                                         |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_BATCHTITLE`  | :white_circle: | The template to use to render the title of the notification (batch mode)                      | String template with placeholders `${count}` | `${containers.length} updates available`                                                                                                                                                                                                                                       |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_MODE`        | :white_circle: | Trigger for each container update or trigger once with all available updates as a list        | `simple`, `batch`                            | `simple`                                                                                                                                                                                                                                                                       |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_ONCE`        | :white_circle: | Run trigger once (do not repeat previous results)                                             | `true`, `false`                              | `true`                                                                                                                                                                                                                                                                         |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_SIMPLEBODY`  | :white_circle: | The template to use to render the body of the notification                                    | JS string template with vars `container`     | `Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}` |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_SIMPLETITLE` | :white_circle: | The template to use to render the title of the notification (simple mode)                     | JS string template with vars `${containers}` | `New ${container.updateKind.kind} found for container ${container.name}`                                                                                                                                                                                                       |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_THRESHOLD`   | :white_circle: | The threshold to reach to run the trigger                                                     | `all`, `major`, `major-only`, `minor`, `minor-only`, `patch`             | `all`                                                                                                                                                                                                                                                                          |

?> Threshold `all` means that the trigger will run regardless of the nature of the change

?> Threshold `major` means that the trigger will run only if this is a `major`, `minor` or `patch` semver change 

?> Threshold `major-only` means that the trigger will run only if this is a `major` semver change

?> Threshold `minor` means that the trigger will run only if this is a `minor` or `patch` semver change

?> Threshold `minor-only` means that the trigger will run only if this is a `minor` semver change

?> Threshold `patch` means that the trigger will run only if this is a `patch` semver change

?> `WUD_TRIGGER_{trigger_type}_{trigger_name}_ONCE=false` can be useful when `WUD_TRIGGER_{trigger_type}_{trigger_name}_MODE=batch` to get a report with all pending updates.

### Examples

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_SMTP_GMAIL_SIMPLETITLE=Container $${container.name} can be updated
      - WUD_TRIGGER_SMTP_GMAIL_SIMPLEBODY=Container $${name} can be updated from $${local.substring(0, 15)} to $${remote.substring(0, 15)}
```
#### **Docker**
```bash
docker run \
  -e 'WUD_TRIGGER_SMTP_GMAIL_SIMPLETITLE=Container ${container.name} can be updated' \
  -e 'WUD_TRIGGER_SMTP_GMAIL_SIMPLEBODY=Container ${name} can be updated from ${local.substring(0, 15)} to ${remote.substring(0, 15)}'
  ...
  getwud/wud
```
<!-- tabs:end -->
