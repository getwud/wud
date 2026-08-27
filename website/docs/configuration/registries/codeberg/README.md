---
title: Codeberg
description: Configure authentication for private Codeberg Container Registries in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Codeberg Container Registry

<DocHero
  icon="codeberg"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The codeberg registry module connects to Codeberg's container registry (codeberg.org)."
/>

:::info[Zero-Config for Public Images]
Public packages work out of the box with zero configuration. Configure this module to monitor private repositories or avoid anonymous rate limits.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption name="WUD_REGISTRY_CODEBERG_{registry_name}_LOGIN"
    type="string"
    required={true}
    supported="Required when password/token is provided">
    Codeberg username
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_CODEBERG_{registry_name}_PASSWORD"
    type="string"
    required={true}
    supported="Required when username is provided">
    Codeberg password or Personal Access Token (PAT)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_CODEBERG_{registry_name}_AUTH"
    type="string"
    required={false}
    supported="Base64-encoded username:password (mutually exclusive with LOGIN/PASSWORD)">
    Direct Base64-encoded `username:password` string
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate for Private Codeberg Packages

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_CODEBERG_LOCAL_LOGIN=johndoe
      - WUD_REGISTRY_CODEBERG_LOCAL_PASSWORD=codeberg_secret_token
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_CODEBERG_LOCAL_LOGIN="johndoe" \
  -e WUD_REGISTRY_CODEBERG_LOCAL_PASSWORD="codeberg_secret_token" \
  getwud/wud
```

</TabItem>
</Tabs>
