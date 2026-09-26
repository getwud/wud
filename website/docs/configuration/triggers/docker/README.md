---
title: Docker
description: Automatically update standalone Docker containers in WUD (What's Up Docker?).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Docker

<DocHero
  icon="docker"
  description="The docker trigger automatically restarts or recreates local containers when updated images are available."
/>

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

  <ConfigOption
    name="WUD_TRIGGER_DOCKER_{trigger_name}_SELFUPDATE"
    required={false}
    type="boolean"
    defaultValue="false">
    Allow WUD to update the container it runs in itself (see [Updating WUD itself](#-updating-wud-itself))
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKER_{trigger_name}_SELFUPDATETIMEOUT"
    required={false}
    type="integer"
    defaultValue="120000">
    How long (in milliseconds) to wait for the replacement WUD container to become healthy before rolling back
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKER_{trigger_name}_ROLLBACK"
    required={false}
    type="boolean"
    defaultValue="false">
    Enable the automatic rollback on HEALTHCHECK failure for every container managed by this trigger (see [Automatic rollback on healthcheck failure](#-automatic-rollback-on-healthcheck-failure))
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKER_{trigger_name}_ROLLBACKWINDOW"
    required={false}
    type="integer"
    defaultValue="300000">
    How long (in milliseconds) to wait for the replacement container to report a terminal health status (`healthy`/`unhealthy`) when the image defines a `HEALTHCHECK`
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKER_{trigger_name}_ROLLBACKINTERVAL"
    required={false}
    type="integer"
    defaultValue="10000">
    Sampling interval (in milliseconds) between two health observations
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKER_{trigger_name}_ROLLBACKGRACE"
    required={false}
    type="integer"
    defaultValue="10000">
    Grace period (in milliseconds) the replacement container must stay up when the image defines **no** `HEALTHCHECK` before the update is accepted
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
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
WUD_TRIGGER_DOCKER_{trigger_name}_SELFUPDATE=true, or exclude WUD from this
trigger with the wud.trigger.exclude label and update it externally.
```

### Opting in

Set `WUD_TRIGGER_DOCKER_{trigger_name}_SELFUPDATE=true`. WUD then delegates the
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

:::tip[Prefer to keep WUD out of it?]
Add the `wud.trigger.exclude` label to the WUD container. WUD keeps reporting
its own updates in the UI, and you apply them yourself with
`docker compose pull wud && docker compose up -d wud`.
:::

### When WUD cannot tell which container it runs in

WUD resolves its own container id from `/proc/self/mountinfo`. If your runtime
does not expose it there, declare it explicitly:

<ConfigList>
  <ConfigOption
    name="WUD_CONTAINER_ID"
    required={false}
    type="string">
    Id of the container WUD runs in. Only needed when auto-detection fails
  </ConfigOption>
</ConfigList>

---

## 🪝 Pre & Post Update Hooks

Hooks allow you to run automated tasks **before** (`pre`) and **after** (`post`) a container is updated.

### Quality Gate (Safety First)

Pre-update hooks act as a **Quality Gate**:

- If a pre-hook fails (non-zero exit code or timeout), **the update process is aborted immediately**.
- The existing container is **never stopped or removed**, ensuring service continuity and preventing broken deployments.

### Hook Types

| Type | Target | Description |
| :--- | :--- | :--- |
| `exec` (Type A) | `target: "self"` (default) | Runs a shell command inside the container being updated. |
| `exec` (Type B) | `target: "<container_name>"` | Runs a shell command inside another local container (e.g. running a DB dump before updating a web app). |
| `trigger` (Type C) | `trigger: "<trigger_name>"` | Declares a chained invocation of another WUD trigger (e.g. sending a Slack notification). |

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

You can configure hooks directly on your containers using Docker labels. Use numeric indexes (`1`, `2`, ...) to control the execution order:

| Label | Description | Default |
| :--- | :--- | :--- |
| `wud.hook.<index>.phase` | Phase to execute: `pre` or `post` | **Required** |
| `wud.hook.<index>.type` | Hook type: `exec` or `trigger` | **Required** |
| `wud.hook.<index>.command` | Shell command to execute (for `exec` type) | **Required** for `exec` |
| `wud.hook.<index>.target` | Container target (`self` or container name) | `self` |
| `wud.hook.<index>.trigger` | Name of chained trigger (for `trigger` type) | **Required** for `trigger` |
| `wud.hook.<index>.timeout` | Execution timeout in milliseconds | `60000` (60s) |

#### Concrete Examples

##### Pre-update MySQL database backup (Type B)

A web service updates its backend after taking a database backup in a separate MySQL container:

```yaml
labels:
  - "wud.hook.1.phase=pre"
  - "wud.hook.1.type=exec"
  - "wud.hook.1.target=mysql-db"
  - "wud.hook.1.command=mysqldump -u root -psecret mydb > /backups/mydb-pre-update.sql"
  - "wud.hook.1.timeout=120000"
```

##### Pre-update Maintenance Mode and Post-update Slack Notification

```yaml
labels:
  # Put app in maintenance mode before update
  - "wud.hook.1.phase=pre"
  - "wud.hook.1.type=exec"
  - "wud.hook.1.command=php occ maintenance:mode --on"
  # Turn off maintenance mode after update
  - "wud.hook.2.phase=post"
  - "wud.hook.2.type=exec"
  - "wud.hook.2.command=php occ maintenance:mode --off"
  # Trigger chained notification
  - "wud.hook.3.phase=post"
  - "wud.hook.3.type=trigger"
  - "wud.hook.3.trigger=slack"
## 🩺 Automatic rollback on healthcheck failure

When `ROLLBACK` is enabled (globally with the env var, or per container with the
`wud.rollback.enable` label), WUD keeps the previous container **archived under a
temporary name** while it validates the replacement. If the replacement does not
become healthy, WUD restores the previous container and removes the broken one,
so a bad release never leaves a service down.

The same options can be set per container with labels (labels win over the
trigger configuration):

| Label | Equivalent env var | Default |
| --- | --- | --- |
| `wud.rollback.enable` | `WUD_TRIGGER_DOCKER_{trigger_name}_ROLLBACK` | `false` |
| `wud.rollback.window` | `WUD_TRIGGER_DOCKER_{trigger_name}_ROLLBACKWINDOW` | `300000` |
| `wud.rollback.interval` | `WUD_TRIGGER_DOCKER_{trigger_name}_ROLLBACKINTERVAL` | `10000` |
| `wud.rollback.grace` | `WUD_TRIGGER_DOCKER_{trigger_name}_ROLLBACKGRACE` | `10000` |

### HEALTHCHECK vs grace period

WUD distinguishes two cases when validating the replacement:

- **The image defines a `HEALTHCHECK`**: WUD waits up to `ROLLBACKWINDOW` ms for
  the container to report `healthy` or `unhealthy` (sampling every
  `ROLLBACKINTERVAL` ms). `unhealthy`, a crash, or a window exhaustion all
  trigger the rollback.
- **The image defines no `HEALTHCHECK`**: there is no health signal, so WUD falls
  back to a **liveness smoke test**: the replacement must stay up for
  `ROLLBACKGRACE` ms. It is accepted only if it is still running at the end of
  the grace period; a crash during the grace period rolls back.

Transient Docker Engine inspection errors are retried and never produce a verdict
on their own; only an observed exit or a container that stays uninspectable for
the whole window/grace is treated as a crash.

:::warning
A container started with `AutoRemove` cannot be archived, so the automatic
rollback is skipped for it (WUD logs a warning and proceeds without a rollback
safety net).
:::

:::info
When at least one container is updated through a Docker Compose project, the
rollback coordination is handled at the project level — see the
[Docker Compose trigger](../docker-compose/README.md#-automatic-rollback-on-healthcheck-failure).
:::

### Example

<Tabs>
  <TabItem value="Compose" label="Docker Compose" default>

```yaml
services:
  wud:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WUD_TRIGGER_DOCKER_LOCAL_ROLLBACK=true
      - WUD_TRIGGER_DOCKER_LOCAL_ROLLBACKWINDOW=300000
      - WUD_TRIGGER_DOCKER_LOCAL_ROLLBACKGRACE=15000
```

  </TabItem>
  <TabItem value="Docker run" label="Docker run">

```bash
docker run -d \
  --name wud \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e WUD_TRIGGER_DOCKER_LOCAL_ROLLBACK=true \
  -e WUD_TRIGGER_DOCKER_LOCAL_ROLLBACKWINDOW=300000 \
  -e WUD_TRIGGER_DOCKER_LOCAL_ROLLBACKGRACE=15000 \
  getwud/wud
```

  </TabItem>
</Tabs>

Label equivalent on a monitored container:

```yaml
services:
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

### Let WUD Update Itself

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
      - WUD_TRIGGER_DOCKER_LOCAL_SELFUPDATE=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e WUD_TRIGGER_DOCKER_LOCAL_PRUNE=true \
  -e WUD_TRIGGER_DOCKER_LOCAL_SELFUPDATE=true \
  getwud/wud
```

</TabItem>
</Tabs>
