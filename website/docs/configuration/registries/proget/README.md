---
title: Inedo ProGet
description: Configure authentication for Inedo ProGet container feeds in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Inedo ProGet

<DocHero
  icon="proget"
  badge="🔐 Setup Required"
  badgeType="setup"
  description="The proget registry module allows monitoring images hosted in Inedo ProGet container feeds."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_PROGET_{registry_name}_URL"
    required={true}
    type="url"
    supported="Full HTTP/HTTPS URL of your ProGet container feed">
    ProGet feed URL (e.g. `https://proget.mycompany.org`)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_PROGET_{registry_name}_USERNAME"
    required={false}
    type="string">
    ProGet username or `api`
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_PROGET_{registry_name}_PASSWORD"
    required={false}
    type="string">
    ProGet password or API Key
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with Inedo ProGet

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_PROGET_LOCAL_URL=https://proget.mycompany.org
      - WUD_REGISTRY_PROGET_LOCAL_USERNAME=api
      - WUD_REGISTRY_PROGET_LOCAL_PASSWORD=mySecretApiKey123
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_PROGET_LOCAL_URL="https://proget.mycompany.org" \
  -e WUD_REGISTRY_PROGET_LOCAL_USERNAME="api" \
  -e WUD_REGISTRY_PROGET_LOCAL_PASSWORD="mySecretApiKey123" \
  getwud/wud
```

</TabItem>
</Tabs>
