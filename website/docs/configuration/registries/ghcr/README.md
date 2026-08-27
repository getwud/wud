---
title: GitHub Container Registry (GHCR)
description: Configure authentication for GitHub Container Registry packages in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# GitHub Container Registry (GHCR)

<DocHero
  icon="ghcr"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The ghcr registry module lets you authenticate against the GitHub Container Registry (ghcr.io)."
/>

:::info[Zero-Config for Public Images]
Public packages work out of the box with zero configuration. Configure this module to monitor private repositories or avoid anonymous rate limits.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_GHCR_{registry_name}_USERNAME"
    required={true}
    type="string">
    GitHub username
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_GHCR_{registry_name}_TOKEN"
    type="string"
    required={true}
    supported="Valid GitHub Personal Access Token (`ghp_...` or classic)">
    GitHub Personal Access Token (PAT)
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate for Private GHCR Packages

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_GHCR_LOCAL_USERNAME=johndoe
      - WUD_REGISTRY_GHCR_LOCAL_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_GHCR_LOCAL_USERNAME="johndoe" \
  -e WUD_REGISTRY_GHCR_LOCAL_TOKEN="ghp_1234567890abcdefghijklmnopqrstuvwxyz" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Creating a GitHub Personal Access Token

1. Navigate to [GitHub Personal Access Tokens](https://github.com/settings/tokens).
2. Click **Generate new token (classic)**.
3. Select the **`read:packages`** scope (the only scope required by WUD).
4. Click **Generate token**, copy the token value, and set it as `WUD_REGISTRY_GHCR_{registry_name}_TOKEN`.
