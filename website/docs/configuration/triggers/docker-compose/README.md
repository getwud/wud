---
title: Docker Compose
description: Automatically update Docker Compose services and files in What's Up Docker (WUD).
---

import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Docker Compose

![logo](docker-compose.svg)

The `dockercompose` trigger automatically updates image tags inside `docker-compose.yml` files and recreates the target services.

---

## 🔄 Update Lifecycle

When triggered, WUD executes the following sequence:

1. Updates the image tag reference in the target `docker-compose.yml` file.
2. Clones the existing service container configuration.
3. Pulls the new target image.
4. Stops and removes the old container.
5. Recreates and starts the updated container.
6. Prunes the obsolete image (if `PRUNE=true`).

:::warning[Host & Volume Requirements]
- This trigger only works with **locally monitored containers** running on the same host.
- The `docker-compose.yml` file must be mounted into the WUD container. If relying on Docker Compose's automatic `com.docker.compose.project.config_files` label, mount the file at the exact same path inside WUD as on the host.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_BACKUP"
    required={false}
    type="boolean"
    defaultValue="false">
    Back up `docker-compose.yml` to `.back` before modifying it
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_DRYRUN"
    required={false}
    type="boolean"
    defaultValue="false">
    When enabled, only pulls the new image ahead of time without rewriting compose files or restarting
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_FILE"
    type="path"
    required={false}
    defaultValue="com.docker.compose.project.config_files"
    supported="Valid mounted file path">
    Path to the `docker-compose.yml` file inside the WUD container
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_PRUNE"
    required={false}
    type="boolean"
    defaultValue="false">
    Prune obsolete image versions after a successful upgrade
  </ConfigOption>
</ConfigList>

:::info
This trigger supports all [common trigger configuration options](../README.md#common-trigger-configuration) and runs in `batch` mode by default.
:::

---

## 🚀 Examples

### Auto-Update Compose Services with Mounted Compose File

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/stacks/app/docker-compose.yml:/wud/docker-compose.yml
    environment:
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_FILE=/wud/docker-compose.yml
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_BACKUP=true
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_PRUNE=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /opt/stacks/app/docker-compose.yml:/wud/docker-compose.yml \
  -e WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_FILE="/wud/docker-compose.yml" \
  -e WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_BACKUP=true \
  -e WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_PRUNE=true \
  getwud/wud
```

</TabItem>
<TabItem value="container-label" label="Per-Container Override">

```yaml
services:
  my-app:
    image: my-app:1.2.0
    labels:
      - wud.compose.file=/opt/stacks/app/docker-compose.yml
```

</TabItem>
</Tabs>
