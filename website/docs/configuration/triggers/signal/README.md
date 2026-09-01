---
title: Signal
description: Send container update notifications to Signal users or groups in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Signal

<DocHero
  icon="simple-icons:signal"
  description="The Signal trigger sends secure container update notifications to Signal users or group chats using a self-hosted signal-cli REST API service."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_SIGNAL_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS signal-cli-rest-api URL (e.g. http://signal-cli:8080)">
    Base URL of the signal-cli-rest-api service
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SIGNAL_{trigger_name}_NUMBER"
    required={true}
    type="string">
    Registered phone number used as the sender account in signal-cli (e.g. `+1234567890`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SIGNAL_{trigger_name}_RECIPIENTS"
    required={true}
    type="string">
    Comma-separated list of recipient phone numbers or group IDs (e.g. `+1987654321, +1122334455`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SIGNAL_{trigger_name}_APIKEY"
    required={false}
    type="string">
    Optional Bearer authentication token for securing access to your signal-cli gateway
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SIGNAL_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the notification title in message bodies
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Basic Signal Notification

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_SIGNAL_MAIN_URL=http://signal-cli:8080
      - WUD_TRIGGER_SIGNAL_MAIN_NUMBER=+1234567890
      - WUD_TRIGGER_SIGNAL_MAIN_RECIPIENTS=+1987654321
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_SIGNAL_MAIN_URL="http://signal-cli:8080" \
  -e WUD_TRIGGER_SIGNAL_MAIN_NUMBER="+1234567890" \
  -e WUD_TRIGGER_SIGNAL_MAIN_RECIPIENTS="+1987654321" \
  getwud/wud
```

</TabItem>
</Tabs>
