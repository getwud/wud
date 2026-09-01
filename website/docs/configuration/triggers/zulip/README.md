---
title: Zulip
description: Send container update notifications to Zulip streams or direct messages in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Zulip

<DocHero
  icon="simple-icons:zulip"
  description="The Zulip trigger lets you send container update notifications to Zulip streams or private direct messages using the Zulip REST API."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_ZULIP_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS Zulip organization URL (e.g. https://zulip.example.com)">
    Zulip server or organization base URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ZULIP_{trigger_name}_BOTEMAIL"
    required={true}
    type="string">
    Zulip bot email address
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ZULIP_{trigger_name}_APIKEY"
    required={true}
    type="string">
    Zulip bot API key
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ZULIP_{trigger_name}_TYPE"
    required={false}
    type="enum"
    defaultValue="stream"
    supported="`stream`, `direct`">
    Message destination type: stream or private direct message
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ZULIP_{trigger_name}_TO"
    required={true}
    type="string">
    Target stream name (for `stream`) or user email / ID (for `direct`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ZULIP_{trigger_name}_TOPIC"
    required={false}
    type="string"
    defaultValue="WUD Updates">
    Topic name for stream messages
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_ZULIP_{trigger_name}_DISABLETITLE"
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

### Stream Notification

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_ZULIP_MAIN_URL=https://zulip.example.com
      - WUD_TRIGGER_ZULIP_MAIN_BOTEMAIL=wud-bot@zulip.example.com
      - WUD_TRIGGER_ZULIP_MAIN_APIKEY=secret_api_key_here
      - WUD_TRIGGER_ZULIP_MAIN_TYPE=stream
      - WUD_TRIGGER_ZULIP_MAIN_TO=infrastructure
      - WUD_TRIGGER_ZULIP_MAIN_TOPIC=Docker Updates
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_ZULIP_MAIN_URL="https://zulip.example.com" \
  -e WUD_TRIGGER_ZULIP_MAIN_BOTEMAIL="wud-bot@zulip.example.com" \
  -e WUD_TRIGGER_ZULIP_MAIN_APIKEY="secret_api_key_here" \
  -e WUD_TRIGGER_ZULIP_MAIN_TYPE="stream" \
  -e WUD_TRIGGER_ZULIP_MAIN_TO="infrastructure" \
  -e WUD_TRIGGER_ZULIP_MAIN_TOPIC="Docker Updates" \
  getwud/wud
```

</TabItem>
</Tabs>
