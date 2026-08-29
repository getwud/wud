---
title: Linode (Akamai) Container Registry
description: Configure authentication for Linode / Akamai container registries in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Linode (Akamai) Container Registry

<DocHero
  icon="linode"
  badge="🔐 Setup Required"
  badgeType="setup"
  description="The linode registry module allows monitoring images hosted on your Linode / Akamai private registry or LKE cluster."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_LINODE_{registry_name}_URL"
    required={false}
    type="url"
    supported="URL of your Linode-hosted registry">
    Linode registry URL (e.g. `https://registry.mycluster.linode.com`)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_LINODE_{registry_name}_USERNAME"
    required={false}
    type="string">
    Registry username
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_LINODE_{registry_name}_PASSWORD"
    required={false}
    type="string">
    Registry password or token
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with Linode-hosted Registry

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_LINODE_LKE_URL=https://registry.mycluster.linode.com
      - WUD_REGISTRY_LINODE_LKE_USERNAME=linodeuser
      - WUD_REGISTRY_LINODE_LKE_PASSWORD=secretpassword
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_LINODE_LKE_URL="https://registry.mycluster.linode.com" \
  -e WUD_REGISTRY_LINODE_LKE_USERNAME="linodeuser" \
  -e WUD_REGISTRY_LINODE_LKE_PASSWORD="secretpassword" \
  getwud/wud
```

</TabItem>
</Tabs>
