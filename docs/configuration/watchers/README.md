# Docker Watchers
![logo](docker.png)

Watchers are responsible for scanning Docker containers.

The `docker` watcher lets you configure the Docker hosts you want to watch.

## Variables

| Env var                                                   | Required       | Description                                                                                                            | Supported values                               | Default value when missing                                      |
| --------------------------------------------------------- |:--------------:| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- | 
| `WUD_WATCHER_{watcher_name}_CAFILE`                       | :white_circle: | CA pem file path (only for TLS connection)                                                                             |                                                |                                                                 |
| `WUD_WATCHER_{watcher_name}_CERTFILE`                     | :white_circle: | Certificate pem file path (only for TLS connection)                                                                    |                                                |                                                                 |
| `WUD_WATCHER_{watcher_name}_CRON`                         | :white_circle: | Scheduling options                                                                                                     | [Valid CRON expression](https://crontab.guru/) | `0 * * * *` (every hour)                                        |
| `WUD_WATCHER_{watcher_name}_HOST`                         | :white_circle: | Docker hostname or ip of the host to watch                                                                             |                                                |                                                                 |
| `WUD_WATCHER_{watcher_name}_JITTER`                       | :white_circle: | Jitter in ms applied to the CRON to better distribute the load on the registries (on the Hub at the first place) | > 0 | `60000` (1 minute)                                              |
| `WUD_WATCHER_{watcher_name}_KEYFILE`                      | :white_circle: | Key pem file path (only for TLS connection)                                                                            |                                                |                                                                 |
| `WUD_WATCHER_{watcher_name}_PORT`                         | :white_circle: | Docker port of the host to watch                                                                                       |                                                | `2375`                                                          |
| `WUD_WATCHER_{watcher_name}_SOCKET`                       | :white_circle: | Docker socket to watch                                                                                                 | Valid unix socket                              | `/var/run/docker.sock`                                          |
| `WUD_WATCHER_{watcher_name}_WATCHALL`                     | :white_circle: | If WUD must monitor all containers instead of just running ones                                                        | `true`, `false`                                | `false`                                                         |
| `WUD_WATCHER_{watcher_name}_WATCHATSTART` (deprecated)    | :white_circle: | If WUD must check for image updates during startup                                                                     | `true`, `false`                                | `true` if store is empy                                         |
| `WUD_WATCHER_{watcher_name}_WATCHBYDEFAULT`               | :white_circle: | If WUD must monitor all containers by default                                                                          | `true`, `false`                                | `true`                                                          |
| `WUD_WATCHER_{watcher_name}_WATCHEVENTS`                  | :white_circle: | If WUD must monitor docker events                                                                                      | `true`, `false`                                | `true`                                                          |

?> If no watcher is configured, a default one named `local` will be automatically created (reading the Docker socket).

?> Multiple watchers can be configured (if you have multiple Docker hosts to watch).  
You just need to give them different names.

!> Socket configuration and host/port configuration are mutually exclusive.

!> If socket configuration is used, don't forget to mount the Docker socket on your WUD container.

!> If host/port configuration is used, don't forget to enable the Docker remote API. \
[See dockerd documentation](https://docs.docker.com/engine/reference/commandline/dockerd/#description)

!> If the Docker remote API is secured with TLS, don't forget to mount and configure the TLS certificates. \
[See dockerd documentation](https://docs.docker.com/engine/security/protect-access/#use-tls-https-to-protect-the-docker-daemon-socket)

!> Watching image digests causes an extensive usage of _Docker Registry Pull API_ which is restricted by [**Quotas on the Docker Hub**](https://docs.docker.com/docker-hub/download-rate-limit/). \
By default, WUD enables it only for **non semver** image tags. \
You can tune this behavior per container using the `wud.watch.digest` label. \
If you face [quota related errors](https://docs.docker.com/docker-hub/download-rate-limit/#how-do-i-know-my-pull-requests-are-being-limited), consider slowing down the watcher rate by adjusting the `WUD_WATCHER_{watcher_name}_CRON` variable.

## Variable examples

### Watch the local docker host every day at 1am

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
        - WUD_WATCHER_LOCAL_CRON=0 1 * * *
```

#### **Docker**
```bash
docker run \
    -e WUD_WATCHER_LOCAL_CRON="0 1 * * *" \
  ...
  getwud/wud
```
<!-- tabs:end -->

### Watch all containers regardless of their status (created, paused, exited, restarting, running...)

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
        - WUD_WATCHER_LOCAL_WATCHALL=true
```

#### **Docker**
```bash
docker run \
    -e WUD_WATCHER_LOCAL_WATCHALL="true" \
  ...
  getwud/wud
```
<!-- tabs:end -->

### Watch a remote docker host via TCP on 2375

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
        - WUD_WATCHER_MYREMOTEHOST_HOST=myremotehost 
```

#### **Docker**
```bash
docker run \
    -e WUD_WATCHER_MYREMOTEHOST_HOST="myremotehost" \
  ...
  getwud/wud
```
<!-- tabs:end -->

### Watch a remote docker host via TCP with TLS enabled on 2376

<!-- tabs:start -->
#### **Docker Compose**
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
        - /my-host/my-certs/ca.pem:/certs/cert.pem:ro
        - /my-host/my-certs/ca.pem:/certs/key.pem:ro
```

#### **Docker**
```bash
docker run \
    -e WUD_WATCHER_MYREMOTEHOST_HOST="myremotehost" \
    -e WUD_WATCHER_MYREMOTEHOST_PORT="2376" \
    -e WUD_WATCHER_MYREMOTEHOST_CAFILE="/certs/ca.pem" \
    -e WUD_WATCHER_MYREMOTEHOST_CERTFILE="/certs/cert.pem" \
    -e WUD_WATCHER_MYREMOTEHOST_KEYFILE="/certs/key.pem" \
    -v /my-host/my-certs/ca.pem:/certs/ca.pem:ro \
    -v /my-host/my-certs/ca.pem:/certs/cert.pem:ro \
    -v /my-host/my-certs/ca.pem:/certs/key.pem:ro \
  ...
  getwud/wud
```
<!-- tabs:end -->

!> Don't forget to mount the certificates into the container!

### Watch 1 local Docker host and 2 remote docker hosts at the same time

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
        -  WUD_WATCHER_LOCAL_SOCKET=/var/run/docker.sock
        -  WUD_WATCHER_MYREMOTEHOST1_HOST=myremotehost1
        -  WUD_WATCHER_MYREMOTEHOST2_HOST=myremotehost2
```

#### **Docker**
```bash
docker run \
    -e  WUD_WATCHER_LOCAL_SOCKET="/var/run/docker.sock" \
    -e  WUD_WATCHER_MYREMOTEHOST1_HOST="myremotehost1" \
    -e  WUD_WATCHER_MYREMOTEHOST2_HOST="myremotehost2" \
  ...
  getwud/wud
```
<!-- tabs:end -->

## Labels

To fine-tune the behaviour of WUD _per container_, you can add labels on them.

| Label                 |    Required    | Description                                        | Supported values                                                                                                                                                            | Default value when missing                                                            |
|-----------------------|:--------------:|----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| `wud.display.icon`    | :white_circle: | Custom display icon for the container              | Valid [Material Design Icon](https://materialdesignicons.com/), [Fontawesome Icon](https://fontawesome.com/) or [Simple icon](https://simpleicons.org/) (see details below) | `mdi:docker`                                                                          |
| `wud.display.name`    | :white_circle: | Custom display name for the container              | Valid String                                                                                                                                                                | Container name                                                                        |
| `wud.link.template`         | :white_circle: | Browsable link associated to the container version | JS string template with vars `${container}`, `${original}`, `${transformed}`, `${major}`, `${minor}`, `${patch}`, `${prerelease}`                                           |                                                                                       |
| `wud.registry.lookup.image` | :white_circle: | Alternative image to use for update lookups        | Full image path (e.g., `namespace/image` or `registry.example.com/namespace/image`)                                                                                        |                                                                                       |
| `wud.tag.exclude`           | :white_circle: | Regex to exclude specific tags                     | Valid JavaScript Regex                                                                                                                                                      |                                                                                       |
| `wud.tag.include`     | :white_circle: | Regex to include specific tags only                | Valid JavaScript Regex                                                                                                                                                      |                                                                                       |
| `wud.tag.transform`   | :white_circle: | Transform function to apply to the tag             | `$valid_regex => $valid_string_with_placeholders` (see below)                                                                                                               |                                                                                       |
| `wud.trigger.exclude` | :white_circle: | Optional list of triggers to exclude               | `$trigger_1_id,$trigger_2_id:$threshold`                                                                                                                                    |                                                                                       |
| `wud.trigger.include` | :white_circle: | Optional list of triggers to include               | `$trigger_1_id,$trigger_2_id:$threshold`                                                                                                                                    |                                                                                       |
| `wud.watch.digest`    | :white_circle: | Watch this container digest                        | Valid Boolean                                                                                                                                                               | `false`                                                                               |
| `wud.watch`           | :white_circle: | Watch this container                               | Valid Boolean                                                                                                                                                               | `true` when `WUD_WATCHER_{watcher_name}_WATCHBYDEFAULT` is `true` (`false` otherwise) |

## Label examples

### Include specific containers to watch
Configure WUD to disable WATCHBYDEFAULT feature.
<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_WATCHER_LOCAL_WATCHBYDEFAULT=false
```

#### **Docker**
```bash
docker run \
    -e WUD_WATCHER_LOCAL_WATCHBYDEFAULT="false" \
  ...
  getwud/wud
```
<!-- tabs:end -->

Then add the `wud.watch=true` label on the containers you want to watch.
<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  mariadb:
    image: mariadb:10.4.5
    ...
    labels:
      - wud.watch=true
```

#### **Docker**
```bash
docker run -d --name mariadb --label wud.watch=true mariadb:10.4.5
```
<!-- tabs:end -->

### Exclude specific containers to watch
Ensure `WUD_WATCHER_{watcher_name}_WATCHBYDEFAULT` is true (default value).

Then add the `wud.watch=false` label on the containers you want to exclude from being watched.
<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  mariadb:
    image: mariadb:10.4.5
    ...
    labels:
      - wud.watch=false
```

#### **Docker**
```bash
docker run -d --name mariadb --label wud.watch=false mariadb:10.4.5
```
<!-- tabs:end -->

### Include only 3 digits semver tags
You can filter (by inclusion or exclusion) which versions can be candidates for update.

For example, you can indicate that you want to watch x.y.z versions only
<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:

  mariadb:
    image: mariadb:10.4.5
    labels:
      - wud.tag.include=^\d+\.\d+\.\d+$$
```

#### **Docker**
```bash
docker run -d --name mariadb --label 'wud.tag.include=^\d+\.\d+\.\d+$' mariadb:10.4.5
```
<!-- tabs:end -->

### Transform the tags before performing the analysis
In certain cases, tag values are so badly formatted that the resolution algorithm cannot find any valid update candidates or, worst, find bad positive matches.

For example, you can encounter such an issue if you need to deal with tags looking like `1.0.0-99-7b368146`, `1.0.0-273-21d7efa6`...  
By default, WUD will report bad positive matches because of the `sha-1` part at the end of the tag value (`-7b368146`...).  
That's a shame because `1.0.0-99` and `1.0.0-273` would have been valid semver values (`$major.$minor.$patch-$prerelease`).

You can get around this issue by providing a function that keeps only the part you are interested in.  

How does it work?  
The transform function must follow the following syntax:
```
$valid_regex_with_capturing_groups => $valid_string_with_placeholders
```

For example:
```bash
^(\d+\.\d+\.\d+-\d+)-.*$ => $1
```

The capturing groups are accessible with the syntax `$1`, `$2`, `$3`.... 

!> The first capturing group is accessible as `$1`! 

For example, you can indicate that you want to watch x.y.z versions only
<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:

  searx:
    image: searx/searx:1.0.0-269-7b368146
    labels:
      - wud.tag.include=^\d+\.\d+\.\d+-\d+-.*$$
      - wud.tag.transform=^(\d+\.\d+\.\d+-\d+)-.*$$ => $$1
```

#### **Docker**
```bash
docker run -d --name searx \
--label 'wud.tag.include=^\d+\.\d+\.\d+-\d+-.*$' \
--label 'wud.tag.transform=^(\d+\.\d+\.\d+-\d+)-.*$ => $1' \
searx/searx:1.0.0-269-7b368146
```
<!-- tabs:end -->

### Enable digest watching
Additionally to semver tag tracking, you can also track if the digest associated to the local tag has been updated.  
It can be convenient to monitor image tags known to be overridden (`latest`, `10`, `10.6`...)

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:

  mariadb:
    image: mariadb:10
    labels:
      - wud.tag.include=^\d+$$
      - wud.watch.digest=true
```
#### **Docker**
```bash
docker run -d --name mariadb --label 'wud.tag.include=^\d+$' --label wud.watch.digest=true mariadb:10
```
<!-- tabs:end -->

### Associate a link to the container version
You can associate a browsable link to the container version using a templated string.
For example, if you want to associate a mariadb version to a changelog (e.g. https://mariadb.com/kb/en/mariadb-1064-changelog),

you would specify a template like `https://mariadb.com/kb/en/mariadb-${major}${minor}${patch}-changelog`

The available variables are:
- `${original}` the original unparsed tag
- `${transformed}` the original unparsed tag transformed with the optional `wud.tag.transform` label option
- `${major}` the major version (if tag value is semver)
- `${minor}` the minor version (if tag value is semver)
- `${patch}` the patch version (if tag value is semver)
- `${prerelease}` the prerelease version (if tag value is semver)

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:

  mariadb:
    image: mariadb:10.6.4
    labels:
      - wud.link.template=https://mariadb.com/kb/en/mariadb-$${major}$${minor}$${patch}-changelog
```

#### **Docker**
```bash
docker run -d --name mariadb --label 'wud.link.template=https://mariadb.com/kb/en/mariadb-${major}${minor}${patch}-changelog' mariadb:10
```
<!-- tabs:end -->

### Customize the name and the icon to display
You can customize the name & the icon of a container (displayed in the UI, in Home-Assistant...)

Icons must be prefixed with:
- `fab:` or `fab-` for [Fontawesome brand icons](https://fontawesome.com/) (`fab:github`, `fab-mailchimp`...)
- `far:` or `far-` for [Fontawesome regular icons](https://fontawesome.com/) (`far:heart`, `far-house`...)
- `fas:` or `fas-` for [Fontawesome solid icons](https://fontawesome.com/) (`fas:heart`, `fas-house`...)
- `hl:` or `hl-` for [Homarr Labs icons](https://dashboardicons.com/) (`hl:plex`, `hl-authelia`...)
- `mdi:` or `mdi-` for [Material Design icons](https://materialdesignicons.com/) (`mdi:database`, `mdi-server`...)
- `sh:` or `sh-` for [Selfh.st](https://selfh.st/icons/) (`sh:authentik`, `sh-authelia-light`...) (only works for logo available as `png`)
- `si:` or `si-` for [Simple icons](https://simpleicons.org/) (`si:mysql`, `si-plex`...)

?> If you want to display Fontawesome icons or Simple icons in Home-Assistant, you need to install first the [HASS-fontawesome](https://github.com/thomasloven/hass-fontawesome) and the [HASS-simpleicons](https://github.com/vigonotion/hass-simpleicons) components.

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:

  mariadb:
    image: mariadb:10.6.4
    labels:
      - wud.display.name=Maria DB
      - wud.display.icon=si:mariadb
```

#### **Docker**
```bash
docker run -d --name mariadb --label 'wud.display.name=Maria DB' --label 'wud.display.icon=mdi-database' mariadb:10.6.4
```
<!-- tabs:end -->

### Assign different triggers to containers
You can assign different triggers and thresholds on a per container basis.

#### Example send a mail notification for all updates but auto-update only if minor or patch

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:

  my_important_service:
    image: my_important_service:1.0.0
    labels:
      - wud.trigger.include=smtp.gmail,dockercompose.local:minor
```

#### **Docker**
```bash
docker run -d --name my_important_service --label 'wud.trigger.include=smtp.gmail,dockercompose.local:minor' my_important_service:1.0.0
```
<!-- tabs:end -->

?> `wud.trigger.include=smtp.gmail` is a shorthand for `wud.trigger.include=smtp.gmail:all`

?> Threshold `all` means that the trigger will run regardless of the nature of the change

?> Threshold `major` means that the trigger will run only if this is a `major`, `minor` or `patch` semver change 

?> Threshold `minor` means that the trigger will run only if this is a `minor` or `patch` semver change

?> Threshold `patch` means that the trigger will run only if this is a `patch` semver change

### Use an alternative image for update lookups
When using a Docker Registry cache (Harbor, Nexus, etc.), you need to specify the upstream image that WUD should check for updates.

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:

  traefik:
    image: harbor.example.com/ghcr-proxy/traefik/traefik:v3.5.3
    labels:
      - wud.watch=true
      - wud.registry.lookup.image=ghcr.io/traefik/traefik
```

#### **Docker**
```bash
docker run -d \
  --name traefik \
  --label 'wud.watch=true' \
  --label 'wud.registry.lookup.image=ghcr.io/traefik/traefik' \
  harbor.example.com/ghcr-proxy/traefik/traefik:v3.5.3
```
<!-- tabs:end -->
