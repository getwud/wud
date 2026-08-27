import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Docker Watchers

<DocHero
  icon="docker"
  badge="⚡ Active by Default"
  badgeType="default"
  description="Watchers are responsible for discovering and scanning Docker containers on local or remote Docker daemons."
/>

:::info[Default Watcher]
If no watcher is explicitly configured, a default watcher named `local` is automatically created, monitoring `/var/run/docker.sock`.
:::

:::tip[Per-Container Configuration]
To customize how WUD monitors specific containers (opt-in/opt-out, tag filtering, semver transforms, custom display names, or trigger routing), see the [**Container Labels**](labels.md) documentation.
:::

---

## Configuration Options

<ConfigList>
  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_CAFILE"
    type="path"
    required={false}
    supported="File path">
    Path to CA certificate PEM file (for TLS connection only)
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_CERTFILE"
    type="path"
    required={false}
    supported="File path">
    Path to client certificate PEM file (for TLS connection only)
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_CRON"
    required={false}
    type="url"
    defaultValue="0 * * * *"
    supported="[Valid CRON expression](https://crontab.guru/)">
    CRON schedule for automatic checks
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_HOST"
    type="string"
    required={false}
    supported="Hostname or IP">
    Docker daemon hostname or IP address to monitor
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_JITTER"
    type="integer"
    required={false}
    defaultValue="60000"
    supported="> 0">
    Random jitter in milliseconds applied to the CRON schedule to distribute load across registries (primarily Docker Hub)
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_KEYFILE"
    type="path"
    required={false}
    supported="File path">
    Path to client private key PEM file (for TLS connection only)
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_PORT"
    required={false}
    type="integer"
    defaultValue="2375"
    supported="Port number">
    Docker daemon TCP port to connect to
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_SOCKET"
    type="path"
    required={false}
    defaultValue="/var/run/docker.sock"
    supported="Valid UNIX socket path">
    Docker UNIX socket path to monitor
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_WATCHALL"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether WUD should monitor all containers instead of only running ones
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_WATCHATSTART"
    required={false}
    type="boolean"
    defaultValue="true">
    Whether WUD should check for image updates during startup
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_WATCHBYDEFAULT"
    required={false}
    type="boolean"
    defaultValue="true">
    Whether WUD should monitor all discovered containers by default
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_{watcher_name}_WATCHEVENTS"
    required={false}
    type="boolean"
    defaultValue="true">
    Whether WUD should listen for Docker daemon events in real-time
  </ConfigOption>
</ConfigList>

:::info[Multiple & Remote Watchers]
You can configure multiple watchers to monitor both local and remote Docker hosts simultaneously.
- **Remote Hosts**: For remote Docker TCP and mutual TLS setup, see [**Remote Daemons & TLS Security**](remote-tls.md).
- **Rate Limits & Digests**: To learn how digest polling works and prevent Docker Hub quota exhaustion, see [**Digest & Rate Limits**](digest-rate-limits.md).
- **Per-Container Rules**: To configure tag filtering and routing per container, see [**Container Labels**](labels.md).
:::

---



## Examples

### 1. Watch the local Docker host daily at 1:00 AM

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - WUD_WATCHER_LOCAL_CRON=0 1 * * *
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e WUD_WATCHER_LOCAL_CRON="0 1 * * *" \
  getwud/wud
```

</TabItem>
</Tabs>

### 2. Watch all containers (including stopped / paused)

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - WUD_WATCHER_LOCAL_WATCHALL=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e WUD_WATCHER_LOCAL_WATCHALL="true" \
  getwud/wud
```

</TabItem>
</Tabs>

### 3. Watch a remote Docker host via TCP (Port 2375)

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_WATCHER_MYREMOTEHOST_HOST=myremotehost
      - WUD_WATCHER_MYREMOTEHOST_PORT=2375
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d \
  -e WUD_WATCHER_MYREMOTEHOST_HOST="myremotehost" \
  -e WUD_WATCHER_MYREMOTEHOST_PORT="2375" \
  getwud/wud
```

</TabItem>
</Tabs>

### 4. Watch a remote Docker host with TLS (Port 2376)

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
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
docker run -d \
  -e WUD_WATCHER_MYREMOTEHOST_HOST="myremotehost" \
  -e WUD_WATCHER_MYREMOTEHOST_PORT="2376" \
  -e WUD_WATCHER_MYREMOTEHOST_CAFILE="/certs/ca.pem" \
  -e WUD_WATCHER_MYREMOTEHOST_CERTFILE="/certs/cert.pem" \
  -e WUD_WATCHER_MYREMOTEHOST_KEYFILE="/certs/key.pem" \
  -v /my-host/my-certs/ca.pem:/certs/ca.pem:ro \
  -v /my-host/my-certs/cert.pem:/certs/cert.pem:ro \
  -v /my-host/my-certs/key.pem:/certs/key.pem:ro \
  getwud/wud
```

</TabItem>
</Tabs>

### 5. Watch multiple Docker hosts simultaneously

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - WUD_WATCHER_LOCAL_SOCKET=/var/run/docker.sock
      - WUD_WATCHER_PROD_HOST=prod-docker-host
      - WUD_WATCHER_STAGING_HOST=staging-docker-host
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e WUD_WATCHER_LOCAL_SOCKET="/var/run/docker.sock" \
  -e WUD_WATCHER_PROD_HOST="prod-docker-host" \
  -e WUD_WATCHER_STAGING_HOST="staging-docker-host" \
  getwud/wud
```

</TabItem>
</Tabs>
