# Nomad

The `nomad` trigger lets you update containers that are managed by [HashiCorp Nomad](https://www.nomadproject.io/) without fighting Nomad for ownership of the container.

Nomad supervises the containers it creates (service registration, health checks, template-rendered secrets, restart policy). The `docker` and `dockercompose` triggers work by stopping, removing and recreating the container directly through the Docker API -- when the container is Nomad-managed, Nomad notices its container disappeared and reconciles independently, which fights whatever the trigger just created and can leave the replacement running without its Nomad-managed configuration.

Instead, the `nomad` trigger calls [Nomad's own HTTP API](https://developer.hashicorp.com/nomad/api-docs/allocations#restart-allocation) to restart the allocation (or a single task within it), letting Nomad's Docker driver handle the actual image pull and container recreation the same way it would for any other restart. The allocation stays under Nomad's normal supervision throughout.

?> For this to actually pick up a new image, the target task must have `force_pull = true` set in its Nomad job spec -- otherwise Nomad's Docker driver reuses whatever image is already cached locally, same as a manual restart would.

Nomad stamps every container it creates with a fixed set of labels (`com.hashicorp.nomad.alloc_id`, `com.hashicorp.nomad.task_name`, ...). This trigger reads those labels to know which allocation/task to restart, so no extra container labeling is required on your end -- it works out of the box against any container Nomad's Docker driver created.

!> Not every Nomad version sets the `com.hashicorp.nomad.task_name` label (observed missing on Nomad v2.0.4 while `alloc_id` was still present). When it's missing, this trigger falls back to parsing the task name out of the container's own name, since Nomad's Docker driver always names containers `<task_name>-<alloc_id>`. If that also fails to resolve a task name, the trigger logs a warning and does **not** restart anything -- it will never silently fall back to restarting every task in the allocation (which could mean restarting a database sidecar you didn't intend to touch). Set `alltasks=true` explicitly if restarting the whole allocation is actually what you want.

### Variables

| Env var                                       |    Required    | Description                                                   | Supported values             | Default value when missing      |
| --------------------------------------------- | :------------: | ------------------------------------------------------------- | ---------------------------- | ------------------------------- |
| `WUD_TRIGGER_NOMAD_{trigger_name}_ADDRESS`    | :white_circle: | The base URL of the Nomad HTTP API                            | Valid http or https endpoint | `http://127.0.0.1:4646`         |
| `WUD_TRIGGER_NOMAD_{trigger_name}_TOKEN`      | :white_circle: | ACL token sent as `X-Nomad-Token`, if ACLs are enabled        |                              |                                 |
| `WUD_TRIGGER_NOMAD_{trigger_name}_ALLOCLABEL` | :white_circle: | Container label holding the Nomad allocation ID               |                              | `com.hashicorp.nomad.alloc_id`  |
| `WUD_TRIGGER_NOMAD_{trigger_name}_TASKLABEL`  | :white_circle: | Container label holding the Nomad task name                   |                              | `com.hashicorp.nomad.task_name` |
| `WUD_TRIGGER_NOMAD_{trigger_name}_ALLTASKS`   | :white_circle: | Restart every task in the allocation instead of just this one | `true`, `false`              | `false`                         |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

!> Containers with no `com.hashicorp.nomad.alloc_id` label are not managed by Nomad's Docker driver -- the trigger logs a warning and skips them rather than guessing.

### Examples

#### Restart the task backing an update-available container

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_NOMAD_LOCAL_ADDRESS=http://127.0.0.1:4646
```

#### **Docker**

```bash
docker run \
  -e WUD_TRIGGER_NOMAD_LOCAL_ADDRESS="http://127.0.0.1:4646" \
  ...
  getwud/wud
```

<!-- tabs:end -->

#### Restart against an ACL-enabled Nomad cluster

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_NOMAD_LOCAL_ADDRESS=https://nomad.internal:4646
      - WUD_TRIGGER_NOMAD_LOCAL_TOKEN=00000000-0000-0000-0000-000000000000
```

#### **Docker**

```bash
docker run \
  -e WUD_TRIGGER_NOMAD_LOCAL_ADDRESS="https://nomad.internal:4646" \
  -e WUD_TRIGGER_NOMAD_LOCAL_TOKEN="00000000-0000-0000-0000-000000000000" \
  ...
  getwud/wud
```

<!-- tabs:end -->
