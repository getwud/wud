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
    Simulation mode: pulls the new image to verify registry availability, but **never** rewrites compose files or recreates services (even during manual execution via Home Assistant, UI, or API). Not intended for preparing future manual updates (see `PRELOAD` instead)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_PRELOAD"
    required={false}
    type="boolean"
    defaultValue="false">
    When enabled with `AUTO=false`, automatically downloads updated image layers in the background (using pull-by-digest for floating tags) without rewriting compose files or restarting services. When an operator triggers the manual update later (via Home Assistant, Web UI, or API), stack recreation is instantaneous (&lt; 1s) with zero network wait
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

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_SELFUPDATE"
    required={false}
    type="boolean"
    defaultValue="false">
    Allow WUD to update the container it runs in itself (see [Updating WUD itself](#-updating-wud-itself))
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_SELFUPDATETIMEOUT"
    required={false}
    type="integer"
    defaultValue="120000">
    How long (in milliseconds) to wait for the replacement WUD container to become healthy before rolling back
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_STRICT_DIGEST"
    required={false}
    type="boolean"
    defaultValue="false">
    When enabled, requires candidate updates for digest-pinned services (`image:tag@sha256:...`) to have a valid replacement digest. If no candidate digest is available from the registry, WUD fails closed: the service update is aborted or rejected and the existing pinned reference is preserved untouched, rather than stripping the pin and reverting to a mutable tag. Can also be overridden per container via label `wud.trigger.dockercompose.strict_digest=true` (or `wud.trigger.dockercompose.<trigger_name>.strict_digest=true`).
  </ConfigOption>
</ConfigList>

:::info
This trigger supports all [common trigger configuration options](../README.md#common-trigger-configuration) and runs in `batch` mode by default.
:::

---

## ⚡ Operating Modes: Auto, Preload & Dry-Run

When configuring the Docker Compose trigger alongside the common `AUTO` setting (`WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_AUTO`), it is essential to distinguish between **`DRYRUN`** and **`PRELOAD`**:

- **`DRYRUN` (Simulation / Test mode)**:  
  Validates credentials and pulls the new image to verify registry availability, but **never** modifies Compose files, stops containers, or restarts stack services. This applies even if you manually trigger an update from the Web UI, Home Assistant, or REST API. `DRYRUN` is strictly intended for testing and validation—it is **not** meant for preparing a future manual update.

- **`PRELOAD` (Controlled Manual Updates with Zero Downtime)**:  
  Designed specifically for production workflows where automated updates are disabled (`AUTO=false`) to avoid unexpected stack restarts. When an update is detected, WUD downloads all image layers in the background ahead of time without modifying `docker-compose.yml` or restarting containers. For floating tags (such as `:latest`), WUD pulls specifically by manifest digest so running containers keep their existing tag references intact. When an operator triggers the update later (via Home Assistant button, Web UI, or API), stack recreation is instantaneous (&lt; 1s) because all layers are already present locally.

### Mode Comparison

The table below summarizes the four typical operating modes:

| Mode | `AUTO` | `PRELOAD` | `DRYRUN` | Behavior & Use Case |
| :--- | :---: | :---: | :---: | :--- |
| **Fully Automated** | `true` | `false` | `false` | **Hands-off auto-update:** Services and Compose files are immediately updated and recreated as soon as an update is detected. |
| **Fully Manual** | `false` | `false` | `false` | **Standard manual update:** WUD notifies when an update is available without downloading images in advance. When triggered manually, WUD pulls the image, rewrites the Compose file, and restarts services (downtime includes download time). |
| **Manual with Zero-Downtime Preload** | `false` | `true` | `false` | **Optimized maintenance:** WUD pre-caches image layers in the background without touching running services or Compose files. When triggered manually, recreation is instantaneous (&lt; 1s) with zero network wait. |
| **Simulation / Test** | * | * | `true` | **Test mode only:** Pulls images to test network and registry access, but **never** modifies Compose files or recreates services (even on manual execution). |

:::tip[Per-Container Preload Configuration]
Preload can also be opted into per container using Docker labels:

- `wud.trigger.preload=true` (applies to all triggers supporting preload)
- `wud.trigger.dockercompose.<trigger_name>.preload=true` (applies to a specific trigger instance)

:::

---

## 🔄 Updating WUD itself

Replacing the container WUD runs in is a special case: the trigger has to stop
that container, and stopping it kills the process that still has to remove,
recreate and start it. WUD would go down mid-update and stay down, because a
deliberate `docker stop` does not trigger a restart policy.

**By default WUD refuses to do it** and logs an actionable error instead of
leaving you with a stopped container:

```text
Refusing to update the container WUD runs in: stopping it would abort the update
and leave the container down. Enable it with
WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_SELFUPDATE=true, or exclude WUD from this
trigger with the wud.trigger.exclude label and update it externally.
```

### Opting in

Set `WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_SELFUPDATE=true`. WUD then delegates the
swap to a short-lived helper container instead of doing it in-process. The
helper runs the image WUD is running *right now* (not the one being installed),
so the code performing the swap is always known to support it, and it:

1. creates the replacement under a temporary name, before touching anything;
2. stops the current WUD container;
3. starts the replacement;
4. waits for it to become healthy;
5. on success, removes the old container and renames the replacement;
6. on failure, removes the replacement and restarts the old container.

The helper mounts the same Docker socket as the watcher and is named
`wud-self-update`. It is deliberately **not** removed when it finishes: if a
self-update fails, WUD is not running to record why, so the helper's logs are
the only account of what happened. Check them with `docker logs wud-self-update`.
The next self-update replaces it, so at most one is ever left behind.

:::warning
Self-update requires the watcher to talk to Docker over a socket. It is not
supported for watchers configured with `WUD_WATCHER_{watcher_name}_HOST`.
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

### 🔄 Docker Compose Convergence & Metadata

- WUD updates the Compose YAML on disk and recreates the container via the Docker Engine API.
- WUD synchronizes `com.docker.compose.image` with the newly pulled image ID.
- `com.docker.compose.config-hash` is an internal Docker Compose hash computed exclusively by the Docker Compose Go CLI; subsequent manual or automated `docker compose up` calls will smoothly converge the hash, or users can pass `docker compose up -d --no-recreate` if they wish to keep the existing running container instance.

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

### Controlled Manual Updates with Background Preloading

Combine `AUTO=false` and `PRELOAD=true` so updated image layers are pre-cached in the background without touching Compose files, allowing instantaneous stack updates when triggered manually:

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/stacks/app/docker-compose.yml:/wud/docker-compose.yml
    environment:
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_FILE=/wud/docker-compose.yml
      # Disable automatic stack recreation
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_AUTO=false
      # Preload updated image layers in the background
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_PRELOAD=true
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_BACKUP=true
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_PRUNE=true
```

### Fail-Closed Pinning with Strict Digest Mode

When services in Docker Compose are pinned by digest (e.g. `image: myapp:1.0.0@sha256:...`), the default behavior when an upstream update does not provide a candidate digest is to remove the stale pin and update to the mutable tag (`myapp:1.1.0`).

If your security policy enforces strict image immutability, enable `STRICT_DIGEST` globally or per container:

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      # Fail closed if candidate digest is missing for digest-pinned services
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_STRICT_DIGEST=true
```

Or override per container via labels:

```yaml
services:
  secure-service:
    image: myapp:1.0.0@sha256:7b5d...
    labels:
      - wud.trigger.dockercompose.strict_digest=true
```

When strict digest mode is active, WUD aborts the update if no remote digest is available, leaving the existing pinned reference untouched and emitting a failure event.
