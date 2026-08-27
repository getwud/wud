---
title: Docker Hub
description: Configure authentication, rate limiting, and digest tracking for Docker Hub in What's Up Docker (WUD).
---

import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Docker Hub

![logo](docker.svg)

The `hub` registry module lets you configure authentication, rate limits, and digest monitoring for [Docker Hub](https://hub.docker.com/).

:::info[Zero-Config for Public Images]
By default, WUD connects to Docker Hub anonymously with zero configuration. Configure authentication if you need to monitor private repositories or double your API rate limit quotas.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_HUB_PUBLIC_LOGIN"
    required={false}
    type="string"
    supported="Required when password/token is provided">
    Docker Hub account username
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_HUB_PUBLIC_PASSWORD"
    required={false}
    type="string"
    supported="Required when username is provided">
    Docker Hub Personal Access Token (PAT) (recommended) or account password
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_HUB_PUBLIC_AUTH"
    required={false}
    type="string"
    supported="Base64-encoded username:password (mutually exclusive with LOGIN/PASSWORD)">
    Direct Base64-encoded `username:password` string (as found in `~/.docker/config.json`)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_HUB_PUBLIC_WATCHDIGEST"
    required={false}
    type="boolean"
    defaultValue="false">
    Globally track image digests on Docker Hub to detect updates on mutable tags (e.g. `latest`)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_HUB_PUBLIC_SUPPRESSDIGESTWATCHWARNING"
    required={false}
    type="boolean"
    defaultValue="false">
    Suppress warning logs when digest watching is enabled on unauthenticated connections
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with Username & Personal Access Token

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_HUB_PUBLIC_LOGIN=mylogin
      - WUD_REGISTRY_HUB_PUBLIC_PASSWORD=dckr_pat_xxxxxxxxxxxxxxxxxxxx
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_HUB_PUBLIC_LOGIN="mylogin" \
  -e WUD_REGISTRY_HUB_PUBLIC_PASSWORD="dckr_pat_xxxxxxxxxxxxxxxxxxxx" \
  getwud/wud
```

</TabItem>
</Tabs>

### Enable Global Digest Watching

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_HUB_PUBLIC_WATCHDIGEST=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_HUB_PUBLIC_WATCHDIGEST="true" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Creating a Docker Hub Personal Access Token

1. Log in to [Docker Hub](https://hub.docker.com/).
2. Open your account avatar > **Account Settings** > **Security** (or [Personal Access Tokens](https://hub.docker.com/settings/security)).
3. Click **New Access Token**, name it `WUD`, and set permissions to **Read-only**.
4. Copy the generated token (`dckr_pat_...`) and set it as `WUD_REGISTRY_HUB_PUBLIC_PASSWORD`.

---

## ⏱️ Docker Hub Rate Limiting & Recommendations

Docker Hub enforces [rate limits](https://docs.docker.com/docker-hub/download-rate-limit/) on anonymous and authenticated image pulls:

- **Anonymous**: 100 pulls / 6 hours per IP address.
- **Authenticated (Free Tier)**: 200 pulls / 6 hours.
- **Pro / Team**: Unlimited.

:::tip[Best Practices for Rate Limits]
- **Authenticate**: Adding a free Docker Hub PAT instantly doubles your rate limit quota.
- **Digest Watch Selectively**: Rather than enabling global digest watching, apply the `wud.watch.digest=true` label only to containers that truly need it.
:::
