---
title: NATS
description: Publish container update events to NATS messaging system in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# NATS

<DocHero
  icon="simple-icons:natsdotio"
  description="The NATS trigger publishes container update events as JSON payloads to subjects on NATS messaging servers, enabling cloud-native streaming and microservice orchestration."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_NATS_{trigger_name}_SERVERS"
    required={true}
    type="string"
    supported="Comma-separated list of NATS server URLs (e.g. `nats://127.0.0.1:4222` or `tls://demo.nats.io:4443`)">
    NATS server URL(s)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NATS_{trigger_name}_SUBJECT"
    required={false}
    type="string"
    defaultValue="wud.container">
    NATS subject to publish container update messages to
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NATS_{trigger_name}_USER"
    required={false}
    type="string">
    NATS basic authentication username
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NATS_{trigger_name}_PASSWORD"
    required={false}
    type="string">
    NATS basic authentication password
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NATS_{trigger_name}_TOKEN"
    required={false}
    type="string">
    NATS authentication token
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NATS_{trigger_name}_NKEY"
    required={false}
    type="string">
    NATS NKey seed for public-key authentication
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NATS_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the notification title in payload
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Publishing to NATS Subject

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_NATS_CLUSTER_SERVERS=nats://nats1:4222,nats://nats2:4222
      - WUD_TRIGGER_NATS_CLUSTER_SUBJECT=docker.updates
      - WUD_TRIGGER_NATS_CLUSTER_TOKEN=s3cr3tt0k3n
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_NATS_CLUSTER_SERVERS="nats://nats:4222" \
  -e WUD_TRIGGER_NATS_CLUSTER_SUBJECT="docker.updates" \
  -e WUD_TRIGGER_NATS_CLUSTER_TOKEN="s3cr3tt0k3n" \
  getwud/wud
```

</TabItem>
</Tabs>
