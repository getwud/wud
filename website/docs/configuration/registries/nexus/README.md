---
title: Sonatype Nexus Repository
description: Configure authentication for Sonatype Nexus Docker repositories in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Sonatype Nexus Repository

<DocHero
  icon="nexus"
  badge="🔐 Setup Required"
  badgeType="setup"
  description="The nexus registry module allows monitoring images from Sonatype Nexus Repository Docker connectors."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_NEXUS_{registry_name}_URL"
    required={true}
    type="url"
    supported="Full HTTP/HTTPS URL of your Nexus Docker connector connector port">
    Nexus repository URL (e.g. `https://nexus.mycompany.org:8443`)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_NEXUS_{registry_name}_USERNAME"
    required={false}
    type="string">
    Nexus username
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_NEXUS_{registry_name}_PASSWORD"
    required={false}
    type="string">
    Nexus user password or token
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with Sonatype Nexus

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_NEXUS_PRIVATE_URL=https://nexus.mycompany.org:8443
      - WUD_REGISTRY_NEXUS_PRIVATE_USERNAME=ci-agent
      - WUD_REGISTRY_NEXUS_PRIVATE_PASSWORD=secretpassword123
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_NEXUS_PRIVATE_URL="https://nexus.mycompany.org:8443" \
  -e WUD_REGISTRY_NEXUS_PRIVATE_USERNAME="ci-agent" \
  -e WUD_REGISTRY_NEXUS_PRIVATE_PASSWORD="secretpassword123" \
  getwud/wud
```

</TabItem>
</Tabs>
