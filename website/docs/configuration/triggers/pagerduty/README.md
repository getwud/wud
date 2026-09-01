---
title: PagerDuty
description: Dispatch container update alerts to PagerDuty services in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# PagerDuty

<DocHero
  icon="simple-icons:pagerduty"
  description="The PagerDuty trigger dispatches container update incidents to PagerDuty services using the Events API v2."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_PAGERDUTY_{trigger_name}_ROUTINGKEY"
    required={true}
    type="string">
    PagerDuty Events API v2 32-character Routing Key (Integration Key)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PAGERDUTY_{trigger_name}_SEVERITY"
    required={false}
    type="enum"
    defaultValue="info"
    supported="`info`, `warning`, `error`, `critical`">
    Incident severity level sent in the event payload
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PAGERDUTY_{trigger_name}_SOURCE"
    required={false}
    type="string"
    defaultValue="WUD">
    Unique client identifier or cluster name reported as the event source
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_PAGERDUTY_{trigger_name}_DISABLETITLE"
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

### Basic PagerDuty Incident

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_PAGERDUTY_PROD_ROUTINGKEY=abcdef1234567890abcdef1234567890
      - WUD_TRIGGER_PAGERDUTY_PROD_SEVERITY=info
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_PAGERDUTY_PROD_ROUTINGKEY="abcdef1234567890abcdef1234567890" \
  -e WUD_TRIGGER_PAGERDUTY_PROD_SEVERITY="info" \
  getwud/wud
```

</TabItem>
</Tabs>
