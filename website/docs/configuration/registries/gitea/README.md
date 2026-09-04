---
title: Gitea
description: Configure authentication for Gitea container registries in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Gitea Container Registry

<DocHero
  icon="gitea"
  badge="🔐 Setup Required"
  badgeType="setup"
  description="The gitea registry module connects to self-hosted or public Gitea container registries."
/>

:::info[Zero-Config for Public Images]
Public packages work out of the box with zero configuration. Configure this module to monitor private repositories or avoid anonymous rate limits.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_GITEA_{registry_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS URL">
    Gitea instance base URL (e.g. `https://gitea.example.com`)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_GITEA_{registry_name}_LOGIN"
    type="string"
    required={true}
    supported="Required when password/token is provided">
    Gitea username
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_GITEA_{registry_name}_PASSWORD"
    type="string"
    required={true}
    supported="Required when username is provided">
    Gitea password or Personal Access Token (PAT)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_GITEA_{registry_name}_AUTH"
    type="string"
    required={false}
    supported="Base64-encoded username:password (mutually exclusive with LOGIN/PASSWORD)">
    Direct Base64-encoded `username:password` string
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with a Self-Hosted Gitea Instance

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_GITEA_LOCAL_URL=https://gitea.example.com
      - WUD_REGISTRY_GITEA_LOCAL_LOGIN=johndoe
      - WUD_REGISTRY_GITEA_LOCAL_PASSWORD=secret_token_12345
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_GITEA_LOCAL_URL="https://gitea.example.com" \
  -e WUD_REGISTRY_GITEA_LOCAL_LOGIN="johndoe" \
  -e WUD_REGISTRY_GITEA_LOCAL_PASSWORD="secret_token_12345" \
  getwud/wud
```

</TabItem>
</Tabs>
