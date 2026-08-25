import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Docker Watchers

![logo](docker.png)

Watchers are responsible for discovering and scanning Docker containers.

The `docker` watcher lets you configure the local or remote Docker hosts you want to monitor.

## Variables

| Env var                                                |    Required    | Description                                                                                                            | Supported values                               | Default value when missing |
| ------------------------------------------------------ | :------------: | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------- |
| `WUD_WATCHER_{watcher_name}_CAFILE`                    | :white_circle: | Path to CA certificate PEM file (for TLS connection only)                                                              | File path                                      |                            |
| `WUD_WATCHER_{watcher_name}_CERTFILE`                  | :white_circle: | Path to client certificate PEM file (for TLS connection only)                                                          | File path                                      |                            |
| `WUD_WATCHER_{watcher_name}_CRON`                      | :white_circle: | CRON schedule for automatic checks                                                                                     | [Valid CRON expression](https://crontab.guru/) | `0 * * * *` (every hour)   |
| `WUD_WATCHER_{watcher_name}_HOST`                      | :white_circle: | Docker daemon hostname or IP address to monitor                                                                        | Hostname or IP                                 |                            |
| `WUD_WATCHER_{watcher_name}_JITTER`                    | :white_circle: | Random jitter in milliseconds applied to the CRON schedule to distribute load across registries (primarily Docker Hub) | > 0                                            | `60000` (1 minute)         |
| `WUD_WATCHER_{watcher_name}_KEYFILE`                   | :white_circle: | Path to client private key PEM file (for TLS connection only)                                                          | File path                                      |                            |
| `WUD_WATCHER_{watcher_name}_PORT`                      | :white_circle: | Docker daemon TCP port to connect to                                                                                   | Port number                                    | `2375`                     |
| `WUD_WATCHER_{watcher_name}_SOCKET`                    | :white_circle: | Docker UNIX socket path to monitor                                                                                     | Valid UNIX socket path                         | `/var/run/docker.sock`     |
| `WUD_WATCHER_{watcher_name}_WATCHALL`                  | :white_circle: | Whether WUD should monitor all containers instead of only running ones                                                 | `true`, `false`                                | `false`                    |
| `WUD_WATCHER_{watcher_name}_WATCHATSTART` (deprecated) | :white_circle: | Whether WUD should check for image updates during startup                                                              | `true`, `false`                                | `true` if store is empty   |
| `WUD_WATCHER_{watcher_name}_WATCHBYDEFAULT`            | :white_circle: | Whether WUD should monitor all discovered containers by default                                                        | `true`, `false`                                | `true`                     |
| `WUD_WATCHER_{watcher_name}_WATCHEVENTS`               | :white_circle: | Whether WUD should listen for Docker daemon events in real-time                                                        | `true`, `false`                                | `true`                     |

:::info
If no watcher is configured, a default watcher named `local` is automatically created (monitoring `/var/run/docker.sock`).
:::

:::info
You can configure multiple watchers if you have multiple Docker hosts to monitor. Simply give each watcher a distinct name.
:::

:::warning
Socket configuration and host/port configuration are mutually exclusive.
:::

:::warning
When using socket configuration, ensure that `/var/run/docker.sock` is mounted into the WUD container.
:::

:::warning
When using host/port configuration, make sure the Docker remote API is enabled on the target host.
[See dockerd documentation](https://docs.docker.com/engine/reference/commandline/dockerd/#description)
:::

:::warning
If the Docker remote API is secured with TLS, ensure you mount and configure the TLS certificates.
[See dockerd documentation](https://docs.docker.com/engine/security/protect-access/#use-tls-https-to-protect-the-docker-daemon-socket)
:::

:::warning
Watching image digests makes heavy use of the _Docker Registry Pull API_, which is subject to [**rate limits on Docker Hub**](https://docs.docker.com/docker-hub/download-rate-limit/).

By default, WUD enables digest watching only for **non-semver** image tags.
You can customize this behavior per container using the `wud.watch.digest` label.
If you encounter [rate limit errors](https://docs.docker.com/docker-hub/download-rate-limit/#how-do-i-know-my-pull-requests-are-being-limited), consider reducing check frequency by adjusting the `WUD_WATCHER_{watcher_name}_CRON` variable.
:::

## Variable examples

### Watch the local Docker host every day at 1:00 AM

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_WATCHER_LOCAL_CRON=0 1 * * *
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_WATCHER_LOCAL_CRON="0 1 * * *" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### Watch all containers regardless of status (created, paused, exited, restarting, running...)

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_WATCHER_LOCAL_WATCHALL=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_WATCHER_LOCAL_WATCHALL="true" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### Watch a remote Docker host via TCP on port 2375

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_WATCHER_MYREMOTEHOST_HOST=myremotehost
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_WATCHER_MYREMOTEHOST_HOST="myremotehost" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### Watch a remote Docker host via TCP with TLS on port 2376

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_WATCHER_MYREMOTEHOST_HOST=myremotehost
      - WUD_WATCHER_MYREMOTEHOST_PORT=2376
      - WUD_WATCHER_MYREMOTEHOST_CAFILE=/certs/ca.pem
      - WUD_WATCHER_MYREMOTEHOST_CERTFILE=/certs/cert.pem
      - WUD_WATCHER_MYREMOTEHOST_KEYFILE=/certs/key.pem
    volumes:
      - /my-host/my-certs/ca.pem:/certs/ca.pem:ro
      - /my-host/my-certs/cert.pem:/certs/cert.pem:ro
      - /my-host/my-certs/key.pem:/certs/key.pem:ro
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_WATCHER_MYREMOTEHOST_HOST="myremotehost" \
  -e WUD_WATCHER_MYREMOTEHOST_PORT="2376" \
  -e WUD_WATCHER_MYREMOTEHOST_CAFILE="/certs/ca.pem" \
  -e WUD_WATCHER_MYREMOTEHOST_CERTFILE="/certs/cert.pem" \
  -e WUD_WATCHER_MYREMOTEHOST_KEYFILE="/certs/key.pem" \
  -v /my-host/my-certs/ca.pem:/certs/ca.pem:ro \
  -v /my-host/my-certs/cert.pem:/certs/cert.pem:ro \
  -v /my-host/my-certs/key.pem:/certs/key.pem:ro \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

:::warning
Remember to mount the certificate files into the container.
:::

### Watch one local Docker host and two remote Docker hosts simultaneously

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_WATCHER_LOCAL_SOCKET=/var/run/docker.sock
      - WUD_WATCHER_MYREMOTEHOST1_HOST=myremotehost1
      - WUD_WATCHER_MYREMOTEHOST2_HOST=myremotehost2
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_WATCHER_LOCAL_SOCKET="/var/run/docker.sock" \
  -e WUD_WATCHER_MYREMOTEHOST1_HOST="myremotehost1" \
  -e WUD_WATCHER_MYREMOTEHOST2_HOST="myremotehost2" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

## Labels

To fine-tune WUD behavior on a _per-container_ basis, you can add labels to your containers.

| Label                 |    Required    | Description                                                  | Supported values                                                                                                                                                             | Default value when missing                                                            |
| --------------------- | :------------: | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `wud.display.icon`    | :white_circle: | Custom display icon for the container                        | Valid [Material Design Icon](https://materialdesignicons.com/), [Font Awesome Icon](https://fontawesome.com/) or [Simple Icon](https://simpleicons.org/) (see details below) | `mdi:docker`                                                                          |
| `wud.display.name`    | :white_circle: | Custom display name for the container                        | Any string                                                                                                                                                                   | Container name                                                                        |
| `wud.link.template`   | :white_circle: | Browsable URL template associated with the container version | JS string template with variables `${container}`, `${original}`, `${transformed}`, `${major}`, `${minor}`, `${patch}`, `${prerelease}`                                       |                                                                                       |
| `wud.tag.exclude`     | :white_circle: | Regular expression matching tags to exclude                  | Valid JavaScript RegExp                                                                                                                                                      |                                                                                       |
| `wud.tag.include`     | :white_circle: | Regular expression matching tags to include                  | Valid JavaScript RegExp                                                                                                                                                      |                                                                                       |
| `wud.tag.transform`   | :white_circle: | Transform rule to apply to the tag before analysis           | `$valid_regex => $valid_string_with_placeholders` (see details below)                                                                                                        |                                                                                       |
| `wud.trigger.exclude` | :white_circle: | Optional list of triggers to exclude                         | `$trigger_1_id,$trigger_2_id:$threshold`                                                                                                                                     |                                                                                       |
| `wud.trigger.include` | :white_circle: | Optional list of triggers to include                         | `$trigger_1_id,$trigger_2_id:$threshold`                                                                                                                                     |                                                                                       |
| `wud.watch.digest`    | :white_circle: | Track digest changes for this container                      | Boolean (`true`, `false`)                                                                                                                                                    | `false`                                                                               |
| `wud.watch`           | :white_circle: | Enable or disable monitoring for this container              | Boolean (`true`, `false`)                                                                                                                                                    | `true` when `WUD_WATCHER_{watcher_name}_WATCHBYDEFAULT` is `true` (`false` otherwise) |

## Label examples

### Monitor only specific containers (opt-in)

Configure WUD with `WATCHBYDEFAULT=false`:

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_WATCHER_LOCAL_WATCHBYDEFAULT=false
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_WATCHER_LOCAL_WATCHBYDEFAULT="false" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

Then add the `wud.watch=true` label to the containers you wish to monitor:

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  mariadb:
    image: mariadb:10.4.5
    ...
    labels:
      - wud.watch=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name mariadb --label wud.watch=true mariadb:10.4.5
```

</TabItem>
</Tabs>

### Exclude specific containers from being monitored

Ensure `WUD_WATCHER_{watcher_name}_WATCHBYDEFAULT` is set to `true` (the default).

Then add the `wud.watch=false` label to containers you wish to exclude:

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  mariadb:
    image: mariadb:10.4.5
    ...
    labels:
      - wud.watch=false
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name mariadb --label wud.watch=false mariadb:10.4.5
```

</TabItem>
</Tabs>

### Include only 3-part semver tags

You can filter which tags are considered valid candidates for updates by specifying inclusion or exclusion regex patterns.

For example, to monitor only standard `x.y.z` semver tags:

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  mariadb:
    image: mariadb:10.4.5
    labels:
      - wud.tag.include=^\d+\.\d+\.\d+$$
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name mariadb --label 'wud.tag.include=^\d+\.\d+\.\d+$' mariadb:10.4.5
```

</TabItem>
</Tabs>

### Transform tags before performing version analysis

In certain cases, image tags include metadata suffixes (such as commit hashes or build numbers) that prevent the semver resolution algorithm from matching valid update candidates or that cause false positives.

For example, consider tags formatted like `1.0.0-99-7b368146` or `1.0.0-273-21d7efa6`.  
By default, the trailing SHA-1 hash (`-7b368146`) interferes with comparison, even though `1.0.0-99` and `1.0.0-273` represent valid semver values (`$major.$minor.$patch-$prerelease`).

You can normalize tags before analysis by defining a transform rule that extracts only the desired version portion.

#### How it works

The transform rule must use the following syntax:

```
$valid_regex_with_capturing_groups => $valid_string_with_placeholders
```

For example:

```bash
^(\d+\.\d+\.\d+-\d+)-.*$ => $1
```

Capturing groups are referenced using `$1`, `$2`, `$3`, etc.

:::warning
The first capturing group is referenced as `$1`.
:::

Example configuration:

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  searx:
    image: searx/searx:1.0.0-269-7b368146
    labels:
      - wud.tag.include=^\d+\.\d+\.\d+-\d+-.*$$
      - wud.tag.transform=^(\d+\.\d+\.\d+-\d+)-.*$$ => $$1
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name searx \
  --label 'wud.tag.include=^\d+\.\d+\.\d+-\d+-.*$' \
  --label 'wud.tag.transform=^(\d+\.\d+\.\d+-\d+)-.*$ => $1' \
  searx/searx:1.0.0-269-7b368146
```

</TabItem>
</Tabs>

### Enable digest watching

In addition to semver tag tracking, you can also track whether the image digest associated with the local tag has changed on the registry.  
This is particularly useful for tracking mutable tags like `latest`, `10`, or `10.6`.

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  mariadb:
    image: mariadb:10
    labels:
      - wud.tag.include=^\d+$$
      - wud.watch.digest=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name mariadb --label 'wud.tag.include=^\d+$' --label wud.watch.digest=true mariadb:10
```

</TabItem>
</Tabs>

### Associate a link with the container version

You can generate a browsable link for each container version using a template string.
For example, to link a MariaDB container version directly to its release notes (e.g., `https://mariadb.com/kb/en/mariadb-1064-changelog`):

Specify a template such as: `https://mariadb.com/kb/en/mariadb-${major}${minor}${patch}-changelog`

The available template variables are:

- `${original}`: The original unparsed tag
- `${transformed}`: The tag after applying the optional `wud.tag.transform` rule
- `${major}`: The major version number (for semver tags)
- `${minor}`: The minor version number (for semver tags)
- `${patch}`: The patch version number (for semver tags)
- `${prerelease}`: The prerelease identifier (for semver tags)

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  mariadb:
    image: mariadb:10.6.4
    labels:
      - wud.link.template=https://mariadb.com/kb/en/mariadb-$${major}$${minor}$${patch}-changelog
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name mariadb --label 'wud.link.template=https://mariadb.com/kb/en/mariadb-${major}${minor}${patch}-changelog' mariadb:10.6.4
```

</TabItem>
</Tabs>

### Customize container display name and icon

You can customize the name and icon used for a container in the UI and integrations (e.g., Home Assistant).

Icons must be prefixed with:

- `fab:` or `fab-` for [Font Awesome Brands](https://fontawesome.com/) (`fab:github`, `fab-mailchimp`...)
- `far:` or `far-` for [Font Awesome Regular](https://fontawesome.com/) (`far:heart`, `far-house`...)
- `fas:` or `fas-` for [Font Awesome Solid](https://fontawesome.com/) (`fas:heart`, `fas-house`...)
- `hl:` or `hl-` for [Homarr Labs icons](https://dashboardicons.com/) (`hl:plex`, `hl-authelia`...)
- `mdi:` or `mdi-` for [Material Design Icons](https://materialdesignicons.com/) (`mdi:database`, `mdi-server`...)
- `sh:` or `sh-` for [Selfh.st icons](https://selfh.st/icons/) (`sh:authentik`, `sh-authelia-light`...) (PNG icons only)
- `si:` or `si-` for [Simple Icons](https://simpleicons.org/) (`si:mysql`, `si-plex`...)

:::info
To display Font Awesome or Simple Icons in Home Assistant, install the [HASS-fontawesome](https://github.com/thomasloven/hass-fontawesome) and [HASS-simpleicons](https://github.com/vigonotion/hass-simpleicons) custom integrations first.
:::

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  mariadb:
    image: mariadb:10.6.4
    labels:
      - wud.display.name=Maria DB
      - wud.display.icon=si:mariadb
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name mariadb --label 'wud.display.name=Maria DB' --label 'wud.display.icon=mdi-database' mariadb:10.6.4
```

</TabItem>
</Tabs>

### Assign specific triggers to containers

You can assign specific triggers and notification thresholds on a per-container basis.

#### Example: Send an email for all updates, but auto-update only on minor or patch versions

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  my_important_service:
    image: my_important_service:1.0.0
    labels:
      - wud.trigger.include=smtp.gmail,dockercompose.local:minor
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name my_important_service --label 'wud.trigger.include=smtp.gmail,dockercompose.local:minor' my_important_service:1.0.0
```

</TabItem>
</Tabs>

:::info
`wud.trigger.include=smtp.gmail` is shorthand for `wud.trigger.include=smtp.gmail:all`.
:::

:::info
Threshold `all`: Executes the trigger for all detected updates.
:::

:::info
Threshold `major`: Executes the trigger for `major`, `minor`, or `patch` semver updates.
:::

:::info
Threshold `minor`: Executes the trigger only for `minor` or `patch` semver updates.
:::

:::info
Threshold `patch`: Executes the trigger only for `patch` semver updates.
:::
