---
title: Elastic Container Registry
description: Configure authentication for Elastic Container Registry (docker.elastic.co) in WUD (What's Up Docker?).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Elastic Container Registry

<DocHero
  icon="elastic"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The elastic registry module connects to Elastic Container Registry (docker.elastic.co)."
/>

:::info[Zero-Config for Public Images]
Public images on `docker.elastic.co` (such as Elasticsearch, Kibana, and Logstash) work out of the box with zero configuration. WUD automatically negotiates the OCI anonymous Bearer token challenge. Configure credentials only when authenticating with private registries or custom mirrors.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_ELASTIC_{registry_name}_URL"
    required={false}
    type="string"
    defaultValue="https://docker.elastic.co"
    supported="Valid HTTP/HTTPS registry URL">
    Registry base URL
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ELASTIC_{registry_name}_LOGIN"
    required={false}
    type="string">
    Username / login for authenticated pulls
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ELASTIC_{registry_name}_PASSWORD"
    required={false}
    type="string">
    Password for authenticated pulls
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ELASTIC_{registry_name}_TOKEN"
    required={false}
    type="string">
    Bearer token for registry authentication
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ELASTIC_{registry_name}_AUTH"
    required={false}
    type="string"
    supported="Base64-encoded string (`username:password`)">
    Base64-encoded credentials
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Zero Configuration (Public Images)

Because Elastic is active by default, monitoring containers such as `docker.elastic.co/elasticsearch/elasticsearch:8.15.0` requires no environment variables at all.

### Custom Elastic Mirror or Private Registry

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_ELASTIC_CUSTOM_URL=https://custom-elastic-mirror.example.com
      - WUD_REGISTRY_ELASTIC_CUSTOM_LOGIN=myuser
      - WUD_REGISTRY_ELASTIC_CUSTOM_PASSWORD=secretpassword
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_ELASTIC_CUSTOM_URL="https://custom-elastic-mirror.example.com" \
  -e WUD_REGISTRY_ELASTIC_CUSTOM_LOGIN="myuser" \
  -e WUD_REGISTRY_ELASTIC_CUSTOM_PASSWORD="secretpassword" \
  getwud/wud
```

</TabItem>
</Tabs>
