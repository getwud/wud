---
title: Forgejo
description: Configure authentication for Forgejo container registries in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Forgejo Container Registry

<DocHero
  icon="forgejo"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The forgejo registry module connects to self-hosted or public Forgejo container registries."
/>

:::info[Zero-Config for Public Images]
Public packages work out of the box with zero configuration. Configure this module to monitor private repositories or avoid anonymous rate limits.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_FORGEJO_{registry_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS URL">
    Forgejo instance URL (e.g. `https://forgejo.example.com`)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_FORGEJO_{registry_name}_LOGIN"
    type="string"
    required={true}
    supported="Required when password/token is provided">
    Forgejo username
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_FORGEJO_{registry_name}_PASSWORD"
    type="string"
    required={true}
    supported="Required when username is provided">
    Forgejo password or Personal Access Token (PAT)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_FORGEJO_{registry_name}_AUTH"
    type="string"
    required={false}
    supported="Base64-encoded username:password (mutually exclusive with LOGIN/PASSWORD)">
    Direct Base64-encoded `username:password` string
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with a Self-Hosted Forgejo Instance

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_FORGEJO_LOCAL_URL=https://forgejo.example.com
      - WUD_REGISTRY_FORGEJO_LOCAL_LOGIN=johndoe
      - WUD_REGISTRY_FORGEJO_LOCAL_PASSWORD=secret_pat_token
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_FORGEJO_LOCAL_URL="https://forgejo.example.com" \
  -e WUD_REGISTRY_FORGEJO_LOCAL_LOGIN="johndoe" \
  -e WUD_REGISTRY_FORGEJO_LOCAL_PASSWORD="secret_pat_token" \
  getwud/wud
```

</TabItem>
</Tabs>
