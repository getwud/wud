import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Nomad

![logo](nomad.svg)

The `nomad` trigger lets you update containers managed by [HashiCorp Nomad](https://www.nomadproject.io/) cleanly through the Nomad API without conflicting with Nomad's container lifecycle supervision.

Nomad supervises the containers it creates (handling service registration, health checks, template-rendered secrets, and restart policies). Standard `docker` and `dockercompose` triggers work by removing and recreating containers directly via the Docker API; however, when a container is Nomad-managed, Nomad detects the missing container and reconciles independently, conflicting with external updates.

Instead, the `nomad` trigger calls [Nomad's HTTP API](https://developer.hashicorp.com/nomad/api-docs/allocations#restart-allocation) to restart the allocation (or a specific task within it), allowing Nomad's Docker driver to handle the image pull and container recreation natively while preserving normal supervision.

:::info[For Nomad to pull the new image on restart, the target task must have `force_pull = true` set in its Nomad job specification; otherwise, the Docker driver will reuse the cached local image.]
:::

Nomad labels every container it creates with metadata (`com.hashicorp.nomad.alloc_id`, `com.hashicorp.nomad.task_name`, etc.). This trigger reads these labels to identify the allocation and task to restart, requiring no additional labeling on your part.

:::warning[If `com.hashicorp.nomad.task_name` is missing (as in some older Nomad releases), the trigger falls back to extracting the task name from the container name (`<task_name>-<alloc_id>`). If task resolution fails, the trigger logs a warning and skips execution without restarting other tasks in the allocation. Set `alltasks=true` only if you explicitly want to restart all tasks in the allocation.]
:::

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_NOMAD_{trigger_name}_ADDRESS"
    required={false}
    type="url"
    defaultValue="http://127.0.0.1:4646"
    supported="Valid HTTP/HTTPS URL">
    Base URL of the Nomad HTTP API
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NOMAD_{trigger_name}_ALLOCLABEL"
    required={false}
    type="string"
    defaultValue="com.hashicorp.nomad.alloc_id">
    Container label containing the Nomad allocation ID
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NOMAD_{trigger_name}_ALLTASKS"
    required={false}
    type="boolean"
    defaultValue="false">
    Restart all tasks in the allocation instead of only the target task
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NOMAD_{trigger_name}_TASKLABEL"
    required={false}
    type="string"
    defaultValue="com.hashicorp.nomad.task_name">
    Container label containing the Nomad task name
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_NOMAD_{trigger_name}_TOKEN"
    required={false}
    type="email">
    Nomad Secret ID / ACL token (sent via `X-Nomad-Token`)
  </ConfigOption>
</ConfigList>
:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

:::warning[Containers without a `com.hashicorp.nomad.alloc_id` label are not managed by Nomad and will be skipped.]
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
