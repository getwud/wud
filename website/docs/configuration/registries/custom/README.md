---
title: Custom / Self-Hosted Registry
description: Integrate self-hosted Docker Registry v2, Harbor, Nexus, or Artifactory in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Custom / Self-Hosted Registry

<DocHero
  icon="custom"
  badge="🔐 Setup Required"
  badgeType="setup"
  description="The custom registry module allows connecting to any self-hosted, private, or third-party OCI-compliant registry."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_CUSTOM_{registry_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS URL">
    Registry base URL (e.g. `http://localhost:5000` or `https://registry.local`)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_CUSTOM_{registry_name}_LOGIN"
    type="string"
    required={false}
    supported="Required when password is provided">
    Username (for Basic / htpasswd authentication)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_CUSTOM_{registry_name}_PASSWORD"
    type="string"
    required={false}
    supported="Required when username is provided">
    Password (for Basic / htpasswd authentication)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_CUSTOM_{registry_name}_AUTH"
    type="string"
    required={false}
    supported="Base64-encoded username:password (mutually exclusive with LOGIN/PASSWORD)">
    Direct Base64-encoded `username:password` string
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Anonymous Local Registry

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_CUSTOM_LOCAL_URL=http://localhost:5000
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_CUSTOM_LOCAL_URL="http://localhost:5000" \
  getwud/wud
```

</TabItem>
</Tabs>

### Authenticated Private Registry

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_CUSTOM_LOCAL_URL=https://registry.example.com
      - WUD_REGISTRY_CUSTOM_LOCAL_LOGIN=admin
      - WUD_REGISTRY_CUSTOM_LOCAL_PASSWORD=secret_password
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_CUSTOM_LOCAL_URL="https://registry.example.com" \
  -e WUD_REGISTRY_CUSTOM_LOCAL_LOGIN="admin" \
  -e WUD_REGISTRY_CUSTOM_LOCAL_PASSWORD="secret_password" \
  getwud/wud
```

</TabItem>
</Tabs>
