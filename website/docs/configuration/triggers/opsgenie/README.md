---
title: Opsgenie
description: Create alert notifications in Atlassian Opsgenie on container updates in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Opsgenie

<DocHero
  icon="simple-icons:opsgenie"
  description="The Opsgenie trigger creates structured alerts in Atlassian Opsgenie when new container versions are detected, integrating into on-call rotations and incident workflows."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_OPSGENIE_{trigger_name}_APIKEY"
    required={true}
    type="string">
    Opsgenie integration API key (`GenieKey`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_OPSGENIE_{trigger_name}_REGION"
    required={false}
    type="enum"
    defaultValue="us"
    supported="`us`, `eu`">
    Opsgenie data residency region (`us` or `eu`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_OPSGENIE_{trigger_name}_PRIORITY"
    required={false}
    type="enum"
    defaultValue="P5"
    supported="`P1`, `P2`, `P3`, `P4`, `P5`">
    Alert priority level (P5 is Informational, P1 is Critical)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_OPSGENIE_{trigger_name}_TAGS"
    required={false}
    type="string"
    defaultValue="wud,docker">
    Comma-separated list of tags to associate with created alerts
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_OPSGENIE_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the dynamic notification title
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Basic Opsgenie Alert

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_OPSGENIE_PROD_APIKEY=eb48f654-xxxx-xxxx-xxxx-xxxxxxx
      - WUD_TRIGGER_OPSGENIE_PROD_REGION=eu
      - WUD_TRIGGER_OPSGENIE_PROD_PRIORITY=P4
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_OPSGENIE_PROD_APIKEY="eb48f654-xxxx-xxxx-xxxx-xxxxxxx" \
  -e WUD_TRIGGER_OPSGENIE_PROD_REGION="eu" \
  -e WUD_TRIGGER_OPSGENIE_PROD_PRIORITY="P4" \
  getwud/wud
```

</TabItem>
</Tabs>
