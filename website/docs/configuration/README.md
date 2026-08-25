# Configuration

WUD relies on **environment variables** and **[Docker labels](https://docs.docker.com/config/labels-custom-metadata/)** to configure all of its components.

Explore the documentation for each component below:

> [**Authentication**](configuration/authentications/)

> [**Logs**](configuration/logs/)

> [**Registries**](configuration/registries/)

> [**Server**](configuration/server/)

> [**Storage**](configuration/storage/)

> [**Timezone**](configuration/timezone/)

> [**Triggers**](configuration/triggers/)

> [**Watchers**](configuration/watchers/)

## Complete example

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

## Secret management

:::warning
If you prefer not to expose sensitive values directly in environment variables, you can store them in files and reference those files by appending `__FILE` to the environment variable name.
:::

For example, instead of providing the Basic auth hash directly:

```
WUD_AUTH_BASIC_JOHN_HASH=$$apr1$$aefKbZEa$$ZSA5Y3zv9vDQOxr283NGx/
```

You can save the secret value (`$$apr1$$aefKbZEa$$ZSA5Y3zv9vDQOxr283NGx/`) to a file with appropriate permissions (such as `/tmp/john_hash`), and reference it using:

```
WUD_AUTH_BASIC_JOHN_HASH__FILE=/tmp/john_hash
```

:::info
This feature can be used with any WUD environment variable (no exceptions).
:::
