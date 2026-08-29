---
title: Harbor
description: Configure authentication for self-hosted CNCF Harbor registries in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Harbor

<DocHero
  icon="harbor"
  badge="🔐 Setup Required"
  badgeType="setup"
  description="The harbor registry module allows monitoring images from your self-hosted CNCF Harbor registry instances."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_HARBOR_{registry_name}_URL"
    required={true}
    type="url"
    supported="Full HTTP/HTTPS URL of your Harbor instance">
    Harbor instance URL (e.g. `https://harbor.mycompany.org`)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_HARBOR_{registry_name}_LOGIN"
    required={false}
    type="string">
    Harbor username or Robot Account name (e.g. `robot$wud`)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_HARBOR_{registry_name}_PASSWORD"
    required={false}
    type="string">
    Harbor password or Robot Account secret token
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with Harbor Robot Account

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_HARBOR_PROD_URL=https://harbor.mycompany.org
      - WUD_REGISTRY_HARBOR_PROD_LOGIN=robot$wud
      - WUD_REGISTRY_HARBOR_PROD_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_HARBOR_PROD_URL="https://harbor.mycompany.org" \
  -e WUD_REGISTRY_HARBOR_PROD_LOGIN="robot$wud" \
  -e WUD_REGISTRY_HARBOR_PROD_PASSWORD="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  getwud/wud
```

</TabItem>
</Tabs>
