import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Docker Swarm Watcher

<DocHero
  icon="docker"
  badge="Docker Swarm"
  badgeType="info"
  description="The Docker Swarm watcher discovers and monitors services and stacks running across your Docker Swarm cluster, reporting when newer container images are available."
/>

:::info[Service-Level Monitoring]

In Docker Swarm, workloads are monitored at the **Service** level rather than individual task replicas. This ensures:

- A single consolidated entry per service regardless of the replica count (`replicas: 1` or `replicas: 10`).
- Seamless support for both replicated and global service modes.
- Automatic stack namespace grouping via `com.docker.stack.namespace` when deployed using `docker stack deploy`.

:::

---

## Prerequisites

WUD must be connected to a **Docker Swarm Manager node**:

- **Local Manager**: Mount `/var/run/docker.sock` from a Swarm manager node.
- **Remote Manager**: Connect via TCP (`host:port`) with optional TLS certificates (`cafile`, `certfile`, `keyfile`).
- **Cluster Visibility**: Monitoring a Swarm manager provides complete visibility across all worker nodes in the cluster.

:::caution[Worker Nodes]
If WUD connects to a worker node instead of a manager node, Docker will reject the service listing API (`This node is not a swarm manager`). WUD will log a warning and skip the cycle. Ensure WUD is scheduled on or points to a manager node.
:::

---

## Configuration Options

<ConfigList>
  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_SOCKET"
    required={false}
    type="path"
    defaultValue="/var/run/docker.sock"
    supported="Valid UNIX socket path">
    Docker daemon UNIX socket on a Swarm manager node
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_HOST"
    type="string"
    required={false}
    supported="Hostname or IP">
    Remote Swarm manager hostname or IP address
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_PORT"
    required={false}
    type="integer"
    defaultValue="2375"
    supported="Port number">
    Docker daemon TCP port to connect to on the manager node
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_CAFILE"
    type="path"
    required={false}
    supported="File path">
    Path to CA certificate PEM file (for TLS connection only)
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_CERTFILE"
    type="path"
    required={false}
    supported="File path">
    Path to client certificate PEM file (for TLS connection only)
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_KEYFILE"
    type="path"
    required={false}
    supported="File path">
    Path to client private key PEM file (for TLS connection only)
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_CRON"
    required={false}
    type="string"
    defaultValue="0 * * * *"
    supported="[Valid CRON expression](https://crontab.guru/)">
    CRON schedule for automatic checks
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_JITTER"
    type="integer"
    required={false}
    defaultValue="60000"
    supported="> 0">
    Random jitter in milliseconds applied to the CRON schedule
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_WATCHBYDEFAULT"
    type="boolean"
    required={false}
    defaultValue="true"
    supported="true | false">
    Whether to watch Swarm services by default when `getwud.app/watch` or `wud.watch` is not defined
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_WATCHDIGESTDEFAULT"
    type="boolean"
    required={false}
    defaultValue="false (Hub), true (others)"
    supported="true | false">
    Whether to watch image digest by default for non-semver images
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_WATCHATSTART"
    type="boolean"
    required={false}
    defaultValue="true"
    supported="true | false">
    Whether to check for service image updates during WUD startup
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_SWARM_{name}_STACKS"
    type="list"
    required={false}
    defaultValue="All stacks"
    supported="Comma-separated list of stack names (e.g. `core,monitoring,prod`)">
    Filter monitoring to specific Swarm stack namespaces
  </ConfigOption>
</ConfigList>

---

## Service & Stack Customization

You can customize monitoring behavior per service using labels. Labels can be placed in `deploy.labels` in your stack file or passed via `docker service create --label`.

Both canonical prefixes (`getwud.app/*`) and short aliases (`wud.*`, `wud/*`) are supported:

```yaml
version: '3.8'

services:
  web:
    image: nginx:1.27.0
    deploy:
      replicas: 3
      labels:
        - "getwud.app/display.name=Production Web Gateway"
        - "getwud.app/tag.include=^1\\.27"
        - "getwud.app/watch.digest=true"
        - "getwud.app/trigger.include=slack,webhook"
```

For the complete reference of supported properties, see the [**Workload Customization guide**](../labels.md).

---

## Examples

### 1. Deploy WUD as a Swarm Service on a Manager Node

Deploy WUD directly into your Swarm cluster using a stack compose file:

```yaml
version: '3.8'

services:
  wud:
    image: getwud/wud:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - WUD_WATCHER_SWARM_LOCAL_SOCKET=/var/run/docker.sock
      - WUD_WATCHER_SWARM_LOCAL_CRON=0 2 * * *
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
```

### 2. Monitor a Remote Swarm Manager via TLS

```yaml
services:
  wud:
    image: getwud/wud:latest
    environment:
      - WUD_WATCHER_SWARM_CLUSTER1_HOST=swarm-manager.internal
      - WUD_WATCHER_SWARM_CLUSTER1_PORT=2376
      - WUD_WATCHER_SWARM_CLUSTER1_CAFILE=/certs/ca.pem
      - WUD_WATCHER_SWARM_CLUSTER1_CERTFILE=/certs/cert.pem
      - WUD_WATCHER_SWARM_CLUSTER1_KEYFILE=/certs/key.pem
    volumes:
      - /path/to/certs:/certs:ro
```

### 3. Filter Specific Stacks

To restrict WUD to only monitor services belonging to the `production` and `ingress` stacks:

```yaml
environment:
  - WUD_WATCHER_SWARM_PROD_STACKS=production,ingress
```
