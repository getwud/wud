import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Nomad Watcher

<DocHero
  icon="nomad"
  badge="HashiCorp Nomad"
  badgeType="info"
  description="The Nomad watcher discovers and monitors jobs and task groups running in HashiCorp Nomad clusters, reporting when newer container images are available."
/>

:::info[Supported Job Types & Drivers]

- **Job Types**: `service`, `batch`, `system`
- **Task Drivers**: `docker`, `podman` (or any task specifying `config.image`)

:::

---

## Prerequisites

WUD must be able to reach the Nomad HTTP API (default port `4646`):

- **Local / In-Cluster**: Connect directly to `http://localhost:4646` or `http://nomad:4646`.
- **Remote Cluster**: Provide the Nomad API URL via `WUD_WATCHER_NOMAD_{name}_URL`.
- **ACL Enabled**: Provide a Nomad Secret Token via `WUD_WATCHER_NOMAD_{name}_TOKEN`.
- **TLS / mTLS**: Configure `CAFILE`, `CERTFILE`, and `KEYFILE` if your Nomad cluster enforces TLS.

---

## Configuration Options

<ConfigList>
  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_URL"
    required={false}
    type="string"
    defaultValue="http://localhost:4646"
    supported="Valid HTTP or HTTPS URL">
    Nomad HTTP API endpoint
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_TOKEN"
    type="string"
    required={false}
    defaultValue="Empty"
    supported="Nomad ACL Secret Token">
    Secret token used for authenticating against Nomad ACL
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_NAMESPACE"
    type="string"
    required={false}
    defaultValue="*"
    supported="'*' (all namespaces) or specific namespace name">
    Nomad namespace to watch
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_CRON"
    required={false}
    type="string"
    defaultValue="0 * * * *"
    supported="[Valid CRON expression](https://crontab.guru/)">
    CRON schedule for automatic checks
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_JITTER"
    type="integer"
    required={false}
    defaultValue="60000"
    supported="> 0">
    Random jitter in milliseconds applied to the CRON schedule
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_WATCHBYDEFAULT"
    type="boolean"
    required={false}
    defaultValue="true"
    supported="true | false">
    Whether to watch Nomad tasks by default when `wud.watch` is not defined
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_WATCHDIGESTDEFAULT"
    type="boolean"
    required={false}
    defaultValue="false"
    supported="true | false">
    Whether to watch image digest by default for non-semver images
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_WATCHATSTART"
    type="boolean"
    required={false}
    defaultValue="true"
    supported="true | false">
    Trigger an initial watch cycle when WUD starts if the container store is empty
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_DRIVERS"
    type="string"
    required={false}
    defaultValue="docker,podman"
    supported="Comma-separated list of driver names">
    List of task drivers to inspect for container images
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_CAFILE"
    type="path"
    required={false}
    defaultValue="Empty"
    supported="Path to valid CA certificate file">
    Path to custom CA certificate for TLS validation
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_CERTFILE"
    type="path"
    required={false}
    defaultValue="Empty"
    supported="Path to client certificate file">
    Path to client certificate file for mTLS authentication
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_NOMAD_{name}_KEYFILE"
    type="path"
    required={false}
    defaultValue="Empty"
    supported="Path to client private key file">
    Path to client private key file for mTLS authentication
  </ConfigOption>
</ConfigList>

---

## Nomad Job Metadata (`meta` block)

You can customize how WUD treats each Nomad job, task group, or individual task by setting key-value pairs in the `meta { ... }` block in your job file.

### Cascading Priority

Metadata cascades with the following precedence:

`Task.meta` → `TaskGroup.meta` → `Job.meta`

A setting placed on a `job` applies to all its tasks unless overridden by a `group` or `task`.

### Supported Keys

| Metadata Key | Values | Description |
| :--- | :--- | :--- |
| `wud.watch` | `true` \| `false` | Enable or disable watching for this task/job |
| `wud.tag.include` | Regex | Only consider remote tags matching this pattern |
| `wud.tag.exclude` | Regex | Exclude remote tags matching this pattern |
| `wud.tag.transform` | Expression | Tag transformation expression |
| `wud.watch.digest` | `true` \| `false` | Watch image digest for non-semver tags |
| `wud.display.name` | String | Custom display name in WUD UI |
| `wud.display.icon` | Iconify ID | Custom icon (defaults to `cib:nomad`) |
| `wud.link.template` | URL template | Custom clickable link template |
| `wud.trigger.include` | Comma-separated | Specific triggers to include |
| `wud.trigger.exclude` | Comma-separated | Specific triggers to exclude |
| `wud.stack` | String | Stack name (defaults to namespace or job name) |

:::tip[Namespace Prefix Support]
You can use either `wud.<key>` (idiomatic in Nomad) or `wud.getwud.io/<key>` interchangeably.
:::

---

## Examples

### Nomad Job Specification (`example.nomad.hcl`)

```hcl
job "webapp" {
  datacenters = ["dc1"]
  type        = "service"

  # Job-level metadata applied to all tasks
  meta = {
    "wud.stack" = "production"
  }

  group "web" {
    count = 2

    task "nginx" {
      driver = "docker"

      config {
        image = "nginx:1.27.0"
      }

      meta = {
        "wud.watch"        = "true"
        "wud.tag.include"  = "^1\\.27"
        "wud.display.name" = "Frontend Web"
      }
    }
  }

  group "cache" {
    count = 1

    task "redis" {
      driver = "docker"

      config {
        image = "redis:7.2.4"
      }

      meta = {
        "wud.display.name" = "Cache Redis"
      }
    }
  }
}
```

### Docker Compose

Deploy WUD alongside or connected to a Nomad cluster:

```yaml
services:
  wud:
    image: getwud/wud:latest
    container_name: wud
    ports:
      - "3000:3000"
    environment:
      # Nomad watcher configuration
      - WUD_WATCHER_NOMAD_MYCLUSTER_URL=http://nomad-server:4646
      - WUD_WATCHER_NOMAD_MYCLUSTER_NAMESPACE=*
      - WUD_WATCHER_NOMAD_MYCLUSTER_CRON=0 * * * *
      - WUD_WATCHER_NOMAD_MYCLUSTER_WATCHBYDEFAULT=true
```
