---
title: LinuxServer.io (LSCR)
description: Configure authentication for LinuxServer.io Container Registry (lscr.io) in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# LinuxServer.io (LSCR)

<DocHero
  icon="lscr"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The lscr registry module authenticates with LinuxServer.io (lscr.io) container registries."
/>

:::info[Zero-Config for Public Images]
Public packages work out of the box with zero configuration. Configure this module to monitor private repositories or avoid anonymous rate limits.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_LSCR_{registry_name}_USERNAME"
    required={true}
    type="string">
    GitHub username
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_LSCR_{registry_name}_TOKEN"
    type="string"
    required={true}
    supported="Valid GitHub Personal Access Token (`ghp_...` or classic)">
    GitHub Personal Access Token (PAT)
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate for LSCR Images

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_LSCR_LOCAL_USERNAME=johndoe
      - WUD_REGISTRY_LSCR_LOCAL_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_LSCR_LOCAL_USERNAME="johndoe" \
  -e WUD_REGISTRY_LSCR_LOCAL_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Creating a GitHub PAT for LSCR

1. Open [GitHub Personal Access Tokens Settings](https://github.com/settings/tokens).
2. Click **Generate new token (classic)** and select the **`read:packages`** scope.
3. Copy the token and set it as `WUD_REGISTRY_LSCR_{registry_name}_TOKEN`.
