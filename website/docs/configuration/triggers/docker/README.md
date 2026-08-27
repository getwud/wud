---
title: Docker
description: Automatically update standalone Docker containers in What's Up Docker (WUD).
---

import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Docker

![logo](docker.svg)

The `docker` trigger automatically replaces standalone containers with their updated versions upon discovering new image releases.

---

## 🔄 Update Lifecycle

When triggered, WUD executes the following sequence:

1. Clones the existing container configuration (ports, volumes, env, networks, labels).
2. Pulls the new target image.
3. Stops the currently running container.
4. Removes the old container.
5. Recreates and starts the new container with identical runtime options.
6. Prunes the obsolete image (if `PRUNE=true`).

:::info[Watcher Connection Reuse]
This trigger automatically reuses Docker connection settings from the [configured Docker watchers](../../watchers/README.md) and can perform updates on both local and remote Docker daemons.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_DOCKER_{trigger_name}_DRYRUN"
    required={false}
    type="boolean"
    defaultValue="false">
    When enabled, only pulls the new image ahead of time without recreating the container
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKER_{trigger_name}_PRUNE"
    required={false}
    type="boolean"
    defaultValue="false">
    Prune obsolete image versions after a successful upgrade
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Auto-Update Standalone Containers with Pruning

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WUD_TRIGGER_DOCKER_LOCAL_PRUNE=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e WUD_TRIGGER_DOCKER_LOCAL_PRUNE=true \
  getwud/wud
```

</TabItem>
</Tabs>
