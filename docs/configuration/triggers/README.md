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

| Env var                                                    |    Required    | Description                                                                            | Supported values                                                                                                     | Default value when missing                                                                       |
|------------------------------------------------------------|:--------------:|----------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_MODE`        | :white_circle: | Trigger for each container update or trigger once with all available updates as a list | `simple`, `batch`                                                                                                    | `simple`                                                                                         |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_ONCE`        | :white_circle: | Run trigger once (do not repeat previous results)                                      | `true`, `false`                                                                                                      | `true`                                                                                           |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_THRESHOLD`   | :white_circle: | The threshold to reach to run the trigger                                              | `all`, `major`, `minor`, `patch`                                                                                     | `all`                                                                                            |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_SIMPLETITLE` | :white_circle: | The template to use to render the title of the notification (simple mode)              | String template with placeholders `${id}` `${name}` `${watcher}` `${kind}` `${semver}` `${local}` `${remote}` `${link}` | `New ${kind} found for container ${name}`                                                        |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_BATCHTITLE`  | :white_circle: | The template to use to render the title of the notification (batch mode)               | String template with placeholders `${count}`                                                                         | `${count} updates available`                                                                     |
| `WUD_TRIGGER_{trigger_type}_{trigger_name}_SIMPLEBODY`  | :white_circle: | The template to use to render the body of the notification                             | String template with placeholders `${id}` `${name}` `${watcher}` `${kind}` `${semver}` `${local}` `${remote}` `${link}` | `Container ${name} running with ${kind} ${local} can be updated to ${kind} ${remote} \n ${link}` |

?> Threshold `all` means that the trigger will run regardless of the nature of the change

?> Threshold `major` means that the trigger will run only if this is a `major`, `minor` or `patch` semver change 

?> Threshold `minor` means that the trigger will run only if this is a `minor` or `patch` semver change

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
      - WUD_TRIGGER_SMTP_GMAIL_SIMPLETITLE=Container $${name} can be updated
      - WUD_TRIGGER_SMTP_GMAIL_SIMPLEBODY=Container $${name} can be updated from version $${local} to version $${remote}
```
#### **Docker**
```bash
docker run \
  -e 'WUD_TRIGGER_SMTP_GMAIL_SIMPLETITLE=Container ${name} can be updated' \
  -e 'WUD_TRIGGER_SMTP_GMAIL_SIMPLEBODY=Container ${name} can be updated from version ${local} to version ${remote}'
  ...
  getwud/wud
```
<!-- tabs:end -->
