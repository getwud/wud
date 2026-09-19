---
title: Docker Compose
description: Automatically update Docker Compose services and files in WUD (What's Up Docker?).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Docker Compose

<DocHero
  icon="docker-compose"
  description="The docker-compose trigger recreates containers managed by Docker Compose by pulling the latest images and restarting the stack."
/>

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
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_COMPOSEFILELABEL"
    required={false}
    type="string"
    defaultValue="wud.compose.file">
    Label name on container to override the compose file path
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
    defaultValue="Auto-detected via Docker Compose labels"
    supported="Valid mounted file path or template string">
    Path or template for the `docker-compose.yml` file (e.g. `/stacks/${container.labels['com.docker.compose.project']}/docker-compose.yml`). If omitted, auto-detected from `com.docker.compose.project.config_files` or `com.docker.compose.project.working_dir`.
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_PATHMAPPING_HOST"
    required={false}
    type="path">
    Host path prefix to replace with container path prefix when using auto-detection or templated paths
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_PATHMAPPING_CONTAINER"
    required={false}
    type="path">
    Container path prefix where host compose directories are mounted inside WUD
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

### Auto-Detection with Path Mapping

When WUD manages multiple Docker Compose stacks, you can mount the parent directory containing all stacks and let WUD auto-detect compose files via Docker Compose labels (`com.docker.compose.project.config_files` or `com.docker.compose.project.working_dir`). Path mapping translates host paths to container mount paths automatically:

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/stacks:/stacks
    environment:
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_PATHMAPPING_HOST=/opt/stacks
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_PATHMAPPING_CONTAINER=/stacks
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_BACKUP=true
```

### Dynamic File Path with Template Strings

You can also use string interpolation in the `FILE` variable to resolve paths dynamically using container attributes:

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/stacks:/stacks
    environment:
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_FILE=/stacks/$${container.labels['com.docker.compose.project']}/docker-compose.yml
```
