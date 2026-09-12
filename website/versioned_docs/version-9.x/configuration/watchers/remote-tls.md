import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Remote Daemons & TLS Security

This guide covers how to monitor remote Docker engines with WUD and secure remote daemon connections with mutual TLS (mTLS).

---

## 1. Connection Modes: Socket vs. TCP

WUD supports two mutually exclusive connection modes for each watcher:

| Mode | Configuration | Best For | Security Notes |
| :--- | :--- | :--- | :--- |
| **Local Unix Socket** | `WUD_WATCHER_{name}_SOCKET` | Local Docker host | Mount `/var/run/docker.sock:ro` into the WUD container. Fast and inherently secure. |
| **Remote TCP API** | `WUD_WATCHER_{name}_HOST` + `PORT` | Remote Docker hosts (servers, VPS, edge nodes) | **Must** be secured with TLS (`port 2376`) or run over an encrypted VPN/WireGuard tunnel. |

:::warning[Mutually Exclusive]
`SOCKET` and `HOST`/`PORT` are mutually exclusive for a single watcher. If `HOST` is defined, `SOCKET` is ignored.
:::

---

## 2. Remote Daemon TLS Authentication (mTLS)

When exposing the Docker daemon over TCP, **never** expose unauthenticated port `2375` to the public internet. Anyone who can reach unauthenticated Docker TCP API can obtain root access on that host.

Instead, configure the remote Docker daemon to require mutual TLS authentication on port `2376`.

### Required TLS Certificates

To authenticate against a TLS-secured Docker daemon, provide the following 3 files to WUD:

| Variable | Description | Example Path in Container |
| :--- | :--- | :--- |
| `WUD_WATCHER_{name}_CAFILE` | Certificate Authority certificate PEM | `/certs/ca.pem` |
| `WUD_WATCHER_{name}_CERTFILE` | Client public certificate PEM | `/certs/cert.pem` |
| `WUD_WATCHER_{name}_KEYFILE` | Client private key PEM | `/certs/key.pem` |

---

## 3. Remote Watcher Example with TLS

Mount the certificates into the WUD container as read-only volumes and reference their container paths:

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /home/user/docker-certs/prod-node:/certs/prod-node:ro
    environment:
      # Local Docker host
      - WUD_WATCHER_LOCAL_SOCKET=/var/run/docker.sock

      # Remote Docker host (secured with TLS)
      - WUD_WATCHER_PROD_HOST=prod.example.com
      - WUD_WATCHER_PROD_PORT=2376
      - WUD_WATCHER_PROD_CAFILE=/certs/prod-node/ca.pem
      - WUD_WATCHER_PROD_CERTFILE=/certs/prod-node/cert.pem
      - WUD_WATCHER_PROD_KEYFILE=/certs/prod-node/key.pem
      - WUD_WATCHER_PROD_CRON=0 2 * * *
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d \
  --name whatsupdocker \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /home/user/docker-certs/prod-node:/certs/prod-node:ro \
  -e WUD_WATCHER_LOCAL_SOCKET=/var/run/docker.sock \
  -e WUD_WATCHER_PROD_HOST=prod.example.com \
  -e WUD_WATCHER_PROD_PORT=2376 \
  -e WUD_WATCHER_PROD_CAFILE=/certs/prod-node/ca.pem \
  -e WUD_WATCHER_PROD_CERTFILE=/certs/prod-node/cert.pem \
  -e WUD_WATCHER_PROD_KEYFILE=/certs/prod-node/key.pem \
  -e WUD_WATCHER_PROD_CRON="0 2 * * *" \
  getwud/wud
```

</TabItem>
</Tabs>
