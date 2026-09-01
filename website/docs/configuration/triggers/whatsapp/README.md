---
title: WhatsApp
description: Send container update notifications to WhatsApp via Meta Cloud API in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# WhatsApp

<DocHero
  icon="simple-icons:whatsapp"
  description="The WhatsApp trigger lets you send container update notifications directly to your WhatsApp number using the official Meta WhatsApp Cloud API."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_WHATSAPP_{trigger_name}_PHONENUMBERID"
    required={true}
    type="string">
    Meta WhatsApp Cloud API Phone Number ID
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_WHATSAPP_{trigger_name}_TOKEN"
    required={true}
    type="string">
    Meta System User permanent access token with `whatsapp_business_messaging` permission
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_WHATSAPP_{trigger_name}_RECIPIENT"
    required={true}
    type="string">
    Recipient phone number with country code without `+` or spaces (e.g. `15551234567`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_WHATSAPP_{trigger_name}_URL"
    required={false}
    type="url"
    defaultValue="https://graph.facebook.com/v19.0">
    Meta Graph API base URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_WHATSAPP_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the bold notification title
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Basic WhatsApp Alert

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_WHATSAPP_ADMIN_PHONENUMBERID=109876543210
      - WUD_TRIGGER_WHATSAPP_ADMIN_TOKEN=EAAXxX...your_meta_system_token
      - WUD_TRIGGER_WHATSAPP_ADMIN_RECIPIENT=15551234567
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_WHATSAPP_ADMIN_PHONENUMBERID="109876543210" \
  -e WUD_TRIGGER_WHATSAPP_ADMIN_TOKEN="EAAXxX...your_meta_system_token" \
  -e WUD_TRIGGER_WHATSAPP_ADMIN_RECIPIENT="15551234567" \
  getwud/wud
```

</TabItem>
</Tabs>
