---
title: Scaleway Container Registry
description: Configure authentication for Scaleway Container Registry in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Scaleway Container Registry

<DocHero
  icon="scaleway"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The scaleway registry module allows monitoring images hosted on Scaleway Container Registry (rg.<region>.scw.cloud)."
/>

:::info[Zero-Config for Public Namespaces]
Public Scaleway namespaces are monitored out of the box anonymously. Configure credentials when monitoring private namespaces.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_SCALEWAY_{registry_name}_SECRETKEY"
    required={false}
    type="string"
    supported="Valid Scaleway API Secret Key UUID">
    Scaleway Secret Key (used as Docker login password with `nologin` username)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_SCALEWAY_{registry_name}_USERNAME"
    required={false}
    type="string"
    defaultValue="nologin">
    Username (defaults to `nologin`)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_SCALEWAY_{registry_name}_PASSWORD"
    required={false}
    type="string">
    Password (alternative to secret key)
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with a Private Scaleway Registry

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_SCALEWAY_PARIS_SECRETKEY=00000000-0000-0000-0000-000000000000
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_SCALEWAY_PARIS_SECRETKEY="00000000-0000-0000-0000-000000000000" \
  getwud/wud
```

</TabItem>
</Tabs>
