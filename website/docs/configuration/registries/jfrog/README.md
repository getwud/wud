---
title: JFrog Container Registry (Artifactory)
description: Configure authentication for JFrog Artifactory container registries in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# JFrog Container Registry (Artifactory)

<DocHero
  icon="jfrog"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The jfrog registry module allows monitoring images hosted on JFrog Cloud (*.jfrog.io) or self-hosted Artifactory instances."
/>

:::info[Zero-Config for Public Repositories]
Public JFrog repositories on `*.jfrog.io` are monitored out of the box anonymously. Configure instance URL and credentials for private repositories or self-hosted Artifactory clusters.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_JFROG_{registry_name}_URL"
    required={false}
    type="url"
    supported="Full HTTP/HTTPS URL of your self-hosted Artifactory instance">
    Instance URL (e.g. `https://artifactory.mycompany.com/artifactory`)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_JFROG_{registry_name}_USERNAME"
    required={false}
    type="string">
    JFrog username
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_JFROG_{registry_name}_PASSWORD"
    required={false}
    type="string">
    JFrog password or API key
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_JFROG_{registry_name}_TOKEN"
    required={false}
    type="string">
    JFrog Identity Token or Scoped Access Token
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with JFrog Cloud

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_JFROG_CLOUD_USERNAME=myuser@example.com
      - WUD_REGISTRY_JFROG_CLOUD_PASSWORD=cmVnLWtleS0xMjM0NTY3ODk=
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_JFROG_CLOUD_USERNAME="myuser@example.com" \
  -e WUD_REGISTRY_JFROG_CLOUD_PASSWORD="cmVnLWtleS0xMjM0NTY3ODk=" \
  getwud/wud
```

</TabItem>
</Tabs>
