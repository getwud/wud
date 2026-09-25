---
title: One-Shot Headless Mode (CLI)
description: Run WUD as a single-shot CLI (wud watch) for CI pipelines and cron jobs, without a database.
---

import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# One-Shot Headless Mode (CLI)

WUD ships **one Docker image with two entry points**. Besides the classic long-running server, the same image can run a **one-shot headless scan**: watch every container once, optionally notify triggers, print the results as JSON on stdout, then exit.

This mode is designed for **CI pipelines, cron jobs, and scripts**:

```bash
docker run --rm -e WUD_RUN_MODE=oneshot getwud/wud watch
```

No store file is created, no web server is started, and the process always exits.

---

## 🚀 Selecting the Mode

The mode is selected exclusively with the `WUD_RUN_MODE` environment variable:

<ConfigList>
  <ConfigOption
    name="WUD_RUN_MODE"
    required={false}
    type="string"
    defaultValue="server"
    supported="`server`, `oneshot`">
    Execution mode for WUD. Set to `oneshot` to run a single scan and exit, or `server` (default) to start the long-running web UI, REST API, and background watchers.
  </ConfigOption>
</ConfigList>

When `WUD_RUN_MODE=oneshot` is set, the entry point used is:

```bash
node dist/index <command> [options]
```

In the container, the entrypoint detects the mode automatically:

```bash
docker run --rm -e WUD_RUN_MODE=oneshot getwud/wud watch
docker run --rm -e WUD_RUN_MODE=oneshot getwud/wud --help
```

:::note[One image, two entry points]
`WUD_RUN_MODE` does **not** select a different image: the `getwud/wud` image contains the full server, the web UI, and the SQLite store. The one-shot mode simply skips starting the server, the store, and the metrics endpoint.
:::

---

## 🔧 Commands

| Command | Description |
| :--- | :--- |
| `watch` | Full scan → compute updates → (optional) triggers → JSON output → exit. **Default when no command is given** (`wud` alone = `wud watch`). |
| `version` | Print the WUD version (e.g. `9.1.0`). Useful for CI traceability. |
| `--help` | Print the usage and exit. |

### `watch` options

| Option | Description |
| :--- | :--- |
| `--update-available` | Output only the containers that have an update available right now (same filter as the in-memory API filter). The output filter is **orthogonal to the exit code**. |
| `--format=json` | JSON array of containers (default). |
| `--format=ndjson` | One JSON object per line (NDJSON). |
| `--fail-on-update` | Exit with code `1` when at least one update is available, so pipelines can gate on updates. |

:::info[Exit codes]

| Code | Meaning |
| :---: | :--- |
| `0` | Scan completed, no update available. |
| `1` | Technical error (Docker socket unreachable, invalid configuration, ...) **or**, with `--fail-on-update`, at least one update available. |

:::

---

## 📦 Output Contract

The output is **byte-compatible with `GET /api/containers`**: the same validated
container model, the same `undefined → null` serialization, and the same
deterministic sort order (`watcher` → `name` → `image.tag.value`).

Default output — a JSON array of all containers, including containers in error:

```json
[
  {
    "id": "f4cbbaa4f918",
    "name": "nginx",
    "displayName": "nginx",
    "displayIcon": "mdi:docker",
    "status": "running",
    "watcher": "local",
    "image": {
      "id": "8e4a1e2c7f",
      "registry": { "name": "hub.public", "url": "registry-1.docker.io" },
      "name": "library/nginx",
      "tag": { "value": "latest", "semver": false },
      "digest": { "watch": true, "value": "sha256:ed05ca7857c7", "repo": "sha256:ed05ca7857c7" },
      "architecture": "amd64",
      "os": "linux"
    },
    "result": { "tag": "latest", "digest": "sha256:2f1b68a9f597" },
    "updateAvailable": true,
    "updateKind": { "kind": "digest", "localValue": "sha256:ed05ca7857c7", "remoteValue": "sha256:2f1b68a9f597" },
    "labels": {},
    "isCoolingDown": false,
    "isSnoozed": false,
    "snoozedVersion": null,
    "snoozedUntil": null,
    "delay": null
  }
]
```

Stateless fields that do not exist in one-shot mode (`snoozedVersion`, `snoozedUntil`, `delay`, `link`, ...) are serialized as `null` — never as missing keys — exactly like the API.

:::note[Diagnostics go to stderr]
Logs and error messages are written to **stderr** so stdout stays perfectly clean for the JSON contract:

```bash
docker run --rm -e WUD_RUN_MODE=oneshot getwud/wud watch 1>containers.json 2>wud.log
```

:::

---

## ⚙️ Configuration

One-shot reuses the **existing** environment variables — no new schema:

| Variables | One-shot behavior |
| :--- | :--- |
| `WUD_WATCHER_*` | Used (unchanged Joi schemas). |
| `WUD_REGISTRY_*` | Used (unchanged Joi schemas). |
| `WUD_TRIGGER_*` | **Optional** — with no trigger variable the run is pure JSON with no side effects; with trigger variables the same engine notifies/acts. |
| `WUD_STORE_*`, `WUD_AUTH_*`, `WUD_SERVER_*`, `WUD_PROMETHEUS_*` | Ignored in one-shot mode. |

:::tip[No database]
One-shot never calls `WUD_STORE_*`: no SQLite file is created or touched. Consequently, stateful features are **not available** (documented as N/A):

- snooze / snoozed version (`isSnoozed`, `snoozedVersion`)
- cooling-down period (`isCoolingDown`)
- watch delay (`wud.watch.delay`)

`updateAvailable` is the bare "an update is available right now" signal, mirroring the first-scan behavior of the server.
:::

---

## 💡 Examples

<Tabs>
<TabItem value="docker" label="Docker CLI">

```bash
# One scan, full JSON
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e WUD_RUN_MODE=oneshot \
  getwud/wud watch

# Gate a pipeline on available updates
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e WUD_RUN_MODE=oneshot \
  getwud/wud watch --update-available --fail-on-update

# One JSON object per line + logs on stderr
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e WUD_RUN_MODE=oneshot \
  getwud/wud watch --format=ndjson
```

</TabItem>
<TabItem value="compose" label="Docker Compose">

```yaml
services:
  wud-cli:
    image: getwud/wud
    environment:
      - WUD_RUN_MODE=oneshot
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    # override the default CMD ("node dist/index") with the watch command
    command: watch
    profiles: ["cli"]
```

```bash
docker compose --profile cli run --rm wud-cli
```

</TabItem>
<TabItem value="cron" label="Cron">

```cron
# Every night at 02:00, notify via triggers when updates are available
0 2 * * * docker run --rm -e WUD_RUN_MODE=oneshot getwud/wud watch --fail-on-update >> /var/log/wud/updates.log 2>&1
```

</TabItem>
</Tabs>
