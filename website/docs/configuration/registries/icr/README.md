---
title: IBM Cloud Container Registry (ICR)
description: Configure authentication for IBM Cloud Container Registry in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# IBM Cloud Container Registry (ICR)

<DocHero
  icon="icr"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The icr registry module allows monitoring images hosted on IBM Cloud Container Registry (*.icr.io)."
/>

:::info[Zero-Config for Public Namespaces]
Public IBM Cloud namespaces are monitored out of the box anonymously. Configure credentials when monitoring private namespaces.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_ICR_{registry_name}_APIKEY"
    required={false}
    type="string"
    supported="IBM Cloud IAM API key">
    IBM Cloud IAM API key (authenticates automatically with `iamapikey` username)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ICR_{registry_name}_USERNAME"
    required={false}
    type="string"
    defaultValue="iamapikey">
    Username (defaults to `iamapikey`)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ICR_{registry_name}_PASSWORD"
    required={false}
    type="string">
    Password (alternative to API key)
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with IBM Cloud Container Registry

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_ICR_US_APIKEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_ICR_US_APIKEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  getwud/wud
```

</TabItem>
</Tabs>
