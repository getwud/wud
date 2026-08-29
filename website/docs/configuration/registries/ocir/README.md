---
title: Oracle Cloud Infrastructure Registry (OCIR)
description: Configure authentication for Oracle Cloud Infrastructure Registry in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Oracle Cloud Infrastructure Registry (OCIR)

<DocHero
  icon="ocir"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The ocir registry module allows monitoring images hosted on Oracle Cloud Infrastructure Registry (*.ocir.io)."
/>

:::info[Zero-Config for Public Repositories]
Public Oracle Cloud OCIR repositories are monitored out of the box anonymously. Configure credentials when monitoring private repositories.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_OCIR_{registry_name}_USERNAME"
    required={false}
    type="string"
    supported="<tenancy-namespace>/<username> or <tenancy-namespace>/oracleidentitycloudservice/<username>">
    Oracle Cloud IAM username prefixed with tenancy namespace
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_OCIR_{registry_name}_PASSWORD"
    required={false}
    type="string"
    supported="OCI Auth Token created in Oracle Cloud Console user profile">
    OCI Auth Token
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with Oracle Cloud Infrastructure Registry

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_OCIR_MYREG_USERNAME=mytenancy/myuser
      - WUD_REGISTRY_OCIR_MYREG_PASSWORD=AuthTokenGeneratedInConsole123!
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_OCIR_MYREG_USERNAME="mytenancy/myuser" \
  -e WUD_REGISTRY_OCIR_MYREG_PASSWORD="AuthTokenGeneratedInConsole123!" \
  getwud/wud
```

</TabItem>
</Tabs>
