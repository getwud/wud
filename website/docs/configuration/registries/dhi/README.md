---
title: Docker Hardened Images (DHI)
description: Configure authentication for Docker Hardened Images (dhi.io) in WUD (What's Up Docker?).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Docker Hardened Images (DHI)

<DocHero
  icon="hub"
  badge="🔐 Dedicated Setup Required"
  badgeType="warning"
  description="The dhi registry module authenticates with Docker Hardened Images (dhi.io) to query container tags and manifest digests."
/>

:::info[Authentication Required]
Docker Hardened Images on `dhi.io` do not support anonymous access.
You must configure your Docker Hub username and Personal Access Token (PAT) as shown below so WUD can query tags and manifests for `dhi.io` images.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_DHI_{registry_name}_USERNAME"
    required={true}
    type="string"
    supported="Required when password/token is provided (also accepts `LOGIN`)">
    Docker Hub account username
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_DHI_{registry_name}_PASSWORD"
    required={true}
    type="string"
    supported="Required when username/login is provided (also accepts `TOKEN`)">
    Docker Hub Personal Access Token (PAT) (recommended) or account password
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_DHI_{registry_name}_AUTH"
    required={false}
    type="string"
    supported="Base64-encoded username:password (mutually exclusive with USERNAME/PASSWORD)">
    Direct Base64-encoded `username:password` string (as found in `~/.docker/config.json`)
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
      - WUD_REGISTRY_DHI_PRIVATE_USERNAME=myusername
      - WUD_REGISTRY_DHI_PRIVATE_TOKEN=dckr_pat_xxxxxxxxxxxxxxxxxxxx
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_DHI_PRIVATE_USERNAME="myusername" \
  -e WUD_REGISTRY_DHI_PRIVATE_TOKEN="dckr_pat_xxxxxxxxxxxxxxxxxxxx" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Creating a Docker Hub Personal Access Token

1. Log in to [Docker Hub](https://hub.docker.com/).
2. Open your account avatar > **Account Settings** > **Security** (or [Personal Access Tokens](https://hub.docker.com/settings/security)).
3. Click **New Access Token**, name it `WUD-DHI`, and set permissions to **Read-only**.
4. Copy the generated token (`dckr_pat_...`) and set it as `WUD_REGISTRY_DHI_{registry_name}_TOKEN` or `WUD_REGISTRY_DHI_{registry_name}_PASSWORD`.
5. Ensure your Docker account has access to [Docker Hardened Images](https://docs.docker.com/dhi/).
