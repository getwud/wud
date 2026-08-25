import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Nomad

![logo](nomad.png)

The `nomad` trigger lets you update containers managed by [HashiCorp Nomad](https://www.nomadproject.io/) cleanly through the Nomad API without conflicting with Nomad's container lifecycle supervision.

Nomad supervises the containers it creates (handling service registration, health checks, template-rendered secrets, and restart policies). Standard `docker` and `dockercompose` triggers work by removing and recreating containers directly via the Docker API; however, when a container is Nomad-managed, Nomad detects the missing container and reconciles independently, conflicting with external updates.

Instead, the `nomad` trigger calls [Nomad's HTTP API](https://developer.hashicorp.com/nomad/api-docs/allocations#restart-allocation) to restart the allocation (or a specific task within it), allowing Nomad's Docker driver to handle the image pull and container recreation natively while preserving normal supervision.

:::info
For Nomad to pull the new image on restart, the target task must have `force_pull = true` set in its Nomad job specification; otherwise, the Docker driver will reuse the cached local image.
:::

Nomad labels every container it creates with metadata (`com.hashicorp.nomad.alloc_id`, `com.hashicorp.nomad.task_name`, etc.). This trigger reads these labels to identify the allocation and task to restart, requiring no additional labeling on your part.

:::warning
If `com.hashicorp.nomad.task_name` is missing (as in some older Nomad releases), the trigger falls back to extracting the task name from the container name (`<task_name>-<alloc_id>`). If task resolution fails, the trigger logs a warning and skips execution without restarting other tasks in the allocation. Set `alltasks=true` only if you explicitly want to restart all tasks in the allocation.
:::

### Variables

| Env var                                       |    Required    | Description                                                         | Supported values     | Default value when missing      |
| --------------------------------------------- | :------------: | ------------------------------------------------------------------- | -------------------- | ------------------------------- |
| `WUD_TRIGGER_NOMAD_{trigger_name}_ADDRESS`    | :white_circle: | Base URL of the Nomad HTTP API                                      | Valid HTTP/HTTPS URL | `http://127.0.0.1:4646`         |
| `WUD_TRIGGER_NOMAD_{trigger_name}_TOKEN`      | :white_circle: | Nomad Secret ID / ACL token (sent via `X-Nomad-Token`)              | String               |                                 |
| `WUD_TRIGGER_NOMAD_{trigger_name}_ALLOCLABEL` | :white_circle: | Container label containing the Nomad allocation ID                  | String               | `com.hashicorp.nomad.alloc_id`  |
| `WUD_TRIGGER_NOMAD_{trigger_name}_TASKLABEL`  | :white_circle: | Container label containing the Nomad task name                      | String               | `com.hashicorp.nomad.task_name` |
| `WUD_TRIGGER_NOMAD_{trigger_name}_ALLTASKS`   | :white_circle: | Restart all tasks in the allocation instead of only the target task | `true`, `false`      | `false`                         |

:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

:::warning
Containers without a `com.hashicorp.nomad.alloc_id` label are not managed by Nomad and will be skipped.
:::

### Examples

#### Restart the task backing an updated container

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_NOMAD_LOCAL_ADDRESS=http://127.0.0.1:4646
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_NOMAD_LOCAL_ADDRESS="http://127.0.0.1:4646" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

#### Restart tasks in an ACL-enabled Nomad cluster

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_NOMAD_LOCAL_ADDRESS=https://nomad.internal:4646
      - WUD_TRIGGER_NOMAD_LOCAL_TOKEN=00000000-0000-0000-0000-000000000000
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_NOMAD_LOCAL_ADDRESS="https://nomad.internal:4646" \
  -e WUD_TRIGGER_NOMAD_LOCAL_TOKEN="00000000-0000-0000-0000-000000000000" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
