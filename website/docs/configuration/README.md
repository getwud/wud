---
title: Configuration
description: Comprehensive configuration reference for WUD (What's Up Docker?).
---

import { NavigationGrid, NavigationCard } from '@site/src/components/NavigationCard';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Configuration

WUD uses a clean, two-tier configuration model combining **Environment Variables** on the WUD service and **Docker Labels** on your monitored containers.

---

## ⚙️ Environment Variables vs. Docker Labels

Understanding where each setting is applied is essential:

| Configuration Mechanism | Where to Configure | Scope | Typical Use Cases |
| :--- | :--- | :--- | :--- |
| **Environment Variables** (`WUD_*`) | **WUD container** | Global | Server port, log level, authentication, registry credentials, notification triggers, watcher intervals |
| **Docker Labels** (`wud.*`) | **Monitored containers** | Per-container | Tag filtering regex, documentation/changelog links, digest watching, display names, trigger overrides |

:::tip[Rule of Thumb]

- **Configure WUD globally**: Pass `WUD_*` environment variables to the **WUD container** (e.g. configure a Telegram bot token, Docker Hub credentials, or storage path).
- **Customize a specific application**: Attach `wud.*` labels to the **monitored container** (e.g. enforce semver pattern `^\d+\.\d+\.\d+$`, watch digests on mutable tags, or customize the changelog link). For full details, see the [Container Labels Guide](./watchers/labels.md).

:::

---

## 📂 Configuration Components

Explore the documentation for each component below:

<NavigationGrid>
  <NavigationCard
    icon="mdi-lock"
    title="Authentication"
    href="/docs/configuration/authentications"
    description="Protect the WUD web UI and API with Basic Auth or OpenID Connect (OIDC) single sign-on."
  />

  <NavigationCard
    icon="mdi-bug"
    title="Logs"
    href="/docs/configuration/logs"
    description="Configure log verbosity levels (debug, info, warn, error) and structured output formatting."
  />

  <NavigationCard
    icon="mdi-database-search"
    title="Registries"
    href="/docs/configuration/registries"
    description="Authenticate with Docker Hub, GHCR, AWS ECR, GCP GCR/GAR, Azure ACR, Quay, or self-hosted OCI registries."
  />

  <NavigationCard
    icon="mdi-connection"
    title="Server"
    href="/docs/configuration/server"
    description="Customize the HTTP server port, CORS policies, reverse proxy headers, and base URLs."
  />

  <NavigationCard
    icon="mdi-content-save"
    title="Storage"
    href="/docs/configuration/storage"
    description="Persist state, discovered image tags, and trigger notification history with local file storage."
  />

  <NavigationCard
    icon="mdi-console-line"
    title="One-Shot Headless Mode"
    href="./oneshot"
    description="Run WUD as a single-shot CLI (wud watch) for CI pipelines and cron jobs, without a database."
  />

  <NavigationCard
    icon="mdi-clock-outline"
    title="Timezone"
    href="/docs/configuration/timezone"
    description="Set the system timezone to ensure accurate CRON scheduling and timestamped logs."
  />

  <NavigationCard
    icon="mdi-bell-ring"
    title="Triggers"
    href="/docs/configuration/triggers"
    description="Send update alerts via Discord, Slack, Telegram, Gotify, Ntfy, SMTP, or execute auto-updates."
  />

  <NavigationCard
    icon="mdi-update"
    title="Watchers"
    href="/docs/configuration/watchers"
    description="Monitor local Docker daemons, remote engines over TLS, and customize container labels."
  />
</NavigationGrid>

---

## Complete Example

The following `docker-compose.yml` demonstrates how global `WUD_*` environment variables are set on the WUD service while `wud.*` labels are attached to monitored services:

<Tabs>
<TabItem value="docker-compose" label="docker-compose.yml">

```yaml
services:
  # Monitored Service 1: Valid semver followed by OS name
  vaultwarden:
    image: vaultwarden/server:1.22.1-alpine
    container_name: bitwarden
    labels:
      - 'wud.tag.include=^\d+\.\d+\.\d+-alpine$$'
      - "wud.link.changelog=https://github.com/dani-garcia/vaultwarden/releases/tag/$${major}.$${minor}.$${patch}"
      - "wud.link.doc=https://github.com/dani-garcia/vaultwarden/wiki"
      - "wud.link.upstream=https://github.com/dani-garcia/vaultwarden"

  # Monitored Service 2: Valid semver followed by a build number (LinuxServer style)
  duplicati:
    image: linuxserver/duplicati:v2.0.6.3-2.0.6.3_beta_2021-06-17-ls104
    container_name: duplicati
    labels:
      - 'wud.tag.include=^v\d+\.\d+\.\d+\.\d+-\d+\.\d+\.\d+\.\d+.*$$'

  # Monitored Service 3: Valid CalVer (calendar versioning)
  homeassistant:
    image: homeassistant/home-assistant:2021.7.1
    container_name: homeassistant
    labels:
      - 'wud.tag.include=^\d+\.\d+\.\d+$$'
      - "wud.link.changelog=https://github.com/home-assistant/core/releases/tag/$${major}.$${minor}.$${patch}"
      - "wud.link.doc=https://www.home-assistant.io/docs/"

  # Monitored Service 4: Valid semver with a leading 'v'
  pihole:
    image: pihole/pihole:v5.8.1
    container_name: pihole
    labels:
      - 'wud.tag.include=^v\d+\.\d+\.\d+$$'
      - "wud.link.changelog=https://github.com/pi-hole/pi-hole/releases/tag/v$${major}.$${minor}.$${patch}"
      - "wud.link.doc=https://docs.pi-hole.net/"

  # Monitored Service 5: Mutable tag (latest) with digest tracking
  pyload:
    image: writl/pyload:latest
    container_name: pyload
    labels:
      - "wud.tag.include=latest"
      - "wud.watch.digest=true"

  # WUD Service: Configured via global environment variables
  whatsupdocker:
    image: getwud/wud:5.1.0
    container_name: wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/wud/store:/store
    environment:
      - WUD_LOG_LEVEL=info
      - WUD_SERVER_PORT=3000
    healthcheck:
      test: curl --fail http://localhost:${WUD_SERVER_PORT:-3000}/health || exit 1
      interval: 10s
      timeout: 10s
      retries: 3
      start_period: 10s
    labels:
      # WUD can also monitor itself!
      - 'wud.tag.include=^\d+\.\d+\.\d+$$'
      - "wud.link.changelog=https://github.com/getwud/wud/releases/tag/$${major}.$${minor}.$${patch}"
      - "wud.link.doc=https://getwud.github.io/wud/"
      - "wud.link.upstream=https://github.com/getwud/wud"
```

</TabItem>
</Tabs>

---

## Triggers

Triggers perform automated actions (such as sending notifications or executing updates) whenever a new container version is discovered. For complete details on configuring individual notification services and orchestration triggers, see the [Triggers documentation](./triggers/README.md).

### Upgrade Risk & Multi-Version Variables (requires WUD Hub)

When WUD Hub is connected, updates are automatically evaluated before trigger notifications are sent:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `${riskScore}` | Evaluated upgrade risk level (`low`, `medium`, `high`, `critical`, `locked`, `unknown`, `unsupported`) | `low`, `medium`, `high`, `critical` |
| `${riskSummary}` | Executive summary of release changes from changelog | `Maintenance release with minor security fixes.` |
| `${skippedVersionsCount}` | Number of intermediate releases skipped between current and target version | `2` |
| `${intermediateVersionsList}` | Comma-separated list of skipped intermediate tags | `7.2.0, 7.2.1` |
| `${hasBreakingChanges}` | Boolean indicating whether breaking changes are present (`true` or `false`) | `true` |
| `${breakingChangesCount}` | Total count of detected breaking changes | `2` |
| `${breakingChangesText}` | Formatted bullet list of breaking changes | `- Deprecated configuration removed` |
| `${hasDatabaseImpact}` | Boolean indicating whether database impact is present (`true` or `false`) | `true` |
| `${databaseImpact}` | Description of database or storage format impact | `Schema migration runs on startup.` |
| `${upgradeReviewUrl}` | Direct deep-link URL to review the update in the WUD UI | `https://wud.example.com/#/containers?action=review&container=redis` |

#### Threshold Filtering: `riskthreshold` and `maxskippedthreshold`

You can gate trigger executions based on the assessed risk level or prevent jumps across too many intermediate versions using the `riskthreshold` and `maxskippedthreshold` options:

- **`riskthreshold`**: Minimum changelog risk score required to fire the trigger (`all`, `low`, `medium`, `high`, `critical`).
- **`maxskippedthreshold`**: Maximum number of intermediate versions allowed to be skipped (integer `>= 0`). If an update skips more releases than this ceiling, the trigger will not fire.

<Tabs>
<TabItem value="docker-compose" label="docker-compose.yml">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      # Only notify on high or critical risk updates
      - WUD_TRIGGER_DISCORD_ALERTS_RISKTHRESHOLD=high
      # Block notification if more than 3 intermediate versions are skipped
      - WUD_TRIGGER_DISCORD_ALERTS_MAXSKIPPEDTHRESHOLD=3
```

</TabItem>
<TabItem value="env" label=".env">

```bash
# Filter triggers by evaluated risk level
WUD_TRIGGER_SLACK_DEV_RISKTHRESHOLD=medium

# Cap intermediate version jumps
WUD_TRIGGER_SLACK_DEV_MAXSKIPPEDTHRESHOLD=2
```

</TabItem>
</Tabs>

---

## Secret Management

:::warning[File-Based Secrets]
If you prefer not to expose sensitive values directly in environment variables, you can store them in files and reference those files by appending `__FILE` to the environment variable name.
:::

For example, instead of providing the Basic auth hash directly:

<Tabs>
<TabItem value="env" label=".env">

```bash
WUD_AUTH_BASIC_JOHN_HASH=$$apr1$$aefKbZEa$$ZSA5Y3zv9vDQOxr283NGx/
```

</TabItem>
</Tabs>

You can save the secret value (`$$apr1$$aefKbZEa$$ZSA5Y3zv9vDQOxr283NGx/`) to a file with appropriate permissions (such as `/tmp/john_hash`), and reference it using:

<Tabs>
<TabItem value="env-file" label=".env">

```bash
WUD_AUTH_BASIC_JOHN_HASH__FILE=/tmp/john_hash
```

</TabItem>
</Tabs>

:::info[Universal Support]
This file-based secret reference feature can be used with any WUD environment variable across all watchers, registries, and triggers.
:::

---

## Proxy & TLS Configuration

When operating behind corporate firewalls or forward proxies, WUD automatically honors standard proxy and certificate environment variables across all components:

| Environment Variable | Description | Example |
| :--- | :--- | :--- |
| `HTTP_PROXY` / `http_proxy` | Forward proxy URL for plain HTTP requests. Also used as fallback for HTTPS requests via HTTP `CONNECT` tunneling when `HTTPS_PROXY` is not set. | `http://proxy.corp.example.com:3128` |
| `HTTPS_PROXY` / `https_proxy` | Dedicated forward proxy URL for HTTPS requests (HTTP/HTTPS or SOCKS5). | `http://proxy.corp.example.com:3128` or `socks5://proxy:1080` |
| `NO_PROXY` / `no_proxy` | Comma-separated domain suffixes, hostnames, or IP addresses to bypass the proxy. | `localhost,127.0.0.1,.internal.example.com` |
| `NODE_EXTRA_CA_CERTS` | Absolute path to additional trusted root CA certificates in PEM format (e.g. corporate private CA). | `/etc/ssl/certs/corporate-ca.pem` |

:::tip[Node Runtime Proxy Support]
When proxy environment variables are detected, WUD automatically enables Node's runtime proxy support (`--use-env-proxy`), ensuring that native HTTP/HTTPS network calls, triggers, and SDK integrations seamlessly honor your proxy configuration.
:::
