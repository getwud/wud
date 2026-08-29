---
title: Alibaba Cloud Container Registry (ACR)
description: Configure authentication for Alibaba Cloud Container Registry in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Alibaba Cloud Container Registry (ACR)

<DocHero
  icon="alibaba"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The alibaba registry module allows monitoring images hosted on Alibaba Cloud ACR (*.aliyuncs.com)."
/>

:::info[Zero-Config for Public Repositories]
Public Alibaba Cloud repositories are monitored out of the box anonymously. Configure credentials when monitoring private repositories.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_ALIBABA_{registry_name}_USERNAME"
    required={false}
    type="string">
    Alibaba Cloud account ID or RAM user name
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ALIBABA_{registry_name}_PASSWORD"
    required={false}
    type="string">
    Alibaba Cloud Container Registry password
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ALIBABA_{registry_name}_TOKEN"
    required={false}
    type="string">
    Temporary STS or access token
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with Alibaba Cloud Container Registry

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_ALIBABA_PROD_USERNAME=myramuser@1234567890123456
      - WUD_REGISTRY_ALIBABA_PROD_PASSWORD=mysecretregistrypassword
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_ALIBABA_PROD_USERNAME="myramuser@1234567890123456" \
  -e WUD_REGISTRY_ALIBABA_PROD_PASSWORD="mysecretregistrypassword" \
  getwud/wud
```

</TabItem>
</Tabs>
