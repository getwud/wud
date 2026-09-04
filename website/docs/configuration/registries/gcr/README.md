---
title: Google Container Registry (GCR)
description: Configure authentication for Google Container Registry and Artifact Registry in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Google Container Registry (GCR)

<DocHero
  icon="gcr"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The gcr registry module authenticates against Google Container Registry (GCR) and Google Artifact Registry (GAR)."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_GCR_{registry_name}_CLIENTEMAIL"
    required={true}
    type="string"
    supported="Valid Service Account email address">
    Service Account client email address
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_GCR_{registry_name}_PRIVATEKEY"
    required={true}
    type="string"
    supported="PEM-formatted private key (including `BEGIN` and `END` headers)">
    Service Account private key
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with a Google Service Account

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_GCR_PRIVATE_CLIENTEMAIL=wud-reader@myproject.iam.gserviceaccount.com
      - WUD_REGISTRY_GCR_PRIVATE_PRIVATEKEY=-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...==\n-----END PRIVATE KEY-----\n
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_GCR_PRIVATE_CLIENTEMAIL="wud-reader@myproject.iam.gserviceaccount.com" \
  -e WUD_REGISTRY_GCR_PRIVATE_PRIVATEKEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...==\n-----END PRIVATE KEY-----\n" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Creating a Service Account on Google Cloud Platform

1. Open the [Google Cloud Service Accounts Console](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. Click **Create Service Account** (e.g. `wud-reader`).
3. Grant the **Artifact Registry Reader** or **Container Registry Service Agent** role.
4. Open the created Service Account > **Keys** tab > **Add Key** > **Create new key** (JSON).
5. Download the JSON key file, open it, and copy `client_email` and `private_key` into your WUD configuration.
