---
title: DigitalOcean Container Registry (DOCR)
description: Configure authentication for DigitalOcean Container Registry in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# DigitalOcean Container Registry (DOCR)

<DocHero
  icon="docr"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The docr registry module allows monitoring images from DigitalOcean Container Registry (registry.digitalocean.com)."
/>

:::info[Zero-Config for Public Repositories]
Public DOCR repositories are monitored out of the box anonymously. Configure credentials when monitoring private registries.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_DOCR_{registry_name}_TOKEN"
    required={false}
    type="string"
    supported="DigitalOcean Personal Access Token with read-registry permissions">
    DigitalOcean API token or Read-Only registry token
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_DOCR_{registry_name}_USERNAME"
    required={false}
    type="string">
    Username (optional when using token)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_DOCR_{registry_name}_PASSWORD"
    required={false}
    type="string">
    Password (used for standard username/password login)
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with a Private DigitalOcean Registry

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_DOCR_MYREG_TOKEN=dop_v1_1234567890abcdefghijklmnopqrstuvwxyz
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_DOCR_MYREG_TOKEN="dop_v1_1234567890abcdefghijklmnopqrstuvwxyz" \
  getwud/wud
```

</TabItem>
</Tabs>
