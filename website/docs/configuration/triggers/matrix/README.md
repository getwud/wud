---
title: Matrix
description: Send container update notifications to Matrix rooms in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Matrix

<DocHero
  icon="simple-icons:matrix"
  description="The Matrix trigger lets you send container update notifications to Matrix rooms using the Client-Server API."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_MATRIX_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS Homeserver URL (e.g. https://matrix.org)">
    Matrix homeserver base URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MATRIX_{trigger_name}_ROOMID"
    required={true}
    type="string"
    supported="Matrix room ID (e.g. !abcdef:matrix.org)">
    Internal Matrix room ID where messages will be sent
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MATRIX_{trigger_name}_ACCESSTOKEN"
    required={true}
    type="string">
    Matrix user or bot account access token
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MATRIX_{trigger_name}_DISABLETITLE"
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

### Basic Matrix Notification

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_MATRIX_MAIN_URL=https://matrix.example.com
      - WUD_TRIGGER_MATRIX_MAIN_ROOMID=!abcdef12345:example.com
      - WUD_TRIGGER_MATRIX_MAIN_ACCESSTOKEN=syt_botaccount_secrettoken
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_MATRIX_MAIN_URL="https://matrix.example.com" \
  -e WUD_TRIGGER_MATRIX_MAIN_ROOMID="!abcdef12345:example.com" \
  -e WUD_TRIGGER_MATRIX_MAIN_ACCESSTOKEN="syt_botaccount_secrettoken" \
  getwud/wud
```

</TabItem>
</Tabs>
