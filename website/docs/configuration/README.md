---
title: Configuration
description: Comprehensive configuration reference for What's Up Docker (WUD).
---

import { NavigationGrid, NavigationCard } from '@site/src/components/NavigationCard';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Configuration

WUD relies on **environment variables** and **[Docker labels](https://docs.docker.com/config/labels-custom-metadata/)** to configure all of its components.

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

<Tabs>
<TabItem value="docker-compose" label="docker-compose.yml">

```yaml
services:
  # Valid semver followed by OS name
  vaultwarden:
    image: vaultwarden/server:1.22.1-alpine
    container_name: bitwarden
    labels:
      - 'wud.tag.include=^\d+\.\d+\.\d+-alpine$$'
      - "wud.link.template=https://github.com/dani-garcia/vaultwarden/releases/tag/$${major}.$${minor}.$${patch}"

  # Valid semver followed by a build number (LinuxServer style)
  duplicati:
    image: linuxserver/duplicati:v2.0.6.3-2.0.6.3_beta_2021-06-17-ls104
    container_name: duplicati
    labels:
      - 'wud.tag.include=^v\d+\.\d+\.\d+\.\d+-\d+\.\d+\.\d+\.\d+.*$$'

  # Valid CalVer (calendar versioning)
  homeassistant:
    image: homeassistant/home-assistant:2021.7.1
    container_name: homeassistant
    labels:
      - 'wud.tag.include=^\d+\.\d+\.\d+$$'
      - "wud.link.template=https://github.com/home-assistant/core/releases/tag/$${major}.$${minor}.$${patch}"

  # Valid semver with a leading 'v'
  pihole:
    image: pihole/pihole:v5.8.1
    container_name: pihole
    labels:
      - 'wud.tag.include=^v\d+\.\d+\.\d+$$'
      - "wud.link.template=https://github.com/pi-hole/FTL/releases/tag/v$${major}.$${minor}.$${patch}"

  # Mutable tag (latest) with digest tracking
  pyload:
    image: writl/pyload:latest
    container_name: pyload
    labels:
      - "wud.tag.include=latest"
      - "wud.watch.digest=true"

  # WUD self-tracking
  whatsupdocker:
    image: getwud/wud:5.1.0
    container_name: wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/wud/store:/store
    healthcheck:
      test: curl --fail http://localhost:${WUD_SERVER_PORT:-3000}/health || exit 1
      interval: 10s
      timeout: 10s
      retries: 3
      start_period: 10s
    labels:
      - 'wud.tag.include=^\d+\.\d+\.\d+$$'
      - "wud.link.template=https://github.com/getwud/wud/releases/tag/$${major}.$${minor}.$${patch}"
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
