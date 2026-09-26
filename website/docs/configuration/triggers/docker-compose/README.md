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

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_ROLLBACK"
    required={false}
    type="boolean"
    defaultValue="false">
    Enable the automatic rollback on HEALTHCHECK failure for the opted-in services of a compose project (see [Automatic rollback on healthcheck failure](#-automatic-rollback-on-healthcheck-failure))
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_ROLLBACKWINDOW"
    required={false}
    type="integer"
    defaultValue="300000">
    How long (in milliseconds) to wait for a replacement service to report a terminal health status (`healthy`/`unhealthy`) when its image defines a `HEALTHCHECK`
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_ROLLBACKINTERVAL"
    required={false}
    type="integer"
    defaultValue="10000">
    Sampling interval (in milliseconds) between two health observations
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_ROLLBACKGRACE"
    required={false}
    type="integer"
    defaultValue="10000">
    Grace period (in milliseconds) a replacement service must stay up when its image defines **no** `HEALTHCHECK` before the update is accepted
  </ConfigOption>
</ConfigList>

:::info
This trigger supports all [common trigger configuration options](../README.md#common-trigger-configuration) and runs in `batch` mode by default.
:::

---

## 🪝 Pre & Post Update Hooks

Like the Docker trigger, the Docker Compose trigger supports **Pre-update** and **Post-update** hooks.

### Quality Gate (Stack Protection)

Before the Compose file is modified and services are recreated, WUD runs all configured `pre` hooks across the stack services:

- If any pre-hook fails (exit code != 0 or timeout), **the entire update is cancelled**.
- The `docker-compose.yml` file is **not modified**, no backup file is generated, and running containers remain untouched.

### Hook Types

| Type | Target | Description |
| :--- | :--- | :--- |
| `exec` (Type A) | `target: "self"` (default) | Executes a shell command inside the container being updated. |
| `exec` (Type B) | `target: "<container_name>"` | Executes a shell command inside another container (e.g. running migrations or DB dumps). |
| `trigger` (Type C) | `trigger: "<trigger_name>"` | Calls another WUD trigger (e.g. Slack, MQTT, Webhook). |

### Environment Variables Injected into `exec` Hooks

When executing commands inside containers, WUD injects contextual environment variables:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `WUD_CONTAINER_NAME` | Name of the target container | `nextcloud` |
| `WUD_CONTAINER_ID` | Docker ID of the target container | `a1b2c3d4e5f6` |
| `WUD_IMAGE_NAME` | Name/repository of the container image | `linuxserver/nextcloud` |
| `WUD_IMAGE_REGISTRY` | Registry of the container image | `docker.io` |
| `WUD_IMAGE_OLD_TAG` | Current tag of the container image | `27.0.1` |
| `WUD_IMAGE_NEW_TAG` | New tag being deployed | `27.1.0` |
| `WUD_IMAGE_OLD` | Full old image reference (name:tag or name@digest) | `linuxserver/nextcloud:27.0.1` |
| `WUD_IMAGE_NEW` | Full new image reference (name:tag or name@digest) | `linuxserver/nextcloud:27.1.0` |
| `WUD_WATCHER_NAME` | Watcher that detected the update | `local` |
| `WUD_TRIGGER_NAME` | Trigger executing the hook | `local` |
| `WUD_HOOK_PHASE` | Current hook phase | `pre` or `post` |

### Configuration via Container Labels

Hooks are defined via labels on compose services:

```yaml
services:
  web:
    image: my-app:1.0.0
    labels:
      # Quality Gate: database migration check before update
      - "wud.hook.1.phase=pre"
      - "wud.hook.1.type=exec"
      - "wud.hook.1.command=npm run db:check"
      - "wud.hook.1.timeout=30000"
      # Post-update: notify Slack
      - "wud.hook.2.phase=post"
      - "wud.hook.2.type=trigger"
      - "wud.hook.2.trigger=slack"
```

## 🩺 Automatic rollback on healthcheck failure

When at least one service of a compose project opts in (`ROLLBACK` env var or
`wud.rollback.enable` / `.window` / `.interval` / `.grace` labels, labels win),
the update of the whole project becomes transactional:

1. WUD writes an implicit `.back` copy of the compose file **before any
   mutation** (regardless of the `BACKUP` setting). If that write fails, nothing
   is changed.
2. Every service is swapped using a rename-first archive, so the previous
   container is never destroyed before the replacement is validated.
3. Only the opted-in services are health-gated. WUD waits for a terminal
   `HEALTHCHECK` status (up to `ROLLBACKWINDOW` ms), or — when the image defines
   no `HEALTHCHECK` — requires the replacement to stay up for `ROLLBACKGRACE`
   ms.
4. **On success**, the archives are removed, the compose file keeps the new
   versions, and obsolete images are pruned as usual.
5. **On any failure**, the **whole project** is reverted: every recreated
   service is stopped/removed, its archive is restored under the original name
   and started again, and the `.back` file is copied back over the compose file
   only once every service has been restored. The notification report marks the
   failing service with its verdict and the healthy-but-reverted services with
   `project-revert`.

### Example

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/stacks/app/docker-compose.yml:/wud/docker-compose.yml
    environment:
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_FILE=/wud/docker-compose.yml
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_ROLLBACK=true
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_ROLLBACKWINDOW=180000
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_ROLLBACKGRACE=15000

  web:
    image: my/web:2.0.0
    labels:
      - wud.rollback.enable=true
      - wud.rollback.window=120000
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost/health']
      interval: 5s
      timeout: 3s
      retries: 3
```

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
